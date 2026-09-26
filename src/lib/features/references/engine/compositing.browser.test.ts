import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newBlobId } from "$lib/core/storage";
import type { ReferenceId } from "$lib/types/brands";
import type { BlendMode } from "$lib/types/image-editor";
import { neutralRecipe, type EditRecipe } from "../domain";
import { RenderEngine } from "./engine";
import { pixelAt, pngFromRows, type Rgba } from "./fixtures";

// SAFETY: a fixed UUID literal, which is what a ReferenceId is.
const neutral = neutralRecipe("3f2e1d0c-9b8a-4f7e-8d6c-5b4a3f2e1d0c" as ReferenceId);

const SIZE = 64;
const DARK: Rgba = [60, 60, 60, 255];
const LIGHT: Rgba = [200, 200, 200, 255];

/** Left half dark, right half light, with a gradient row band for effects to chew on. */
function sourcePixel(x: number, y: number): Rgba {
	if (y >= 48) {
		const level = Math.round((x / (SIZE - 1)) * 255);
		return [level, 255 - level, 128, 255];
	}
	return x < SIZE / 2 ? DARK : LIGHT;
}

function solid(color: Rgba, width = 1, height = 1): Rgba[][] {
	return Array.from({ length: height }, () => Array.from({ length: width }, () => color));
}

let engine: RenderEngine;

beforeEach(async () => {
	engine = new RenderEngine(document.createElement("canvas"));
	const rows = Array.from({ length: SIZE }, (_, y) =>
		Array.from({ length: SIZE }, (_, x) => sourcePixel(x, y))
	);
	await engine.setSource(await pngFromRows(rows));
});

afterEach(() => engine.dispose());

function render(recipe: EditRecipe): ImageData {
	engine.render(recipe);
	return engine.readPixels();
}

function withEffect(effect: EditRecipe["effects"][number]): EditRecipe {
	return { ...neutral, effects: [effect] };
}

describe("effects", () => {
	const types = [
		"posterize",
		"pixelate",
		"solarize",
		"halftone",
		"vhs",
		"glitch",
		"emboss",
		"sharpen",
	] as const;

	it.each(types)("%s changes the image and repeats exactly with the same seed", (type) => {
		const original = render(neutral).data;
		const first = render(withEffect({ type, intensity: 100, seed: 42 })).data;
		const second = render(withEffect({ type, intensity: 100, seed: 42 })).data;
		expect(first).not.toEqual(original);
		expect(second).toEqual(first);
	});

	it("a different seed moves the glitch", () => {
		const first = render(withEffect({ type: "glitch", intensity: 100, seed: 1 })).data;
		const second = render(withEffect({ type: "glitch", intensity: 100, seed: 2 })).data;
		expect(second).not.toEqual(first);
	});

	it("posterize keeps only a few levels", () => {
		const image = render(withEffect({ type: "posterize", intensity: 100, seed: 0 }));
		const reds = new Set(Array.from({ length: SIZE }, (_, x) => pixelAt(image, x, 56)[0]));
		expect(reds.size).toBeLessThanOrEqual(3);
	});

	it("duotone maps dark to the dark color and light to the light one", () => {
		const image = render(
			withEffect({ type: "duotone", intensity: 100, seed: 0, colors: ["#ff0000", "#0000ff"] })
		);
		const [darkR, , darkB] = pixelAt(image, 8, 8);
		const [lightR, , lightB] = pixelAt(image, 56, 8);
		expect(darkR).toBeGreaterThan(darkB);
		expect(lightB).toBeGreaterThan(lightR);
	});
});

describe("gradient map", () => {
	it("recolors by luminance with the stored stops", () => {
		const image = render({
			...neutral,
			gradientMap: {
				stops: [
					{ color: "#ff0000", position: 0 },
					{ color: "#0000ff", position: 1 },
				],
				opacity: 1,
				blendMode: "normal",
			},
		});
		const [darkR, , darkB] = pixelAt(image, 8, 8);
		const [lightR, , lightB] = pixelAt(image, 56, 8);
		expect(darkR).toBeGreaterThan(darkB);
		expect(lightB).toBeGreaterThan(lightR);
	});
});

