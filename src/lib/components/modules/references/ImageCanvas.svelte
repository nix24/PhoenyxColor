<script lang="ts">
import Icon from "@iconify/svelte";
import { app } from "$lib/stores/root.svelte";
import type { CropRect } from "$lib/components/editor/panels/CropPanel.svelte";
import type { CropGuideType } from "$lib/types/image-editor";
import type { usePanZoom } from "$lib/hooks/usePanZoom.svelte";
import CropOverlay from "./CropOverlay.svelte";

interface Props {
	imageName: string;
	/** Full-resolution size of what the canvas shows; the canvas is laid out at this size. */
	displayWidth: number;
	displayHeight: number;
	previewError: string | null;
	// Crop interaction (the crop view shows the whole, upright source, so these are source pixels)
	isCropping: boolean;
	isDrawing: boolean;
	cropRect: CropRect | null;
	cropGuideType: CropGuideType;
	// Pan/zoom
	panZoom: ReturnType<typeof usePanZoom>;
	// Callbacks
	/** The engine draws into this canvas; called once it is in the DOM. */
	onCanvasReady: (canvas: HTMLCanvasElement) => void;
	onCropStart: (e: PointerEvent) => void;
	onCropMove: (e: PointerEvent) => void;
	onCropEnd: () => void;
	onCropHandleDragStart: (handle: string, e: PointerEvent) => void;
	onCropBodyDragStart: (e: PointerEvent) => void;
	onDrawStart: (e: PointerEvent) => void;
	onDrawMove: (e: PointerEvent) => void;
	onDrawEnd: () => void;
	onRetryPreview: () => void;
}

const {
	imageName,
	displayWidth,
	displayHeight,
	previewError,
	isCropping,
	isDrawing,
	cropRect,
	cropGuideType,
	panZoom,
	onCanvasReady,
	onCropStart,
	onCropMove,
	onCropEnd,
	onCropHandleDragStart,
	onCropBodyDragStart,
	onDrawStart,
	onDrawMove,
	onDrawEnd,
	onRetryPreview,
}: Props = $props();

let canvasContainer: HTMLDivElement | null = $state(null);
let previewCanvas: HTMLCanvasElement | null = $state(null);

$effect(() => {
	if (previewCanvas) onCanvasReady(previewCanvas);
});

function handlePointerDown(e: PointerEvent) {
	if (isDrawing) {
		// SAFETY: this handler is bound to the canvas container `<div>`, so `currentTarget`
		// is always an HTMLElement.
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		onDrawStart(e);
		return;
	}
	if (isCropping) {
		onCropStart(e);
		return;
	}
	panZoom.handleMouseDown(e);
}

function handlePointerMove(e: PointerEvent) {
	if (isDrawing) {
		onDrawMove(e);
		return;
	}
	if (isCropping) {
		onCropMove(e);
		return;
	}
	panZoom.handleMouseMove(e);
}

function handlePointerUp() {
	if (isDrawing) {
		onDrawEnd();
		return;
	}
	if (isCropping) {
		onCropEnd();
		return;
	}
	panZoom.handleMouseUp();
}
</script>

<div
	bind:this={canvasContainer}
	class="flex-1 relative overflow-hidden flex items-center justify-center select-none touch-none"
	data-editor-canvas
	onwheel={panZoom.handleWheel}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointerleave={handlePointerUp}
	ontouchstart={panZoom.handleTouchStart}
	ontouchmove={panZoom.handleTouchMove}
	ontouchend={panZoom.handleTouchEnd}
	style:cursor={isCropping || isDrawing ? "crosshair" : panZoom.isPanning ? "grabbing" : "grab"}
	role="presentation"
>
	<!-- Checkered Background -->
	<div class="absolute inset-0 bg-checkered opacity-30"></div>

	<!-- Canvas Content -->
	<div
		class="relative transition-transform duration-75 ease-out will-change-transform"
		style:transform="translate({panZoom.panX}px, {panZoom.panY}px) scale({panZoom.zoom})"
		data-image-inner
	>
		<!-- Image Container: the engine renders every edit, layer and stroke into this canvas -->
		<div class="relative">
			<canvas
				bind:this={previewCanvas}
				class="max-w-none shadow-2xl"
				style:width="{displayWidth}px"
				style:height="{displayHeight}px"
				aria-label={imageName}
			></canvas>
		</div>

		<!-- Crop Overlay -->
		{#if isCropping && cropRect}
			<CropOverlay
				{cropRect}
				guideType={cropGuideType}
				imageWidth={displayWidth}
				imageHeight={displayHeight}
				onHandleDragStart={onCropHandleDragStart}
				onBodyDragStart={onCropBodyDragStart}
			/>
		{/if}
	</div>

	<!-- Rulers -->
	{#if app.settings.state.workspace.showRulers}
		<div class="absolute top-0 left-8 right-0 h-6 bg-black/60 border-b border-white/10 z-10">
			<span class="text-[10px] text-white/40 font-mono ml-2">0px</span>
		</div>
		<div class="absolute top-6 left-0 bottom-0 w-6 bg-black/60 border-r border-white/10 z-10">
			<span class="text-[10px] text-white/40 font-mono mt-2 ml-1 rotate-90 origin-top-left">0px</span>
		</div>
	{/if}

	{#if previewError}
		<div role="alert" class="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-xl border border-red-400/20 bg-void-deep/95 px-4 py-3 text-sm text-red-200 shadow-xl">
			<Icon icon="material-symbols:broken-image" class="w-5 h-5 shrink-0" />
			<span>{previewError}</span>
			<button class="btn btn-xs btn-ghost text-white" type="button" onclick={onRetryPreview}>Retry</button>
		</div>
	{/if}
</div>

<style>
	.bg-checkered {
		background-image:
			linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
			linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
			linear-gradient(-45deg, transparent 75%, #1a1a1a 75%);
		background-size: 20px 20px;
		background-position:
			0 0,
			0 10px,
			10px -10px,
			-10px 0px;
	}
</style>
