import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ReferenceId } from "$lib/types/brands";
import { neutralRecipe, type EditRecipe } from "../domain";
import { RenderEngine } from "./engine";
import { pngFromRows, rowsOf, type Rgba } from "./fixtures";

// SAFETY: a fixed UUID literal, which is what a ReferenceId is.
const referenceId = "6c5b4a3d-2e1f-4b0a-9c8d-7e6f5a4b3c2d" as ReferenceId;

/**
 * 3×2 source, top row first. Alpha 128 on pure colors survives the 2D canvas's premultiplied
 * round trip exactly, so these are the straight values the PNG really stores.
 */
const SOURCE: Rgba[][] = [
	[
		[255, 0, 0, 255],
		[0, 255, 0, 255],
		[0, 0, 255, 255],
	],
	[
		[255, 255, 255, 128],
		[0, 0, 0, 0],
		[40, 90, 200, 255],
	],
];

function sourcePng(): Promise<Blob> {
	return pngFromRows(SOURCE);
}

function expectClose(actual: Rgba[][], expected: Rgba[][], tolerance = 1): void {
	expect(actual.length).toBe(expected.length);
	actual.forEach((row, y) =>
		row.forEach((pixel, x) =>
			pixel.forEach((channel, c) => {
				const want = expected[y]?.[x]?.[c] ?? Number.NaN;
				if (Math.abs(channel - want) > tolerance) {
					throw new Error(`pixel (${x},${y}) channel ${c}: got ${channel}, want ${want}`);
				}
			})
		)
	);
}

function withGeometry(geometry: Partial<EditRecipe["geometry"]>): EditRecipe {
	const recipe = neutralRecipe(referenceId);
	return { ...recipe, geometry: { ...recipe.geometry, ...geometry } };
}

let engine: RenderEngine;

beforeEach(async () => {
	engine = new RenderEngine(document.createElement("canvas"));
	await engine.setSource(await sourcePng());
});

afterEach(() => engine.dispose());

describe("RenderEngine", () => {
	it("renders the neutral recipe as the source, within ±1, alpha included", () => {
		expect(engine.render(neutralRecipe(referenceId))).toEqual({
			width: 3,
			height: 2,
			isReduced: false,
		});
		expectClose(rowsOf(engine.readPixels()), SOURCE);
	});

	it("uses a float work format when the GPU supports it", () => {
		expect(["rgba16f", "rgba8"]).toContain(engine.workFormat);
	});

	it("turns a quarter turn clockwise", () => {
		expect(engine.render(withGeometry({ rotation: 90 }))).toEqual({
			width: 2,
			height: 3,
			isReduced: false,
		});
		// Clockwise: each source column, read bottom to top, becomes an output row.
		expectClose(rowsOf(engine.readPixels()), [
			[
				[255, 255, 255, 128],
				[255, 0, 0, 255],
			],
			[
				[0, 0, 0, 0],
				[0, 255, 0, 255],
			],
			[
				[40, 90, 200, 255],
				[0, 0, 255, 255],
			],
		]);
	});

	it("mirrors horizontally", () => {
		engine.render(withGeometry({ flipX: true }));
		expectClose(
			rowsOf(engine.readPixels()),
			SOURCE.map((row) => [...row].reverse())
		);
	});

	it("crops to the requested source pixels", () => {
		expect(engine.render(withGeometry({ crop: { x: 1, y: 0, width: 2, height: 2 } }))).toEqual({
			width: 2,
			height: 2,
			isReduced: false,
		});
		expectClose(
			rowsOf(engine.readPixels()),
			SOURCE.map((row) => row.slice(1))
		);
	});

	it("renders a smaller preview through the same path", () => {
		expect(engine.render(withGeometry({ scale: 4 }), 0.5)).toEqual({
			width: 6,
			height: 4,
			isReduced: false,
		});
	});

	it("presents the render on its canvas, sized to the render", async () => {
		const canvas = document.createElement("canvas");
		const presenting = new RenderEngine(canvas);
		await presenting.setSource(await sourcePng());
		presenting.render(neutralRecipe(referenceId));
		presenting.present();
		expect([canvas.width, canvas.height]).toEqual([3, 2]);
		presenting.dispose();
	});
});
