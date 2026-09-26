import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ReferenceId } from "$lib/types/brands";
import { neutralRecipe, type EditRecipe } from "../domain";
import { RenderEngine } from "./engine";
import { pixelAt, pngFromRows, type Rgba } from "./fixtures";

// SAFETY: a fixed UUID literal, which is what a ReferenceId is.
const neutral = neutralRecipe("8e7d6c5b-4a3f-4e2d-9c1b-0a9f8e7d6c5b" as ReferenceId);

const SIZE = 256;
const DARK: Rgba = [60, 60, 60, 255];
const LIGHT: Rgba = [200, 200, 200, 255];
const RED: Rgba = [200, 40, 40, 255];
const MUTED: Rgba = [120, 100, 90, 255];

/** Four 128 px quadrants: dark | light over red | muted. */
function quadrant(x: number, y: number): Rgba {
	if (y < SIZE / 2) return x < SIZE / 2 ? DARK : LIGHT;
	return x < SIZE / 2 ? RED : MUTED;
}

const at = {
	dark: [64, 64],
	light: [192, 64],
	red: [64, 192],
	muted: [192, 192],
} satisfies Record<string, [number, number]>;

let engine: RenderEngine;

beforeAll(async () => {
	engine = new RenderEngine(document.createElement("canvas"));
	const rows = Array.from({ length: SIZE }, (_, y) =>
		Array.from({ length: SIZE }, (_, x) => quadrant(x, y))
	);
	await engine.setSource(await pngFromRows(rows));
});

afterAll(() => engine.dispose());

function render(recipe: EditRecipe): ImageData {
	engine.render(recipe);
	return engine.readPixels();
}

function sample(recipe: EditRecipe, [x, y]: [number, number]): Rgba {
	return pixelAt(render(recipe), x, y);
}

function edited<TGroup extends "tone" | "color" | "detail">(
	group: TGroup,
	values: Partial<EditRecipe[TGroup]>
): EditRecipe {
	return { ...neutral, [group]: { ...neutral[group], ...values } };
}

function brightness([r, g, b]: Rgba): number {
	return r + g + b;
}

function spread([r, g, b]: Rgba): number {
	return Math.max(r, g, b) - Math.min(r, g, b);
}

describe("adjust pass", () => {
	it("brightness lifts, and −100 goes black", () => {
		expect(brightness(sample(edited("tone", { brightness: 50 }), at.dark))).toBeGreaterThan(
			brightness(DARK)
		);
		expect(sample(edited("tone", { brightness: -100 }), at.light)).toEqual([0, 0, 0, 255]);
	});

	it("contrast pushes darks down and lights up", () => {
		const recipe = edited("tone", { contrast: 50 });
		expect(brightness(sample(recipe, at.dark))).toBeLessThan(brightness(DARK));
		expect(brightness(sample(recipe, at.light))).toBeGreaterThan(brightness(LIGHT));
	});

	it("shadows lift the darks and leave the lights", () => {
		const recipe = edited("tone", { shadows: 100 });
		expect(brightness(sample(recipe, at.dark))).toBeGreaterThan(brightness(DARK) + 30);
		expect(sample(recipe, at.light)).toEqual(LIGHT);
	});

	it("highlights pull the lights down and leave the darks", () => {
		const recipe = edited("tone", { highlights: -100 });
		expect(brightness(sample(recipe, at.light))).toBeLessThan(brightness(LIGHT) - 30);
		expect(sample(recipe, at.dark)).toEqual(DARK);
	});

	it("temperature warms and tint shifts toward magenta", () => {
		const [warmR, , warmB] = sample(edited("color", { temperature: 100 }), at.light);
		expect(warmR).toBeGreaterThan(warmB + 20);
		const [tintR, tintG] = sample(edited("color", { tint: 100 }), at.light);
		expect(tintR).toBeGreaterThan(tintG + 20);
	});

	it("saturation −100 and grayscale both remove color", () => {
		expect(spread(sample(edited("color", { saturation: -100 }), at.red))).toBeLessThanOrEqual(1);
		expect(spread(sample(edited("color", { isGrayscale: true }), at.red))).toBeLessThanOrEqual(1);
	});

	it("vibrance boosts a muted color", () => {
		expect(spread(sample(edited("color", { vibrance: 100 }), at.muted))).toBeGreaterThan(
			spread(MUTED) + 5
		);
	});

	it("hue 180 turns red toward cyan", () => {
		const [r, g, b] = sample(edited("color", { hue: 180 }), at.red);
		expect(g).toBeGreaterThan(r);
		expect(b).toBeGreaterThan(r);
	});

	it("sepia warms a grey", () => {
		const [r, g, b] = sample(edited("color", { sepia: 100 }), at.light);
		expect(r).toBeGreaterThan(g);
		expect(g).toBeGreaterThan(b);
	});

	it("invert 100 mirrors every encoded level", () => {
		const [r, g, b, a] = sample(edited("color", { invert: 100 }), at.red);
		[r, g, b].forEach((level, c) =>
			expect(Math.abs(level - (255 - (RED[c] ?? 0)))).toBeLessThan(2)
		);
		expect(a).toBe(255);
	});

	it("an inverted master curve mirrors every level", () => {
		const recipe: EditRecipe = {
			...neutral,
			curves: {
				...neutral.curves,
				rgb: [
					{ x: 0, y: 255 },
					{ x: 255, y: 0 },
				],
			},
		};
		const [r, g, b] = sample(recipe, at.red);
		[r, g, b].forEach((level, c) =>
			expect(Math.abs(level - (255 - (RED[c] ?? 0)))).toBeLessThan(2)
		);
	});
});

describe("detail passes", () => {
	it("blur softens a hard edge", () => {
		const [edge] = sample(edited("detail", { blur: 4 }), [127, 64]);
		expect(edge).toBeGreaterThan(DARK[0] + 20);
		expect(edge).toBeLessThan(LIGHT[0] - 20);
	});

	it("clarity darkens the dark side of an edge", () => {
		const [edge] = sample(edited("detail", { clarity: 100 }), [126, 64]);
		expect(edge).toBeLessThan(DARK[0]);
		const [far] = sample(edited("detail", { clarity: 100 }), at.dark);
		expect(far).toBe(DARK[0]);
	});
});

describe("finish pass", () => {
	it("vignette darkens the corners and leaves the centre and alpha", () => {
		const image = render({ ...neutral, vignette: 100 });
		expect(brightness(pixelAt(image, 0, 0))).toBeLessThan(brightness(DARK) / 2);
		expect(pixelAt(image, 0, 0)[3]).toBe(255);
		expect(pixelAt(image, 120, 120)).toEqual(DARK);
	});

	it("opacity scales alpha only", () => {
		expect(sample({ ...neutral, opacity: 0.5 }, at.red)).toEqual([...RED.slice(0, 3), 128]);
	});
});
