// @vitest-environment node
// jsdom's Blob does not survive structured cloning into fake-indexeddb; Node's does.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
	getBlob,
	openDatabase,
	putBlob,
	Repository,
	runMigration,
	type Migration,
	type PhoenyxDatabase,
} from "./index";

const PresetSchema = z.object({ id: z.string(), label: z.string() });
type Preset = z.infer<typeof PresetSchema>;

const LegacyPresetSchema = z.object({ id: z.string(), name: z.string() });
type LegacyPreset = z.infer<typeof LegacyPresetSchema>;

const presetMigration: Migration<LegacyPreset, Preset> = {
	name: "presets-test",
	legacyKey: "phoenyx_filter_presets",
	legacySchema: LegacyPresetSchema,
	stores: ["presets"],
	async convert(legacy) {
		if (legacy.name === "unconvertible") throw new Error("cannot convert");
		return { id: legacy.id, label: legacy.name };
	},
	async write(tx, preset) {
		await tx.objectStore("presets").put(preset);
	},
};

async function writeLegacy(key: string, value: LegacyPreset[]): Promise<void> {
	const legacy = await openDB("PhoenyxColorDB", 1, {
		upgrade(db) {
			db.createObjectStore("keyval");
		},
	});
	await legacy.put("keyval", value, key);
	legacy.close();
}

async function readLegacy(key: string): Promise<LegacyPreset[] | undefined> {
	const legacy = await openDB("PhoenyxColorDB", 1);
	const stored = await legacy.get("keyval", key);
	legacy.close();
	// SAFETY: the test wrote this key itself with writeLegacy.
	return stored as LegacyPreset[] | undefined;
}

let db: PhoenyxDatabase;

beforeEach(async () => {
	// A fresh factory per test: every database starts empty.
	globalThis.indexedDB = new IDBFactory();
	db = await openDatabase();
});

describe("openDatabase", () => {
	it("creates every v2 store with its key path", () => {
		expect([...db.objectStoreNames].sort()).toEqual([
			"blobs",
			"gradients",
			"meta",
			"palettes",
			"presets",
			"recipes",
			"references",
		]);
		const tx = db.transaction(["references", "recipes", "blobs"]);
		expect(tx.objectStore("references").keyPath).toBe("id");
		expect([...tx.objectStore("references").indexNames]).toEqual(["createdAt"]);
		expect(tx.objectStore("recipes").keyPath).toBe("referenceId");
		expect(tx.objectStore("blobs").keyPath).toBeNull();
	});
});

describe("Repository", () => {
	it("returns valid records and moves invalid ones to quarantine exactly once", async () => {
		const presets = new Repository(db, "presets", PresetSchema);
		await presets.put({ id: "a", label: "Warm" });
		await db.put("presets", { id: "b", label: 42 });

		expect(await presets.getAll()).toEqual([{ id: "a", label: "Warm" }]);
		expect(await db.get("presets", "b")).toBeUndefined();
		expect(await presets.getAll()).toEqual([{ id: "a", label: "Warm" }]);

		const quarantined = await db.getAll("meta");
		expect(quarantined).toHaveLength(1);
		expect(quarantined[0]).toMatchObject({
			source: "presets",
			key: "b",
			record: { id: "b", label: 42 },
		});
	});

	it("quarantines an invalid record read by key", async () => {
		const presets = new Repository(db, "presets", PresetSchema);
		await db.put("presets", { id: "b" });
		expect(await presets.get("b")).toBeUndefined();
		expect(await db.getAll("meta")).toHaveLength(1);
	});
});

describe("blobs", () => {
	it("stores a blob and reads it back unchanged", async () => {
		const original = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
		const id = await putBlob(db, original);
		const stored = await getBlob(db, id);
		expect(stored?.type).toBe("image/png");
		expect(stored?.size).toBe(3);
	});
});

describe("runMigration", () => {
	it("migrates valid records, quarantines the rest, and keeps the legacy data", async () => {
		const legacyPresets = [
			{ id: "a", name: "Warm" },
			{ id: "b", name: "unconvertible" },
		];
		// The third record fails the legacy schema.
		await writeLegacy("phoenyx_filter_presets", [
			...legacyPresets,
			// SAFETY: deliberately invalid fixture record.
			{ id: "c" } as LegacyPreset,
		]);

		const result = await runMigration(db, presetMigration);

		expect(result).toEqual({ isAlreadyDone: false, migratedCount: 1, quarantinedCount: 2 });
		expect(await db.getAll("presets")).toEqual([{ id: "a", label: "Warm" }]);
		expect(await db.get("meta", "migration:presets-test")).toBeDefined();
		const reasons = (await db.getAll("meta")).flatMap(
			(entry) => z.object({ reason: z.string() }).safeParse(entry).data?.reason ?? []
		);
		expect(reasons).toContain("cannot convert");
		expect(reasons).toHaveLength(2);
		expect(await readLegacy("phoenyx_filter_presets")).toHaveLength(3);
	});

	it("does nothing on a second run", async () => {
		await writeLegacy("phoenyx_filter_presets", [{ id: "a", name: "Warm" }]);
		await runMigration(db, presetMigration);
		await db.put("presets", { id: "a", label: "Edited after migration" });

		const result = await runMigration(db, presetMigration);

		expect(result.isAlreadyDone).toBe(true);
		expect(await db.get("presets", "a")).toEqual({ id: "a", label: "Edited after migration" });
	});

	it("writes nothing when a write fails, so it can run again", async () => {
		await writeLegacy("phoenyx_filter_presets", [
			{ id: "a", name: "Warm" },
			{ id: "b", name: "Cool" },
		]);
		const failingMigration: Migration<LegacyPreset, Preset> = {
			...presetMigration,
			async write(tx, preset) {
				if (preset.id === "b") throw new Error("disk full");
				await tx.objectStore("presets").put(preset);
			},
		};

		await expect(runMigration(db, failingMigration)).rejects.toThrow("nothing was written");
		expect(await db.getAll("presets")).toEqual([]);
		expect(await db.getAll("meta")).toEqual([]);

		const retry = await runMigration(db, presetMigration);
		expect(retry.migratedCount).toBe(2);
	});

	it("marks a missing legacy collection as migrated", async () => {
		const result = await runMigration(db, presetMigration);
		expect(result).toEqual({ isAlreadyDone: false, migratedCount: 0, quarantinedCount: 0 });
		expect(await db.get("meta", "migration:presets-test")).toBeDefined();
	});
});
