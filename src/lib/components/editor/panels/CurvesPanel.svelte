<script lang="ts">
import Icon from "@iconify/svelte";
import { cn } from "$lib/utils/cn";
import { onMount } from "svelte";
import { sampleCurve } from "$lib/features/references";

type CurveChannel = "rgb" | "red" | "green" | "blue";
type CurvePoint = { x: number; y: number };

let { imageSrc, curves, onCurvesChange, onCurvesPreview, onCurvesCommit } = $props<{
	imageSrc: string;
	curves: {
		rgb: CurvePoint[];
		red: CurvePoint[];
		green: CurvePoint[];
		blue: CurvePoint[];
	};
	/** One undo step (a reset, or a point removed). */
	onCurvesChange: (curves: {
		rgb: CurvePoint[];
		red: CurvePoint[];
		green: CurvePoint[];
		blue: CurvePoint[];
	}) => void;
	/** A point being added or dragged: shown, not recorded. */
	onCurvesPreview: (curves: {
		rgb: CurvePoint[];
		red: CurvePoint[];
		green: CurvePoint[];
		blue: CurvePoint[];
	}) => void;
	/** Records the previewed drag as one undo step (no-op when nothing moved). */
	onCurvesCommit: () => void;
}>();

let activeChannel = $state<CurveChannel>("rgb");
let histogramData = $state<number[]>([]);
let canvasElement: HTMLCanvasElement;
let isDragging = $state(false);
let selectedPointIndex = $state<number | null>(null);

const CANVAS_SIZE = 180;
const DATA_RANGE = 255;
const SCALE_FACTOR = CANVAS_SIZE / DATA_RANGE;
const channelColors = {
	rgb: "#ffffff",
	red: "#ff4444",
	green: "#44ff44",
	blue: "#4444ff",
} satisfies Record<CurveChannel, string>;

async function generateHistogram() {
	const img = await createImageBitmap(await (await fetch(imageSrc)).blob(), {
		imageOrientation: "from-image",
	});

	const maxSize = 256;
	let width = img.width;
	let height = img.height;
	if (width > maxSize || height > maxSize) {
		const ratio = Math.min(maxSize / width, maxSize / height);
		width = Math.max(1, Math.round(width * ratio));
		height = Math.max(1, Math.round(height * ratio));
	}

	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	ctx.drawImage(img, 0, 0, width, height);
	img.close();

	const imageData = ctx.getImageData(0, 0, width, height);
	const data = imageData.data;
	const histogram = Array.from({ length: 256 }, () => 0);

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i] ?? 0;
		const g = data[i + 1] ?? 0;
		const b = data[i + 2] ?? 0;
		const lum = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
		histogram[lum] = (histogram[lum] ?? 0) + 1;
	}

	const max = Math.max(...histogram);
	histogramData = histogram.map((v) => v / max);
}

