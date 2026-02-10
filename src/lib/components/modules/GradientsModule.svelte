<script lang="ts">
	import { scale } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedGradientStop } from "$lib/schemas/validation";
	import { validateGradient } from "$lib/schemas/validation";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";

	import GradientLibrary from "./gradients/GradientLibrary.svelte";
	import GradientForge from "./gradients/GradientForge.svelte";
	import GradientProperties from "./gradients/GradientProperties.svelte";

	import CreateGradientDialog from "./gradients/dialogs/CreateGradientDialog.svelte";
	import SmartGeneratorDialog from "./gradients/dialogs/SmartGeneratorDialog.svelte";
	import ImageExtractDialog from "./gradients/dialogs/ImageExtractDialog.svelte";
	import ExportDialog from "./gradients/dialogs/ExportDialog.svelte";

	import type { InterpolationMode, GradientPreset } from "./gradients/gradient-utils";

	// Dialog visibility
	let showCreateDialog = $state(false);
	let showSmartGeneratorDialog = $state(false);
	let showImageExtractDialog = $state(false);
	let showPalettePickerDialog = $state(false);
	let showExportDialog = $state(false);

	// Editor state
	let interpolationMode = $state<InterpolationMode>("oklch");
	let searchTerm = $state("");

	// Mobile view management (follows PalettesModule pattern)
	type MobileView = "library" | "editor" | "properties";
	let mobileView = $state<MobileView>("library");

	// Handlers
	function handleStopPositionChange(index: number, position: number) {
		const gradient = app.gradients.activeGradient;
		if (!gradient) return;
		const stops = [...gradient.stops];
		if (stops[index]) stops[index].position = position;
		app.gradients.update(gradient.id, { stops });
	}

	function handleAngleChange(angle: number) {
		const gradient = app.gradients.activeGradient;
		if (gradient) app.gradients.update(gradient.id, { angle });
	}

	function handleCenterChange(x: number, y: number) {
		const gradient = app.gradients.activeGradient;
		if (gradient) app.gradients.update(gradient.id, { centerX: x, centerY: y });
	}

	function handleDeleteGradient() {
		const gradient = app.gradients.activeGradient;
		if (gradient && confirm(`Delete "${gradient.name}"?`)) {
			app.gradients.remove(gradient.id);
			toast.info("Gradient deleted");
			mobileView = "library";
		}
	}

	function handleGradientSelect() {
		mobileView = "editor";
	}

	function addGradientFromStops(stops: ValidatedGradientStop[], name: string) {
		let uniqueName = name;
		let counter = 1;
		while (app.gradients.gradients.some((g) => g.name === uniqueName)) {
			uniqueName = `${name} ${counter++}`;
		}

		app.gradients.add({
			name: uniqueName,
			type: "linear",
			stops,
			angle: 45,
			centerX: 50,
			centerY: 50,
		});
		toast.success(`Created "${uniqueName}"!`);
	}

	function handleCreateGradient(data: { name: string; type: "linear" | "radial" | "conic"; angle: number }) {
		const defaultStops: ValidatedGradientStop[] = [
			{ color: "#3b82f6", position: 0 },
			{ color: "#8b5cf6", position: 100 },
		];

		const gradientData = {
			id: crypto.randomUUID(),
			name: data.name,
			type: data.type,
			stops: defaultStops,
			angle: data.type === "linear" ? data.angle : 0,
			centerX: 50,
			centerY: 50,
			createdAt: new Date(),
		};

		const validation = validateGradient(gradientData);
		if (!validation.valid) {
			toast.error(`Invalid gradient: ${validation.error}`);
			return;
		}

		app.gradients.add(gradientData);
		showCreateDialog = false;
		toast.success("Gradient created!");
		mobileView = "editor";
	}

	function handleApplyPreset(preset: GradientPreset) {
		const stops: ValidatedGradientStop[] = preset.colors.map((color, i) => ({
			color,
			position: (i / (preset.colors.length - 1)) * 100,
		}));

		let uniqueName = preset.name;
		let counter = 1;
		while (app.gradients.gradients.some((g) => g.name === uniqueName)) {
			uniqueName = `${preset.name} ${counter++}`;
		}

		app.gradients.add({
			name: uniqueName,
			type: preset.type === "mesh" ? "linear" : preset.type,
			stops,
			angle: preset.angle ?? 45,
			centerX: 50,
			centerY: 50,
		});
		toast.success(`Applied "${preset.name}" preset!`);
		mobileView = "editor";
	}

	function handlePaletteSelect(palette: { name: string; colors: string[] }) {
		const stops: ValidatedGradientStop[] = palette.colors.map((color, i) => ({
			color,
			position: (i / Math.max(1, palette.colors.length - 1)) * 100,
		}));

		app.gradients.add({
			name: `From ${palette.name}`,
			type: "linear",
			stops,
			angle: 90,
			centerX: 50,
			centerY: 50,
		});
		toast.success(`Created gradient from "${palette.name}"`);
		showPalettePickerDialog = false;
		mobileView = "editor";
	}

	// Shared library props
	const libraryProps = $derived({
		searchTerm,
		onCreateNew: () => (showCreateDialog = true),
		onGenerate: () => (showSmartGeneratorDialog = true),
		onFromImage: () => (showImageExtractDialog = true),
		onFromPalette: () => (showPalettePickerDialog = true),
		onApplyPreset: handleApplyPreset,
		onSelect: handleGradientSelect,
	});

	const forgeProps = $derived({
		interpolationMode,
		onStopPositionChange: handleStopPositionChange,
		onAngleChange: handleAngleChange,
		onCenterChange: handleCenterChange,
	});

	const propertiesProps = $derived({
		interpolationMode,
		onInterpolationModeChange: (mode: InterpolationMode) => (interpolationMode = mode),
		onExport: () => (showExportDialog = true),
		onDelete: handleDeleteGradient,
	});
