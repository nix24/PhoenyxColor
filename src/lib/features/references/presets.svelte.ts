import { getBlob, Repository, type PhoenyxDatabase } from "$lib/core/storage";
import { FilterPresetSchema, type FilterPreset } from "./domain";

/** What the presets grid shows for one saved preset. */
export interface PresetItem {
	preset: FilterPreset;
	/** Object URL of a migrated v1 thumbnail; revoked when the preset is deleted. */
	thumbnailUrl: string | null;
}

export interface NewFilterPreset {
	name: string;
	category: FilterPreset["category"];
	settings: FilterPreset["settings"];
}

/** Saved filter presets on the v2 database, oldest first (the order v1 listed them in). */
export class FilterPresetLibrary {
	items = $state<PresetItem[]>([]);
	isReady = $state(false);
	readonly #database: () => Promise<PhoenyxDatabase>;
	readonly #loading: Promise<void>;

	/** `database` must resolve only after the v1 presets were migrated (see `app-library.ts`). */
	constructor(database: () => Promise<PhoenyxDatabase>) {
		this.#database = database;
		this.#loading = this.#load();
	}

	whenReady(): Promise<void> {
		return this.#loading;
	}

	async #load(): Promise<void> {
		try {
			const db = await this.#database();
			const presets = await new Repository(db, "presets", FilterPresetSchema).getAll();
			presets.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
			this.items = await Promise.all(
				presets.map(async (preset) => {
					const thumbnail = preset.thumbBlobId ? await getBlob(db, preset.thumbBlobId) : undefined;
					return { preset, thumbnailUrl: thumbnail ? URL.createObjectURL(thumbnail) : null };
				})
			);
		} catch (cause) {
			// As in v1, the editor still works without saved presets.
			console.warn("Failed to load filter presets:", cause);
		} finally {
			this.isReady = true;
		}
	}

	async add(preset: NewFilterPreset): Promise<FilterPreset> {
		const stored = FilterPresetSchema.parse({
			...preset,
			id: crypto.randomUUID(),
			createdAt: new Date().toISOString(),
			thumbBlobId: null,
		});
		const db = await this.#database();
		await new Repository(db, "presets", FilterPresetSchema).put(stored);
		this.items = [...this.items, { preset: stored, thumbnailUrl: null }];
		return stored;
	}

	/** Deletes a preset and its thumbnail in one transaction. */
	async remove(id: string): Promise<void> {
		const item = this.items.find((entry) => entry.preset.id === id);
		if (!item) return;
		const db = await this.#database();
		const tx = db.transaction(["presets", "blobs"], "readwrite");
		if (item.preset.thumbBlobId) await tx.objectStore("blobs").delete(item.preset.thumbBlobId);
		await tx.objectStore("presets").delete(id);
		await tx.done;
		if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
		this.items = this.items.filter((entry) => entry.preset.id !== id);
	}
}
