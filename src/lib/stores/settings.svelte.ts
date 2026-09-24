import { storage } from "$lib/services/storage";
import { z } from "zod";
import { AppSettingsSchema, type ValidatedAppSettings } from "$lib/schemas/validation";

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
	isReady = $state(false);
	private STORAGE_KEY = "phoenyx_settings";
	private loadPromise: Promise<void>;

	constructor() {
		// Non-blocking initialization - store the promise but don't await
		this.loadPromise = this.load();
	}

	/**
	 * Wait for the store to be ready (for components that need data immediately)
	 */
	async whenReady(): Promise<void> {
		return this.loadPromise;
	}

	async load() {
		try {
			const saved = await storage.local.get(this.STORAGE_KEY, z.looseObject({}));
			// Merge over defaults so settings added in later versions get their default value;
			// if the merged result is still invalid, keep the defaults.
			const merged = AppSettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...saved });
			if (merged.success) this.state = merged.data;
			else console.warn("Stored settings are invalid; using defaults.", merged.error);
		} catch (error) {
			console.warn("Failed to load settings, using defaults:", error);
		} finally {
			this.isReady = true;
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
// fallow-ignore-file unused-class-member
