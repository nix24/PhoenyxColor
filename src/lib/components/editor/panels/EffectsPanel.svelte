<script lang="ts">
import Icon from "@iconify/svelte";
import { cn } from "$lib/utils/cn";
import { app } from "$lib/stores/root.svelte";
import type { QuickEffect } from "$lib/types/effects";
import type { AppliedEffect, EffectPatch } from "$lib/types/image-editor";

let {
	appliedEffects = [],
	onAddEffect,
	onPreviewEffect,
	onUpdateEffect,
	onRemoveEffect,
	onClearEffects,
} = $props<{
	appliedEffects: AppliedEffect[];
	/** Adds the effect at once (one undo step); it previews live from then on. */
	onAddEffect: (effect: QuickEffect) => void;
	/** A slider mid-drag: shown, not recorded. */
	onPreviewEffect: (index: number, patch: EffectPatch) => void;
	/** One undo step. */
	onUpdateEffect: (index: number, patch: EffectPatch) => void;
	onRemoveEffect: (index: number) => void;
	onClearEffects: () => void;
}>();

/** The applied effect whose settings are open; a new effect opens itself. */
let selectedIndex = $state<number | null>(null);
/** The count last seen; null before the first run, so effects already applied stay closed. */
let previousCount: number | null = null;
$effect.pre(() => {
	const count = appliedEffects.length;
	if (previousCount !== null && count > previousCount) selectedIndex = count - 1;
	else if (selectedIndex !== null && selectedIndex >= count) selectedIndex = null;
	previousCount = count;
});

