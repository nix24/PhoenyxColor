<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import { onDestroy } from "svelte";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import GradientPreview from "./GradientPreview.svelte";
	import MeshGradientCanvas from "./MeshGradientCanvas.svelte";
	import type { MeshPoint, InterpolationMode } from "./gradient-utils";
	import {
		generateDefaultMeshPoints,
		generateMeshPointsFromColors,
		interpolateColorAtPosition,
	} from "./gradient-utils";

	interface Props {
		interpolationMode: InterpolationMode;
		onStopPositionChange: (index: number, position: number) => void;
		onAngleChange: (angle: number) => void;
		onCenterChange: (x: number, y: number) => void;
		onBrowsePresets?: () => void;
	}

	let {
		interpolationMode,
		onStopPositionChange,
		onAngleChange,
		onCenterChange,
		onBrowsePresets = undefined,
	}: Props = $props();

	// Canvas state
	let previewSize = $state({ width: 600, height: 400 });
	let showInteractiveHandles = $state(true);
	let draggingStopIndex = $state<number | null>(null);
	let sliderEl = $state<HTMLDivElement | null>(null);

	// Mesh state (internal -- secondary feature)
	let isMeshMode = $state(false);
	let meshPoints = $state<MeshPoint[]>([]);
	let noiseEnabled = $state(false);
	let noiseIntensity = $state(10);
	let noiseScale = $state(1);

	// Track active drag listeners for cleanup on unmount
	let activeDragCleanup: (() => void) | null = null;

	// Derived info badge text
	let gradientInfo = $derived.by(() => {
		const g = app.gradients.activeGradient;
		if (!g) return "";
		if (g.type === "linear") return `${g.type} ${g.angle ?? 45}°`;
		if (g.type === "radial" || g.type === "conic")
			return `${g.type} ${g.centerX ?? 50}%, ${g.centerY ?? 50}%`;
		return g.type;
	});

	function startStopDrag(index: number, e: MouseEvent) {
		e.stopPropagation();
		draggingStopIndex = index;

		const handleMove = (moveEvent: MouseEvent) => {
			if (draggingStopIndex === null || !sliderEl) return;
			const rect = sliderEl.getBoundingClientRect();
			const position = Math.max(
				0,
				Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100)
			);
			onStopPositionChange(draggingStopIndex, Math.round(position));
		};

		const handleUp = () => {
			draggingStopIndex = null;
			window.removeEventListener("mousemove", handleMove);
			window.removeEventListener("mouseup", handleUp);
			activeDragCleanup = null;
		};

		window.addEventListener("mousemove", handleMove);
		window.addEventListener("mouseup", handleUp);

		activeDragCleanup = () => {
			window.removeEventListener("mousemove", handleMove);
			window.removeEventListener("mouseup", handleUp);
		};
	}

	onDestroy(() => {
		activeDragCleanup?.();
	});

	function handleSliderClick(e: MouseEvent) {
		if (draggingStopIndex !== null) return;
		const gradient = app.gradients.activeGradient;
		if (!gradient || !sliderEl) return;

		const rect = sliderEl.getBoundingClientRect();
		const position = Math.max(
			0,
			Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
		);
		const roundedPos = Math.round(position);

		const color = interpolateColorAtPosition(gradient.stops, roundedPos, interpolationMode);
		const newStops = [...gradient.stops, { color, position: roundedPos }].sort(
			(a, b) => a.position - b.position
		);
		app.gradients.update(gradient.id, { stops: newStops });
	}

	function handleStopKeydown(e: KeyboardEvent, index: number, currentPosition: number) {
		if (e.key === "ArrowLeft") {
			e.preventDefault();
			onStopPositionChange(index, Math.max(0, currentPosition - 1));
		} else if (e.key === "ArrowRight") {
			e.preventDefault();
			onStopPositionChange(index, Math.min(100, currentPosition + 1));
		}
	}

	// Mesh handlers (internal)
	function toggleMeshMode() {
		if (!isMeshMode) {
			if (meshPoints.length === 0) {
				const gradient = app.gradients.activeGradient;
				if (gradient && gradient.stops.length > 0) {
					const colors = gradient.stops.map((s) => s.color);
					meshPoints = generateMeshPointsFromColors(colors);
				} else {
					meshPoints = generateDefaultMeshPoints();
				}
			}
		}
		isMeshMode = !isMeshMode;
	}

	function handleMeshPointMove(id: string, x: number, y: number) {
		meshPoints = meshPoints.map((p) => (p.id === id ? { ...p, x, y } : p));
	}

	function handleMeshPointAdd(x: number, y: number, color: string) {
		meshPoints = [
			...meshPoints,
			{ id: crypto.randomUUID(), x, y, color, radius: 50 },
		];
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
</script>

<div
	class="flex-1 flex flex-col h-full bg-black/20 rounded-2xl border border-white/5 relative overflow-hidden"
>
	<!-- Top Controls (Floating) -->
	<div class="absolute top-4 left-4 z-20">
		{#if app.gradients.activeGradient && gradientInfo}
			<div
				class="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-mono text-white/70 capitalize"
			>
				{gradientInfo}
			</div>
		{/if}
	</div>

	<div class="absolute top-4 right-4 z-20 flex gap-2">
		<!-- Mode Toggle -->
		<div class="join border border-white/10 rounded-lg p-0.5 bg-black/40 backdrop-blur-md">
			<button
				class={cn(
					"btn btn-sm join-item gap-1 border-none min-h-8 h-8",
					!isMeshMode
						? "bg-phoenix-primary text-white shadow-lg"
						: "bg-transparent text-text-muted hover:text-white hover:bg-white/5"
				)}
				onclick={() => isMeshMode && (isMeshMode = false)}
				title="Standard gradient mode"
			>
				<Icon icon="material-symbols:gradient" class="w-4 h-4" />
				<span class="max-sm:hidden">Gradient</span>
			</button>
			<button
				class={cn(
					"btn btn-sm join-item gap-1 border-none min-h-8 h-8",
					isMeshMode
						? "bg-phoenix-violet text-white shadow-lg"
						: "bg-transparent text-text-muted hover:text-white hover:bg-white/5"
				)}
				onclick={toggleMeshMode}
				title="Mesh gradient mode (advanced)"
			>
				<Icon icon="material-symbols:grid-4x4" class="w-4 h-4" />
				<span class="max-sm:hidden">Mesh</span>
			</button>
		</div>

		<button
			class={cn(
				"btn btn-sm btn-circle border-none bg-black/40 backdrop-blur-xl hover:bg-white/10 min-h-8 h-8 w-8",
				showInteractiveHandles ? "text-phoenix-primary bg-white/5" : "text-text-muted"
			)}
			onclick={() => (showInteractiveHandles = !showInteractiveHandles)}
			title="Toggle interactive handles"
			aria-pressed={showInteractiveHandles}
		>
			<Icon icon="material-symbols:touch-app" />
		</button>
	</div>

	<!-- Main Canvas Area -->
	<div class="flex-1 w-full h-full p-8 flex items-center justify-center">
		<div class="w-full h-full rounded-2xl overflow-hidden shadow-2xl relative">
			{#if isMeshMode}
				<MeshGradientCanvas
					points={meshPoints}
					width={previewSize.width}
					height={previewSize.height}
					showHandles={showInteractiveHandles}
					{noiseEnabled}
					{noiseIntensity}
					{noiseScale}
					onPointMove={handleMeshPointMove}
					onPointAdd={handleMeshPointAdd}
					onPointRemove={handleMeshPointRemove}
					onPointColorChange={handleMeshPointColorChange}
					onPointRadiusChange={handleMeshPointRadiusChange}
				/>
			{:else}
				<GradientPreview
					gradient={app.gradients.activeGradient ?? null}
					meshPoints={[]}
					{interpolationMode}
					{previewSize}
					{showInteractiveHandles}
					{onAngleChange}
					{onCenterChange}
					{onStopPositionChange}
					onMeshPointMove={() => {}}
				/>
			{/if}
		</div>
	</div>

	<!-- Bottom: Gradient Stops Slider -->
	{#if !isMeshMode && app.gradients.activeGradient && app.gradients.activeGradient.stops}
		<div class="px-8 pb-8">
			<div
				class="flex justify-between text-xs font-bold text-text-muted mb-2 uppercase tracking-wider"
			>
				<span>Gradient Stops ({app.gradients.activeGradient.stops.length})</span>
				<span class="text-phoenix-primary text-[10px] font-normal normal-case">Click to add &middot; Drag to move</span>
			</div>

			<div
				bind:this={sliderEl}
				class="h-10 w-full rounded-full relative cursor-crosshair shadow-inner border border-white/10"
				style:background="linear-gradient(to right, {app.gradients.activeGradient.stops
					.slice()
					.sort((a, b) => a.position - b.position)
					.map((s) => `${s.color} ${s.position}%`)
					.join(', ')})"
				onclick={handleSliderClick}
				role="button"
				tabindex="0"
				aria-label="Gradient stops slider - click to add a color stop"
				onkeydown={() => {}}
			>
				{#each app.gradients.activeGradient.stops as stop, i}
					<div
						class={cn(
							"absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 shadow-lg transition-all",
							draggingStopIndex === i
								? "scale-125 border-phoenix-primary cursor-grabbing z-10"
								: "border-white cursor-grab hover:scale-110"
						)}
						style:left="{stop.position}%"
						style:background-color={stop.color}
						tabindex="0"
						role="slider"
						aria-label="Color stop at {stop.position}%"
						aria-valuenow={stop.position}
						aria-valuemin={0}
						aria-valuemax={100}
						onmousedown={(e) => startStopDrag(i, e)}
						onkeydown={(e) => handleStopKeydown(e, i, stop.position)}
					></div>
				{/each}
			</div>
			<div class="flex justify-between mt-1 text-[10px] text-text-muted font-mono">
				<span>0%</span>
				<span>50%</span>
				<span>100%</span>
			</div>
		</div>
	{/if}

	<!-- Empty State -->
	{#if !app.gradients.activeGradient && !isMeshMode}
		<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
			<div class="text-center text-text-muted/50 pointer-events-auto">
				<div
					class="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4"
				>
					<Icon icon="material-symbols:gradient" class="h-10 w-10 opacity-50" />
				</div>
				<h3 class="text-lg font-bold text-white mb-2">No Gradient Selected</h3>
				<p class="text-sm max-w-xs mx-auto mb-4">
					Select a gradient from the library or create a new one
				</p>
				{#if onBrowsePresets}
					<button
						class="btn btn-sm btn-ghost text-phoenix-primary"
						onclick={onBrowsePresets}
					>
						<Icon icon="material-symbols:palette" class="w-4 h-4" />
						Browse Presets
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
