import { SettingsStore } from "./settings.svelte";
import { PaletteStore } from "./palettes.svelte";
import { ReferenceStore } from "./references.svelte";
import { GradientStore } from "./gradients.svelte";
import { ThemeStore } from "./theme.svelte";
import { spatialNav } from "$lib/services/spatial-nav";

export class RootStore {
	settings = new SettingsStore();
	palettes = new PaletteStore();
	references = new ReferenceStore();
	gradients = new GradientStore();
	theme = new ThemeStore();

	// Services
	spatial = spatialNav;

	// Global UI state
	isEyedropperActive = $state(false);
	globalColorBuffer = $state<string | null>(null);

	toggleEyedropper() {
		this.isEyedropperActive = !this.isEyedropperActive;
	}

	setGlobalColor(color: string) {
		this.globalColorBuffer = color;
	}

	clearGlobalColor() {
		this.globalColorBuffer = null;
	}
}

// Create singleton instance
export const app = new RootStore();

// Export for usage in components
export const getApp = () => app;
