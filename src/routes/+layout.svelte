<script lang="ts">
	import "../app.css";
	import Sidebar from "$lib/components/layout/Sidebar.svelte";
	import Header from "$lib/components/layout/Header.svelte";
	import StorageDebugger from "$lib/components/common/StorageDebugger.svelte";
	import { Toaster } from "svelte-sonner";
	import { keyboardShortcuts } from "$lib/services/keyboardShortcuts";
	import { app } from "$lib/stores/root.svelte";
	import { onMount, onDestroy } from "svelte";
	import { browser } from "$app/environment";
	import { page } from "$app/state";

	import { fade } from "svelte/transition";

	let { children } = $props();

	// Derived title based on current route
	let pageTitle = $derived.by(() => {
		const path = page.url.pathname;
		if (path.includes("references")) return "Reference Images";
		if (path.includes("palettes")) return "Color Palettes";
		if (path.includes("gradients")) return "Gradient Generator";
		if (path.includes("settings")) return "Settings";
		return "PhoenyxColor";
	});

	function applyTheme(theme: string) {
		let effective = theme;
		if (theme === "system") {
			effective = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
		}
		document.documentElement.setAttribute("data-theme", effective);
	}

	function handleMediaChange() {
		applyTheme(app.settings.state.theme);
	}

	let mediaQuery: MediaQueryList | undefined;

	$effect(() => {
		if (!browser) return;
		applyTheme(app.settings.state.theme);
	});

	// Initialize keyboard shortcuts and theme
	onMount(async () => {
		keyboardShortcuts.startListening();
		mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		mediaQuery.addEventListener("change", handleMediaChange);
	});

	onDestroy(() => {
		mediaQuery?.removeEventListener("change", handleMediaChange);
		keyboardShortcuts.stopListening();
	});
</script>

<!-- Background Orbs -->
<div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
	<div
		class="absolute top-[-10%] right-[-5%] w-[50vw] h-[50vw] bg-phoenix-violet/20 blur-[120px] rounded-full animate-pulse-slow"
	></div>
	<div
		class="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-phoenix-primary/10 blur-[100px] rounded-full animate-pulse-slow"
		style="animation-delay: 2s;"
	></div>
</div>

<div
	class="flex h-screen w-full bg-void text-text-main font-sans relative z-10 selection:bg-phoenix-primary selection:text-white leading-relaxed"
>
	<Sidebar />

	<div class="flex-1 flex flex-col min-w-0 bg-void/50 relative">
		<Header title={pageTitle} />

		<!-- Scrollable Content -->
		<main class="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 pt-0 scroll-smooth">
			<div class="max-w-7xl mx-auto w-full h-full">
				{#key page.url.pathname}
					<div in:fade={{ duration: 300, delay: 150 }} class="h-full">
						{@render children()}
					</div>
				{/key}
			</div>
		</main>
	</div>

	<!-- Toast notifications -->
	<Toaster richColors position="bottom-right" theme="dark" closeButton duration={2000} />

	<!-- Storage debugger for development -->
	{#if import.meta.env.DEV}
		<StorageDebugger />
	{/if}
</div>
