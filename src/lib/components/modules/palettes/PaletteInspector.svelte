<script lang="ts">
	import Icon from "@iconify/svelte";
	import { app } from "$lib/stores/root.svelte";
	import { hexToHsl, hslToHex, validateAndNormalizeColor, type HSL } from "./palette-utils";
	import { toast } from "svelte-sonner";

	interface Props {
		activeColorIndex: number | null;
		colorHistory: string[];
		onColorChange: (newColor: string) => void;
		onExport: (format: "json" | "css" | "png") => void;
		onColorHistorySelect: (color: string) => void;
	}

	let { activeColorIndex, colorHistory, onColorChange, onExport, onColorHistorySelect }: Props =
		$props();

	// Get the actual color from the palette based on index
	let activeColor = $derived(
		activeColorIndex !== null && app.palettes.activePalette?.colors
			? (app.palettes.activePalette.colors[activeColorIndex] ?? null)
			: null
	);

	let hsl = $state<HSL>({ h: 0, s: 0, l: 0 });
	let hexInput = $state("");

	// Update HSL when active color changes
	$effect(() => {
		if (activeColor) {
			const extracted = hexToHsl(activeColor);
			if (extracted) {
				hsl = { ...extracted };
			}
			hexInput = activeColor;
		} else {
			hsl = { h: 0, s: 0, l: 0 };
			hexInput = "";
		}
	});

	function updateFromHsl() {
		if (activeColorIndex === null) return;
		const newHex = hslToHex(hsl.h, hsl.s, hsl.l);
		onColorChange(newHex);
	}

	function handleHexInput(val: string) {
		hexInput = val;
		if (val.length >= 7) {
			const valid = validateAndNormalizeColor(val);
			if (valid.valid && valid.color) {
				onColorChange(valid.color);
			}
		}
	}

	function handleHexBlur() {
		if (activeColor) {
			hexInput = activeColor;
		}
	}
</script>