describe("layers", () => {
	async function withLayer(
		color: Rgba[][],
		blendMode: BlendMode,
		overrides: Partial<EditRecipe["layers"][number]> = {}
	): Promise<EditRecipe> {
		const blobId = newBlobId();
		await engine.setLayerImage(blobId, await pngFromRows(color));
		return {
			...neutral,
			layers: [
				{
					kind: "image",
					id: crypto.randomUUID(),
					name: "Layer",
					blobId,
					opacity: 1,
					blendMode,
					isVisible: true,
					isLocked: false,
					...overrides,
				},
			],
		};
	}

	it("a normal opaque layer covers the photo it is fitted to", async () => {
		const image = render(await withLayer(solid([255, 0, 0, 255]), "normal"));
		expect(pixelAt(image, 8, 8)).toEqual([255, 0, 0, 255]);
		expect(pixelAt(image, 56, 56)).toEqual([255, 0, 0, 255]);
	});

	it.each([
		["multiply", 8, (level: number) => level < DARK[0]],
		["screen", 8, (level: number) => level > DARK[0]],
		["darken", 56, (level: number) => Math.abs(level - 128) <= 1],
		["difference", 56, (level: number) => Math.abs(level - (LIGHT[0] - 128)) <= 1],
	] as const)("%s blends a grey layer as CSS does", async (mode, x, isExpected) => {
		const image = render(await withLayer(solid([128, 128, 128, 255]), mode));
		expect(isExpected(pixelAt(image, x, 8)[0])).toBe(true);
	});

	it("a hidden layer changes nothing", async () => {
		const recipe = await withLayer(solid([255, 0, 0, 255]), "normal", { isVisible: false });
		expect(render(recipe).data).toEqual(render(neutral).data);
	});

	it("a layer flips with the photo", async () => {
		// Red on the left half of the layer, transparent on the right.
		const halves = [[[255, 0, 0, 255] satisfies Rgba, [0, 0, 0, 0] satisfies Rgba]];
		const recipe = await withLayer(halves, "normal");
		// A 2×1 layer fits the 64 px photo as a 64×32 band, rows 16–47.
		expect(pixelAt(render(recipe), 8, 24)).toEqual([255, 0, 0, 255]);
		const flipped = render({ ...recipe, geometry: { ...recipe.geometry, flipX: true } });
		expect(pixelAt(flipped, 56, 24)).toEqual([255, 0, 0, 255]);
		// The photo flipped too: its light half is now on the left.
		expect(pixelAt(flipped, 8, 24)).toEqual(LIGHT);
	});

	it("refuses to render a layer whose image was never set", () => {
		const recipe: EditRecipe = {
			...neutral,
			layers: [
				{
					kind: "image",
					id: crypto.randomUUID(),
					name: "Missing",
					blobId: newBlobId(),
					opacity: 1,
					blendMode: "normal",
					isVisible: true,
					isLocked: false,
				},
			],
		};
		expect(() => engine.render(recipe)).toThrow(/no image/);
	});
});

describe("strokes", () => {
	const dot: EditRecipe["strokes"][number] = {
		id: crypto.randomUUID(),
		color: "#00ff00",
		size: 6,
		points: [{ x: 3, y: 3 }],
	};

	it("draws where the stroke was made, above the vignette", () => {
		const image = render({ ...neutral, strokes: [dot], vignette: 100 });
		expect(pixelAt(image, 3, 3)).toEqual([0, 255, 0, 255]);
		expect(pixelAt(image, 20, 1)[0]).toBeLessThan(DARK[0]);
	});

	it("moves with the crop", () => {
		const image = render({
			...neutral,
			strokes: [dot],
			geometry: { ...neutral.geometry, crop: { x: 2, y: 2, width: 20, height: 20 } },
		});
		expect(pixelAt(image, 1, 1)).toEqual([0, 255, 0, 255]);
	});
});
