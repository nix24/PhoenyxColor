<script lang="ts">
import { cn } from "$lib/utils/cn";
import type { CropRect } from "$lib/types/image-editor";
import type { CropGuideType } from "$lib/types/image-editor";

interface Props {
	cropRect: CropRect;
	guideType: CropGuideType;
	imageWidth: number;
	imageHeight: number;
	/** The canvas zoom; handles and labels are drawn at screen size, not image size. */
	zoom: number;
	onHandleDragStart: (handle: string, e: PointerEvent) => void;
	onBodyDragStart: (e: PointerEvent) => void;
}

const {
	cropRect,
	guideType,
	imageWidth,
	imageHeight,
	zoom,
	onHandleDragStart,
	onBodyDragStart,
}: Props = $props();

const HANDLE_SIZE = 16;
/** Screen pixels a handle answers to: a finger needs more than a mouse. */
const HANDLE_HIT_AREA = window.matchMedia("(pointer: coarse)").matches ? 44 : 24;
/** Image pixels per screen pixel, so the overlay keeps its screen size at any zoom. */
const unit = $derived(1 / Math.max(zoom, 0.01));

type HandleId =
	| "top-left"
	| "top"
	| "top-right"
	| "right"
	| "bottom-right"
	| "bottom"
	| "bottom-left"
	| "left";

const handles: Array<{
	id: HandleId;
	cursor: string;
	getPos: (r: CropRect) => { x: number; y: number };
}> = [
	{ id: "top-left", cursor: "nwse-resize", getPos: (r) => ({ x: r.x, y: r.y }) },
	{ id: "top", cursor: "ns-resize", getPos: (r) => ({ x: r.x + r.width / 2, y: r.y }) },
	{ id: "top-right", cursor: "nesw-resize", getPos: (r) => ({ x: r.x + r.width, y: r.y }) },
	{
		id: "right",
		cursor: "ew-resize",
		getPos: (r) => ({ x: r.x + r.width, y: r.y + r.height / 2 }),
	},
	{
		id: "bottom-right",
		cursor: "nwse-resize",
		getPos: (r) => ({ x: r.x + r.width, y: r.y + r.height }),
	},
	{
		id: "bottom",
		cursor: "ns-resize",
		getPos: (r) => ({ x: r.x + r.width / 2, y: r.y + r.height }),
	},
	{ id: "bottom-left", cursor: "nesw-resize", getPos: (r) => ({ x: r.x, y: r.y + r.height }) },
	{ id: "left", cursor: "ew-resize", getPos: (r) => ({ x: r.x, y: r.y + r.height / 2 }) },
];

const isCorner = (id: string) =>
	id === "top-left" || id === "top-right" || id === "bottom-left" || id === "bottom-right";

// Golden ratio = 1 / phi ≈ 0.618
const PHI = 0.618;

const dimensionLabel = $derived(`${Math.round(cropRect.width)} × ${Math.round(cropRect.height)}`);
</script>

