<script lang="ts">
	import { scale } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedGradient, ValidatedGradientStop } from "$lib/schemas/validation";
	import { validateGradient } from "$lib/schemas/validation";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";

	import { sortPalette } from "$lib/utils/color-engine";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";

	// New Components
	import GradientLibrary from "./gradients/GradientLibrary.svelte";
	import GradientForge from "./gradients/GradientForge.svelte";
	import GradientProperties from "./gradients/GradientProperties.svelte";

	import {
		GRADIENT_PRESETS,
		generateMoodGradient,
		generateRandomGradient,
		type MoodType,
		type GradientPreset,
		type InterpolationMode,
		type MeshPoint,
		generateDefaultMeshPoints,
		generateMeshPointsFromColors,
		generateCSSGradient,
		generateTailwindGradient,
		generateCSSVariables,
		gradientToSVG,
	} from "./gradients/gradient-utils";
	import pkg from "file-saver";
	const { saveAs } = pkg;

	// Lazy load heavy dependencies only when needed
	async function getChroma() {
		const { default: chroma } = await import("chroma-js");
		return chroma;
	}

	async function getExtractPalette() {
		const { extractPalette } = await import("$lib/utils/color-engine");
		return extractPalette;
	}

	// State management
	let newGradientName = $state("");
	let showCreateDialog = $state(false);
	let showSmartGeneratorDialog = $state(false);
	let showImageExtractDialog = $state(false);
	let showPalettePickerDialog = $state(false);
	let showExportDialog = $state(false);

	// Editor State
	let interpolationMode = $state<InterpolationMode>("oklch");
	let isMeshMode = $state(false);
	let meshPoints = $state<MeshPoint[]>([]);
	let searchTerm = $state("");
	let exportFormat = $state<"css" | "tailwind" | "variables" | "png" | "svg" | "json">("css");

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
	let gradientType = $state<"linear" | "radial" | "conic">("linear");

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

	// Handlers for Forge actions
	function handleStopPositionChange(index: number, position: number) {
		if (app.gradients.activeGradient) {
			const stops = [...app.gradients.activeGradient.stops];
			if (stops[index]) stops[index].position = position;
			// stops.sort((a, b) => a.position - b.position); // Optional: auto-sort
			app.gradients.update(app.gradients.activeGradient.id, { stops });
		}
	}

	function handleAngleChange(angle: number) {
		if (app.gradients.activeGradient) {
			app.gradients.update(app.gradients.activeGradient.id, { angle });
		}
	}

	function handleCenterChange(x: number, y: number) {
		if (app.gradients.activeGradient) {
			app.gradients.update(app.gradients.activeGradient.id, { centerX: x, centerY: y });
		}
	}

	function handleModeChange(mode: "linear" | "radial" | "conic") {
		if (app.gradients.activeGradient) {
			app.gradients.update(app.gradients.activeGradient.id, { type: mode });
		}
	}

	// Mesh Handlers
	function handleMeshPointMove(id: string, x: number, y: number) {
		meshPoints = meshPoints.map((p) => (p.id === id ? { ...p, x, y } : p));
	}

	function handleMeshPointAdd(x: number, y: number, color: string) {
		const newPoint: MeshPoint = {
			id: crypto.randomUUID(),
			x,
			y,
			color,
			radius: 50,
		};
		meshPoints = [...meshPoints, newPoint];
	}

	function handleMeshPointRemove(id: string) {
		meshPoints = meshPoints.filter((p) => p.id !== id);
	}

	function handleMeshPointColorChange(id: string, color: string) {
		meshPoints = meshPoints.map((p) => (p.id === id ? { ...p, color } : p));
	}

	function handleMeshPointRadiusChange(id: string, radius: number) {
		meshPoints = meshPoints.map((p) => (p.id === id ? { ...p, radius } : p));
	}

	function handleDeleteGradient() {
		const gradient = app.gradients.activeGradient;
		if (gradient && confirm(`Delete "${gradient.name}"?`)) {
			app.gradients.remove(gradient.id);
			toast.info("Gradient deleted");
		}
	}

	// Smart generator
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

	// Image Extraction
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
			const extractPalette = await getExtractPalette();
			const colors = await extractPalette(imageExtractPreview, {
				colorCount: imageExtractColorCount,
				quality: "balanced",
			});
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

	// Export Logic
	async function handleExport() {
		const gradient = app.gradients.activeGradient;
		if (!gradient && !isMeshMode) {
			toast.error("No gradient selected");
			return;
		}

		try {
			switch (exportFormat) {
				case "css": {
					// Mesh CSS generation logic needed here if expanding mesh mode support
					const css = `background: ${generateCSSGradient(gradient ?? null, interpolationMode)};`;
					await navigator.clipboard.writeText(css);
					toast.success("CSS copied to clipboard!");
					break;
				}
				case "tailwind": {
					if (!gradient) return;
					const tailwind = generateTailwindGradient(gradient);
					await navigator.clipboard.writeText(tailwind);
					toast.success("Tailwind classes copied!");
					break;
				}
				case "variables": {
					if (!gradient) return;
					const vars = generateCSSVariables(gradient);
					await navigator.clipboard.writeText(vars);
					toast.success("CSS Variables copied!");
					break;
				}
				case "json": {
					if (!gradient) return;
					const json = JSON.stringify(gradient, null, 2);
					const blob = new Blob([json], { type: "application/json;charset=utf-8" });
					saveAs(blob, `${gradient.name}.json`);
					toast.success("JSON file saved!");
					break;
				}
				// PNG/SVG Export would need canvas rendering logic similar to GradientEditor
			}
			showExportDialog = false;
		} catch (error) {
			console.error("Export error:", error);
			toast.error("Export failed");
		}
	}
