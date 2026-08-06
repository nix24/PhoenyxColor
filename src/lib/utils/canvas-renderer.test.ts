import { describe, expect, test } from "vitest";
import { getOutputGeometry } from "./canvas-renderer";

describe("getOutputGeometry", () => {
	test("swaps output dimensions for a quarter turn", () => {
		expect(
			getOutputGeometry({
				sourceWidth: 400,
				sourceHeight: 300,
				rotation: 90,
				cropRect: null,
			}),
		).toMatchObject({ outputWidth: 300, outputHeight: 400 });
	});

	test("uses the crop as the source bounds before rotation", () => {
		expect(
			getOutputGeometry({
				sourceWidth: 400,
				sourceHeight: 300,
				rotation: 90,
				cropRect: { x: 20, y: 30, width: 100, height: 50 },
			}),
		).toEqual({
			sourceX: 20,
			sourceY: 30,
			sourceWidth: 100,
			sourceHeight: 50,
			outputWidth: 50,
			outputHeight: 100,
		});
	});

	test("expands arbitrary rotations to avoid clipping", () => {
		expect(
			getOutputGeometry({
				sourceWidth: 100,
				sourceHeight: 200,
				rotation: 45,
				cropRect: null,
			}),
		).toMatchObject({ outputWidth: 213, outputHeight: 213 });
	});
});
