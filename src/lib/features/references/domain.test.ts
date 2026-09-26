import { describe, expect, test } from "vitest";
import type { ReferenceId } from "$lib/types/brands";
import { EditRecipeSchema, neutralRecipe } from "./domain";

// SAFETY: a fixed UUID literal, which is what a ReferenceId is.
const referenceId = "4f1c2a9e-0b7d-4c1e-9a53-2d6e8f0b1c3a" as ReferenceId;

/** Effects as they may arrive from storage: any shape the tests need, valid or not. */
interface StoredEffect {
	type: string;
	intensity: number;
	seed?: number;
	colors?: string[];
}

interface StoredStop {
	color: string;
	position: number;
}

function isValidJson(json: string): boolean {
	return EditRecipeSchema.safeParse(JSON.parse(json)).success;
}

function withEffect(effect: StoredEffect): string {
	return JSON.stringify({ ...neutralRecipe(referenceId), effects: [effect] });
}

describe("EditRecipeSchema", () => {
	test("the neutral recipe survives a JSON round trip unchanged", () => {
		const recipe = neutralRecipe(referenceId);
		expect(EditRecipeSchema.parse(JSON.parse(JSON.stringify(recipe)))).toEqual(recipe);
	});

	test("rejects a recipe from an unknown version", () => {
		expect(isValidJson(JSON.stringify({ ...neutralRecipe(referenceId), version: 2 }))).toBe(false);
	});

	test("every effect needs a 32-bit unsigned integer seed", () => {
		expect(isValidJson(withEffect({ type: "glitch", intensity: 50, seed: 7 }))).toBe(true);
		expect(isValidJson(withEffect({ type: "glitch", intensity: 50 }))).toBe(false);
		expect(isValidJson(withEffect({ type: "glitch", intensity: 50, seed: 1.5 }))).toBe(false);
		expect(isValidJson(withEffect({ type: "glitch", intensity: 50, seed: 2 ** 32 }))).toBe(false);
	});

	test("duotone needs exactly two canonical hex colors", () => {
		const duotone = (colors: string[]) =>
			withEffect({ type: "duotone", intensity: 100, seed: 0, colors });
		expect(isValidJson(duotone(["#112233", "#ffeedd"]))).toBe(true);
		expect(isValidJson(duotone(["#112233"]))).toBe(false);
		expect(isValidJson(duotone(["#123", "#ffeedd"]))).toBe(false);
		expect(isValidJson(duotone(["#FFEEDD", "#112233"]))).toBe(false);
	});

	test("a crop must have a positive size", () => {
		const recipe = neutralRecipe(referenceId);
		const cropped = (width: number) =>
			JSON.stringify({
				...recipe,
				geometry: { ...recipe.geometry, crop: { x: 0, y: 0, width, height: 10 } },
			});
		expect(isValidJson(cropped(10))).toBe(true);
		expect(isValidJson(cropped(0))).toBe(false);
	});

	test("a gradient map needs at least two stops", () => {
		const withMap = (stops: StoredStop[]) =>
			JSON.stringify({
				...neutralRecipe(referenceId),
				gradientMap: { stops, opacity: 1, blendMode: "normal" },
			});
		const black = { color: "#000000", position: 0 };
		const white = { color: "#ffffff", position: 1 };
		expect(isValidJson(withMap([black, white]))).toBe(true);
		expect(isValidJson(withMap([black]))).toBe(false);
	});
});
