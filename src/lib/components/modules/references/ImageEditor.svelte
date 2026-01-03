<script lang="ts">
	import { fly, fade } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedReferenceImage } from "$lib/schemas/validation";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { toast } from "svelte-sonner";
	import { onMount, untrack } from "svelte";

	// Import editor components
	import EditorPanel from "$lib/components/editor/EditorPanel.svelte";
	import EditorToolbar, { type EditorTool } from "$lib/components/editor/EditorToolbar.svelte";
	import {
		createEditorHistory,
		DEFAULT_EDITOR_STATE,
		type ImageEditorState,
	} from "$lib/components/editor/EditorHistory.svelte";

	// Import panels
	import AdjustPanel from "$lib/components/editor/panels/AdjustPanel.svelte";
	import TransformPanel from "$lib/components/editor/panels/TransformPanel.svelte";
	import CropPanel, {
		type CropRect,
		type AspectRatio,
	} from "$lib/components/editor/panels/CropPanel.svelte";
	import PalettePanel from "$lib/components/editor/panels/PalettePanel.svelte";
	import FiltersPanel from "$lib/components/editor/panels/FiltersPanel.svelte";
	import EffectsPanel, {
		type QuickEffect,
	} from "$lib/components/editor/panels/EffectsPanel.svelte";
	import ExportPanelEnhanced from "$lib/components/editor/panels/ExportPanelEnhanced.svelte";
	import CurvesPanel from "$lib/components/editor/panels/CurvesPanel.svelte";

	// Import utilities
	import { extractPalette } from "$lib/utils/color-engine";
	import {
		getTemperatureColorMatrix,
		getTintColorMatrix,
		interpolateCurvePoints,
	} from "$lib/utils/image-processing";
	import { applyEffect, type EffectType } from "$lib/utils/effects-processing";
	import { renderCanvasImage, loadImage } from "$lib/utils/canvas-renderer";
	import chroma from "chroma-js";
	import tinycolor from "tinycolor2";

	let { imageId, onClose } = $props<{ imageId: string; onClose: () => void }>();

	// Editor state
	const history = createEditorHistory();
	let activeTool = $state<EditorTool>(null);
	let isComparing = $state(false);
	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let startPanX = 0;
	let startPanY = 0;

	// Crop state
	let isCropping = $state(false);
	let cropRect = $state<CropRect | null>(null);
	let aspectRatio = $state<AspectRatio>("free");
	let cropStartPos = $state<{ x: number; y: number } | null>(null);
	let activeCropHandle = $state<string | null>(null);

	// Applied crop from history state
	let appliedCrop = $derived(history.currentState.cropRect);

	// Generate clip-path for applied crop
	let cropClipPath = $derived.by(() => {
		const crop = appliedCrop;
		if (!crop || !imageWidth || !imageHeight) return "none";

		// Convert crop rect to percentage-based inset
		const left = (crop.x / imageWidth) * 100;
		const top = (crop.y / imageHeight) * 100;
		const right = 100 - ((crop.x + crop.width) / imageWidth) * 100;
		const bottom = 100 - ((crop.y + crop.height) / imageHeight) * 100;

		return `inset(${top}% ${right}% ${bottom}% ${left}%)`;
	});

	// Quick effects state
	let quickEffect = $state<QuickEffect>("none");
	let effectIntensity = $state(50);
	let duotoneColors = $state<[string, string]>(["#000000", "#ffffff"]);

	// Canvas-based preview for effects that need pixel manipulation
	let previewCanvas: HTMLCanvasElement | null = $state(null);
	let previewDataUrl = $state<string | null>(null);
	let isRenderingPreview = $state(false);
	let renderTimeout: ReturnType<typeof setTimeout> | null = null;

	// Effects that require canvas rendering (not achievable with CSS)
	const CANVAS_REQUIRED_EFFECTS: QuickEffect[] = [
		"posterize",
		"pixelate",
		"solarize",
		"halftone",
		"vhs",
		"glitch",
		"emboss",
		"sharpen",
	];

	// Check if we need canvas-based preview
	let needsCanvasPreview = $derived(
		CANVAS_REQUIRED_EFFECTS.includes(quickEffect) ||
			history.currentState.shadows !== 0 ||
			history.currentState.highlights !== 0 ||
			history.currentState.vibrance !== 0 ||
			history.currentState.clarity !== 0 ||
			(history.currentState.appliedEffects && history.currentState.appliedEffects.length > 0)
	);

	// Extracted palette
	let extractedPalette = $state<string[] | null>(null);

	// Image dimensions
	let imageWidth = $state(0);
	let imageHeight = $state(0);
	let canvasContainer: HTMLDivElement | null = $state(null);
	let imageElement: HTMLImageElement | null = $state(null);

	// UI state
	let showShortcuts = $state(false);

	// Get the image from the store
	let image = $derived(app.references.references.find((r) => r.id === imageId));

	// Initialize history with image properties
	// Initialize history with image properties
	$effect(() => {
		// Only re-initialize when the image ID changes
		const currentId = imageId;

		untrack(() => {
			if (image && image.id === currentId) {
				history.initialize({
					// Basic adjustments
					brightness: image.brightness ?? 100,
					contrast: image.contrast ?? 100,
					saturation: image.saturation ?? 100,
					hueRotate: image.hueRotate ?? 0,
					blur: image.blur ?? 0,
					opacity: image.opacity ?? 1,
					sepia: image.sepia ?? 0,
					invert: image.invert ?? 0,
					isGrayscale: image.isGrayscale ?? false,
					// Transform
					scale: image.scale ?? 1,
					rotation: image.rotation ?? 0,
					flipX: image.flipX ?? false,
					flipY: image.flipY ?? false,
					// Gradient map
					gradientMapOpacity: image.gradientMapOpacity ?? 0,
					gradientMapBlendMode: image.gradientMapBlendMode ?? "normal",
					// Enhanced adjustments
					shadows: (image as any).shadows ?? 0,
					highlights: (image as any).highlights ?? 0,
					vibrance: (image as any).vibrance ?? 0,
					temperature: (image as any).temperature ?? 0,
					tint: (image as any).tint ?? 0,
					clarity: (image as any).clarity ?? 0,
					vignette: (image as any).vignette ?? 0,
					// Curves
					curves: (image as any).curves ?? DEFAULT_EDITOR_STATE.curves,
					// Crop
					cropRect: (image as any).cropRect ?? null,
					// Effects
					appliedEffects: (image as any).appliedEffects ?? [],
				});
			}
		});
	});

	// Sync state changes to the store
	function syncToStore() {
		if (!image) return;
		const state = history.currentState;
		app.references.update(imageId, {
			// Basic adjustments
			brightness: state.brightness,
			contrast: state.contrast,
			saturation: state.saturation,
			hueRotate: state.hueRotate,
			blur: state.blur,
			opacity: state.opacity,
			sepia: state.sepia,
			invert: state.invert,
			isGrayscale: state.isGrayscale,
			// Transform
			scale: state.scale,
			rotation: state.rotation,
			flipX: state.flipX,
			flipY: state.flipY,
			// Gradient map
			gradientMapOpacity: state.gradientMapOpacity,
			gradientMapBlendMode: state.gradientMapBlendMode,
			// Enhanced adjustments
			shadows: state.shadows,
			highlights: state.highlights,
			vibrance: state.vibrance,
			temperature: state.temperature,
			tint: state.tint,
			clarity: state.clarity,
			vignette: state.vignette,
			// Curves
			curves: state.curves,
			// Crop
			cropRect: state.cropRect,
			// Effects
			appliedEffects: state.appliedEffects,
		});
	}

	// Generate thumbnail with all effects applied
	async function generateThumbnailWithEffects(): Promise<string | null> {
		if (!image) return null;

		const state = history.currentState;
		const hasEffects =
			(state.appliedEffects && state.appliedEffects.length > 0) ||
			state.shadows !== 0 ||
			state.highlights !== 0 ||
			state.vibrance !== 0 ||
			state.clarity !== 0 ||
			state.temperature !== 0 ||
			state.tint !== 0;

		if (!hasEffects) return null;

		try {
			const canvas = document.createElement("canvas");
			const img = await loadImage(image.src);

			await renderCanvasImage(canvas, img, state, { maxSize: 256 });

			return canvas.toDataURL("image/jpeg", 0.8);
		} catch (error) {
			console.error("Failed to generate thumbnail:", error);
			return null;
		}
	}

	// Close handler with thumbnail generation
	async function handleClose() {
		// Generate thumbnail if effects are applied
		const thumbnail = await generateThumbnailWithEffects();
		if (thumbnail) {
			app.references.update(imageId, { thumbnailSrc: thumbnail });
		}
		onClose();
	}

	// Handle state updates from panels
	function handleStateUpdate(updates: Partial<ImageEditorState>) {
		history.pushState(updates);
		syncToStore();
	}

	// Handle preset application with intensity
	function handlePresetApply(preset: Partial<ImageEditorState>, intensity: number) {
		// Create a base state that preserves geometry and existing effects,
		// but resets adjustment values to default so the preset acts cleanly
		const current = history.currentState;
		const baseState = {
			...current,
			// Reset basic adjustments
			brightness: DEFAULT_EDITOR_STATE.brightness,
			contrast: DEFAULT_EDITOR_STATE.contrast,
			saturation: DEFAULT_EDITOR_STATE.saturation,
			hueRotate: DEFAULT_EDITOR_STATE.hueRotate,
			blur: DEFAULT_EDITOR_STATE.blur,
			opacity: DEFAULT_EDITOR_STATE.opacity,
			sepia: DEFAULT_EDITOR_STATE.sepia,
			invert: DEFAULT_EDITOR_STATE.invert,
			isGrayscale: DEFAULT_EDITOR_STATE.isGrayscale,
			// Reset enhanced adjustments
			shadows: DEFAULT_EDITOR_STATE.shadows,
			highlights: DEFAULT_EDITOR_STATE.highlights,
			vibrance: DEFAULT_EDITOR_STATE.vibrance,
			temperature: DEFAULT_EDITOR_STATE.temperature,
			tint: DEFAULT_EDITOR_STATE.tint,
			clarity: DEFAULT_EDITOR_STATE.clarity,
			vignette: DEFAULT_EDITOR_STATE.vignette,
			// Reset curves and gradient maps
			curves: DEFAULT_EDITOR_STATE.curves,
			gradientMapOpacity: DEFAULT_EDITOR_STATE.gradientMapOpacity,
			gradientMapBlendMode: DEFAULT_EDITOR_STATE.gradientMapBlendMode,
			// Preserve: scale, rotation, flip, cropRect, appliedEffects
		};

		if (intensity === 100) {
			handleStateUpdate({ ...baseState, ...preset });
		} else {
			// Blend preset with defaults based on intensity
			const blended: Partial<ImageEditorState> = {};
			for (const [key, value] of Object.entries(preset)) {
				const defaultVal = DEFAULT_EDITOR_STATE[key as keyof ImageEditorState];
				if (typeof value === "number" && typeof defaultVal === "number") {
					(blended as any)[key] = defaultVal + (value - defaultVal) * (intensity / 100);
				} else {
					(blended as any)[key] = value;
				}
			}
			handleStateUpdate({ ...baseState, ...blended });
		}
	}

	// Effect handlers
	function handleApplyEffect() {
		if (quickEffect === "none") return;

		const newEffect: import("$lib/components/editor/EditorHistory.svelte").AppliedEffect = {
			type: quickEffect as any,
			intensity: effectIntensity,
		};

		// Only add duotoneColors if this is a duotone effect
		if (quickEffect === "duotone") {
			newEffect.duotoneColors = [...duotoneColors] as [string, string];
		}

		const currentEffects = history.currentState.appliedEffects || [];
		handleStateUpdate({
			appliedEffects: [...currentEffects, newEffect],
		});

		// Reset current effect selection after applying
		quickEffect = "none";
		effectIntensity = 50;
	}

	function handleRemoveEffect(index: number) {
		const currentEffects = history.currentState.appliedEffects || [];
		const newEffects = currentEffects.filter((_, i) => i !== index);
		handleStateUpdate({ appliedEffects: newEffects });
	}

	function handleClearEffects() {
		handleStateUpdate({ appliedEffects: [] });
	}

	// Undo/Redo handlers
	function handleUndo() {
		history.undo();
		syncToStore();
	}

	function handleRedo() {
		history.redo();
		syncToStore();
	}

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		// Skip if typing in an input
		if (
			(e.target as HTMLElement)?.tagName === "INPUT" ||
			(e.target as HTMLElement)?.tagName === "TEXTAREA"
		) {
			return;
		}

		// Modifier + key shortcuts
		if (e.ctrlKey || e.metaKey) {
			switch (e.key.toLowerCase()) {
				case "z":
					e.preventDefault();
					if (e.shiftKey) {
						handleRedo();
					} else {
						handleUndo();
					}
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
					fitToScreen();
					break;
				case "=":
				case "+":
					e.preventDefault();
					zoom = Math.min(5, zoom + 0.2);
					break;
				case "-":
					e.preventDefault();
					zoom = Math.max(0.1, zoom - 0.2);
					break;
			}
			return;
		}

		// Single key shortcuts
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
			case "p":
				activeTool = activeTool === "palette" ? null : "palette";
				break;
			case "e":
				activeTool = activeTool === "effects" ? null : "effects";
				break;
			case "x":
				activeTool = activeTool === "export" ? null : "export";
				break;
			case " ":
				e.preventDefault();
				isComparing = !isComparing;
				break;
			case "r":
				// Reset to fit
				fitToScreen();
				break;
			case "[":
				// Rotate left
				handleStateUpdate({ rotation: (history.currentState.rotation - 90 + 360) % 360 });
				break;
			case "]":
				// Rotate right
				handleStateUpdate({ rotation: (history.currentState.rotation + 90) % 360 });
				break;
			case "h":
				// Flip horizontal
				handleStateUpdate({ flipX: !history.currentState.flipX });
				break;
			case "v":
				// Flip vertical
				handleStateUpdate({ flipY: !history.currentState.flipY });
				break;
		}
	}

	// Canvas pan/zoom handlers
	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		if (e.ctrlKey || e.metaKey) {
			const delta = e.deltaY > 0 ? 0.9 : 1.1;
			zoom = Math.min(Math.max(0.1, zoom * delta), 5);
		} else {
			panX -= e.deltaX;
			panY -= e.deltaY;
		}
	}

	// Helper to get mouse position relative to the image
	function getImageRelativePosition(e: MouseEvent): { x: number; y: number } | null {
		if (!imageElement || !canvasContainer) return null;

		const containerRect = canvasContainer.getBoundingClientRect();

		// Calculate where the image is positioned (centered in container, then transformed)
		// The image container is centered in the flex parent
		const containerCenterX = containerRect.width / 2;
		const containerCenterY = containerRect.height / 2;

		// The image's top-left in container space (before zoom/pan)
		const imageHalfWidth = (imageWidth * zoom) / 2;
		const imageHalfHeight = (imageHeight * zoom) / 2;

		// Image top-left in screen space
		const imageScreenX = containerRect.left + containerCenterX - imageHalfWidth + panX * zoom;
		const imageScreenY = containerRect.top + containerCenterY - imageHalfHeight + panY * zoom;

		// Mouse position relative to image, accounting for zoom
		const x = (e.clientX - imageScreenX) / zoom;
		const y = (e.clientY - imageScreenY) / zoom;

		return { x, y };
	}

	function handleMouseDown(e: MouseEvent) {
		if (isCropping && activeTool === "crop") {
			const target = e.target as HTMLElement;
			const handle = target.dataset.handle;

			if (handle && cropRect) {
				activeCropHandle = handle;
				// Set anchor point to opposite corner for resizing
				let anchorX = cropRect.x;
				let anchorY = cropRect.y;

				if (handle.includes("left")) anchorX += cropRect.width;
				if (handle.includes("top")) anchorY += cropRect.height;

				cropStartPos = { x: anchorX, y: anchorY };
				return;
			}

			// Start crop selection relative to the image
			const pos = getImageRelativePosition(e);
			if (pos) {
				cropStartPos = pos;
			}
			return;
		}

		if (e.button === 1 || (e.button === 0 && !isCropping)) {
			isPanning = true;
			startPanX = e.clientX - panX;
			startPanY = e.clientY - panY;
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (cropStartPos && activeTool === "crop") {
			const pos = getImageRelativePosition(e);
			if (!pos) return;

			const currentX = pos.x;
			const currentY = pos.y;

			let width = currentX - cropStartPos.x;
			let height = currentY - cropStartPos.y;

			// Apply aspect ratio constraint
			if (aspectRatio !== "free") {
				const parts = aspectRatio.split(":").map(Number);
				const w = parts[0] ?? 1;
				const h = parts[1] ?? 1;
				const ratio = w / h;
				if (Math.abs(width) / Math.abs(height) > ratio) {
					width = Math.sign(width) * Math.abs(height) * ratio;
				} else {
					height = (Math.sign(height) * Math.abs(width)) / ratio;
				}
			}

			cropRect = {
				x: width >= 0 ? cropStartPos.x : cropStartPos.x + width,
				y: height >= 0 ? cropStartPos.y : cropStartPos.y + height,
				width: Math.abs(width),
				height: Math.abs(height),
			};
			return;
		}

		if (!isPanning) return;
		panX = e.clientX - startPanX;
		panY = e.clientY - startPanY;
	}

	function handleMouseUp() {
		isPanning = false;
		cropStartPos = null;
		activeCropHandle = null;
	}

	// Touch handlers for mobile
	let touchStartDist = 0;
	let touchStartZoom = 1;

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length === 1) {
			// Single touch - pan
			const touch = e.touches[0];
			if (touch) {
				isPanning = true;
				startPanX = touch.clientX - panX;
				startPanY = touch.clientY - panY;
			}
		} else if (e.touches.length === 2) {
			// Pinch to zoom
			e.preventDefault();
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			if (t1 && t2) {
				touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
				touchStartZoom = zoom;
			}
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (e.touches.length === 1 && isPanning) {
			const touch = e.touches[0];
			if (touch) {
				panX = touch.clientX - startPanX;
				panY = touch.clientY - startPanY;
			}
		} else if (e.touches.length === 2) {
			e.preventDefault();
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			if (t1 && t2) {
				const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
				const scale = dist / touchStartDist;
				zoom = Math.min(5, Math.max(0.1, touchStartZoom * scale));
			}
		}
	}

	function handleTouchEnd() {
		isPanning = false;
	}

	function fitToScreen() {
		zoom = 1;
		panX = 0;
		panY = 0;
	}

	// Crop handlers
	function handleApplyCrop() {
		if (cropRect) {
			history.pushState({ cropRect });
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
		if (!cropRect || !image) return;

		try {
			// Create a canvas with just the cropped region
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (!ctx) return;

			const img = new Image();
			img.crossOrigin = "anonymous";
			await new Promise((resolve) => {
				img.onload = resolve;
				img.src = image.src;
			});

			canvas.width = cropRect.width;
			canvas.height = cropRect.height;
			ctx.drawImage(
				img,
				cropRect.x,
				cropRect.y,
				cropRect.width,
				cropRect.height,
				0,
				0,
				cropRect.width,
				cropRect.height
			);

			const dataUrl = canvas.toDataURL();
			const colors = await extractPalette(dataUrl, { colorCount: 8, quality: "balanced" });
			extractedPalette = colors;

			toast.success("Extracted palette from selection!");
			activeTool = "palette";
		} catch (error) {
			console.error("Failed to extract from region:", error);
			toast.error("Failed to extract palette");
		}
	}

	// Tool selection handler
	function handleToolSelect(tool: EditorTool) {
		activeTool = tool;
		if (tool === "crop") {
			isCropping = true;
		} else {
			isCropping = false;
			cropRect = null;
		}
	}

	// Build CSS filter string - as a derived value for reactivity
	let filterString = $derived.by(() => {
		const state = history.currentState;
		if (isComparing) return "none";

		const filters: string[] = [];
		if (state.isGrayscale) filters.push("grayscale(100%)");
		if (state.sepia) filters.push(`sepia(${state.sepia}%)`);
		if (state.invert) filters.push(`invert(${state.invert}%)`);

		// Basic brightness adjustment
		if (state.brightness !== 100) filters.push(`brightness(${state.brightness}%)`);

		// Basic contrast adjustment
		if (state.contrast !== 100) filters.push(`contrast(${state.contrast}%)`);

		// Basic saturation adjustment
		if (state.saturation !== 100) filters.push(`saturate(${state.saturation}%)`);

		// Hue rotation
		if (state.hueRotate !== 0) filters.push(`hue-rotate(${state.hueRotate}deg)`);

		// Blur
		if (state.blur !== 0) filters.push(`blur(${state.blur}px)`);

		return filters.length > 0 ? filters.join(" ") : "none";
	});

	// Check if color adjustments (temperature/tint) are active
	let colorAdjustActive = $derived(
		history.currentState.temperature !== 0 || history.currentState.tint !== 0
	);

	// Function version for use in getEditedImageData
	function buildFilterString(): string {
		return filterString;
	}

	// Render preview with canvas-based effects (debounced)
	async function renderCanvasPreview(): Promise<void> {
		if (!image || !needsCanvasPreview) {
			previewDataUrl = null;
			return;
		}

		isRenderingPreview = true;

		try {
			const canvas = document.createElement("canvas");
			const img = await loadImage(image.src);

			await renderCanvasImage(canvas, img, history.currentState, {
				maxSize: 800,
				previewEffect:
					quickEffect !== "none"
						? {
								type: quickEffect,
								intensity: effectIntensity,
								duotoneColors: quickEffect === "duotone" ? duotoneColors : undefined,
							}
						: undefined,
			});

			previewDataUrl = canvas.toDataURL("image/jpeg", 0.85);
		} catch (error) {
			console.error("Preview render failed:", error);
			previewDataUrl = null;
		} finally {
			isRenderingPreview = false;
		}
	}

	// Debounced preview rendering
	function schedulePreviewRender(): void {
		if (renderTimeout) {
			clearTimeout(renderTimeout);
		}
		renderTimeout = setTimeout(() => {
			renderCanvasPreview();
		}, 100); // 100ms debounce
	}

	// Trigger preview re-render when relevant state changes
	$effect(() => {
		if (needsCanvasPreview && image) {
			// Access dependencies to track them
			const _ = [
				quickEffect,
				effectIntensity,
				duotoneColors,
				history.currentState.shadows,
				history.currentState.highlights,
				history.currentState.vibrance,
				history.currentState.clarity,
				history.currentState.temperature,
				history.currentState.tint,
				history.currentState.brightness,
				history.currentState.contrast,
				history.currentState.saturation,
				history.currentState.appliedEffects,
				history.currentState.appliedEffects?.length,
			];
			schedulePreviewRender();
		} else {
			previewDataUrl = null;
		}
	});

	// Get edited image as data URL (for palette extraction)
	async function getEditedImageData(): Promise<string> {
		if (!image) throw new Error("No image");

		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Could not get canvas context");

		const img = new Image();
		img.crossOrigin = "anonymous";
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
			img.src = image.src;
		});

		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;

		// Apply combined filters (including quick effects)
		const filterStr = combinedFilterString.replace("none", "");
		if (filterStr) {
			ctx.filter = filterStr;
		}

		// Apply transforms
		ctx.save();
		const state = history.currentState;
		ctx.translate(canvas.width / 2, canvas.height / 2);
		if (state.flipX) ctx.scale(-1, 1);
		if (state.flipY) ctx.scale(1, -1);
		ctx.rotate((state.rotation * Math.PI) / 180);
		ctx.translate(-canvas.width / 2, -canvas.height / 2);

		ctx.drawImage(img, 0, 0);
		ctx.restore();

		// Apply duotone overlay if active
		if (quickEffect === "duotone") {
			ctx.globalAlpha = effectIntensity / 100;
			ctx.globalCompositeOperation = "color";
			const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
			gradient.addColorStop(0, duotoneColors[1]);
			gradient.addColorStop(1, duotoneColors[0]);
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = "source-over";
		}

		return canvas.toDataURL("image/png");
	}

	// Build CSS transform string - as a derived value for reactivity
	let transformString = $derived.by(() => {
		const state = history.currentState;
		const transforms: string[] = [];
		if (state.scale !== 1) transforms.push(`scale(${state.scale})`);
		if (state.rotation !== 0) transforms.push(`rotate(${state.rotation}deg)`);
		if (state.flipX) transforms.push("scaleX(-1)");
		if (state.flipY) transforms.push("scaleY(-1)");
		return transforms.length > 0 ? transforms.join(" ") : "none";
	});

	// Function version for use in getEditedImageData
	function buildTransformString(): string {
		return transformString;
	}

	// Quick effect filter string
	let quickEffectFilter = $derived.by(() => {
		if (quickEffect === "none") return "";

		const intensity = effectIntensity / 100;

		switch (quickEffect) {
			case "posterize":
				// Posterize effect using contrast + saturation combo
				return `contrast(${100 + intensity * 100}%) saturate(${100 + intensity * 50}%)`;
			case "solarize":
				// Partial inversion for solarize effect
				return `invert(${intensity * 50}%)`;
			case "emboss":
				// Emboss approximation using drop shadow and desaturation
				return `contrast(${100 + intensity * 80}%) saturate(${100 - intensity * 60}%)`;
			case "sharpen":
				// Sharpen approximation with contrast
				return `contrast(${100 + intensity * 30}%)`;
			case "vhs":
				// VHS look: slight blur, saturation boost, contrast drop
				return `blur(${intensity * 0.5}px) saturate(${100 + intensity * 40}%) contrast(${100 - intensity * 15}%)`;
			case "glitch":
				// Glitch: just some color aberration effect via hue rotate + contrast
				return `hue-rotate(${intensity * 10}deg) contrast(${100 + intensity * 40}%)`;
			case "duotone":
				// Duotone handled separately via gradient map
				return "grayscale(100%)";
			case "halftone":
				// Halftone approximation: high contrast + slight blur
				return `contrast(${100 + intensity * 60}%)`;
			case "pixelate":
				// Pixelate can't really be done with CSS - show high contrast instead
				return `contrast(${100 + intensity * 50}%)`;
			default:
				return "";
		}
	});

	// Combined filter string including quick effects, curves, and color adjustments
	let combinedFilterString = $derived.by(() => {
		const base = filterString;
		const effect = quickEffectFilter;
		const curvesFilter = curvesModified ? `url(#curves-filter-${image?.id})` : "";
		const colorFilter = colorAdjustActive ? `url(#color-adjust-filter-${image?.id})` : "";

		const parts = [base !== "none" ? base : "", effect, curvesFilter, colorFilter].filter(Boolean);
		return parts.length > 0 ? parts.join(" ") : "none";
	});

	// Curves helpers - interpolate curve points using Catmull-Rom spline
	// Moved to image-processing.ts

	// Generate lookup table values for SVG feComponentTransfer from curve points
	function getCurveTableValues(channel: "rgb" | "red" | "green" | "blue"): string {
		const curves = history.currentState.curves ?? DEFAULT_EDITOR_STATE.curves;
		const points = curves[channel];

		// Check if curve is at default (linear) or points is empty/undefined
		if (
			!points ||
			points.length < 2 ||
			(points.length === 2 &&
				points[0]?.x === 0 &&
				points[0]?.y === 0 &&
				points[1]?.x === 255 &&
				points[1]?.y === 255)
		) {
			// Return linear identity table
			return Array.from({ length: 256 }, (_, i) => (i / 255).toFixed(4)).join(" ");
		}

		// Interpolate the curve
		const interpolated = interpolateCurvePoints(points);

		// Build a lookup table (256 values from 0 to 1)
		const lut = new Array(256).fill(0);

		// Fill the LUT by finding y value for each x
		for (let x = 0; x < 256; x++) {
			// Find the closest interpolated points
			let y = x; // Default to identity
			for (let i = 0; i < interpolated.length - 1; i++) {
				const p1 = interpolated[i];
				const p2 = interpolated[i + 1];
				if (p1 && p2 && p1.x <= x && p2.x >= x) {
					// Linear interpolation between these two points
					const t = p2.x !== p1.x ? (x - p1.x) / (p2.x - p1.x) : 0;
					y = p1.y + t * (p2.y - p1.y);
					break;
				}
			}
			lut[x] = Math.max(0, Math.min(255, y)) / 255;
		}

		return lut.map((v) => v.toFixed(4)).join(" ");
	}

	// Check if curves have been modified from default
	let curvesModified = $derived.by(() => {
		const curves = history.currentState.curves ?? DEFAULT_EDITOR_STATE.curves;
		const isDefault = (points: Array<{ x: number; y: number }> | undefined) =>
			!points ||
			points.length < 2 ||
			(points.length === 2 &&
				points[0]?.x === 0 &&
				points[0]?.y === 0 &&
				points[1]?.x === 255 &&
				points[1]?.y === 255);

		return (
			!isDefault(curves.rgb) ||
			!isDefault(curves.red) ||
			!isDefault(curves.green) ||
			!isDefault(curves.blue)
		);
	});

	// Gradient map helpers
	function getGradientTableValues(channel: "r" | "g" | "b"): string {
		let colors: string[] = [];

		if (app.gradients.activeGradient) {
			const sortedStops = [...app.gradients.activeGradient.stops].sort(
				(a, b) => a.position - b.position
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
				const rgb = tinycolor(c).toRgb();
				return rgb[channel] / 255;
			})
			.join(" ");
	}

	// Load image dimensions
	function handleImageLoad(e: Event) {
		const img = e.target as HTMLImageElement;
		imageWidth = img.naturalWidth;
		imageHeight = img.naturalHeight;
	}

	onMount(() => {
		window.addEventListener("keydown", handleKeydown);
		return () => window.removeEventListener("keydown", handleKeydown);
	});
