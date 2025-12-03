<script lang="ts">
	import { scale } from "svelte/transition";
	import { elasticOut } from "svelte/easing";
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedGradient, ValidatedGradientStop } from "$lib/schemas/validation";
	import { validateGradient } from "$lib/schemas/validation";
	import pkg from "file-saver";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import chroma from "chroma-js";

	import { sortPalette, extractPalette } from "$lib/utils/color-engine";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";

	// Sub-components
	import { GradientList, GradientEditor } from "./gradients";
	import {
		GRADIENT_PRESETS,
		PRESET_CATEGORIES,
		generateCSSGradient,
		generateMoodGradient,
		generateRandomGradient,
		type PresetCategory,
		type MoodType,
		type GradientPreset,
	} from "./gradients/gradient-utils";

	const { saveAs } = pkg;

	// State management
	let newGradientName = $state("");
	let showCreateDialog = $state(false);
	let showPresetsDialog = $state(false);
	let showSmartGeneratorDialog = $state(false);
	let showImageExtractDialog = $state(false);
	let gradientType: "linear" | "radial" | "conic" = $state("linear");
	let searchTerm = $state("");
	let selectedPresetCategory = $state<PresetCategory | "all">("all");

	// Smart generator state
	let smartGeneratorSeedColor = $state("#3b82f6");
	let smartGeneratorColorCount = $state(4);
	let smartGeneratorMood = $state<MoodType>("calm");

	// Image extraction state
	let imageExtractFile: File | null = $state(null);
	let imageExtractPreview = $state("");
	let imageExtractColorCount = $state(5);
	let isExtracting = $state(false);

	// Gradient creation state
	let newGradientAngle = $state(45);

	// Filtered presets
	let filteredPresets = $derived(
		GRADIENT_PRESETS.filter((preset) => {
			const matchesSearch = preset.name.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesCategory =
				selectedPresetCategory === "all" || preset.category === selectedPresetCategory;
			return matchesSearch && matchesCategory;
		})
	);

	// Create new gradient
	function createGradient() {
		if (!newGradientName.trim()) {
			toast.error("Please enter a gradient name");
			return;
		}

		const defaultStops: ValidatedGradientStop[] = [
			{ color: "#3b82f6", position: 0 },
			{ color: "#8b5cf6", position: 100 },
		];

		const gradientData = {
			id: crypto.randomUUID(),
			name: newGradientName.trim(),
			type: gradientType,
			stops: defaultStops,
			angle: gradientType === "linear" ? newGradientAngle : 0,
			centerX: 50,
			centerY: 50,
			createdAt: new Date(),
		};

		const validation = validateGradient(gradientData);
		if (!validation.valid) {
			toast.error(`Invalid gradient: ${validation.error}`);
			return;
		}

		try {
			app.gradients.add(gradientData);
			newGradientName = "";
			showCreateDialog = false;
			toast.success("Gradient created successfully!");
		} catch (error) {
			console.error("Error creating gradient:", error);
			toast.error("Failed to create gradient");
		}
	}

	// Apply preset gradient
	function applyPreset(preset: GradientPreset) {
		const stops: ValidatedGradientStop[] = preset.colors.map((color: string, index: number) => ({
			color,
			position:
				index === 0
					? 0
					: index === preset.colors.length - 1
						? 100
						: (index / (preset.colors.length - 1)) * 100,
		}));

		try {
			app.gradients.add({
				name: preset.name,
				type: preset.type as "linear" | "radial" | "conic",
				stops,
				angle: preset.angle || 45,
				centerX: 50,
				centerY: 50,
			});

			showPresetsDialog = false;
			toast.success(`Applied "${preset.name}" preset!`);
		} catch (error) {
			console.error("Error applying preset:", error);
			toast.error("Failed to apply preset");
		}
	}

	let interpolateGradient = $state(true);

	// Generate from palette
	function generateFromPalette(paletteId: string) {
		const palette = app.palettes.palettes.find((p) => p.id === paletteId);
		if (!palette || palette.colors.length < 2) {
			toast.error("Need at least 2 colors in palette");
			return;
		}

		let colors = sortPalette(palette.colors);

		if (interpolateGradient && colors.length < 5) {
			colors = chroma.scale(colors).mode("lch").colors(5);
		}

		const stops: ValidatedGradientStop[] = colors.map((color: string, index: number) => ({
			color,
			position: (index / (colors.length - 1)) * 100,
		}));

		try {
			app.gradients.add({
				name: `${palette.name} Gradient`,
				type: "linear",
				stops,
				angle: 45,
				centerX: 50,
				centerY: 50,
			});

			toast.success(`Generated gradient from "${palette.name}"!`);
		} catch (error) {
			console.error("Error generating from palette:", error);
			toast.error("Failed to generate gradient from palette");
		}
	}

	// Smart generator functions
	function generateSmartGradient() {
		const colors = generateMoodGradient(
			smartGeneratorMood,
			smartGeneratorSeedColor,
			smartGeneratorColorCount
		);

		const stops: ValidatedGradientStop[] = colors.map((color, index) => ({
			color,
			position: (index / (colors.length - 1)) * 100,
		}));

		const moodLabel = smartGeneratorMood.charAt(0).toUpperCase() + smartGeneratorMood.slice(1);
		let gradientName = `${moodLabel} Gradient`;
		let counter = 1;
		while (app.gradients.gradients.some((g) => g.name === gradientName)) {
			gradientName = `${moodLabel} Gradient ${counter++}`;
		}

		app.gradients.add({
			name: gradientName,
			type: "linear",
			stops,
			angle: 45,
			centerX: 50,
			centerY: 50,
		});

		showSmartGeneratorDialog = false;
		toast.success(`Created "${gradientName}"!`);
	}

	function generateRandomGradientHandler() {
		const colors = generateRandomGradient(smartGeneratorColorCount);

		const stops: ValidatedGradientStop[] = colors.map((color, index) => ({
			color,
			position: (index / (colors.length - 1)) * 100,
		}));

		let gradientName = "Random Gradient";
		let counter = 1;
		while (app.gradients.gradients.some((g) => g.name === gradientName)) {
			gradientName = `Random Gradient ${counter++}`;
		}

		app.gradients.add({
			name: gradientName,
			type: "linear",
			stops,
			angle: Math.floor(Math.random() * 360),
			centerX: 50,
			centerY: 50,
		});

		showSmartGeneratorDialog = false;
		toast.success(`Created "${gradientName}"!`);
	}

	// Image extraction functions
	function handleImageSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file");
			return;
		}

		imageExtractFile = file;
		imageExtractPreview = URL.createObjectURL(file);
	}

	async function extractColorsFromImage() {
		if (!imageExtractFile || !imageExtractPreview) {
			toast.error("Please select an image first");
			return;
		}

		isExtracting = true;

		try {
			const colors = await extractPalette(imageExtractPreview, {
				colorCount: imageExtractColorCount,
				quality: "balanced",
			});

			// Sort colors for better gradient flow
			const sortedColors = sortPalette(colors);

			const stops: ValidatedGradientStop[] = sortedColors.map((color, index) => ({
				color,
				position: (index / (sortedColors.length - 1)) * 100,
			}));

			const baseName = imageExtractFile.name.replace(/\.[^/.]+$/, "");
			let gradientName = `${baseName} Gradient`;
			let counter = 1;
			while (app.gradients.gradients.some((g) => g.name === gradientName)) {
				gradientName = `${baseName} Gradient ${counter++}`;
			}

			app.gradients.add({
				name: gradientName,
				type: "linear",
				stops,
				angle: 45,
				centerX: 50,
				centerY: 50,
			});

			// Cleanup
			URL.revokeObjectURL(imageExtractPreview);
			imageExtractFile = null;
			imageExtractPreview = "";
			showImageExtractDialog = false;

			toast.success(`Created "${gradientName}" from image!`);
		} catch (error) {
			console.error("Error extracting colors:", error);
			toast.error("Failed to extract colors from image");
		} finally {
			isExtracting = false;
		}
	}

	function closeImageExtractDialog() {
		if (imageExtractPreview) {
			URL.revokeObjectURL(imageExtractPreview);
		}
		imageExtractFile = null;
		imageExtractPreview = "";
		showImageExtractDialog = false;
	}
