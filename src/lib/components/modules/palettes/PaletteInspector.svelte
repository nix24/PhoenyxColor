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

	// Derive text color for active swatch
	let isDark = $derived(() => {
		if (!activeColor) return true;
		const hex = activeColor.replace("#", "");
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
	});

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

	async function copyHex() {
		if (!activeColor) return;
		try {
			await navigator.clipboard.writeText(activeColor);
			toast.success("Copied!");
		} catch {
			toast.error("Failed to copy");
		}
	}
</script>

<div class="h-full flex flex-col gap-4 p-4 overflow-y-auto custom-scrollbar">
	<!-- Active Color Swatch — immersive preview -->
	<div
		class="relative rounded-xl overflow-hidden transition-all duration-500 ease-out"
		style:background-color={activeColor || "#1a1a2e"}
		style:min-height={activeColor ? "100px" : "60px"}
	>
		<!-- Subtle inner gradient for depth -->
		<div
			class="absolute inset-0 pointer-events-none"
			style:background="linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)"
		></div>

		{#if activeColor}
			<div class="relative p-3 flex flex-col justify-between h-full" style:min-height="100px">
				<div class="flex items-start justify-between">
					<span
						class="text-[10px] font-medium uppercase tracking-widest"
						style:color={isDark() ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)"}
					>
						Color {(activeColorIndex ?? 0) + 1}
					</span>
					<button
						onclick={copyHex}
						class="p-1 rounded-md transition-colors"
						style:color={isDark() ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"}
						aria-label="Copy hex code"
					>
						<Icon icon="material-symbols:content-copy-outline" class="w-3.5 h-3.5" />
					</button>
				</div>

				<div>
					<span
						class="text-xl font-mono font-bold tracking-wider block"
						style:color={isDark() ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.82)"}
					>
						{activeColor.toUpperCase()}
					</span>
					<span
						class="text-[10px] font-mono tracking-wide"
						style:color={isDark() ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)"}
					>
						H:{Math.round(hsl.h)}  S:{Math.round(hsl.s)}  L:{Math.round(hsl.l)}
					</span>
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-center h-full p-4">
				<span class="text-xs text-white/25 tracking-wide">No color selected</span>
			</div>
		{/if}
	</div>

	{#if activeColor}
		<!-- HSL Sliders -->
		<div class="space-y-3">
			<!-- Hue -->
			<div class="space-y-1.5">
				<div class="flex justify-between text-[11px]">
					<span class="text-text-muted font-medium">Hue</span>
					<span class="text-white/70 font-mono tabular-nums">{Math.round(hsl.h)}°</span>
				</div>
				<input
					type="range"
					min="0"
					max="360"
					bind:value={hsl.h}
					oninput={updateFromHsl}
					class="range range-xs w-full"
					style="background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000); border-radius: 999px;"
				/>
			</div>

			<!-- Saturation -->
			<div class="space-y-1.5">
				<div class="flex justify-between text-[11px]">
					<span class="text-text-muted font-medium">Saturation</span>
					<span class="text-white/70 font-mono tabular-nums">{Math.round(hsl.s)}%</span>
				</div>
				<input
					type="range"
					min="0"
					max="100"
					bind:value={hsl.s}
					oninput={updateFromHsl}
					class="range range-xs w-full"
					style="background: linear-gradient(to right, hsl({hsl.h}, 0%, {hsl.l}%), hsl({hsl.h}, 100%, {hsl.l}%)); border-radius: 999px;"
				/>
			</div>

			<!-- Lightness -->
			<div class="space-y-1.5">
				<div class="flex justify-between text-[11px]">
					<span class="text-text-muted font-medium">Lightness</span>
					<span class="text-white/70 font-mono tabular-nums">{Math.round(hsl.l)}%</span>
				</div>
				<input
					type="range"
					min="0"
					max="100"
					bind:value={hsl.l}
					oninput={updateFromHsl}
					class="range range-xs w-full"
					style="background: linear-gradient(to right, hsl({hsl.h}, {hsl.s}%, 0%), hsl({hsl.h}, {hsl.s}%, 50%), hsl({hsl.h}, {hsl.s}%, 100%)); border-radius: 999px;"
				/>
			</div>
		</div>

		<!-- Hex Input -->
		<div class="relative">
			<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
				<span class="text-text-muted/60 font-mono text-sm">#</span>
			</div>
			<input
				type="text"
				value={hexInput.replace("#", "")}
				oninput={(e) => {
					const target = e.target as HTMLInputElement;
					handleHexInput("#" + target.value);
				}}
				onblur={handleHexBlur}
				class="input input-sm w-full bg-white/5 border-white/8 pl-7 font-mono text-white/90 text-sm focus:border-phoenix-primary/40 focus:bg-white/8 uppercase transition-all duration-200"
				placeholder="000000"
				maxlength="6"
			/>
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center space-y-2">
				<Icon icon="material-symbols:touch-app" class="w-8 h-8 mx-auto text-white/10" />
				<p class="text-xs text-text-muted/40">Select a color to edit</p>
			</div>
		</div>
	{/if}

	<!-- History -->
	{#if colorHistory.length > 0}
		<div class="space-y-2">
			<h4 class="text-[10px] font-semibold text-text-muted/60 uppercase tracking-widest">
				History
			</h4>
			<div class="flex gap-1.5 flex-wrap">
				{#each colorHistory.slice(0, 8) as color}
					<button
						class="w-7 h-7 rounded-lg border border-white/8 hover:border-white/25 transition-all duration-200 cursor-pointer hover:shadow-lg"
						style:background-color={color}
						onclick={() => onColorHistorySelect(color)}
						aria-label={`Select color ${color}`}
					></button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Export Section -->
	<div class="mt-auto space-y-2 pt-2 border-t border-white/5">
		<h4 class="text-[10px] font-semibold text-text-muted/60 uppercase tracking-widest">
			Export
		</h4>

		<div class="grid grid-cols-3 gap-1.5">
			<button
				onclick={() => onExport("json")}
				class="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-white/3 border border-white/5 hover:bg-white/8 hover:border-white/12 transition-all duration-200 group"
			>
				<div class="w-5 h-5 rounded bg-purple-500/15 text-purple-400 flex items-center justify-center group-hover:bg-purple-500/25 transition-colors">
					<Icon icon="material-symbols:data-object" class="w-3.5 h-3.5" />
				</div>
				<span class="text-[10px] font-medium text-text-muted/70 group-hover:text-white/80 transition-colors">JSON</span>
			</button>

			<button
				onclick={() => onExport("css")}
				class="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-white/3 border border-white/5 hover:bg-white/8 hover:border-white/12 transition-all duration-200 group"
			>
				<div class="w-5 h-5 rounded bg-blue-500/15 text-blue-400 flex items-center justify-center group-hover:bg-blue-500/25 transition-colors">
					<Icon icon="material-symbols:css" class="w-3.5 h-3.5" />
				</div>
				<span class="text-[10px] font-medium text-text-muted/70 group-hover:text-white/80 transition-colors">CSS</span>
			</button>

			<button
				onclick={() => onExport("png")}
				class="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-white/3 border border-white/5 hover:bg-white/8 hover:border-white/12 transition-all duration-200 group"
			>
				<div class="w-5 h-5 rounded bg-pink-500/15 text-pink-400 flex items-center justify-center group-hover:bg-pink-500/25 transition-colors">
					<Icon icon="material-symbols:image" class="w-3.5 h-3.5" />
				</div>
				<span class="text-[10px] font-medium text-text-muted/70 group-hover:text-white/80 transition-colors">PNG</span>
			</button>
		</div>
	</div>
</div>
