import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type PhoenyxDatabase } from "$lib/core/storage";
import { ReferenceEditor } from "./editor.svelte";
import { decode, pixelAt, pngFromRows, type Rgba } from "./engine/fixtures";
import { describeImage } from "./image-description";
import { ReferenceLibrary } from "./library.svelte";
import { renderThumbnail } from "./thumbnail";

const WIDTH = 40;
const HEIGHT = 20;

async function solidPng(color: Rgba): Promise<Blob> {
	const row = Array.from({ length: WIDTH }, () => color);
	return pngFromRows(Array.from({ length: HEIGHT }, () => row));
}

const png = { format: "png", scale: 1, quality: 1, hasBackground: false } as const;

let db: PhoenyxDatabase;
let library: ReferenceLibrary;
let editor: ReferenceEditor;

beforeEach(async () => {
	db = await openDatabase(`editor-test-${crypto.randomUUID()}`);
	library = new ReferenceLibrary({ database: async () => db, describeImage, renderThumbnail });
	await library.whenReady();
	const photo = new File([await solidPng([128, 128, 128, 255])], "photo.png", {
		type: "image/png",
	});
	const { reference } = await library.importImage(photo);
	editor = await ReferenceEditor.open(library, db, reference.id);
	await editor.attach(document.createElement("canvas"));
});

afterEach(async () => {
	await editor.close();
	db.close();
});

/** Commits a visible edit; returns the reference and the thumbnail it had before. */
function commitInvert() {
	const id = editor.reference.id;
	const thumbBefore = library.find(id)?.reference.thumbBlobId;
	editor.commit("Adjust", { ...editor.recipe, color: { ...editor.recipe.color, invert: 100 } });
	return { id, thumbBefore };
}

describe("ReferenceEditor", () => {
	it("merge down really composites the two layers, in one undo step", async () => {
		await editor.addLayerImage(await solidPng([0, 0, 255, 255]), "blue");
		await editor.addLayerImage(await solidPng([255, 0, 0, 255]), "red");
		const [, red] = editor.recipe.layers;
		if (!red) throw new Error("missing layer");
		editor.updateLayer(red.id, { opacity: 0.5 });
		const before = pixelAt(await decode((await editor.export(png)).blob), 5, 5);

		await editor.mergeDown(red.id);
		expect(editor.recipe.layers).toHaveLength(1);
		const after = pixelAt(await decode((await editor.export(png)).blob), 5, 5);
		for (const [channel, value] of after.entries()) {
			expect(Math.abs(value - (before[channel] ?? 0))).toBeLessThanOrEqual(2);
		}
		expect(after[0]).toBeGreaterThan(100);
		expect(after[2]).toBeGreaterThan(100);

		editor.undo();
		expect(editor.recipe.layers).toHaveLength(2);
	});

	it("an applied effect renders exactly like its preview", async () => {
		editor.selectEffect("glitch");
		editor.effectIntensity = 80;
		const previewed = await decode((await editor.export(png)).blob);
		editor.applyEffect();
		expect(editor.pendingEffect).toBeNull();
		const applied = await decode((await editor.export(png)).blob);
		expect(applied.data).toEqual(previewed.data);
	});

	it("closing after an edit saves the recipe and refreshes the thumbnail", async () => {
		const { id, thumbBefore } = commitInvert();
		await editor.close();
		expect(library.find(id)?.reference.thumbBlobId).not.toBe(thumbBefore);
		const reopened = await ReferenceEditor.open(library, db, id);
		expect(reopened.recipe.color.invert).toBe(100);
		await reopened.close();
	});

	it("renders a stale thumbnail when an edit was saved without closing (e.g. a reload)", async () => {
		const { id, thumbBefore } = commitInvert();
		// A reload saves the recipe (pagehide) but never gets to close the editor.
		await editor.session.dispose();

		const reopened = await ReferenceEditor.open(library, db, id);
		await reopened.attach(document.createElement("canvas"));
		await expect
			.poll(() => library.find(id)?.reference.thumbBlobId, { timeout: 3000 })
			.not.toBe(thumbBefore);
		await reopened.close();
	});
});