</script>

<div class="h-full w-full flex gap-4 p-4 overflow-hidden">
	<!-- Left: Library & Generation -->
	<div class="w-[240px] shrink-0">
		<GradientLibrary
			bind:searchTerm
			onCreateNew={() => (showCreateDialog = true)}
			onGenerate={() => (showSmartGeneratorDialog = true)}
			onFromImage={() => (showImageExtractDialog = true)}
			onFromPalette={() => (showPalettePickerDialog = true)}
		/>
	</div>

	<!-- Center: Forge Canvas -->
	<GradientForge
		{interpolationMode}
		{isMeshMode}
		{meshPoints}
		onMeshModeToggle={(enabled: boolean) => (isMeshMode = enabled)}
		onMeshPointMove={handleMeshPointMove}
		onMeshPointAdd={handleMeshPointAdd}
		onMeshPointRemove={handleMeshPointRemove}
		onMeshPointColorChange={handleMeshPointColorChange}
		onMeshPointRadiusChange={handleMeshPointRadiusChange}
		onStopPositionChange={handleStopPositionChange}
		onAngleChange={handleAngleChange}
		onCenterChange={handleCenterChange}
		onModeChange={handleModeChange}
		onMeshPointsInit={(points: MeshPoint[]) => (meshPoints = points)}
	/>

	<!-- Right: Properties -->
	<div class="w-[300px] shrink-0">
		<GradientProperties
			{interpolationMode}
			onInterpolationModeChange={(mode: InterpolationMode) => (interpolationMode = mode)}
			onExport={() => (showExportDialog = true)}
			onDelete={handleDeleteGradient}
		/>
	</div>
</div>

<!-- Dialogs (kept from original implementation) -->

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
			in:scale={{ duration: 200, start: 0.95, easing: cubicOut }}
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
			in:scale={{ duration: 200, start: 0.95, easing: cubicOut }}
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
				<button class="btn btn-ghost" onclick={() => (showSmartGeneratorDialog = false)}
					>Cancel</button
				>
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
		onclick={(e) => e.target === e.currentTarget && (showImageExtractDialog = false)}
		onkeydown={(e) => e.key === "Escape" && (showImageExtractDialog = false)}
		role="dialog"
		tabindex="-1"
	>
		<div
			in:scale={{ duration: 200, start: 0.95, easing: cubicOut }}
			class="bg-base-100/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10 modal-enter"
		>
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-bold text-lg flex items-center gap-2">
					<Icon icon="material-symbols:image" class="w-5 h-5 text-phoenix-primary" />
					Extract from Image
				</h3>
				<button
					class="btn btn-sm btn-circle btn-ghost"
					onclick={() => (showImageExtractDialog = false)}
				>
					<Icon icon="material-symbols:close" class="w-4 h-4" />
				</button>
			</div>
			<div class="space-y-4">
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
				<button class="btn btn-ghost" onclick={() => (showImageExtractDialog = false)}
					>Cancel</button
				>
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

