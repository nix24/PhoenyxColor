<script lang="ts">
import Icon from "@iconify/svelte";
import { cn } from "$lib/utils/cn";
import { app } from "$lib/stores/root.svelte";
import type { CropRect } from "$lib/components/editor/panels/CropPanel.svelte";
import type { CropGuideType, ImageLayer } from "$lib/types/image-editor";
import type { DrawStroke } from "$lib/components/editor/EditorHistory.svelte";
import type { usePanZoom } from "$lib/hooks/usePanZoom.svelte";
import CropOverlay from "./CropOverlay.svelte";
import chroma from "chroma-js";

interface Props {
	imageId: string;
	imageSrc: string;
	imageName: string;
	// Display strings
	filterString: string;
	combinedFilterString: string;
	transformString: string;
	// State flags
	isComparing: boolean;
	needsCanvasPreview: boolean;
	isRenderingPreview: boolean;
	previewDataUrl: string | null;
	previewError: string | null;
	colorAdjustActive: boolean;
	curvesModified: boolean;
	// Overlays
	opacity: number;
	vignette: number;
	gradientMapOpacity: number;
	gradientMapBlendMode: string;
	appliedCrop: { x: number; y: number; width: number; height: number } | null;
	cropClipPath: string;
	// Quick effect for duotone overlay
	quickEffect: string;
	effectIntensity: number;
	duotoneColors: [string, string];
	// Layers
	layers: ImageLayer[];
	drawStrokes: DrawStroke[];
	imageWidth: number;
	imageHeight: number;
	// Crop interaction
	isCropping: boolean;
	isDrawing: boolean;
	cropRect: CropRect | null;
	cropGuideType: CropGuideType;
	// SVG filter data
	temperatureMatrix: string;
	tintMatrix: string;
	curveTableValues: {
		rgb: string;
		red: string;
		green: string;
		blue: string;
	};
	// Pan/zoom
	panZoom: ReturnType<typeof usePanZoom>;
	// Callbacks
	onImageLoad: (width: number, height: number) => void;
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
	imageId,
	imageSrc,
	imageName,
	filterString,
	combinedFilterString,
	transformString,
	isComparing,
	needsCanvasPreview,
	isRenderingPreview,
	previewDataUrl,
	previewError,
	colorAdjustActive,
	curvesModified,
	opacity,
	vignette,
	gradientMapOpacity,
	gradientMapBlendMode,
	appliedCrop,
	cropClipPath,
	quickEffect,
	effectIntensity,
	duotoneColors,
	layers,
	drawStrokes,
	imageWidth,
	imageHeight,
	isCropping,
	isDrawing,
	cropRect,
	cropGuideType,
	temperatureMatrix,
	tintMatrix,
	curveTableValues,
	panZoom,
	onImageLoad,
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
let imageElement: HTMLImageElement | null = $state(null);
let imageLoadError = $state(false);

function handleImageLoad(e: Event) {
	const img = e.target as HTMLImageElement;
	imageLoadError = false;
	onImageLoad(img.naturalWidth, img.naturalHeight);
}

function handlePointerDown(e: PointerEvent) {
	if (isDrawing) {
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

// Gradient map helpers
function getGradientTableValues(channel: "r" | "g" | "b"): string {
	let colors: string[] = [];
	if (app.gradients.activeGradient) {
		const sortedStops = [...app.gradients.activeGradient.stops].sort(
			(a, b) => a.position - b.position,
		);
		const scale = chroma
			.scale(sortedStops.map((s) => s.color))
			.domain(sortedStops.map((s) => s.position / 100));
		colors = Array.from({ length: 256 }, (_, i) => scale(i / 255).hex());
	} else if (app.palettes.activePalette) {
		const scale = chroma.scale(app.palettes.activePalette.colors).mode("lch");
		colors = Array.from({ length: 256 }, (_, i) => scale(i / 255).hex());
	} else {
		return "0 1";
	}
	return colors
		.map((c) => {
			const [red, green, blue] = chroma(c).rgb();
			return { r: red, g: green, b: blue }[channel] / 255;
		})
		.join(" ");
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
		<!-- Image Container with Crop -->
		<div class="relative" style:clip-path={appliedCrop && !isComparing && !(needsCanvasPreview && previewDataUrl) ? cropClipPath : "none"}>
			{#if isComparing}
				<img
					bind:this={imageElement}
					src={imageSrc}
					alt={imageName}
					class="max-w-none shadow-2xl"
					style:opacity={1}
					onload={handleImageLoad}
					onerror={() => (imageLoadError = true)}
					draggable="false"
				/>
			{:else if needsCanvasPreview && previewDataUrl}
				<img
					src={previewDataUrl}
					alt={imageName}
					class="max-w-none shadow-2xl"
					style:opacity={opacity}
					onerror={() => (imageLoadError = true)}
					draggable="false"
				/>
				<img
					bind:this={imageElement}
					src={imageSrc}
					alt=""
					class="hidden"
					onload={handleImageLoad}
					onerror={() => (imageLoadError = true)}
				/>
			{:else}
				<img
					bind:this={imageElement}
					src={imageSrc}
					alt={imageName}
					class="max-w-none shadow-2xl"
					style:filter={combinedFilterString}
					style:transform={transformString}
					style:opacity={opacity}
					onload={handleImageLoad}
					onerror={() => (imageLoadError = true)}
					draggable="false"
				/>
			{/if}

			{#if needsCanvasPreview && isRenderingPreview && !previewDataUrl && !isComparing}
				<div class="absolute inset-0 flex items-center justify-center bg-black/30" aria-label="Rendering preview">
					<div class="skeleton skeleton-glass w-28 h-2 rounded-full"></div>
				</div>
			{/if}
		</div>

		{#if drawStrokes.length > 0 && !isComparing && !(needsCanvasPreview && previewDataUrl)}
			<svg
				class="absolute inset-0 pointer-events-none overflow-visible"
				width={imageWidth}
				height={imageHeight}
				viewBox="0 0 {imageWidth} {imageHeight}"
				style:transform={transformString}
				style:clip-path={appliedCrop ? cropClipPath : "none"}
				aria-hidden="true"
			>
				{#each drawStrokes as stroke (stroke.id)}
					{#if stroke.points.length === 1 && stroke.points[0]}
						<circle cx={stroke.points[0].x} cy={stroke.points[0].y} r={stroke.size / 2} fill={stroke.color} />
					{:else}
						<polyline
							points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")}
							fill="none"
							stroke={stroke.color}
							stroke-width={stroke.size}
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					{/if}
				{/each}
			</svg>
		{/if}

		<!-- Layer Stack -->
		{#if layers.length > 0 && !isComparing}
			{#each layers as layer (layer.id)}
				{#if layer.visible && layer.src}
					<div
						class="absolute inset-0 pointer-events-none"
						style:opacity={layer.opacity}
						style:mix-blend-mode={layer.blendMode}
						style:clip-path={appliedCrop ? cropClipPath : "none"}
					>
						<img
							src={layer.src}
							alt={layer.name}
							class="w-full h-full object-cover"
							draggable="false"
						/>
					</div>
				{/if}
			{/each}
		{/if}

		<!-- Gradient Map Overlay -->
		{#if gradientMapOpacity > 0 && (app.gradients.activeGradient || app.palettes.activePalette)}
			<div
				class="absolute inset-0 pointer-events-none"
				style:opacity={gradientMapOpacity}
				style:mix-blend-mode={gradientMapBlendMode}
				style:transform={transformString}
				style:clip-path={appliedCrop ? cropClipPath : "none"}
			>
				<img
					src={imageSrc}
					alt=""
					class="w-full h-full object-contain"
					style:filter="url(#gradient-map-{imageId}) {filterString.replace(/blur\([^)]+\)/, '')}"
				/>
			</div>
		{/if}

		<!-- Duotone Effect Overlay -->
		{#if quickEffect === "duotone"}
			<div
				class="absolute inset-0 pointer-events-none"
				style:opacity={effectIntensity / 100}
				style:mix-blend-mode="color"
				style:transform={transformString}
				style:clip-path={appliedCrop ? cropClipPath : "none"}
			>
				<div
					class="w-full h-full"
					style:background="linear-gradient(to bottom, {duotoneColors[1]}, {duotoneColors[0]})"
				></div>
			</div>
		{/if}

		<!-- Vignette Overlay -->
		{#if vignette > 0}
			<div
				class="absolute inset-0 pointer-events-none"
				style:background="radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,{vignette / 100}) 100%)"
				style:transform={transformString}
				style:clip-path={appliedCrop ? cropClipPath : "none"}
			></div>
		{/if}

		<!-- Crop Overlay -->
		{#if isCropping && cropRect}
			<CropOverlay
				{cropRect}
				guideType={cropGuideType}
				imageWidth={imageElement?.naturalWidth ?? 0}
				imageHeight={imageElement?.naturalHeight ?? 0}
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

	{#if imageLoadError || previewError}
		<div role="alert" class="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-xl border border-red-400/20 bg-void-deep/95 px-4 py-3 text-sm text-red-200 shadow-xl">
			<Icon icon="material-symbols:broken-image" class="w-5 h-5 shrink-0" />
			<span>{imageLoadError ? "The image could not be loaded." : previewError}</span>
			<button class="btn btn-xs btn-ghost text-white" type="button" onclick={onRetryPreview}>Retry</button>
		</div>
	{/if}
</div>

<!-- SVG Filters -->
<svg class="hidden" aria-hidden="true">
	<defs>
		{#if colorAdjustActive}
			<filter id="color-adjust-filter-{imageId}" color-interpolation-filters="sRGB">
				<feColorMatrix type="matrix" values={temperatureMatrix} result="temp-adjusted" />
				<feColorMatrix type="matrix" in="temp-adjusted" values={tintMatrix} />
			</filter>
		{/if}

		{#if curvesModified}
			<filter id="curves-filter-{imageId}" color-interpolation-filters="sRGB">
				<feComponentTransfer result="rgb-adjusted">
					<feFuncR type="table" tableValues={curveTableValues.rgb} />
					<feFuncG type="table" tableValues={curveTableValues.rgb} />
					<feFuncB type="table" tableValues={curveTableValues.rgb} />
					<feFuncA type="identity" />
				</feComponentTransfer>
				<feComponentTransfer in="rgb-adjusted">
					<feFuncR type="table" tableValues={curveTableValues.red} />
					<feFuncG type="table" tableValues={curveTableValues.green} />
					<feFuncB type="table" tableValues={curveTableValues.blue} />
					<feFuncA type="identity" />
				</feComponentTransfer>
			</filter>
		{/if}

		<filter id="gradient-map-{imageId}" color-interpolation-filters="sRGB">
			<feColorMatrix
				type="matrix"
				values="0.2126 0.7152 0.0722 0 0
								0.2126 0.7152 0.0722 0 0
								0.2126 0.7152 0.0722 0 0
								0 0 0 1 0"
				result="gray"
			/>
			<feComponentTransfer color-interpolation-filters="sRGB" result="mapped">
				<feFuncR type="table" tableValues={getGradientTableValues("r")} />
				<feFuncG type="table" tableValues={getGradientTableValues("g")} />
				<feFuncB type="table" tableValues={getGradientTableValues("b")} />
				<feFuncA type="identity" />
			</feComponentTransfer>
		</filter>
	</defs>
</svg>

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
