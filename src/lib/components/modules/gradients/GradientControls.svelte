<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedGradient, ValidatedGradientStop } from "$lib/schemas/validation";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import { cn } from "$lib/utils/cn";
	import {
		INTERPOLATION_MODES,
		EASING_TYPES,
		type InterpolationMode,
		type EasingType,
		smoothenGradientStops,
		reverseGradientStops,
		distributeStopsEvenly,
		interpolateGradientColors,
		getContrastColor,
	} from "./gradient-utils";
	import chroma from "chroma-js";
	import { validateColor } from "$lib/schemas/validation";

	interface Props {
		gradient: ValidatedGradient;
		interpolationMode?: InterpolationMode;
		onInterpolationModeChange?: (mode: InterpolationMode) => void;
		colorPickerValue?: string;
		onColorPickerChange?: (color: string) => void;
	}

	let {
		gradient,
		interpolationMode = "oklch",
		onInterpolationModeChange,
		colorPickerValue = "#3b82f6",
		onColorPickerChange,
	}: Props = $props();

	let selectedStopIndex = $state(-1);
	let showColorPicker = $state(false);

	function addColorStop(color: string = colorPickerValue, position?: number) {
		const colorValidation = validateColor(color);
		if (!colorValidation.valid) {
			toast.error(`Invalid color: ${colorValidation.error}`);
			return;
		}

		if (position === undefined) {
			// Find best position between existing stops
			const positions = gradient.stops.map((s) => s.position).sort((a, b) => a - b);
			position = 50;
			if (positions.length >= 2) {
				for (let i = 0; i < positions.length - 1; i++) {
					const p1 = positions[i];
					const p2 = positions[i + 1];
					if (p1 !== undefined && p2 !== undefined) {
						const gap = p2 - p1;
						if (gap > 20) {
							position = p1 + gap / 2;
							break;
						}
					}
				}
			}
		}

		const newStop: ValidatedGradientStop = { color, position: Math.round(position) };
		gradient.stops.push(newStop);
		gradient.stops.sort((a, b) => a.position - b.position);
		app.gradients.update(gradient.id, { stops: gradient.stops });
		toast.success("Color stop added!");
	}

	function removeColorStop(index: number) {
		if (gradient.stops.length <= 2) {
			toast.warning("Gradient must have at least 2 color stops");
			return;
		}
		gradient.stops.splice(index, 1);
		app.gradients.update(gradient.id, { stops: gradient.stops });
		if (selectedStopIndex === index) selectedStopIndex = -1;
		toast.info("Color stop removed");
	}

	function updateColorStop(index: number, updates: Partial<ValidatedGradientStop>) {
		const stop = gradient.stops[index];
		if (stop) {
			Object.assign(stop, updates);
			if (updates.position !== undefined) {
				gradient.stops.sort((a, b) => a.position - b.position);
			}
			app.gradients.update(gradient.id, { stops: gradient.stops });
		}
	}

	function handleReverse() {
		gradient.stops = reverseGradientStops(gradient.stops);
		app.gradients.update(gradient.id, { stops: gradient.stops });
		toast.success("Gradient reversed!");
	}

	function handleSmoothen() {
		gradient.stops = smoothenGradientStops(gradient.stops, interpolationMode);
		app.gradients.update(gradient.id, { stops: gradient.stops });
		toast.success("Gradient smoothened!");
	}

	function handleDistribute() {
		gradient.stops = distributeStopsEvenly(gradient.stops);
		app.gradients.update(gradient.id, { stops: gradient.stops });
		toast.success("Stops distributed evenly!");
	}

	function handleRandomize() {
		// Generate truly random colors based on existing palette or completely random
		const numStops = gradient.stops.length;
		
		// Extract existing hues to create variations, or generate completely random
		const existingColors = gradient.stops.map(s => s.color);
		const baseHue = Math.random() * 360; // Random starting hue
		const hueSpread = 60 + Math.random() * 180; // Random spread between 60-240 degrees
		
		// Generate random colors with good variation
		const newColors: string[] = [];
		for (let i = 0; i < numStops; i++) {
			const hue = (baseHue + (i * hueSpread / numStops) + Math.random() * 30 - 15) % 360;
			const saturation = 0.5 + Math.random() * 0.4; // 50-90%
			const lightness = 0.35 + Math.random() * 0.35; // 35-70%
			newColors.push(chroma.hsl(hue, saturation, lightness).hex());
		}
		
		// Generate random positions (keeping first at 0 and last at 100)
		const randomPositions: number[] = [];
		for (let i = 0; i < numStops; i++) {
			if (i === 0) {
				randomPositions.push(0);
			} else if (i === numStops - 1) {
				randomPositions.push(100);
			} else {
				// Random position between 5 and 95, with some spacing
				randomPositions.push(Math.round(5 + Math.random() * 90));
			}
		}
		// Sort positions to maintain gradient order
		randomPositions.sort((a, b) => a - b);
		
		// Apply new colors and positions
		gradient.stops.forEach((stop, index) => {
			stop.color = newColors[index] || stop.color;
			stop.position = randomPositions[index] ?? stop.position;
		});
		
		// Re-sort stops by position
		gradient.stops.sort((a, b) => a.position - b.position);
		app.gradients.update(gradient.id, { stops: gradient.stops });
		toast.success("Gradient randomized!");
	}

	function duplicateStop(index: number) {
		const stop = gradient.stops[index];
		if (!stop) return;

		const newPosition = Math.min(100, stop.position + 5);
		addColorStop(stop.color, newPosition);
	}

	function selectStop(index: number) {
		selectedStopIndex = selectedStopIndex === index ? -1 : index;
		if (selectedStopIndex >= 0) {
			const stop = gradient.stops[selectedStopIndex];
			if (stop && onColorPickerChange) {
				onColorPickerChange(stop.color);
			}
		}
	}
