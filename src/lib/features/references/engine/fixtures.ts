/** Test images and helpers for the References browser tests. */
import { RenderEngine } from "./engine";

export type Rgba = [number, number, number, number];

/** Encodes straight-alpha pixel rows (top row first) as a PNG. */
export async function pngFromRows(rows: Rgba[][]): Promise<Blob> {
	const width = rows[0]?.length ?? 0;
	const canvas = new OffscreenCanvas(width, rows.length);
	const context = canvas.getContext("2d");
	if (!context) throw new Error("A 2D canvas is not available.");
	const pixels = new Uint8ClampedArray(rows.flat(2));
	context.putImageData(new ImageData(pixels, width, rows.length), 0, 0);
	return canvas.convertToBlob({ type: "image/png" });
}

export function pixelAt(image: ImageData, x: number, y: number): Rgba {
	const offset = (y * image.width + x) * 4;
	const [r = 0, g = 0, b = 0, a = 0] = image.data.subarray(offset, offset + 4);
	return [r, g, b, a];
}

export function rowsOf(image: ImageData): Rgba[][] {
	return Array.from({ length: image.height }, (_, y) =>
		Array.from({ length: image.width }, (_, x) => pixelAt(image, x, y))
	);
}

/** Decodes an encoded image (PNG, WebP, …) to its pixels. */
export async function decode(blob: Blob): Promise<ImageData> {
	const bitmap = await createImageBitmap(blob);
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const context = canvas.getContext("2d");
	if (!context) throw new Error("no 2D context");
	context.drawImage(bitmap, 0, 0);
	bitmap.close();
	return context.getImageData(0, 0, canvas.width, canvas.height);
}

/** An engine whose source is a `size`×`size` image with `pixel(x, y)` at each position. */
export async function engineWithSource(
	size: number,
	pixel: (x: number, y: number) => Rgba
): Promise<RenderEngine> {
	const engine = new RenderEngine(document.createElement("canvas"));
	const rows = Array.from({ length: size }, (_, y) =>
		Array.from({ length: size }, (_, x) => pixel(x, y))
	);
	await engine.setSource(await pngFromRows(rows));
	return engine;
}
