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
	import { wasm } from "$lib/services/wasm";
	import { SITE_CONFIG, getStructuredData } from "$lib/config/seo";

	import { fly, fade } from "svelte/transition";
	import { backOut } from "svelte/easing";

	// Generate structured data for JSON-LD
	const structuredData = JSON.stringify(getStructuredData());

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

		// Close mobile menu on route change
		if (browser) {
			app.closeMobileMenu();
		}
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
	let mobileMediaQuery: MediaQueryList | undefined;

	// Responsive toast position - bottom-center on mobile, bottom-right on desktop
	let isMobile = $state(false);
	let toastPosition = $derived<"bottom-center" | "bottom-right">(
		isMobile ? "bottom-center" : "bottom-right"
	);

	function handleMobileChange(e: MediaQueryListEvent) {
		isMobile = !e.matches;
	}

	$effect(() => {
		if (!browser) return;
		applyTheme(app.settings.state.theme);
	});

	// Initialize keyboard shortcuts and theme
	onMount(async () => {
		wasm.init().catch((err) => console.error("WASM failed to load", err));
		keyboardShortcuts.startListening();
		mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		mediaQuery.addEventListener("change", handleMediaChange);

		// Track mobile viewport for responsive toast position
		mobileMediaQuery = window.matchMedia("(min-width: 768px)");
		isMobile = !mobileMediaQuery.matches;
		mobileMediaQuery.addEventListener("change", handleMobileChange);
	});

	onDestroy(() => {
		mediaQuery?.removeEventListener("change", handleMediaChange);
		mobileMediaQuery?.removeEventListener("change", handleMobileChange);
		keyboardShortcuts.stopListening();
	});
</script>

<!-- Base SEO metadata and structured data -->
<svelte:head>
	<!-- Base meta tags (can be overridden by pages) -->
	<meta name="keywords" content={SITE_CONFIG.keywords.join(", ")} />

	<!-- JSON-LD Structured Data -->
	{@html `<script type="application/ld+json">${structuredData}</script>`}
</svelte:head>

<!-- Background System -->
<ProceduralBackground />

<div
	class="flex h-screen w-full bg-void text-text-main font-sans relative z-10 selection:bg-phoenix-primary selection:text-white leading-relaxed"
>
	{#if app.mobileMenuOpen}
		<button
			class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
			onclick={() => app.closeMobileMenu()}
			aria-label="Close menu"
			transition:fade={{ duration: 200 }}
		></button>
	{/if}

	<div class="flex-1 flex flex-col min-w-0 bg-void/50 relative">
		<Header title={pageTitle} />

		<!-- Scrollable Content -->
		<main class="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
			<div class="w-full h-full">
				{#key page.url.pathname}
					<div
						in:fly={{
							y: transitionDirection === "up" ? 20 : -20,
							duration: 280,
							delay: 0,
							easing: backOut,
						}}
						out:fade={{ duration: 100 }}
						class="h-full will-change-transform"
						style="contain: layout style;"
					>
						{@render children()}
					</div>
				{/key}
			</div>
		</main>
	</div>

	<!-- Toast notifications with enhanced styling -->
	<!-- Position is responsive: bottom-center on mobile, bottom-right on desktop -->
	<Toaster
		richColors
		position={toastPosition}
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
