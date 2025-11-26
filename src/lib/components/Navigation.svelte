<script lang="ts">
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import Icon from "@iconify/svelte";
	import { onMount } from "svelte";
	import EyedropperTool from "$lib/components/common/EyedropperTool.svelte";
	import { toast } from "svelte-sonner";
	import { app } from "$lib/stores/root.svelte";

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

	let hoveredItem: string | null = $state(null);
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

<nav class="navbar glass-panel mx-4 mt-4 mb-6 h-20 min-h-20 z-50 relative">
	<!-- Mobile Hamburger Menu -->
	<div class="navbar-start md:hidden">
		<button
			class="btn btn-ghost btn-circle text-primary hover:text-secondary transition-transform hover:scale-110 active:scale-90"
			onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
			aria-label="Toggle mobile menu"
		>
			<Icon
				icon={isMobileMenuOpen ? "material-symbols:close" : "material-symbols:menu"}
				class="text-2xl"
			/>
		</button>

		<!-- Mobile Logo -->
		<div class="ml-2 animate-[pop-in_0.5s_var(--ease-spring)]">
			<div class="avatar placeholder">
				<div
					class="bg-linear-to-br from-primary to-secondary rounded-2xl w-10 text-primary-content shadow-lg shadow-primary/30"
				>
					<Icon icon="material-symbols:brush" class="text-2xl" />
				</div>
			</div>
		</div>
	</div>

	<!-- Desktop Logo/Brand -->
	<div class="navbar-start hidden md:flex">
		<div
			class="flex items-center space-x-4 cursor-pointer group"
			onclick={() => navigateTo("/")}
			onkeydown={(e) => e.key === "Enter" && navigateTo("/")}
			role="button"
			tabindex="0"
		>
			<div
				class="avatar placeholder transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
			>
				<div
					class="bg-linear-to-br from-primary to-secondary rounded-2xl w-12 text-primary-content shadow-lg shadow-primary/30"
				>
					<Icon icon="material-symbols:brush" class="text-3xl" />
				</div>
			</div>
			<div>
				<h1
					class="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-white to-white/80 group-hover:from-primary group-hover:to-secondary transition-all duration-300"
				>
					PhoenyxColor
				</h1>
				<p class="text-xs font-medium text-base-content/60 tracking-wider uppercase">
					Artist's Workflow Suite
				</p>
			</div>
		</div>
	</div>

	<!-- Desktop Navigation Tabs -->
	<div class="navbar-center hidden md:flex">
		<div
			class="flex items-center space-x-2 p-1 bg-base-100/30 backdrop-blur-md rounded-full border border-white/5"
		>
			{#each navItems as item (item.id)}
				<button
					class="btn btn-sm btn-ghost rounded-full px-6 h-10 font-medium relative overflow-hidden group transition-all duration-300 hover:bg-white/10"
					class:btn-active={currentPath === item.path}
					class:text-primary={currentPath === item.path}
					class:bg-white-10={currentPath === item.path}
					onclick={() => navigateTo(item.path)}
					onmouseenter={() => (hoveredItem = item.id)}
					onmouseleave={() => (hoveredItem = null)}
					type="button"
					aria-label="Switch to {item.label} module"
				>
					<div class="relative z-10 flex items-center space-x-2">
						<Icon
							icon={item.icon}
							class="text-lg transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-12"
						/>
						<span>{item.label}</span>
					</div>

					<!-- Active Indicator (Bottom Line) -->
					{#if currentPath === item.path}
						<div
							class="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-primary to-secondary animate-[slide-up-fade_0.3s_var(--ease-spring)]"
						></div>
					{/if}

					<!-- Tooltip -->
					{#if hoveredItem === item.id && hoveredItem !== currentPath}
						<div class="tooltip-container">
							<div class="tooltip-content glass-panel border-primary/20 text-glow">
								{item.description}
							</div>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Mobile Title Center -->
	<div class="navbar-center md:hidden">
		<h1 class="text-xl font-bold text-base-content tracking-wide">PhoenyxColor</h1>
	</div>

	<!-- Utility Actions -->
	<div class="navbar-end">
		<div class="flex items-center space-x-3">
			<!-- Global Color Buffer Display -->
			{#if app.globalColorBuffer}
				<div
					class="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-base-100/40 backdrop-blur-md rounded-full border border-white/10 animate-[pop-in_0.4s_var(--ease-spring)]"
				>
					<div
						onkeydown={(e) => {
							if (e.key === "Enter") {
								navigator.clipboard.writeText(app.globalColorBuffer!);
								toast.success(`Copied ${app.globalColorBuffer}!`);
							}
						}}
						role="button"
						tabindex="0"
						class="w-6 h-6 rounded-full border-2 border-white/20 cursor-pointer hover:scale-110 transition-transform shadow-sm"
						style:background-color={app.globalColorBuffer}
						onclick={() => {
							navigator.clipboard.writeText(app.globalColorBuffer!);
							toast.success(`Copied ${app.globalColorBuffer}!`);
						}}
						title="Click to copy: {app.globalColorBuffer}"
					></div>
					<span class="text-xs font-mono font-bold text-base-content/80">
						{app.globalColorBuffer}
					</span>
					<button
						class="btn btn-xs btn-circle btn-ghost hover:bg-error/20 hover:text-error"
						onclick={() => app.clearGlobalColor()}
						title="Clear global color"
						aria-label="Clear global color buffer"
					>
						<Icon icon="material-symbols:close" class="w-3 h-3" />
					</button>
				</div>
			{/if}

			<!-- Settings -->
			<div class="tooltip tooltip-left" data-tip="Settings">
				<button
					class="btn btn-circle btn-ghost hover:bg-white/10 transition-all duration-500 group"
					onclick={() => navigateTo("/settings")}
					aria-label="Settings"
				>
					<Icon
						icon="material-symbols:settings-outline"
						class="text-2xl text-base-content/70 group-hover:text-primary transition-all duration-700 group-hover:rotate-180"
					/>
				</button>
			</div>
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
	.tooltip-container {
		position: absolute;
		top: 120%;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		pointer-events: none;
		width: max-content;
	}

	.tooltip-content {
		padding: 8px 16px;
		font-size: 0.8rem;
		font-weight: 500;
		color: white;
		animation: pop-in 0.3s var(--ease-spring) forwards;
	}

	/* Active state for desktop tabs */
	.btn-active {
		background-color: rgba(255, 255, 255, 0.1);
		box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.05);
	}
</style>