</script>

{#if image}
	<div class="fixed inset-0 z-50 flex flex-col bg-void-deep" transition:fade={{ duration: 200 }}>
		<!-- Top Bar -->
		<div
			class="h-14 flex items-center justify-between px-4 bg-black/40 border-b border-white/10 z-20"
		>
			<!-- Left: Back + Title -->
			<div class="flex items-center gap-3">
				<button
					class="btn btn-sm btn-circle btn-ghost text-white/70 hover:text-white hover:bg-white/10"
					onclick={handleClose}
				>
					<Icon icon="material-symbols:arrow-back" class="w-5 h-5" />
				</button>
				<div class="h-5 w-px bg-white/10"></div>
				<h2
					class="text-white font-semibold text-sm sm:text-base truncate max-w-[150px] sm:max-w-[250px]"
				>
					{image.name}
				</h2>
			</div>

			<!-- Center: Undo/Redo + Compare -->
			<div class="flex items-center gap-1">
				<button
					class="btn btn-sm btn-ghost text-white/60 hover:text-white disabled:opacity-30"
					onclick={handleUndo}
					disabled={!history.canUndo}
					title="Undo (Ctrl+Z)"
				>
					<Icon icon="material-symbols:undo" class="w-5 h-5" />
				</button>
				<button
					class="btn btn-sm btn-ghost text-white/60 hover:text-white disabled:opacity-30"
					onclick={handleRedo}
					disabled={!history.canRedo}
					title="Redo (Ctrl+Shift+Z)"
				>
					<Icon icon="material-symbols:redo" class="w-5 h-5" />
				</button>
				<div class="h-5 w-px bg-white/10 mx-1"></div>
				<button
					class={cn(
						"btn btn-sm btn-ghost",
						isComparing ? "text-phoenix-primary" : "text-white/60 hover:text-white"
					)}
					onmousedown={() => (isComparing = true)}
					onmouseup={() => (isComparing = false)}
					onmouseleave={() => (isComparing = false)}
					title="Hold to compare original"
				>
					<Icon icon="material-symbols:compare" class="w-5 h-5" />
				</button>
			</div>

			<!-- Right: Zoom Controls + Help -->
			<div class="flex items-center gap-1">
				<button
					class="btn btn-sm btn-ghost text-white/60 hover:text-white"
					onclick={fitToScreen}
					title="Fit to screen (R)"
				>
					<Icon icon="material-symbols:fit-screen" class="w-5 h-5" />
				</button>
				<button
					class="btn btn-sm btn-ghost text-white/60 hover:text-white"
					onclick={() => (zoom = Math.max(0.1, zoom - 0.2))}
					title="Zoom out (Ctrl+-)"
				>
					<Icon icon="material-symbols:remove" class="w-4 h-4" />
				</button>
				<span class="text-xs font-mono text-white/60 min-w-[45px] text-center">
					{Math.round(zoom * 100)}%
				</span>
				<button
					class="btn btn-sm btn-ghost text-white/60 hover:text-white"
					onclick={() => (zoom = Math.min(5, zoom + 0.2))}
					title="Zoom in (Ctrl++)"
				>
					<Icon icon="material-symbols:add" class="w-4 h-4" />
				</button>
				<div class="h-5 w-px bg-white/10 mx-1 hidden sm:block"></div>
				<button
					class="btn btn-sm btn-ghost text-white/60 hover:text-white hidden sm:flex"
					onclick={() => (showShortcuts = true)}
					title="Keyboard shortcuts"
				>
					<Icon icon="material-symbols:keyboard" class="w-5 h-5" />
				</button>
			</div>
		</div>

		<!-- Canvas Area -->
		<div
			bind:this={canvasContainer}
			class="flex-1 relative overflow-hidden flex items-center justify-center select-none touch-none"
			onwheel={handleWheel}
			onmousedown={handleMouseDown}
			onmousemove={handleMouseMove}
			onmouseup={handleMouseUp}
			onmouseleave={handleMouseUp}
			ontouchstart={handleTouchStart}
			ontouchmove={handleTouchMove}
			ontouchend={handleTouchEnd}
			style:cursor={isCropping ? "crosshair" : isPanning ? "grabbing" : "grab"}
			role="presentation"
		>
			<!-- Checkered Background -->
			<div class="absolute inset-0 bg-checkered opacity-30"></div>

			<!-- Canvas Content -->
			<div
				class="relative transition-transform duration-75 ease-out will-change-transform"
				style:transform="translate({panX}px, {panY}px) scale({zoom})"
			>
				<!-- Image Container with Crop -->
				<div class="relative" style:clip-path={appliedCrop && !isComparing ? cropClipPath : "none"}>
					{#if isComparing}
						<!-- Show original image when comparing -->
						<img
							bind:this={imageElement}
							src={image.src}
							alt={image.name}
							class="max-w-none shadow-2xl"
							style:opacity={1}
							onload={handleImageLoad}
							draggable="false"
						/>
					{:else if needsCanvasPreview && previewDataUrl}
						<!-- Canvas-rendered preview for complex effects -->
						<img
							src={previewDataUrl}
							alt={image.name}
							class="max-w-none shadow-2xl"
							style:transform={transformString}
							style:opacity={history.currentState.opacity}
							draggable="false"
						/>
						<!-- Original image hidden but used for dimensions -->
						<img
							bind:this={imageElement}
							src={image.src}
							alt=""
							class="hidden"
							onload={handleImageLoad}
						/>
					{:else}
						<!-- Standard CSS-filtered preview -->
						<img
							bind:this={imageElement}
							src={image.src}
							alt={image.name}
							class="max-w-none shadow-2xl"
							style:filter={combinedFilterString}
							style:transform={transformString}
							style:opacity={history.currentState.opacity}
							onload={handleImageLoad}
							draggable="false"
						/>
					{/if}
					<!-- Loading indicator for canvas preview -->
					{#if needsCanvasPreview && isRenderingPreview && !previewDataUrl && !isComparing}
						<div class="absolute inset-0 flex items-center justify-center bg-black/30">
							<span class="loading loading-spinner loading-md text-phoenix-primary"></span>
						</div>
					{/if}
				</div>

				<!-- Gradient Map Overlay -->
				{#if history.currentState.gradientMapOpacity > 0 && (app.gradients.activeGradient || app.palettes.activePalette)}
					<div
						class="absolute inset-0 pointer-events-none"
						style:opacity={history.currentState.gradientMapOpacity}
						style:mix-blend-mode={history.currentState.gradientMapBlendMode}
						style:transform={transformString}
						style:clip-path={appliedCrop ? cropClipPath : "none"}
					>
						<img
							src={image.src}
							alt=""
							class="w-full h-full object-contain"
							style:filter="url(#gradient-map-{image.id}) {filterString.replace(
								/blur\([^)]+\)/,
								''
							)}"
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
				{#if history.currentState.vignette > 0}
					<div
						class="absolute inset-0 pointer-events-none"
						style:background="radial-gradient(ellipse at center, transparent 0%, transparent 50%,
						rgba(0,0,0,{history.currentState.vignette / 100}) 100%)"
						style:transform={transformString}
						style:clip-path={appliedCrop ? cropClipPath : "none"}
					></div>
				{/if}

				<!-- Crop Overlay -->
				{#if isCropping && cropRect}
					<div class="absolute inset-0 pointer-events-none">
						<!-- Darkened area outside crop -->
						<div class="absolute inset-0 bg-black/60"></div>
						<!-- Crop selection -->
						<div
							class="absolute border-2 border-white shadow-lg"
							style:left="{cropRect.x}px"
							style:top="{cropRect.y}px"
							style:width="{cropRect.width}px"
							style:height="{cropRect.height}px"
						>
							<!-- Clear area inside -->
							<div class="absolute inset-0" style:box-shadow="0 0 0 9999px rgba(0,0,0,0.6)"></div>
							<!-- Rule of thirds grid -->
							<div class="absolute inset-0 grid grid-cols-3 grid-rows-3">
								{#each Array(9) as _, i}
									<div class="border border-white/30"></div>
								{/each}
							</div>
							<!-- Corner handles -->
							{#each ["top-left", "top-right", "bottom-left", "bottom-right"] as corner}
								<div
									class={cn(
										"absolute w-4 h-4 bg-white rounded-full border-2 border-phoenix-primary pointer-events-auto",
										corner.includes("top") && "top-0 -translate-y-1/2",
										corner.includes("bottom") && "bottom-0 translate-y-1/2",
										corner.includes("left") && "left-0 -translate-x-1/2",
										corner.includes("right") && "right-0 translate-x-1/2"
									)}
									data-handle={corner}
								></div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Rulers (if enabled) -->
			{#if app.settings.state.workspace.showRulers}
				<div class="absolute top-0 left-8 right-0 h-6 bg-black/60 border-b border-white/10 z-10">
					<span class="text-[10px] text-white/40 font-mono ml-2">0px</span>
				</div>
				<div class="absolute top-6 left-0 bottom-0 w-6 bg-black/60 border-r border-white/10 z-10">
					<span class="text-[10px] text-white/40 font-mono mt-2 ml-1 rotate-90 origin-top-left"
						>0px</span
					>
				</div>
			{/if}
		</div>

		<!-- Bottom Toolbar -->
		<EditorToolbar {activeTool} onToolSelect={handleToolSelect} />

		<!-- Panels -->
		<EditorPanel
			title="Adjust"
			icon="material-symbols:tune"
			isOpen={activeTool === "adjust"}
			onClose={() => (activeTool = null)}
		>
			<AdjustPanel editorState={history.currentState} onUpdate={handleStateUpdate} />
		</EditorPanel>

		<EditorPanel
			title="Filters"
			icon="material-symbols:filter-vintage"
			isOpen={activeTool === "filters"}
			onClose={() => (activeTool = null)}
			size="lg"
		>
			<div class="space-y-6">
				<!-- Filter Presets -->
				<FiltersPanel
					currentState={history.currentState}
					imageSrc={image.src}
					onApplyPreset={handlePresetApply}
				/>

				<!-- Curves Panel -->
				<div class="pt-4 border-t border-white/10">
					<h4
						class="text-xs font-bold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2"
					>
						<Icon icon="material-symbols:show-chart" class="w-4 h-4" />
						Curves
					</h4>
					<CurvesPanel
						imageSrc={image.src}
						curves={history.currentState.curves ?? DEFAULT_EDITOR_STATE.curves}
						onCurvesChange={(newCurves) => handleStateUpdate({ curves: newCurves })}
					/>
				</div>

				<!-- Transform -->
				<div class="pt-4 border-t border-white/10">
					<h4
						class="text-xs font-bold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2"
					>
						<Icon icon="material-symbols:transform" class="w-4 h-4" />
						Transform
					</h4>
					<TransformPanel editorState={history.currentState} onUpdate={handleStateUpdate} />
				</div>
			</div>
		</EditorPanel>

		<EditorPanel
			title="Crop"
			icon="material-symbols:crop"
			isOpen={activeTool === "crop"}
			onClose={() => {
				handleCancelCrop();
				activeTool = null;
			}}
		>
			<CropPanel
				{cropRect}
				{aspectRatio}
				onCropChange={(rect) => (cropRect = rect)}
				onAspectRatioChange={(ratio) => (aspectRatio = ratio)}
				onApplyCrop={handleApplyCrop}
				onCancelCrop={handleCancelCrop}
				onExtractFromRegion={handleExtractFromRegion}
				{imageWidth}
				{imageHeight}
			/>
		</EditorPanel>

		<EditorPanel
			title="Palette"
			icon="material-symbols:palette"
			isOpen={activeTool === "palette"}
			onClose={() => (activeTool = null)}
		>
			<PalettePanel
				imageSrc={image.src}
				{getEditedImageData}
				gradientMapOpacity={history.currentState.gradientMapOpacity}
				gradientMapBlendMode={history.currentState.gradientMapBlendMode}
				onGradientMapChange={(opacity, blendMode) =>
					handleStateUpdate({ gradientMapOpacity: opacity, gradientMapBlendMode: blendMode })}
			/>
		</EditorPanel>

		<EditorPanel
			title="Effects"
			icon="material-symbols:auto-fix-high"
			isOpen={activeTool === "effects"}
			onClose={() => (activeTool = null)}
		>
			<EffectsPanel
				activeEffect={quickEffect}
				{effectIntensity}
				{duotoneColors}
				appliedEffects={history.currentState.appliedEffects}
				onEffectChange={(effect) => (quickEffect = effect)}
				onIntensityChange={(intensity) => (effectIntensity = intensity)}
				onDuotoneColorsChange={(colors) => (duotoneColors = colors)}
				onApplyEffect={handleApplyEffect}
				onRemoveEffect={handleRemoveEffect}
				onClearEffects={handleClearEffects}
			/>
		</EditorPanel>

		<EditorPanel
			title="Export"
			icon="material-symbols:download"
			isOpen={activeTool === "export"}
			onClose={() => (activeTool = null)}
		>
			<ExportPanelEnhanced
				imageSrc={image.src}
				imageName={image.name}
				editorState={history.currentState}
				{quickEffect}
				{effectIntensity}
				{duotoneColors}
				{extractedPalette}
			/>
		</EditorPanel>
	</div>

	<!-- SVG Filters -->
	<svg class="hidden" aria-hidden="true">
		<defs>
			<!-- Temperature/Tint Filter -->
			<filter id="color-adjust-filter-{image.id}" color-interpolation-filters="sRGB">
				<!-- Apply temperature adjustment -->
				<feColorMatrix
					type="matrix"
					values={getTemperatureColorMatrix(history.currentState.temperature)}
					result="temp-adjusted"
				/>
				<!-- Apply tint adjustment -->
				<feColorMatrix
					type="matrix"
					in="temp-adjusted"
					values={getTintColorMatrix(history.currentState.tint)}
				/>
			</filter>

			<!-- Curves Filter -->
			<filter id="curves-filter-{image.id}" color-interpolation-filters="sRGB">
				<!-- First apply RGB master curve -->
				<feComponentTransfer result="rgb-adjusted">
					<feFuncR type="table" tableValues={getCurveTableValues("rgb")} />
					<feFuncG type="table" tableValues={getCurveTableValues("rgb")} />
					<feFuncB type="table" tableValues={getCurveTableValues("rgb")} />
					<feFuncA type="identity" />
				</feComponentTransfer>
				<!-- Then apply individual channel curves -->
				<feComponentTransfer in="rgb-adjusted">
					<feFuncR type="table" tableValues={getCurveTableValues("red")} />
					<feFuncG type="table" tableValues={getCurveTableValues("green")} />
					<feFuncB type="table" tableValues={getCurveTableValues("blue")} />
					<feFuncA type="identity" />
				</feComponentTransfer>
			</filter>

			<!-- Gradient Map Filter -->
			<filter id="gradient-map-{image.id}" color-interpolation-filters="sRGB">
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

	<!-- Keyboard Shortcuts Dialog -->
	{#if showShortcuts}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm"
			onclick={() => (showShortcuts = false)}
			onkeydown={(e) => e.key === "Escape" && (showShortcuts = false)}
			role="dialog"
			aria-modal="true"
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
					<h3 class="text-lg font-bold text-white flex items-center gap-2">
						<Icon icon="material-symbols:keyboard" class="w-5 h-5 text-phoenix-primary" />
						Keyboard Shortcuts
					</h3>
					<button
						class="btn btn-sm btn-circle btn-ghost text-white/60 hover:text-white"
						onclick={() => (showShortcuts = false)}
					>
						<Icon icon="material-symbols:close" class="w-5 h-5" />
					</button>
				</div>

				<div class="space-y-4 text-sm">
					<!-- Tools -->
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Tools</h4>
						<div class="grid grid-cols-2 gap-1">
							<div class="flex justify-between text-white/70">
								<span>Adjust</span><kbd class="kbd kbd-sm">A</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Filters</span><kbd class="kbd kbd-sm">F</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Crop</span><kbd class="kbd kbd-sm">C</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Palette</span><kbd class="kbd kbd-sm">P</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Effects</span><kbd class="kbd kbd-sm">E</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Export</span><kbd class="kbd kbd-sm">X</kbd>
							</div>
						</div>
					</div>

					<!-- Actions -->
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Actions</h4>
						<div class="grid grid-cols-2 gap-1">
							<div class="flex justify-between text-white/70">
								<span>Undo</span><kbd class="kbd kbd-sm">Ctrl+Z</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Redo</span><kbd class="kbd kbd-sm">Ctrl+Y</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Save</span><kbd class="kbd kbd-sm">Ctrl+S</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Compare</span><kbd class="kbd kbd-sm">Space</kbd>
							</div>
						</div>
					</div>

					<!-- View -->
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">View</h4>
						<div class="grid grid-cols-2 gap-1">
							<div class="flex justify-between text-white/70">
								<span>Zoom In</span><kbd class="kbd kbd-sm">Ctrl++</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Zoom Out</span><kbd class="kbd kbd-sm">Ctrl+-</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Fit</span><kbd class="kbd kbd-sm">R</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>100%</span><kbd class="kbd kbd-sm">Ctrl+0</kbd>
							</div>
						</div>
					</div>

					<!-- Transform -->
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Transform</h4>
						<div class="grid grid-cols-2 gap-1">
							<div class="flex justify-between text-white/70">
								<span>Rotate Left</span><kbd class="kbd kbd-sm">[</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Rotate Right</span><kbd class="kbd kbd-sm">]</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Flip H</span><kbd class="kbd kbd-sm">H</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Flip V</span><kbd class="kbd kbd-sm">V</kbd>
							</div>
						</div>
					</div>

					<!-- General -->
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">General</h4>
						<div class="grid grid-cols-2 gap-1">
							<div class="flex justify-between text-white/70">
								<span>Close Panel</span><kbd class="kbd kbd-sm">Esc</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Exit Editor</span><kbd class="kbd kbd-sm">Esc</kbd>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
{/if}

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
