<script lang="ts">
import { fade } from "svelte/transition";
import { onMount } from "svelte";
import { app } from "$lib/stores/root.svelte";
import { toast } from "svelte-sonner";
import Icon from "@iconify/svelte";
import type { ReferenceId } from "$lib/types/brands";

import ImageEditorHeader from "./ImageEditorHeader.svelte";
import ImageCanvas from "./ImageCanvas.svelte";
import EditorToolbar, { type EditorTool } from "$lib/components/editor/EditorToolbar.svelte";
import EditorPanel from "$lib/components/editor/EditorPanel.svelte";
import type { DrawStroke, ImageEditorState } from "$lib/types/image-editor";
import {
	applyEditorUpdates,
	editorStateFromRecipe,
	layerUpdates,
	presetUpdates,
	stopsFromGradient,
	stopsFromPalette,
	type GradientStops,
} from "$lib/components/editor/editor-state";

import AdjustPanel from "$lib/components/editor/panels/AdjustPanel.svelte";
import TransformPanel from "$lib/components/editor/panels/TransformPanel.svelte";
import CropPanel, {
	type CropRect,
	type AspectRatio,
} from "$lib/components/editor/panels/CropPanel.svelte";
import type { CropGuideType } from "$lib/types/image-editor";
import PalettePanel from "$lib/components/editor/panels/PalettePanel.svelte";
import FiltersPanel from "$lib/components/editor/panels/FiltersPanel.svelte";
import EffectsPanel from "$lib/components/editor/panels/EffectsPanel.svelte";
import LayersPanel from "$lib/components/editor/panels/LayersPanel.svelte";
import ExportPanelEnhanced from "$lib/components/editor/panels/ExportPanelEnhanced.svelte";
import CurvesPanel from "$lib/components/editor/panels/CurvesPanel.svelte";

import { usePanZoom } from "$lib/hooks/usePanZoom.svelte";
import {
	extractPalette,
	neutralRecipe,
	openReferenceEditor,
	type EditorView,
	type ExportOptions,
	type ReferenceEditor,
} from "$lib/features/references";
import type { ImageLayer } from "$lib/types/image-editor";

let { imageId, onClose } = $props<{ imageId: ReferenceId; onClose: () => void }>();

let editor: ReferenceEditor | null = $state<ReferenceEditor | null>(null);
const panZoom = usePanZoom();

// UI state
let activeTool = $state<EditorTool>(null);
let isComparing = $state(false);
let showShortcuts = $state(false);
let brushColor = $state("#ff007f");
let brushSize = $state(12);
let draftStroke = $state<DrawStroke | null>(null);
/** The strokes committed before the current drag; the draft is previewed on top of them. */
let strokesBeforeDraft: DrawStroke[] = [];

// Crop state
let isCropping = $state(false);
/** A point in the source image's own pixel coordinate space. */
type ImagePoint = { x: number; y: number };
/** Crop dimensions in source-image pixels. */
type CropSize = { width: number; height: number };

let cropRect = $state<CropRect | null>(null);
let aspectRatio = $state<AspectRatio>("free");
let cropGuideType = $state<CropGuideType>("thirds");
let cropStartPos = $state<{ x: number; y: number } | null>(null);
let activeCropHandle = $state<string | null>(null);
let cropDragMode = $state<"new" | "handle" | "move" | null>(null);
let cropBodyOffset = $state<{ x: number; y: number }>({ x: 0, y: 0 });

let layerFileInput: HTMLInputElement | null = $state(null);
let extractedPalette = $state<string[] | null>(null);

const SNAP_THRESHOLD = 8;

const view = $derived<EditorView>(isComparing ? "compare" : isCropping ? "crop" : "edit");

/** The panels' flat view of the recipe. */
const editorState = $derived(
	editor
		? editorStateFromRecipe(editor.recipe, editor.activeLayerId, (layer) => editor?.layerUrl(layer))
		: null
);
const displaySize = $derived(editor ? editor.displaySize(view) : { width: 0, height: 0 });
/** The source image's size; crops are drawn in source pixels. */
const imageWidth = $derived(editor?.reference.width ?? 0);
const imageHeight = $derived(editor?.reference.height ?? 0);

