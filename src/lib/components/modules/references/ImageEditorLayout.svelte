<script lang="ts">
import { onMount } from "svelte";
import { app } from "$lib/stores/root.svelte";
import { toast } from "svelte-sonner";
import type { ReferenceId } from "$lib/types/brands";

import ImageEditorHeader from "./ImageEditorHeader.svelte";
import ImageCanvas from "./ImageCanvas.svelte";
import { CropInteraction, type ImagePoint } from "./crop-interaction.svelte";
import EditorToolbar from "$lib/components/editor/EditorToolbar.svelte";
import EditorPanel from "$lib/components/editor/EditorPanel.svelte";
import ShortcutsDialog from "$lib/components/editor/ShortcutsDialog.svelte";
import {
	EDITOR_TOOLS,
	escapeTarget,
	isSpaceActivated,
	isTextEntryTarget,
	shortcutAction,
	type EditorAction,
	type EditorTool,
} from "$lib/components/editor/editor-shortcuts";
import type {
	CropMode,
	DrawStroke,
	EffectPatch,
	ImageEditorState,
	ImageLayer,
	SaveState,
} from "$lib/types/image-editor";
import type { QuickEffect } from "$lib/types/effects";
import {
	applyEditorUpdates,
	editorStateFromRecipe,
	layerUpdates,
	presetUpdates,
	stopsFromGradient,
	stopsFromPalette,
	withEffectPatch,
	type GradientStops,
} from "$lib/components/editor/editor-state";

import AdjustPanel from "$lib/components/editor/panels/AdjustPanel.svelte";
import TransformPanel from "$lib/components/editor/panels/TransformPanel.svelte";
import CropPanel from "$lib/components/editor/panels/CropPanel.svelte";
import DrawPanel from "$lib/components/editor/panels/DrawPanel.svelte";
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

let { imageId, onClose } = $props<{ imageId: ReferenceId; onClose: () => void }>();

let editor: ReferenceEditor | null = $state<ReferenceEditor | null>(null);
const panZoom = usePanZoom();
const crop = new CropInteraction();

// Desktop opens on Adjust; on a phone the image gets the whole screen first.
let activeTool = $state<EditorTool | null>(
	window.matchMedia("(min-width: 768px)").matches ? "adjust" : null
);
let cropMode = $state<CropMode>("crop");
let isComparing = $state(false);
/** Compare is being held with Space; releasing Space ends it. */
let isComparingFromKey = false;
let showShortcuts = $state(false);
let brushColor = $state("#ff007f");
let brushSize = $state(12);
let draftStroke = $state<DrawStroke | null>(null);
/** The strokes committed before the current drag; the draft is previewed on top of them. */
let strokesBeforeDraft: DrawStroke[] = [];

let layerFileInput: HTMLInputElement | null = $state(null);
let extractedPalette = $state<string[] | null>(null);

const isCropping = $derived(activeTool === "crop" && cropMode === "crop");
const view = $derived<EditorView>(isComparing ? "compare" : isCropping ? "crop" : "edit");
const activeToolInfo = $derived(EDITOR_TOOLS.find((tool) => tool.id === activeTool));

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
const saveState = $derived<SaveState>(
	editor?.session.saveError ? "error" : editor?.session.hasUnsavedChanges ? "saving" : "saved"
);

// Redraw whenever the shown recipe, the view or the zoom changes (at most once per frame).
$effect(() => {
	if (!editor) return;
	const scale = Math.min(1, panZoom.zoom * window.devicePixelRatio);
	editor.requestRender(editor.displayedRecipe(view), scale);
});

