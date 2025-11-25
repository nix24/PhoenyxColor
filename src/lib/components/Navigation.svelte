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

<nav class="navbar bg-base-100 shadow-lg border-b border-base-300 h-16 min-h-16">
	<!-- Mobile Hamburger Menu -->
	<div class="navbar-start md:hidden">
		<button
			class="btn btn-ghost btn-circle"
			onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
			aria-label="Toggle mobile menu"
		>
			<Icon
				icon={isMobileMenuOpen ? "material-symbols:close" : "material-symbols:menu"}
				class="text-xl"
			/>
		</button>

		<!-- Mobile Logo (simplified) -->
		<div class="ml-2">
			<div class="avatar placeholder">
				<div
					class="bg-gradient-to-br from-primary to-secondary rounded-lg w-8 text-primary-content"
				>
					<Icon icon="material-symbols:brush" class="text-2xl" />
				</div>
			</div>
		</div>
	</div>

	<!-- Desktop Logo/Brand -->
	<div class="navbar-start hidden md:flex">
		<div class="flex items-center space-x-3">
			<div class="avatar placeholder">
				<div
					class="bg-gradient-to-br from-primary to-secondary rounded-lg w-10 text-primary-content"
				>
					<Icon icon="material-symbols:brush" class="text-4xl" />
				</div>
			</div>
			<div>
				<h1 class="text-xl font-bold text-base-content">PhoenyxColor</h1>
				<p class="text-xs text-base-content/70">Artist's Workflow Suite</p>
			</div>
		</div>
	</div>

	<!-- Desktop Navigation Tabs -->
	<div class="navbar-center hidden md:flex">
		<div class="tabs tabs-boxed bg-base-200">
			{#each navItems as item (item.id)}
				<button
					class="tab tab-lg relative"
					class:tab-active={currentPath === item.path}
					onclick={() => {
						navigateTo(item.path);
					}}
					onmouseenter={() => (hoveredItem = item.id)}
					onmouseleave={() => (hoveredItem = null)}
					type="button"
					aria-label="Switch to {item.label} module"
				>
					<Icon
						icon={item.icon}
						class="text-lg {currentPath === item.path ? 'text-primary' : 'text-base-content/70'}"
					/>
					<span class="ml-2">{item.label}</span>

					<!-- Improved tooltip positioning -->
					{#if hoveredItem === item.id && hoveredItem !== currentPath}
						<div class="tooltip-container">
							<div class="tooltip-content">
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
		<h1 class="text-lg font-bold text-base-content">PhoenyxColor</h1>
	</div>

	<!-- Utility Actions -->
	<div class="navbar-end">
		<div class="flex items-center space-x-1">
			<!-- Global Color Buffer Display -->
			{#if app.globalColorBuffer}
				<div
					class="hidden sm:flex items-center space-x-2 px-3 py-1 bg-base-200 rounded-lg border border-base-300"
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
						class="w-6 h-6 rounded border border-base-300 cursor-pointer"
						style:background-color={app.globalColorBuffer}
						onclick={() => {
							navigator.clipboard.writeText(app.globalColorBuffer!);
							toast.success(`Copied ${app.globalColorBuffer}!`);
						}}
						title="Click to copy: {app.globalColorBuffer}"
					></div>
					<span class="text-xs font-mono text-base-content/70">
						{app.globalColorBuffer}
					</span>
					<button
						class="btn btn-xs btn-ghost"
						onclick={() => app.clearGlobalColor()}
						title="Clear global color"
						aria-label="Clear global color buffer"
					>
						<Icon icon="material-symbols:close" class="w-3 h-3" />
					</button>
				</div>
			{/if}

			<!-- Settings -->
			<button
				class="btn btn-circle btn-ghost"
				class:btn-primary={currentPath === "/settings"}
				onclick={() => {
					navigateTo("/settings");
				}}
				type="button"
				aria-label="Open settings"
				title="Settings"
			>
				<Icon
					icon="material-symbols:settings-outline"
					class="text-lg {currentPath === '/settings'
						? 'text-primary-content'
						: 'text-base-content'}"
				/>
			</button>
		</div>
	</div>
</nav>

<!-- Mobile Navigation Menu -->
{#if isMobileMenuOpen}
	<div class="md:hidden bg-base-100 border-b border-base-300 shadow-lg">
		<div class="grid grid-cols-2 gap-2 p-4">
			{#each navItems as item (item.id)}
				<button
					class="btn btn-outline btn-block justify-start"
					class:btn-primary={currentPath === item.path}
					onclick={() => {
						navigateTo(item.path);
					}}
					type="button"
					aria-label="Switch to {item.label} module"
				>
					<Icon icon={item.icon} class="text-lg" />
					{item.label}
				</button>
			{/each}
		</div>

		<!-- Mobile Global Color Buffer -->
		{#if app.globalColorBuffer}
			<div class="px-4 pb-4">
				<div
					class="flex items-center space-x-2 px-3 py-2 bg-base-200 rounded-lg border border-base-300"
				>
					<span class="text-sm text-base-content/70">Global Color:</span>
					<button
						type="button"
						aria-label="Copy global color"
						class="w-6 h-6 rounded border border-base-300 cursor-pointer"
						style:background-color={app.globalColorBuffer}
						onclick={() => {
							navigator.clipboard.writeText(app.globalColorBuffer!);
						}}
						title="Click to copy: {app.globalColorBuffer}"
					></button>
					<span class="text-xs font-mono text-base-content/70 flex-1">
						{app.globalColorBuffer}
					</span>
					<button
						class="btn btn-xs btn-ghost"
						onclick={() => app.clearGlobalColor()}
						title="Clear global color"
						aria-label="Clear global color buffer"
					>
						<Icon icon="material-symbols:close" class="w-3 h-3" />
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.tooltip-container {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		z-index: 50;
		margin-top: 8px;
		pointer-events: none;
	}

	.tooltip-content {
		background: hsl(var(--b1));
		color: hsl(var(--bc));
		border: 1px solid hsl(var(--b3));
		border-radius: 6px;
		padding: 8px 12px;
		font-size: 0.75rem;
		white-space: nowrap;
		box-shadow:
			0 4px 6px -1px rgb(0 0 0 / 0.1),
			0 2px 4px -2px rgb(0 0 0 / 0.1);
		animation: fadeInUp 0.2s ease-out forwards;
	}

	.tooltip-content::before {
		content: "";
		position: absolute;
		top: -4px;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 4px solid transparent;
		border-right: 4px solid transparent;
		border-bottom: 4px solid hsl(var(--b1));
	}

	.tab {
		transition: all 0.2s ease-out;
	}

	.tab:hover {
		transform: translateY(-1px);
	}

	/* Active class styling for theme buttons */
	/* .ACTIVECLASS {
        background: hsl(var(--p));
        color: hsl(var(--pc));
    } */
</style>
