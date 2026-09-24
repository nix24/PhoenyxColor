import type { RootStore } from "$lib/stores/root.svelte";
import { toast } from "svelte-sonner";
import { validateAppData } from "$lib/schemas/validation";
import { downloadBlob } from "$lib/core/download";

const STORAGE_VERSION = "1.1";

/** Download the whole library as a validated JSON backup that `parseImportedState` can read. */
export function exportBackup(app: RootStore): boolean {
	const backup = {
		version: STORAGE_VERSION,
		timestamp: new Date().toISOString(),
		data: {
			references: app.references.references,
			palettes: app.palettes.palettes,
			gradients: app.gradients.gradients,
			settings: app.settings.state,
			tutorialState: {
				hasSeenWelcome: false,
				hasSeenPaletteTutorial: false,
				hasSeenGradientTutorial: false,
				hasSeenReferenceTutorial: false,
			},
		},
	};

	const validation = validateAppData(backup);
	if (!validation.valid) {
		toast.error(`Export validation failed: ${validation.error}`);
		return false;
	}

	const filename = `phoenyxcolor-data-${backup.timestamp.split("T")[0]}.json`;
	downloadBlob(
		new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" }),
		filename
	);
	toast.success(`Data exported as ${filename}`);
	return true;
}
