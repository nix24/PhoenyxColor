import {
	getBlob,
	newBlobId,
	Repository,
	runMigration,
	type BlobId,
	type PhoenyxDatabase,
} from "$lib/core/storage";
import type { ReferenceId } from "$lib/types/brands";
import {
	EditRecipeSchema,
	neutralRecipe,
	ReferenceSchema,
	type EditRecipe,
	type Reference,
} from "./domain";
import { filterPresetsMigration, referencesMigration, type DescribeImage } from "./v1-migration";

/** Renders a reference as edited, as a small image for the library grid. */
export type RenderThumbnail = (
	original: Blob,
	recipe: EditRecipe,
	layerImages: Map<BlobId, Blob>
) => Promise<Blob>;

export interface LibraryDependencies {
	database: () => Promise<PhoenyxDatabase>;
	describeImage: DescribeImage;
	renderThumbnail: RenderThumbnail;
}

/** What the library grid shows for one reference. */
export interface LibraryItem {
	reference: Reference;
	/** Object URL of the thumbnail; revoked when the item leaves the library. */
	thumbnailUrl: string;
}

interface StoredBlob {
	id: BlobId;
	blob: Blob;
}

/** Everything a deleted reference owned, kept in memory so the deletion can be undone. */
export interface RemovedReference {
	reference: Reference;
	recipe: EditRecipe | undefined;
	blobs: StoredBlob[];
}

const MAX_NAME_LENGTH = 100;

/** A valid reference name: `base` (or "Untitled") cut to fit, then `suffix`. */
function referenceName(base: string, suffix = ""): string {
	return `${(base.trim() || "Untitled").slice(0, MAX_NAME_LENGTH - suffix.length)}${suffix}`;
}

function isNeutral(recipe: EditRecipe): boolean {
	return JSON.stringify(recipe) === JSON.stringify(neutralRecipe(recipe.referenceId));
}

function newestFirst(a: LibraryItem, b: LibraryItem): number {
	return b.reference.createdAt.localeCompare(a.reference.createdAt);
}

/**
 * The References library on the v2 database: domain records in IndexedDB, object URLs as derived
 * state. On first load it migrates the v1 library (kept in `PhoenyxColorDB`).
 */
export class ReferenceLibrary {
	/** Newest first. */
	items = $state<LibraryItem[]>([]);
	isReady = $state(false);
	loadError = $state<string | null>(null);
	readonly #dependencies: LibraryDependencies;
	#loading: Promise<void>;
	#hasRequestedPersistence = false;

	constructor(dependencies: LibraryDependencies) {
		this.#dependencies = dependencies;
		this.#loading = this.load();
	}

	whenReady(): Promise<void> {
		return this.#loading;
	}

	find(id: string): LibraryItem | undefined {
		return this.items.find((item) => item.reference.id === id);
	}

	/** Loads (and, the first time, migrates) the library. Safe to call again to retry. */
	load(): Promise<void> {
		this.#loading = this.#load();
		return this.#loading;
	}

	async #load(): Promise<void> {
		this.isReady = false;
		this.loadError = null;
		try {
			const db = await this.#dependencies.database();
			const migrated = await runMigration(
				db,
				referencesMigration(this.#dependencies.describeImage)
			);
			await runMigration(db, filterPresetsMigration);
			if (migrated.migratedCount > 0) await this.#renderEditedThumbnails(db);
			const references = await new Repository(db, "references", ReferenceSchema).getAll();
			const items = await Promise.all(
				references.map(async (reference) => ({
					reference,
					thumbnailUrl: await this.#thumbnailUrl(db, reference.thumbBlobId),
				}))
			);
			for (const item of this.items) URL.revokeObjectURL(item.thumbnailUrl);
			this.items = items.sort(newestFirst);
		} catch (cause) {
			console.error("Failed to load references:", cause);
			this.loadError = "Reference images could not be loaded from this device.";
		} finally {
			this.isReady = true;
		}
	}

