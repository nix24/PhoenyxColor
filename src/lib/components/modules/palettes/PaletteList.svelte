<script lang="ts">
	import { fly } from "svelte/transition";
	import { elasticOut } from "svelte/easing";
	import { onMount } from "svelte";
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedColorPalette } from "$lib/schemas/validation";
	import Icon from "@iconify/svelte";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import SkeletonCard from "$lib/components/ui/SkeletonCard.svelte";
	import { cn } from "$lib/utils/cn";

	interface Props {
		searchTerm?: string;
		onCreateNew?: () => void;
	}

	let { searchTerm = "", onCreateNew }: Props = $props();

	// Initial loading state for skeleton display
	let isLoading = $state(true);

	onMount(() => {
		// Brief delay to show skeleton, then reveal content
		const timer = setTimeout(() => {
			isLoading = false;
		}, 300);
		return () => clearTimeout(timer);
	});

	let filteredPalettes = $derived(
		app.palettes.palettes.filter(
			(palette) =>
				palette.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				palette.colors.some((color) => color.toLowerCase().includes(searchTerm.toLowerCase()))
		)
	);
</script>

<!-- On mobile: horizontal scrollable strip; On desktop: vertical sidebar -->
<GlassPanel class="w-full lg:w-80 overflow-hidden shrink-0" intensity="low">
	<div class="flex flex-col h-full max-h-48 lg:max-h-full">
		<div class="p-3 lg:p-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
			<h3 class="font-semibold text-white text-sm lg:text-base">
				Palettes ({filteredPalettes.length})
			</h3>
			{#if onCreateNew}
				<button
					class="btn btn-xs btn-ghost text-phoenix-primary lg:hidden"
					onclick={onCreateNew}
					aria-label="Create new palette"
				>
					<Icon icon="material-symbols:add" class="w-4 h-4" />
				</button>
			{/if}
		</div>

		<!-- Mobile: horizontal scroll; Desktop: vertical scroll -->
		<div class="flex-1 overflow-x-auto lg:overflow-x-hidden overflow-y-auto p-2 custom-scrollbar">
			<div class="flex lg:flex-col gap-2 lg:space-y-0 min-w-max lg:min-w-0">
				{#if isLoading}
					<!-- Skeleton Loading State -->
					{#each Array(4) as _, i}
						<div style:animation-delay="{i * 100}ms" class="stagger-item">
							<SkeletonCard type="palette" />
						</div>
					{/each}
				{:else}
					{#each filteredPalettes as palette, i (palette.id)}
						<button
							in:fly={{ y: 20, duration: 400, delay: i * 50, easing: elasticOut }}
							class={cn(
								"text-left p-2 lg:p-3 rounded-xl cursor-pointer transition-all duration-300 border group relative overflow-hidden shrink-0",
								"w-40 lg:w-full", // Fixed width on mobile for horizontal scroll
								app.palettes.activePaletteId === palette.id
									? "bg-phoenix-primary/20 border-phoenix-primary/50 shadow-[0_0_20px_rgba(255,0,127,0.3)] scale-[1.02]"
									: "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-lg"
							)}
							onclick={() => app.palettes.setActive(palette.id)}
							tabindex="0"
							onkeydown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									app.palettes.setActive(palette.id);
								}
							}}
						>
							<!-- Shine Effect -->
							<div
								class="absolute inset-0 bg-linear-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
							></div>

							<!-- Palette Header -->
							<div class="flex items-center justify-between mb-1 lg:mb-2">
								<div class="flex-1 min-w-0">
									<h4
										class={cn(
											"font-medium truncate text-xs lg:text-sm",
											app.palettes.activePaletteId === palette.id ? "text-white" : "text-text-muted"
										)}
										title={palette.name}
									>
										{palette.name}
									</h4>
									<p class="text-[9px] lg:text-[10px] text-text-muted/60 uppercase tracking-wider">
										{palette.colors.length}/{palette.maxSlots} colors
									</p>
								</div>
							</div>

							<!-- Mini Color Swatches -->
							<div class="flex gap-0.5 lg:gap-1 h-2 lg:h-3 mt-1 lg:mt-2">
								{#each palette.colors.slice(0, 8) as color}
									<div
										class="flex-1 h-full rounded-full shadow-sm border border-black/10"
										style:background-color={color}
									></div>
								{/each}
								{#if palette.colors.length === 0}
									<div class="w-full h-full bg-white/5 rounded-full"></div>
								{/if}
							</div>
						</button>
					{/each}

					{#if app.palettes.palettes.length === 0}
						<div class="text-center py-4 lg:py-8 text-text-muted/50 w-full">
							<Icon
								icon="material-symbols:palette-outline"
								class="h-8 w-8 lg:h-12 lg:w-12 mx-auto mb-2 opacity-30"
							/>
							<p class="text-sm">No palettes yet</p>
							{#if onCreateNew}
								<button
									class="btn btn-sm btn-ghost text-phoenix-primary mt-2"
									onclick={onCreateNew}
								>
									Create one
								</button>
							{/if}
						</div>
					{:else if filteredPalettes.length === 0}
						<div class="text-center py-4 lg:py-8 text-text-muted/50 w-full">
							<Icon
								icon="material-symbols:search-off"
								class="h-8 w-8 lg:h-12 lg:w-12 mx-auto mb-2 opacity-30"
							/>
							<p class="text-sm">No matches found</p>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</GlassPanel>
