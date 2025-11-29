<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { app } from "$lib/stores/root.svelte";

	export type QuickEffect =
		| "none"
		| "posterize"
		| "pixelate"
		| "solarize"
		| "duotone"
		| "halftone"
		| "vhs"
		| "glitch"
		| "emboss"
		| "sharpen";

	let {
		activeEffect = "none",
		effectIntensity = 50,
		duotoneColors = ["#000000", "#ffffff"],
		onEffectChange,
		onIntensityChange,
		onDuotoneColorsChange,
	} = $props<{
		activeEffect: QuickEffect;
		effectIntensity: number;
		duotoneColors: [string, string];
		onEffectChange: (effect: QuickEffect) => void;
		onIntensityChange: (intensity: number) => void;
		onDuotoneColorsChange: (colors: [string, string]) => void;
	}>();

	const effects: Array<{ id: QuickEffect; name: string; icon: string; description: string }> = [
		{ id: "none", name: "None", icon: "material-symbols:block", description: "No effect applied" },
		{
			id: "posterize",
			name: "Posterize",
			icon: "material-symbols:gradient",
			description: "Reduce color levels",
		},
		{
			id: "pixelate",
			name: "Pixelate",
			icon: "material-symbols:grid-view",
			description: "Retro pixel effect",
		},
		{
			id: "solarize",
			name: "Solarize",
			icon: "material-symbols:wb-sunny",
			description: "Partial negative effect",
		},
		{
			id: "duotone",
			name: "Duotone",
			icon: "material-symbols:contrast",
			description: "Two-color effect",
		},
		{
			id: "halftone",
			name: "Halftone",
			icon: "material-symbols:blur-circular",
			description: "Dot pattern effect",
		},
		{
			id: "vhs",
			name: "VHS",
			icon: "material-symbols:videocam",
			description: "Retro VHS distortion",
		},
		{
			id: "glitch",
			name: "Glitch",
			icon: "material-symbols:broken-image",
			description: "Digital glitch art",
		},
		{
			id: "emboss",
			name: "Emboss",
			icon: "material-symbols:texture",
			description: "3D embossed look",
		},
		{
			id: "sharpen",
			name: "Sharpen",
			icon: "material-symbols:center-focus-strong",
			description: "Enhance details",
		},
	];

	// Get duotone colors from active palette if available
	function usePaletteForDuotone() {
		if (app.palettes.activePalette && app.palettes.activePalette.colors.length >= 2) {
			const colors = app.palettes.activePalette.colors;
			onDuotoneColorsChange([colors[0], colors[colors.length - 1]]);
		}
	}

	// Preset duotone combinations
	const duotonePresets: Array<{ name: string; colors: [string, string] }> = [
		{ name: "Classic", colors: ["#000000", "#ffffff"] },
		{ name: "Sunset", colors: ["#1a1a2e", "#ff6b6b"] },
		{ name: "Ocean", colors: ["#0a0a23", "#00d4ff"] },
		{ name: "Forest", colors: ["#1a2f1a", "#7fff00"] },
		{ name: "Neon", colors: ["#0d0221", "#ff00ff"] },
		{ name: "Vintage", colors: ["#2c1810", "#d4a373"] },
		{ name: "Cyan", colors: ["#000033", "#00ffff"] },
		{ name: "Warm", colors: ["#1a0a00", "#ff9500"] },
	];
</script>

