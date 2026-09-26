import { History } from "$lib/core/history/history.svelte";
import { Repository, type PhoenyxDatabase } from "$lib/core/storage";
import type { ReferenceId } from "$lib/types/brands";
import { EditRecipeSchema, neutralRecipe, type EditRecipe } from "./domain";

const SAVE_DELAY_MS = 400;

type RecipeRepository = Repository<typeof EditRecipeSchema>;

/**
 * The editing state of one open reference. Previews (a slider mid-drag) are never saved; each
 * committed step is saved shortly after, and at once when the page is hidden or closed.
 */
export class EditSession {
	readonly history: History<EditRecipe>;
	saveError = $state<string | null>(null);
	/** The committed recipe waiting to be written; null when storage is up to date. */
	#unsaved: EditRecipe | null = null;
	#saveTimer: ReturnType<typeof setTimeout> | undefined;
	readonly #recipes: RecipeRepository;

	constructor(recipes: RecipeRepository, recipe: EditRecipe) {
		this.#recipes = recipes;
		this.history = new History(recipe);
		document.addEventListener("visibilitychange", this.#flushWhenHidden);
		window.addEventListener("pagehide", this.#flushNow);
	}

	get recipe(): EditRecipe {
		return this.history.present;
	}

	preview(next: EditRecipe): void {
		this.history.preview(next);
	}

	cancelPreview(): void {
		this.history.cancelPreview();
	}

	/** One undo step, e.g. on pointer-up after a slider drag (then `next` may be omitted). */
	commit(label: string, next?: EditRecipe): void {
		this.history.commit(label, next);
		this.#scheduleSave();
	}

	undo(): void {
		if (!this.history.canUndo) return;
		this.history.undo();
		this.#scheduleSave();
	}

	redo(): void {
		if (!this.history.canRedo) return;
		this.history.redo();
		this.#scheduleSave();
	}

	/** Writes the last committed recipe now, if it has not been written yet. */
	async flush(): Promise<void> {
		clearTimeout(this.#saveTimer);
		const recipe = this.#unsaved;
		if (recipe === null) return;
		this.#unsaved = null;
		try {
			await this.#recipes.put(recipe);
			this.saveError = null;
		} catch (cause) {
			// Keep it for the next save unless a newer commit already replaced it.
			this.#unsaved ??= recipe;
			console.error("Failed to save the edit recipe:", cause);
			this.saveError = "Your latest edits could not be saved on this device.";
		}
	}

	/** Call when the editor closes: saves pending edits and stops listening to the page. */
	async dispose(): Promise<void> {
		document.removeEventListener("visibilitychange", this.#flushWhenHidden);
		window.removeEventListener("pagehide", this.#flushNow);
		await this.flush();
	}

	#scheduleSave(): void {
		this.#unsaved = $state.snapshot(this.history.present);
		clearTimeout(this.#saveTimer);
		this.#saveTimer = setTimeout(this.#flushNow, SAVE_DELAY_MS);
	}

	readonly #flushNow = (): void => {
		void this.flush();
	};

	readonly #flushWhenHidden = (): void => {
		if (document.visibilityState === "hidden") void this.flush();
	};
}

/** Opens a session on the saved recipe, or on the neutral one for an unedited reference. */
export async function openEditSession(
	db: PhoenyxDatabase,
	referenceId: ReferenceId
): Promise<EditSession> {
	const recipes = new Repository(db, "recipes", EditRecipeSchema);
	const saved = await recipes.get(referenceId);
	return new EditSession(recipes, saved ?? neutralRecipe(referenceId));
}