// A new output size (crop, rotate, scale, crop view) shows the whole image again.
$effect(() => {
	if (displaySize.width > 0 && displaySize.height > 0) fitToView();
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

function handleAddEffect(effect: QuickEffect) {
	if (!editor) return;
	editor.selectEffect(effect);
	editor.applyEffect();
}

function handleEffectPreview(index: number, patch: EffectPatch) {
	if (!editor) return;
	editor.preview(withEffectPatch(editor.recipe, index, patch));
}

function handleEffectUpdate(index: number, patch: EffectPatch) {
	if (!editor) return;
	editor.commit("Effect", withEffectPatch(editor.recipe, index, patch));
}

async function handleExport(options: ExportOptions) {
	if (!editor) throw new Error("The editor is not open.");
	return editor.export(options);
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

function handleViewportResize() {
	if (panZoom.isFitted) fitToView();
}

function handleRetryPreview() {
	if (!editor) return;
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

/** Saves pending edits and refreshes the library thumbnail before leaving. */
async function handleClose() {
	applyPendingCrop();
	await editor?.close();
	onClose();
}

function selectTool(tool: EditorTool | null) {
	if (activeTool === "crop" && tool !== "crop") applyPendingCrop();
	if (activeTool === "draw" && tool !== "draw") draftStroke = null;
	activeTool = tool;
	if (tool === "crop") setCropMode("crop");
}

function setCropMode(mode: CropMode) {
	if (mode === "rotate") applyPendingCrop();
	cropMode = mode;
	if (mode === "crop" && editorState) crop.begin(editorState.cropRect, imageWidth, imageHeight);
}

/** Commits the box being drawn, if it differs from the applied crop. A full-image box is no crop. */
function applyPendingCrop() {
	const rect = crop.rect;
	if (!rect || !editorState) return;
	crop.end();
	const isFullImage =
		rect.x === 0 && rect.y === 0 && rect.width === imageWidth && rect.height === imageHeight;
	const next = isFullImage ? null : rect;
	const current = editorState.cropRect;
	const isUnchanged =
		next === current ||
		(next !== null &&
			current !== null &&
			next.x === current.x &&
			next.y === current.y &&
			next.width === current.width &&
			next.height === current.height);
	if (!isUnchanged) handleStateUpdate({ cropRect: next });
}

function handleCropDone() {
	applyPendingCrop();
	activeTool = null;
}

function cancelCrop() {
	crop.end();
	activeTool = null;
}

async function handleExtractFromRegion() {
	if (!crop.rect || !editor) return;
	try {
		extractedPalette = await extractPalette(await editor.originalRegion(crop.rect), 8);
		toast.success("Palette extracted from the selected area");
		selectTool("palette");
	} catch (error) {
		console.error("Failed to extract from region:", error);
		toast.error("The palette could not be extracted. Try again.");
	}
}

function getImageRelativePosition(e: PointerEvent): ImagePoint | null {
	// The inner wrapper's rect includes the pan and zoom transforms, so dividing by the zoom
	// gives full-resolution canvas pixels (the space the crop overlay is drawn in).
	const inner = document.querySelector("[data-image-inner]");
	if (!(inner instanceof HTMLElement)) return null;
	const rect = inner.getBoundingClientRect();
	if (!rect.width || !rect.height) return null;
	return { x: (e.clientX - rect.left) / panZoom.zoom, y: (e.clientY - rect.top) / panZoom.zoom };
}

/** The source pixel under the pointer, through the displayed rotation, flip, scale and crop. */
function getSourcePosition(e: PointerEvent): ImagePoint | null {
	const point = getImageRelativePosition(e);
	return point && editor ? editor.toSourcePoint(view, point) : null;
}

function handleDrawStart(e: PointerEvent) {
	const point = getSourcePosition(e);
	if (!point || !editorState) return;
	strokesBeforeDraft = editorState.drawStrokes;
	draftStroke = { id: crypto.randomUUID(), color: brushColor, size: brushSize, points: [point] };
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

function withPosition(handler: (point: ImagePoint) => void) {
	return (e: PointerEvent) => {
		const point = getImageRelativePosition(e);
		if (point) handler(point);
	};
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

function runAction(action: EditorAction) {
	if (!editorState || !editor) return;
	switch (action) {
		case "undo":
			editor.undo();
			return;
		case "redo":
			editor.redo();
			return;
		case "openExport":
			selectTool("export");
			return;
		case "zoomIn":
			panZoom.zoomIn();
			return;
		case "zoomOut":
			panZoom.zoomOut();
			return;
		case "actualSize":
			panZoom.fitToScreen();
			return;
		case "fit":
			fitToView();
			return;
		case "compare":
			return;
		case "rotateLeft":
			handleStateUpdate({ rotation: (editorState.rotation - 90 + 360) % 360 });
			return;
		case "rotateRight":
			handleStateUpdate({ rotation: (editorState.rotation + 90) % 360 });
			return;
		case "flipX":
			handleStateUpdate({ flipX: !editorState.flipX });
			return;
		case "flipY":
			handleStateUpdate({ flipY: !editorState.flipY });
			return;
		default: {
			const tool = EDITOR_TOOLS.find((candidate) => action === `tool:${candidate.id}`);
			if (tool) selectTool(activeTool === tool.id ? null : tool.id);
		}
	}
}

function handleEscape() {
	switch (escapeTarget({ isCropping, activeTool })) {
		case "crop":
			cancelCrop();
			return;
		case "panel":
			selectTool(null);
			return;
		case "editor":
			void handleClose();
	}
}

function handleKeydown(e: KeyboardEvent) {
	// The shortcuts dialog handles its own keys (Esc closes it).
	if (!editorState || showShortcuts) return;
	// Text fields own their letters, arrows, Esc and Ctrl+Z.
	if (isTextEntryTarget(e.target)) return;

	if (e.key === "Escape") {
		e.preventDefault();
		handleEscape();
		return;
	}
	if (isCropping && e.key.startsWith("Arrow") && !(e.target instanceof HTMLInputElement)) {
		if (crop.nudge(e)) e.preventDefault();
		return;
	}

	const action = shortcutAction(e);
	if (!action) return;
	if (action === "compare") {
		if (isSpaceActivated(e.target)) return;
		e.preventDefault();
		if (!e.repeat) {
			isComparing = true;
			isComparingFromKey = true;
		}
		return;
	}
	e.preventDefault();
	// The editor owns these while it is open; keep the app-wide shortcuts from acting too.
	if (e.ctrlKey || e.metaKey) e.stopPropagation();
	runAction(action);
}

function handleKeyup(e: KeyboardEvent) {
	if (e.key === " " && isComparingFromKey) {
		isComparingFromKey = false;
		isComparing = false;
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
		toast.error("This reference could not be opened. It may have been deleted.");
		onClose();
	}
}

onMount(() => {
	void openEditor();
	// Capture phase: runs before the app-wide shortcut listener on `document`.
	window.addEventListener("keydown", handleKeydown, { capture: true });
	window.addEventListener("keyup", handleKeyup, { capture: true });
	return () => {
		isUnmounted = true;
		window.removeEventListener("keydown", handleKeydown, { capture: true });
		window.removeEventListener("keyup", handleKeyup, { capture: true });
		void editor?.close();
	};
});
</script>

{#snippet curves()}
	{#if editor && editorState}
		<CurvesPanel
			imageSrc={editor.originalUrl}
			curves={editorState.curves}
			onCurvesChange={(newCurves) => handleStateUpdate({ curves: newCurves })}
			onCurvesPreview={(newCurves) => handleStatePreview({ curves: newCurves })}
			onCurvesCommit={() => editor?.commit("Curves")}
		/>
	{/if}
{/snippet}

{#snippet transform()}
	{#if editorState}
		<TransformPanel {editorState} onUpdate={handleStateUpdate} onPreview={handleStatePreview} />
	{/if}
{/snippet}

{#if editor && editorState}
	<div class="absolute inset-0 z-50 flex flex-col bg-void-deep" role="region" aria-label={`Editing ${editor.reference.name}`}>
		<ImageEditorHeader
			imageName={editor.reference.name}
			canUndo={editor.session.history.canUndo}
			canRedo={editor.session.history.canRedo}
			{isComparing}
			zoom={panZoom.zoom}
			isFitted={panZoom.isFitted}
			{saveState}
			isSourceDownscaled={editor.isSourceDownscaled}
			onClose={handleClose}
			onUndo={() => editor?.undo()}
			onRedo={() => editor?.redo()}
			onCompareChange={(next) => (isComparing = next)}
			onFitToScreen={fitToView}
			onActualSize={panZoom.fitToScreen}
			onZoomIn={panZoom.zoomIn}
			onZoomOut={panZoom.zoomOut}
			onShowShortcuts={() => (showShortcuts = true)}
			onRetrySave={() => void editor?.session.flush()}
		/>

		<!-- Phone: canvas, sheet, toolbar stacked. md+: canvas and toolbar left, inspector right. -->
		<div class="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[minmax(0,1fr)_auto] md:grid-rows-[minmax(0,1fr)_auto]">
			<div class="flex min-h-0 flex-1 md:col-start-1 md:row-start-1">
				<ImageCanvas
					imageName={editor.reference.name}
					displayWidth={displaySize.width}
					displayHeight={displaySize.height}
					previewError={editor.renderError}
					isDrawing={activeTool === "draw"}
					{isCropping}
					cropRect={crop.rect}
					cropGuideType={crop.guideType}
					{panZoom}
					onCanvasReady={handleCanvasReady}
					onCropStart={withPosition((point) => crop.startNew(point))}
					onCropMove={withPosition((point) => crop.move(point))}
					onCropEnd={() => crop.stop()}
					onCropHandleDragStart={(handle) => crop.startHandle(handle)}
					onCropBodyDragStart={withPosition((point) => crop.startMove(point))}
					onDrawStart={handleDrawStart}
					onDrawMove={handleDrawMove}
					onDrawEnd={handleDrawEnd}
					onRetryPreview={handleRetryPreview}
					onViewportResize={handleViewportResize}
				/>
			</div>

			{#if activeTool && activeToolInfo}
				<div class="flex min-h-0 md:col-start-2 md:row-span-2 md:row-start-1">
					<EditorPanel
						title={activeTool === "crop" ? "Crop & Rotate" : activeToolInfo.label}
						icon={activeToolInfo.icon}
						size={activeTool === "presets" ? "lg" : "md"}
						onClose={() => (activeTool === "crop" && isCropping ? cancelCrop() : selectTool(null))}
					>
						{#if activeTool === "adjust"}
							<AdjustPanel {editorState} onUpdate={handleStateUpdate} onPreview={handleStatePreview} {curves} />
						{:else if activeTool === "presets"}
							<FiltersPanel currentState={editorState} imageSrc={editor.originalUrl} onApplyPreset={handlePresetApply} onPreviewPreset={handlePresetPreview} renderPreview={renderPresetPreview} />
						{:else if activeTool === "crop"}
							<CropPanel
								mode={cropMode}
								onModeChange={setCropMode}
								{transform}
								cropRect={crop.rect}
								aspectRatio={crop.aspectRatio}
								guideType={crop.guideType}
								onCropChange={(rect) => crop.set(rect)}
								onAspectRatioChange={(ratio) => crop.setAspectRatio(ratio)}
								onGuideTypeChange={(guide) => (crop.guideType = guide)}
								onApplyCrop={handleCropDone}
								onCancelCrop={cancelCrop}
								onExtractFromRegion={handleExtractFromRegion}
								{imageWidth}
								{imageHeight}
							/>
						{:else if activeTool === "effects"}
							<EffectsPanel
								appliedEffects={editorState.appliedEffects}
								onAddEffect={handleAddEffect}
								onPreviewEffect={handleEffectPreview}
								onUpdateEffect={handleEffectUpdate}
								onRemoveEffect={(index) => editor?.removeEffect(index)}
								onClearEffects={() => editor?.clearEffects()}
							/>
						{:else if activeTool === "draw"}
							<DrawPanel
								bind:brushColor
								bind:brushSize
								hasStrokes={editorState.drawStrokes.length > 0}
								onClear={() => handleStateUpdate({ drawStrokes: [] })}
							/>
						{:else if activeTool === "layers"}
							<LayersPanel
								layers={editorState.layers}
								activeLayerId={editorState.activeLayerId}
								onAddImageLayer={() => layerFileInput?.click()}
								onRemoveLayer={(id) => editor?.removeLayer(id)}
								onUpdateLayer={(id: string, updates: Partial<ImageLayer>) => editor?.updateLayer(id, layerUpdates(updates))}
								onPreviewLayer={(id: string, updates: Partial<ImageLayer>) => editor?.updateLayer(id, layerUpdates(updates), true)}
								onDuplicateLayer={(id) => editor?.duplicateLayer(id)}
								onReorderLayer={(from, to) => editor?.reorderLayers(from, to)}
								onSetActiveLayer={(id) => editor && (editor.activeLayerId = id)}
								onMergeDown={(id) => runLayerAction(async () => editor?.mergeDown(id), "The layers could not be merged.")}
								onFlattenAll={() => runLayerAction(async () => editor?.flattenLayers(), "The layers could not be flattened.")}
							/>
						{:else if activeTool === "palette"}
							<PalettePanel
								bind:extractedPalette
								imageSrc={editor.originalUrl}
								{getEditedImage}
								gradientMapOpacity={editorState.gradientMapOpacity}
								gradientMapBlendMode={editorState.gradientMapBlendMode}
								onGradientMapChange={(opacity, blendMode) => handleStateUpdate({ gradientMapOpacity: opacity, gradientMapBlendMode: blendMode })}
								onGradientMapPreview={(opacity, blendMode) => handleStatePreview({ gradientMapOpacity: opacity, gradientMapBlendMode: blendMode })}
							/>
						{:else if activeTool === "export"}
							<ExportPanelEnhanced
								imageName={editor.reference.name}
								{extractedPalette}
								outputSize={editor.displaySize("edit")}
								isSourceDownscaled={editor.isSourceDownscaled}
								onExport={handleExport}
							/>
						{/if}
					</EditorPanel>
				</div>
			{/if}

			<div class="md:col-start-1 md:row-start-2">
				<EditorToolbar {activeTool} onToolSelect={selectTool} />
			</div>
		</div>

		<input
			bind:this={layerFileInput}
			type="file"
			accept="image/png,image/jpeg,image/webp,image/gif"
			class="hidden"
			onchange={handleLayerFileSelected}
		/>
	</div>

	<ShortcutsDialog isOpen={showShortcuts} onClose={() => (showShortcuts = false)} />
{/if}
