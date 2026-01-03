<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";

	let { title = "PhoenyxColor" } = $props();

	const navItems = [
		{ id: "references", path: "/references", label: "References" },
		{ id: "palettes", path: "/palettes", label: "Palettes" },
		{ id: "gradients", path: "/gradients", label: "Gradients" },
	];

	function navigateTo(path: string) {
		goto(path);
	}

	let currentPath = $derived(page.url.pathname);
</script>

<header
	class="h-14 flex items-center justify-between px-4 md:px-6 z-30 bg-void/80 backdrop-blur-sm border-b border-white/5"
>
	<!-- Left: Logo -->
	<div class="flex items-center gap-3">
		<!-- Mobile Menu Toggle -->
		<button
			class="md:hidden btn btn-circle btn-ghost btn-sm text-white"
			onclick={() => app.toggleMobileMenu()}
			aria-label={app.mobileMenuOpen ? "Close menu" : "Open menu"}
		>
			<Icon
				icon={app.mobileMenuOpen ? "material-symbols:close" : "material-symbols:menu"}
				class="text-xl"
			/>
		</button>

		<!-- Logo -->
		<div class="flex items-center gap-2">
			<div class="w-6 h-6 rounded-lg bg-phoenix-primary flex items-center justify-center">
				<Icon icon="material-symbols:local-fire-department" class="text-white text-sm" />
			</div>
			<span class="font-bold text-white tracking-wide hidden sm:inline">
				<span class="text-phoenix-primary">PHOENYX</span><span class="text-cyan-400">COLOR</span>
			</span>
		</div>
	</div>

	<!-- Center: Pill Navigation (Desktop only) -->
	<nav class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex">
		<div
			class="flex items-center bg-black/40 backdrop-blur-xl rounded-full p-1 border border-white/10"
		>
			{#each navItems as item (item.id)}
				<button
					class={cn(
						"px-5 py-1.5 rounded-full text-sm font-medium transition-all",
						currentPath.includes(item.path)
							? "bg-white/10 text-white"
							: "text-text-muted hover:text-white"
					)}
					onclick={() => navigateTo(item.path)}
				>
					{item.label}
				</button>
			{/each}
		</div>
	</nav>

	<!-- Right: Status + Profile -->
	<div class="flex items-center gap-3">
		<!-- System Status -->
		<div class="hidden sm:flex items-center gap-2 text-xs text-text-muted">
			<div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
			<span>System Healthy</span>
		</div>

		<!-- Profile Avatar -->
		<div
			class="w-8 h-8 rounded-full bg-linear-to-tr from-phoenix-primary to-phoenix-violet border border-white/20 cursor-pointer hover:scale-105 transition-transform"
		></div>
	</div>
</header>

<!-- Mobile Navigation Menu -->
{#if app.mobileMenuOpen}
	<div
		class="md:hidden mx-4 mb-2 bg-black/60 backdrop-blur-xl rounded-xl p-2 border border-white/10 z-40"
	>
		{#each navItems as item (item.id)}
			<button
				class={cn(
					"w-full px-4 py-3 rounded-lg text-left text-sm font-medium transition-all",
					currentPath.includes(item.path)
						? "bg-white/10 text-white"
						: "text-text-muted hover:text-white hover:bg-white/5"
				)}
				onclick={() => {
					navigateTo(item.path);
					app.closeMobileMenu();
				}}
			>
				{item.label}
			</button>
		{/each}
	</div>
{/if}
