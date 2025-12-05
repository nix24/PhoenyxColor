<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import type { ImageEditorState, DEFAULT_EDITOR_STATE } from "../EditorHistory.svelte";
	import { storage } from "$lib/services/storage";
	import { toast } from "svelte-sonner";

	let { currentState, imageSrc, onApplyPreset } = $props<{
		currentState: ImageEditorState;
		imageSrc: string;
		onApplyPreset: (preset: Partial<ImageEditorState>, intensity: number) => void;
	}>();

	let presetIntensity = $state(100);
	let activePresetId = $state<string | null>(null);
	let customPresets = $state<
		Array<{ id: string; name: string; settings: Partial<ImageEditorState> }>
	>([]);
	let newPresetName = $state("");
	let showSaveDialog = $state(false);

	// Built-in filter presets
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

	// Load custom presets
	$effect(() => {
		loadCustomPresets();
	});

	async function loadCustomPresets() {
		const saved = await storage.db.get<typeof customPresets>("phoenyx_filter_presets");
		if (saved) {
			customPresets = saved;
		}
	}

	async function saveCustomPresets() {
		try {
			await storage.db.set("phoenyx_filter_presets", customPresets);
		} catch (error) {
			console.error("Failed to save custom presets:", error);
			toast.error("Failed to save preset");
		}
	}

	function handlePresetClick(preset: (typeof builtInPresets)[0]) {
		activePresetId = preset.id;
		if (preset.id === "none") {
			onApplyPreset({}, 100);
		} else {
			onApplyPreset(preset.settings, presetIntensity);
		}
	}

	function handleIntensityChange(value: number) {
		presetIntensity = value;
		if (activePresetId && activePresetId !== "none") {
			const preset = [...builtInPresets, ...customPresets].find((p) => p.id === activePresetId);
			if (preset) {
				onApplyPreset(preset.settings, value);
			}
		}
	}

	async function handleSavePreset() {
		if (!newPresetName.trim()) {
			toast.error("Please enter a preset name");
			return;
		}

		const newPreset = {
			id: `custom_${Date.now()}`,
			name: newPresetName.trim(),
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
		};

		customPresets = [...customPresets, newPreset];
		await saveCustomPresets();
		newPresetName = "";
		showSaveDialog = false;
		toast.success("Preset saved!");
	}

	async function deleteCustomPreset(id: string) {
		customPresets = customPresets.filter((p) => p.id !== id);
		await saveCustomPresets();
		toast.success("Preset deleted");
	}
</script>

<div class="space-y-6">
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

	<!-- Built-in Presets -->
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Presets</h4>
		<div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
			{#each builtInPresets as preset}
				<button
					class={cn(
						"flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200",
						activePresetId === preset.id
							? "bg-phoenix-primary text-white ring-2 ring-phoenix-primary/50"
							: "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
					)}
					onclick={() => handlePresetClick(preset)}
				>
					<div
						class="w-10 h-10 rounded-md overflow-hidden bg-black/30 flex items-center justify-center"
					>
						<Icon icon={preset.icon} class="w-5 h-5" />
					</div>
					<span class="text-[10px] font-medium truncate w-full text-center">{preset.name}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Custom Presets -->
	{#if customPresets.length > 0}
		<div class="space-y-3">
			<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Your Presets</h4>
			<div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
				{#each customPresets as preset}
					<div class="relative group">
						<button
							class={cn(
								"w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200",
								activePresetId === preset.id
									? "bg-phoenix-violet text-white ring-2 ring-phoenix-violet/50"
									: "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
							)}
							onclick={() => handlePresetClick(preset as any)}
						>
							<div
								class="w-10 h-10 rounded-md overflow-hidden bg-phoenix-violet/20 flex items-center justify-center"
							>
								<Icon icon="material-symbols:star" class="w-5 h-5 text-phoenix-violet" />
							</div>
							<span class="text-[10px] font-medium truncate w-full text-center">{preset.name}</span>
						</button>
						<button
							class="absolute -top-1 -right-1 btn btn-xs btn-circle btn-error opacity-0 group-hover:opacity-100 transition-opacity"
							onclick={() => deleteCustomPreset(preset.id)}
						>
							<Icon icon="material-symbols:close" class="w-3 h-3" />
						</button>
					</div>
				{/each}
			</div>
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
					onkeydown={(e) => e.key === "Enter" && handleSavePreset()}
				/>
				<div class="flex gap-2">
					<button
						class="btn btn-sm flex-1 btn-ghost text-white/60"
						onclick={() => (showSaveDialog = false)}
					>
						Cancel
					</button>
					<button class="btn btn-sm flex-1 btn-primary" onclick={handleSavePreset}> Save </button>
				</div>
			</div>
		{:else}
			<button
				class="btn btn-sm w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
				onclick={() => (showSaveDialog = true)}
			>
				<Icon icon="material-symbols:add" class="w-4 h-4" />
				Save Current as Preset
			</button>
		{/if}
	</div>
</div>
