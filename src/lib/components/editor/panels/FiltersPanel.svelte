<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import type { ImageEditorState } from "../EditorHistory.svelte";
	import type { FilterPreset, PresetCategory } from "$lib/types/image-editor";
	import { app } from "$lib/stores/root.svelte";
	import { toast } from "svelte-sonner";
	import PresetCard from "../PresetCard.svelte";
	import { buildReferenceFilterString } from "$lib/utils/image-filters";

	let { currentState, imageSrc, onApplyPreset } = $props<{
		currentState: ImageEditorState;
		imageSrc: string;
		onApplyPreset: (preset: Partial<ImageEditorState>, intensity: number) => void;
	}>();

	let presetIntensity = $state(100);
	let activePresetId = $state<string | null>(null);
	let activeTab = $state<"builtin" | "custom">("builtin");
	let newPresetName = $state("");
	let showSaveDialog = $state(false);
	let selectedCategory = $state<PresetCategory | "all">("all");
	let searchQuery = $state("");

	const builtInPresets: Array<{
		id: string;
		name: string;
		icon: string;
		settings: Partial<ImageEditorState>;
	}> = [
		{
			id: "none",
			name: "None",
			icon: "material-symbols:block",
			settings: {},
		},
		{
			id: "vintage",
			name: "Vintage",
			icon: "material-symbols:photo-filter",
			settings: {
				brightness: 95,
				contrast: 90,
				saturation: 70,
				sepia: 30,
				temperature: 15,
				vignette: 25,
			},
		},
		{
			id: "cinematic",
			name: "Cinematic",
			icon: "material-symbols:movie",
			settings: {
				contrast: 120,
				saturation: 85,
				shadows: -10,
				highlights: -5,
				tint: 5,
				vignette: 15,
			},
		},
		{
			id: "vibrant",
			name: "Vibrant",
			icon: "material-symbols:palette",
			settings: {
				saturation: 140,
				vibrance: 30,
				contrast: 110,
				clarity: 15,
			},
		},
		{
			id: "muted",
			name: "Muted",
			icon: "material-symbols:blur-on",
			settings: {
				saturation: 60,
				contrast: 90,
				brightness: 105,
				shadows: 10,
			},
		},
		{
			id: "noir",
			name: "Noir",
			icon: "material-symbols:contrast",
			settings: {
				isGrayscale: true,
				contrast: 130,
				brightness: 95,
				shadows: -15,
				vignette: 40,
			},
		},
		{
			id: "golden",
			name: "Golden Hour",
			icon: "material-symbols:wb-sunny",
			settings: {
				temperature: 35,
				brightness: 105,
				saturation: 110,
				shadows: 10,
				highlights: -10,
			},
		},
		{
			id: "cold",
			name: "Cold Blue",
			icon: "material-symbols:ac-unit",
			settings: {
				temperature: -25,
				tint: -10,
				contrast: 105,
				saturation: 90,
			},
		},
		{
			id: "fade",
			name: "Faded",
			icon: "material-symbols:gradient",
			settings: {
				contrast: 80,
				saturation: 75,
				brightness: 110,
				shadows: 20,
			},
		},
		{
			id: "punch",
			name: "Punch",
			icon: "material-symbols:flare",
			settings: {
				contrast: 130,
				saturation: 120,
				clarity: 25,
				vibrance: 20,
			},
		},
		{
			id: "soft",
			name: "Soft",
			icon: "material-symbols:blur-circular",
			settings: {
				contrast: 90,
				brightness: 105,
				clarity: -20,
				saturation: 95,
			},
		},
		{
			id: "dramatic",
			name: "Dramatic",
			icon: "material-symbols:theater-comedy",
			settings: {
				contrast: 140,
				shadows: -20,
				highlights: 15,
				clarity: 30,
				vignette: 20,
			},
		},
	];

	const categories: { value: PresetCategory | "all"; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "custom", label: "Custom" },
		{ value: "portrait", label: "Portrait" },
		{ value: "landscape", label: "Landscape" },
		{ value: "urban", label: "Urban" },
		{ value: "vintage", label: "Vintage" },
		{ value: "creative", label: "Creative" },
	];

	const filteredCustomPresets = $derived.by(() => {
		let result = app.filterPresets.presets;
		if (selectedCategory !== "all") {
			result = result.filter((p) => p.category === selectedCategory);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter((p) => p.name.toLowerCase().includes(q));
		}
		return result;
	});

	function handleBuiltInClick(preset: (typeof builtInPresets)[0]) {
		activePresetId = preset.id;
		if (preset.id === "none") {
			onApplyPreset({}, 100);
		} else {
			onApplyPreset(preset.settings, presetIntensity);
		}
	}

	function handleCustomPresetClick(preset: FilterPreset) {
		activePresetId = preset.id;
		onApplyPreset(preset.settings as Partial<ImageEditorState>, presetIntensity);
	}

	function handleIntensityChange(value: number) {
		presetIntensity = value;
		if (activePresetId && activePresetId !== "none") {
			const allPresets = [
				...builtInPresets,
				...app.filterPresets.presets.map((p) => ({ ...p, icon: "" })),
			];
			const preset = allPresets.find((p) => p.id === activePresetId);
			if (preset) {
				onApplyPreset(preset.settings as Partial<ImageEditorState>, value);
			}
		}
	}

	function handleSavePreset() {
		if (!newPresetName.trim()) {
			toast.error("Please enter a preset name");
			return;
		}

		app.filterPresets.add({
			name: newPresetName.trim(),
			category: "custom",
			settings: {
				brightness: currentState.brightness,
				contrast: currentState.contrast,
				saturation: currentState.saturation,
				hueRotate: currentState.hueRotate,
				sepia: currentState.sepia,
				invert: currentState.invert,
				isGrayscale: currentState.isGrayscale,
				shadows: currentState.shadows,
				highlights: currentState.highlights,
				vibrance: currentState.vibrance,
				temperature: currentState.temperature,
				tint: currentState.tint,
				clarity: currentState.clarity,
				vignette: currentState.vignette,
			},
		});

		newPresetName = "";
		showSaveDialog = false;
		toast.success("Preset saved!");
	}

	function handleDeletePreset(id: string) {
		app.filterPresets.remove(id);
		if (activePresetId === id) {
			activePresetId = null;
		}
		toast.success("Preset deleted");
	}
