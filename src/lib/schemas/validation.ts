import { z } from "zod";
import type { ReferenceId, PaletteId, GradientId } from "$lib/types/brands";
import { BLEND_MODE_VALUES } from "$lib/types/image-editor";

// Color validation
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const ColorSchema = z.string().regex(hexColorRegex, "Invalid hex color format");

// Position and dimension schemas
const PositionSchema = z.object({
	x: z.number().min(0),
	y: z.number().min(0),
});

const DimensionsSchema = z.object({
	width: z.number().positive("Width must be positive"),
	height: z.number().positive("Height must be positive"),
});

// Applied Effect schema for stacked effects
const AppliedEffectSchema = z.object({
	type: z.enum([
		"none",
		"posterize",
		"pixelate",
		"solarize",
		"duotone",
		"halftone",
		"vhs",
		"glitch",
		"emboss",
		"sharpen",
	]),
	intensity: z.number().min(0).max(100),
	duotoneColors: z.tuple([z.string(), z.string()]).optional(),
});

// Curve point schema
const CurvePointSchema = z.object({
	x: z.number().min(0).max(255),
	y: z.number().min(0).max(255),
});

// Curves schema
const CurvesSchema = z.object({
	rgb: z.array(CurvePointSchema),
	red: z.array(CurvePointSchema),
	green: z.array(CurvePointSchema),
	blue: z.array(CurvePointSchema),
});

// Crop rect schema
const CropRectSchema = z.object({
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
});

const DrawStrokeSchema = z.object({
	id: z.string().uuid(),
	color: ColorSchema,
	size: z.number().min(1).max(100),
	points: z.array(z.object({ x: z.number(), y: z.number() })).min(1),
});

// Reference Image validation
export const ReferenceImageSchema = z.object({
	id: z
		.string()
		.uuid()
		.transform((val) => {
			// SAFETY: `.uuid()` has already established the brand's invariant (a valid
			// UUID string) for `val`, so branding it as `ReferenceId` is sound here.
			return val as ReferenceId;
		}),
	src: z.string().url("Invalid image URL"),
	thumbnailSrc: z.string().url("Invalid thumbnail URL").optional(),
	name: z.string().min(1, "Image name is required").max(100, "Name too long"),
	position: PositionSchema,
	scale: z.number().min(0.1).max(10, "Scale must be between 0.1 and 10"),
	rotation: z.number().min(-360).max(360, "Rotation must be between -360 and 360"),
	opacity: z.number().min(0).max(1, "Opacity must be between 0 and 1"),
	isGrayscale: z.boolean(),
	createdAt: z.date(),
	fileSize: z.number().positive().optional(),
	dimensions: DimensionsSchema.optional(),
	// Basic adjustments
	brightness: z.number().min(0).max(200).default(100).optional(),
	contrast: z.number().min(0).max(200).default(100).optional(),
	saturation: z.number().min(0).max(200).default(100).optional(),
	hueRotate: z.number().min(0).max(360).default(0).optional(),
	blur: z.number().min(0).max(10).default(0).optional(),
	sepia: z.number().min(0).max(100).optional(),
	invert: z.number().min(0).max(100).optional(),
	flipX: z.boolean().optional(),
	flipY: z.boolean().optional(),
	gradientMapOpacity: z.number().min(0).max(1).optional(),
	gradientMapBlendMode: z.string().optional(),
	// Enhanced adjustments
	shadows: z.number().min(-100).max(100).optional(),
	highlights: z.number().min(-100).max(100).optional(),
	vibrance: z.number().min(-100).max(100).optional(),
	temperature: z.number().min(-100).max(100).optional(),
	tint: z.number().min(-100).max(100).optional(),
	clarity: z.number().min(-100).max(100).optional(),
	vignette: z.number().min(0).max(100).optional(),
	// Curves
	curves: CurvesSchema.optional(),
	// Crop
	cropRect: CropRectSchema.nullable().optional(),
	// Stacked effects
	appliedEffects: z.array(AppliedEffectSchema).optional(),
	// Drawing overlay
	drawStrokes: z.array(DrawStrokeSchema).optional(),
	// Layers
	layers: z
		.array(
			z.object({
				id: z.string().uuid(),
				name: z.string().max(100),
				type: z.enum(["image", "adjustment", "overlay"]),
				src: z.string().optional(),
				thumbnailSrc: z.string().optional(),
				opacity: z.number().min(0).max(1),
				blendMode: z.enum(BLEND_MODE_VALUES),
				visible: z.boolean(),
				locked: z.boolean(),
			}),
		)
		.optional(),
	activeLayerId: z.string().uuid().nullable().optional(),
});