<!-- Full-image dark overlay with crop region cut out via box-shadow -->
<div class="absolute inset-0 pointer-events-none" style:z-index="10">
	<div
		class="absolute border-white/90"
		style:border-width="{2 * unit}px"
		style:left="{cropRect.x}px"
		style:top="{cropRect.y}px"
		style:width="{cropRect.width}px"
		style:height="{cropRect.height}px"
		style:box-shadow="0 0 0 9999px rgba(0,0,0,0.6)"
	>
		{#if guideType === "thirds"}
			<svg class="absolute inset-0 w-full h-full" viewBox="0 0 {cropRect.width} {cropRect.height}" preserveAspectRatio="none">
				<line x1={cropRect.width / 3} y1="0" x2={cropRect.width / 3} y2={cropRect.height} stroke="white" stroke-opacity="0.4" stroke-width="1" />
				<line x1={(cropRect.width * 2) / 3} y1="0" x2={(cropRect.width * 2) / 3} y2={cropRect.height} stroke="white" stroke-opacity="0.4" stroke-width="1" />
				<line x1="0" y1={cropRect.height / 3} x2={cropRect.width} y2={cropRect.height / 3} stroke="white" stroke-opacity="0.4" stroke-width="1" />
				<line x1="0" y1={(cropRect.height * 2) / 3} x2={cropRect.width} y2={(cropRect.height * 2) / 3} stroke="white" stroke-opacity="0.4" stroke-width="1" />
			</svg>
		{:else if guideType === "golden"}
			<svg class="absolute inset-0 w-full h-full" viewBox="0 0 {cropRect.width} {cropRect.height}" preserveAspectRatio="none">
				<line x1={cropRect.width * PHI} y1="0" x2={cropRect.width * PHI} y2={cropRect.height} stroke="white" stroke-opacity="0.35" stroke-width="1" />
				<line x1={cropRect.width * (1 - PHI)} y1="0" x2={cropRect.width * (1 - PHI)} y2={cropRect.height} stroke="white" stroke-opacity="0.35" stroke-width="1" />
				<line x1="0" y1={cropRect.height * PHI} x2={cropRect.width} y2={cropRect.height * PHI} stroke="white" stroke-opacity="0.35" stroke-width="1" />
				<line x1="0" y1={cropRect.height * (1 - PHI)} x2={cropRect.width} y2={cropRect.height * (1 - PHI)} stroke="white" stroke-opacity="0.35" stroke-width="1" />
			</svg>
		{:else if guideType === "diagonal"}
			<svg class="absolute inset-0 w-full h-full" viewBox="0 0 {cropRect.width} {cropRect.height}" preserveAspectRatio="none">
				<line x1="0" y1="0" x2={cropRect.width} y2={cropRect.height} stroke="white" stroke-opacity="0.3" stroke-width="1" />
				<line x1={cropRect.width} y1="0" x2="0" y2={cropRect.height} stroke="white" stroke-opacity="0.3" stroke-width="1" />
			</svg>
		{/if}

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute inset-0 pointer-events-auto"
			style:cursor="move"
			onpointerdown={(e) => { e.preventDefault(); onBodyDragStart(e); }}
		></div>
	</div>

	{#each handles as handle}
		{@const pos = handle.getPos(cropRect)}
		{@const corner = isCorner(handle.id)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="absolute pointer-events-auto"
			style:left="{pos.x - (HANDLE_HIT_AREA * unit) / 2}px"
			style:top="{pos.y - (HANDLE_HIT_AREA * unit) / 2}px"
			style:width="{HANDLE_HIT_AREA * unit}px"
			style:height="{HANDLE_HIT_AREA * unit}px"
			style:cursor={handle.cursor}
			onpointerdown={(e) => { e.preventDefault(); e.stopPropagation(); onHandleDragStart(handle.id, e); }}
		>
			<div
				class={cn(
					"absolute bg-white border-2 border-phoenix-primary shadow-md",
					"left-1/2 top-1/2",
					corner ? "w-3.5 h-3.5 rounded-full" : "rounded-sm",
					!corner && (handle.id === "top" || handle.id === "bottom") && "w-6 h-2",
					!corner && (handle.id === "left" || handle.id === "right") && "w-2 h-6",
				)}
				style:transform="translate(-50%, -50%) scale({unit})"
			></div>
		</div>
	{/each}

	{#if cropRect.width * zoom > 60 && cropRect.height * zoom > 40}
		<div
			class="absolute pointer-events-none"
			style:left="{cropRect.x + cropRect.width / 2}px"
			style:top="{cropRect.y + cropRect.height + 8 * unit}px"
			style:transform="translateX(-50%) scale({unit})"
			style:transform-origin="top center"
		>
			<span class="px-2 py-0.5 rounded bg-black/70 text-white text-xs font-mono whitespace-nowrap">
				{dimensionLabel}
			</span>
		</div>
	{/if}
</div>