<!-- Export Dialog -->
{#if showExportDialog}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		role="dialog"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) showExportDialog = false;
		}}
		onkeydown={(e) => {
			if (e.key === "Escape") showExportDialog = false;
		}}
	>
		<div class="bg-base-100 rounded-xl p-6 w-96 shadow-xl">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-bold">Export Gradient</h3>
				<button class="btn btn-sm btn-circle btn-ghost" onclick={() => (showExportDialog = false)}>
					<Icon icon="material-symbols:close" class="w-4 h-4" />
				</button>
			</div>
			<div class="space-y-3 mb-6">
				{#each [{ id: "css", label: "CSS", icon: "material-symbols:code", desc: "Copy CSS background property" }, { id: "tailwind", label: "Tailwind CSS", icon: "simple-icons:tailwindcss", desc: "Copy Tailwind gradient classes" }, { id: "variables", label: "CSS Variables", icon: "material-symbols:variable-add", desc: "Export as CSS custom properties" }, { id: "json", label: "JSON", icon: "material-symbols:data-object", desc: "Download gradient data" }] as option}
					<button
						class={cn(
							"w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3",
							exportFormat === option.id
								? "bg-phoenix-primary/20 border-phoenix-primary"
								: "bg-base-200 border-base-300 hover:border-phoenix-primary/50"
						)}
						onclick={() => (exportFormat = option.id as typeof exportFormat)}
					>
						<Icon icon={option.icon} class="w-5 h-5 text-phoenix-primary" />
						<div>
							<div class="font-medium">{option.label}</div>
							<div class="text-xs text-base-content/60">{option.desc}</div>
						</div>
					</button>
				{/each}
			</div>
			<div class="flex justify-end gap-2">
				<button class="btn btn-ghost" onclick={() => (showExportDialog = false)}>Cancel</button>
				<button class="btn btn-primary" onclick={handleExport}>
					<Icon icon="material-symbols:download" class="w-4 h-4" />
					Export
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Palette Picker Dialog -->
{#if showPalettePickerDialog}
	<div
		class="fixed inset-0 modal-backdrop-blur flex items-center justify-center z-50 p-4"
		onclick={(e) => e.target === e.currentTarget && (showPalettePickerDialog = false)}
		onkeydown={(e) => e.key === "Escape" && (showPalettePickerDialog = false)}
		role="dialog"
		tabindex="-1"
	>
		<div
			in:scale={{ duration: 200, start: 0.95, easing: cubicOut }}
			class="bg-base-100/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-white/10"
		>
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-bold text-lg">Create Gradient from Palette</h3>
				<button
					class="btn btn-sm btn-circle btn-ghost"
					onclick={() => (showPalettePickerDialog = false)}
				>
					<Icon icon="material-symbols:close" class="w-4 h-4" />
				</button>
			</div>

			{#if app.palettes.palettes.length === 0}
				<div class="text-center py-8 text-text-muted">
					<Icon icon="material-symbols:palette-outline" class="w-12 h-12 mx-auto mb-3 opacity-50" />
					<p>No palettes available</p>
					<p class="text-sm mt-1">Create palettes in the Palettes module first</p>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto custom-scrollbar">
					{#each app.palettes.palettes as palette (palette.id)}
						<button
							class="p-3 rounded-xl bg-black/20 border border-white/10 hover:border-phoenix-primary/50 transition-all text-left group"
							onclick={() => {
								// Create gradient from palette colors
								const stops = palette.colors.map((color, i) => ({
									color,
									position: (i / Math.max(1, palette.colors.length - 1)) * 100,
								}));

								const gradientData = {
									id: crypto.randomUUID(), // Temp ID for validation
									createdAt: new Date(), // Temp date for validation
									name: `From ${palette.name}`,
									type: gradientType,
									stops,
									angle: 90,
								};

								const validation = validateGradient(gradientData);

								if (validation.valid && validation.data) {
									// Destructure to remove id/createdAt naturally or just pass props
									const { id, createdAt, ...rest } = validation.data;
									app.gradients.add(rest);
									toast.success(`Created gradient from "${palette.name}"`);
									showPalettePickerDialog = false;
								} else {
									toast.error(`Failed to create gradient: ${validation.error}`);
								}
							}}
						>
							<div
								class="text-sm font-medium mb-2 truncate group-hover:text-white transition-colors"
							>
								{palette.name}
							</div>
							<div class="flex gap-1 h-6">
								{#each palette.colors.slice(0, 6) as color}
									<div class="flex-1 rounded" style:background-color={color}></div>
								{/each}
								{#if palette.colors.length > 6}
									<div
										class="flex-1 rounded bg-white/10 flex items-center justify-center text-[10px] text-text-muted"
									>
										+{palette.colors.length - 6}
									</div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}

			<div class="flex justify-end mt-4">
				<button class="btn btn-ghost" onclick={() => (showPalettePickerDialog = false)}
					>Close</button
				>
			</div>
		</div>
	</div>
{/if}
