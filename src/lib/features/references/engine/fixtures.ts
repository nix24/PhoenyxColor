/** Test images for the engine's browser tests. */

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
