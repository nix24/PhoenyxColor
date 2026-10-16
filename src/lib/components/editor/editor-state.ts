/**
 * The editor panels speak the flat v1 editor state (brightness 0–200 with 100 neutral, etc.); the
 * References feature stores an `EditRecipe` (0 = neutral, grouped). This adapter converts at the
 * UI edge, so the panel markup stays unchanged while everything below it reads recipes.
 */
import { toHex } from "$lib/core/color";
import { EditRecipeSchema, type EditRecipe, type FilterPreset } from "$lib/features/references";
import {
	BLEND_MODE_VALUES,
	type BlendMode,
	type EffectPatch,
	type FilterPresetSettings,
	type ImageLayer,
} from "$lib/types/image-editor";
import { DEFAULT_EDITOR_STATE, type ImageEditorState } from "$lib/types/image-editor";

/** v1 brightness, contrast and saturation are 0–200 with 100 neutral; the recipe is −100…100. */
const CENTRE = 100;

type RecipeLayer = EditRecipe["layers"][number];
export type GradientStops = NonNullable<EditRecipe["gradientMap"]>["stops"];

function isBlendMode(value: string): value is BlendMode {
	return BLEND_MODE_VALUES.some((mode) => mode === value);
}

function blendMode(value: string): BlendMode {
	if (!isBlendMode(value)) throw new Error(`Unknown blend mode "${value}".`);
	return value;
}

function canonicalHex(css: string): string {
	const hex = toHex(css);
	if (hex === undefined) throw new Error(`Unreadable color "${css}".`);
	return hex;
}

/** The panels' view of a recipe. `layerUrl` gives each layer image's object URL. */
export function editorStateFromRecipe(
	recipe: EditRecipe,
	activeLayerId: string | null,
	layerUrl: (layer: RecipeLayer) => string | undefined
): ImageEditorState {
	const { geometry, tone, color, detail } = recipe;
	return {
		brightness: tone.brightness + CENTRE,
		contrast: tone.contrast + CENTRE,
		saturation: color.saturation + CENTRE,
		hueRotate: color.hue,
		blur: detail.blur,
		opacity: recipe.opacity,
		sepia: color.sepia,
		invert: color.invert,
		isGrayscale: color.isGrayscale,
		shadows: tone.shadows,
		highlights: tone.highlights,
		vibrance: color.vibrance,
		temperature: color.temperature,
		tint: color.tint,
		clarity: detail.clarity,
		vignette: recipe.vignette,
		scale: geometry.scale,
		rotation: geometry.rotation,
		flipX: geometry.flipX,
		flipY: geometry.flipY,
		gradientMapOpacity: recipe.gradientMap?.opacity ?? 0,
		gradientMapBlendMode: recipe.gradientMap?.blendMode ?? "normal",
		cropRect: geometry.crop,
		curves: recipe.curves,
		appliedEffects: recipe.effects.map((effect) =>
			effect.type === "duotone"
				? { type: effect.type, intensity: effect.intensity, duotoneColors: effect.colors }
				: { type: effect.type, intensity: effect.intensity }
		),
		drawStrokes: recipe.strokes,
		layers: recipe.layers.map((layer) => {
			const url = layerUrl(layer);
			return {
				id: layer.id,
				name: layer.name,
				type: layer.kind,
				src: url,
				thumbnailSrc: url,
				opacity: layer.opacity,
				blendMode: layer.blendMode,
				visible: layer.isVisible,
				locked: layer.isLocked,
			};
		}),
		activeLayerId,
	};
}

/**
 * Applies panel updates to a recipe and validates the result. Effects and layers carry ids and
 * seeds the flat state does not have, so they change through the editor, never through here.
 *
 * `gradientStops` is the snapshot of the active gradient or palette, taken now. A map with
 * opacity 0 is removed; v1 drew no map when there was no active gradient or palette.
 */
