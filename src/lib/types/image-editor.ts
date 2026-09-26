import type { QuickEffect } from "./effects";

/**
 * Consolidated types for the Image Editor module.
 * Layer system, blend modes, filter presets, and shared editor types.
 */

export const BLEND_MODE_VALUES = [
	"normal",
	"multiply",
	"screen",
	"overlay",
	"darken",
	"lighten",
	"color-dodge",
	"color-burn",
	"hard-light",
	"soft-light",
	"difference",
	"exclusion",
	"hue",
	"saturation",
	"color",
	"luminosity",
] as const;

export type BlendMode = (typeof BLEND_MODE_VALUES)[number];

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
	{ value: "normal", label: "Normal" },
	{ value: "multiply", label: "Multiply" },
	{ value: "screen", label: "Screen" },
	{ value: "overlay", label: "Overlay" },
	{ value: "darken", label: "Darken" },
	{ value: "lighten", label: "Lighten" },
	{ value: "color-dodge", label: "Color Dodge" },
	{ value: "color-burn", label: "Color Burn" },
	{ value: "hard-light", label: "Hard Light" },
	{ value: "soft-light", label: "Soft Light" },
	{ value: "difference", label: "Difference" },
	{ value: "exclusion", label: "Exclusion" },
	{ value: "hue", label: "Hue" },
	{ value: "saturation", label: "Saturation" },
	{ value: "color", label: "Color" },
	{ value: "luminosity", label: "Luminosity" },
];

export interface CurveChannels {
	rgb: Array<{ x: number; y: number }>;
	red: Array<{ x: number; y: number }>;
	green: Array<{ x: number; y: number }>;
	blue: Array<{ x: number; y: number }>;
}

export interface ImageLayer {
	id: string;
	name: string;
	type: "image" | "adjustment" | "overlay";
	src?: string | undefined;
	thumbnailSrc?: string | undefined;
	opacity: number;
	blendMode: BlendMode;
	visible: boolean;
	locked: boolean;
}

export type PresetCategory = "custom" | "portrait" | "landscape" | "urban" | "vintage" | "creative";

/** A saved preset as the Filters panel shows it: settings in panel (v1) units. */
export interface PanelFilterPreset {
	id: string;
	name: string;
	category: PresetCategory;
	settings: Partial<FilterPresetSettings>;
	createdAt: Date;
	thumbnail?: string;
}

/** Subset of ImageEditorState fields that filter presets can adjust */
export interface FilterPresetSettings {
	brightness: number;
	contrast: number;
	saturation: number;
	hueRotate: number;
	sepia: number;
	invert: number;
	isGrayscale: boolean;
	shadows: number;
	highlights: number;
	vibrance: number;
	temperature: number;
	tint: number;
	clarity: number;
	vignette: number;
}

export type SortMode = "name" | "date";
export type ViewMode = "grid" | "list";
export type CropGuideType = "none" | "thirds" | "golden" | "diagonal";

/** The flat editor state the panels read and write (v1 units; see `editor-state.ts`). */
export interface AppliedEffect {
	type: QuickEffect;
	intensity: number;
	duotoneColors?: [string, string] | undefined;
}

export interface DrawPoint {
	x: number;
	y: number;
}

export interface DrawStroke {
	id: string;
	color: string;
	size: number;
	points: DrawPoint[];
}

export interface ImageEditorState {
	// Basic adjustments
	brightness: number;
	contrast: number;
	saturation: number;
	hueRotate: number;
	blur: number;
	opacity: number;
	sepia: number;
	invert: number;
	isGrayscale: boolean;

	// Enhanced adjustments
	shadows: number;
	highlights: number;
	vibrance: number;
	temperature: number;
	tint: number;
	clarity: number;
	vignette: number;

	// Transform
	scale: number;
	rotation: number;
	flipX: boolean;
	flipY: boolean;

	// Gradient map
	gradientMapOpacity: number;
	gradientMapBlendMode: string;

	// Crop (if applied)
	cropRect: { x: number; y: number; width: number; height: number } | null;

	// Curves (stored as control points)
	curves: CurveChannels;

	// Effects (stackable)
	appliedEffects: AppliedEffect[];

	// Drawing overlay in source-image coordinates
	drawStrokes: DrawStroke[];

	// Layers
	layers: ImageLayer[];
	activeLayerId: string | null;
}

export const DEFAULT_EDITOR_STATE: ImageEditorState = {
	brightness: 100,
	contrast: 100,
	saturation: 100,
	hueRotate: 0,
	blur: 0,
	opacity: 1,
	sepia: 0,
	invert: 0,
	isGrayscale: false,
	shadows: 0,
	highlights: 0,
	vibrance: 0,
	temperature: 0,
	tint: 0,
	clarity: 0,
	vignette: 0,
	scale: 1,
	rotation: 0,
	flipX: false,
	flipY: false,
	gradientMapOpacity: 0,
	gradientMapBlendMode: "normal",
	cropRect: null,
	curves: {
		rgb: [
			{ x: 0, y: 0 },
			{ x: 255, y: 255 },
		],
		red: [
			{ x: 0, y: 0 },
			{ x: 255, y: 255 },
		],
		green: [
			{ x: 0, y: 0 },
			{ x: 255, y: 255 },
		],
		blue: [
			{ x: 0, y: 0 },
			{ x: 255, y: 255 },
		],
	},
	appliedEffects: [],
	drawStrokes: [],
	layers: [],
	activeLayerId: null,
};
