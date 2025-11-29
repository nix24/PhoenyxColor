<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { onMount } from "svelte";

	type CurveChannel = "rgb" | "red" | "green" | "blue";
	type CurvePoint = { x: number; y: number };

	let { imageSrc, curves, onCurvesChange } = $props<{
		imageSrc: string;
		curves: {
			rgb: CurvePoint[];
			red: CurvePoint[];
			green: CurvePoint[];
			blue: CurvePoint[];
		};
		onCurvesChange: (curves: {
			rgb: CurvePoint[];
			red: CurvePoint[];
			green: CurvePoint[];
			blue: CurvePoint[];
		}) => void;
	}>();

	let activeChannel = $state<CurveChannel>("rgb");
	let histogramData = $state<number[]>([]);
	let canvasElement: HTMLCanvasElement;
	let isDragging = $state(false);
	let selectedPointIndex = $state<number | null>(null);

	const CANVAS_SIZE = 180;
	const channelColors: Record<CurveChannel, string> = {
		rgb: "#ffffff",
		red: "#ff4444",
		green: "#44ff44",
		blue: "#4444ff",
	};

	// Generate histogram from image
	async function generateHistogram() {
		const img = new Image();
		img.crossOrigin = "anonymous";

		await new Promise((resolve) => {
			img.onload = resolve;
			img.src = imageSrc;
		});

		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Downsample for performance
		const maxSize = 256;
		let width = img.naturalWidth;
		let height = img.naturalHeight;
		if (width > maxSize || height > maxSize) {
			const ratio = Math.min(maxSize / width, maxSize / height);
			width = Math.round(width * ratio);
			height = Math.round(height * ratio);
		}

		canvas.width = width;
		canvas.height = height;
		ctx.drawImage(img, 0, 0, width, height);

		const imageData = ctx.getImageData(0, 0, width, height);
		const data = imageData.data;
		const histogram = new Array(256).fill(0);

		// Calculate luminance histogram
		for (let i = 0; i < data.length; i += 4) {
			const r = data[i] ?? 0;
			const g = data[i + 1] ?? 0;
			const b = data[i + 2] ?? 0;
			const lum = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
			histogram[lum]++;
		}

		// Normalize
		const max = Math.max(...histogram);
		histogramData = histogram.map((v) => v / max);
	}

	// Draw curve canvas
	function drawCurve() {
		if (!canvasElement) return;
		const ctx = canvasElement.getContext("2d");
		if (!ctx) return;

		const size = CANVAS_SIZE;
		ctx.clearRect(0, 0, size, size);

		// Draw histogram background
		ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
		for (let i = 0; i < histogramData.length; i++) {
			const height = (histogramData[i] ?? 0) * size * 0.8;
			ctx.fillRect(i, size - height, 1, height);
		}

		// Draw grid
		ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
		ctx.lineWidth = 1;
		for (let i = 0; i <= 4; i++) {
			const pos = (size / 4) * i;
			ctx.beginPath();
			ctx.moveTo(pos, 0);
			ctx.lineTo(pos, size);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0, pos);
			ctx.lineTo(size, pos);
			ctx.stroke();
		}

		// Draw diagonal reference line
		ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
		ctx.setLineDash([5, 5]);
		ctx.beginPath();
		ctx.moveTo(0, size);
		ctx.lineTo(size, 0);
		ctx.stroke();
		ctx.setLineDash([]);

		// Draw curve for active channel
		const points = curves[activeChannel];
		if (points.length < 2) return;

		ctx.strokeStyle = channelColors[activeChannel];
		ctx.lineWidth = 2;
		ctx.beginPath();

		// Simple Catmull-Rom spline for smooth curve
		const curvePoints = interpolateCurve(points);
		ctx.moveTo(curvePoints[0]?.x ?? 0, size - (curvePoints[0]?.y ?? 0));
		for (let i = 1; i < curvePoints.length; i++) {
			const pt = curvePoints[i];
			if (pt) {
				ctx.lineTo(pt.x, size - pt.y);
			}
		}
		ctx.stroke();

		// Draw control points
		for (let i = 0; i < points.length; i++) {
			const pt = points[i];
			if (!pt) continue;

			ctx.fillStyle = selectedPointIndex === i ? "#ff007f" : channelColors[activeChannel];
			ctx.beginPath();
			ctx.arc(pt.x, size - pt.y, 6, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "#000";
			ctx.lineWidth = 1;
			ctx.stroke();
		}
	}

	// Interpolate curve points using Catmull-Rom spline
	function interpolateCurve(points: CurvePoint[]): CurvePoint[] {
		if (points.length < 2) return points;

		const sortedPoints = [...points].sort((a, b) => a.x - b.x);
		const result: CurvePoint[] = [];

		for (let i = 0; i < sortedPoints.length - 1; i++) {
			const p0 = sortedPoints[Math.max(0, i - 1)];
			const p1 = sortedPoints[i];
			const p2 = sortedPoints[i + 1];
			const p3 = sortedPoints[Math.min(sortedPoints.length - 1, i + 2)];

			if (!p0 || !p1 || !p2 || !p3) continue;

			for (let t = 0; t < 1; t += 0.05) {
				const t2 = t * t;
				const t3 = t2 * t;

				const x =
					0.5 *
					(2 * p1.x +
						(-p0.x + p2.x) * t +
						(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
						(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

				const y =
					0.5 *
					(2 * p1.y +
						(-p0.y + p2.y) * t +
						(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
						(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

				result.push({ x: Math.max(0, Math.min(255, x)), y: Math.max(0, Math.min(255, y)) });
			}
		}

		const lastPoint = sortedPoints[sortedPoints.length - 1];
		if (lastPoint) {
			result.push(lastPoint);
		}

		return result;
	}

	// Handle mouse interactions
	function handleMouseDown(e: MouseEvent) {
		const rect = canvasElement.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
		const y = CANVAS_SIZE - ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;

		// Check if clicking near existing point
		const points = curves[activeChannel];
		for (let i = 0; i < points.length; i++) {
			const pt = points[i];
			if (!pt) continue;
			const dist = Math.sqrt((pt.x - x) ** 2 + (pt.y - y) ** 2);
			if (dist < 12) {
				selectedPointIndex = i;
				isDragging = true;
				return;
			}
		}

		// Add new point
		const newPoints = [...points, { x, y }].sort((a, b) => a.x - b.x);
		const newIndex = newPoints.findIndex((p) => p.x === x && p.y === y);
		selectedPointIndex = newIndex;
		isDragging = true;

		const newCurves = { ...curves, [activeChannel]: newPoints };
		onCurvesChange(newCurves);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging || selectedPointIndex === null) return;

		const rect = canvasElement.getBoundingClientRect();
		const x = Math.max(0, Math.min(255, ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE));
		const y = Math.max(
			0,
			Math.min(255, CANVAS_SIZE - ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE)
		);

		const points = [...curves[activeChannel]];
		const point = points[selectedPointIndex];
		if (point) {
			// Don't move first and last points horizontally
			if (selectedPointIndex === 0) {
				points[selectedPointIndex] = { x: 0, y };
			} else if (selectedPointIndex === points.length - 1) {
				points[selectedPointIndex] = { x: 255, y };
			} else {
				points[selectedPointIndex] = { x, y };
			}
		}

		onCurvesChange({ ...curves, [activeChannel]: points.sort((a, b) => a.x - b.x) });
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function handleDoubleClick(e: MouseEvent) {
		// Remove point on double click (except first and last)
		if (selectedPointIndex !== null && selectedPointIndex > 0) {
			const points = curves[activeChannel];
			if (selectedPointIndex < points.length - 1) {
				const newPoints = points.filter((_i: number, i: number) => i !== selectedPointIndex);
				onCurvesChange({ ...curves, [activeChannel]: newPoints });
				selectedPointIndex = null;
			}
		}
	}

	function resetChannel() {
		onCurvesChange({
			...curves,
			[activeChannel]: [
				{ x: 0, y: 0 },
				{ x: 255, y: 255 },
			],
		});
	}

	function resetAll() {
		onCurvesChange({
			rgb: [
				{ x: 0, y: 0 },
				{ x: 255, y: 255 },
			],
			red: [
				{ x: 0, y: 0 },
				{ x: 255, y: 255 },
			],
			green: [
				{ x: 0, y: 0 },
				{ x: 255, y: 255 },
			],
			blue: [
				{ x: 0, y: 0 },
				{ x: 255, y: 255 },
			],
		});
	}

	$effect(() => {
		generateHistogram();
	});

	$effect(() => {
		drawCurve();
	});

	onMount(() => {
		drawCurve();
	});
</script>

<div class="space-y-4">
	<!-- Channel Selector -->
	<div class="flex gap-1 p-1 bg-white/5 rounded-lg">
		{#each ["rgb", "red", "green", "blue"] as channel}
			<button
				class={cn(
					"flex-1 py-2 px-3 rounded text-xs font-bold uppercase transition-all",
					activeChannel === channel
						? channel === "rgb"
							? "bg-white text-black"
							: channel === "red"
								? "bg-red-500 text-white"
								: channel === "green"
									? "bg-green-500 text-white"
									: "bg-blue-500 text-white"
						: "text-white/60 hover:text-white hover:bg-white/10"
				)}
				onclick={() => (activeChannel = channel as CurveChannel)}
			>
				{channel.toUpperCase()}
			</button>
		{/each}
	</div>

	<!-- Curve Canvas -->
	<div class="relative bg-black rounded-lg overflow-hidden border border-white/10">
		<canvas
			bind:this={canvasElement}
			width={CANVAS_SIZE}
			height={CANVAS_SIZE}
			class="w-full aspect-square cursor-crosshair"
			onmousedown={handleMouseDown}
			onmousemove={handleMouseMove}
			onmouseup={handleMouseUp}
			onmouseleave={handleMouseUp}
			ondblclick={handleDoubleClick}
		></canvas>

		<!-- Axis Labels -->
		<div class="absolute bottom-1 left-1 text-[10px] text-white/40">Shadows</div>
		<div class="absolute bottom-1 right-1 text-[10px] text-white/40">Highlights</div>
		<div class="absolute top-1 left-1 text-[10px] text-white/40">Output</div>
	</div>

	<!-- Instructions -->
	<div class="text-xs text-white/40 text-center">
		Click to add point • Drag to adjust • Double-click to remove
	</div>

	<!-- Quick Actions -->
	<div class="grid grid-cols-2 gap-2">
		<button
			class="btn btn-xs bg-white/5 border-white/10 text-white hover:bg-white/10"
			onclick={resetChannel}
		>
			<Icon icon="material-symbols:refresh" class="w-3 h-3" />
			Reset {activeChannel.toUpperCase()}
		</button>
		<button
			class="btn btn-xs bg-white/5 border-white/10 text-white hover:bg-white/10"
			onclick={resetAll}
		>
			<Icon icon="material-symbols:restart-alt" class="w-3 h-3" />
			Reset All
		</button>
	</div>

	<!-- Presets -->
	<div class="space-y-2">
		<span class="text-xs text-white/50">Presets</span>
		<div class="grid grid-cols-3 gap-2">
			<button
				class="btn btn-xs bg-white/5 border-white/10 text-white hover:bg-white/10"
				onclick={() =>
					onCurvesChange({
						...curves,
						[activeChannel]: [
							{ x: 0, y: 30 },
							{ x: 128, y: 128 },
							{ x: 255, y: 225 },
						],
					})}
			>
				Contrast+
			</button>
			<button
				class="btn btn-xs bg-white/5 border-white/10 text-white hover:bg-white/10"
				onclick={() =>
					onCurvesChange({
						...curves,
						[activeChannel]: [
							{ x: 0, y: 0 },
							{ x: 64, y: 80 },
							{ x: 192, y: 210 },
							{ x: 255, y: 255 },
						],
					})}
			>
				Brighten
			</button>
			<button
				class="btn btn-xs bg-white/5 border-white/10 text-white hover:bg-white/10"
				onclick={() =>
					onCurvesChange({
						...curves,
						[activeChannel]: [
							{ x: 0, y: 0 },
							{ x: 64, y: 50 },
							{ x: 192, y: 175 },
							{ x: 255, y: 255 },
						],
					})}
			>
				Darken
			</button>
		</div>
	</div>
</div>
