<script lang="ts">
	import { fly } from "svelte/transition";
	import { elasticOut } from "svelte/easing";
	import { onMount } from "svelte";
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedGradient } from "$lib/schemas/validation";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import SkeletonCard from "$lib/components/ui/SkeletonCard.svelte";
	import { cn } from "$lib/utils/cn";
	import { generateCSSGradient } from "./gradient-utils";

	interface Props {
		searchTerm?: string;
		onCreateNew?: () => void;
		onExportCSS?: (gradient: ValidatedGradient) => void;
	}

	let { searchTerm = "", onCreateNew, onExportCSS }: Props = $props();

	// Initial loading state for skeleton display
	let isLoading = $state(true);

	onMount(() => {
		const timer = setTimeout(() => {
			isLoading = false;
		}, 300);
		return () => clearTimeout(timer);
	});

	let filteredGradients = $derived(
		app.gradients.gradients.filter((gradient) =>
			gradient.name.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);

	async function copyCSS(gradient: ValidatedGradient, e: Event) {
		e.stopPropagation();
		const css = `background: ${generateCSSGradient(gradient)};`;
		try {
			await navigator.clipboard.writeText(css);
			toast.success("CSS copied to clipboard!");
		} catch {
			toast.error("Failed to copy CSS");
		}
	}

	function deleteGradient(gradient: ValidatedGradient, e: Event) {
		e.stopPropagation();
		app.gradients.remove(gradient.id);
		toast.info(`Deleted "${gradient.name}"`);
	}

	async function clearAllGradients() {
		if (confirm("Are you sure you want to delete all gradients?")) {
			const ids = app.gradients.gradients.map((g) => g.id);
			ids.forEach((id) => app.gradients.remove(id));
			toast.success("All gradients cleared!");
		}
	}
</script>

<!-- On mobile: horizontal scrollable strip; On desktop: vertical sidebar -->
<GlassPanel class="w-full lg:w-80 overflow-hidden shrink-0" intensity="low">
	<div class="flex flex-col h-full max-h-48 lg:max-h-full">
		<div class="p-3 lg:p-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
			<h3 class="font-semibold text-white text-sm lg:text-base">
				Gradients ({filteredGradients.length})
			</h3>
			<div class="flex items-center gap-1">
				{#if onCreateNew}
					<button
						class="btn btn-xs btn-ghost text-phoenix-primary lg:hidden"
						onclick={onCreateNew}
						aria-label="Create new gradient"
					>
						<Icon icon="material-symbols:add" class="w-4 h-4" />
					</button>
				{/if}
				{#if app.gradients.gradients.length > 0}
					<button
						class="btn btn-xs btn-ghost text-error hover:bg-error/10 hover:scale-110 transition-transform duration-300"
						onclick={clearAllGradients}
						title="Clear all gradients"
					>
						<Icon icon="material-symbols:clear-all" class="w-3 h-3" />
					</button>
				{/if}
			</div>
		</div>

		<!-- Mobile: horizontal scroll; Desktop: vertical scroll -->
		<div class="flex-1 overflow-x-auto lg:overflow-x-hidden overflow-y-auto p-2 custom-scrollbar">
			<div class="flex lg:flex-col gap-2 lg:space-y-0 min-w-max lg:min-w-0">
				{#if isLoading}
					<!-- Skeleton Loading State -->
					{#each Array(4) as _, i}
						<div style:animation-delay="{i * 100}ms" class="stagger-item">
							<SkeletonCard type="gradient" />
						</div>
					{/each}
				{:else}
					{#each filteredGradients as gradient, i (gradient.id)}
						<button
							in:fly={{ y: 20, duration: 400, delay: i * 50, easing: elasticOut }}
							class={cn(
								"text-left p-2 lg:p-3 rounded-xl cursor-pointer transition-all duration-300 border group relative overflow-hidden shrink-0",
								"w-44 lg:w-full", // Fixed width on mobile for horizontal scroll
								app.gradients.activeGradientId === gradient.id
									? "bg-phoenix-primary/20 border-phoenix-primary/50 shadow-[0_0_20px_rgba(255,0,127,0.3)] scale-[1.02]"
									: "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-lg"
							)}
							onclick={() => app.gradients.setActive(gradient.id)}
							tabindex="0"
							onkeydown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									app.gradients.setActive(gradient.id);
								}
							}}
						>
							<!-- Shine Effect -->
							<div
								class="absolute inset-0 bg-linear-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
							></div>

							<!-- Gradient Header -->
							<div class="flex items-center justify-between mb-1 lg:mb-2 relative z-10">
								<div class="flex-1 min-w-0">
									<h4
										class={cn(
											"font-medium truncate text-xs lg:text-sm",
											app.gradients.activeGradientId === gradient.id
												? "text-white"
												: "text-text-muted group-hover:text-white"
										)}
										title={gradient.name}
									>
										{gradient.name}
									</h4>
									<p class="text-[9px] lg:text-[10px] text-text-muted/60 uppercase tracking-wider">
										{gradient.type} • {gradient.stops.length} stops
									</p>
								</div>

								<!-- Quick Actions - visible on hover for desktop -->
								<div
									class="hidden lg:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
								>
									<div
										role="button"
										tabindex="0"
										class="btn btn-xs btn-ghost text-text-muted hover:text-white hover:scale-110 transition-transform duration-300"
										onclick={(e) => copyCSS(gradient, e)}
										onkeydown={(e) => {
											if (e.key === "Enter") copyCSS(gradient, e);
										}}
										title="Copy CSS"
									>
										<Icon icon="material-symbols:code" class="w-3 h-3" />
									</div>
									<div
										role="button"
										tabindex="0"
										class="btn btn-xs btn-ghost text-error hover:bg-error/10 hover:scale-110 transition-transform duration-300"
										onclick={(e) => deleteGradient(gradient, e)}
										onkeydown={(e) => {
											if (e.key === "Enter") deleteGradient(gradient, e);
										}}
										title="Delete gradient"
									>
										<Icon icon="material-symbols:delete-outline" class="w-3 h-3" />
									</div>
								</div>
							</div>

							<!-- Gradient Preview -->
							<div
								class="h-8 lg:h-12 rounded-lg border border-white/10 shadow-inner transition-all duration-300 group-hover:shadow-lg"
								style:background={generateCSSGradient(gradient)}
							></div>
						</button>
					{/each}

					{#if app.gradients.gradients.length === 0}
						<div class="text-center py-4 lg:py-8 text-text-muted/50 w-full">
							<Icon
								icon="material-symbols:gradient"
								class="h-8 w-8 lg:h-12 lg:w-12 mx-auto mb-2 opacity-30"
							/>
							<p class="text-sm">No gradients yet</p>
							{#if onCreateNew}
								<button
									class="btn btn-sm btn-ghost text-phoenix-primary mt-2"
									onclick={onCreateNew}
								>
									Create one
								</button>
							{/if}
						</div>
					{:else if filteredGradients.length === 0}
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
