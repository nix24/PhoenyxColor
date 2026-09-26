import { oklabToHex, srgbBytesToOklab } from "$lib/core/color";
import { clusterColors } from "./kmeans";
import type { PaletteRequest, PaletteResponse } from "./palette-extraction";

/** Longest side of the copy that gets clustered: plenty for a palette, and fast. */
const SAMPLE_SIZE = 128;
/** Fixed, so the same image always gives the same palette. */
const SEED = 1;

async function samplesOf(image: Blob): Promise<Float32Array> {
	const bitmap = await createImageBitmap(image, { imageOrientation: "from-image" });
	const scale = Math.min(1, SAMPLE_SIZE / Math.max(bitmap.width, bitmap.height));
	const width = Math.max(1, Math.round(bitmap.width * scale));
	const height = Math.max(1, Math.round(bitmap.height * scale));
	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext("2d");
	if (!context) throw new Error("A 2D canvas is not available in this browser.");
	context.imageSmoothingQuality = "high";
	context.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();
	const pixels = context.getImageData(0, 0, width, height).data;
	const samples: number[] = [];
	for (let i = 0; i < pixels.length; i += 4) {
		// Mostly transparent pixels are not part of the picture.
		if ((pixels[i + 3] ?? 0) < 128) continue;
		const { l, a, b } = srgbBytesToOklab(pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0);
		samples.push(l, a, b);
	}
	return new Float32Array(samples);
}

self.onmessage = async (event: MessageEvent<PaletteRequest>) => {
	const { id, image, colorCount } = event.data;
	let response: PaletteResponse;
	try {
		const clusters = clusterColors(await samplesOf(image), colorCount, SEED);
		response = { id, colors: clusters.map((cluster) => oklabToHex(cluster.centre)) };
	} catch (cause) {
		response = { id, error: cause instanceof Error ? cause.message : String(cause) };
	}
	self.postMessage(response);
};
