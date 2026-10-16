import { describe, expect, test } from "vite-plus/test";
import { CropInteraction, clampCrop, largestCrop } from "./crop-interaction.svelte";

describe("crop interaction", () => {
	test("picking a ratio gives the largest centred box of that ratio", () => {
		expect(largestCrop("1:1", 2400, 500)).toEqual({ x: 950, y: 0, width: 500, height: 500 });
		expect(largestCrop("16:9", 1600, 1600)).toEqual({ x: 0, y: 350, width: 1600, height: 900 });
		expect(largestCrop("free", 300, 200)).toEqual({ x: 0, y: 0, width: 300, height: 200 });
	});

	test("a box never leaves the image", () => {
		expect(clampCrop({ x: -20, y: 90, width: 50, height: 50 }, 100, 100)).toEqual({
			x: 0,
			y: 50,
			width: 50,
			height: 50,
		});
	});

	test("starts from the applied crop, or the whole image", () => {
		const crop = new CropInteraction();
		crop.begin(null, 400, 300);
		expect(crop.rect).toEqual({ x: 0, y: 0, width: 400, height: 300 });
		crop.begin({ x: 10, y: 20, width: 30, height: 40 }, 400, 300);
		expect(crop.rect).toEqual({ x: 10, y: 20, width: 30, height: 40 });
	});

	test("Alt+arrow resizes, Shift moves 10 px", () => {
		const crop = new CropInteraction();
		crop.begin({ x: 50, y: 50, width: 100, height: 100 }, 400, 300);
		crop.nudge(new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true }));
		crop.nudge(new KeyboardEvent("keydown", { key: "ArrowDown", altKey: true }));
		expect(crop.rect).toEqual({ x: 60, y: 50, width: 100, height: 101 });
	});
});
