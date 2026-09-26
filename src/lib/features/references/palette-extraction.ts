/** A palette request as the worker receives it. */
export interface PaletteRequest {
	id: number;
	image: Blob;
	colorCount: number;
}

/** The worker's answer: `#rrggbb` colors, most common first, or why it failed. */
export type PaletteResponse = { id: number; colors: string[] } | { id: number; error: string };

interface PendingRequest {
	resolve: (colors: string[]) => void;
	reject: (error: Error) => void;
}

let worker: Worker | undefined;
const pending = new Map<number, PendingRequest>();
let nextRequestId = 0;

function paletteWorker(): Worker {
	if (worker) return worker;
	const created = new Worker(new URL("./palette.worker.ts", import.meta.url), { type: "module" });
	created.onmessage = (event: MessageEvent<PaletteResponse>) => {
		const response = event.data;
		const request = pending.get(response.id);
		pending.delete(response.id);
		if (!request) return;
		if ("error" in response) request.reject(new Error(response.error));
		else request.resolve(response.colors);
	};
	created.onerror = (event) => {
		// A crashed worker takes its queue with it; the next request starts a fresh one.
		for (const request of pending.values()) {
			request.reject(new Error(`The palette worker failed: ${event.message}`));
		}
		pending.clear();
		created.terminate();
		worker = undefined;
	};
	worker = created;
	return created;
}

/**
 * The image's `colorCount` most representative colors (`#rrggbb`, most common first), found by
 * k-means in OKLab on a ≤ 128 px copy, off the main thread. The same image always gives the same
 * palette. Transparent pixels are ignored, so a fully transparent image gives `[]`.
 */
export function extractPalette(image: Blob, colorCount: number): Promise<string[]> {
	const id = nextRequestId++;
	return new Promise((resolve, reject) => {
		pending.set(id, { resolve, reject });
		const request: PaletteRequest = { id, image, colorCount };
		paletteWorker().postMessage(request);
	});
}