</script>

<div class="space-y-4">
	<!-- Intensity Slider -->
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<span class="text-sm text-white">Filter Intensity</span>
			<span class="text-xs font-mono text-white/60">{presetIntensity}%</span>
		</div>
		<input
			type="range"
			min="0"
			max="100"
			value={presetIntensity}
			class="range range-xs range-primary"
			oninput={(e) => handleIntensityChange(parseInt(e.currentTarget.value))}
		/>
	</div>

	<!-- Tab Bar -->
	<div class="flex gap-1 p-0.5 rounded-lg bg-white/5">
		<button
			class={cn(
				"flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
				activeTab === "builtin"
					? "bg-phoenix-primary text-white shadow-sm"
					: "text-white/50 hover:text-white/80"
			)}
			onclick={() => (activeTab = "builtin")}
			aria-pressed={activeTab === "builtin"}
		>
			Presets
		</button>
		<button
			class={cn(
				"flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
				activeTab === "custom"
					? "bg-phoenix-primary text-white shadow-sm"
					: "text-white/50 hover:text-white/80"
			)}
			onclick={() => (activeTab = "custom")}
			aria-pressed={activeTab === "custom"}
		>
			My Presets
			{#if app.filterPresets.presets.length > 0}
				<span class="ml-1 text-[10px] opacity-60">({app.filterPresets.presets.length})</span>
			{/if}
		</button>
	</div>

	<!-- Built-in Presets Tab -->
	{#if activeTab === "builtin"}
		<div class="space-y-3">
			<div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
				{#each builtInPresets as preset}
					<button
						class={cn(
							"flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all duration-200",
							activePresetId === preset.id
								? "bg-phoenix-primary/20 ring-2 ring-phoenix-primary/60 text-white"
								: "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
						)}
						onclick={() => handleBuiltInClick(preset)}
					>
						<div class="w-full aspect-square rounded-md overflow-hidden bg-black/30 flex items-center justify-center">
							{#if preset.id === "none"}
								<Icon icon={preset.icon} class="w-6 h-6" />
							{:else}
								<img
									src={imageSrc}
									alt={preset.name}
									class="w-full h-full object-cover"
									style:filter={buildReferenceFilterString(preset.settings)}
									loading="lazy"
								/>
							{/if}
						</div>
						<span class="text-[10px] font-medium truncate w-full text-center">{preset.name}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Custom Presets Tab -->
	{#if activeTab === "custom"}
		<div class="space-y-3">
			<!-- Search -->
			{#if app.filterPresets.presets.length > 4}
				<div class="relative">
					<Icon
						icon="material-symbols:search"
						class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
					/>
					<input
						type="text"
						class="input input-sm w-full pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/30"
						placeholder="Search presets..."
						bind:value={searchQuery}
					/>
				</div>
			{/if}

			<!-- Category Filter -->
			{#if app.filterPresets.presets.length > 0}
				<div class="flex flex-wrap gap-1">
					{#each categories as cat}
						<button
							class={cn(
								"px-2.5 py-1 rounded-full text-[10px] font-medium transition-all",
								selectedCategory === cat.value
									? "bg-phoenix-primary/20 text-phoenix-primary ring-1 ring-phoenix-primary/40"
									: "bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/8"
							)}
							onclick={() => (selectedCategory = cat.value)}
							aria-pressed={selectedCategory === cat.value}
						>
							{cat.label}
						</button>
					{/each}
				</div>
			{/if}

			<!-- Preset Grid -->
			{#if filteredCustomPresets.length > 0}
				<div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
					{#each filteredCustomPresets as preset (preset.id)}
						<PresetCard
							{preset}
							{imageSrc}
							isActive={activePresetId === preset.id}
							onApply={handleCustomPresetClick}
							onDelete={handleDeletePreset}
						/>
					{/each}
				</div>
			{:else if searchQuery.trim()}
				<div class="text-center py-8 text-white/40">
					<Icon icon="material-symbols:search-off" class="w-8 h-8 mx-auto mb-2 opacity-50" />
					<p class="text-xs">No presets match "{searchQuery}"</p>
				</div>
			{:else if app.filterPresets.presets.length === 0}
				<div class="text-center py-8 text-white/40">
					<Icon icon="material-symbols:filter-vintage" class="w-10 h-10 mx-auto mb-3 opacity-30" />
					<p class="text-sm font-medium text-white/50 mb-1">No custom presets yet</p>
					<p class="text-xs">Adjust filters and save them as presets</p>
				</div>
			{:else}
				<div class="text-center py-8 text-white/40">
					<p class="text-xs">No presets in this category</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Save Current as Preset -->
	<div class="pt-4 border-t border-white/10">
		{#if showSaveDialog}
			<div class="space-y-3">
				<input
					type="text"
					class="input input-sm w-full bg-white/5 border-white/10 text-white"
					placeholder="Preset name..."
					bind:value={newPresetName}
					onkeydown={(e) => {
						if (e.key === "Enter") handleSavePreset();
						if (e.key === "Escape") showSaveDialog = false;
					}}
				/>
				<div class="flex gap-2">
					<button
						class="btn btn-sm flex-1 btn-ghost text-white/60"
						onclick={() => (showSaveDialog = false)}
					>
						Cancel
					</button>
					<button class="btn btn-sm flex-1 btn-primary" onclick={handleSavePreset}>
						Save
					</button>
				</div>
			</div>
		{:else}
			<button
				class="btn btn-sm w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
				onclick={() => {
					showSaveDialog = true;
					activeTab = "custom";
				}}
			>
				<Icon icon="material-symbols:add" class="w-4 h-4" />
				Save Current as Preset
			</button>
		{/if}
	</div>
</div>
