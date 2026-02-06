<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import { onDestroy } from "svelte";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import GradientPreview from "./GradientPreview.svelte";
	import MeshGradientCanvas from "./MeshGradientCanvas.svelte";
	import type { MeshPoint, InterpolationMode } from "./gradient-utils";
	import { generateDefaultMeshPoints, generateMeshPointsFromColors } from "./gradient-utils";

	interface Props {
		interpolationMode: InterpolationMode;
		isMeshMode: boolean;
		meshPoints: MeshPoint[];
		noiseEnabled?: boolean;
		noiseIntensity?: number;
		noiseScale?: number;
		onMeshModeToggle: (enabled: boolean) => void;
		onMeshPointMove: (id: string, x: number, y: number) => void;
		onMeshPointAdd: (x: number, y: number, color: string) => void;
		onMeshPointRemove: (id: string) => void;
		onMeshPointColorChange: (id: string, color: string) => void;
		onMeshPointRadiusChange: (id: string, radius: number) => void;
		onStopPositionChange: (index: number, position: number) => void;
		onAngleChange: (angle: number) => void;
		onCenterChange: (x: number, y: number) => void;
		onModeChange: (mode: "linear" | "radial" | "conic") => void;
		onMeshPointsInit: (points: MeshPoint[]) => void;
	}

	let {
		interpolationMode,
		isMeshMode,
		meshPoints,
		noiseEnabled = false,
		noiseIntensity = 10,
		noiseScale = 1,
		onMeshModeToggle,
		onMeshPointMove,
		onMeshPointAdd,
		onMeshPointRemove,
		onMeshPointColorChange,
		onMeshPointRadiusChange,
		onStopPositionChange,
		onAngleChange,
		onCenterChange,
		onModeChange,
		onMeshPointsInit,
	} = $props();

	let previewSize = $state({ width: 600, height: 400 });
	let showInteractiveHandles = $state(true);
	let draggingStopIndex = $state<number | null>(null);

	// Track active drag listeners for cleanup on unmount
	let activeDragCleanup: (() => void) | null = null;

	// Handle stop drag
	function startStopDrag(index: number, e: MouseEvent) {
		e.stopPropagation();
		draggingStopIndex = index;

		const handleMove = (moveEvent: MouseEvent) => {
			if (draggingStopIndex === null) return;
			const slider = document.getElementById("gradient-stops-slider");
			if (!slider) return;
			const rect = slider.getBoundingClientRect();
			const position = Math.max(
				0,
				Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100)
			);
			onStopPositionChange(draggingStopIndex, position);
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
		// Future: Add new stop on click
	}

	function toggleMeshMode() {
		if (!isMeshMode) {
			// Switching to mesh mode
			if (meshPoints.length === 0) {
				const gradient = app.gradients.activeGradient;
				if (gradient && gradient.stops.length > 0) {
					const colors = gradient.stops.map((s) => s.color);
					onMeshPointsInit(generateMeshPointsFromColors(colors));
				} else {
					onMeshPointsInit(generateDefaultMeshPoints());
				}
			}
		}
		onMeshModeToggle(!isMeshMode);
	}
</script>

<div
	class="flex-1 flex flex-col h-full bg-black/20 rounded-2xl border border-white/5 relative overflow-hidden"
>
	<!-- Top Controls (Floating) -->
	<div
		class="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-1 bg-black/60 backdrop-blur-xl p-1.5 rounded-xl border border-white/10 shadow-2xl"
	>
		{#each ["linear", "radial", "conic"] as mode}
			<button
				class={cn(
					"px-4 py-1.5 rounded-lg text-xs font-semibold max-sm:px-2 transition-all capitalize tracking-wide",
					!isMeshMode && app.gradients.activeGradient?.type === mode
						? "bg-white/10 text-white shadow-lg border border-white/5"
						: "text-text-muted hover:text-white hover:bg-white/5"
				)}
				onclick={() => !isMeshMode && onModeChange(mode as "linear" | "radial" | "conic")}
				disabled={isMeshMode}
			>
				{mode}
			</button>
		{/each}
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
				onclick={() => isMeshMode && onMeshModeToggle(false)}
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
				title="Mesh gradient mode"
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
					onPointMove={onMeshPointMove}
					onPointAdd={onMeshPointAdd}
					onPointRemove={onMeshPointRemove}
					onPointColorChange={onMeshPointColorChange}
					onPointRadiusChange={onMeshPointRadiusChange}
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
				<span class="text-phoenix-primary">Drag to reposition</span>
			</div>

			<div
				id="gradient-stops-slider"
				class="h-8 w-full rounded-full relative cursor-pointer shadow-inner"
				style:background="linear-gradient(to right, {app.gradients.activeGradient.stops
					.slice()
					.sort((a, b) => a.position - b.position)
					.map((s) => `${s.color} ${s.position}%`)
					.join(', ')})"
				onclick={handleSliderClick}
				role="button"
				tabindex="0"
				onkeydown={(e) => e.key === "Enter" && handleSliderClick(e as unknown as MouseEvent)}
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
						aria-valuenow={stop.position}
						aria-valuemin={0}
						aria-valuemax={100}
						onmousedown={(e) => startStopDrag(i, e)}
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
		<div class="absolute inset-0 flex items-center justify-center">
			<div class="text-center text-text-muted/50">
				<div
					class="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4"
				>
					<Icon icon="material-symbols:gradient" class="h-10 w-10 opacity-50" />
				</div>
				<h3 class="text-lg font-bold text-white mb-2">No Gradient Selected</h3>
				<p class="text-sm max-w-xs mx-auto">
					Select a gradient from the library or create a new one
				</p>
			</div>
		</div>
	{/if}
</div>