<div class="space-y-6">
	<!-- Effect Selection Grid -->
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Quick Effects</h4>
		<div class="grid grid-cols-5 gap-2">
			{#each effects as effect}
				<button
					class={cn(
						"flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200",
						activeEffect === effect.id
							? "bg-phoenix-primary text-white ring-2 ring-phoenix-primary/50 scale-105"
							: "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
					)}
					onclick={() => onEffectChange(effect.id)}
					title={effect.description}
				>
					<Icon icon={effect.icon} class="w-5 h-5" />
					<span class="text-[9px] font-medium">{effect.name}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Effect Intensity -->
	{#if activeEffect !== "none"}
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<span class="text-sm text-white">Effect Intensity</span>
				<span class="text-xs font-mono text-white/60">{effectIntensity}%</span>
			</div>
			<input
				type="range"
				min="0"
				max="100"
				value={effectIntensity}
				class="range range-xs range-primary"
				oninput={(e) => onIntensityChange(parseInt(e.currentTarget.value))}
			/>
		</div>
	{/if}

	<!-- Duotone Color Selection -->
	{#if activeEffect === "duotone"}
		<div class="space-y-4 pt-4 border-t border-white/10">
			<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Duotone Colors</h4>

			<!-- Color Pickers -->
			<div class="flex gap-4">
				<div class="flex-1 space-y-2">
					<span class="text-xs text-white/60">Dark</span>
					<div class="flex items-center gap-2">
						<input
							type="color"
							value={duotoneColors[0]}
							class="w-10 h-10 rounded cursor-pointer bg-transparent"
							oninput={(e) => onDuotoneColorsChange([e.currentTarget.value, duotoneColors[1]])}
						/>
						<input
							type="text"
							value={duotoneColors[0]}
							class="input input-xs flex-1 bg-white/5 border-white/10 text-white font-mono"
							oninput={(e) => onDuotoneColorsChange([e.currentTarget.value, duotoneColors[1]])}
						/>
					</div>
				</div>
				<div class="flex-1 space-y-2">
					<span class="text-xs text-white/60">Light</span>
					<div class="flex items-center gap-2">
						<input
							type="color"
							value={duotoneColors[1]}
							class="w-10 h-10 rounded cursor-pointer bg-transparent"
							oninput={(e) => onDuotoneColorsChange([duotoneColors[0], e.currentTarget.value])}
						/>
						<input
							type="text"
							value={duotoneColors[1]}
							class="input input-xs flex-1 bg-white/5 border-white/10 text-white font-mono"
							oninput={(e) => onDuotoneColorsChange([duotoneColors[0], e.currentTarget.value])}
						/>
					</div>
				</div>
			</div>

			<!-- Use Active Palette Button -->
			{#if app.palettes.activePalette}
				<button
					class="btn btn-xs w-full bg-phoenix-violet/20 border-phoenix-violet/30 text-phoenix-violet"
					onclick={usePaletteForDuotone}
				>
					<Icon icon="material-symbols:palette" class="w-3 h-3" />
					Use Active Palette Colors
				</button>
			{/if}

			<!-- Duotone Presets -->
			<div class="space-y-2">
				<span class="text-xs text-white/50">Presets</span>
				<div class="grid grid-cols-4 gap-2">
					{#each duotonePresets as preset}
						<button
							class="h-8 rounded-md overflow-hidden border border-white/10 hover:border-white/30 transition-colors"
							style:background="linear-gradient(to right, {preset.colors[0]} 50%, {preset.colors[1]}
							50%)"
							onclick={() => onDuotoneColorsChange(preset.colors)}
							title={preset.name}
						></button>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Effect-specific hints -->
	{#if activeEffect !== "none"}
		<div class="p-3 bg-white/5 rounded-lg border border-white/10">
			<div class="flex items-start gap-2">
				<Icon icon="material-symbols:info" class="w-4 h-4 text-white/40 mt-0.5" />
				<p class="text-xs text-white/60">
					{#if activeEffect === "posterize"}
						Reduces the image to a limited number of color levels, creating a poster-like effect.
					{:else if activeEffect === "pixelate"}
						Creates a retro pixel art effect. Higher intensity = larger pixels.
					{:else if activeEffect === "solarize"}
						Inverts tones above a threshold, creating a surreal effect.
					{:else if activeEffect === "duotone"}
						Maps the image to two colors. Select colors above or use a preset.
					{:else if activeEffect === "halftone"}
						Simulates print halftone patterns using dots.
					{:else if activeEffect === "vhs"}
						Adds chromatic aberration and scan lines for a retro video look.
					{:else if activeEffect === "glitch"}
						Creates digital artifacts and color channel shifts.
					{:else if activeEffect === "emboss"}
						Creates a 3D relief effect highlighting edges.
					{:else if activeEffect === "sharpen"}
						Enhances edge contrast for a crisper image.
					{/if}
				</p>
			</div>
		</div>
	{/if}
</div>
