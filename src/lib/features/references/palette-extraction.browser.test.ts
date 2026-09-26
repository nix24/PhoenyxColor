import { describe, expect, it } from "vitest";
import { pngFromRows, type Rgba } from "./engine/fixtures";
import { extractPalette } from "./palette-extraction";

function twoColorImage(): Promise<Blob> {
	const red: Rgba = [220, 30, 30, 255];
	const blue: Rgba = [20, 40, 200, 255];
	const clear: Rgba = [0, 255, 0, 0];
	// 3/4 red, 1/4 blue, and a transparent (green) column that must be ignored.
	return pngFromRows(
		Array.from({ length: 40 }, () =>
			Array.from({ length: 40 }, (_, x) => (x === 0 ? clear : x < 30 ? red : blue))
		)
	);
}

describe("extractPalette", () => {
	it("finds the image's colors off the main thread, most common first", async () => {
		const colors = await extractPalette(await twoColorImage(), 4);
		expect(colors).toHaveLength(2);
		expect(colors[0]).toBe("#dc1e1e");
		expect(colors[1]).toBe("#1428c8");
	});

	it("gives the same palette for the same image", async () => {
		const image = await twoColorImage();
		const [first, second] = await Promise.all([extractPalette(image, 3), extractPalette(image, 3)]);
		expect(second).toEqual(first);
	});

	it("rejects an image it cannot decode", async () => {
		await expect(extractPalette(new Blob(["not an image"]), 3)).rejects.toThrow();
	});
});
