import { describe, expect, it } from "vite-plus/test";
import type { ReferenceId } from "$lib/types/brands";
import { neutralRecipe } from "./domain";
import { decode, pixelAt, pngFromRows, type Rgba } from "./engine/fixtures";
import { renderThumbnail } from "./thumbnail";

// SAFETY: a fixed UUID literal, which is what a ReferenceId is.
const neutral = neutralRecipe("0c9d8e7f-6a5b-4c3d-9e2f-1a0b9c8d7e6f" as ReferenceId);

async function lightGreyImage(width: number, height: number): Promise<Blob> {
	const row = Array.from({ length: width }, (): Rgba => [200, 200, 200, 255]);
	return pngFromRows(Array.from({ length: height }, () => row));
}

describe("renderThumbnail", () => {
	it("fits the edited output inside 256 px, after geometry", async () => {
		const recipe = { ...neutral, geometry: { ...neutral.geometry, rotation: 90 } };
		const thumbnail = await decode(
			await renderThumbnail(await lightGreyImage(600, 300), recipe, new Map())
		);
		expect([thumbnail.width, thumbnail.height]).toEqual([128, 256]);
	});

	it("shows the edits and never upscales", async () => {
		const recipe = { ...neutral, color: { ...neutral.color, invert: 100 } };
		const plain = await decode(
			await renderThumbnail(await lightGreyImage(40, 20), neutral, new Map())
		);
		const inverted = await decode(
			await renderThumbnail(await lightGreyImage(40, 20), recipe, new Map())
		);
		expect([inverted.width, inverted.height]).toEqual([40, 20]);
		expect(pixelAt(inverted, 5, 5)[0]).toBeLessThan(pixelAt(plain, 5, 5)[0] - 100);
	});
});