// Gradient validation
const GradientStopSchema = z.object({
	color: ColorSchema,
	position: z.number().min(0).max(100, "Position must be between 0 and 100"),
	easing: z.enum(["linear", "ease-in", "ease-out", "ease-in-out"]).optional(),
});

// Mesh gradient point schema
const MeshPointSchema = z.object({
	id: z.string().uuid(),
	x: z.number().min(0).max(100),
	y: z.number().min(0).max(100),
	color: ColorSchema,
	radius: z.number().min(1).max(200).default(50),
});

// Noise configuration schema
const NoiseConfigSchema = z.object({
	enabled: z.boolean().default(false),
	intensity: z.number().min(0).max(100).default(10),
	scale: z.number().min(0.1).max(10).default(1),
	type: z.enum(["perlin", "simplex", "grain"]).default("grain"),
});

const GradientSchema = z.object({
	id: z
		.string()
		.uuid()
		.transform((val) => {
			// SAFETY: `.uuid()` has already established the brand's invariant (a valid
			// UUID string) for `val`, so branding it as `GradientId` is sound here.
			return val as GradientId;
		}),
	name: z.string().min(1, "Gradient name is required").max(50, "Name too long"),
	type: z.enum(["linear", "radial", "conic", "mesh"]),
	stops: z.array(GradientStopSchema).min(2, "Gradient must have at least 2 color stops"),
	angle: z.number().min(0).max(360).optional(),
	centerX: z.number().min(0).max(100).optional(),
	centerY: z.number().min(0).max(100).optional(),
	createdAt: z.date(),
	// Enhanced properties
	interpolationMode: z.enum(["oklch", "oklab", "rgb", "hsl", "lab", "lch"]).optional(),
	meshPoints: z.array(MeshPointSchema).optional(),
	noise: NoiseConfigSchema.optional(),
	tags: z.array(z.string().max(20)).max(10).optional(),
});

// Color Palette validation
const ColorPaletteSchema = z.object({
	id: z
		.string()
		.uuid()
		.transform((val) => {
			// SAFETY: `.uuid()` has already established the brand's invariant (a valid
			// UUID string) for `val`, so branding it as `PaletteId` is sound here.
			return val as PaletteId;
		}),
	name: z.string().min(1, "Palette name is required").max(50, "Name too long"),
	colors: z.array(ColorSchema).max(50, "Too many colors in palette"),
	maxSlots: z.number().min(3, "Minimum 3 slots").max(50, "Maximum 50 slots"),
	createdAt: z.date(),
	tags: z.array(z.string().max(20, "Tag too long")).max(10, "Too many tags"),
});

// App Settings validation
const AppSettingsSchema = z.object({
	theme: z.enum(["light", "dark", "system"]),
	defaultPaletteSlots: z.number().min(3).max(50),
	alwaysOnTop: z.boolean(),
	enableAnimations: z.boolean(),
	globalEyedropperEnabled: z.boolean(),
	referenceBoardSavePath: z.string().nullable(),
	workspace: z.object({
		showGrid: z.boolean(),
		snapToGrid: z.boolean(),
		gridSize: z.number().min(5).max(100),
		showRulers: z.boolean(),
	}),
	exportPreferences: z.object({
		defaultFormat: z.enum(["png", "jpeg", "webp", "svg"]),
		defaultScale: z.number().min(1).max(4),
		includeBackground: z.boolean(),
		defaultPngResolution: z.number().min(100).max(8192),
		defaultSvgSize: DimensionsSchema,
		compressionLevel: z.number().min(1).max(100),
	}),
	autoSave: z.boolean(),
	autoSaveInterval: z.number().min(1).max(60),
});

// Tutorial progress validation — the flags an export actually carries
const TutorialProgressSchema = z.object({
	hasSeenWelcome: z.boolean(),
	hasSeenPaletteTutorial: z.boolean(),
	hasSeenGradientTutorial: z.boolean(),
	hasSeenReferenceTutorial: z.boolean(),
});

// File export validation
const ExportDataSchema = z.object({
	version: z.string(),
	timestamp: z.string().datetime(),
	data: z.object({
		references: z.array(ReferenceImageSchema),
		palettes: z.array(ColorPaletteSchema),
		gradients: z.array(GradientSchema),
		settings: AppSettingsSchema,
		tutorialState: TutorialProgressSchema,
	}),
});

// Validation helper functions
type ValidationResult<TData = never> = {
	valid: boolean;
	error?: string;
	data?: TData;
};

function firstIssueMessage(cause: unknown, fallback: string): string {
	return cause instanceof z.ZodError ? (cause.issues[0]?.message ?? fallback) : fallback;
}