const effects: Array<{ id: QuickEffect; name: string; icon: string; description: string }> = [
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

/** The first and last colors of the active palette, for a duotone. */
function paletteDuotone(): [string, string] | null {
	const colors = app.palettes.activePalette?.colors ?? [];
	const first = colors[0];
	const last = colors.at(-1);
	return colors.length >= 2 && first && last ? [first, last] : null;
}

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
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/60 uppercase tracking-wider">Add an effect</h4>
		<div class="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
			{#each effects as effect (effect.id)}
				<button
					class="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-phoenix-primary"
					onclick={() => onAddEffect(effect.id)}
					aria-label={`Add ${effect.name}: ${effect.description}`}
					title={effect.description}
					type="button"
				>
					<Icon icon={effect.icon} class="w-5 h-5" />
					<span class="text-[10px] font-medium">{effect.name}</span>
				</button>
			{/each}
		</div>
	</div>

	{#if appliedEffects.length > 0}
		<div class="space-y-3 pt-4 border-t border-white/10">
			<div class="flex items-center justify-between">
				<h4 class="text-xs font-bold text-white/60 uppercase tracking-wider">
					Applied ({appliedEffects.length})
				</h4>
				<button
					class="btn btn-xs min-h-8 btn-ghost text-red-400 hover:text-red-300 hover:bg-red-400/10"
					onclick={onClearEffects}
					type="button"
				>
					<Icon icon="material-symbols:delete-outline" class="w-3.5 h-3.5" />
					Remove all
				</button>
			</div>
			<ol class="space-y-2">
				{#each appliedEffects as effect, index (index)}
					{@const info = effects.find((e) => e.id === effect.type)}
					{@const isOpen = selectedIndex === index}
					<li class={cn("rounded-lg border bg-white/5", isOpen ? "border-phoenix-primary/40" : "border-white/10")}>
						<div class="flex items-center gap-1">
							<button
								class="flex min-h-11 flex-1 items-center gap-2 rounded-lg p-2 text-left focus-visible:outline-2 focus-visible:outline-phoenix-primary"
								onclick={() => (selectedIndex = isOpen ? null : index)}
								aria-expanded={isOpen}
								type="button"
							>
								<span class="w-6 h-6 rounded bg-phoenix-primary/20 flex items-center justify-center">
									<Icon icon={info?.icon ?? "material-symbols:auto-fix"} class="w-4 h-4 text-phoenix-primary" />
								</span>
								<span class="min-w-0 flex-1">
									<span class="block truncate text-xs font-medium text-white">{info?.name ?? effect.type}</span>
									<span class="block text-[10px] text-white/60">{effect.intensity}%</span>
								</span>
								<Icon icon={isOpen ? "material-symbols:expand-less" : "material-symbols:expand-more"} class="h-4 w-4 text-white/60" />
							</button>
							<button
								class="flex h-11 w-11 items-center justify-center rounded-lg text-white/60 hover:bg-red-400/10 hover:text-red-400 focus-visible:outline-2 focus-visible:outline-phoenix-primary"
								onclick={() => onRemoveEffect(index)}
								aria-label={`Remove ${info?.name ?? effect.type}`}
								type="button"
							>
								<Icon icon="material-symbols:close" class="w-4 h-4" />
							</button>
						</div>

						{#if isOpen}
							<div class="space-y-4 border-t border-white/10 p-3">
								<div class="space-y-1.5">
									<div class="flex items-center justify-between">
										<label for={`effect-intensity-${index}`} class="text-[13px] font-medium text-white">Intensity</label>
										<span class="text-xs font-mono text-phoenix-primary tabular-nums">{effect.intensity}%</span>
									</div>
									<input
										id={`effect-intensity-${index}`}
										type="range"
										min="0"
										max="100"
										value={effect.intensity}
										class="range range-xs range-primary w-full"
										oninput={(e) => onPreviewEffect(index, { intensity: parseInt(e.currentTarget.value, 10) })}
										onchange={(e) => onUpdateEffect(index, { intensity: parseInt(e.currentTarget.value, 10) })}
									/>
								</div>

								{#if effect.type === "duotone" && effect.duotoneColors}
									{@const [dark, light] = effect.duotoneColors}
									{@const fromPalette = paletteDuotone()}
									<div class="grid grid-cols-2 gap-3">
										<label class="grid gap-1.5 text-xs text-white/70">
											Dark
											<input
												type="color"
												value={dark}
												class="h-10 w-full cursor-pointer rounded border border-white/10 bg-transparent"
												oninput={(e) => onPreviewEffect(index, { duotoneColors: [e.currentTarget.value, light] })}
												onchange={(e) => onUpdateEffect(index, { duotoneColors: [e.currentTarget.value, light] })}
											/>
										</label>
										<label class="grid gap-1.5 text-xs text-white/70">
											Light
											<input
												type="color"
												value={light}
												class="h-10 w-full cursor-pointer rounded border border-white/10 bg-transparent"
												oninput={(e) => onPreviewEffect(index, { duotoneColors: [dark, e.currentTarget.value] })}
												onchange={(e) => onUpdateEffect(index, { duotoneColors: [dark, e.currentTarget.value] })}
											/>
										</label>
									</div>
									{#if fromPalette}
										<button
											class="btn btn-xs min-h-8 w-full bg-phoenix-violet/20 border-phoenix-violet/30 text-white"
											onclick={() => onUpdateEffect(index, { duotoneColors: fromPalette })}
											type="button"
										>
											<Icon icon="material-symbols:palette" class="w-3.5 h-3.5" />
											Use active palette colors
										</button>
									{/if}
									<div class="grid grid-cols-4 gap-2" role="group" aria-label="Duotone presets">
										{#each duotonePresets as preset (preset.name)}
											<button
												class="h-9 rounded-md overflow-hidden border border-white/10 hover:border-white/30 transition-colors focus-visible:outline-2 focus-visible:outline-phoenix-primary"
												style:background="linear-gradient(to right, {preset.colors[0]} 50%, {preset.colors[1]} 50%)"
												onclick={() => onUpdateEffect(index, { duotoneColors: preset.colors })}
												aria-label={`Duotone preset: ${preset.name}`}
												title={preset.name}
												type="button"
											></button>
										{/each}
									</div>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ol>
		</div>
	{:else}
		<p class="text-xs leading-relaxed text-white/60">
			Tap an effect to add it. Effects stack in order, and each one stays editable.
		</p>
	{/if}
</div>
