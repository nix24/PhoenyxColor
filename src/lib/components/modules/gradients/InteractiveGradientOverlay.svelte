<script lang="ts">
	import type { ValidatedGradient, ValidatedGradientStop } from "$lib/schemas/validation";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import type { MeshPoint, InterpolationMode } from "./gradient-utils";
	import { getContrastColor } from "./gradient-utils";

	interface Props {
		gradient: ValidatedGradient | null;
		meshPoints?: MeshPoint[];
		width: number;
		height: number;
		showHandles?: boolean;
		onAngleChange?: (angle: number) => void;
		onCenterChange?: (x: number, y: number) => void;
		onStopAdd?: (position: number, color: string) => void;
		onStopMove?: (index: number, position: number) => void;
		onStopColorChange?: (index: number, color: string) => void;
		onMeshPointMove?: (id: string, x: number, y: number) => void;
		onMeshPointAdd?: (x: number, y: number) => void;
	}

	let {
		gradient,
		meshPoints = [],
		width,
		height,
		showHandles = true,
		onAngleChange,
		onCenterChange,
		onStopAdd,
		onStopMove,
		onStopColorChange,
		onMeshPointMove,
		onMeshPointAdd,
	}: Props = $props();

	let overlayElement: SVGSVGElement;
	let isDragging = $state(false);
	let dragType = $state<"angle" | "center" | "stop" | "mesh" | null>(null);
	let dragIndex = $state(-1);
	let dragMeshId = $state<string | null>(null);
	let hoveredStop = $state(-1);
	let hoveredMeshId = $state<string | null>(null);

	// Calculate positions
	function getAngleHandlePosition(angle: number) {
		const rad = (angle * Math.PI) / 180;
		const radius = Math.min(width, height) * 0.35;
		return {
			x: width / 2 + Math.cos(rad) * radius,
			y: height / 2 + Math.sin(rad) * radius,
		};
	}

	function getAngleStartPosition(angle: number) {
		const rad = ((angle + 180) * Math.PI) / 180;
		const radius = Math.min(width, height) * 0.35;
		return {
			x: width / 2 + Math.cos(rad) * radius,
			y: height / 2 + Math.sin(rad) * radius,
		};
	}

	function getCenterPosition() {
		if (!gradient) return { x: width / 2, y: height / 2 };
		return {
			x: ((gradient.centerX || 50) / 100) * width,
			y: ((gradient.centerY || 50) / 100) * height,
		};
	}

	function getStopPosition(stop: ValidatedGradientStop, index: number) {
		if (!gradient || gradient.type !== "linear") return { x: 0, y: 0 };

		const angle = gradient.angle || 45;
		const rad = (angle * Math.PI) / 180;

		// Calculate the gradient line endpoints
		const startPos = getAngleStartPosition(angle);
		const endPos = getAngleHandlePosition(angle);

		// Interpolate position along the line
		const t = stop.position / 100;
		return {
			x: startPos.x + (endPos.x - startPos.x) * t,
			y: startPos.y + (endPos.y - startPos.y) * t,
		};
	}

	function handleMouseDown(
		e: MouseEvent,
		type: "angle" | "center" | "stop" | "mesh",
		index = -1,
		meshId?: string
	) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = true;
		dragType = type;
		dragIndex = index;
		dragMeshId = meshId || null;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging || !overlayElement) return;

		const rect = overlayElement.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (dragType === "angle" && gradient?.type === "linear" && onAngleChange) {
			const centerX = width / 2;
			const centerY = height / 2;
			const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
			onAngleChange(Math.round((angle + 360) % 360));
		} else if (dragType === "center" && onCenterChange) {
			const percentX = Math.max(0, Math.min(100, (x / width) * 100));
			const percentY = Math.max(0, Math.min(100, (y / height) * 100));
			onCenterChange(Math.round(percentX), Math.round(percentY));
		} else if (dragType === "stop" && dragIndex >= 0 && onStopMove && gradient?.type === "linear") {
			// Calculate position along the gradient line
			const angle = gradient.angle || 45;
			const rad = (angle * Math.PI) / 180;
			const startPos = getAngleStartPosition(angle);
			const endPos = getAngleHandlePosition(angle);

			// Project mouse position onto the gradient line
			const lineVec = { x: endPos.x - startPos.x, y: endPos.y - startPos.y };
			const lineLength = Math.sqrt(lineVec.x ** 2 + lineVec.y ** 2);
			const mouseVec = { x: x - startPos.x, y: y - startPos.y };

			// Dot product to find projection
			const dot = (mouseVec.x * lineVec.x + mouseVec.y * lineVec.y) / lineLength ** 2;
			const position = Math.max(0, Math.min(100, dot * 100));

			onStopMove(dragIndex, Math.round(position));
		} else if (dragType === "mesh" && dragMeshId && onMeshPointMove) {
			const percentX = Math.max(0, Math.min(100, (x / width) * 100));
			const percentY = Math.max(0, Math.min(100, (y / height) * 100));
			onMeshPointMove(dragMeshId, Math.round(percentX), Math.round(percentY));
		}
	}

	function handleMouseUp() {
		isDragging = false;
		dragType = null;
		dragIndex = -1;
		dragMeshId = null;
	}

	function handleDoubleClick(e: MouseEvent) {
		if (!overlayElement) return;

		const rect = overlayElement.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (meshPoints.length > 0 && onMeshPointAdd) {
			// Add mesh point
			const percentX = (x / width) * 100;
			const percentY = (y / height) * 100;
			onMeshPointAdd(percentX, percentY);
		} else if (gradient?.type === "linear" && onStopAdd) {
			// Add color stop on the gradient line
			const angle = gradient.angle || 45;
			const startPos = getAngleStartPosition(angle);
			const endPos = getAngleHandlePosition(angle);

			const lineVec = { x: endPos.x - startPos.x, y: endPos.y - startPos.y };
			const lineLength = Math.sqrt(lineVec.x ** 2 + lineVec.y ** 2);
			const mouseVec = { x: x - startPos.x, y: y - startPos.y };

			const dot = (mouseVec.x * lineVec.x + mouseVec.y * lineVec.y) / lineLength ** 2;
			const position = Math.max(0, Math.min(100, dot * 100));

			// Interpolate color at this position
			const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
			let color = "#808080";

			for (let i = 0; i < sortedStops.length - 1; i++) {
				const stop1 = sortedStops[i];
				const stop2 = sortedStops[i + 1];
				if (stop1 && stop2 && position >= stop1.position && position <= stop2.position) {
					// Simple linear interpolation - you could enhance this
					color = stop1.color;
					break;
				}
			}

			onStopAdd(position, color);
		}
	}
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg
	bind:this={overlayElement}
	class="absolute inset-0 pointer-events-auto"
	{width}
	{height}
	ondblclick={handleDoubleClick}
