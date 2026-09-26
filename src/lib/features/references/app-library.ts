import { appDatabase } from "$lib/core/storage";
import type { ReferenceId } from "$lib/types/brands";
import { ReferenceEditor } from "./editor.svelte";
import { describeImage } from "./image-description";
import { ReferenceLibrary } from "./library.svelte";
import { FilterPresetLibrary } from "./presets.svelte";
import { renderThumbnail } from "./thumbnail";

// Created on first use, not at import: the first load opens IndexedDB and runs the v1 migrations.
let library: ReferenceLibrary | undefined;
let presets: FilterPresetLibrary | undefined;

/** The app's References library. */
export function referenceLibrary(): ReferenceLibrary {
	library ??= new ReferenceLibrary({ database: appDatabase, describeImage, renderThumbnail });
	return library;
}

/** The app's saved filter presets. They load after the library's first load has migrated v1's. */
export function filterPresetLibrary(): FilterPresetLibrary {
	presets ??= new FilterPresetLibrary(async () => {
		await referenceLibrary().whenReady();
		return appDatabase();
	});
	return presets;
}

/** Opens the editor on one of the app library's references. */
export async function openReferenceEditor(id: ReferenceId): Promise<ReferenceEditor> {
	return ReferenceEditor.open(referenceLibrary(), await appDatabase(), id);
}
