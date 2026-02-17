<script lang="ts">
	import { fade } from "svelte/transition";
	import { onMount } from "svelte";
	import { app } from "$lib/stores/root.svelte";
	import { toast } from "svelte-sonner";
	import Icon from "@iconify/svelte";

	import ImageEditorHeader from "./ImageEditorHeader.svelte";
	import ImageCanvas from "./ImageCanvas.svelte";
	import EditorToolbar, { type EditorTool } from "$lib/components/editor/EditorToolbar.svelte";
	import EditorPanel from "$lib/components/editor/EditorPanel.svelte";
	import { DEFAULT_EDITOR_STATE } from "$lib/components/editor/EditorHistory.svelte";

	import AdjustPanel from "$lib/components/editor/panels/AdjustPanel.svelte";
	import TransformPanel from "$lib/components/editor/panels/TransformPanel.svelte";
	import CropPanel, { type CropRect, type AspectRatio } from "$lib/components/editor/panels/CropPanel.svelte";
	import type { CropGuideType } from "$lib/types/image-editor";
	import PalettePanel from "$lib/components/editor/panels/PalettePanel.svelte";
	import FiltersPanel from "$lib/components/editor/panels/FiltersPanel.svelte";
	import EffectsPanel from "$lib/components/editor/panels/EffectsPanel.svelte";
	import LayersPanel from "$lib/components/editor/panels/LayersPanel.svelte";
	import ExportPanelEnhanced from "$lib/components/editor/panels/ExportPanelEnhanced.svelte";
	import CurvesPanel from "$lib/components/editor/panels/CurvesPanel.svelte";

	import { useImageEditor } from "$lib/hooks/useImageEditor.svelte";
	import { usePanZoom } from "$lib/hooks/usePanZoom.svelte";
	import { extractPalette } from "$lib/utils/color-engine";

	let { imageId, onClose } = $props<{ imageId: string; onClose: () => void }>();

	const editor = useImageEditor(imageId);
	const panZoom = usePanZoom();

	// UI state
	let activeTool = $state<EditorTool>(null);
	let isComparing = $state(false);
	let showShortcuts = $state(false);

	// Crop state
	let isCropping = $state(false);
	let cropRect = $state<CropRect | null>(null);
	let aspectRatio = $state<AspectRatio>("free");
	let cropGuideType = $state<CropGuideType>("thirds");
	let cropStartPos = $state<{ x: number; y: number } | null>(null);
	let activeCropHandle = $state<string | null>(null);
	let cropDragMode = $state<"new" | "handle" | "move" | null>(null);
	let cropBodyOffset = $state<{ x: number; y: number }>({ x: 0, y: 0 });

	let layerFileInput: HTMLInputElement | null = $state(null);

	const SNAP_THRESHOLD = 8;

	// Initialize editor from stored image
	$effect(() => {
		void imageId;
		editor.initializeFromImage();
	});

	// Trigger preview re-render when relevant state changes
	$effect(() => {
		if (editor.needsCanvasPreview && editor.image) {
			void editor.quickEffect;
			void editor.effectIntensity;
			void editor.duotoneColors;
			void editor.history.currentState.shadows;
			void editor.history.currentState.highlights;
			void editor.history.currentState.vibrance;
			void editor.history.currentState.clarity;
			void editor.history.currentState.temperature;
			void editor.history.currentState.tint;
			void editor.history.currentState.brightness;
			void editor.history.currentState.contrast;
			void editor.history.currentState.saturation;
			void editor.history.currentState.appliedEffects;
			void editor.history.currentState.appliedEffects?.length;
			editor.schedulePreviewRender();
		}
	});

	// Close handler with thumbnail generation
	async function handleClose() {
		const thumbnail = await editor.generateThumbnailWithEffects();
		if (thumbnail) {
			app.references.update(imageId, { thumbnailSrc: thumbnail });
		}
		editor.cleanup();
		onClose();
	}

	// Tool selection
	function handleToolSelect(tool: EditorTool) {
		activeTool = tool;
		if (tool === "crop") {
			isCropping = true;
		} else {
			isCropping = false;
			cropRect = null;
		}
	}

	// Crop handlers
	function handleApplyCrop() {
		if (cropRect) {
			editor.handleStateUpdate({ cropRect });
			toast.success("Crop applied");
		}
		isCropping = false;
		cropRect = null;
		activeTool = null;
	}

	function handleCancelCrop() {
		isCropping = false;
		cropRect = null;
	}

	async function handleExtractFromRegion() {
		if (!cropRect || !editor.image) return;
		try {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (!ctx) return;
			const img = new Image();
			img.crossOrigin = "anonymous";
			await new Promise((resolve) => { img.onload = resolve; img.src = editor.image!.src; });
			canvas.width = cropRect.width;
			canvas.height = cropRect.height;
			ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height);
			const dataUrl = canvas.toDataURL();
			const colors = await extractPalette(dataUrl, { colorCount: 8, quality: "balanced" });
			editor.extractedPalette = colors;
			toast.success("Extracted palette from selection!");
			activeTool = "palette";
		} catch (error) {
			console.error("Failed to extract from region:", error);
			toast.error("Failed to extract palette");
		}
	}

	// Layer image upload
	function handleAddLayerImage() {
		layerFileInput?.click();
	}

	async function handleLayerFileSelected(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const validTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
		if (!validTypes.includes(file.type)) {
			toast.error("Unsupported image format");
			return;
		}
		const url = URL.createObjectURL(file);
		await editor.addImageLayer(url, file.name.replace(/\.[^.]+$/, ""));
		toast.success("Layer added");
		input.value = "";
	}

	// Crop pointer interaction (unified mouse + touch via PointerEvent)
	function getImageRelativePosition(e: PointerEvent): { x: number; y: number } | null {
		const container = document.querySelector("[data-editor-canvas]");
		if (!container) return null;
		const containerRect = container.getBoundingClientRect();
		const containerCenterX = containerRect.width / 2;
		const containerCenterY = containerRect.height / 2;
		const imageHalfWidth = (editor.imageWidth * panZoom.zoom) / 2;
		const imageHalfHeight = (editor.imageHeight * panZoom.zoom) / 2;
		const imageScreenX = containerRect.left + containerCenterX - imageHalfWidth + panZoom.panX * panZoom.zoom;
		const imageScreenY = containerRect.top + containerCenterY - imageHalfHeight + panZoom.panY * panZoom.zoom;
		const x = (e.clientX - imageScreenX) / panZoom.zoom;
		const y = (e.clientY - imageScreenY) / panZoom.zoom;
		return { x, y };
	}

	function snapToEdge(val: number, edge: number): number {
		return Math.abs(val - edge) < SNAP_THRESHOLD ? edge : val;
	}

	function clampRect(rect: CropRect): CropRect {
		let { x, y, width, height } = rect;
		x = Math.max(0, Math.min(x, editor.imageWidth - width));
		y = Math.max(0, Math.min(y, editor.imageHeight - height));
		width = Math.min(width, editor.imageWidth);
		height = Math.min(height, editor.imageHeight);
		return { x, y, width, height };
	}

	function constrainToAspectRatio(width: number, height: number): { width: number; height: number } {
		if (aspectRatio === "free") return { width, height };
		const parts = aspectRatio.split(":").map(Number);
		const rw = parts[0] ?? 1;
		const rh = parts[1] ?? 1;
		const ratio = rw / rh;
		if (Math.abs(width) / Math.max(Math.abs(height), 1) > ratio) {
			return { width: Math.sign(width) * Math.abs(height) * ratio, height };
		}
		return { width, height: (Math.sign(height) * Math.abs(width)) / ratio };
	}

	function handleCropStart(e: PointerEvent) {
		const pos = getImageRelativePosition(e);
		if (!pos) return;
		cropDragMode = "new";
		cropStartPos = pos;
		activeCropHandle = null;
	}

	function handleCropHandleDragStart(handle: string, e: PointerEvent) {
		if (!cropRect) return;
		cropDragMode = "handle";
		activeCropHandle = handle;
		// Anchor is the opposite corner/edge
		let anchorX = cropRect.x;
		let anchorY = cropRect.y;
		if (handle.includes("left")) anchorX = cropRect.x + cropRect.width;
		else if (!handle.includes("right")) anchorX = cropRect.x; // edge: top/bottom
		if (handle.includes("top")) anchorY = cropRect.y + cropRect.height;
		else if (!handle.includes("bottom")) anchorY = cropRect.y; // edge: left/right
		cropStartPos = { x: anchorX, y: anchorY };
	}

	function handleCropBodyDragStart(e: PointerEvent) {
		if (!cropRect) return;
		const pos = getImageRelativePosition(e);
		if (!pos) return;
		cropDragMode = "move";
		cropBodyOffset = { x: pos.x - cropRect.x, y: pos.y - cropRect.y };
	}

	function handleCropMove(e: PointerEvent) {
		const pos = getImageRelativePosition(e);
		if (!pos) return;

		if (cropDragMode === "move" && cropRect) {
			let newX = pos.x - cropBodyOffset.x;
			let newY = pos.y - cropBodyOffset.y;
			// Snap to edges
			newX = snapToEdge(newX, 0);
			newY = snapToEdge(newY, 0);
			newX = snapToEdge(newX, editor.imageWidth - cropRect.width);
			newY = snapToEdge(newY, editor.imageHeight - cropRect.height);
			cropRect = clampRect({ x: newX, y: newY, width: cropRect.width, height: cropRect.height });
			return;
		}

		if (!cropStartPos) return;

		if (cropDragMode === "handle" && activeCropHandle && cropRect) {
			let newX = cropStartPos.x;
			let newY = cropStartPos.y;
			let newW: number;
			let newH: number;

			const h = activeCropHandle;
			if (h === "left" || h === "right") {
				// Horizontal edge only
				newW = pos.x - cropStartPos.x;
				newH = cropRect.height;
				if (h === "left") {
					newW = cropStartPos.x - pos.x;
					newX = pos.x;
				}
				newY = cropRect.y;
			} else if (h === "top" || h === "bottom") {
				// Vertical edge only
				newW = cropRect.width;
				newH = pos.y - cropStartPos.y;
				if (h === "top") {
					newH = cropStartPos.y - pos.y;
					newY = pos.y;
				}
				newX = cropRect.x;
			} else {
				// Corner: full resize
				newW = pos.x - cropStartPos.x;
				newH = pos.y - cropStartPos.y;
				const constrained = constrainToAspectRatio(newW, newH);
				newW = constrained.width;
				newH = constrained.height;
			}

			// Normalize negative dimensions
			if (newW < 0) { newX += newW; newW = -newW; }
			if (newH < 0) { newY += newH; newH = -newH; }

			// Snap to image edges
			newX = snapToEdge(newX, 0);
			newY = snapToEdge(newY, 0);
			const right = newX + newW;
			const bottom = newY + newH;
			if (Math.abs(right - editor.imageWidth) < SNAP_THRESHOLD) newW = editor.imageWidth - newX;
			if (Math.abs(bottom - editor.imageHeight) < SNAP_THRESHOLD) newH = editor.imageHeight - newY;

			cropRect = clampRect({ x: newX, y: newY, width: Math.max(1, newW), height: Math.max(1, newH) });
			return;
		}

		// New crop draw
		let width = pos.x - cropStartPos.x;
		let height = pos.y - cropStartPos.y;
		const constrained = constrainToAspectRatio(width, height);
		width = constrained.width;
		height = constrained.height;

		let x = width >= 0 ? cropStartPos.x : cropStartPos.x + width;
		let y = height >= 0 ? cropStartPos.y : cropStartPos.y + height;
		const w = Math.abs(width);
		const h = Math.abs(height);

		// Snap to image edges
		x = snapToEdge(x, 0);
		y = snapToEdge(y, 0);
		if (Math.abs(x + w - editor.imageWidth) < SNAP_THRESHOLD) x = editor.imageWidth - w;
		if (Math.abs(y + h - editor.imageHeight) < SNAP_THRESHOLD) y = editor.imageHeight - h;

		cropRect = clampRect({ x, y, width: w, height: h });
	}

	function handleCropEnd() {
		cropStartPos = null;
		activeCropHandle = null;
		cropDragMode = null;
	}

	function handleCropKeyboardNudge(e: KeyboardEvent) {
		if (!isCropping || !cropRect) return;
		const step = e.shiftKey ? 10 : 1;
		const isResize = e.altKey;

		let { x, y, width, height } = cropRect;
		switch (e.key) {
			case "ArrowLeft":
				if (isResize) { width = Math.max(1, width - step); } else { x -= step; }
				break;
			case "ArrowRight":
				if (isResize) { width += step; } else { x += step; }
				break;
			case "ArrowUp":
				if (isResize) { height = Math.max(1, height - step); } else { y -= step; }
				break;
			case "ArrowDown":
				if (isResize) { height += step; } else { y += step; }
				break;
			default:
				return;
		}
		e.preventDefault();
		cropRect = clampRect({ x, y, width, height });
	}

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;

		// Crop keyboard nudging (arrow keys)
		if (isCropping && cropRect && e.key.startsWith("Arrow")) {
			handleCropKeyboardNudge(e);
			return;
		}

		if (e.ctrlKey || e.metaKey) {
			switch (e.key.toLowerCase()) {
				case "z": e.preventDefault(); e.shiftKey ? editor.handleRedo() : editor.handleUndo(); break;
				case "y": e.preventDefault(); editor.handleRedo(); break;
				case "s": e.preventDefault(); activeTool = "export"; break;
				case "0": e.preventDefault(); panZoom.fitToScreen(); break;
				case "=": case "+": e.preventDefault(); panZoom.zoomIn(); break;
				case "-": e.preventDefault(); panZoom.zoomOut(); break;
			}
			return;
		}

		switch (e.key.toLowerCase()) {
			case "escape":
				if (activeTool) { activeTool = null; } else { handleClose(); }
				break;
			case "a": activeTool = activeTool === "adjust" ? null : "adjust"; break;
			case "f": activeTool = activeTool === "filters" ? null : "filters"; break;
			case "c":
				activeTool = activeTool === "crop" ? null : "crop";
				isCropping = activeTool === "crop";
				break;
			case "p": activeTool = activeTool === "palette" ? null : "palette"; break;
			case "e": activeTool = activeTool === "effects" ? null : "effects"; break;
			case "l": activeTool = activeTool === "layers" ? null : "layers"; break;
			case "x": activeTool = activeTool === "export" ? null : "export"; break;
			case " ": e.preventDefault(); isComparing = !isComparing; break;
			case "r": panZoom.fitToScreen(); break;
			case "[": editor.handleStateUpdate({ rotation: (editor.history.currentState.rotation - 90 + 360) % 360 }); break;
			case "]": editor.handleStateUpdate({ rotation: (editor.history.currentState.rotation + 90) % 360 }); break;
			case "h": editor.handleStateUpdate({ flipX: !editor.history.currentState.flipX }); break;
			case "v": editor.handleStateUpdate({ flipY: !editor.history.currentState.flipY }); break;
		}
	}

	// SVG filter data derived from editor state
	const temperatureMatrix = $derived(editor.getTemperatureColorMatrix(editor.history.currentState.temperature));
	const tintMatrix = $derived(editor.getTintColorMatrix(editor.history.currentState.tint));
	const curveTableValues = $derived({
		rgb: editor.getCurveTableValues("rgb"),
		red: editor.getCurveTableValues("red"),
		green: editor.getCurveTableValues("green"),
		blue: editor.getCurveTableValues("blue"),
	});

	onMount(() => {
		window.addEventListener("keydown", handleKeydown);
		return () => {
			window.removeEventListener("keydown", handleKeydown);
			editor.cleanup();
		};
	});
