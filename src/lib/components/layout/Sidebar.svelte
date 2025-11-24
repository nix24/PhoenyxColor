<script lang="ts">
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import Icon from "@iconify/svelte";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";

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

	let currentPath = $derived($page?.url?.pathname ?? "/");
	let hoveredItem: string | null = $state(null);

	function navigateTo(path: string) {
		goto(path);
	}
</script>

<aside class="h-full w-20 md:w-64 flex flex-col gap-4 p-4 z-40">
	<!-- Logo Area -->
	<div class="flex items-center gap-3 px-2 py-4">
		<div class="relative group">
			<div
				class="absolute inset-0 bg-phoenix-primary/50 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
			></div>
			<div
				class="relative bg-gradient-to-br from-phoenix-primary to-phoenix-violet rounded-xl p-2 text-white shadow-lg"
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
	<GlassPanel class="flex-1 flex flex-col gap-2 p-3" intensity="low">
		{#each navItems as item (item.id)}
			<button
				class={cn(
					"relative flex items-center gap-3 p-3 rounded-lg transition-all duration-300 group overflow-hidden",
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
						class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-phoenix-primary rounded-r-full shadow-[0_0_10px_rgba(255,0,127,0.5)]"
					></div>
				{/if}

				<!-- Icon -->
				<Icon
					icon={item.icon}
					class={cn(
						"text-xl transition-transform duration-300",
						currentPath === item.path ? "scale-110 text-phoenix-primary" : "group-hover:scale-110"
					)}
				/>

				<!-- Label -->
				<span class="hidden md:block font-medium tracking-wide text-sm">{item.label}</span>

				<!-- Hover Glow Background -->
				<div
					class="absolute inset-0 bg-gradient-to-r from-phoenix-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
				></div>
			</button>
		{/each}
	</GlassPanel>

	<!-- Footer / Settings -->
	<GlassPanel class="p-3" intensity="low">
		<button
			class="w-full flex items-center gap-3 p-3 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all duration-300 group"
			onclick={() => navigateTo("/settings")}
			aria-label="Settings"
		>
			<Icon
				icon="material-symbols:settings-outline"
				class="text-xl group-hover:rotate-90 transition-transform duration-500"
			/>
			<span class="hidden md:block font-medium tracking-wide text-sm">Settings</span>
		</button>
	</GlassPanel>
</aside>
