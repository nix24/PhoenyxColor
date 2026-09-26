import { describe, expect, test } from "vitest";
import { neutralRecipe, type EditRecipe } from "$lib/features/references";
import type { ReferenceId } from "$lib/types/brands";
import {
	applyEditorUpdates,
	editorStateFromRecipe,
	panelPresetSettings,
	presetUpdates,
	stopsFromGradient,
	stopsFromPalette,
	storedPresetSettings,
	type GradientStops,
} from "./editor-state";

// SAFETY: a fixed UUID literal, which is what a ReferenceId is.
const referenceId = "4f1c2a9e-0b7d-4c1e-9a53-2d6e8f0b1c3a" as ReferenceId;
const stops: GradientStops = [
	{ color: "#000000", position: 0 },
	{ color: "#ff8800", position: 1 },
];

function stateOf(recipe: EditRecipe) {
	return editorStateFromRecipe(recipe, null, () => undefined);
}

describe("editor state adapter", () => {
	test("the neutral recipe shows v1's neutral slider values", () => {
		expect(stateOf(neutralRecipe(referenceId))).toMatchObject({
			brightness: 100,
			contrast: 100,
			saturation: 100,
			hueRotate: 0,
			opacity: 1,
			gradientMapOpacity: 0,
			cropRect: null,
		});
	});

	test("panel values land in the recipe with 100 → 0 for centred sliders", () => {
		const recipe = applyEditorUpdates(
			neutralRecipe(referenceId),
			{ brightness: 150, contrast: 40, saturation: 200, hueRotate: 90, blur: 2.5, rotation: 90 },
			null
		);
		expect(recipe.tone).toMatchObject({ brightness: 50, contrast: -60 });
		expect(recipe.color).toMatchObject({ saturation: 100, hue: 90 });
		expect(recipe.detail.blur).toBe(2.5);
		expect(recipe.geometry.rotation).toBe(90);
		expect(stateOf(recipe)).toMatchObject({ brightness: 150, contrast: 40, saturation: 200 });
	});

	test("updates leave every other field alone", () => {
		const edited = applyEditorUpdates(
			neutralRecipe(referenceId),
			{ vignette: 30, cropRect: { x: 1, y: 2, width: 3, height: 4 } },
			null
		);
		const next = applyEditorUpdates(edited, { tint: -20 }, null);
		expect(next).toEqual({ ...edited, color: { ...edited.color, tint: -20 } });
	});

	test("stroke colors are stored in canonical hex", () => {
		const recipe = applyEditorUpdates(
			neutralRecipe(referenceId),
			{
				drawStrokes: [
					{ id: crypto.randomUUID(), color: "#FF007F", size: 12, points: [{ x: 1, y: 2 }] },
				],
			},
			null
		);
		expect(recipe.strokes[0]?.color).toBe("#ff007f");
	});

	test("the gradient map snapshots the given stops and goes away at opacity 0", () => {
		const mapped = applyEditorUpdates(
			neutralRecipe(referenceId),
			{ gradientMapOpacity: 0.5, gradientMapBlendMode: "multiply" },
			stops
		);
		expect(mapped.gradientMap).toEqual({ stops, opacity: 0.5, blendMode: "multiply" });
		// With no active gradient or palette, the stored snapshot stays.
		expect(
			applyEditorUpdates(mapped, { gradientMapOpacity: 0.8 }, null).gradientMap?.stops
		).toEqual(stops);
		expect(applyEditorUpdates(mapped, { gradientMapOpacity: 0 }, stops).gradientMap).toBeNull();
		// No snapshot at all: v1 drew nothing.
		expect(
			applyEditorUpdates(neutralRecipe(referenceId), { gradientMapOpacity: 0.5 }, null).gradientMap
		).toBeNull();
	});

	test("an out-of-range value throws instead of saving a bad recipe", () => {
		expect(() =>
			applyEditorUpdates(neutralRecipe(referenceId), { brightness: 400 }, null)
		).toThrow();
		expect(() =>
			applyEditorUpdates(
				neutralRecipe(referenceId),
				{ gradientMapOpacity: 1, gradientMapBlendMode: "glow" },
				stops
			)
		).toThrow();
	});

	test("effects and layers are refused as flat updates", () => {
		expect(() =>
			applyEditorUpdates(neutralRecipe(referenceId), { appliedEffects: [] }, null)
		).toThrow();
	});

	test("preset settings convert both ways", () => {
		const flat = {
			brightness: 95,
			contrast: 90,
			saturation: 70,
			hueRotate: 10,
			sepia: 30,
			invert: 0,
			isGrayscale: false,
			shadows: -10,
			highlights: 5,
			vibrance: 20,
			temperature: 15,
			tint: -5,
			clarity: 12,
			vignette: 25,
		};
		expect(panelPresetSettings(storedPresetSettings(flat))).toEqual(flat);
		expect(panelPresetSettings({ tone: { brightness: -5 }, color: {}, detail: {} })).toEqual({
			brightness: 95,
		});
	});

	test("a preset at 50 % lands halfway from the defaults and resets what it leaves out", () => {
		expect(presetUpdates({ brightness: 120, isGrayscale: true }, 50)).toMatchObject({
			brightness: 110,
			isGrayscale: true,
			contrast: 100,
			vignette: 0,
			gradientMapOpacity: 0,
		});
	});

	test("gradient-map snapshots use 0–1 positions in stop order", () => {
		expect(
			stopsFromGradient([
				{ color: "#FFFFFF", position: 100 },
				{ color: "black", position: 0 },
			])
		).toEqual([
			{ color: "#000000", position: 0 },
			{ color: "#ffffff", position: 1 },
		]);
		expect(
			stopsFromPalette(["#ff0000", "#00ff00", "#0000ff"])?.map((stop) => stop.position)
		).toEqual([0, 0.5, 1]);
		expect(stopsFromPalette(["#123456"])).toHaveLength(2);
		expect(stopsFromPalette([])).toBeNull();
	});
});
