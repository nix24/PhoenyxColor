import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openDatabase, type PhoenyxDatabase } from "$lib/core/storage";
import type { ReferenceId } from "$lib/types/brands";
import { EditRecipeSchema, neutralRecipe, type EditRecipe } from "./domain";
import { openEditSession, type EditSession } from "./session.svelte";

// SAFETY: a fixed UUID literal, which is what a ReferenceId is.
const referenceId = "5b4a3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d" as ReferenceId;

function withBrightness(brightness: number): EditRecipe {
	const recipe = neutralRecipe(referenceId);
	return { ...recipe, tone: { ...recipe.tone, brightness } };
}

async function storedBrightness(): Promise<number | undefined> {
	const stored = await db.get("recipes", referenceId);
	return stored === undefined ? undefined : EditRecipeSchema.parse(stored).tone.brightness;
}

function setVisibility(state: DocumentVisibilityState): void {
	Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
	document.dispatchEvent(new Event("visibilitychange"));
}

let db: PhoenyxDatabase;
let session: EditSession;

beforeEach(async () => {
	globalThis.indexedDB = new IDBFactory();
	db = await openDatabase();
	session = await openEditSession(db, referenceId);
	// Only the debounce clock: fake-indexeddb schedules its own work with setImmediate.
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(async () => {
	vi.useRealTimers();
	await session.dispose();
	setVisibility("visible");
});

describe("EditSession", () => {
	it("opens an unedited reference on the neutral recipe", () => {
		expect(session.recipe).toEqual(neutralRecipe(referenceId));
	});

	it("turns a whole slider drag into one undo step, saved after the delay", async () => {
		for (const brightness of [10, 20, 30]) session.preview(withBrightness(brightness));
		session.commit("Brightness");

		expect(session.history.undoLabel).toBe("Brightness");
		await vi.advanceTimersByTimeAsync(399);
		expect(await storedBrightness()).toBeUndefined();
		await vi.advanceTimersByTimeAsync(1);
		expect(await storedBrightness()).toBe(30);

		session.undo();
		expect(session.recipe.tone.brightness).toBe(0);
		expect(session.history.canUndo).toBe(false);
	});

	it("never saves a preview that was not committed", async () => {
		session.preview(withBrightness(40));
		await vi.advanceTimersByTimeAsync(1000);
		await session.flush();
		expect(await storedBrightness()).toBeUndefined();
	});

	it("saves at once when the page is hidden", async () => {
		session.commit("Brightness", withBrightness(25));
		setVisibility("hidden");
		await vi.waitFor(async () => expect(await storedBrightness()).toBe(25));
	});

	it("saves the state an undo returns to", async () => {
		session.commit("Brightness", withBrightness(25));
		session.commit("Brightness", withBrightness(50));
		session.undo();
		await vi.advanceTimersByTimeAsync(400);
		expect(await storedBrightness()).toBe(25);
	});

	it("reopens on the saved recipe", async () => {
		session.commit("Brightness", withBrightness(60));
		await session.dispose();
		const reopened = await openEditSession(db, referenceId);
		expect(reopened.recipe.tone.brightness).toBe(60);
		await reopened.dispose();
	});

	it("stops saving on page events after dispose", async () => {
		await session.dispose();
		session.commit("Brightness", withBrightness(70));
		// Drop the debounce timer so only a page event could still write.
		vi.clearAllTimers();
		setVisibility("hidden");
		await vi.advanceTimersByTimeAsync(0);
		expect(await storedBrightness()).toBeUndefined();
	});

	it("reports a failed save instead of dropping it silently", async () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		db.close();
		session.commit("Brightness", withBrightness(80));
		await session.flush();
		expect(session.saveError).not.toBeNull();
	});
});
