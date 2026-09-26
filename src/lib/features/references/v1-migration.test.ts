// @vitest-environment node
// jsdom's Blob does not survive structured cloning into fake-indexeddb; Node's does.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import { getBlob, openDatabase, runMigration, type PhoenyxDatabase } from "$lib/core/storage";
import type { ReferenceId } from "$lib/types/brands";
import { neutralRecipe, ReferenceSchema, type EditRecipe } from "./domain";
import { filterPresetsMigration, referencesMigration, type DescribeImage } from "./v1-migration";

/** What v1 put into its `keyval` store: structured-clone values, dates included. */
type StoredValue = string | number | boolean | null | Date | StoredValue[] | StoredRecord;
interface StoredRecord {
	[field: string]: StoredValue;
}

// A 1×1 transparent PNG: the migration must keep its bytes (and so its alpha) untouched.
const PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const PNG_DATA_URL = `data:image/png;base64,${PNG_BASE64}`;

const EDITED_ID = "0b6a3f4e-5c2d-4e8f-9a1b-7c3d2e1f0a9b";
const PLAIN_ID = "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a";
const CREATED_AT = new Date("2026-05-01T12:00:00.000Z");

const describeImage: DescribeImage = async () => ({
	width: 640,
	height: 480,
	thumbnail: new Blob(["thumbnail"], { type: "image/webp" }),
});

const editedReference: StoredRecord = {
	id: EDITED_ID,
	name: "Harbour",
	src: PNG_DATA_URL,
	thumbnailSrc: PNG_DATA_URL,
	position: { x: 10, y: 20 },
	scale: 1.5,
	rotation: 90,
	opacity: 0.8,
	isGrayscale: false,
	createdAt: CREATED_AT,
	dimensions: { width: 1, height: 1 },
	brightness: 150,
	contrast: 80,
	saturation: 100,
	hueRotate: 30,
	// Above v1's own schema cap of 10, but its slider allowed it.
	blur: 15,
	sepia: 5,
	flipX: true,
	gradientMapOpacity: 0.5,
	gradientMapBlendMode: "multiply",
	shadows: -20,
	clarity: 10,
	vignette: 40,
	cropRect: { x: 1, y: 2, width: 300, height: 200 },
	appliedEffects: [
		{ type: "none", intensity: 0 },
		{ type: "glitch", intensity: 60 },
		{ type: "duotone", intensity: 100, duotoneColors: ["#123", "#FFEEDD"] },
		{ type: "duotone", intensity: 50 },
	],
	drawStrokes: [
		{
			id: "3e2d1c0b-9a8f-4e7d-8c6b-5a4f3e2d1c0b",
			color: "#F00",
			size: 4,
			points: [{ x: 1, y: 1 }],
		},
	],
	layers: [
		{
			id: "7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d",
			name: "Sticker",
			type: "image",
			src: "blob:http://localhost/dead",
			opacity: 1,
			blendMode: "normal",
			visible: true,
			locked: false,
		},
	],
	activeLayerId: "7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d",
};

const plainReference: StoredRecord = {
	id: PLAIN_ID,
	name: "Plain",
	src: PNG_DATA_URL,
	position: { x: 0, y: 0 },
	scale: 1,
	rotation: 0,
	opacity: 1,
	isGrayscale: false,
	createdAt: CREATED_AT,
};

// Its image only ever lived in a session-scoped `blob:` URL, so it cannot be migrated.
const unreadableReference: StoredRecord = {
	...plainReference,
	id: "1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d",
	src: "blob:http://localhost/gone",
};

async function writeLegacy(key: string, records: StoredRecord[]): Promise<void> {
	const legacy = await openDB("PhoenyxColorDB", 1, {
		upgrade(legacyDb) {
			legacyDb.createObjectStore("keyval");
		},
	});
	await legacy.put("keyval", records, key);
	legacy.close();
}

async function legacyRecordCount(key: string): Promise<number> {
	const legacy = await openDB("PhoenyxColorDB", 1);
	const stored = await legacy.get("keyval", key);
	legacy.close();
	return Array.isArray(stored) ? stored.length : 0;
}

let db: PhoenyxDatabase;

beforeEach(async () => {
	globalThis.indexedDB = new IDBFactory();
	db = await openDatabase();
});

