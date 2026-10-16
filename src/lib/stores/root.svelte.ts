import { SettingsStore } from "./settings.svelte";
import { PaletteStore } from "./palettes.svelte";
import { GradientStore } from "./gradients.svelte";
import { ThemeStore } from "./theme.svelte";

export class RootStore {
	settings = new SettingsStore();
	palettes = new PaletteStore();
	gradients = new GradientStore();
	theme = new ThemeStore();

	isEyedropperActive = $state(false);
	globalColorBuffer = $state<string | null>(null);

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

/** The app-wide store. */
export const app = new RootStore();
