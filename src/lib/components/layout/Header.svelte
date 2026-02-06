<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import { preloadData } from "$app/navigation";
	import { page } from "$app/state";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { toast } from "svelte-sonner";
	import { slide } from "svelte/transition";
	import { cubicOut } from "svelte/easing";

	let { title = "PhoenyxColor" } = $props();

	const navItems = [
		{
			id: "references",
			path: "/references",
			label: "References",
			icon: "material-symbols:image-outline",
		},
		{
			id: "palettes",
			path: "/palettes",
			label: "Palettes",
			icon: "material-symbols:palette-outline",
		},
		{
			id: "gradients",
			path: "/gradients",
			label: "Gradients",
			icon: "material-symbols:gradient",
		},
	];

	let currentPath = $derived(page.url.pathname);
	let activeIndex = $derived(navItems.findIndex((item) => currentPath.includes(item.path)));

	function handleHover(path: string) {
		preloadData(path);
	}
</script>

<header class="nav-header h-12 flex items-center justify-between px-4 md:px-5 z-30 shrink-0">
	<!-- Left: Mobile Menu + Brand -->
	<div class="flex items-center gap-2.5">
		<!-- Mobile Menu Toggle -->
		<button
			class="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/8 active:scale-90 transition-all"
			onclick={() => app.toggleMobileMenu()}
			aria-label={app.mobileMenuOpen ? "Close menu" : "Open menu"}
			type="button"
		>
			<Icon
				icon={app.mobileMenuOpen ? "material-symbols:close" : "material-symbols:menu"}
				class="text-lg"
			/>
		</button>

		<!-- Brand -->
		<a
			href="/"
			data-sveltekit-preload-data="hover"
			class="flex items-center gap-2 group no-underline"
			onmouseenter={() => handleHover("/")}
		>
			<div class="brand-mark w-7 h-7 rounded-lg flex items-center justify-center text-white">
				<Icon icon="material-symbols:local-fire-department" class="text-sm" />
			</div>
			<span
				class="font-display font-bold text-[15px] tracking-wide text-white/90 group-hover:text-white transition-colors hidden sm:inline"
			>
				PHOENYX<span class="text-phoenix-primary">COLOR</span>
			</span>
		</a>
	</div>

	<!-- Center: Pill Navigation (Desktop) -->
	<nav
		class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex"
		aria-label="Main navigation"
	>
		<div class="nav-pill relative flex items-center gap-0.5 p-1 rounded-full">
			<!-- Sliding active indicator -->
			{#if activeIndex >= 0}
				<div
					class="nav-indicator absolute top-1 bottom-1 rounded-full"
					style:left="{activeIndex * 108 + 4}px"
					style:width="104px"
				></div>
			{/if}

			{#each navItems as item (item.id)}
				<a
					href={item.path}
					data-sveltekit-preload-data="hover"
					class={cn(
						"nav-link relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium no-underline",
						currentPath.includes(item.path)
							? "text-white"
							: "text-white/45 hover:text-white/80"
					)}
					onmouseenter={() => handleHover(item.path)}
					aria-current={currentPath.includes(item.path) ? "page" : undefined}
				>
					<Icon
						icon={item.icon}
						class={cn(
							"w-3.5 h-3.5",
							currentPath.includes(item.path) ? "text-phoenix-primary" : ""
						)}
					/>
					{item.label}
				</a>
			{/each}
		</div>
	</nav>

	<!-- Right: Color Buffer + Settings -->
	<div class="flex items-center gap-2">
		<!-- Global Color Buffer (when active) -->
		{#if app.globalColorBuffer}
			<button
				class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/8 hover:bg-white/10 transition-all group"
				onclick={() => {
					if (app.globalColorBuffer) {
						navigator.clipboard.writeText(app.globalColorBuffer);
						toast.success(`Copied ${app.globalColorBuffer}`);
					}
				}}
				title="Click to copy color"
				type="button"
			>
				<div
					class="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
					style:background-color={app.globalColorBuffer}
				></div>
				<span
					class="text-[11px] font-mono text-white/50 group-hover:text-white/70 transition-colors"
				>
					{app.globalColorBuffer}
				</span>
			</button>
		{/if}

		<!-- Settings -->
		<a
			href="/settings"
			data-sveltekit-preload-data="hover"
			class="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all group no-underline"
			onmouseenter={() => handleHover("/settings")}
			aria-label="Settings"
		>
			<Icon
				icon="material-symbols:settings-outline"
				class="text-lg group-hover:rotate-90 transition-transform duration-500"
			/>
		</a>
	</div>
</header>

<!-- Mobile Navigation Menu -->
{#if app.mobileMenuOpen}
	<div
		class="md:hidden mx-3 mb-2 rounded-xl overflow-hidden z-40 relative"
		transition:slide={{ duration: 200, easing: cubicOut }}
	>
		<div class="mobile-nav-menu p-1.5 space-y-0.5">
			{#each navItems as item (item.id)}
				<a
					href={item.path}
					data-sveltekit-preload-data="hover"
					class={cn(
						"flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all no-underline",
						currentPath.includes(item.path)
							? "bg-white/10 text-white"
							: "text-white/50 hover:text-white hover:bg-white/5 active:bg-white/10"
					)}
					onclick={() => app.closeMobileMenu()}
				>
					<Icon
						icon={item.icon}
						class={cn(
							"text-lg",
							currentPath.includes(item.path) ? "text-phoenix-primary" : ""
						)}
					/>
					<span>{item.label}</span>
					{#if currentPath.includes(item.path)}
						<div class="ml-auto w-1.5 h-1.5 rounded-full bg-phoenix-primary"></div>
					{/if}
				</a>
			{/each}

			<!-- Mobile Settings Link -->
			<a
				href="/settings"
				data-sveltekit-preload-data="hover"
				class={cn(
					"flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border-t border-white/5 mt-1 pt-3 no-underline",
					currentPath === "/settings"
						? "bg-white/10 text-white"
						: "text-white/50 hover:text-white hover:bg-white/5"
				)}
				onclick={() => app.closeMobileMenu()}
			>
				<Icon icon="material-symbols:settings-outline" class="text-lg" />
				<span>Settings</span>
			</a>

			<!-- Mobile Color Buffer -->
			{#if app.globalColorBuffer}
				<div class="flex items-center gap-2.5 px-4 py-2.5 border-t border-white/5 mt-1">
					<div
						class="w-6 h-6 rounded-full border border-white/20 shadow-md shrink-0"
						style:background-color={app.globalColorBuffer}
					></div>
					<span class="text-xs font-mono text-white/60 flex-1">{app.globalColorBuffer}</span>
					<button
						class="text-[11px] font-medium text-phoenix-primary/70 hover:text-phoenix-primary transition-colors"
						onclick={() => {
							if (app.globalColorBuffer) {
								navigator.clipboard.writeText(app.globalColorBuffer);
								toast.success(`Copied ${app.globalColorBuffer}`);
							}
						}}
						type="button"
					>
						COPY
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.nav-header {
		background: color-mix(in oklch, var(--color-bg) 85%, transparent);
		backdrop-filter: blur(16px) saturate(1.4);
		-webkit-backdrop-filter: blur(16px) saturate(1.4);
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}

	.brand-mark {
		background: linear-gradient(135deg, var(--color-phoenix-primary), var(--color-phoenix-violet));
		box-shadow: 0 2px 8px rgba(255, 0, 127, 0.3);
		transition:
			box-shadow 0.3s ease,
			transform 0.2s var(--ease-spring);
	}

	:global(.group:hover) .brand-mark {
		box-shadow: 0 2px 12px rgba(255, 0, 127, 0.5);
		transform: scale(1.05);
	}

	.nav-pill {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.nav-indicator {
		background: rgba(255, 255, 255, 0.08);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
		transition:
			left 0.35s var(--ease-spring),
			width 0.35s var(--ease-spring);
	}

	.nav-link {
		width: 104px;
		justify-content: center;
		transition:
			color 0.2s ease,
			transform 0.15s var(--ease-spring);
	}

	.nav-link:active {
		transform: scale(0.96);
	}

	.mobile-nav-menu {
		background: color-mix(in oklch, var(--color-bg) 90%, transparent);
		backdrop-filter: blur(20px) saturate(1.5);
		-webkit-backdrop-filter: blur(20px) saturate(1.5);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}
</style>