describe("referencesMigration", () => {
	beforeEach(async () => {
		await writeLegacy("phoenyx_references", [editedReference, plainReference, unreadableReference]);
	});

	it("migrates every readable reference, quarantines the rest, and keeps the v1 data", async () => {
		const result = await runMigration(db, referencesMigration(describeImage));

		expect(result).toEqual({ isAlreadyDone: false, migratedCount: 2, quarantinedCount: 1 });
		expect(await db.count("references")).toBe(2);
		expect(await db.count("recipes")).toBe(2);
		const quarantine = await db.getAll("meta");
		expect(quarantine).toContainEqual(
			expect.objectContaining({
				source: "phoenyx_references",
				record: expect.objectContaining({ src: "blob:http://localhost/gone" }),
				reason: expect.stringContaining("not a data URL"),
			})
		);
		expect(await legacyRecordCount("phoenyx_references")).toBe(3);
	});

	it("stores the original image bytes as-is and measures the image itself", async () => {
		await runMigration(db, referencesMigration(describeImage));

		expect(await db.get("references", EDITED_ID)).toEqual({
			id: EDITED_ID,
			name: "Harbour",
			createdAt: "2026-05-01T12:00:00.000Z",
			width: 640,
			height: 480,
			originalBlobId: expect.any(String),
			thumbBlobId: expect.any(String),
			tags: [],
		});
		const reference = ReferenceSchema.parse(await db.get("references", EDITED_ID));
		const original = await getBlob(db, reference.originalBlobId);
		expect(original?.type).toBe("image/png");
		const pngBytes = Uint8Array.from(atob(PNG_BASE64), (char) => char.charCodeAt(0));
		expect(new Uint8Array((await original?.arrayBuffer()) ?? [])).toEqual(pngBytes);
		const thumbnail = await getBlob(db, reference.thumbBlobId);
		expect(await thumbnail?.text()).toBe("thumbnail");
	});

	it("maps every v1 edit onto the recipe", async () => {
		await runMigration(db, referencesMigration(describeImage));

		// SAFETY: EDITED_ID is a fixed UUID literal.
		const base = neutralRecipe(EDITED_ID as ReferenceId);
		const expected: EditRecipe = {
			...base,
			geometry: {
				crop: { x: 1, y: 2, width: 300, height: 200 },
				rotation: 90,
				flipX: true,
				flipY: false,
				scale: 1.5,
			},
			tone: { brightness: 50, contrast: -20, shadows: -20, highlights: 0 },
			color: { ...base.color, saturation: 0, hue: 30, sepia: 5 },
			detail: { clarity: 10, blur: 15 },
			effects: [
				{ type: "glitch", intensity: 60, seed: 1 },
				{ type: "duotone", intensity: 100, seed: 2, colors: ["#112233", "#ffeedd"] },
			],
			vignette: 40,
			gradientMap: null,
			opacity: 0.8,
			layers: [],
			strokes: [
				{
					id: "3e2d1c0b-9a8f-4e7d-8c6b-5a4f3e2d1c0b",
					color: "#ff0000",
					size: 4,
					points: [{ x: 1, y: 1 }],
				},
			],
		};
		expect(await db.get("recipes", EDITED_ID)).toEqual(expected);
		// SAFETY: PLAIN_ID is a fixed UUID literal.
		expect(await db.get("recipes", PLAIN_ID)).toEqual(neutralRecipe(PLAIN_ID as ReferenceId));
	});
});

describe("filterPresetsMigration", () => {
	it("keeps only the settings a preset set, and quarantines an invalid preset", async () => {
		await writeLegacy("phoenyx_filter_presets", [
			{
				id: "preset-1",
				name: "Warm",
				category: "vintage",
				createdAt: CREATED_AT,
				settings: { brightness: 110, temperature: 30, isGrayscale: false, vignette: 20 },
				thumbnail: PNG_DATA_URL,
			},
			{
				id: "preset-2",
				name: "Broken",
				category: "not-a-category",
				createdAt: CREATED_AT,
				settings: {},
			},
		]);

		const result = await runMigration(db, filterPresetsMigration);

		expect(result).toEqual({ isAlreadyDone: false, migratedCount: 1, quarantinedCount: 1 });
		expect(await db.get("presets", "preset-1")).toEqual({
			id: "preset-1",
			name: "Warm",
			category: "vintage",
			createdAt: "2026-05-01T12:00:00.000Z",
			settings: {
				tone: { brightness: 10 },
				color: { temperature: 30, isGrayscale: false },
				detail: {},
				vignette: 20,
			},
			thumbBlobId: expect.any(String),
		});
		expect(await legacyRecordCount("phoenyx_filter_presets")).toBe(2);
	});
});
