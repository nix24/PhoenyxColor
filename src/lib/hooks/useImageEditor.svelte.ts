/**
 * Business logic hook for the image editor.
 * Owns EditorHistory, store sync, canvas preview rendering, and effect management.
 * All state flows through this hook — child components receive props, not store access.
 */

import { untrack } from "svelte";
import { app } from "$lib/stores/root.svelte";
import {
	createEditorHistory,
	DEFAULT_EDITOR_STATE,
	type ImageEditorState,
	type AppliedEffect,
	type QuickEffectType,
} from "$lib/components/editor/EditorHistory.svelte";
import { renderCanvasImage, loadImage } from "$lib/utils/canvas-renderer";
import {
	getTemperatureColorMatrix,
	getTintColorMatrix,
	isDefaultCurvePoints,
	createCurveLookupTable,
} from "$lib/utils/image-processing";
import { buildCSSFilterString, buildTransformString } from "$lib/utils/image-filters";
import { generateLayerThumbnail } from "$lib/utils/layer-compositor";
import type { ImageLayer } from "$lib/types/image-editor";
import type { QuickEffect } from "$lib/types/effects";

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

export function useImageEditor(getImageId: () => string) {
	const history = createEditorHistory();

	let quickEffect = $state<QuickEffect>("none");
	let effectIntensity = $state(50);
	let duotoneColors = $state<[string, string]>(["#000000", "#ffffff"]);

	let previewDataUrl = $state<string | null>(null);
	let isRenderingPreview = $state(false);
	let previewError = $state<string | null>(null);
	let renderTimeout: ReturnType<typeof setTimeout> | null = null;
	let renderGeneration = 0;

	let extractedPalette = $state<string[] | null>(null);
	let imageWidth = $state(0);
	let imageHeight = $state(0);

	const image = $derived(app.references.references.find((r) => r.id === getImageId()));

	const needsCanvasPreview = $derived(
		CANVAS_REQUIRED_EFFECTS.includes(quickEffect) ||
			history.currentState.shadows !== 0 ||
			history.currentState.highlights !== 0 ||
			history.currentState.vibrance !== 0 ||
			history.currentState.clarity !== 0 ||
			(history.currentState.appliedEffects && history.currentState.appliedEffects.length > 0),
	);

	const filterString = $derived(buildCSSFilterString(history.currentState));
	const transformString = $derived(buildTransformString(history.currentState));
	const colorAdjustActive = $derived(
		history.currentState.temperature !== 0 || history.currentState.tint !== 0,
	);
	const appliedCrop = $derived(history.currentState.cropRect);

	const cropClipPath = $derived.by(() => {
		const crop = appliedCrop;
		if (!crop || !imageWidth || !imageHeight) return "none";
		const left = (crop.x / imageWidth) * 100;
		const top = (crop.y / imageHeight) * 100;
		const right = 100 - ((crop.x + crop.width) / imageWidth) * 100;
		const bottom = 100 - ((crop.y + crop.height) / imageHeight) * 100;
		return `inset(${top}% ${right}% ${bottom}% ${left}%)`;
	});

	const curvesModified = $derived.by(() => {
		const curves = history.currentState.curves ?? DEFAULT_EDITOR_STATE.curves;
		return (
			!isDefaultCurvePoints(curves.rgb) ||
			!isDefaultCurvePoints(curves.red) ||
			!isDefaultCurvePoints(curves.green) ||
			!isDefaultCurvePoints(curves.blue)
		);
	});

	const quickEffectFilter = $derived.by(() => {
		if (quickEffect === "none") return "";
		const intensity = effectIntensity / 100;
		switch (quickEffect) {
			case "posterize":
				return `contrast(${100 + intensity * 100}%) saturate(${100 + intensity * 50}%)`;
			case "solarize":
				return `invert(${intensity * 50}%)`;
			case "emboss":
				return `contrast(${100 + intensity * 80}%) saturate(${100 - intensity * 60}%)`;
			case "sharpen":
				return `contrast(${100 + intensity * 30}%)`;
			case "vhs":
				return `blur(${intensity * 0.5}px) saturate(${100 + intensity * 40}%) contrast(${100 - intensity * 15}%)`;
			case "glitch":
				return `hue-rotate(${intensity * 10}deg) contrast(${100 + intensity * 40}%)`;
			case "duotone":
				return "grayscale(100%)";
			case "halftone":
				return `contrast(${100 + intensity * 60}%)`;
			case "pixelate":
				return `contrast(${100 + intensity * 50}%)`;
			default:
				return "";
		}
	});

	const combinedFilterString = $derived.by(() => {
		const base = filterString;
		const effect = quickEffectFilter;
		const curvesFilter = curvesModified ? `url(#curves-filter-${image?.id})` : "";
		const colorFilter = colorAdjustActive ? `url(#color-adjust-filter-${image?.id})` : "";
		const parts = [base !== "none" ? base : "", effect, curvesFilter, colorFilter].filter(Boolean);
		return parts.length > 0 ? parts.join(" ") : "none";
	});

	// --- Actions ---

	function initializeFromImage() {
		const currentId = getImageId();
		untrack(() => {
			const img = app.references.references.find((r) => r.id === currentId);
			if (!img) return;
			history.initialize({
				brightness: img.brightness ?? 100,
				contrast: img.contrast ?? 100,
				saturation: img.saturation ?? 100,
				hueRotate: img.hueRotate ?? 0,
				blur: img.blur ?? 0,
				opacity: img.opacity ?? 1,
				sepia: img.sepia ?? 0,
				invert: img.invert ?? 0,
				isGrayscale: img.isGrayscale ?? false,
				scale: img.scale ?? 1,
				rotation: img.rotation ?? 0,
				flipX: img.flipX ?? false,
				flipY: img.flipY ?? false,
				gradientMapOpacity: img.gradientMapOpacity ?? 0,
				gradientMapBlendMode: img.gradientMapBlendMode ?? "normal",
				shadows: img.shadows ?? 0,
				highlights: img.highlights ?? 0,
				vibrance: img.vibrance ?? 0,
				temperature: img.temperature ?? 0,
				tint: img.tint ?? 0,
				clarity: img.clarity ?? 0,
				vignette: img.vignette ?? 0,
				curves: img.curves ?? DEFAULT_EDITOR_STATE.curves,
				cropRect: img.cropRect ?? null,
				appliedEffects: (img.appliedEffects ?? []) as AppliedEffect[],
				drawStrokes: img.drawStrokes ?? [],
				layers: ((img as Record<string, unknown>).layers as ImageLayer[] | undefined) ?? [],
				activeLayerId:
					((img as Record<string, unknown>).activeLayerId as string | null | undefined) ?? null,
			});
		});
	}

	function syncToStore() {
		if (!image) return;
		const s = history.currentState;
		app.references.update(getImageId(), {
			brightness: s.brightness,
			contrast: s.contrast,
			saturation: s.saturation,
			hueRotate: s.hueRotate,
			blur: s.blur,
			opacity: s.opacity,
			sepia: s.sepia,
			invert: s.invert,
			isGrayscale: s.isGrayscale,
			scale: s.scale,
			rotation: s.rotation,
			flipX: s.flipX,
			flipY: s.flipY,
			gradientMapOpacity: s.gradientMapOpacity,
			gradientMapBlendMode: s.gradientMapBlendMode,
			shadows: s.shadows,
			highlights: s.highlights,
			vibrance: s.vibrance,
			temperature: s.temperature,
			tint: s.tint,
			clarity: s.clarity,
			vignette: s.vignette,
			curves: s.curves,
			cropRect: s.cropRect,
			appliedEffects: s.appliedEffects,
			drawStrokes: s.drawStrokes,
			layers: s.layers,
			activeLayerId: s.activeLayerId,
		} as Record<string, unknown>);
	}

	function handleStateUpdate(updates: Partial<ImageEditorState>) {
		history.pushState(updates);
		syncToStore();
	}

	function handlePresetApply(preset: Partial<ImageEditorState>, intensity: number) {
		const current = history.currentState;
		const baseState: Partial<ImageEditorState> = {
			...current,
			brightness: DEFAULT_EDITOR_STATE.brightness,
			contrast: DEFAULT_EDITOR_STATE.contrast,
			saturation: DEFAULT_EDITOR_STATE.saturation,
			hueRotate: DEFAULT_EDITOR_STATE.hueRotate,
			blur: DEFAULT_EDITOR_STATE.blur,
			opacity: DEFAULT_EDITOR_STATE.opacity,
			sepia: DEFAULT_EDITOR_STATE.sepia,
			invert: DEFAULT_EDITOR_STATE.invert,
			isGrayscale: DEFAULT_EDITOR_STATE.isGrayscale,
			shadows: DEFAULT_EDITOR_STATE.shadows,
			highlights: DEFAULT_EDITOR_STATE.highlights,
			vibrance: DEFAULT_EDITOR_STATE.vibrance,
			temperature: DEFAULT_EDITOR_STATE.temperature,
			tint: DEFAULT_EDITOR_STATE.tint,
			clarity: DEFAULT_EDITOR_STATE.clarity,
			vignette: DEFAULT_EDITOR_STATE.vignette,
			curves: DEFAULT_EDITOR_STATE.curves,
			gradientMapOpacity: DEFAULT_EDITOR_STATE.gradientMapOpacity,
			gradientMapBlendMode: DEFAULT_EDITOR_STATE.gradientMapBlendMode,
		};

		if (intensity === 100) {
			handleStateUpdate({ ...baseState, ...preset });
			return;
		}

		const blended: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(preset)) {
			const defaultVal = DEFAULT_EDITOR_STATE[key as keyof ImageEditorState];
			if (typeof value === "number" && typeof defaultVal === "number") {
				blended[key] = defaultVal + (value - defaultVal) * (intensity / 100);
			} else {
				blended[key] = value;
			}
		}
		handleStateUpdate({ ...baseState, ...(blended as Partial<ImageEditorState>) });
	}

	function handleApplyEffect() {
		if (quickEffect === "none") return;
		const newEffect: AppliedEffect = {
			type: quickEffect as QuickEffectType,
			intensity: effectIntensity,
		};
		if (quickEffect === "duotone") {
			newEffect.duotoneColors = [...duotoneColors] as [string, string];
		}
		const currentEffects = history.currentState.appliedEffects || [];
		handleStateUpdate({ appliedEffects: [...currentEffects, newEffect] });
		quickEffect = "none";
		effectIntensity = 50;
	}

	function handleRemoveEffect(index: number) {
		const currentEffects = history.currentState.appliedEffects || [];
		handleStateUpdate({ appliedEffects: currentEffects.filter((_, i) => i !== index) });
	}

	function handleClearEffects() {
		handleStateUpdate({ appliedEffects: [] });
	}

	function handleUndo() {
		history.undo();
		syncToStore();
	}

	function handleRedo() {
		history.redo();
		syncToStore();
	}

	// --- Canvas preview ---

	async function renderCanvasPreview(): Promise<void> {
		const generation = ++renderGeneration;
		if (!image || !needsCanvasPreview) {
			previewDataUrl = null;
			previewError = null;
			return;
		}
		isRenderingPreview = true;
		previewError = null;
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
			if (generation !== renderGeneration) return;
			previewDataUrl = canvas.toDataURL("image/jpeg", 0.85);
		} catch (error) {
			console.error("Preview render failed:", error);
			if (generation === renderGeneration) {
				previewDataUrl = null;
				previewError = "The processed preview could not be rendered.";
			}
		} finally {
			if (generation === renderGeneration) isRenderingPreview = false;
		}
	}

	function schedulePreviewRender(): void {
		if (renderTimeout) clearTimeout(renderTimeout);
		renderTimeout = setTimeout(renderCanvasPreview, 100);
	}

	async function generateThumbnailWithEffects(): Promise<string | null> {
		if (!image) return null;
		const s = history.currentState;
		try {
			const canvas = document.createElement("canvas");
			const img = await loadImage(image.src);
			await renderCanvasImage(canvas, img, s, { maxSize: 256 });
			return canvas.toDataURL("image/jpeg", 0.8);
		} catch (error) {
			console.error("Failed to generate thumbnail:", error);
			return null;
		}
	}

	async function getEditedImageData(): Promise<string> {
		if (!image) throw new Error("No image");
		const canvas = document.createElement("canvas");
		const img = await loadImage(image.src);
		await renderCanvasImage(canvas, img, history.currentState, {
			previewEffect:
				quickEffect !== "none"
					? {
							type: quickEffect,
							intensity: effectIntensity,
							duotoneColors: quickEffect === "duotone" ? duotoneColors : undefined,
						}
					: undefined,
		});
		return canvas.toDataURL("image/png");
	}

	function getCurveTableValues(channel: "rgb" | "red" | "green" | "blue"): string {
		const curves = history.currentState.curves ?? DEFAULT_EDITOR_STATE.curves;
		const points = curves[channel];
		if (isDefaultCurvePoints(points)) {
			return Array.from({ length: 256 }, (_, i) => (i / 255).toFixed(4)).join(" ");
		}
		return Array.from(createCurveLookupTable(points), (value) => (value / 255).toFixed(4)).join(
			" ",
		);
	}

	function setImageDimensions(width: number, height: number) {
		imageWidth = width;
		imageHeight = height;
	}

	// --- Layer operations ---

	function addLayer(layer: ImageLayer) {
		const currentLayers = history.currentState.layers;
		handleStateUpdate({
			layers: [...currentLayers, layer],
			activeLayerId: layer.id,
		});
	}

	async function addImageLayer(src: string, name: string) {
		const thumbnail = await generateLayerThumbnail(src);
		const layer: ImageLayer = {
			id: crypto.randomUUID(),
			name,
			type: "image",
			src,
			thumbnailSrc: thumbnail,
			opacity: 1,
			blendMode: "normal",
			visible: true,
			locked: false,
		};
		addLayer(layer);
	}

	function removeLayer(layerId: string) {
		const currentLayers = history.currentState.layers;
		const filtered = currentLayers.filter((l) => l.id !== layerId);
		const newActiveId =
			history.currentState.activeLayerId === layerId
				? (filtered[filtered.length - 1]?.id ?? null)
				: history.currentState.activeLayerId;
		handleStateUpdate({ layers: filtered, activeLayerId: newActiveId });
	}

	function updateLayer(layerId: string, updates: Partial<ImageLayer>) {
		const currentLayers = history.currentState.layers;
		handleStateUpdate({
			layers: currentLayers.map((l) => (l.id === layerId ? { ...l, ...updates } : l)),
		});
	}

	function reorderLayers(fromIndex: number, toIndex: number) {
		const currentLayers = [...history.currentState.layers];
		const [moved] = currentLayers.splice(fromIndex, 1);
		if (!moved) return;
		currentLayers.splice(toIndex, 0, moved);
		handleStateUpdate({ layers: currentLayers });
	}

	function duplicateLayer(layerId: string) {
		const currentLayers = history.currentState.layers;
		const source = currentLayers.find((l) => l.id === layerId);
		if (!source) return;
		const newLayer: ImageLayer = {
			...source,
			id: crypto.randomUUID(),
			name: `${source.name} Copy`,
		};
		const index = currentLayers.indexOf(source);
		const updated = [...currentLayers];
		updated.splice(index + 1, 0, newLayer);
		handleStateUpdate({ layers: updated, activeLayerId: newLayer.id });
	}

	function setActiveLayer(layerId: string | null) {
		handleStateUpdate({ activeLayerId: layerId });
	}

	function mergeDown(layerId: string) {
		const currentLayers = history.currentState.layers;
		const index = currentLayers.findIndex((l) => l.id === layerId);
		if (index <= 0) return;
		// For now, just remove the top layer (full canvas composite would be overkill without render)
		const updated = currentLayers.filter((_, i) => i !== index);
		handleStateUpdate({ layers: updated });
	}

	function flattenAllLayers() {
		handleStateUpdate({ layers: [], activeLayerId: null });
	}

	function cleanup() {
		renderGeneration += 1;
		if (renderTimeout) clearTimeout(renderTimeout);
		// Revoke blob URLs from layers to prevent memory leaks
		for (const layer of history.currentState.layers) {
			if (layer.src?.startsWith("blob:")) URL.revokeObjectURL(layer.src);
			if (layer.thumbnailSrc?.startsWith("blob:")) URL.revokeObjectURL(layer.thumbnailSrc);
		}
	}

	return {
		history,
		get image() {
			return image;
		},
		get imageWidth() {
			return imageWidth;
		},
		get imageHeight() {
			return imageHeight;
		},
		setImageDimensions,
		// Effects
		get quickEffect() {
			return quickEffect;
		},
		set quickEffect(v: QuickEffect) {
			quickEffect = v;
		},
		get effectIntensity() {
			return effectIntensity;
		},
		set effectIntensity(v: number) {
			effectIntensity = v;
		},
		get duotoneColors() {
			return duotoneColors;
		},
		set duotoneColors(v: [string, string]) {
			duotoneColors = v;
		},
		handleApplyEffect,
		handleRemoveEffect,
		handleClearEffects,
		// Preview
		get previewDataUrl() {
			return previewDataUrl;
		},
		get isRenderingPreview() {
			return isRenderingPreview;
		},
		get previewError() {
			return previewError;
		},
		get needsCanvasPreview() {
			return needsCanvasPreview;
		},
		schedulePreviewRender,
		// Palette
		get extractedPalette() {
			return extractedPalette;
		},
		set extractedPalette(v: string[] | null) {
			extractedPalette = v;
		},
		// Derived strings
		get filterString() {
			return filterString;
		},
		get transformString() {
			return transformString;
		},
		get combinedFilterString() {
			return combinedFilterString;
		},
		get quickEffectFilter() {
			return quickEffectFilter;
		},
		get colorAdjustActive() {
			return colorAdjustActive;
		},
		get curvesModified() {
			return curvesModified;
		},
		get appliedCrop() {
			return appliedCrop;
		},
		get cropClipPath() {
			return cropClipPath;
		},
		// Actions
		initializeFromImage,
		handleStateUpdate,
		handlePresetApply,
		handleUndo,
		handleRedo,
		generateThumbnailWithEffects,
		getEditedImageData,
		getCurveTableValues,
		getTemperatureColorMatrix,
		getTintColorMatrix,
		// Layers
		addImageLayer,
		removeLayer,
		updateLayer,
		reorderLayers,
		duplicateLayer,
		setActiveLayer,
		mergeDown,
		flattenAllLayers,
		cleanup,
	};
}
