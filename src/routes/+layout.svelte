<script lang="ts">
	import "../app.css";
	import Navigation from "$lib/components/Navigation.svelte";
	import { Toaster } from "svelte-sonner";
	import { keyboardShortcuts } from "$lib/services/keyboardShortcuts";
	import { appStore } from "$lib/stores/app.svelte";
	import { onMount, onDestroy } from "svelte";

	let { children } = $props();

	// Initialize keyboard shortcuts and theme
	onMount(async () => {
		keyboardShortcuts.startListening();
		// Load saved state first
		await appStore.loadFromStorage();

		// Apply saved theme on app load
		const savedTheme = appStore.state.settings.theme;
		document.documentElement.setAttribute("data-theme", savedTheme);

		// Initialize auto-save if enabled
		if (appStore.state.settings.autoSave) {
			appStore.startAutoSave();
		}
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
	<Toaster richColors position="top-right" theme="system" closeButton />
</div>
