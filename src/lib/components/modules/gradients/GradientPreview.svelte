<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedGradient, ValidatedGradientStop } from "$lib/schemas/validation";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";
	import {
		generateCSSGradient,
		type InterpolationMode,
		type MeshPoint,
		generateMeshGradientCSS,
	} from "./gradient-utils";

	interface Props {
		gradient: ValidatedGradient | null;
		meshPoints?: MeshPoint[];
		interpolationMode?: InterpolationMode;
		previewSize?: { width: number; height: number };
		showInteractiveHandles?: boolean;
		onAngleChange?: (angle: number) => void;
		onCenterChange?: (x: number, y: number) => void;
		onStopPositionChange?: (index: number, position: number) => void;
		onMeshPointMove?: (id: string, x: number, y: number) => void;
	}

	let {
		gradient,
		meshPoints = [],
		interpolationMode = "oklch",
		previewSize = { width: 400, height: 200 },
		showInteractiveHandles = false,
		onAngleChange,
		onCenterChange,
		onStopPositionChange,
		onMeshPointMove,
	}: Props = $props();

	let previewContainer: HTMLDivElement;
	let isDragging = $state(false);
	let dragTarget = $state<"angle" | "center" | "stop" | "mesh" | null>(null);
	let dragIndex = $state(-1);
	let dragMeshId = $state<string | null>(null);

	// Calculate gradient CSS
	let gradientCSS = $derived(
		meshPoints.length > 0
			? generateMeshGradientCSS(meshPoints)
			: generateCSSGradient(gradient, interpolationMode)
	);

	// Calculate handle positions for linear gradient
	let angleHandlePosition = $derived(() => {
		if (!gradient || gradient.type !== "linear") return null;
		const angle = gradient.angle || 45;
		const rad = (angle * Math.PI) / 180;
		const radius = Math.min(previewSize.width, previewSize.height) * 0.4;
		return {
			x: previewSize.width / 2 + Math.cos(rad) * radius,
			y: previewSize.height / 2 + Math.sin(rad) * radius,
		};
	});

	// Calculate center handle position for radial/conic
	let centerHandlePosition = $derived(() => {
		if (!gradient || (gradient.type !== "radial" && gradient.type !== "conic")) return null;
		return {
			x: ((gradient.centerX || 50) / 100) * previewSize.width,
			y: ((gradient.centerY || 50) / 100) * previewSize.height,
		};
	});

	function handleMouseDown(
		e: MouseEvent,
		target: "angle" | "center" | "stop" | "mesh",
		index = -1,
		meshId?: string
	) {
		if (!showInteractiveHandles) return;
		e.preventDefault();
		e.stopPropagation();
		isDragging = true;
		dragTarget = target;
		dragIndex = index;
		dragMeshId = meshId || null;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging || !previewContainer) return;

		const rect = previewContainer.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (dragTarget === "angle" && gradient?.type === "linear" && onAngleChange) {
			const centerX = previewSize.width / 2;
			const centerY = previewSize.height / 2;
			const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
			onAngleChange(Math.round((angle + 360) % 360));
		} else if (dragTarget === "center" && onCenterChange) {
			const percentX = Math.max(0, Math.min(100, (x / previewSize.width) * 100));
			const percentY = Math.max(0, Math.min(100, (y / previewSize.height) * 100));
			onCenterChange(Math.round(percentX), Math.round(percentY));
		} else if (dragTarget === "stop" && dragIndex >= 0 && onStopPositionChange) {
			// Calculate position along the gradient line
			const position = Math.max(0, Math.min(100, (x / previewSize.width) * 100));
			onStopPositionChange(dragIndex, Math.round(position));
		} else if (dragTarget === "mesh" && dragMeshId && onMeshPointMove) {
			const percentX = Math.max(0, Math.min(100, (x / previewSize.width) * 100));
			const percentY = Math.max(0, Math.min(100, (y / previewSize.height) * 100));
			onMeshPointMove(dragMeshId, Math.round(percentX), Math.round(percentY));
		}
	}

	function handleMouseUp() {
		isDragging = false;
		dragTarget = null;
		dragIndex = -1;
		dragMeshId = null;
	}

	function getStopHandleX(position: number): number {
		return (position / 100) * previewSize.width;
	}
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div
	bind:this={previewContainer}
	class="relative rounded-xl overflow-hidden shadow-2xl border border-white/10 w-full h-full"
