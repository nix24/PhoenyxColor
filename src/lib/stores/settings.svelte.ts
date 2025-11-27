import { storage } from "$lib/services/storage";
import type { ValidatedAppSettings } from "$lib/schemas/validation";

const DEFAULT_SETTINGS: ValidatedAppSettings = {
	theme: "system",
	defaultPaletteSlots: 5,
	alwaysOnTop: false,
	enableAnimations: true,
	globalEyedropperEnabled: false,
	referenceBoardSavePath: null,
	workspace: {
		showGrid: true,
		snapToGrid: false,
		gridSize: 20,
		showRulers: true,
	},
	exportPreferences: {
		defaultFormat: "png",
		defaultScale: 1,
		includeBackground: true,
		defaultPngResolution: 1920,
		defaultSvgSize: { width: 800, height: 600 },
		compressionLevel: 80,
	},
	autoSave: true,
	autoSaveInterval: 5,
};

export class SettingsStore {
	state = $state<ValidatedAppSettings>(DEFAULT_SETTINGS);
	private STORAGE_KEY = "phoenyx_settings";

	constructor() {
		this.load();
	}

	async load() {
		const saved = await storage.local.get<ValidatedAppSettings>(this.STORAGE_KEY);
		if (saved) {
			// Merge with defaults to handle new settings in future versions
			this.state = { ...DEFAULT_SETTINGS, ...saved };
		}
	}

	async save() {
		await storage.local.set(this.STORAGE_KEY, $state.snapshot(this.state));
	}

	update(updates: Partial<ValidatedAppSettings>) {
		Object.assign(this.state, updates);
		this.save();
	}

	// Specific actions
	setTheme(theme: ValidatedAppSettings["theme"]) {
		this.update({ theme });
	}
}
