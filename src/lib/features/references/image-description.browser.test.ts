import { describe, expect, it } from "vitest";
import { describeImage } from "./image-description";

async function pngOfSize(width: number, height: number): Promise<Blob> {
	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext("2d");
	if (!context) throw new Error("no 2D context");
	context.fillStyle = "rgba(255, 0, 0, 0.5)";
	context.fillRect(0, 0, width, height);
	return canvas.convertToBlob({ type: "image/png" });
}

async function sizeOf(image: Blob): Promise<[number, number]> {
	const bitmap = await createImageBitmap(image);
	const size: [number, number] = [bitmap.width, bitmap.height];
	bitmap.close();
	return size;
}

describe("describeImage", () => {
	it("measures the original and fits the thumbnail inside 256 px", async () => {
		const description = await describeImage(await pngOfSize(1000, 500));
		expect([description.width, description.height]).toEqual([1000, 500]);
		expect(await sizeOf(description.thumbnail)).toEqual([256, 128]);
	});

	it("never upscales a small image", async () => {
		const description = await describeImage(await pngOfSize(40, 30));
		expect(await sizeOf(description.thumbnail)).toEqual([40, 30]);
	});

	it("keeps transparency in the thumbnail", async () => {
		const { thumbnail } = await describeImage(await pngOfSize(10, 10));
		const bitmap = await createImageBitmap(thumbnail);
		const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
		const context = canvas.getContext("2d");
		if (!context) throw new Error("no 2D context");
		context.drawImage(bitmap, 0, 0);
		const alpha = context.getImageData(5, 5, 1, 1).data[3];
		expect(alpha).toBeGreaterThan(100);
		expect(alpha).toBeLessThan(160);
	});
});