export function applyEditorUpdates(
	recipe: EditRecipe,
	updates: Partial<ImageEditorState>,
	gradientStops: GradientStops | null
): EditRecipe {
	if (updates.appliedEffects || updates.layers || updates.activeLayerId !== undefined) {
		throw new Error("Effects and layers change through the editor, not flat updates.");
	}
	const { geometry, tone, color, detail } = recipe;
	const next = {
		...recipe,
		geometry: {
			crop: updates.cropRect === undefined ? geometry.crop : updates.cropRect,
			rotation: updates.rotation ?? geometry.rotation,
			flipX: updates.flipX ?? geometry.flipX,
			flipY: updates.flipY ?? geometry.flipY,
			scale: updates.scale ?? geometry.scale,
		},
		tone: {
			brightness: updates.brightness === undefined ? tone.brightness : updates.brightness - CENTRE,
			contrast: updates.contrast === undefined ? tone.contrast : updates.contrast - CENTRE,
			shadows: updates.shadows ?? tone.shadows,
			highlights: updates.highlights ?? tone.highlights,
		},
		color: {
			saturation: updates.saturation === undefined ? color.saturation : updates.saturation - CENTRE,
			vibrance: updates.vibrance ?? color.vibrance,
			hue: updates.hueRotate ?? color.hue,
			temperature: updates.temperature ?? color.temperature,
			tint: updates.tint ?? color.tint,
			isGrayscale: updates.isGrayscale ?? color.isGrayscale,
			sepia: updates.sepia ?? color.sepia,
			invert: updates.invert ?? color.invert,
		},
		curves: updates.curves ?? recipe.curves,
		detail: {
			clarity: updates.clarity ?? detail.clarity,
			blur: updates.blur ?? detail.blur,
		},
		vignette: updates.vignette ?? recipe.vignette,
		opacity: updates.opacity ?? recipe.opacity,
		strokes:
			updates.drawStrokes?.map((stroke) => ({ ...stroke, color: canonicalHex(stroke.color) })) ??
			recipe.strokes,
		gradientMap: nextGradientMap(recipe.gradientMap, updates, gradientStops),
	};
	return EditRecipeSchema.parse(next);
}

function nextGradientMap(
	current: EditRecipe["gradientMap"],
	updates: Partial<ImageEditorState>,
	gradientStops: GradientStops | null
): EditRecipe["gradientMap"] {
	if (updates.gradientMapOpacity === undefined && updates.gradientMapBlendMode === undefined) {
		return current;
	}
	const opacity = updates.gradientMapOpacity ?? current?.opacity ?? 0;
	const stops = gradientStops ?? current?.stops;
	if (opacity === 0 || !stops) return null;
	return {
		stops,
		opacity,
		blendMode: blendMode(updates.gradientMapBlendMode ?? current?.blendMode ?? "normal"),
	};
}

/** The recipe with one applied effect's intensity or duotone colors changed; validated. */
export function withEffectPatch(recipe: EditRecipe, index: number, patch: EffectPatch): EditRecipe {
	const effect = recipe.effects[index];
	if (!effect) throw new Error(`No applied effect at ${index}.`);
	const intensity = patch.intensity ?? effect.intensity;
	const next =
		effect.type === "duotone"
			? {
					...effect,
					intensity,
					colors: patch.duotoneColors?.map(canonicalHex) ?? effect.colors,
				}
			: { ...effect, intensity };
	const effects = recipe.effects.map((current, i) => (i === index ? next : current));
	return EditRecipeSchema.parse({ ...recipe, effects });
}

/** A LayersPanel edit, in recipe terms. */
export function layerUpdates(updates: Partial<ImageLayer>): Partial<RecipeLayer> {
	const next: Partial<RecipeLayer> = {};
	if (updates.name !== undefined) next.name = updates.name;
	if (updates.opacity !== undefined) next.opacity = updates.opacity;
	if (updates.blendMode !== undefined) next.blendMode = updates.blendMode;
	if (updates.visible !== undefined) next.isVisible = updates.visible;
	if (updates.locked !== undefined) next.isLocked = updates.locked;
	return next;
}

