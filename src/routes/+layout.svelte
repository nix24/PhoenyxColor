<script lang="ts">
	import "../app.css";
	import Sidebar from "$lib/components/layout/Sidebar.svelte";
	import Header from "$lib/components/layout/Header.svelte";
	import ProceduralBackground from "$lib/components/visuals/ProceduralBackground.svelte";
	import { Toaster } from "svelte-sonner";
	import { keyboardShortcuts } from "$lib/services/keyboardShortcuts";
	import { app } from "$lib/stores/root.svelte";
	import { onMount, onDestroy } from "svelte";
	import { browser } from "$app/environment";
	import { page } from "$app/state";

	import { fly, scale, fade } from "svelte/transition";
	import { cubicOut, backOut } from "svelte/easing";

	let { children } = $props();

	// Track previous path for directional transitions
	let previousPath = $state("");
	let transitionDirection = $state<"up" | "down" | "left" | "right">("up");

	// Route hierarchy for spatial awareness
	const routeOrder = ["/references", "/palettes", "/gradients", "/settings"];

	$effect(() => {
		const currentPath = page.url.pathname;
		const prevIndex = routeOrder.findIndex((r) => previousPath.includes(r.slice(1)));
		const currIndex = routeOrder.findIndex((r) => currentPath.includes(r.slice(1)));

		if (currIndex > prevIndex) {
			transitionDirection = "up";
		} else if (currIndex < prevIndex) {
			transitionDirection = "down";
		}

		previousPath = currentPath;
	});

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

<!-- Background System -->
<ProceduralBackground />

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
					<div
						in:fly={{
							y: transitionDirection === "up" ? 30 : -30,
							duration: 450,
							delay: 80,
							easing: backOut,
						}}
						out:fade={{ duration: 150 }}
						class="h-full"
					>
						{@render children()}
					</div>
				{/key}
			</div>
		</main>
	</div>

	<!-- Toast notifications with enhanced styling -->
	<Toaster
		richColors
		position="bottom-right"
		theme="dark"
		closeButton
		duration={2500}
		toastOptions={{
			style:
				"backdrop-filter: blur(12px); background: rgba(30,30,45,0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem;",
			class: "shadow-2xl",
		}}
	/>
</div>