export function validateColor(color: string): ValidationResult {
	try {
		ColorSchema.parse(color);
		return { valid: true };
	} catch {
		return { valid: false, error: "Invalid hex color format (use #RGB or #RRGGBB)" };
	}
}

export function validateGradient(
	gradient: z.input<typeof GradientSchema>,
): ValidationResult<z.infer<typeof GradientSchema>> {
	try {
		return { valid: true, data: GradientSchema.parse(gradient) };
	} catch (error) {
		return { valid: false, error: firstIssueMessage(error, "Invalid gradient data") };
	}
}

export function validatePalette(
	palette: z.input<typeof ColorPaletteSchema>,
): ValidationResult<z.infer<typeof ColorPaletteSchema>> {
	try {
		return { valid: true, data: ColorPaletteSchema.parse(palette) };
	} catch (error) {
		return { valid: false, error: firstIssueMessage(error, "Invalid palette data") };
	}
}

export function validateAppData(
	data: z.input<typeof ExportDataSchema>,
): ValidationResult<z.infer<typeof ExportDataSchema>> {
	try {
		return { valid: true, data: ExportDataSchema.parse(data) };
	} catch (error) {
		return { valid: false, error: firstIssueMessage(error, "Invalid export data format") };
	}
}

/** An exported file's timestamps arrive as JSON strings; missing ones fall back to now. */
const ImportedDateSchema = z.coerce.date().catch(() => new Date());

const ImportedReferenceSchema = ReferenceImageSchema.extend({ createdAt: ImportedDateSchema });
const ImportedPaletteSchema = ColorPaletteSchema.extend({ createdAt: ImportedDateSchema });
const ImportedGradientSchema = GradientSchema.extend({ createdAt: ImportedDateSchema });

/**
 * The envelope of an exported file. Collections stay unparsed here so a single corrupt
 * record can be dropped instead of voiding the whole import.
 */
const ImportEnvelopeSchema = z.object({
	version: z.string(),
	data: z.object({
		references: z.array(z.unknown()).optional(),
		palettes: z.array(z.unknown()).optional(),
		gradients: z.array(z.unknown()).optional(),
		settings: AppSettingsSchema.optional(),
		tutorialState: TutorialProgressSchema.optional(),
	}),
});

export type ImportedState = {
	version: string;
	references?: ValidatedReferenceImage[] | undefined;
	palettes?: ValidatedColorPalette[] | undefined;
	gradients?: ValidatedGradient[] | undefined;
	settings?: ValidatedAppSettings | undefined;
	tutorialState?: z.infer<typeof TutorialProgressSchema> | undefined;
};

/** Keep only the entries that satisfy `schema`; drop the rest. */
function parseEntries<TSchema extends z.ZodType>(
	schema: TSchema,
	entries: readonly unknown[] | undefined,
): z.infer<TSchema>[] | undefined {
	if (entries === undefined) return undefined;
	return entries.flatMap((entry) => {
		const parsed = schema.safeParse(entry);
		return parsed.success ? [parsed.data] : [];
	});
}

/**
 * Parse the raw text of an exported JSON file into the app state it can restore.
 * Returns null when the file is not JSON or does not match the export envelope.
 */
export function parseImportedState(fileText: string): ImportedState | null {
	let payload: ReturnType<typeof JSON.parse>;
	try {
		payload = JSON.parse(fileText);
	} catch {
		return null;
	}

	const envelope = ImportEnvelopeSchema.safeParse(payload);
	if (!envelope.success) return null;

	const { version, data } = envelope.data;
	return {
		version,
		references: parseEntries(ImportedReferenceSchema, data.references),
		palettes: parseEntries(ImportedPaletteSchema, data.palettes),
		gradients: parseEntries(ImportedGradientSchema, data.gradients),
		settings: data.settings,
		tutorialState: data.tutorialState,
	};
}

// Runtime type guards
export type ValidatedReferenceImage = z.infer<typeof ReferenceImageSchema>;
export type ValidatedGradientStop = z.infer<typeof GradientStopSchema>;
type ValidatedMeshPoint = z.infer<typeof MeshPointSchema>;
type ValidatedNoiseConfig = z.infer<typeof NoiseConfigSchema>;
export type ValidatedGradient = z.infer<typeof GradientSchema>;
export type ValidatedColorPalette = z.infer<typeof ColorPaletteSchema>;
export type ValidatedAppSettings = z.infer<typeof AppSettingsSchema>;
type ValidatedTutorialProgress = z.infer<typeof TutorialProgressSchema>;
type ValidatedExportData = z.infer<typeof ExportDataSchema>;
