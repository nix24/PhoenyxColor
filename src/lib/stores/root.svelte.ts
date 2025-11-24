import { SettingsStore } from "./settings.svelte";
import { PaletteStore } from "./palettes.svelte";
import { ReferenceStore } from "./references.svelte";
import { GradientStore } from "./gradients.svelte";

export class RootStore {
    settings = new SettingsStore();
    palettes = new PaletteStore();
    references = new ReferenceStore();
    gradients = new GradientStore();

    // Global UI state
    isEyedropperActive = $state(false);
    globalColorBuffer = $state<string | null>(null);

    constructor() {
        // Initialize or coordinate stores if needed
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
}

// Create singleton instance
export const app = new RootStore();

// Export for usage in components
export const getApp = () => app;
