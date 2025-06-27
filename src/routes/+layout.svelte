<script lang="ts">
	import "../app.css";
	import Navigation from "$lib/components/Navigation.svelte";
	import StorageDebugger from "$lib/components/common/StorageDebugger.svelte";
	import { Toaster } from "svelte-sonner";
	import { keyboardShortcuts } from "$lib/services/keyboardShortcuts";
	import { appStore } from "$lib/stores/app.svelte";
	import { onMount, onDestroy } from "svelte";
	import { injectAnalytics } from "@vercel/analytics/sveltekit";

	let { children } = $props();

	injectAnalytics();

	// Initialize keyboard shortcuts and theme
	onMount(async () => {
		console.log("🚀 App initialization starting...");

		keyboardShortcuts.startListening();
		console.log("✅ Keyboard shortcuts initialized");

		// Load saved state first
		console.log("📦 Loading state from storage...");
		const loaded = await appStore.loadFromStorage();
		console.log(`📦 State loading result: ${loaded ? "SUCCESS" : "FAILED"}`);

		if (loaded) {
			console.log("📊 Loaded state:", {
				palettes: appStore.state.palettes.length,
				gradients: appStore.state.gradients.length,
				references: appStore.state.references.length,
				theme: appStore.state.settings.theme,
			});
		}

		// Apply saved theme on app load
		const savedTheme = appStore.state.settings.theme;
		console.log(`🎨 Applying theme: ${savedTheme}`);
		document.documentElement.setAttribute("data-theme", savedTheme);

		// Initialize auto-save if enabled
		if (appStore.state.settings.autoSave) {
			console.log("💾 Starting auto-save...");
			appStore.startAutoSave();
		}

		console.log("✅ App initialization complete");
	});

	onDestroy(() => {
		keyboardShortcuts.stopListening();
	});
</script>

<div class="min-h-screen bg-base-200">
	<Navigation />
	<main class="h-[calc(100vh-4rem)] md:h-[calc(100vh-theme(spacing.16))] overflow-auto">
		{@render children()}
	</main>

	<!-- Toast notifications -->
	<!-- change toaster time to 3 seconds  -->
	<Toaster richColors position="bottom-right" theme="system" closeButton duration={2000} />

	<!-- Storage debugger for development -->
	{#if import.meta.env.DEV}
		<StorageDebugger />
	{/if}
</div>
