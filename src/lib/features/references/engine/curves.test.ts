import { describe, expect, it } from "vitest";
import type { ReferenceId } from "$lib/types/brands";
import { neutralRecipe, type EditRecipe } from "../domain";
import { curvesLut, isIdentityCurves } from "./curves";

// SAFETY: a fixed UUID literal, which is what a ReferenceId is.
const identity = neutralRecipe("2d3c4b5a-6f7e-4d8c-9b0a-1f2e3d4c5b6a" as ReferenceId).curves;
const inverted: EditRecipe["curves"]["rgb"] = [
	{ x: 0, y: 255 },
	{ x: 255, y: 0 },
];

function channel(lut: Uint8Array, c: number): number[] {
	return Array.from({ length: 256 }, (_, level) => lut[level * 4 + c] ?? -1);
}

describe("curvesLut", () => {
	it("maps every level to itself for identity curves", () => {
		const lut = curvesLut(identity);
		const levels = Array.from({ length: 256 }, (_, level) => level);
		expect([channel(lut, 0), channel(lut, 1), channel(lut, 2)]).toEqual([levels, levels, levels]);
		expect(isIdentityCurves(identity)).toBe(true);
	});

	it("applies the master curve to every channel", () => {
		const lut = curvesLut({ ...identity, rgb: inverted });
		expect(channel(lut, 1).slice(0, 3)).toEqual([255, 254, 253]);
		expect(channel(lut, 1).at(-1)).toBe(0);
		expect(isIdentityCurves({ ...identity, rgb: inverted })).toBe(false);
	});

	it("applies a channel curve before the master curve", () => {
		// Red is inverted by its own curve, then inverted back by the master curve.
		const lut = curvesLut({ ...identity, rgb: inverted, red: inverted });
		expect(channel(lut, 0).slice(0, 3)).toEqual([0, 1, 2]);
		expect(channel(lut, 2).slice(0, 3)).toEqual([255, 254, 253]);
	});

	it("bends smoothly through a middle point", () => {
		const lifted = curvesLut({
			...identity,
			rgb: [
				{ x: 0, y: 0 },
				{ x: 128, y: 180 },
				{ x: 255, y: 255 },
			],
		});
		const green = channel(lifted, 1);
		expect(green[128]).toBe(180);
		expect(green[64]).toBeGreaterThan(64);
		expect(green.every((value, level) => level === 0 || value >= (green[level - 1] ?? 0))).toBe(
			true
		);
	});
});
