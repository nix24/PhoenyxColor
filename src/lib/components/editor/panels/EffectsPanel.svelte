<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { app } from "$lib/stores/root.svelte";
	import type { AppliedEffect } from "../EditorHistory.svelte";

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
		appliedEffects = [],
		onEffectChange,
		onIntensityChange,
		onDuotoneColorsChange,
		onApplyEffect,
		onRemoveEffect,
		onClearEffects,
	} = $props<{
		activeEffect: QuickEffect;
		effectIntensity: number;
		duotoneColors: [string, string];
		appliedEffects: AppliedEffect[];
		onEffectChange: (effect: QuickEffect) => void;
		onIntensityChange: (intensity: number) => void;
		onDuotoneColorsChange: (colors: [string, string]) => void;
		onApplyEffect: () => void;
		onRemoveEffect: (index: number) => void;
		onClearEffects: () => void;
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
		<h4 class="text-xs font-bold text-white/40 uppercase tracking-wider">Quick Effects</h4>
		<div class="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
			{#each effects as effect}
				<button
					class={cn(
						"flex flex-col items-center gap-1 p-2.5 sm:p-2 rounded-lg transition-all duration-200",
						activeEffect === effect.id
							? "bg-phoenix-primary text-white shadow-md shadow-phoenix-primary/20"
							: "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
					)}
					onclick={() => onEffectChange(effect.id)}
					title={effect.description}
					type="button"
				>
					<Icon icon={effect.icon} class="w-5 h-5" />
					<span class="text-[10px] font-medium">{effect.name}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Effect Intensity -->
	{#if activeEffect !== "none"}
		<div class="space-y-1.5">
			<div class="flex items-center justify-between">
				<span class="text-[13px] font-medium text-white">Intensity</span>
				<span class="text-xs font-mono text-phoenix-primary tabular-nums">{effectIntensity}%</span>
			</div>
			<input
				type="range"
				min="0"
				max="100"
				value={effectIntensity}
				class="range range-xs range-primary w-full"
				oninput={(e) => onIntensityChange(parseInt(e.currentTarget.value, 10))}
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

	<!-- Apply Effect Button -->
	{#if activeEffect !== "none"}
		<button
			class="btn btn-primary w-full gap-2"
			onclick={onApplyEffect}
			type="button"
		>
			<Icon icon="material-symbols:add-circle" class="w-4 h-4" />
			Apply Effect to Stack
		</button>

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

	<!-- Applied Effects Stack -->
	{#if appliedEffects.length > 0}
		<div class="space-y-3 pt-4 border-t border-white/10">
			<div class="flex items-center justify-between">
				<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">
					Applied Effects ({appliedEffects.length})
				</h4>
				<button
					class="btn btn-xs btn-ghost text-red-400 hover:text-red-300 hover:bg-red-400/10"
					onclick={onClearEffects}
				>
					<Icon icon="material-symbols:delete-outline" class="w-3 h-3" />
					Clear All
				</button>
			</div>
			<div class="space-y-2">
				{#each appliedEffects as effect, index}
					{@const effectInfo = effects.find((e) => e.id === effect.type)}
					<div class="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
						<div class="w-6 h-6 rounded bg-phoenix-primary/20 flex items-center justify-center">
							<Icon icon={effectInfo?.icon ?? "material-symbols:auto-fix"} class="w-4 h-4 text-phoenix-primary" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="text-xs font-medium text-white truncate">
								{effectInfo?.name ?? effect.type}
							</div>
							<div class="text-[10px] text-white/40">
								{effect.intensity}% intensity
								{#if effect.type === "duotone" && effect.duotoneColors}
									• {effect.duotoneColors[0]} → {effect.duotoneColors[1]}
								{/if}
							</div>
						</div>
						<button
							class="btn btn-xs btn-circle btn-ghost text-white/40 hover:text-red-400 hover:bg-red-400/10"
							onclick={() => onRemoveEffect(index)}
						>
							<Icon icon="material-symbols:close" class="w-3 h-3" />
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