>
	<!-- Checkerboard Background (for transparency) -->
	<div
		class="absolute inset-0 opacity-20"
		style="background-image: linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #444 75%), linear-gradient(-45deg, transparent 75%, #444 75%); background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0px;"
	></div>

	<!-- Gradient -->
	<div class="absolute inset-0 transition-all duration-300" style:background={gradientCSS}></div>

	<!-- Interactive Handles Overlay -->
	{#if showInteractiveHandles && gradient}
		<!-- Linear Gradient Angle Handle -->
		{#if gradient.type === "linear"}
			{@const pos = angleHandlePosition()}
			{#if pos}
				<!-- Angle line -->
				<svg class="absolute inset-0 pointer-events-none" style:width="100%" style:height="100%">
					<line
						x1={previewSize.width / 2}
						y1={previewSize.height / 2}
						x2={pos.x}
						y2={pos.y}
						stroke="white"
						stroke-width="2"
						stroke-dasharray="4 4"
						opacity="0.6"
					/>
				</svg>

				<!-- Center point -->
				<div
					class="absolute w-3 h-3 bg-white rounded-full border-2 border-phoenix-primary shadow-lg pointer-events-none"
					style:left="{previewSize.width / 2 - 6}px"
					style:top="{previewSize.height / 2 - 6}px"
				></div>

				<!-- Angle handle -->
				<button
					class={cn(
						"absolute w-5 h-5 bg-phoenix-primary rounded-full border-2 border-white shadow-lg cursor-grab transition-transform hover:scale-125",
						isDragging && dragTarget === "angle" && "cursor-grabbing scale-125"
					)}
					style:left="{pos.x - 10}px"
					style:top="{pos.y - 10}px"
					onmousedown={(e) => handleMouseDown(e, "angle")}
					title="Drag to change angle"
				>
					<Icon
						icon="material-symbols:rotate-right"
						class="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
					/>
				</button>
			{/if}
		{/if}

		<!-- Radial/Conic Center Handle -->
		{#if gradient.type === "radial" || gradient.type === "conic"}
			{@const pos = centerHandlePosition()}
			{#if pos}
				<button
					class={cn(
						"absolute w-6 h-6 bg-phoenix-primary rounded-full border-2 border-white shadow-lg cursor-grab transition-transform hover:scale-125 flex items-center justify-center",
						isDragging && dragTarget === "center" && "cursor-grabbing scale-125"
					)}
					style:left="{pos.x - 12}px"
					style:top="{pos.y - 12}px"
					onmousedown={(e) => handleMouseDown(e, "center")}
					title="Drag to move center"
				>
					<Icon icon="material-symbols:my-location" class="w-4 h-4 text-white" />
				</button>
			{/if}
		{/if}

		<!-- Color Stop Handles (for linear gradients) -->
		{#if gradient.type === "linear" && gradient.stops}
			<div class="absolute bottom-0 left-0 right-0 h-8 bg-black/30 backdrop-blur-sm">
				{#each gradient.stops as stop, index}
					<button
						class={cn(
							"absolute w-4 h-6 rounded-t-full cursor-grab transition-transform hover:scale-110 border-2 border-white shadow-lg",
							isDragging &&
								dragTarget === "stop" &&
								dragIndex === index &&
								"cursor-grabbing scale-110"
						)}
						style:left="{getStopHandleX(stop.position) - 8}px"
						style:bottom="0"
						style:background-color={stop.color}
						onmousedown={(e) => handleMouseDown(e, "stop", index)}
						title="Drag to move stop (Position: {stop.position}%)"
					></button>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Mesh Points -->
	{#if showInteractiveHandles && meshPoints.length > 0}
		{#each meshPoints as point}
			<button
				class={cn(
					"absolute w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-grab transition-transform hover:scale-125 flex items-center justify-center",
					isDragging && dragMeshId === point.id && "cursor-grabbing scale-125"
				)}
				style:left="{(point.x / 100) * previewSize.width - 12}px"
				style:top="{(point.y / 100) * previewSize.height - 12}px"
				style:background-color={point.color}
				onmousedown={(e) => handleMouseDown(e, "mesh", -1, point.id)}
				title="Drag to move mesh point"
			>
				<Icon icon="material-symbols:drag-indicator" class="w-3 h-3 text-white/80" />
			</button>
		{/each}
	{/if}

	<!-- Gradient Info Overlay -->
	{#if gradient}
		<div
			class="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-white/80 pointer-events-none"
		>
			{gradient.type}
			{#if gradient.type === "linear"}
				• {gradient.angle || 45}°
			{:else if gradient.type === "radial" || gradient.type === "conic"}
				• {gradient.centerX || 50}%, {gradient.centerY || 50}%
			{/if}
		</div>
	{/if}
</div>