/** A stored preset's settings in panel units; unset fields stay unset. */
export function panelPresetSettings(
	settings: FilterPreset["settings"]
): Partial<FilterPresetSettings> {
	const { tone, color, detail } = settings;
	const flat: Partial<FilterPresetSettings> = {};
	if (tone.brightness !== undefined) flat.brightness = tone.brightness + CENTRE;
	if (tone.contrast !== undefined) flat.contrast = tone.contrast + CENTRE;
	if (tone.shadows !== undefined) flat.shadows = tone.shadows;
	if (tone.highlights !== undefined) flat.highlights = tone.highlights;
	if (color.saturation !== undefined) flat.saturation = color.saturation + CENTRE;
	if (color.vibrance !== undefined) flat.vibrance = color.vibrance;
	if (color.hue !== undefined) flat.hueRotate = color.hue;
	if (color.temperature !== undefined) flat.temperature = color.temperature;
	if (color.tint !== undefined) flat.tint = color.tint;
	if (color.isGrayscale !== undefined) flat.isGrayscale = color.isGrayscale;
	if (color.sepia !== undefined) flat.sepia = color.sepia;
	if (color.invert !== undefined) flat.invert = color.invert;
	if (detail.clarity !== undefined) flat.clarity = detail.clarity;
	if (settings.vignette !== undefined) flat.vignette = settings.vignette;
	return flat;
}

/** Panel settings (all set, as "Save Current as Preset" sends them) in stored form. */
export function storedPresetSettings(flat: FilterPresetSettings): FilterPreset["settings"] {
	return {
		tone: {
			brightness: flat.brightness - CENTRE,
			contrast: flat.contrast - CENTRE,
			shadows: flat.shadows,
			highlights: flat.highlights,
		},
		color: {
			saturation: flat.saturation - CENTRE,
			vibrance: flat.vibrance,
			hue: flat.hueRotate,
			temperature: flat.temperature,
			tint: flat.tint,
			isGrayscale: flat.isGrayscale,
			sepia: flat.sepia,
			invert: flat.invert,
		},
		detail: { clarity: flat.clarity },
		vignette: flat.vignette,
	};
}

/** Adjustments whose preset value is interpolated from the editor default by intensity. */
const BLENDABLE_ADJUSTMENTS = [
	"brightness",
	"contrast",
	"saturation",
	"hueRotate",
	"blur",
	"opacity",
	"sepia",
	"invert",
	"shadows",
	"highlights",
	"vibrance",
	"temperature",
	"tint",
	"clarity",
	"vignette",
	"gradientMapOpacity",
] as const;

/**
 * The updates that apply a preset at `intensity` percent, as v1 did: every adjustment a preset
 * can touch is reset to its default (curves and the gradient map included), then the preset's
 * values are applied, scaled from the default by the intensity.
 */
export function presetUpdates(
	preset: Partial<ImageEditorState>,
	intensity: number
): Partial<ImageEditorState> {
	const defaults = DEFAULT_EDITOR_STATE;
	const reset: Partial<ImageEditorState> = {
		brightness: defaults.brightness,
		contrast: defaults.contrast,
		saturation: defaults.saturation,
		hueRotate: defaults.hueRotate,
		blur: defaults.blur,
		opacity: defaults.opacity,
		sepia: defaults.sepia,
		invert: defaults.invert,
		isGrayscale: defaults.isGrayscale,
		shadows: defaults.shadows,
		highlights: defaults.highlights,
		vibrance: defaults.vibrance,
		temperature: defaults.temperature,
		tint: defaults.tint,
		clarity: defaults.clarity,
		vignette: defaults.vignette,
		curves: defaults.curves,
		gradientMapOpacity: defaults.gradientMapOpacity,
		gradientMapBlendMode: defaults.gradientMapBlendMode,
	};
	const blended: Partial<ImageEditorState> = {};
	for (const key of BLENDABLE_ADJUSTMENTS) {
		const target = preset[key];
		if (target === undefined) continue;
		blended[key] = defaults[key] + (target - defaults[key]) * (intensity / 100);
	}
	return { ...reset, ...preset, ...blended };
}

/** A gradient-map snapshot of a gradient (stop positions 0–100). */
export function stopsFromGradient(stops: { color: string; position: number }[]): GradientStops {
	return [...stops]
		.sort((a, b) => a.position - b.position)
		.map((stop) => ({ color: canonicalHex(stop.color), position: stop.position / 100 }));
}

/** A gradient-map snapshot of a palette: its colors evenly spaced, as v1's palette scale was. */
export function stopsFromPalette(colors: string[]): GradientStops | null {
	const [only] = colors;
	if (only === undefined) return null;
	if (colors.length === 1) {
		const color = canonicalHex(only);
		return [
			{ color, position: 0 },
			{ color, position: 1 },
		];
	}
	return colors.map((color, index) => ({
		color: canonicalHex(color),
		position: index / (colors.length - 1),
	}));
}
