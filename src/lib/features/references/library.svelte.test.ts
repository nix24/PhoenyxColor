// @vitest-environment node
// jsdom's Blob does not survive structured cloning into fake-indexeddb; Node's does.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { beforeEach, describe, expect, it } from "vitest";
import { getBlob, openDatabase, type PhoenyxDatabase } from "$lib/core/storage";
import { EditRecipeSchema, neutralRecipe, ReferenceSchema, type EditRecipe } from "./domain";
import { ReferenceLibrary, type LibraryDependencies } from "./library.svelte";

const PNG_DATA_URL =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

let db: PhoenyxDatabase;
let renderedRecipes: EditRecipe[];

function dependencies(): LibraryDependencies {
	return {
		database: async () => db,
		describeImage: async () => ({
			width: 800,
			height: 600,
			thumbnail: new Blob(["plain thumbnail"], { type: "image/webp" }),
		}),
		renderThumbnail: async (_original, recipe) => {
			renderedRecipes.push(recipe);
			return new Blob(["edited thumbnail"], { type: "image/webp" });
		},
	};
}

async function openLibrary(): Promise<ReferenceLibrary> {
	const library = new ReferenceLibrary(dependencies());
	await library.whenReady();
	return library;
}

function imageFile(name: string): File {
	return new File([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], name, { type: "image/png" });
}

async function storedRecipe(id: string): Promise<EditRecipe | undefined> {
	const stored = await db.get("recipes", id);
	return stored === undefined ? undefined : EditRecipeSchema.parse(stored);
}

beforeEach(async () => {
	globalThis.indexedDB = new IDBFactory();
	db = await openDatabase();
	renderedRecipes = [];
});

describe("ReferenceLibrary", () => {
	it("imports a file as-is with a neutral recipe", async () => {
		const library = await openLibrary();
		const file = imageFile("sunset.final.png");
		const { reference } = await library.importImage(file);

		expect(reference).toMatchObject({ name: "sunset.final", width: 800, height: 600, tags: [] });
		expect(library.items.map((item) => item.reference.id)).toEqual([reference.id]);
		const original = await getBlob(db, reference.originalBlobId);
		expect(new Uint8Array(await (original ?? new Blob()).arrayBuffer())).toEqual(
			new Uint8Array(await file.arrayBuffer())
		);
		expect(await storedRecipe(reference.id)).toEqual(neutralRecipe(reference.id));
	});

	it("lists what is stored, newest first, after a reload", async () => {
		const first = await openLibrary();
		const older = await first.importImage(imageFile("older.png"));
		const newer = await first.importImage(imageFile("newer.png"));
		const reloaded = await openLibrary();
		expect(reloaded.items.map((item) => item.reference.id)).toEqual([
			newer.reference.id,
			older.reference.id,
		]);
	});

	it("deletes a reference with its recipe and images, and undo puts everything back", async () => {
		const library = await openLibrary();
		const { reference } = await library.importImage(imageFile("gone.png"));
		const removed = await library.remove(reference.id);

		expect(library.items).toEqual([]);
		expect(await db.count("references")).toBe(0);
		expect(await db.count("recipes")).toBe(0);
		expect(await db.count("blobs")).toBe(0);

		if (!removed) throw new Error("nothing was removed");
		await library.restore(removed);
		expect(library.items.map((item) => item.reference)).toEqual([reference]);
		expect(await db.count("blobs")).toBe(2);
		expect(await storedRecipe(reference.id)).toEqual(neutralRecipe(reference.id));
	});

	it("duplicates into independent copies of the images", async () => {
		const library = await openLibrary();
		const { reference } = await library.importImage(imageFile("twin.png"));
		const copy = await library.duplicate(reference.id);
		if (!copy) throw new Error("nothing was copied");

		expect(copy.reference.name).toBe("twin (Copy)");
		expect(copy.reference.originalBlobId).not.toBe(reference.originalBlobId);
		await library.remove(reference.id);
		expect(await getBlob(db, copy.reference.originalBlobId)).toBeDefined();
		expect(await storedRecipe(copy.reference.id)).toEqual(neutralRecipe(copy.reference.id));
	});

	it("re-renders a thumbnail and swaps its blob", async () => {
		const library = await openLibrary();
		const { reference } = await library.importImage(imageFile("edit.png"));
		await library.refreshThumbnail(reference.id);

		const updated = ReferenceSchema.parse(await db.get("references", reference.id));
		expect(updated.thumbBlobId).not.toBe(reference.thumbBlobId);
		expect(await getBlob(db, reference.thumbBlobId)).toBeUndefined();
		expect(await (await getBlob(db, updated.thumbBlobId))?.text()).toBe("edited thumbnail");
		expect(library.find(reference.id)?.reference.thumbBlobId).toBe(updated.thumbBlobId);
	});

	it("migrates the v1 library on first load and renders edited thumbnails", async () => {
		const legacy = await openDB("PhoenyxColorDB", 1, {
			upgrade(legacyDb) {
				legacyDb.createObjectStore("keyval");
			},
		});
		const base = { src: PNG_DATA_URL, createdAt: new Date("2026-01-01T00:00:00Z") };
		await legacy.put(
			"keyval",
			[
				{ ...base, id: "0b6a3f4e-5c2d-4e8f-9a1b-7c3d2e1f0a9b", name: "Edited", brightness: 150 },
				{ ...base, id: "9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a", name: "Plain" },
			],
			"phoenyx_references"
		);
		legacy.close();

		const library = await openLibrary();
		expect(library.items.map((item) => item.reference.name).sort()).toEqual(["Edited", "Plain"]);
		expect(renderedRecipes.map((recipe) => recipe.tone.brightness)).toEqual([50]);
		const plain = library.find("9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a")?.reference;
		if (!plain) throw new Error("the plain reference was not migrated");
		expect(await (await getBlob(db, plain.thumbBlobId))?.text()).toBe("plain thumbnail");
	});
});