</script>

<div class="space-y-8">
	<!-- Gradient Type Selector -->
	<div class="space-y-4">
		<h4 class="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Gradient Type</h4>
		<div class="join w-full border border-white/10 rounded-lg">
			{#each ["linear", "radial", "conic"] as type}
				<button
					class={cn(
						"btn btn-sm join-item flex-1 border-none",
						gradient.type === type
							? "bg-phoenix-primary text-white"
							: "bg-transparent text-text-muted hover:bg-white/5 hover:text-white"
					)}
					onclick={() => {
						app.gradients.update(gradient.id, { type: type as "linear" | "radial" | "conic" });
						toast.success(`Changed to ${type} gradient`);
					}}
				>
					<Icon
						icon={type === "linear"
							? "material-symbols:linear-scale"
							: type === "radial"
								? "material-symbols:radio-button-checked"
								: "material-symbols:rotate-right"}
						class="w-4 h-4 mr-1"
					/>
					{type}
				</button>
			{/each}
		</div>
	</div>

	<!-- Type-Specific Controls -->
	<div class="space-y-4">
		<h4 class="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Settings</h4>

		{#if gradient.type === "linear"}
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<label for="angle-range" class="text-sm text-text-muted">Angle</label>
					<span class="text-sm font-mono text-phoenix-primary">{gradient.angle || 45}°</span>
				</div>
				<input
					id="angle-range"
					type="range"
					min="0"
					max="360"
					value={gradient.angle || 45}
					class="range range-xs range-primary w-full"
					oninput={(e) => {
						const angle = parseInt((e.target as HTMLInputElement).value);
						app.gradients.update(gradient.id, { angle });
					}}
				/>
				<div class="flex gap-1 flex-wrap">
					{#each [0, 45, 90, 135, 180, 225, 270, 315] as angle}
						<button
							class={cn(
								"btn btn-xs",
								gradient.angle === angle ? "btn-primary" : "btn-ghost text-text-muted"
							)}
							onclick={() => app.gradients.update(gradient.id, { angle })}
						>
							{angle}°
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#if gradient.type === "radial" || gradient.type === "conic"}
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<label for="centerx-range" class="text-sm text-text-muted">Center X</label>
						<span class="text-sm font-mono text-phoenix-primary">{gradient.centerX || 50}%</span>
					</div>
					<input
						id="centerx-range"
						type="range"
						min="0"
						max="100"
						value={gradient.centerX || 50}
						class="range range-xs range-primary w-full"
						oninput={(e) => {
							const centerX = parseInt((e.target as HTMLInputElement).value);
							app.gradients.update(gradient.id, { centerX });
						}}
					/>
				</div>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<label for="centery-range" class="text-sm text-text-muted">Center Y</label>
						<span class="text-sm font-mono text-phoenix-primary">{gradient.centerY || 50}%</span>
					</div>
					<input
						id="centery-range"
						type="range"
						min="0"
						max="100"
						value={gradient.centerY || 50}
						class="range range-xs range-primary w-full"
						oninput={(e) => {
							const centerY = parseInt((e.target as HTMLInputElement).value);
							app.gradients.update(gradient.id, { centerY });
						}}
					/>
				</div>
			</div>
			<div class="flex gap-1 flex-wrap">
				{#each [{ label: "TL", x: 0, y: 0 }, { label: "T", x: 50, y: 0 }, { label: "TR", x: 100, y: 0 }, { label: "L", x: 0, y: 50 }, { label: "C", x: 50, y: 50 }, { label: "R", x: 100, y: 50 }, { label: "BL", x: 0, y: 100 }, { label: "B", x: 50, y: 100 }, { label: "BR", x: 100, y: 100 }] as pos}
					<button
						class={cn(
							"btn btn-xs",
							gradient.centerX === pos.x && gradient.centerY === pos.y
								? "btn-primary"
								: "btn-ghost text-text-muted"
						)}
						onclick={() => app.gradients.update(gradient.id, { centerX: pos.x, centerY: pos.y })}
						title="{pos.label} ({pos.x}%, {pos.y}%)"
					>
						{pos.label}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Interpolation Mode -->
	<div class="space-y-4">
		<h4 class="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Color Space</h4>
		<div class="flex flex-wrap gap-2">
			{#each INTERPOLATION_MODES as mode}
				<button
					class={cn(
						"btn btn-xs",
						interpolationMode === mode.id ? "btn-primary" : "btn-ghost text-text-muted"
					)}
					onclick={() => onInterpolationModeChange?.(mode.id)}
					title={mode.description}
				>
					{mode.name}
				</button>
			{/each}
		</div>
	</div>

	<!-- Color Stops -->
	<div class="space-y-4">
		<div class="flex items-center justify-between mb-2">
			<h4 class="text-sm font-medium text-text-muted uppercase tracking-wider">Color Stops</h4>
			<button
				class="btn btn-xs bg-phoenix-primary border-none text-white hover:bg-phoenix-primary/80"
				onclick={() => addColorStop()}
			>
				<Icon icon="material-symbols:add" class="w-3 h-3" />
				Add
			</button>
		</div>

		<!-- Quick Actions -->
		<div class="flex flex-wrap gap-2 mb-2">
			<button
				class="btn btn-xs btn-ghost text-text-muted hover:text-white"
				onclick={handleReverse}
				title="Reverse gradient"
			>
				<Icon icon="material-symbols:swap-horiz" class="w-3 h-3" />
				Reverse
			</button>
			<button
				class="btn btn-xs btn-ghost text-text-muted hover:text-white"
				onclick={handleSmoothen}
				title="Smoothen transitions"
			>
				<Icon icon="material-symbols:auto-fix-high" class="w-3 h-3" />
				Smooth
			</button>
			<button
				class="btn btn-xs btn-ghost text-text-muted hover:text-white"
				onclick={handleDistribute}
				title="Distribute evenly"
			>
				<Icon icon="material-symbols:distribute-horizontal" class="w-3 h-3" />
				Distribute
			</button>
			<button
				class="btn btn-xs btn-ghost text-text-muted hover:text-white"
				onclick={handleRandomize}
				title="Randomize colors and positions"
			>
				<Icon icon="material-symbols:casino" class="w-3 h-3" />
				Random
			</button>
		</div>

		<!-- Stops List -->
		<div class="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
			{#each gradient.stops as stop, index (stop.color + stop.position + index)}
				<div
					class={cn(
						"flex items-center gap-3 p-2 rounded-lg border transition-all",
						selectedStopIndex === index
							? "bg-phoenix-primary/10 border-phoenix-primary/50"
							: "bg-black/20 border-white/10 hover:border-white/20"
					)}
				>
					<!-- Color Swatch -->
					<button
						class="w-8 h-8 rounded-lg border-2 border-white/20 cursor-pointer shadow-sm hover:scale-110 transition-transform"
						style:background-color={stop.color}
						onclick={() => selectStop(index)}
						title="Click to select"
					></button>

					<!-- Color Input -->
					<input
						type="text"
						value={stop.color}
						class="input input-xs bg-black/30 border-white/10 text-white w-20 font-mono focus:border-phoenix-primary"
						onchange={(e) => {
							const color = (e.target as HTMLInputElement).value;
							if (validateColor(color).valid) {
								updateColorStop(index, { color });
							}
						}}
					/>

					<!-- Position -->
					<div class="flex-1">
						<input
							type="range"
							min="0"
							max="100"
							value={stop.position}
							class="range range-xs range-primary w-full"
							oninput={(e) => {
								const position = parseInt((e.target as HTMLInputElement).value);
								updateColorStop(index, { position });
							}}
						/>
					</div>

					<span class="text-xs font-mono text-text-muted w-10 text-right">{stop.position}%</span>

					<!-- Actions -->
					<div class="flex gap-1">
						<button
							class="btn btn-xs btn-ghost text-text-muted hover:text-white"
							onclick={() => duplicateStop(index)}
							title="Duplicate"
						>
							<Icon icon="material-symbols:content-copy" class="w-3 h-3" />
						</button>
						<button
							class="btn btn-xs btn-ghost text-error hover:bg-error/10"
							onclick={() => removeColorStop(index)}
							disabled={gradient.stops.length <= 2}
							title="Remove"
						>
							<Icon icon="material-symbols:close" class="w-3 h-3" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

