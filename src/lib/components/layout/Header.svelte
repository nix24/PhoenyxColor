<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";

	let { title = "PhoenyxColor" } = $props();

	function copyGlobalColor() {
		if (app.globalColorBuffer) {
			navigator.clipboard.writeText(app.globalColorBuffer);
			toast.success(`Copied ${app.globalColorBuffer}!`);
		}
	}

	function clearGlobalColor() {
		app.clearGlobalColor();
	}
</script>

<header class="h-16 flex items-center justify-between px-4 md:px-6 py-2 z-30">
	<!-- Page Title / Breadcrumbs -->
	<div class="flex items-center gap-3">
		<!-- Mobile Menu Toggle (Hidden on Desktop) -->
		<button
			class="md:hidden btn btn-circle btn-ghost btn-sm text-white"
			onclick={() => app.toggleMobileMenu()}
			aria-label={app.mobileMenuOpen ? "Close menu" : "Open menu"}
			aria-expanded={app.mobileMenuOpen}
		>
			<Icon
				icon={app.mobileMenuOpen ? "material-symbols:close" : "material-symbols:menu"}
				class="text-xl transition-transform duration-200"
			/>
		</button>

		<!-- Page Title - visible on all screen sizes -->
		<h2 class="text-lg md:text-xl font-bold text-white tracking-wider">
			{title}
		</h2>
	</div>

	<!-- Global Tools -->
	<div class="flex items-center gap-2 md:gap-4">
		<!-- Global Color Buffer - compact on mobile -->
		{#if app.globalColorBuffer}
			<GlassPanel
				class="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 animate-bounce-in"
				intensity="low"
				hoverEffect={true}
			>
				<button
					class="w-6 h-6 rounded-md border border-white/20 shadow-sm cursor-pointer hover:scale-110 transition-transform"
					style:background-color={app.globalColorBuffer}
					onclick={copyGlobalColor}
					title="Copy Color"
					aria-label="Copy global color"
				></button>

				<span class="font-mono text-xs text-white/80 hidden sm:inline">{app.globalColorBuffer}</span
				>

				<button
					class="text-white/50 hover:text-white transition-colors"
					onclick={clearGlobalColor}
					aria-label="Clear"
				>
					<Icon icon="material-symbols:close" class="text-sm" />
				</button>
			</GlassPanel>
		{/if}

		<!-- User / Profile (Placeholder) -->
		<button
			class="btn btn-circle btn-ghost btn-sm text-white/70 hover:text-white hover:bg-white/10"
		>
			<Icon icon="material-symbols:notifications-outline" class="text-xl" />
		</button>
	</div>
</header>
