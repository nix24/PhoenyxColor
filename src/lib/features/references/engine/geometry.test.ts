import { describe, expect, it } from "vitest";
import type { EditRecipe } from "../domain";
import { outputGeometry, sourceToOutputMatrix } from "./geometry";

const upright: EditRecipe["geometry"] = {
	crop: null,
	rotation: 0,
	flipX: false,
	flipY: false,
	scale: 1,
};

function apply(matrix: [number, number, number, number], x: number, y: number): [number, number] {
	const [m00, m10, m01, m11] = matrix;
	// Round away float noise; -0 compares unequal to 0 in toEqual.
	return [Math.round(m00 * x + m01 * y) + 0, Math.round(m10 * x + m11 * y) + 0];
}

// Ported from the v1 `utils/canvas-renderer.test.ts` cases.
describe("outputGeometry", () => {
	it("swaps output dimensions for a quarter turn", () => {
		expect(outputGeometry(400, 300, { ...upright, rotation: 90 })).toMatchObject({
			width: 300,
			height: 400,
		});
	});

	it("uses the crop as the source bounds before rotation", () => {
		expect(
			outputGeometry(400, 300, {
				...upright,
				rotation: 90,
				crop: { x: 20, y: 30, width: 100, height: 50 },
			})
		).toEqual({ crop: { x: 20, y: 30, width: 100, height: 50 }, width: 50, height: 100 });
	});

	it("expands arbitrary rotations to avoid clipping", () => {
		expect(outputGeometry(100, 200, { ...upright, rotation: 45 })).toMatchObject({
			width: 213,
			height: 213,
		});
	});

	it("clamps a crop that runs past the source", () => {
		expect(
			outputGeometry(100, 100, { ...upright, crop: { x: 80, y: 90, width: 50, height: 50 } }).crop
		).toEqual({ x: 80, y: 90, width: 20, height: 10 });
	});

	it("scales the output", () => {
		expect(outputGeometry(100, 50, { ...upright, scale: 2 })).toMatchObject({
			width: 200,
			height: 100,
		});
	});
});

describe("sourceToOutputMatrix", () => {
	it("turns right (clockwise on screen, y down) for a positive rotation", () => {
		expect(apply(sourceToOutputMatrix({ ...upright, rotation: 90 }, 1), 10, 0)).toEqual([0, 10]);
	});

	it("mirrors after rotating, like v1's canvas transform", () => {
		const matrix = sourceToOutputMatrix({ ...upright, rotation: 90, flipX: true }, 1);
		expect(apply(matrix, 10, 0)).toEqual([0, 10]);
		expect(apply(matrix, 0, 10)).toEqual([10, 0]);
	});

	it("applies the recipe scale and the preview scale", () => {
		expect(apply(sourceToOutputMatrix({ ...upright, scale: 2 }, 0.5), 10, 4)).toEqual([10, 4]);
	});
});
