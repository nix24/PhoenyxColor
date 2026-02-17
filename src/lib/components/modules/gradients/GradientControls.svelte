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
	} from "./gradient-utils";
	import chroma from "chroma-js";
	import { validateColor } from "$lib/schemas/validation";

	interface Props {
		gradient: ValidatedGradient;
		interpolationMode?: InterpolationMode;
		onInterpolationModeChange?: (mode: InterpolationMode) => void;
	}

	let {
		gradient,
		interpolationMode = "oklch",
		onInterpolationModeChange,
	}: Props = $props();

	let selectedStopIndex = $state(-1);
	let easingType = $state<EasingType>("linear");

	function addColorStop(color: string = "#808080", position?: number) {
		const colorValidation = validateColor(color);
		if (!colorValidation.valid) {
			toast.error(`Invalid color: ${colorValidation.error}`);
			return;
		}

		if (position === undefined) {
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
		const newStops = [...gradient.stops, newStop].sort((a, b) => a.position - b.position);
		app.gradients.update(gradient.id, { stops: newStops });
		toast.success("Color stop added!");
	}

	function removeColorStop(index: number) {
		if (gradient.stops.length <= 2) {
			toast.warning("Gradient must have at least 2 color stops");
			return;
		}
		const newStops = gradient.stops.filter((_, i) => i !== index);
		app.gradients.update(gradient.id, { stops: newStops });
		if (selectedStopIndex === index) selectedStopIndex = -1;
	}

	function updateColorStop(index: number, updates: Partial<ValidatedGradientStop>) {
		const stop = gradient.stops[index];
		if (stop) {
			const newStops = gradient.stops.map((s, i) =>
				i === index ? { ...s, ...updates } : s
			);
			if (updates.position !== undefined) {
				newStops.sort((a, b) => a.position - b.position);
			}
			app.gradients.update(gradient.id, { stops: newStops });
		}
	}

	function handleReverse() {
		const newStops = reverseGradientStops([...gradient.stops]);
		app.gradients.update(gradient.id, { stops: newStops });
		toast.success("Gradient reversed!");
	}

	function handleSmoothen() {
		const newStops = smoothenGradientStops([...gradient.stops], interpolationMode);
		app.gradients.update(gradient.id, { stops: newStops });
		toast.success("Gradient smoothened!");
	}

	function handleDistribute() {
		const newStops = distributeStopsEvenly([...gradient.stops]);
		app.gradients.update(gradient.id, { stops: newStops });
		toast.success("Stops distributed evenly!");
	}

	function handleRandomize() {
		const numStops = gradient.stops.length;
		const baseHue = Math.random() * 360;
		const hueSpread = 60 + Math.random() * 180;

		const newColors: string[] = [];
		for (let i = 0; i < numStops; i++) {
			const hue = (baseHue + (i * hueSpread / numStops) + Math.random() * 30 - 15) % 360;
			const saturation = 0.5 + Math.random() * 0.4;
			const lightness = 0.35 + Math.random() * 0.35;
			newColors.push(chroma.hsl(hue, saturation, lightness).hex());
		}

		const randomPositions: number[] = [];
		for (let i = 0; i < numStops; i++) {
			if (i === 0) {
				randomPositions.push(0);
			} else if (i === numStops - 1) {
				randomPositions.push(100);
			} else {
				randomPositions.push(Math.round(5 + Math.random() * 90));
			}
		}
		randomPositions.sort((a, b) => a - b);

		const newStops: ValidatedGradientStop[] = gradient.stops.map((stop, index) => ({
			color: newColors[index] || stop.color,
			position: randomPositions[index] ?? stop.position,
		}));
		newStops.sort((a, b) => a.position - b.position);

		app.gradients.update(gradient.id, { stops: newStops });
		toast.success("Gradient randomized!");
	}

	function duplicateStop(index: number) {
		const stop = gradient.stops[index];
		if (!stop) return;
		const newPosition = Math.min(100, stop.position + 5);
		addColorStop(stop.color, newPosition);
	}

	function handleStopColorChange(index: number, color: string) {
		if (validateColor(color).valid) {
			updateColorStop(index, { color });
		}
	}

	function handlePositionInput(index: number, value: string) {
		const num = Number.parseInt(value, 10);
		if (!Number.isNaN(num)) {
			updateColorStop(index, { position: Math.max(0, Math.min(100, num)) });
		}
	}
</script>

<div class="space-y-6">
	<!-- Gradient Type Selector -->
	<div class="space-y-3">
		<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider">Gradient Type</h4>
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
	<div class="space-y-3">
		<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider">Settings</h4>

		{#if gradient.type === "linear"}
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<label for="angle-range" class="text-xs text-text-muted">Angle</label>
					<span class="text-xs font-mono text-phoenix-primary">{gradient.angle || 45}°</span>
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
						<label for="centerx-range" class="text-xs text-text-muted">Center X</label>
						<span class="text-xs font-mono text-phoenix-primary">{gradient.centerX || 50}%</span>
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
						<label for="centery-range" class="text-xs text-text-muted">Center Y</label>
						<span class="text-xs font-mono text-phoenix-primary">{gradient.centerY || 50}%</span>
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

	<!-- Color Space & Easing -->
	<div class="space-y-3">
		<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider">Color Space</h4>
		<div class="flex flex-wrap gap-1.5">
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

		<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider pt-2">Easing</h4>
		<div class="flex flex-wrap gap-1.5">
			{#each EASING_TYPES as easing}
				<button
					class={cn(
						"btn btn-xs",
						easingType === easing.id ? "btn-primary" : "btn-ghost text-text-muted"
					)}
					onclick={() => (easingType = easing.id)}
				>
					{easing.name}
				</button>
			{/each}
		</div>
	</div>

	<!-- Color Stops -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider">Color Stops</h4>
			<button
				class="btn btn-xs bg-phoenix-primary border-none text-white hover:bg-phoenix-primary/80"
				onclick={() => addColorStop()}
			>
				<Icon icon="material-symbols:add" class="w-3 h-3" />
				Add
			</button>
		</div>

		<!-- Quick Actions with Undo/Redo -->
		<div class="flex flex-wrap gap-1.5">
			<button
				class="btn btn-xs btn-ghost text-text-muted hover:text-white"
				onclick={() => app.gradients.history.undo(app.gradients.gradients)}
				disabled={!app.gradients.history.canUndo}
				title="Undo"
			>
				<Icon icon="material-symbols:undo" class="w-3.5 h-3.5" />
			</button>
			<button
				class="btn btn-xs btn-ghost text-text-muted hover:text-white"
				onclick={() => app.gradients.history.redo(app.gradients.gradients)}
				disabled={!app.gradients.history.canRedo}
				title="Redo"
			>
				<Icon icon="material-symbols:redo" class="w-3.5 h-3.5" />
			</button>
			<div class="w-px h-5 bg-white/10 self-center"></div>
			<button
				class="btn btn-xs btn-ghost text-text-muted hover:text-white"
				onclick={handleReverse}
				title="Reverse gradient"
			>
				<Icon icon="material-symbols:swap-horiz" class="w-3.5 h-3.5" />
				Reverse
			</button>
			<button
				class="btn btn-xs btn-ghost text-text-muted hover:text-white"
				onclick={handleSmoothen}
				title="Smoothen transitions"
			>
				<Icon icon="material-symbols:auto-fix-high" class="w-3.5 h-3.5" />
				Smooth
			</button>
			<button
				class="btn btn-xs btn-ghost text-text-muted hover:text-white"
				onclick={handleDistribute}
				title="Distribute evenly"
			>
				<Icon icon="material-symbols:distribute-horizontal" class="w-3.5 h-3.5" />
				Distribute
			</button>
			<button
				class="btn btn-xs btn-ghost text-text-muted hover:text-white"
				onclick={handleRandomize}
				title="Randomize colors and positions"
			>
				<Icon icon="material-symbols:casino" class="w-3.5 h-3.5" />
				Random
			</button>
		</div>

		<!-- Stops List -->
		<div class="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
			{#each gradient.stops as stop, index (stop.color + stop.position + index)}
				<div
					class={cn(
						"flex items-center gap-2 p-2 rounded-lg border transition-all",
						selectedStopIndex === index
							? "bg-phoenix-primary/10 border-phoenix-primary/50"
							: "bg-black/20 border-white/10 hover:border-white/20"
					)}
				>
					<!-- Color Swatch with native picker overlay -->
					<div class="relative shrink-0">
						<div
							class="w-10 h-10 rounded-lg border-2 border-white/20 shadow-sm"
							style:background-color={stop.color}
						></div>
						<input
							type="color"
							value={stop.color}
							class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
							oninput={(e) => handleStopColorChange(index, (e.target as HTMLInputElement).value)}
							title="Pick color"
						/>
					</div>

					<!-- Color Hex Input -->
					<input
						type="text"
						value={stop.color}
						class="input input-xs bg-black/30 border-white/10 text-white w-[72px] font-mono text-[11px] focus:border-phoenix-primary"
						onchange={(e) => handleStopColorChange(index, (e.target as HTMLInputElement).value)}
					/>

					<!-- Position Slider + Numeric Input -->
					<div class="flex-1 flex items-center gap-1.5">
						<input
							type="range"
							min="0"
							max="100"
							value={stop.position}
							class="range range-xs range-primary flex-1"
							oninput={(e) => {
								const position = parseInt((e.target as HTMLInputElement).value);
								updateColorStop(index, { position });
							}}
						/>
						<input
							type="number"
							min="0"
							max="100"
							value={stop.position}
							class="input input-xs bg-black/30 border-white/10 text-white w-12 font-mono text-[11px] text-center focus:border-phoenix-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							onchange={(e) => handlePositionInput(index, (e.target as HTMLInputElement).value)}
						/>
					</div>

					<!-- Actions -->
					<div class="flex gap-0.5 shrink-0">
						<button
							class="btn btn-xs btn-ghost text-text-muted hover:text-white p-1"
							onclick={() => duplicateStop(index)}
							title="Duplicate"
						>
							<Icon icon="material-symbols:content-copy" class="w-3 h-3" />
						</button>
						<button
							class="btn btn-xs btn-ghost text-error hover:bg-error/10 p-1"
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
