/**
 * Consolidated types for the Image Editor module.
 * Layer system, blend modes, filter presets, and shared editor types.
 */

export type BlendMode =
	| "normal"
	| "multiply"
	| "screen"
	| "overlay"
	| "darken"
	| "lighten"
	| "color-dodge"
	| "color-burn"
	| "hard-light"
	| "soft-light"
	| "difference"
	| "exclusion"
	| "hue"
	| "saturation"
	| "color"
	| "luminosity";

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

export interface ImageLayer {
	id: string;
	name: string;
	type: "image" | "adjustment" | "overlay";
	src?: string;
	thumbnailSrc?: string;
	opacity: number;
	blendMode: BlendMode;
	visible: boolean;
	locked: boolean;
}

export type PresetCategory = "custom" | "portrait" | "landscape" | "urban" | "vintage" | "creative";

export interface FilterPreset {
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

export type SortMode = "name" | "date" | "recent";
export type ViewMode = "grid" | "list";
export type CropGuideType = "none" | "thirds" | "golden" | "diagonal";
