<script lang="ts">
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { spatialNav } from "$lib/services/spatial-nav";
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

	function navigateTo(path: string) {
		goto(path);
	}

	onMount(() => {
		// Register navigation items for spatial nav
		// Register navigation items for spatial nav
		for (const item of navItems) {
			const el = document.getElementById(`nav-${item.id}`);
			if (el) {
				spatialNav.register(item.id, el, {
					onSelect: () => navigateTo(item.path),
				});
			}
		}

		const settingsEl = document.getElementById("nav-settings");
		if (settingsEl) {
			spatialNav.register("settings", settingsEl, {
				onSelect: () => navigateTo("/settings"),
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

<aside class="h-full w-20 md:w-64 flex flex-col gap-4 p-4 z-40">
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
		<div class="hidden md:block">
			<h1 class="text-lg font-bold tracking-wide text-white">Phoenyx</h1>
			<p class="text-[10px] text-text-muted uppercase tracking-wider">Color Suite</p>
		</div>
	</div>

	<!-- Navigation -->
	<div class="glass-oled flex-1 flex flex-col gap-2 p-3 rounded-2xl">
		{#each navItems as item (item.id)}
			<button
				id="nav-{item.id}"
				class={cn(
					"relative flex items-center gap-3 p-3 rounded-lg transition-all duration-300 group overflow-hidden outline-none focus:ring-2 focus:ring-primary/50",
					currentPath === item.path
						? "bg-white/5 text-white"
						: "text-text-muted hover:text-white hover:bg-white/5"
				)}
				onclick={() => navigateTo(item.path)}
				onmouseenter={() => (hoveredItem = item.id)}
				onmouseleave={() => (hoveredItem = null)}
				aria-label={item.label}
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

				<!-- Label -->
				<span class="hidden md:block font-medium tracking-wide text-sm">{item.label}</span>

				<!-- Hover Glow Background -->
				<div
					class="absolute inset-0 bg-linear-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
				></div>
			</button>
		{/each}
	</div>

	<!-- Footer / Settings -->
	<div class="glass-oled p-3 rounded-2xl">
		<button
			id="nav-settings"
			class="w-full flex items-center gap-3 p-3 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all duration-300 group outline-none focus:ring-2 focus:ring-primary/50"
			onclick={() => navigateTo("/settings")}
			aria-label="Settings"
		>
			<Icon
				icon="material-symbols:settings-outline"
				class="text-xl group-hover:rotate-90 transition-transform duration-500"
			/>
			<span class="hidden md:block font-medium tracking-wide text-sm">Settings</span>
		</button>
	</div>
</aside>
