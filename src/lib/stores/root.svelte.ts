import { SettingsStore } from "./settings.svelte";
import { PaletteStore } from "./palettes.svelte";
import { GradientStore } from "./gradients.svelte";
import { ThemeStore } from "./theme.svelte";

export class RootStore {
	settings = new SettingsStore();
	palettes = new PaletteStore();
	gradients = new GradientStore();
	theme = new ThemeStore();

	// Global UI state
	isEyedropperActive = $state(false);
	globalColorBuffer = $state<string | null>(null);

	// Mobile navigation state
	mobileMenuOpen = $state(false);

	toggleEyedropper() {
		this.isEyedropperActive = !this.isEyedropperActive;
	}

	toggleMobileMenu() {
		this.mobileMenuOpen = !this.mobileMenuOpen;
	}

	closeMobileMenu() {
		this.mobileMenuOpen = false;
	}
}

// Create singleton instance
export const app = new RootStore();

// Export for usage in components
