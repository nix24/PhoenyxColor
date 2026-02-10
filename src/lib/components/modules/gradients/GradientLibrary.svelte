<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import {
		generateCSSGradient,
		GRADIENT_PRESETS,
		PRESET_CATEGORIES,
		type GradientPreset,
		type PresetCategory,
	} from "./gradient-utils";
	import { toast } from "svelte-sonner";

	interface Props {
		searchTerm?: string;
		onCreateNew?: () => void;
		onGenerate?: () => void;
		onFromImage?: () => void;
		onFromPalette?: () => void;
		onApplyPreset?: (preset: GradientPreset) => void;
		onSelect?: () => void;
	}

	let {
		searchTerm = $bindable(""),
		onCreateNew,
		onGenerate,
		onFromImage,
		onFromPalette,
		onApplyPreset,
		onSelect = undefined,
	}: Props = $props();

	// Library state
	type LibraryTab = "gradients" | "presets";
	let activeTab = $state<LibraryTab>("gradients");
	let viewMode = $state<"grid" | "list">("grid");
	let selectedCategory = $state<PresetCategory | "all">("all");

	let filteredGradients = $derived(
		app.gradients.gradients.filter((gradient) =>
			(gradient.name || "Untitled").toLowerCase().includes((searchTerm || "").toLowerCase())
		)
	);

	let filteredPresets = $derived(
		GRADIENT_PRESETS.filter((preset) => {
			const matchesCategory = selectedCategory === "all" || preset.category === selectedCategory;
			const matchesSearch = !searchTerm || preset.name.toLowerCase().includes(searchTerm.toLowerCase());
			return matchesCategory && matchesSearch;
		})
	);

	function handleGradientClick(gradientId: string) {
		app.gradients.setActive(gradientId);
		onSelect?.();
	}

	function handlePresetClick(preset: GradientPreset) {
		onApplyPreset?.(preset);
	}

	function deleteGradient(gradientId: string, name: string, e: Event) {
		e.stopPropagation();
		app.gradients.remove(gradientId);
		toast.info(`Deleted "${name}"`);
	}
</script>