</script>

<div class="h-full flex flex-col gap-4">
	<!-- Module Header -->
	<GlassPanel
		class="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 gap-4 shrink-0 overflow-visible z-20"
		intensity="low"
	>
		<div>
			<h2 class="text-xl md:text-2xl font-bold text-white flex items-center gap-2 tracking-wide">
				<Icon icon="material-symbols:gradient" class="w-6 h-6 text-phoenix-primary" />
				Gradient Studio
			</h2>
			<p class="text-sm text-text-muted mt-1">
				Create beautiful gradients with advanced controls and mesh support
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2 md:gap-3">
			<!-- Search -->
			<div class="relative">
				<input
					bind:value={searchTerm}
					type="text"
					placeholder="Search gradients..."
					class="input input-sm bg-black/20 border-white/10 text-white placeholder:text-text-muted/50 w-40 md:w-48 pl-8 focus:border-phoenix-primary focus:outline-none transition-colors"
				/>
				<Icon
					icon="material-symbols:search"
					class="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted"
				/>
			</div>

			<!-- Action Buttons -->
			<button
				class="btn btn-sm border-none bg-linear-to-r from-phoenix-primary to-phoenix-violet text-white shadow-lg hover:shadow-phoenix-primary/50 hover:scale-105 transition-all duration-300 gap-2"
				onclick={() => (showCreateDialog = true)}
				type="button"
			>
				<Icon icon="material-symbols:add" class="w-4 h-4" />
				<span class="hidden sm:inline">New</span>
			</button>

			<button
				class="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 gap-2"
				onclick={() => (showPresetsDialog = true)}
				type="button"
			>
				<Icon icon="material-symbols:auto-awesome" class="w-4 h-4" />
				<span class="hidden sm:inline">Presets</span>
			</button>

			<button
				class="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 gap-2"
				onclick={() => (showSmartGeneratorDialog = true)}
				type="button"
			>
				<Icon icon="material-symbols:magic-button" class="w-4 h-4" />
				<span class="hidden sm:inline">Generate</span>
			</button>

			<button
				class="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 gap-2"
				onclick={() => (showImageExtractDialog = true)}
				type="button"
			>
				<Icon icon="material-symbols:image" class="w-4 h-4" />
				<span class="hidden sm:inline">From Image</span>
			</button>

			{#if app.palettes.palettes.length > 0}
				<div class="dropdown dropdown-end">
					<button
						class="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 gap-2"
						type="button"
						tabindex="0"
					>
						<Icon icon="material-symbols:palette" class="w-4 h-4" />
						<span class="hidden sm:inline">From Palette</span>
					</button>
					<ul
						class="dropdown-content menu bg-void-deep border border-white/10 rounded-xl z-100 w-64 p-2 shadow-xl max-h-64 overflow-y-auto backdrop-blur-xl"
					>
						<div class="p-2 border-b border-white/10 mb-2">
							<label class="label cursor-pointer justify-start gap-2 p-0">
								<input
									type="checkbox"
									class="checkbox checkbox-xs checkbox-primary"
									bind:checked={interpolateGradient}
								/>
								<span class="label-text text-xs text-white">Smooth Interpolation</span>
							</label>
						</div>
						{#each app.palettes.palettes as palette (palette.id)}
							<li>
								<button
									onclick={() => generateFromPalette(palette.id)}
									type="button"
									class="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-colors"
									disabled={palette.colors.length < 2}
								>
									<div class="flex gap-1">
										{#each palette.colors.slice(0, 4) as color}
											<div
												class="w-3 h-3 rounded-full border border-white/10"
												style:background-color={color}
											></div>
										{/each}
									</div>
									<div class="flex-1 text-left min-w-0">
										<p class="text-sm font-medium truncate">{palette.name}</p>
										<p class="text-[10px] text-text-muted/60">{palette.colors.length} colors</p>
									</div>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</GlassPanel>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
		<!-- Gradients Sidebar -->
		<GradientList {searchTerm} onCreateNew={() => (showCreateDialog = true)} />

		<!-- Gradient Editor -->
		<GradientEditor onCreateNew={() => (showCreateDialog = true)} />
	</div>
</div>

<!-- Create Gradient Dialog -->
{#if showCreateDialog}
	<div
		class="fixed inset-0 modal-backdrop-blur flex items-center justify-center z-50 p-4"
		onclick={(e) => e.target === e.currentTarget && (showCreateDialog = false)}
		onkeydown={(e) => e.key === "Escape" && (showCreateDialog = false)}
		role="dialog"
		tabindex="-1"
	>
		<div
			in:scale={{ duration: 400, start: 0.9, easing: elasticOut }}
			class="bg-base-100/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10 modal-enter"
		>
			<h3 class="font-bold text-lg mb-4">Create New Gradient</h3>

			<div class="space-y-4">
				<div>
					<label class="label" for="gradient-name-input">
						<span class="label-text">Gradient Name</span>
					</label>
					<input
						id="gradient-name-input"
						bind:value={newGradientName}
						type="text"
						placeholder="Enter gradient name..."
						class="input input-bordered w-full"
						onkeydown={(e) => e.key === "Enter" && createGradient()}
					/>
				</div>

				<div>
					<label class="label" for="gradient-type-select">
						<span class="label-text">Gradient Type</span>
					</label>
					<div class="join w-full">
						{#each ["linear", "radial", "conic"] as type}
							<button
								class="btn join-item flex-1"
								class:btn-primary={gradientType === type}
								class:btn-outline={gradientType !== type}
								onclick={() => (gradientType = type as "linear" | "radial" | "conic")}
							>
								{type}
							</button>
						{/each}
					</div>
				</div>

				{#if gradientType === "linear"}
					<div>
						<label class="label" for="gradient-angle">
							<span class="label-text">Initial Angle: {newGradientAngle}°</span>
						</label>
						<input
							id="gradient-angle"
							type="range"
							min="0"
							max="360"
							bind:value={newGradientAngle}
							class="range range-primary"
						/>
					</div>
				{/if}
			</div>

			<div class="flex items-center justify-end gap-3 mt-6">
				<button class="btn btn-ghost" onclick={() => (showCreateDialog = false)}>Cancel</button>
				<button class="btn btn-primary" onclick={createGradient} disabled={!newGradientName.trim()}>
					Create Gradient
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Presets Dialog -->
{#if showPresetsDialog}
	<div
		class="fixed inset-0 modal-backdrop-blur flex items-center justify-center z-50 p-4"
		onclick={(e) => e.target === e.currentTarget && (showPresetsDialog = false)}
		onkeydown={(e) => e.key === "Escape" && (showPresetsDialog = false)}
		role="dialog"
		tabindex="-1"
	>
		<div
			in:scale={{ duration: 400, start: 0.9, easing: elasticOut }}
			class="bg-base-100/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-4xl shadow-2xl border border-white/10 modal-enter max-h-[90vh] overflow-hidden flex flex-col"
		>
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-bold text-lg">Gradient Presets</h3>
				<button class="btn btn-sm btn-circle btn-ghost" onclick={() => (showPresetsDialog = false)}>
					<Icon icon="material-symbols:close" class="w-4 h-4" />
				</button>
			</div>

			<!-- Categories -->
			<div class="flex flex-wrap gap-2 mb-4">
				<button
					class={cn("btn btn-sm", selectedPresetCategory === "all" ? "btn-primary" : "btn-outline")}
					onclick={() => (selectedPresetCategory = "all")}
				>
					<Icon icon="material-symbols:grid-view" class="w-4 h-4" />
					All
				</button>
				{#each PRESET_CATEGORIES as category}
					<button
						class={cn(
							"btn btn-sm",
							selectedPresetCategory === category.id ? "btn-primary" : "btn-outline"
						)}
						onclick={() => (selectedPresetCategory = category.id)}
					>
						<Icon icon={category.icon} class="w-4 h-4" />
						{category.name}
					</button>
				{/each}
			</div>

			<!-- Presets Grid -->
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
				{#each filteredPresets as preset}
					<button
						class="card bg-base-100 border cursor-pointer hover:shadow-md transition-all hover:border-phoenix-primary/50 group"
						onclick={() => applyPreset(preset)}
					>
						<div class="card-body p-3">
							<div
								class="h-16 rounded border border-base-300 mb-2 group-hover:scale-105 transition-transform"
								style:background={`linear-gradient(45deg in oklch, ${preset.colors.join(", ")})`}
							></div>
							<h4 class="font-medium text-sm">{preset.name}</h4>
							<p class="text-xs text-base-content/60 capitalize">{preset.type}</p>
						</div>
					</button>
				{/each}
			</div>

			<div class="flex justify-end mt-4 pt-4 border-t border-white/5">
				<button class="btn btn-ghost" onclick={() => (showPresetsDialog = false)}>Close</button>
			</div>
		</div>
	</div>
{/if}

<!-- Smart Generator Dialog -->
{#if showSmartGeneratorDialog}
	<div
		class="fixed inset-0 modal-backdrop-blur flex items-center justify-center z-50 p-4"
		onclick={(e) => e.target === e.currentTarget && (showSmartGeneratorDialog = false)}
		onkeydown={(e) => e.key === "Escape" && (showSmartGeneratorDialog = false)}
		role="dialog"
		tabindex="-1"
	>
		<div
			in:scale={{ duration: 400, start: 0.9, easing: elasticOut }}
			class="bg-base-100/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10 modal-enter"
		>
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-bold text-lg flex items-center gap-2">
					<Icon icon="material-symbols:magic-button" class="w-5 h-5 text-phoenix-primary" />
					Smart Generator
				</h3>
				<button
					class="btn btn-sm btn-circle btn-ghost"
					onclick={() => (showSmartGeneratorDialog = false)}
				>
					<Icon icon="material-symbols:close" class="w-4 h-4" />
				</button>
			</div>

			<div class="space-y-4">
				<!-- Seed Color -->
				<div>
					<label class="label" for="seed-color">
						<span class="label-text">Seed Color</span>
					</label>
					<div class="flex gap-2">
						<input
							type="color"
							bind:value={smartGeneratorSeedColor}
							class="w-12 h-10 rounded cursor-pointer"
						/>
						<input
							type="text"
							bind:value={smartGeneratorSeedColor}
							class="input input-bordered flex-1 font-mono"
						/>
					</div>
				</div>

				<!-- Color Count -->
				<div>
					<label class="label" for="color-count">
						<span class="label-text">Number of Colors: {smartGeneratorColorCount}</span>
					</label>
					<input
						type="range"
						min="2"
						max="8"
						bind:value={smartGeneratorColorCount}
						class="range range-primary"
					/>
				</div>

				<!-- Mood Selection -->
				<div>
					<label class="label" for="mood-select">
						<span class="label-text">Mood</span>
					</label>
					<div class="grid grid-cols-3 gap-2">
						{#each [{ id: "calm", label: "Calm", icon: "material-symbols:spa" }, { id: "energetic", label: "Energetic", icon: "material-symbols:bolt" }, { id: "corporate", label: "Corporate", icon: "material-symbols:business" }, { id: "playful", label: "Playful", icon: "material-symbols:celebration" }, { id: "luxury", label: "Luxury", icon: "material-symbols:diamond" }, { id: "natural", label: "Natural", icon: "material-symbols:eco" }] as mood}
							<button
								class={cn(
									"btn btn-sm gap-1",
									smartGeneratorMood === mood.id ? "btn-primary" : "btn-outline"
								)}
								onclick={() => (smartGeneratorMood = mood.id as MoodType)}
							>
								<Icon icon={mood.icon} class="w-4 h-4" />
								{mood.label}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/5">
				<button class="btn btn-ghost" onclick={() => (showSmartGeneratorDialog = false)}>
					Cancel
				</button>
				<button class="btn btn-outline gap-2" onclick={generateRandomGradientHandler}>
					<Icon icon="material-symbols:casino" class="w-4 h-4" />
					Random
				</button>
				<button class="btn btn-primary gap-2" onclick={generateSmartGradient}>
					<Icon icon="material-symbols:auto-awesome" class="w-4 h-4" />
					Generate
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Image Extract Dialog -->
{#if showImageExtractDialog}
	<div
		class="fixed inset-0 modal-backdrop-blur flex items-center justify-center z-50 p-4"
		onclick={(e) => e.target === e.currentTarget && closeImageExtractDialog()}
		onkeydown={(e) => e.key === "Escape" && closeImageExtractDialog()}
		role="dialog"
		tabindex="-1"
	>
		<div
			in:scale={{ duration: 400, start: 0.9, easing: elasticOut }}
			class="bg-base-100/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10 modal-enter"
		>
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-bold text-lg flex items-center gap-2">
					<Icon icon="material-symbols:image" class="w-5 h-5 text-phoenix-primary" />
					Extract from Image
				</h3>
				<button class="btn btn-sm btn-circle btn-ghost" onclick={closeImageExtractDialog}>
					<Icon icon="material-symbols:close" class="w-4 h-4" />
				</button>
			</div>

			<div class="space-y-4">
				<!-- Image Upload -->
				{#if !imageExtractPreview}
					<label
						class="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-base-300 rounded-lg cursor-pointer hover:border-phoenix-primary/50 transition-colors"
					>
						<div class="flex flex-col items-center justify-center pt-5 pb-6">
							<Icon
								icon="material-symbols:cloud-upload"
								class="w-10 h-10 text-base-content/40 mb-2"
							/>
							<p class="text-sm text-base-content/60">Click to upload an image</p>
							<p class="text-xs text-base-content/40">PNG, JPG, WebP</p>
						</div>
						<input type="file" class="hidden" accept="image/*" onchange={handleImageSelect} />
					</label>
				{:else}
					<div class="relative">
						<img
							src={imageExtractPreview}
							alt="Preview"
							class="w-full h-48 object-cover rounded-lg"
						/>
						<button
							class="btn btn-sm btn-circle btn-error absolute top-2 right-2"
							onclick={() => {
								URL.revokeObjectURL(imageExtractPreview);
								imageExtractFile = null;
								imageExtractPreview = "";
							}}
						>
							<Icon icon="material-symbols:close" class="w-4 h-4" />
						</button>
					</div>
				{/if}

				<!-- Color Count -->
				<div>
					<label class="label" for="extract-color-count">
						<span class="label-text">Number of Colors: {imageExtractColorCount}</span>
					</label>
					<input
						type="range"
						min="2"
						max="10"
						bind:value={imageExtractColorCount}
						class="range range-primary"
					/>
				</div>
			</div>

			<div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/5">
				<button class="btn btn-ghost" onclick={closeImageExtractDialog}>Cancel</button>
				<button
					class="btn btn-primary gap-2"
					onclick={extractColorsFromImage}
					disabled={!imageExtractPreview || isExtracting}
				>
					{#if isExtracting}
						<span class="loading loading-spinner loading-sm"></span>
						Extracting...
					{:else}
						<Icon icon="material-symbols:colorize" class="w-4 h-4" />
						Extract Colors
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