// Redraw whenever the shown recipe, the view or the zoom changes (at most once per frame).
$effect(() => {
	if (!editor) return;
	const scale = Math.min(1, panZoom.zoom * window.devicePixelRatio);
	editor.requestRender(editor.displayedRecipe(view), scale);
});

/** The active gradient or palette as a gradient-map snapshot (v1 read them live). */
function activeGradientStops(): GradientStops | null {
	if (app.gradients.activeGradient) return stopsFromGradient(app.gradients.activeGradient.stops);
	if (app.palettes.activePalette) return stopsFromPalette(app.palettes.activePalette.colors);
	return null;
}

function handleStateUpdate(updates: Partial<ImageEditorState>) {
	if (!editor) return;
	editor.commit("Edit", applyEditorUpdates(editor.recipe, updates, activeGradientStops()));
}

function handleStatePreview(updates: Partial<ImageEditorState>) {
	if (!editor) return;
	editor.preview(applyEditorUpdates(editor.recipe, updates, activeGradientStops()));
}

function handlePresetApply(preset: Partial<ImageEditorState>, intensity: number) {
	handleStateUpdate(presetUpdates(preset, intensity));
}

/** A preset on the untouched original, as the preset tiles show it. */
function renderPresetPreview(settings: Partial<ImageEditorState>): Promise<string> {
	if (!editor) return Promise.reject(new Error("The editor is not open."));
	const recipe = applyEditorUpdates(
		neutralRecipe(editor.reference.id),
		presetUpdates(settings, 100),
		null
	);
	return editor.previewUrl(recipe);
}

function handlePresetPreview(preset: Partial<ImageEditorState>, intensity: number) {
	handleStatePreview(presetUpdates(preset, intensity));
}

function handleUndo() {
	editor?.undo();
}

function handleRedo() {
	editor?.redo();
}

async function handleExport(options: ExportOptions): Promise<Blob> {
	if (!editor) throw new Error("The editor is not open.");
	return (await editor.export(options)).blob;
}

async function getEditedImage(): Promise<Blob> {
	if (!editor) throw new Error("The editor is not open.");
	return editor.editedImage();
}

function handleCanvasReady(canvas: HTMLCanvasElement) {
	void editor?.attach(canvas);
	fitToView();
}

/** Zooms so the whole image fits the canvas area. */
function fitToView() {
	const viewport = document.querySelector("[data-editor-canvas]");
	if (!(viewport instanceof HTMLElement)) return;
	panZoom.fitContent(
		displaySize.width,
		displaySize.height,
		viewport.clientWidth,
		viewport.clientHeight
	);
}

function handleRetryPreview() {
	if (!editor) return;
	void editor.session.flush();
	editor.requestRender(editor.displayedRecipe(view), Math.min(1, panZoom.zoom * window.devicePixelRatio));
}

async function runLayerAction(action: () => Promise<void>, failure: string) {
	try {
		await action();
	} catch (error) {
		console.error(failure, error);
		toast.error(failure);
	}
}

// Saves pending edits and refreshes the library thumbnail before leaving.
async function handleClose() {
	await editor?.close();
	onClose();
}

// Tool selection
function handleToolSelect(tool: EditorTool) {
	if (activeTool === "draw" && tool !== "draw") draftStroke = null;
	activeTool = tool;
	if (tool === "crop") {
		isCropping = true;
	} else {
		isCropping = false;
		cropRect = null;
	}
}

function handleDrawStart(e: PointerEvent) {
	const point = getSourcePosition(e);
	if (!point || !editorState) return;
	strokesBeforeDraft = editorState.drawStrokes;
	draftStroke = {
		id: crypto.randomUUID(),
		color: brushColor,
		size: brushSize,
		points: [point],
	};
}