</script>

{#if editor.image}
	<div class="absolute inset-0 z-50 flex flex-col bg-void-deep" transition:fade={{ duration: 200 }}>
		<ImageEditorHeader
			imageName={editor.image.name}
			canUndo={editor.history.canUndo}
			canRedo={editor.history.canRedo}
			{isComparing}
			zoom={panZoom.zoom}
			onClose={handleClose}
			onUndo={editor.handleUndo}
			onRedo={editor.handleRedo}
			onCompareStart={() => (isComparing = true)}
			onCompareEnd={() => (isComparing = false)}
			onFitToScreen={panZoom.fitToScreen}
			onZoomIn={panZoom.zoomIn}
			onZoomOut={panZoom.zoomOut}
			onShowShortcuts={() => (showShortcuts = true)}
		/>

		<ImageCanvas
			imageId={editor.image.id}
			imageSrc={editor.image.src}
			imageName={editor.image.name}
			filterString={editor.filterString}
			combinedFilterString={editor.combinedFilterString}
			transformString={editor.transformString}
			{isComparing}
			needsCanvasPreview={editor.needsCanvasPreview}
			isRenderingPreview={editor.isRenderingPreview}
			previewDataUrl={editor.previewDataUrl}
			colorAdjustActive={editor.colorAdjustActive}
			curvesModified={editor.curvesModified}
			opacity={editor.history.currentState.opacity}
			vignette={editor.history.currentState.vignette}
			gradientMapOpacity={editor.history.currentState.gradientMapOpacity}
			gradientMapBlendMode={editor.history.currentState.gradientMapBlendMode}
			appliedCrop={editor.appliedCrop}
			cropClipPath={editor.cropClipPath}
			quickEffect={editor.quickEffect}
			effectIntensity={editor.effectIntensity}
			duotoneColors={editor.duotoneColors}
			layers={editor.history.currentState.layers}
			{isCropping}
			{cropRect}
			{cropGuideType}
			{temperatureMatrix}
			{tintMatrix}
			{curveTableValues}
			{panZoom}
			onImageLoad={(w, h) => editor.setImageDimensions(w, h)}
			onCropStart={handleCropStart}
			onCropMove={handleCropMove}
			onCropEnd={handleCropEnd}
			onCropHandleDragStart={handleCropHandleDragStart}
			onCropBodyDragStart={handleCropBodyDragStart}
		/>

		<EditorToolbar {activeTool} onToolSelect={handleToolSelect} />

		<!-- Panels -->
		<EditorPanel title="Adjust" icon="material-symbols:tune" isOpen={activeTool === "adjust"} onClose={() => (activeTool = null)}>
			<AdjustPanel editorState={editor.history.currentState} onUpdate={editor.handleStateUpdate} />
		</EditorPanel>

		<EditorPanel title="Filters" icon="material-symbols:filter-vintage" isOpen={activeTool === "filters"} onClose={() => (activeTool = null)} size="lg">
			<div class="space-y-6">
				<FiltersPanel currentState={editor.history.currentState} imageSrc={editor.image.src} onApplyPreset={editor.handlePresetApply} />
				<div class="pt-4 border-t border-white/10">
					<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
						<Icon icon="material-symbols:show-chart" class="w-4 h-4" />
						Curves
					</h4>
					<CurvesPanel
						imageSrc={editor.image.src}
						curves={editor.history.currentState.curves ?? DEFAULT_EDITOR_STATE.curves}
						onCurvesChange={(newCurves) => editor.handleStateUpdate({ curves: newCurves })}
					/>
				</div>
				<div class="pt-4 border-t border-white/10">
					<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
						<Icon icon="material-symbols:transform" class="w-4 h-4" />
						Transform
					</h4>
					<TransformPanel editorState={editor.history.currentState} onUpdate={editor.handleStateUpdate} />
				</div>
			</div>
		</EditorPanel>

		<EditorPanel title="Crop" icon="material-symbols:crop" isOpen={activeTool === "crop"} onClose={() => { handleCancelCrop(); activeTool = null; }}>
			<CropPanel
				{cropRect}
				{aspectRatio}
				guideType={cropGuideType}
				onCropChange={(rect) => (cropRect = rect)}
				onAspectRatioChange={(ratio) => (aspectRatio = ratio)}
				onGuideTypeChange={(guide) => (cropGuideType = guide)}
				onApplyCrop={handleApplyCrop}
				onCancelCrop={handleCancelCrop}
				onExtractFromRegion={handleExtractFromRegion}
				imageWidth={editor.imageWidth}
				imageHeight={editor.imageHeight}
			/>
		</EditorPanel>

		<EditorPanel title="Palette" icon="material-symbols:palette" isOpen={activeTool === "palette"} onClose={() => (activeTool = null)}>
			<PalettePanel
				imageSrc={editor.image.src}
				getEditedImageData={editor.getEditedImageData}
				gradientMapOpacity={editor.history.currentState.gradientMapOpacity}
				gradientMapBlendMode={editor.history.currentState.gradientMapBlendMode}
				onGradientMapChange={(opacity, blendMode) => editor.handleStateUpdate({ gradientMapOpacity: opacity, gradientMapBlendMode: blendMode })}
			/>
		</EditorPanel>

		<EditorPanel title="Effects" icon="material-symbols:auto-fix-high" isOpen={activeTool === "effects"} onClose={() => (activeTool = null)}>
			<EffectsPanel
				activeEffect={editor.quickEffect}
				effectIntensity={editor.effectIntensity}
				duotoneColors={editor.duotoneColors}
				appliedEffects={editor.history.currentState.appliedEffects}
				onEffectChange={(effect) => (editor.quickEffect = effect)}
				onIntensityChange={(intensity) => (editor.effectIntensity = intensity)}
				onDuotoneColorsChange={(colors) => (editor.duotoneColors = colors)}
				onApplyEffect={editor.handleApplyEffect}
				onRemoveEffect={editor.handleRemoveEffect}
				onClearEffects={editor.handleClearEffects}
			/>
		</EditorPanel>

		<EditorPanel title="Layers" icon="material-symbols:layers" isOpen={activeTool === "layers"} onClose={() => (activeTool = null)}>
			<LayersPanel
				layers={editor.history.currentState.layers}
				activeLayerId={editor.history.currentState.activeLayerId}
				onAddImageLayer={handleAddLayerImage}
				onRemoveLayer={editor.removeLayer}
				onUpdateLayer={editor.updateLayer}
				onDuplicateLayer={editor.duplicateLayer}
				onReorderLayer={editor.reorderLayers}
				onSetActiveLayer={editor.setActiveLayer}
				onMergeDown={editor.mergeDown}
				onFlattenAll={editor.flattenAllLayers}
			/>
		</EditorPanel>

		<EditorPanel title="Export" icon="material-symbols:download" isOpen={activeTool === "export"} onClose={() => (activeTool = null)}>
			<ExportPanelEnhanced
				imageSrc={editor.image.src}
				imageName={editor.image.name}
				editorState={editor.history.currentState}
				quickEffect={editor.quickEffect}
				effectIntensity={editor.effectIntensity}
				duotoneColors={editor.duotoneColors}
				extractedPalette={editor.extractedPalette}
			/>
		</EditorPanel>
		<!-- Hidden file input for layer uploads -->
		<input
			bind:this={layerFileInput}
			type="file"
			accept="image/png,image/jpeg,image/webp,image/gif"
			class="hidden"
			onchange={handleLayerFileSelected}
		/>
	</div>

	<!-- Keyboard Shortcuts Dialog -->
	{#if showShortcuts}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm"
			onclick={() => (showShortcuts = false)}
			onkeydown={(e) => e.key === "Escape" && (showShortcuts = false)}
			role="dialog"
			aria-modal="true"
			aria-labelledby="shortcuts-dialog-title"
			tabindex="-1"
			transition:fade={{ duration: 150 }}
		>
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="bg-void-deep border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="document"
			>
				<div class="flex items-center justify-between mb-4">
					<h3 id="shortcuts-dialog-title" class="text-lg font-bold text-white flex items-center gap-2">
						<Icon icon="material-symbols:keyboard" class="w-5 h-5 text-phoenix-primary" />
						Keyboard Shortcuts
					</h3>
					<button class="btn btn-sm btn-circle btn-ghost text-white/60 hover:text-white" onclick={() => (showShortcuts = false)} aria-label="Close shortcuts dialog">
						<Icon icon="material-symbols:close" class="w-5 h-5" />
					</button>
				</div>
				<div class="space-y-4 text-sm">
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Tools</h4>
						<div class="grid grid-cols-2 gap-1">
							{#each [["Adjust", "A"], ["Filters", "F"], ["Crop", "C"], ["Palette", "P"], ["Effects", "E"], ["Layers", "L"], ["Export", "X"]] as [name, key]}
								<div class="flex justify-between text-white/70"><span>{name}</span><kbd class="kbd kbd-sm">{key}</kbd></div>
							{/each}
						</div>
					</div>
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Actions</h4>
						<div class="grid grid-cols-2 gap-1">
							{#each [["Undo", "Ctrl+Z"], ["Redo", "Ctrl+Y"], ["Save", "Ctrl+S"], ["Compare", "Space"]] as [name, key]}
								<div class="flex justify-between text-white/70"><span>{name}</span><kbd class="kbd kbd-sm">{key}</kbd></div>
							{/each}
						</div>
					</div>
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">View</h4>
						<div class="grid grid-cols-2 gap-1">
							{#each [["Zoom In", "Ctrl++"], ["Zoom Out", "Ctrl+-"], ["Fit", "R"], ["100%", "Ctrl+0"]] as [name, key]}
								<div class="flex justify-between text-white/70"><span>{name}</span><kbd class="kbd kbd-sm">{key}</kbd></div>
							{/each}
						</div>
					</div>
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Transform</h4>
						<div class="grid grid-cols-2 gap-1">
							{#each [["Rotate Left", "["], ["Rotate Right", "]"], ["Flip H", "H"], ["Flip V", "V"]] as [name, key]}
								<div class="flex justify-between text-white/70"><span>{name}</span><kbd class="kbd kbd-sm">{key}</kbd></div>
							{/each}
						</div>
					</div>
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Crop</h4>
						<div class="grid grid-cols-2 gap-1">
							{#each [["Nudge 1px", "Arrows"], ["Nudge 10px", "Shift+Arrows"], ["Resize", "Alt+Arrows"]] as [name, key]}
								<div class="flex justify-between text-white/70"><span>{name}</span><kbd class="kbd kbd-sm">{key}</kbd></div>
							{/each}
						</div>
					</div>
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">General</h4>
						<div class="grid grid-cols-2 gap-1">
							{#each [["Close Panel", "Esc"], ["Exit Editor", "Esc"]] as [name, key]}
								<div class="flex justify-between text-white/70"><span>{name}</span><kbd class="kbd kbd-sm">{key}</kbd></div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
{/if}