>
	{#if showHandles && gradient}
		<!-- Linear Gradient Controls -->
		{#if gradient.type === "linear"}
			{@const angle = gradient.angle || 45}
			{@const startPos = getAngleStartPosition(angle)}
			{@const endPos = getAngleHandlePosition(angle)}

			<!-- Gradient Line -->
			<line
				x1={startPos.x}
				y1={startPos.y}
				x2={endPos.x}
				y2={endPos.y}
				stroke="white"
				stroke-width="2"
				stroke-dasharray="6 4"
				opacity="0.6"
				class="pointer-events-none"
			/>

			<!-- Color Stop Handles on Line -->
			{#each gradient.stops as stop, index}
				{@const pos = getStopPosition(stop, index)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<g
					class="cursor-grab"
					class:cursor-grabbing={isDragging && dragType === "stop" && dragIndex === index}
					onmousedown={(e) => handleMouseDown(e, "stop", index)}
					onmouseenter={() => (hoveredStop = index)}
					onmouseleave={() => (hoveredStop = -1)}
				>
					<!-- Stop marker -->
					<circle
						cx={pos.x}
						cy={pos.y}
						r={hoveredStop === index || (isDragging && dragIndex === index) ? 12 : 10}
						fill={stop.color}
						stroke="white"
						stroke-width="2"
						class="transition-all duration-150"
					/>
					<!-- Position label -->
					{#if hoveredStop === index}
						<text
							x={pos.x}
							y={pos.y - 18}
							text-anchor="middle"
							fill="white"
							font-size="11"
							font-family="monospace"
							class="pointer-events-none"
						>
							{stop.position}%
						</text>
					{/if}
				</g>
			{/each}

			<!-- Center Point -->
			<circle
				cx={width / 2}
				cy={height / 2}
				r="5"
				fill="white"
				stroke="rgba(255,0,127,0.8)"
				stroke-width="2"
				class="pointer-events-none"
			/>

			<!-- Angle Handle (End) -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<g
				class="cursor-grab"
				class:cursor-grabbing={isDragging && dragType === "angle"}
				onmousedown={(e) => handleMouseDown(e, "angle")}
			>
				<circle
					cx={endPos.x}
					cy={endPos.y}
					r={isDragging && dragType === "angle" ? 14 : 12}
					fill="rgba(255,0,127,0.9)"
					stroke="white"
					stroke-width="2"
					class="transition-all duration-150"
				/>
				<text
					x={endPos.x}
					y={endPos.y + 4}
					text-anchor="middle"
					fill="white"
					font-size="10"
					font-weight="bold"
					class="pointer-events-none"
				>
					{angle}°
				</text>
			</g>
		{/if}

		<!-- Radial/Conic Center Control -->
		{#if gradient.type === "radial" || gradient.type === "conic"}
			{@const centerPos = getCenterPosition()}

			<!-- Crosshair lines -->
			<line
				x1={centerPos.x - 20}
				y1={centerPos.y}
				x2={centerPos.x + 20}
				y2={centerPos.y}
				stroke="white"
				stroke-width="1"
				opacity="0.5"
				class="pointer-events-none"
			/>
			<line
				x1={centerPos.x}
				y1={centerPos.y - 20}
				x2={centerPos.x}
				y2={centerPos.y + 20}
				stroke="white"
				stroke-width="1"
				opacity="0.5"
				class="pointer-events-none"
			/>

			<!-- Center Handle -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<g class="cursor-move" onmousedown={(e) => handleMouseDown(e, "center")}>
				<circle
					cx={centerPos.x}
					cy={centerPos.y}
					r={isDragging && dragType === "center" ? 16 : 14}
					fill="rgba(255,0,127,0.9)"
					stroke="white"
					stroke-width="2"
					class="transition-all duration-150"
				/>
				<circle cx={centerPos.x} cy={centerPos.y} r="4" fill="white" class="pointer-events-none" />
			</g>

			<!-- Position Label -->
			<text
				x={centerPos.x}
				y={centerPos.y + 30}
				text-anchor="middle"
				fill="white"
				font-size="11"
				font-family="monospace"
				class="pointer-events-none"
			>
				{gradient.centerX || 50}%, {gradient.centerY || 50}%
			</text>
		{/if}
	{/if}

	<!-- Mesh Point Handles -->
	{#if showHandles && meshPoints.length > 0}
		{#each meshPoints as point, index}
			{@const x = (point.x / 100) * width}
			{@const y = (point.y / 100) * height}
			{@const isHovered = hoveredMeshId === point.id}
			{@const isDragTarget = isDragging && dragMeshId === point.id}

			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<g
				class="cursor-grab"
				class:cursor-grabbing={isDragTarget}
				onmousedown={(e) => handleMouseDown(e, "mesh", -1, point.id)}
				onmouseenter={() => (hoveredMeshId = point.id)}
				onmouseleave={() => (hoveredMeshId = null)}
			>
				<!-- Radius indicator circle -->
				{#if isHovered || isDragTarget}
					<circle
						cx={x}
						cy={y}
						r={(point.radius / 100) * Math.min(width, height) * 0.5}
						fill="none"
						stroke={point.color}
						stroke-width="1"
						stroke-dasharray="4 4"
						opacity="0.5"
					/>
				{/if}

				<!-- Main handle -->
				<circle
					cx={x}
					cy={y}
					r={isHovered || isDragTarget ? 14 : 12}
					fill={point.color}
					stroke="white"
					stroke-width="2"
					class="transition-all duration-150"
				/>

				<!-- Inner dot -->
				<circle
					cx={x}
					cy={y}
					r="3"
					fill={getContrastColor(point.color)}
					class="pointer-events-none"
				/>

				<!-- Point number -->
				<text
					{x}
					y={y - 20}
					text-anchor="middle"
					fill="white"
					font-size="10"
					font-weight="bold"
					class="pointer-events-none"
				>
					{index + 1}
				</text>
			</g>
		{/each}
	{/if}

	<!-- Instructions Hint -->
	{#if showHandles && !isDragging}
		<text
			x={width / 2}
			y={height - 8}
			text-anchor="middle"
			fill="white"
			font-size="10"
			opacity="0.5"
			class="pointer-events-none"
		>
			Double-click to add • Drag handles to adjust
		</text>
	{/if}
</svg>
