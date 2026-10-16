// @vitest-environment node
// jsdom's Blob does not survive structured cloning into fake-indexeddb; Node's does.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { getBlob, newBlobId, openDatabase, type PhoenyxDatabase } from "$lib/core/storage";
import { FilterPresetLibrary } from "./presets.svelte";

let db: PhoenyxDatabase;

async function openPresets(): Promise<FilterPresetLibrary> {
	const presets = new FilterPresetLibrary(async () => db);
	await presets.whenReady();
	return presets;
}

beforeEach(async () => {
	globalThis.indexedDB = new IDBFactory();
	db = await openDatabase();
});

describe("FilterPresetLibrary", () => {
	it("keeps added presets across a reload, oldest first", async () => {
		const presets = await openPresets();
		const settings = { tone: { brightness: 10 }, color: {}, detail: {} };
		const first = await presets.add({ name: "Warm", category: "custom", settings });
		const second = await presets.add({ name: "Cold", category: "custom", settings });

		const reloaded = await openPresets();
		expect(reloaded.items.map((item) => item.preset)).toEqual([first, second]);
	});

	it("deletes a preset together with its thumbnail", async () => {
		const thumbBlobId = newBlobId();
		await db.put("blobs", new Blob(["thumb"]), thumbBlobId);
		await db.put("presets", {
			id: "v1-preset",
			name: "Migrated",
			category: "vintage",
			createdAt: new Date().toISOString(),
			settings: { tone: {}, color: { sepia: 30 }, detail: {} },
			thumbBlobId,
		});
		const presets = await openPresets();
		expect(presets.items[0]?.thumbnailUrl).toMatch(/^blob:/);

		await presets.remove("v1-preset");
		expect(presets.items).toEqual([]);
		expect(await db.get("presets", "v1-preset")).toBeUndefined();
		expect(await getBlob(db, thumbBlobId)).toBeUndefined();
	});
});
