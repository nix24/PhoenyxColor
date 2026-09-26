import { z } from "zod";
import { BlobIdSchema } from "$lib/core/storage";
import { BLEND_MODE_VALUES } from "$lib/types/image-editor";
import type { ReferenceId } from "$lib/types/brands";

const ReferenceIdSchema = z.uuid().transform((id) => {
	// SAFETY: a ReferenceId is a UUID, and `z.uuid()` has just checked that.
	return id as ReferenceId;
});

/** Canonical form only (`#rrggbb`), so equal colors compare equal. Migration normalizes v1 hex. */
const HexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/, "Expected lowercase #rrggbb");

/** A signed slider where 0 is neutral. */
const SignedAmountSchema = z.number().min(-100).max(100);
const PercentSchema = z.number().min(0).max(100);

/** Image metadata. Pixels live in the blob store; edits live in the recipe. */
export const ReferenceSchema = z.object({
	id: ReferenceIdSchema,
	name: z.string().min(1).max(100),
	createdAt: z.iso.datetime(),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	originalBlobId: BlobIdSchema,
	thumbBlobId: BlobIdSchema,
	tags: z.array(z.string().min(1)),
});
export type Reference = z.infer<typeof ReferenceSchema>;

const CropSchema = z.object({
	x: z.number().min(0),
	y: z.number().min(0),
	width: z.number().positive(),
	height: z.number().positive(),
});

const GeometrySchema = z.object({
	/** In source-image pixels, applied before rotation. `null` means the whole image. */
	crop: CropSchema.nullable(),
	rotation: z.number().min(-360).max(360),
	flipX: z.boolean(),
	flipY: z.boolean(),
	scale: z.number().min(0.1).max(10),
});

const ToneSchema = z.object({
	brightness: SignedAmountSchema,
	contrast: SignedAmountSchema,
	shadows: SignedAmountSchema,
	highlights: SignedAmountSchema,
});

const ColorSchema = z.object({
	saturation: SignedAmountSchema,
	vibrance: SignedAmountSchema,
	/** Degrees. */
	hue: z.number().min(0).max(360),
	temperature: SignedAmountSchema,
	tint: SignedAmountSchema,
	isGrayscale: z.boolean(),
	sepia: PercentSchema,
	invert: PercentSchema,
});

/** Control points in 0–255 on both axes, per channel. */
const CurvePointSchema = z.object({
	x: z.number().min(0).max(255),
	y: z.number().min(0).max(255),
});
const CurveSchema = z.array(CurvePointSchema).min(2);
const CurvesSchema = z.object({
	rgb: CurveSchema,
	red: CurveSchema,
	green: CurveSchema,
	blue: CurveSchema,
});

const DetailSchema = z.object({
	clarity: SignedAmountSchema,
	/** Radius in source-image pixels. */
	blur: z.number().min(0).max(20),
});

/** Stored so a random effect (grain, glitch, …) renders the same in preview, export and reload. */
const SeedSchema = z.number().int().min(0).max(0xffff_ffff);

const EffectSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.enum([
			"posterize",
			"pixelate",
			"solarize",
			"halftone",
			"vhs",
			"glitch",
			"emboss",
			"sharpen",
		]),
		intensity: PercentSchema,
		seed: SeedSchema,
	}),
	z.object({
		type: z.literal("duotone"),
		intensity: PercentSchema,
		seed: SeedSchema,
		colors: z.tuple([HexColorSchema, HexColorSchema]),
	}),
]);

const BlendModeSchema = z.enum(BLEND_MODE_VALUES);

/**
 * A snapshot of the colors, taken when the map is applied, not a link to a palette or gradient.
 * It keeps preview, export and reloads identical after the source changes or is deleted.
 */
const GradientMapSchema = z.object({
	stops: z.array(z.object({ color: HexColorSchema, position: z.number().min(0).max(1) })).min(2),
	opacity: z.number().min(0).max(1),
	blendMode: BlendModeSchema,
});

/**
 * `kind` is the discriminator for future layer kinds (e.g. adjustment layers, as in Photoshop or
 * Affinity). Adding one is additive: existing recipes stay valid without a version bump.
 */
const LayerSchema = z.object({
	kind: z.literal("image"),
	id: z.uuid(),
	name: z.string().max(100),
	blobId: BlobIdSchema,
	opacity: z.number().min(0).max(1),
	blendMode: BlendModeSchema,
	isVisible: z.boolean(),
	isLocked: z.boolean(),
});

/** Points are in source-image pixels. */
const StrokeSchema = z.object({
	id: z.uuid(),
	color: HexColorSchema,
	size: z.number().min(1).max(100),
	points: z.array(z.object({ x: z.number(), y: z.number() })).min(1),
});

/**
 * Everything needed to re-render an edit from the original blob. JSON only: images are referenced
 * by blob id. Bump `version` and add an upgrade path when the shape changes.
 */
export const EditRecipeSchema = z.object({
	version: z.literal(1),
	referenceId: ReferenceIdSchema,
	geometry: GeometrySchema,
	tone: ToneSchema,
	color: ColorSchema,
	curves: CurvesSchema,
	detail: DetailSchema,
	effects: z.array(EffectSchema),
	vignette: PercentSchema,
	gradientMap: GradientMapSchema.nullable(),
	opacity: z.number().min(0).max(1),
	layers: z.array(LayerSchema),
	strokes: z.array(StrokeSchema),
});
export type EditRecipe = z.infer<typeof EditRecipeSchema>;

/**
 * A saved set of adjustments. Each group holds only the fields the preset sets; applying it
 * overwrites those fields in the recipe and leaves the rest alone.
 */
export const FilterPresetCategorySchema = z.enum([
	"custom",
	"portrait",
	"landscape",
	"urban",
	"vintage",
	"creative",
]);

export const FilterPresetSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(100),
	category: FilterPresetCategorySchema,
	createdAt: z.iso.datetime(),
	settings: z.object({
		tone: ToneSchema.partial(),
		color: ColorSchema.partial(),
		detail: DetailSchema.pick({ clarity: true }).partial(),
		vignette: PercentSchema.optional(),
	}),
	thumbBlobId: BlobIdSchema.nullable(),
});
export type FilterPreset = z.infer<typeof FilterPresetSchema>;

function identityCurve(): z.infer<typeof CurveSchema> {
	return [
		{ x: 0, y: 0 },
		{ x: 255, y: 255 },
	];
}

/** The recipe that renders the original unchanged. */
export function neutralRecipe(referenceId: ReferenceId): EditRecipe {
	return {
		version: 1,
		referenceId,
		geometry: { crop: null, rotation: 0, flipX: false, flipY: false, scale: 1 },
		tone: { brightness: 0, contrast: 0, shadows: 0, highlights: 0 },
		color: {
			saturation: 0,
			vibrance: 0,
			hue: 0,
			temperature: 0,
			tint: 0,
			isGrayscale: false,
			sepia: 0,
			invert: 0,
		},
		curves: {
			rgb: identityCurve(),
			red: identityCurve(),
			green: identityCurve(),
			blue: identityCurve(),
		},
		detail: { clarity: 0, blur: 0 },
		effects: [],
		vignette: 0,
		gradientMap: null,
		opacity: 1,
		layers: [],
		strokes: [],
	};
}
