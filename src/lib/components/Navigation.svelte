<script lang="ts">
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import Icon from "@iconify/svelte";
	import { onMount } from "svelte";
	import EyedropperTool from "$lib/components/common/EyedropperTool.svelte";
	import { toast } from "svelte-sonner";
	import { app } from "$lib/stores/root.svelte";
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
			description: "Generate color gradients",
		},
	];

	let isMobileMenuOpen = $state(false);

	// Get current active path
	let currentPath = $derived(page?.url?.pathname ?? "/");

	function closeMobileMenu() {
		isMobileMenuOpen = false;
	}

	function navigateTo(path: string) {
		goto(path);
		closeMobileMenu();
	}
</script>

<nav class="navbar w-full h-20 px-6 z-50 flex items-center justify-between relative bg-transparent">
	<!-- Left: Logo & Brand -->
	<div class="flex items-center gap-3">
		<button
			class="btn btn-ghost btn-circle md:hidden"
			onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
			aria-label="Toggle mobile menu"
		>
			<Icon
				icon={isMobileMenuOpen ? "material-symbols:close" : "material-symbols:menu"}
				class="text-2xl"
			/>
		</button>

		<button class="flex items-center gap-3 group" onclick={() => navigateTo("/")} type="button">
			<div
				class="w-10 h-10 rounded-xl bg-linear-to-br from-phoenix-primary to-phoenix-violet flex items-center justify-center text-white shadow-lg shadow-phoenix-primary/20 transition-transform group-hover:scale-105"
			>
				<Icon icon="material-symbols:brush" class="text-xl" />
			</div>
			<span
				class="text-xl font-bold tracking-wide text-white group-hover:text-phoenix-primary transition-colors"
			>
				Phoenyx<span class="text-phoenix-primary">Color</span>
			</span>
		</button>
	</div>

	<!-- Center: Pill Navigation -->
	<div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
		<div
			class="glass-panel rounded-full p-1.5 flex items-center gap-1 border border-white/10 bg-void-deep/50 backdrop-blur-xl"
		>
			{#each navItems as item (item.id)}
				<button
					class={cn(
						"px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 relative",
						currentPath.includes(item.path)
							? "text-white bg-white/10 shadow-sm"
							: "text-text-muted hover:text-white hover:bg-white/5"
					)}
					onclick={() => navigateTo(item.path)}
					type="button"
				>
					{item.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Right: Status, Buffer & Profile -->
	<div class="flex items-center gap-4">
		<!-- Global Color Buffer -->
		{#if app.globalColorBuffer}
			<div
				class="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-black/20 rounded-lg border border-white/5 animate-in fade-in slide-in-from-right-4"
			>
				<div
					class="w-4 h-4 rounded-full border border-white/20 cursor-pointer shadow-sm"
					style:background-color={app.globalColorBuffer}
					onclick={() => {
						navigator.clipboard.writeText(app.globalColorBuffer!);
						toast.success(`Copied ${app.globalColorBuffer}!`);
					}}
					role="button"
					tabindex="0"
					onkeydown={(e) =>
						e.key === "Enter" && navigator.clipboard.writeText(app.globalColorBuffer!)}
				></div>
				<span class="text-xs font-mono text-text-muted">{app.globalColorBuffer}</span>
				<button
					class="text-text-muted hover:text-white transition-colors ml-1"
					onclick={() => app.clearGlobalColor()}
				>
					<Icon icon="material-symbols:close" class="w-3 h-3" />
				</button>
			</div>
		{/if}

		<!-- System Status Mockup -->
		<div
			class="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-black/20 rounded-lg border border-white/5"
		>
			<div class="w-2 h-2 rounded-full bg-success animate-pulse"></div>
			<span class="text-xs font-medium text-text-muted">System Healthy</span>
		</div>

		<!-- Settings / Profile -->
		<div class="flex items-center gap-2">
			<button
				class="btn btn-circle btn-sm btn-ghost hover:bg-white/10 text-text-muted hover:text-white"
				onclick={() => navigateTo("/settings")}
				aria-label="Settings"
			>
				<Icon icon="material-symbols:settings-outline" class="text-xl" />
			</button>

			<div
				class="w-8 h-8 rounded-full bg-linear-to-tr from-phoenix-primary to-phoenix-violet border border-white/20 shadow-lg cursor-pointer hover:scale-105 transition-transform"
			></div>
		</div>
	</div>
</nav>

<!-- Mobile Navigation Menu -->
{#if isMobileMenuOpen}
	<div
		class="md:hidden mx-4 mb-4 glass-panel p-2 animate-[slide-up-fade_0.3s_var(--ease-out-quart)] z-40 relative"
	>
		<div class="grid grid-cols-1 gap-2">
			{#each navItems as item (item.id)}
				<button
					class="btn btn-ghost justify-start rounded-xl h-12"
					class:btn-active={currentPath === item.path}
					class:text-primary={currentPath === item.path}
					onclick={() => navigateTo(item.path)}
					type="button"
					aria-label="Switch to {item.label} module"
				>
					<Icon icon={item.icon} class="text-xl mr-3" />
					<span class="font-medium text-lg">{item.label}</span>
					{#if currentPath === item.path}
						<Icon icon="material-symbols:check-circle" class="ml-auto text-primary" />
					{/if}
				</button>
			{/each}
		</div>

		<!-- Mobile Global Color Buffer -->
		{#if app.globalColorBuffer}
			<div class="mt-4 pt-4 border-t border-white/10">
				<div
					class="flex items-center space-x-3 px-4 py-3 bg-base-100/30 rounded-xl border border-white/5"
				>
					<span class="text-sm font-medium text-base-content/70">Buffer:</span>
					<button
						type="button"
						aria-label="Copy global color"
						class="w-8 h-8 rounded-full border-2 border-white/20 cursor-pointer shadow-md"
						style:background-color={app.globalColorBuffer}
						onclick={() => {
							navigator.clipboard.writeText(app.globalColorBuffer!);
						}}
						title="Click to copy: {app.globalColorBuffer}"
					></button>
					<span class="text-sm font-mono font-bold text-base-content flex-1">
						{app.globalColorBuffer}
					</span>
					<button
						class="btn btn-sm btn-circle btn-ghost text-error"
						onclick={() => app.clearGlobalColor()}
						title="Clear global color"
						aria-label="Clear global color buffer"
					>
						<Icon icon="material-symbols:close" class="w-4 h-4" />
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Active state for desktop tabs */
	.btn-active {
		background-color: rgba(255, 255, 255, 0.1);
		box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.05);
	}
</style>
