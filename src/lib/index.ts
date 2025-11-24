// place files you want to import through the `$lib` alias in this folder.

// Export main components and store
export { app, RootStore } from "./stores/root.svelte";
export { PaletteStore } from "./stores/palettes.svelte";
export { ReferenceStore } from "./stores/references.svelte";
export { GradientStore } from "./stores/gradients.svelte";
export { SettingsStore } from "./stores/settings.svelte";
export { default as Navigation } from "./components/Navigation.svelte";
export { default as ReferencesModule } from "./components/modules/ReferencesModule.svelte";
export { default as PalettesModule } from "./components/modules/PalettesModule.svelte";
export { default as GradientsModule } from "./components/modules/GradientsModule.svelte";