function handleDrawMove(e: PointerEvent) {
	if (!draftStroke || e.buttons === 0) return;
	const point = getSourcePosition(e);
	if (!point) return;
	draftStroke = { ...draftStroke, points: [...draftStroke.points, point] };
	handleStatePreview({ drawStrokes: [...strokesBeforeDraft, draftStroke] });
}

function handleDrawEnd() {
	if (!draftStroke) return;
	handleStateUpdate({ drawStrokes: [...strokesBeforeDraft, draftStroke] });
	draftStroke = null;
}

// Crop handlers
function handleApplyCrop() {
	if (cropRect) {
		handleStateUpdate({ cropRect });
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
	if (!cropRect || !editor) return;
	try {
		const colors = await extractPalette(await editor.originalRegion(cropRect), 8);
		extractedPalette = colors;
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
	// SAFETY: this handler is bound only to the hidden layer `<input type="file">`, so
	// the event target is always that input.
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;
	const validTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
	if (!validTypes.includes(file.type)) {
		toast.error("Unsupported image format");
		return;
	}
	try {
		if (!editor) return;
		await editor.addLayerImage(file, file.name.replace(/\.[^.]+$/, ""));
		toast.success("Layer added");
	} catch (error) {
		console.error("Failed to add layer:", error);
		toast.error("The image layer could not be added");
	} finally {
		input.value = "";
	}
}

// Crop pointer interaction (unified mouse + touch via PointerEvent)
function getImageRelativePosition(e: PointerEvent): ImagePoint | null {
	// Use the actual rendered position of the image inner div.
	// getBoundingClientRect() accounts for all CSS transforms (pan, zoom) automatically,
	// so no manual math is needed. The inner div's coordinate space (0..naturalWidth,
	// 0..naturalHeight) is exactly the crop coordinate space used by CropOverlay.
	// SAFETY: `[data-image-inner]` is only ever set on the image wrapper `<div>` rendered
	// by this component, so a match is always an HTMLElement.
	const inner = document.querySelector("[data-image-inner]") as HTMLElement | null;
	if (!inner) return null;
	const rect = inner.getBoundingClientRect();
	if (!rect.width || !rect.height) return null;
	// rect.width = naturalWidth * panZoom.zoom, so dividing by zoom gives natural image pixels.
	const x = (e.clientX - rect.left) / panZoom.zoom;
	const y = (e.clientY - rect.top) / panZoom.zoom;
	return { x, y };
}

/** The source pixel under the pointer, through the displayed rotation, flip, scale and crop. */
function getSourcePosition(e: PointerEvent): ImagePoint | null {
	const point = getImageRelativePosition(e);
	return point && editor ? editor.toSourcePoint(view, point) : null;
}

function snapToEdge(val: number, edge: number): number {
	return Math.abs(val - edge) < SNAP_THRESHOLD ? edge : val;
}

function clampRect(rect: CropRect): CropRect {
	let { x, y, width, height } = rect;
	x = Math.max(0, Math.min(x, imageWidth - width));
	y = Math.max(0, Math.min(y, imageHeight - height));
	width = Math.min(width, imageWidth);
	height = Math.min(height, imageHeight);
	return { x, y, width, height };
}

function constrainToAspectRatio(width: number, height: number): CropSize {
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

function handleCropHandleDragStart(handle: string, _e: PointerEvent) {
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
		newX = snapToEdge(newX, imageWidth - cropRect.width);
		newY = snapToEdge(newY, imageHeight - cropRect.height);
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
		if (newW < 0) {
			newX += newW;
			newW = -newW;
		}
		if (newH < 0) {
			newY += newH;
			newH = -newH;
		}

		// Snap to image edges
		newX = snapToEdge(newX, 0);
		newY = snapToEdge(newY, 0);
		const right = newX + newW;
		const bottom = newY + newH;
		if (Math.abs(right - imageWidth) < SNAP_THRESHOLD) newW = imageWidth - newX;
		if (Math.abs(bottom - imageHeight) < SNAP_THRESHOLD) newH = imageHeight - newY;

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
	if (Math.abs(x + w - imageWidth) < SNAP_THRESHOLD) x = imageWidth - w;
	if (Math.abs(y + h - imageHeight) < SNAP_THRESHOLD) y = imageHeight - h;

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
			if (isResize) {
				width = Math.max(1, width - step);
			} else {
				x -= step;
			}
			break;
		case "ArrowRight":
			if (isResize) {
				width += step;
			} else {
				x += step;
			}
			break;
		case "ArrowUp":
			if (isResize) {
				height = Math.max(1, height - step);
			} else {
				y -= step;
			}
			break;
		case "ArrowDown":
			if (isResize) {
				height += step;
			} else {
				y += step;
			}
			break;
		default:
			return;
	}
	e.preventDefault();
	cropRect = clampRect({ x, y, width, height });
}

// Keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
	if (!editorState) return;
	// SAFETY: this is a window keydown listener, so the target is whatever DOM element
	// holds focus; reading `tagName` off it is the point of the check.
	const focused = e.target as HTMLElement | null;
	if (focused?.tagName === "INPUT" || focused?.tagName === "TEXTAREA") return;

	// Crop keyboard nudging (arrow keys)
	if (isCropping && cropRect && e.key.startsWith("Arrow")) {
		handleCropKeyboardNudge(e);
		return;
	}

	if (e.ctrlKey || e.metaKey) {
		switch (e.key.toLowerCase()) {
			case "z":
				e.preventDefault();
				if (e.shiftKey) handleRedo();
				else handleUndo();
				break;
			case "y":
				e.preventDefault();
				handleRedo();
				break;
			case "s":
				e.preventDefault();
				activeTool = "export";
				break;
			case "0":
				e.preventDefault();
				panZoom.fitToScreen();
				break;
			case "=":
			case "+":
				e.preventDefault();
				panZoom.zoomIn();
				break;
			case "-":
				e.preventDefault();
				panZoom.zoomOut();
				break;
		}
		// The editor owns these while it is open; keep the app-wide shortcuts from acting too.
		if (e.defaultPrevented) e.stopPropagation();
		return;
	}

	switch (e.key.toLowerCase()) {
		case "escape":
			if (activeTool) {
				activeTool = null;
			} else {
				handleClose();
			}
			break;
		case "a":
			activeTool = activeTool === "adjust" ? null : "adjust";
			break;
		case "f":
			activeTool = activeTool === "filters" ? null : "filters";
			break;
		case "c":
			activeTool = activeTool === "crop" ? null : "crop";
			isCropping = activeTool === "crop";
			break;
		case "d":
			activeTool = activeTool === "draw" ? null : "draw";
			break;
		case "p":
			activeTool = activeTool === "palette" ? null : "palette";
			break;
		case "e":
			activeTool = activeTool === "effects" ? null : "effects";
			break;
		case "l":
			activeTool = activeTool === "layers" ? null : "layers";
			break;
		case "x":
			activeTool = activeTool === "export" ? null : "export";
			break;
		case " ":
			e.preventDefault();
			isComparing = !isComparing;
			break;
		case "r":
			fitToView();
			break;
		case "[":
			handleStateUpdate({ rotation: (editorState.rotation - 90 + 360) % 360 });
			break;
		case "]":
			handleStateUpdate({ rotation: (editorState.rotation + 90) % 360 });
			break;
		case "h":
			handleStateUpdate({ flipX: !editorState.flipX });
			break;
		case "v":
			handleStateUpdate({ flipY: !editorState.flipY });
			break;
	}
}

let isUnmounted = false;

async function openEditor() {
	try {
		const opened = await openReferenceEditor(imageId);
		if (isUnmounted) void opened.close();
		else editor = opened;
	} catch (error) {
		console.error("Failed to open the editor:", error);
		toast.error("This image could not be opened.");
		onClose();
	}
}

onMount(() => {
	void openEditor();
	// Capture phase: runs before the app-wide shortcut listener on `document`.
	window.addEventListener("keydown", handleKeydown, { capture: true });
	return () => {
		isUnmounted = true;
		window.removeEventListener("keydown", handleKeydown, { capture: true });
		void editor?.close();
	};
});
</script>

{#if editor && editorState}
	<div class="absolute inset-0 z-50 flex flex-col bg-void-deep" transition:fade={{ duration: 200 }}>
		<ImageEditorHeader
			imageName={editor.reference.name}
			canUndo={editor.session.history.canUndo}
			canRedo={editor.session.history.canRedo}
			{isComparing}
			zoom={panZoom.zoom}
			onClose={handleClose}
			onUndo={handleUndo}
			onRedo={handleRedo}
			onCompareStart={() => (isComparing = true)}
			onCompareEnd={() => (isComparing = false)}
			onFitToScreen={fitToView}
			onZoomIn={panZoom.zoomIn}
			onZoomOut={panZoom.zoomOut}
			onShowShortcuts={() => (showShortcuts = true)}
		/>

		<ImageCanvas
			imageName={editor.reference.name}
			displayWidth={displaySize.width}
			displayHeight={displaySize.height}
			previewError={editor.renderError ?? editor.session.saveError}
			isDrawing={activeTool === "draw"}
			{isCropping}
			{cropRect}
			{cropGuideType}
			{panZoom}
			onCanvasReady={handleCanvasReady}
			onCropStart={handleCropStart}
			onCropMove={handleCropMove}
			onCropEnd={handleCropEnd}
			onCropHandleDragStart={handleCropHandleDragStart}
			onCropBodyDragStart={handleCropBodyDragStart}
			onDrawStart={handleDrawStart}
			onDrawMove={handleDrawMove}
			onDrawEnd={handleDrawEnd}
			onRetryPreview={handleRetryPreview}
		/>

		<EditorToolbar {activeTool} onToolSelect={handleToolSelect} />

		<!-- Panels -->
		<EditorPanel title="Adjust" icon="material-symbols:tune" isOpen={activeTool === "adjust"} onClose={() => (activeTool = null)}>
			<AdjustPanel {editorState} onUpdate={handleStateUpdate} onPreview={handleStatePreview} />
		</EditorPanel>

		<EditorPanel title="Draw" icon="material-symbols:draw" isOpen={activeTool === "draw"} onClose={() => { draftStroke = null; activeTool = null; }}>
			<div class="space-y-5">
				<label class="grid gap-2 text-sm text-white/80" for="editor-brush-color">
					Brush color
					<input
						id="editor-brush-color"
						type="color"
						bind:value={brushColor}
						class="h-11 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 p-1"
					/>
				</label>
				<label class="grid gap-2 text-sm text-white/80" for="editor-brush-size">
					<span class="flex items-center justify-between">
						Brush size
						<span class="font-mono text-white/55">{brushSize}px</span>
					</span>
					<input id="editor-brush-size" type="range" min="1" max="100" step="1" bind:value={brushSize} />
				</label>
				<button
					type="button"
					class="btn btn-ghost min-h-11 w-full border border-white/10"
					disabled={editorState.drawStrokes.length === 0}
					onclick={() => handleStateUpdate({ drawStrokes: [] })}
				>
					<Icon icon="material-symbols:ink-eraser" class="h-5 w-5" />
					Clear drawing
				</button>
				<p class="text-xs leading-relaxed text-white/45">Drag directly over the image. Each stroke is one undo step.</p>
			</div>
		</EditorPanel>

		<EditorPanel title="Filters" icon="material-symbols:filter-vintage" isOpen={activeTool === "filters"} onClose={() => (activeTool = null)} size="lg">
			<div class="space-y-6">
				<FiltersPanel currentState={editorState} imageSrc={editor.originalUrl} onApplyPreset={handlePresetApply} onPreviewPreset={handlePresetPreview} renderPreview={renderPresetPreview} />
				<div class="pt-4 border-t border-white/10">
					<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
						<Icon icon="material-symbols:show-chart" class="w-4 h-4" />
						Curves
					</h4>
					<CurvesPanel
						imageSrc={editor.originalUrl}
						curves={editorState.curves}
						onCurvesChange={(newCurves) => handleStateUpdate({ curves: newCurves })}
						onCurvesPreview={(newCurves) => handleStatePreview({ curves: newCurves })}
						onCurvesCommit={() => editor?.commit("Curves")}
					/>
				</div>
				<div class="pt-4 border-t border-white/10">
					<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
						<Icon icon="material-symbols:transform" class="w-4 h-4" />
						Transform
					</h4>
					<TransformPanel {editorState} onUpdate={handleStateUpdate} onPreview={handleStatePreview} />
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
				{imageWidth}
				{imageHeight}
			/>
		</EditorPanel>

		<EditorPanel title="Palette" icon="material-symbols:palette" isOpen={activeTool === "palette"} onClose={() => (activeTool = null)}>
			<PalettePanel
				imageSrc={editor.originalUrl}
				{getEditedImage}
				gradientMapOpacity={editorState.gradientMapOpacity}
				gradientMapBlendMode={editorState.gradientMapBlendMode}
				onGradientMapChange={(opacity, blendMode) => handleStateUpdate({ gradientMapOpacity: opacity, gradientMapBlendMode: blendMode })}
				onGradientMapPreview={(opacity, blendMode) => handleStatePreview({ gradientMapOpacity: opacity, gradientMapBlendMode: blendMode })}
			/>
		</EditorPanel>

		<EditorPanel title="Effects" icon="material-symbols:auto-fix-high" isOpen={activeTool === "effects"} onClose={() => (activeTool = null)}>
			<EffectsPanel
				activeEffect={editor.quickEffect}
				effectIntensity={editor.effectIntensity}
				duotoneColors={editor.duotoneColors}
				appliedEffects={editorState.appliedEffects}
				onEffectChange={(effect) => editor?.selectEffect(effect)}
				onIntensityChange={(intensity) => editor && (editor.effectIntensity = intensity)}
				onDuotoneColorsChange={(colors) => editor && (editor.duotoneColors = colors)}
				onApplyEffect={() => editor?.applyEffect()}
				onRemoveEffect={(index) => editor?.removeEffect(index)}
				onClearEffects={() => editor?.clearEffects()}
			/>
		</EditorPanel>

		<EditorPanel title="Layers" icon="material-symbols:layers" isOpen={activeTool === "layers"} onClose={() => (activeTool = null)}>
			<LayersPanel
				layers={editorState.layers}
				activeLayerId={editorState.activeLayerId}
				onAddImageLayer={handleAddLayerImage}
				onRemoveLayer={(id) => editor?.removeLayer(id)}
				onUpdateLayer={(id: string, updates: Partial<ImageLayer>) => editor?.updateLayer(id, layerUpdates(updates))}
				onPreviewLayer={(id: string, updates: Partial<ImageLayer>) => editor?.updateLayer(id, layerUpdates(updates), true)}
				onDuplicateLayer={(id) => editor?.duplicateLayer(id)}
				onReorderLayer={(from, to) => editor?.reorderLayers(from, to)}
				onSetActiveLayer={(id) => editor && (editor.activeLayerId = id)}
				onMergeDown={(id) => runLayerAction(async () => editor?.mergeDown(id), "The layers could not be merged.")}
				onFlattenAll={() => runLayerAction(async () => editor?.flattenLayers(), "The layers could not be flattened.")}
			/>
		</EditorPanel>

		<EditorPanel title="Export" icon="material-symbols:download" isOpen={activeTool === "export"} onClose={() => (activeTool = null)}>
			<ExportPanelEnhanced
				imageName={editor.reference.name}
				{extractedPalette}
				onExport={handleExport}
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
