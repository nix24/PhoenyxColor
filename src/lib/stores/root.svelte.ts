import { SettingsStore } from "./settings.svelte";
import { PaletteStore } from "./palettes.svelte";
import { ReferenceStore } from "./references.svelte";
import { GradientStore } from "./gradients.svelte";
import { FilterPresetStore } from "./filter-presets.svelte";
import { ThemeStore } from "./theme.svelte";
import { spatialNav } from "$lib/services/spatial-nav";

export class RootStore {
	settings = new SettingsStore();
	palettes = new PaletteStore();
	references = new ReferenceStore();
	gradients = new GradientStore();
	filterPresets = new FilterPresetStore();
	theme = new ThemeStore();

	// Services
	spatial = spatialNav;

	// Global UI state
	isEyedropperActive = $state(false);
	globalColorBuffer = $state<string | null>(null);

	// Mobile navigation state
	mobileMenuOpen = $state(false);

	/**
	 * Derived state: true when all stores have finished loading
	 */
	get isReady(): boolean {
		return (
			this.settings.isReady &&
			this.palettes.isReady &&
			this.references.isReady &&
			this.gradients.isReady &&
			this.filterPresets.isReady
		);
	}

	/**
	 * Wait for all stores to be ready
	 */
	async whenReady(): Promise<void> {
		await Promise.all([
			this.settings.whenReady(),
			this.palettes.whenReady(),
			this.references.whenReady(),
			this.gradients.whenReady(),
			this.filterPresets.whenReady(),
		]);
	}

	toggleEyedropper() {
		this.isEyedropperActive = !this.isEyedropperActive;
	}

	setGlobalColor(color: string) {
		this.globalColorBuffer = color;
	}

	clearGlobalColor() {
		this.globalColorBuffer = null;
	}

	toggleMobileMenu() {
		this.mobileMenuOpen = !this.mobileMenuOpen;
	}

	closeMobileMenu() {
		this.mobileMenuOpen = false;
	}

	openMobileMenu() {
		this.mobileMenuOpen = true;
	}
}

// Create singleton instance
export const app = new RootStore();

// Export for usage in components
export const getApp = () => app;
