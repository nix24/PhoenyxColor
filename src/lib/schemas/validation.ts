import { z } from "zod";

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

// Reference Image validation
export const ReferenceImageSchema = z.object({
	id: z.string().uuid(),
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
});

// Gradient validation
export const GradientStopSchema = z.object({
	color: ColorSchema,
	position: z.number().min(0).max(100, "Position must be between 0 and 100"),
});

export const GradientSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1, "Gradient name is required").max(50, "Name too long"),
	type: z.enum(["linear", "radial", "conic"]),
	stops: z.array(GradientStopSchema).min(2, "Gradient must have at least 2 color stops"),
	angle: z.number().min(0).max(360).optional(),
	centerX: z.number().min(0).max(100).optional(),
	centerY: z.number().min(0).max(100).optional(),
	createdAt: z.date(),
});

// Color Palette validation
export const ColorPaletteSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1, "Palette name is required").max(50, "Name too long"),
	colors: z.array(ColorSchema).max(50, "Too many colors in palette"),
	maxSlots: z.number().min(3, "Minimum 3 slots").max(50, "Maximum 50 slots"),
	createdAt: z.date(),
	tags: z.array(z.string().max(20, "Tag too long")).max(10, "Too many tags"),
});

// App Settings validation
export const AppSettingsSchema = z.object({
	theme: z.enum(["light", "dark"]),
	defaultPaletteSlots: z.number().min(3).max(50),
	alwaysOnTop: z.boolean(),
	enableAnimations: z.boolean(),
	globalEyedropperEnabled: z.boolean(),
	referenceBoardSavePath: z.string().nullable(),
	exportPreferences: z.object({
		defaultPngResolution: z.number().min(100).max(8192),
		defaultSvgSize: DimensionsSchema,
		compressionLevel: z.number().min(1).max(100),
	}),
	keyboardShortcuts: z.record(z.string()),
	autoSave: z.boolean(),
	autoSaveInterval: z.number().min(1).max(60),
});

// Tutorial state validation
export const TutorialStateSchema = z.object({
	isActive: z.boolean(),
	currentStep: z.number().min(0),
	currentModule: z.string().nullable(),
	completedTutorials: z.array(z.string()),
	showHints: z.boolean(),
});

// File export validation
export const ExportDataSchema = z.object({
	version: z.string(),
	exportedAt: z.string().datetime(),
	application: z.literal("PhoenyxColor"),
	data: z.object({
		references: z.array(ReferenceImageSchema),
		palettes: z.array(ColorPaletteSchema),
		gradients: z.array(GradientSchema),
		settings: AppSettingsSchema,
	}),
});

// Validation helper functions
export function validateColor(color: string): { valid: boolean; error?: string } {
	try {
		ColorSchema.parse(color);
		return { valid: true };
	} catch (error) {
		return { valid: false, error: "Invalid hex color format (use #RGB or #RRGGBB)" };
	}
}

export function validateGradient(gradient: unknown): { valid: boolean; error?: string; data?: any } {
	try {
		const validatedGradient = GradientSchema.parse(gradient);
		return { valid: true, data: validatedGradient };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { valid: false, error: error.errors[0]?.message || "Invalid gradient data" };
		}
		return { valid: false, error: "Unknown validation error" };
	}
}

export function validatePalette(palette: unknown): { valid: boolean; error?: string; data?: any } {
	try {
		const validatedPalette = ColorPaletteSchema.parse(palette);
		return { valid: true, data: validatedPalette };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { valid: false, error: error.errors[0]?.message || "Invalid palette data" };
		}
		return { valid: false, error: "Unknown validation error" };
	}
}

export function validateAppData(data: unknown): { valid: boolean; error?: string; data?: any } {
	try {
		const validatedData = ExportDataSchema.parse(data);
		return { valid: true, data: validatedData };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return { valid: false, error: error.errors[0]?.message || "Invalid export data format" };
		}
		return { valid: false, error: "Unknown validation error" };
	}
}

// Runtime type guards
export type ValidatedReferenceImage = z.infer<typeof ReferenceImageSchema>;
export type ValidatedGradient = z.infer<typeof GradientSchema>;
export type ValidatedColorPalette = z.infer<typeof ColorPaletteSchema>;
export type ValidatedAppSettings = z.infer<typeof AppSettingsSchema>;
export type ValidatedExportData = z.infer<typeof ExportDataSchema>; 