<div class="h-full flex flex-col gap-6 p-4 overflow-y-auto">
	<!-- Active Color Indicator -->
	<div class="flex items-center justify-between">
		<h4 class="text-xs font-bold text-text-muted uppercase tracking-wider">Active Color</h4>
		<div
			class="w-8 h-8 rounded-lg shadow-lg border border-white/20"
			style:background-color={activeColor || "#333"}
		></div>
	</div>

	{#if activeColor}
		<!-- HSL Sliders -->
		<div class="space-y-4">
			<!-- Hue -->
			<div class="space-y-1">
				<div class="flex justify-between text-xs text-text-muted">
					<span>Hue</span>
					<span>{Math.round(hsl.h)}°</span>
				</div>
				<input
					type="range"
					min="0"
					max="360"
					bind:value={hsl.h}
					onchange={updateFromHsl}
					class="range range-xs w-full"
					style="background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);"
				/>
			</div>

			<!-- Saturation -->
			<div class="space-y-1">
				<div class="flex justify-between text-xs text-text-muted">
					<span>Saturation</span>
					<span>{Math.round(hsl.s)}%</span>
				</div>
				<input
					type="range"
					min="0"
					max="100"
					bind:value={hsl.s}
					onchange={updateFromHsl}
					class="range range-xs w-full"
					style="background: linear-gradient(to right, hsl({hsl.h}, 0%, {hsl.l}%), hsl({hsl.h}, 100%, {hsl.l}%));"
				/>
			</div>

			<!-- Lightness -->
			<div class="space-y-1">
				<div class="flex justify-between text-xs text-text-muted">
					<span>Lightness</span>
					<span>{Math.round(hsl.l)}%</span>
				</div>
				<input
					type="range"
					min="0"
					max="100"
					bind:value={hsl.l}
					onchange={updateFromHsl}
					class="range range-xs w-full"
					style="background: linear-gradient(to right, hsl({hsl.h}, {hsl.s}%, 0%), hsl({hsl.h}, {hsl.s}%, 50%), hsl({hsl.h}, {hsl.s}%, 100%));"
				/>
			</div>
		</div>

		<!-- Hex Input -->
		<div class="relative">
			<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
				<span class="text-text-muted font-mono">#</span>
			</div>
			<input
				type="text"
				value={hexInput.replace("#", "")}
				oninput={(e) => {
					const target = e.target as HTMLInputElement;
					handleHexInput("#" + target.value);
				}}
				onblur={handleHexBlur}
				class="input input-sm w-full bg-black/20 border-white/10 pl-7 font-mono text-white focus:border-phoenix-primary/50 uppercase"
				placeholder="000000"
				maxlength="6"
			/>
			<button
				onclick={() => {
					if (activeColor) {
						navigator.clipboard.writeText(activeColor).then(() => toast.success("Copied!"));
					}
				}}
				class="absolute inset-y-0 right-0 pr-2 flex items-center text-text-muted hover:text-white"
				aria-label="Copy hex code"
			>
				<Icon icon="material-symbols:content-copy-outline" class="w-4 h-4" />
			</button>
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center text-text-muted/50 text-sm">
			<p>Select a color to edit</p>
		</div>
	{/if}

	<!-- History -->
	<div class="space-y-2">
		<h4 class="text-xs font-bold text-text-muted uppercase tracking-wider">History</h4>
		<div class="flex gap-2 flex-wrap">
			{#each colorHistory.slice(0, 8) as color}
				<button
					class="w-8 h-8 rounded-lg border border-white/10 hover:scale-110 transition-transform cursor-pointer"
					style:background-color={color}
					onclick={() => onColorHistorySelect(color)}
					aria-label={`Select color ${color}`}
				></button>
			{/each}
			{#if colorHistory.length < 8}
				{#each Array(8 - colorHistory.length) as _}
					<div class="w-8 h-8 rounded-lg border border-dashed border-white/5"></div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Export Assets -->
	<div class="mt-auto space-y-3">
		<h4 class="text-xs font-bold text-text-muted uppercase tracking-wider">Export Assets</h4>

		<button
			onclick={() => onExport("json")}
			class="flex items-center justify-between w-full p-2 rounded-lg hover:bg-white/5 transition-colors group text-left"
		>
			<div class="flex items-center gap-3">
				<div
					class="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center"
				>
					<Icon icon="material-symbols:data-object" class="w-4 h-4" />
				</div>
				<span class="text-sm font-medium text-text-muted group-hover:text-white">JSON</span>
			</div>
			<Icon
				icon="material-symbols:download"
				class="w-4 h-4 text-text-muted group-hover:text-white"
			/>
		</button>

		<button
			onclick={() => onExport("css")}
			class="flex items-center justify-between w-full p-2 rounded-lg hover:bg-white/5 transition-colors group text-left"
		>
			<div class="flex items-center gap-3">
				<div class="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center">
					<Icon icon="material-symbols:css" class="w-4 h-4" />
				</div>
				<span class="text-sm font-medium text-text-muted group-hover:text-white">CSS / SCSS</span>
			</div>
			<Icon
				icon="material-symbols:download"
				class="w-4 h-4 text-text-muted group-hover:text-white"
			/>
		</button>

		<button
			onclick={() => onExport("png")}
			class="flex items-center justify-between w-full p-2 rounded-lg hover:bg-white/5 transition-colors group text-left"
		>
			<div class="flex items-center gap-3">
				<div class="w-6 h-6 rounded bg-pink-500/20 text-pink-400 flex items-center justify-center">
					<Icon icon="material-symbols:image" class="w-4 h-4" />
				</div>
				<span class="text-sm font-medium text-text-muted group-hover:text-white">PNG Swatch</span>
			</div>
			<Icon
				icon="material-symbols:download"
				class="w-4 h-4 text-text-muted group-hover:text-white"
			/>
		</button>

		<button
			onclick={() => onExport("json")}
			class="btn btn-primary w-full mt-4 text-black font-bold bg-phoenix-primary hover:bg-phoenix-primary/90 border-none"
		>
			<Icon icon="material-symbols:ios-share" class="w-4 h-4 mr-2" />
			Export Palette
		</button>
	</div>
</div>
