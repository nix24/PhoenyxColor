<script lang="ts">
	import { page } from "$app/state";
	import { goto, preloadData } from "$app/navigation";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { spatialNav } from "$lib/services/spatial-nav";
	import { app } from "$lib/stores/root.svelte";
	import { onMount } from "svelte";

	interface NavItem {
		id: string;
		path: string;
		label: string;
		icon: string;
		description: string;
	}

	const navItems: NavItem[] = [
		{
			id: "references",
			path: "/references",
			label: "References",
			icon: "material-symbols:image-outline",
			description: "Manage reference images",
		},
		{
			id: "palettes",
			path: "/palettes",
			label: "Palettes",
			icon: "material-symbols:palette-outline",
			description: "Create and edit color palettes",
		},
		{
			id: "gradients",
			path: "/gradients",
			label: "Gradients",
			icon: "material-symbols:gradient",
			description: "Generate beautiful gradients",
		},
	];

	let currentPath = $derived(page?.url?.pathname ?? "/");
	let hoveredItem: string | null = $state(null);

	// Eagerly preload adjacent routes for faster navigation
	function handleMouseEnter(path: string, itemId: string) {
		hoveredItem = itemId;
		// Preload on hover for even faster navigation
		preloadData(path);
	}

	// Handle navigation with mobile menu close
	function handleNavClick(path: string) {
		app.closeMobileMenu();
		goto(path);
	}

	onMount(() => {
		// Register navigation items for spatial nav
		for (const item of navItems) {
			const el = document.getElementById(`nav-${item.id}`);
			if (el) {
				spatialNav.register(item.id, el, {
					onSelect: () => {
						handleNavClick(item.path);
					},
				});
			}
		}

		const settingsEl = document.getElementById("nav-settings");
		if (settingsEl) {
			spatialNav.register("settings", settingsEl, {
				onSelect: () => {
					handleNavClick("/settings");
				},
			});
		}

		return () => {
			for (const item of navItems) {
				spatialNav.unregister(item.id);
			}
			spatialNav.unregister("settings");
		};
	});
</script>

<!-- Mobile: Fixed drawer that slides in from left -->
<!-- Desktop: Static sidebar -->
<aside
	class={cn(
		"flex flex-col gap-4 p-4 z-50 bg-void/95 backdrop-blur-xl",
		// Mobile: fixed drawer with slide transition
		"fixed inset-y-0 left-0 w-64 transform transition-transform duration-300 ease-out",
		app.mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
		// Desktop: static positioning, always visible
		"md:relative md:translate-x-0 md:w-64 md:bg-transparent md:backdrop-blur-none"
	)}
>
	<!-- Logo Area -->
	<div class="flex items-center gap-3 px-2 py-4">
		<div class="relative group">
			<div
				class="absolute inset-0 bg-primary/50 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
			></div>
			<div
				class="relative bg-linear-to-br from-primary to-secondary rounded-xl p-2 text-white shadow-lg"
			>
				<Icon icon="material-symbols:brush" class="text-2xl" />
			</div>
		</div>
		<!-- Show labels on mobile drawer and desktop -->
		<div>
			<h1 class="text-lg font-bold tracking-wide text-white">Phoenyx</h1>
			<p class="text-[10px] text-text-muted uppercase tracking-wider">Color Suite</p>
		</div>
	</div>

	<!-- Navigation - Using anchor tags for SvelteKit prefetching -->
	<nav class="glass-oled flex-1 flex flex-col gap-2 p-3 rounded-2xl" aria-label="Main navigation">
		{#each navItems as item (item.id)}
			<a
				id="nav-{item.id}"
				href={item.path}
				data-sveltekit-preload-data="hover"
				class={cn(
					"relative flex items-center gap-3 p-3 rounded-lg transition-all duration-300 group overflow-hidden outline-none focus:ring-2 focus:ring-primary/50 no-underline",
					currentPath === item.path
						? "bg-white/5 text-white"
						: "text-text-muted hover:text-white hover:bg-white/5"
				)}
				onmouseenter={() => handleMouseEnter(item.path, item.id)}
				onmouseleave={() => (hoveredItem = null)}
				onclick={() => app.closeMobileMenu()}
				aria-label={item.label}
				aria-current={currentPath === item.path ? "page" : undefined}
			>
				<!-- Active Indicator (Neon Pill) -->
				{#if currentPath === item.path}
					<div
						class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_10px_var(--color-primary)]"
					></div>
				{/if}

				<!-- Icon -->
				<Icon
					icon={item.icon}
					class={cn(
						"text-xl transition-transform duration-300",
						currentPath === item.path ? "scale-110 text-primary" : "group-hover:scale-110"
					)}
				/>

				<!-- Label - visible on mobile drawer and desktop -->
				<span class="font-medium tracking-wide text-sm">{item.label}</span>

				<!-- Hover Glow Background -->
				<div
					class="absolute inset-0 bg-linear-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
				></div>
			</a>
		{/each}
	</nav>

	<!-- Footer / Settings -->
	<div class="glass-oled p-3 rounded-2xl">
		<a
			id="nav-settings"
			href="/settings"
			data-sveltekit-preload-data="hover"
			class="w-full flex items-center gap-3 p-3 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all duration-300 group outline-none focus:ring-2 focus:ring-primary/50 no-underline"
			onmouseenter={() => handleMouseEnter("/settings", "settings")}
			onmouseleave={() => (hoveredItem = null)}
			aria-label="Settings"
			aria-current={currentPath === "/settings" ? "page" : undefined}
		>
			<Icon
				icon="material-symbols:settings-outline"
				class="text-xl group-hover:rotate-90 transition-transform duration-500"
			/>
			<span class="hidden md:block font-medium tracking-wide text-sm">Settings</span>
		</a>
	</div>
</aside>
