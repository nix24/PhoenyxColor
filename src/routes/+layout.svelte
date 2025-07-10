<script lang="ts">
	import "../app.css";
	import Navigation from "$lib/components/Navigation.svelte";
	import StorageDebugger from "$lib/components/common/StorageDebugger.svelte";
	import { Toaster } from "svelte-sonner";
	import { keyboardShortcuts } from "$lib/services/keyboardShortcuts";
	import { appStore } from "$lib/stores/app.svelte";
	import { onMount, onDestroy } from "svelte";
	import { browser } from "$app/environment";

	let { children } = $props();

	function applyTheme(theme: string) {
		let effective = theme;
		if (theme === "system") {
			effective = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
		}
		document.documentElement.setAttribute("data-theme", effective);
	}

	function handleMediaChange() {
		applyTheme(appStore.state.settings.theme);
	}

	let mediaQuery: MediaQueryList | undefined;

	$effect(() => {
		if (!browser) return;
		applyTheme(appStore.state.settings.theme);
	});

	// Initialize keyboard shortcuts and theme
	onMount(async () => {
		keyboardShortcuts.startListening();

		// Load saved state first

		const loaded = await appStore.loadFromStorage();

		if (loaded) {
		}

		// Initialize auto-save if enabled
		if (appStore.state.settings.autoSave) {
			appStore.startAutoSave();
		}

		// Setup media query listener for system theme changes
		mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		mediaQuery.addEventListener("change", handleMediaChange);
	});

	onDestroy(() => {
		keyboardShortcuts.stopListening();
		if (mediaQuery) {
			mediaQuery.removeEventListener("change", handleMediaChange);
		}
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
