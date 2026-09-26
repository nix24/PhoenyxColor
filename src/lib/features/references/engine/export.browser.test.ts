import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ReferenceId } from "$lib/types/brands";
import { neutralRecipe, type EditRecipe } from "../domain";
import { RenderEngine } from "./engine";
import { exportImage } from "./export";
import { pixelAt, pngFromRows, type Rgba } from "./fixtures";

// SAFETY: a fixed UUID literal, which is what a ReferenceId is.
const neutral = neutralRecipe("9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d" as ReferenceId);

/** An edited recipe that uses most of the pipeline, so the comparison covers every pass type. */
const edited: EditRecipe = {
	...neutral,
	geometry: { ...neutral.geometry, rotation: 30, flipX: true },
	tone: { ...neutral.tone, brightness: 20, contrast: 30 },
	color: { ...neutral.color, hue: 40, vibrance: 50 },
	detail: { clarity: 40, blur: 1 },
	effects: [{ type: "glitch", intensity: 60, seed: 7 }],
	vignette: 50,
	strokes: [
		{
			id: crypto.randomUUID(),
			color: "#ff00ff",
			size: 3,
			points: [
				{ x: 2, y: 2 },
				{ x: 30, y: 20 },
			],
		},
	],
};

const SIZE = 48;

let engine: RenderEngine;

beforeEach(async () => {
	engine = new RenderEngine(document.createElement("canvas"));
	const rows = Array.from({ length: SIZE }, (_, y) =>
		Array.from({ length: SIZE }, (_, x): Rgba => [
			(x * 5) % 256,
			(y * 5) % 256,
			120,
			x === 0 && y === 0 ? 0 : 255,
		])
	);
	await engine.setSource(await pngFromRows(rows));
});

afterEach(() => engine.dispose());

async function decode(blob: Blob): Promise<ImageData> {
	const bitmap = await createImageBitmap(blob);
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const context = canvas.getContext("2d");
	if (!context) throw new Error("no 2D context");
	context.drawImage(bitmap, 0, 0);
	bitmap.close();
	return context.getImageData(0, 0, canvas.width, canvas.height);
}

describe("exportImage", () => {
	it("encodes exactly the pixels the preview path renders at the same size", async () => {
		engine.render(edited, 0.5);
		const preview = engine.readPixels();
		const exported = await exportImage(engine, edited, {
			format: "png",
			scale: 0.5,
			quality: 1,
			hasBackground: false,
		});
		const decoded = await decode(exported.blob);
		expect([decoded.width, decoded.height]).toEqual([preview.width, preview.height]);
		// Fully opaque pixels survive the 2D canvas exactly; compare those.
		let compared = 0;
		for (let i = 0; i < preview.data.length; i += 4) {
			if (preview.data[i + 3] !== 255) continue;
			compared++;
			expect(Array.from(decoded.data.subarray(i, i + 4))).toEqual(
				Array.from(preview.data.subarray(i, i + 4))
			);
		}
		expect(compared).toBeGreaterThan(100);
	});

	it("puts JPEG on white, since JPEG has no transparency", async () => {
		const exported = await exportImage(engine, neutral, {
			format: "jpeg",
			scale: 1,
			quality: 1,
			hasBackground: false,
		});
		expect(exported.blob.type).toBe("image/jpeg");
		const [r, g, b] = pixelAt(await decode(exported.blob), 0, 0);
		expect(Math.min(r, g, b)).toBeGreaterThan(200);
	});

	it("keeps transparency in PNG and honours format and scale", async () => {
		const png = await exportImage(engine, neutral, {
			format: "png",
			scale: 1,
			quality: 1,
			hasBackground: false,
		});
		expect(pixelAt(await decode(png.blob), 0, 0)[3]).toBe(0);
		const webp = await exportImage(engine, neutral, {
			format: "webp",
			scale: 2,
			quality: 0.8,
			hasBackground: false,
		});
		expect(webp.blob.type).toBe("image/webp");
		expect([webp.width, webp.height, webp.isReduced]).toEqual([96, 96, false]);
	});
});

describe("context loss", () => {
	it("refuses to render while lost, then re-uploads and renders the same again", async () => {
		const canvas = document.createElement("canvas");
		let restoredCount = 0;
		const restored = new Promise<void>((resolve) => {
			engine.dispose();
			engine = new RenderEngine(canvas, () => {
				restoredCount++;
				resolve();
			});
		});
		await engine.setSource(await pngFromRows([[[10, 200, 30, 255]]]));
		engine.render(neutral);
		const before = Array.from(engine.readPixels().data);

		const gl = canvas.getContext("webgl2");
		const lose = gl?.getExtension("WEBGL_lose_context");
		if (!lose) throw new Error("WEBGL_lose_context is not available");
		lose.loseContext();
		await expect.poll(() => engine.isContextLost).toBe(true);
		expect(() => engine.render(neutral)).toThrow(/context is lost/);

		lose.restoreContext();
		await restored;
		expect(restoredCount).toBe(1);
		engine.render(neutral);
		expect(Array.from(engine.readPixels().data)).toEqual(before);
	});
});