function drawCurve() {
	if (!canvasElement) return;
	const ctx = canvasElement.getContext("2d");
	if (!ctx) return;

	const size = CANVAS_SIZE;
	ctx.clearRect(0, 0, size, size);

	ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
	for (let i = 0; i < histogramData.length; i++) {
		const height = (histogramData[i] ?? 0) * size * 0.8;
		const scaledX = i * SCALE_FACTOR;
		ctx.fillRect(scaledX, size - height, SCALE_FACTOR, height);
	}

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

	ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
	ctx.setLineDash([5, 5]);
	ctx.beginPath();
	ctx.moveTo(0, size);
	ctx.lineTo(size, 0);
	ctx.stroke();
	ctx.setLineDash([]);

	const points = curves[activeChannel];
	if (points.length < 2) return;

	ctx.strokeStyle = channelColors[activeChannel];
	ctx.lineWidth = 2;
	ctx.beginPath();

	const curvePoints = sampleCurve(points);
	const scaledX0 = (curvePoints[0]?.x ?? 0) * SCALE_FACTOR;
	const scaledY0 = size - (curvePoints[0]?.y ?? 0) * SCALE_FACTOR;
	ctx.moveTo(scaledX0, scaledY0);
	for (let i = 1; i < curvePoints.length; i++) {
		const pt = curvePoints[i];
		if (pt) {
			const scaledX = pt.x * SCALE_FACTOR;
			const scaledY = size - pt.y * SCALE_FACTOR;
			ctx.lineTo(scaledX, scaledY);
		}
	}
	ctx.stroke();

	for (let i = 0; i < points.length; i++) {
		const pt = points[i];
		if (!pt) continue;

		const scaledX = pt.x * SCALE_FACTOR;
		const scaledY = size - pt.y * SCALE_FACTOR;

		ctx.fillStyle = selectedPointIndex === i ? "#ff007f" : channelColors[activeChannel];
		ctx.beginPath();
		ctx.arc(scaledX, scaledY, 6, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 1;
		ctx.stroke();
	}
}

function handleMouseDown(e: MouseEvent) {
	const rect = canvasElement.getBoundingClientRect();
	const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
	const y = CANVAS_SIZE - ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;

	const dataX = (x / CANVAS_SIZE) * DATA_RANGE;
	const dataY = (y / CANVAS_SIZE) * DATA_RANGE;
	const points = curves[activeChannel];
	for (let i = 0; i < points.length; i++) {
		const pt = points[i];
		if (!pt) continue;
		const dist = Math.sqrt((pt.x - dataX) ** 2 + (pt.y - dataY) ** 2);
		if (dist < 12) {
			selectedPointIndex = i;
			isDragging = true;
			return;
		}
	}

	const newDataX = Math.max(0, Math.min(DATA_RANGE, (x / CANVAS_SIZE) * DATA_RANGE));
	const newDataY = Math.max(0, Math.min(DATA_RANGE, (y / CANVAS_SIZE) * DATA_RANGE));
	const newPoints = [...points, { x: newDataX, y: newDataY }].sort((a, b) => a.x - b.x);
	const newIndex = newPoints.findIndex((p) => p.x === newDataX && p.y === newDataY);
	selectedPointIndex = newIndex;
	isDragging = true;

	const newCurves = { ...curves, [activeChannel]: newPoints };
	onCurvesPreview(newCurves);
}

function handleMouseMove(e: MouseEvent) {
	if (!isDragging || selectedPointIndex === null) return;

	const rect = canvasElement.getBoundingClientRect();
	const canvasX = Math.max(
		0,
		Math.min(CANVAS_SIZE, ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE),
	);
	const canvasY = Math.max(
		0,
		Math.min(CANVAS_SIZE, CANVAS_SIZE - ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE),
	);
	const x = Math.max(0, Math.min(DATA_RANGE, (canvasX / CANVAS_SIZE) * DATA_RANGE));
	const y = Math.max(0, Math.min(DATA_RANGE, (canvasY / CANVAS_SIZE) * DATA_RANGE));

	const points = [...curves[activeChannel]];
	const point = points[selectedPointIndex];
	if (point) {
		if (selectedPointIndex === 0) {
			points[selectedPointIndex] = { x: 0, y };
		} else if (selectedPointIndex === points.length - 1) {
			points[selectedPointIndex] = { x: DATA_RANGE, y };
		} else {
			points[selectedPointIndex] = { x, y };
		}
	}

	onCurvesPreview({ ...curves, [activeChannel]: points.sort((a, b) => a.x - b.x) });
}

function handleMouseUp() {
	if (isDragging) onCurvesCommit();
	isDragging = false;
}

function handleDoubleClick(_e: MouseEvent) {
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
			{ x: DATA_RANGE, y: DATA_RANGE },
		],
	});
}

function resetAll() {
	onCurvesChange({
		rgb: [
			{ x: 0, y: 0 },
			{ x: DATA_RANGE, y: DATA_RANGE },
		],
		red: [
			{ x: 0, y: 0 },
			{ x: DATA_RANGE, y: DATA_RANGE },
		],
		green: [
			{ x: 0, y: 0 },
			{ x: DATA_RANGE, y: DATA_RANGE },
		],
		blue: [
			{ x: 0, y: 0 },
			{ x: DATA_RANGE, y: DATA_RANGE },
		],
	});
}

$effect(() => {
	generateHistogram().catch((error) => {
		console.error("Failed to generate histogram:", error);
	});
});

$effect(() => {
	drawCurve();
});

onMount(() => {
	drawCurve();
});
</script>

<div class="space-y-4">
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

		<div class="absolute bottom-1 left-1 text-[10px] text-white/60">Shadows</div>
		<div class="absolute bottom-1 right-1 text-[10px] text-white/60">Highlights</div>
		<div class="absolute top-1 left-1 text-[10px] text-white/60">Output</div>
	</div>

	<div class="text-xs text-white/60 text-center">
		Click to add point • Drag to adjust • Double-click to remove
	</div>

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

	<div class="space-y-2">
		<span class="text-xs text-white/60">Presets</span>
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
