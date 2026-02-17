<script lang="ts">
	import { cn } from "$lib/utils/cn";
	import { app } from "$lib/stores/root.svelte";
	import type { CropRect } from "$lib/components/editor/panels/CropPanel.svelte";
	import type { CropGuideType, ImageLayer } from "$lib/types/image-editor";
	import type { usePanZoom } from "$lib/hooks/usePanZoom.svelte";
	import CropOverlay from "./CropOverlay.svelte";
	import chroma from "chroma-js";
	import tinycolor from "tinycolor2";

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
		// Crop interaction
		isCropping: boolean;
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
		isCropping,
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
	}: Props = $props();

	let canvasContainer: HTMLDivElement | null = $state(null);
	let imageElement: HTMLImageElement | null = $state(null);

	function handleImageLoad(e: Event) {
		const img = e.target as HTMLImageElement;
		onImageLoad(img.naturalWidth, img.naturalHeight);
	}

	function handlePointerDown(e: PointerEvent) {
		if (isCropping) {
			onCropStart(e);
			return;
		}
		panZoom.handleMouseDown(e);
	}

	function handlePointerMove(e: PointerEvent) {
		if (isCropping) {
			onCropMove(e);
			return;
		}
		panZoom.handleMouseMove(e);
	}

	function handlePointerUp() {
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
		return colors.map((c) => {
			const rgb = tinycolor(c).toRgb();
			return rgb[channel] / 255;
		}).join(" ");
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
	style:cursor={isCropping ? "crosshair" : panZoom.isPanning ? "grabbing" : "grab"}
	role="presentation"
>
	<!-- Checkered Background -->
	<div class="absolute inset-0 bg-checkered opacity-30"></div>

	<!-- Canvas Content -->
	<div
		class="relative transition-transform duration-75 ease-out will-change-transform"
		style:transform="translate({panZoom.panX}px, {panZoom.panY}px) scale({panZoom.zoom})"
	>
		<!-- Image Container with Crop -->
		<div class="relative" style:clip-path={appliedCrop && !isComparing ? cropClipPath : "none"}>
			{#if isComparing}
				<img
					bind:this={imageElement}
					src={imageSrc}
					alt={imageName}
					class="max-w-none shadow-2xl"
					style:opacity={1}
					onload={handleImageLoad}
					draggable="false"
				/>
			{:else if needsCanvasPreview && previewDataUrl}
				<img
					src={previewDataUrl}
					alt={imageName}
					class="max-w-none shadow-2xl"
					style:transform={transformString}
					style:opacity={opacity}
					draggable="false"
				/>
				<img
					bind:this={imageElement}
					src={imageSrc}
					alt=""
					class="hidden"
					onload={handleImageLoad}
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
					draggable="false"
				/>
			{/if}

			{#if needsCanvasPreview && isRenderingPreview && !previewDataUrl && !isComparing}
				<div class="absolute inset-0 flex items-center justify-center bg-black/30">
					<span class="loading loading-spinner loading-md text-phoenix-primary"></span>
				</div>
			{/if}
		</div>

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