<div class="flex flex-col h-full gap-3 w-full">
	<!-- Quick Actions -->
	<div class="grid grid-cols-2 gap-2 shrink-0">
		<button
			class="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/30 border border-white/5 hover:border-phoenix-primary/30 hover:bg-white/5 transition-all group"
			onclick={onCreateNew}
		>
			<Icon icon="material-symbols:add" class="text-phoenix-primary" />
			<span class="text-xs font-semibold text-text-muted group-hover:text-white">New</span>
		</button>
		<button
			class="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/30 border border-white/5 hover:border-phoenix-violet/30 hover:bg-white/5 transition-all group"
			onclick={onGenerate}
		>
			<Icon icon="material-symbols:auto-awesome" class="text-phoenix-violet" />
			<span class="text-xs font-semibold text-text-muted group-hover:text-white">Generate</span>
		</button>
		<button
			class="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/30 border border-white/5 hover:border-phoenix-primary/30 hover:bg-white/5 transition-all group"
			onclick={onFromImage}
		>
			<Icon icon="material-symbols:image-outline" class="text-phoenix-primary" />
			<span class="text-xs font-semibold text-text-muted group-hover:text-white">Image</span>
		</button>
		<button
			class="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/30 border border-white/5 hover:border-phoenix-violet/30 hover:bg-white/5 transition-all group"
			onclick={onFromPalette}
		>
			<Icon icon="material-symbols:palette-outline" class="text-phoenix-violet" />
			<span class="text-xs font-semibold text-text-muted group-hover:text-white">Palette</span>
		</button>
	</div>

	<!-- Search -->
	<div class="relative shrink-0">
		<Icon
			icon="material-symbols:search"
			class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/50"
		/>
		<input
			type="text"
			bind:value={searchTerm}
			placeholder="Search gradients..."
			class="input input-sm w-full pl-9 bg-black/30 border-white/10 focus:border-phoenix-primary/50 text-xs"
		/>
	</div>

	<!-- Tab Bar -->
	<div class="flex gap-1 bg-black/20 rounded-lg p-1 shrink-0">
		<button
			class={cn(
				"flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
				activeTab === "gradients"
					? "bg-white/10 text-white"
					: "text-text-muted hover:text-white"
			)}
			onclick={() => (activeTab = "gradients")}
		>
			My Gradients ({app.gradients.gradients.length})
		</button>
		<button
			class={cn(
				"flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
				activeTab === "presets"
					? "bg-white/10 text-white"
					: "text-text-muted hover:text-white"
			)}
			onclick={() => (activeTab = "presets")}
		>
			Presets ({GRADIENT_PRESETS.length})
		</button>
	</div>

	<!-- Content -->
	<div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
		{#if activeTab === "gradients"}
			<!-- View toggle -->
			<div class="flex items-center justify-end mb-2 gap-1">
				<button
					class={cn(
						"p-1 rounded transition-colors",
						viewMode === "grid" ? "text-white bg-white/10" : "text-text-muted hover:text-white"
					)}
					onclick={() => (viewMode = "grid")}
					aria-pressed={viewMode === "grid"}
					title="Grid view"
				>
					<Icon icon="material-symbols:grid-view" class="w-4 h-4" />
				</button>
				<button
					class={cn(
						"p-1 rounded transition-colors",
						viewMode === "list" ? "text-white bg-white/10" : "text-text-muted hover:text-white"
					)}
					onclick={() => (viewMode = "list")}
					aria-pressed={viewMode === "list"}
					title="List view"
				>
					<Icon icon="material-symbols:list" class="w-4 h-4" />
				</button>
			</div>

			{#if viewMode === "grid"}
				<div class="grid grid-cols-2 gap-3 content-start">
					<!-- New Gradient Card -->
					<button
						class="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-phoenix-primary/50 flex flex-col items-center justify-center gap-2 group transition-all"
						onclick={onCreateNew}
					>
						<div
							class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-phoenix-primary/20 transition-colors"
						>
							<Icon icon="material-symbols:add" class="text-white" />
						</div>
					</button>

					{#each filteredGradients as gradient (gradient.id)}
						<div
							class={cn(
								"aspect-square rounded-xl p-1 relative group transition-all border cursor-pointer",
								app.gradients.activeGradientId === gradient.id
									? "border-phoenix-primary ring-1 ring-phoenix-primary shadow-lg shadow-phoenix-primary/20"
									: "border-white/5 hover:border-white/20"
							)}
							onclick={() => handleGradientClick(gradient.id)}
							onkeydown={(e) => e.key === "Enter" && handleGradientClick(gradient.id)}
							tabindex="0"
							role="button"
						>
							<div
								class="w-full h-full rounded-lg"
								style:background={generateCSSGradient(gradient)}
							></div>

							<div
								class="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/80 to-transparent rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end"
							>
								<span class="text-[10px] font-medium text-white truncate max-w-[60%]">{gradient.name}</span>
								<button
									class="btn btn-xs btn-ghost text-error hover:bg-error/10 p-0.5"
									onclick={(e) => deleteGradient(gradient.id, gradient.name, e)}
									title="Delete"
								>
									<Icon icon="material-symbols:close" class="w-3 h-3" />
								</button>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<!-- List view -->
				<div class="space-y-2">
					{#each filteredGradients as gradient (gradient.id)}
						<div
							class={cn(
								"w-full flex items-center gap-3 p-2 rounded-lg border transition-all text-left cursor-pointer",
								app.gradients.activeGradientId === gradient.id
									? "border-phoenix-primary/50 bg-phoenix-primary/10"
									: "border-white/5 hover:border-white/20 bg-black/20"
							)}
							onclick={() => handleGradientClick(gradient.id)}
							onkeydown={(e) => e.key === "Enter" && handleGradientClick(gradient.id)}
							tabindex="0"
							role="button"
						>
							<div
								class="w-10 h-10 rounded-lg shrink-0 border border-white/10"
								style:background={generateCSSGradient(gradient)}
							></div>
							<div class="flex-1 min-w-0">
								<div class="text-xs font-medium text-white truncate">{gradient.name}</div>
								<div class="text-[10px] text-text-muted capitalize">{gradient.type} &middot; {gradient.stops.length} stops</div>
							</div>
							<button
								class="btn btn-xs btn-ghost text-error hover:bg-error/10 shrink-0"
								onclick={(e) => deleteGradient(gradient.id, gradient.name, e)}
								title="Delete"
							>
								<Icon icon="material-symbols:close" class="w-3 h-3" />
							</button>
						</div>
					{/each}
				</div>
			{/if}

			{#if filteredGradients.length === 0 && app.gradients.gradients.length > 0}
				<div class="text-center py-6 text-text-muted/50 text-xs">No matches found</div>
			{/if}
			{#if app.gradients.gradients.length === 0}
				<div class="text-center py-6 text-text-muted/50">
					<Icon icon="material-symbols:gradient" class="w-8 h-8 mx-auto mb-2 opacity-30" />
					<p class="text-xs">No gradients yet</p>
				</div>
			{/if}
		{:else}
			<!-- Presets Tab -->
			<!-- Category Filter Pills -->
			<div class="flex gap-1.5 flex-wrap mb-3">
				<button
					class={cn(
						"text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all",
						selectedCategory === "all"
							? "bg-phoenix-primary text-white"
							: "bg-white/5 text-text-muted hover:text-white hover:bg-white/10"
					)}
					onclick={() => (selectedCategory = "all")}
				>
					All
				</button>
				{#each PRESET_CATEGORIES as category}
					<button
						class={cn(
							"text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all flex items-center gap-1",
							selectedCategory === category.id
								? "bg-phoenix-primary text-white"
								: "bg-white/5 text-text-muted hover:text-white hover:bg-white/10"
						)}
						onclick={() => (selectedCategory = category.id)}
					>
						<Icon icon={category.icon} class="w-3 h-3" />
						{category.name}
					</button>
				{/each}
			</div>

			<!-- Preset Grid -->
			<div class="grid grid-cols-2 gap-3 content-start">
				{#each filteredPresets as preset}
					<button
						class="rounded-xl p-1 border border-white/5 hover:border-phoenix-primary/50 transition-all group relative"
						onclick={() => handlePresetClick(preset)}
						title={preset.description || preset.name}
					>
						<div
							class="w-full aspect-4/3 rounded-lg"
							style:background="linear-gradient({preset.angle ?? 45}deg, {preset.colors.join(', ')})"
						></div>
						<div class="px-1 py-1.5">
							<span class="text-[10px] font-medium text-text-muted group-hover:text-white transition-colors truncate block">
								{preset.name}
							</span>
						</div>
					</button>
				{/each}
			</div>

			{#if filteredPresets.length === 0}
				<div class="text-center py-6 text-text-muted/50 text-xs">No presets match</div>
			{/if}
		{/if}
	</div>
</div>