	/** Adds an image file as-is: full resolution, original bytes, transparency intact. */
	async importImage(file: File): Promise<LibraryItem> {
		const db = await this.#dependencies.database();
		const { width, height, thumbnail } = await this.#dependencies.describeImage(file);
		const reference = ReferenceSchema.parse({
			id: crypto.randomUUID(),
			name: referenceName(file.name.replace(/\.[^/.]+$/, "")),
			createdAt: new Date().toISOString(),
			width,
			height,
			originalBlobId: newBlobId(),
			thumbBlobId: newBlobId(),
			tags: [],
		});
		await this.#write(db, reference, neutralRecipe(reference.id), [
			{ id: reference.originalBlobId, blob: file },
			{ id: reference.thumbBlobId, blob: thumbnail },
		]);
		this.#requestPersistence();
		const item = { reference, thumbnailUrl: URL.createObjectURL(thumbnail) };
		this.items = [item, ...this.items];
		return item;
	}

	/** Deletes a reference with its recipe and images, in one transaction. */
	async remove(id: ReferenceId): Promise<RemovedReference | undefined> {
		const item = this.find(id);
		if (!item) return undefined;
		const { reference } = item;
		const db = await this.#dependencies.database();
		const recipe = await new Repository(db, "recipes", EditRecipeSchema).get(id);
		const blobIds = new Set([
			reference.originalBlobId,
			reference.thumbBlobId,
			...(recipe?.layers.map((layer) => layer.blobId) ?? []),
		]);
		const tx = db.transaction(["references", "recipes", "blobs"], "readwrite");
		const blobs: StoredBlob[] = [];
		for (const blobId of blobIds) {
			const blob = await tx.objectStore("blobs").get(blobId);
			if (blob) blobs.push({ id: blobId, blob });
			await tx.objectStore("blobs").delete(blobId);
		}
		await tx.objectStore("recipes").delete(id);
		await tx.objectStore("references").delete(id);
		await tx.done;
		URL.revokeObjectURL(item.thumbnailUrl);
		this.items = this.items.filter((entry) => entry.reference.id !== id);
		return { reference, recipe, blobs };
	}

	/** Puts a removed reference back exactly as it was. */
	async restore(removed: RemovedReference): Promise<void> {
		const db = await this.#dependencies.database();
		await this.#write(db, removed.reference, removed.recipe, removed.blobs);
		const thumbnail = removed.blobs.find((entry) => entry.id === removed.reference.thumbBlobId);
		const item = {
			reference: removed.reference,
			thumbnailUrl: thumbnail ? URL.createObjectURL(thumbnail.blob) : "",
		};
		this.items = [...this.items, item].sort(newestFirst);
	}

	/** Copies a reference, its edits and its images, so either copy can be deleted alone. */
	async duplicate(id: ReferenceId): Promise<LibraryItem | undefined> {
		const source = this.find(id)?.reference;
		if (!source) return undefined;
		const db = await this.#dependencies.database();
		const recipe = await new Repository(db, "recipes", EditRecipeSchema).get(id);
		const copies = new Map<BlobId, BlobId>();
		const copyOf = (blobId: BlobId) => {
			const copy = copies.get(blobId) ?? newBlobId();
			copies.set(blobId, copy);
			return copy;
		};
		const reference = ReferenceSchema.parse({
			...source,
			id: crypto.randomUUID(),
			name: referenceName(source.name, " (Copy)"),
			createdAt: new Date().toISOString(),
			originalBlobId: copyOf(source.originalBlobId),
			thumbBlobId: copyOf(source.thumbBlobId),
		});
		const recipeCopy: EditRecipe = {
			...(recipe ?? neutralRecipe(source.id)),
			referenceId: reference.id,
		};
		recipeCopy.layers = recipeCopy.layers.map((layer) => ({
			...layer,
			blobId: copyOf(layer.blobId),
		}));
		const blobs: StoredBlob[] = [];
		for (const [sourceId, copyId] of copies) {
			const blob = await getBlob(db, sourceId);
			if (!blob) throw new Error(`"${source.name}" is missing an image and cannot be copied.`);
			blobs.push({ id: copyId, blob });
		}
		await this.#write(db, reference, recipeCopy, blobs);
		const thumbnail = blobs.find((entry) => entry.id === reference.thumbBlobId)?.blob;
		const item = { reference, thumbnailUrl: thumbnail ? URL.createObjectURL(thumbnail) : "" };
		this.items = [item, ...this.items];
		return item;
	}

	/** Re-renders a reference's thumbnail from its current recipe (e.g. when the editor closes). */
	async refreshThumbnail(id: ReferenceId): Promise<void> {
		const db = await this.#dependencies.database();
		const reference = this.find(id)?.reference;
		const recipe = await new Repository(db, "recipes", EditRecipeSchema).get(id);
		if (!reference || !recipe) return;
		const thumbnail = await this.#render(db, reference, recipe);
		const updated = await this.#replaceThumbnail(db, reference, thumbnail);
		this.items = this.items.map((item) => {
			if (item.reference.id !== id) return item;
			URL.revokeObjectURL(item.thumbnailUrl);
			return { reference: updated, thumbnailUrl: URL.createObjectURL(thumbnail) };
		});
	}

	/** The original image file of a reference. */
	async original(id: ReferenceId): Promise<Blob> {
		const reference = this.find(id)?.reference;
		const db = await this.#dependencies.database();
		const blob = reference ? await getBlob(db, reference.originalBlobId) : undefined;
		if (!blob) throw new Error("This reference's image is missing from the device.");
		return blob;
	}

	/** Stores an image for a layer and returns its id for the recipe. */
	async storeLayerImage(image: Blob): Promise<BlobId> {
		const db = await this.#dependencies.database();
		const id = newBlobId();
		await db.put("blobs", image, id);
		this.#requestPersistence();
		return id;
	}

	/** The images a recipe's layers point to; a missing one is left out. */
	async layerImages(recipe: EditRecipe): Promise<Map<BlobId, Blob>> {
		const db = await this.#dependencies.database();
		const images = new Map<BlobId, Blob>();
		for (const { blobId } of recipe.layers) {
			const blob = await getBlob(db, blobId);
			if (blob) images.set(blobId, blob);
		}
		return images;
	}

	async #write(
		db: PhoenyxDatabase,
		reference: Reference,
		recipe: EditRecipe | undefined,
		blobs: StoredBlob[]
	): Promise<void> {
		const tx = db.transaction(["references", "recipes", "blobs"], "readwrite");
		for (const { id, blob } of blobs) await tx.objectStore("blobs").put(blob, id);
		if (recipe) await tx.objectStore("recipes").put(recipe);
		await tx.objectStore("references").put(reference);
		await tx.done;
	}

	async #render(db: PhoenyxDatabase, reference: Reference, recipe: EditRecipe): Promise<Blob> {
		const original = await getBlob(db, reference.originalBlobId);
		if (!original) throw new Error(`"${reference.name}" is missing its image.`);
		return this.#dependencies.renderThumbnail(original, recipe, await this.layerImages(recipe));
	}

	async #replaceThumbnail(
		db: PhoenyxDatabase,
		reference: Reference,
		thumbnail: Blob
	): Promise<Reference> {
		const updated: Reference = { ...reference, thumbBlobId: newBlobId() };
		const tx = db.transaction(["references", "blobs"], "readwrite");
		await tx.objectStore("blobs").put(thumbnail, updated.thumbBlobId);
		await tx.objectStore("references").put(updated);
		await tx.objectStore("blobs").delete(reference.thumbBlobId);
		await tx.done;
		return updated;
	}

	/**
	 * v1 showed edits in the grid with CSS filters; v2 shows rendered thumbnails. After migrating,
	 * re-render the thumbnails of edited references so the grid still shows their edits.
	 */
	async #renderEditedThumbnails(db: PhoenyxDatabase): Promise<void> {
		const references = new Repository(db, "references", ReferenceSchema);
		for (const recipe of await new Repository(db, "recipes", EditRecipeSchema).getAll()) {
			if (isNeutral(recipe)) continue;
			const reference = await references.get(recipe.referenceId);
			if (!reference) continue;
			try {
				await this.#replaceThumbnail(db, reference, await this.#render(db, reference, recipe));
			} catch (cause) {
				// The unedited thumbnail stays; the next editor close re-renders it.
				console.warn(`Could not render the thumbnail of "${reference.name}":`, cause);
			}
		}
	}

	async #thumbnailUrl(db: PhoenyxDatabase, blobId: BlobId): Promise<string> {
		const blob = await getBlob(db, blobId);
		// An empty src makes the card show its "Preview unavailable" state.
		return blob ? URL.createObjectURL(blob) : "";
	}

	/** Asks the browser not to evict the library under storage pressure (once per session). */
	#requestPersistence(): void {
		if (this.#hasRequestedPersistence) return;
		this.#hasRequestedPersistence = true;
		void navigator.storage?.persist?.().catch((cause: unknown) => {
			console.warn("Persistent storage request failed:", cause);
		});
	}
}