</script>

<div class="h-full w-full p-4 overflow-hidden @container">
	<!-- DESKTOP LAYOUT -->
	<div class="hidden @lg:flex h-full w-full gap-4">
		<div class="w-[240px] shrink-0">
			<GradientLibrary
				bind:searchTerm
				onCreateNew={libraryProps.onCreateNew}
				onGenerate={libraryProps.onGenerate}
				onFromImage={libraryProps.onFromImage}
				onFromPalette={libraryProps.onFromPalette}
				onApplyPreset={libraryProps.onApplyPreset}
			/>
		</div>

		<GradientForge
			{interpolationMode}
			onStopPositionChange={forgeProps.onStopPositionChange}
			onAngleChange={forgeProps.onAngleChange}
			onCenterChange={forgeProps.onCenterChange}
		/>

		<div class="w-[300px] shrink-0">
			<GradientProperties
				{interpolationMode}
				onInterpolationModeChange={propertiesProps.onInterpolationModeChange}
				onExport={propertiesProps.onExport}
				onDelete={propertiesProps.onDelete}
			/>
		</div>
	</div>

	<!-- MOBILE LAYOUT -->
	<div class="@lg:hidden h-full w-full flex flex-col">
		<!-- Mobile Navigation Header -->
		{#if mobileView !== "library"}
			<div class="flex items-center justify-between px-2 pb-3 shrink-0">
				<button
					class="btn btn-ghost btn-sm btn-square"
					onclick={() => (mobileView = "library")}
				>
					<Icon icon="lucide:arrow-left" class="w-4 h-4" />
				</button>
				<span class="text-sm font-medium text-white truncate max-w-[60%]">
					{app.gradients.activeGradient?.name || "Editor"}
				</span>
				<button
					class="btn btn-ghost btn-sm btn-square {mobileView === 'properties' ? 'bg-white/10' : ''}"
					onclick={() => (mobileView = mobileView === "properties" ? "editor" : "properties")}
				>
					<Icon icon="lucide:settings-2" class="w-4 h-4" />
				</button>
			</div>
		{/if}

		<!-- Mobile Views (toggled with class:hidden to preserve state) -->
		<div class="flex-1 min-h-0 overflow-hidden">
			<div class="{mobileView === 'library' ? 'block' : 'hidden'} h-full overflow-y-auto">
				<GradientLibrary
					bind:searchTerm
					onCreateNew={libraryProps.onCreateNew}
					onGenerate={libraryProps.onGenerate}
					onFromImage={libraryProps.onFromImage}
					onFromPalette={libraryProps.onFromPalette}
					onApplyPreset={libraryProps.onApplyPreset}
					onSelect={libraryProps.onSelect}
				/>
			</div>

			<div class="{mobileView === 'editor' ? 'block' : 'hidden'} h-full">
				<GradientForge
					{interpolationMode}
					onStopPositionChange={forgeProps.onStopPositionChange}
					onAngleChange={forgeProps.onAngleChange}
					onCenterChange={forgeProps.onCenterChange}
				/>
			</div>

			<div class="{mobileView === 'properties' ? 'block' : 'hidden'} h-full overflow-y-auto p-2">
				<GradientProperties
					{interpolationMode}
					onInterpolationModeChange={propertiesProps.onInterpolationModeChange}
					onExport={propertiesProps.onExport}
					onDelete={propertiesProps.onDelete}
				/>
			</div>
		</div>

		<!-- Mobile Bottom Action Bar (editor view) -->
		{#if mobileView === "editor"}
			<div class="flex gap-2 pt-3 shrink-0">
				<button
					class="btn btn-sm btn-ghost flex-1 gap-1"
					onclick={() => app.gradients.history.undo(app.gradients.gradients)}
					disabled={!app.gradients.history.canUndo}
				>
					<Icon icon="material-symbols:undo" class="w-4 h-4" />
					Undo
				</button>
				<button
					class="btn btn-sm btn-ghost flex-1 gap-1"
					onclick={() => app.gradients.history.redo(app.gradients.gradients)}
					disabled={!app.gradients.history.canRedo}
				>
					<Icon icon="material-symbols:redo" class="w-4 h-4" />
					Redo
				</button>
				<button
					class="btn btn-sm btn-primary flex-1 gap-1"
					onclick={() => (showExportDialog = true)}
					disabled={!app.gradients.activeGradient}
				>
					<Icon icon="material-symbols:download" class="w-4 h-4" />
					Export
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Dialogs -->
<CreateGradientDialog
	open={showCreateDialog}
	onClose={() => (showCreateDialog = false)}
	onCreate={handleCreateGradient}
/>

<SmartGeneratorDialog
	open={showSmartGeneratorDialog}
	onClose={() => (showSmartGeneratorDialog = false)}
	onGenerate={(stops: ValidatedGradientStop[], name: string) => {
		addGradientFromStops(stops, name);
		showSmartGeneratorDialog = false;
	}}
/>

<ImageExtractDialog
	open={showImageExtractDialog}
	onClose={() => (showImageExtractDialog = false)}
	onExtract={(stops: ValidatedGradientStop[], name: string) => {
		addGradientFromStops(stops, name);
		showImageExtractDialog = false;
	}}
/>

<ExportDialog
	open={showExportDialog}
	gradient={app.gradients.activeGradient ?? null}
	{interpolationMode}
	onClose={() => (showExportDialog = false)}
/>

<!-- Palette Picker Dialog (inline -- tightly coupled to app.palettes) -->
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
							onclick={() => handlePaletteSelect(palette)}
						>
							<div class="text-sm font-medium mb-2 truncate group-hover:text-white transition-colors">
								{palette.name}
							</div>
							<div class="flex gap-1 h-6">
								{#each palette.colors.slice(0, 6) as color}
									<div class="flex-1 rounded" style:background-color={color}></div>
								{/each}
								{#if palette.colors.length > 6}
									<div class="flex-1 rounded bg-white/10 flex items-center justify-center text-[10px] text-text-muted">
										+{palette.colors.length - 6}
									</div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}

			<div class="flex justify-end mt-4">
				<button class="btn btn-ghost" onclick={() => (showPalettePickerDialog = false)}>Close</button>
			</div>
		</div>
	</div>
{/if}
