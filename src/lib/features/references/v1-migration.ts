import { z } from "zod";
import { toHex } from "$lib/core/color";
import { newBlobId, type BlobId, type Migration } from "$lib/core/storage";
import {
	EditRecipeSchema,
	FilterPresetCategorySchema,
	FilterPresetSchema,
	ReferenceSchema,
	type EditRecipe,
	type FilterPreset,
	type Reference,
} from "./domain";
import type { ImageDescription } from "./image-description";

/**
 * The v1 shapes as they were actually stored. Deliberately looser than v1's own validation (e.g.
 * v1 capped `blur` at 10 while its slider went to 20): range checks happen once, against the v2
 * schemas, so a value the old UI could produce is never quarantined by a stale rule.
 */
const LegacyPointSchema = z.object({ x: z.number(), y: z.number() });

const LegacyReferenceSchema = z.object({
	id: z.string(),
	name: z.string(),
	src: z.string(),
	createdAt: z.coerce.date(),
	brightness: z.number().optional(),
	contrast: z.number().optional(),
	saturation: z.number().optional(),
	hueRotate: z.number().optional(),
	blur: z.number().optional(),
	sepia: z.number().optional(),
	invert: z.number().optional(),
	isGrayscale: z.boolean().optional(),
	opacity: z.number().optional(),
	scale: z.number().optional(),
	rotation: z.number().optional(),
	flipX: z.boolean().optional(),
	flipY: z.boolean().optional(),
	shadows: z.number().optional(),
	highlights: z.number().optional(),
	vibrance: z.number().optional(),
	temperature: z.number().optional(),
	tint: z.number().optional(),
	clarity: z.number().optional(),
	vignette: z.number().optional(),
	curves: z
		.object({
			rgb: z.array(LegacyPointSchema),
			red: z.array(LegacyPointSchema),
			green: z.array(LegacyPointSchema),
			blue: z.array(LegacyPointSchema),
		})
		.optional(),
	cropRect: z
		.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
		.nullable()
		.optional(),
	appliedEffects: z
		.array(
			z.object({
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
				intensity: z.number(),
				duotoneColors: z.tuple([z.string(), z.string()]).optional(),
			})
		)
		.optional(),
	drawStrokes: z
		.array(
			z.object({
				id: z.string(),
				color: z.string(),
				size: z.number(),
				points: z.array(LegacyPointSchema),
			})
		)
		.optional(),
	// Only counted: v1 layer images were `blob:` URLs, which die with the session that made them.
	layers: z.array(z.object({})).optional(),
});
type LegacyReference = z.infer<typeof LegacyReferenceSchema>;

const LegacyFilterPresetSchema = z.object({
	id: z.string(),
	name: z.string(),
	category: FilterPresetCategorySchema,
	createdAt: z.coerce.date(),
	settings: z.object({
		brightness: z.number().optional(),
		contrast: z.number().optional(),
		saturation: z.number().optional(),
		hueRotate: z.number().optional(),
		sepia: z.number().optional(),
		invert: z.number().optional(),
		isGrayscale: z.boolean().optional(),
		shadows: z.number().optional(),
		highlights: z.number().optional(),
		vibrance: z.number().optional(),
		temperature: z.number().optional(),
		tint: z.number().optional(),
		clarity: z.number().optional(),
		vignette: z.number().optional(),
	}),
	thumbnail: z.string().optional(),
});
type LegacyFilterPreset = z.infer<typeof LegacyFilterPresetSchema>;

/** Passed in (see `describeImage`) so the migration stays testable outside a browser. */
export type DescribeImage = (image: Blob) => Promise<ImageDescription>;

interface StoredBlob {
	id: BlobId;
	blob: Blob;
}

interface MigratedReference {
	reference: Reference;
	recipe: EditRecipe;
	blobs: StoredBlob[];
}

interface MigratedFilterPreset {
	preset: FilterPreset;
	blobs: StoredBlob[];
}

/** Parses a converted record against its v2 schema; a throw makes `runMigration` quarantine it. */
function parseConverted<TSchema extends z.ZodType>(
	schema: TSchema,
	candidate: z.input<TSchema>
): z.output<TSchema> {
	const parsed = schema.safeParse(candidate);
	if (!parsed.success) throw new Error(z.prettifyError(parsed.error));
	return parsed.data;
}

/** v1 kept images inline as data URLs; anything else cannot be read back after a reload. */
async function blobFromDataUrl(url: string): Promise<Blob> {
	if (!url.startsWith("data:")) {
		throw new Error(`Image source is not a data URL (starts with "${url.slice(0, 16)}").`);
	}
	return (await fetch(url)).blob();
}

function canonicalHex(css: string): string {
	const hex = toHex(css);
	if (hex === undefined) throw new Error(`Unreadable color "${css}".`);
	return hex;
}

/** v1 brightness, contrast and saturation are 0–200 with 100 neutral; v2 is −100…100 with 0. */
function centered(value: number | undefined): number | undefined {
	return value === undefined ? undefined : value - 100;
}

function identityCurve() {
	return [
		{ x: 0, y: 0 },
		{ x: 255, y: 255 },
	];
}

type EffectCandidate = z.input<typeof EditRecipeSchema>["effects"][number];

function convertEffects(legacy: LegacyReference): EffectCandidate[] {
	// The seed only has to be stable: v1 reseeded random effects from the clock on every render.
	return (legacy.appliedEffects ?? []).flatMap((effect, seed): EffectCandidate[] => {
		if (effect.type === "none") return [];
		if (effect.type === "duotone") {
			// v1 rendered nothing for a duotone without colors; dropping it keeps the result the same.
			if (effect.duotoneColors === undefined) return [];
			const [dark, light] = effect.duotoneColors;
			return [
				{
					type: effect.type,
					intensity: effect.intensity,
					seed,
					colors: [canonicalHex(dark), canonicalHex(light)],
				},
			];
		}
		return [{ type: effect.type, intensity: effect.intensity, seed }];
	});
}

async function convertReference(
	legacy: LegacyReference,
	describeImage: DescribeImage
): Promise<MigratedReference> {
	const original = await blobFromDataUrl(legacy.src);
	// Measured from the image itself: v1's optional `dimensions` may be missing or stale.
	const { width, height, thumbnail } = await describeImage(original);
	const originalBlobId = newBlobId();
	const thumbBlobId = newBlobId();

	const reference = parseConverted(ReferenceSchema, {
		id: legacy.id,
		name: legacy.name,
		createdAt: legacy.createdAt.toISOString(),
		width,
		height,
		originalBlobId,
		thumbBlobId,
		tags: [],
	});
	const recipe = parseConverted(EditRecipeSchema, {
		version: 1,
		referenceId: legacy.id,
		geometry: {
			crop: legacy.cropRect ?? null,
			rotation: legacy.rotation ?? 0,
			flipX: legacy.flipX ?? false,
			flipY: legacy.flipY ?? false,
			scale: legacy.scale ?? 1,
		},
		tone: {
			brightness: centered(legacy.brightness) ?? 0,
			contrast: centered(legacy.contrast) ?? 0,
			shadows: legacy.shadows ?? 0,
			highlights: legacy.highlights ?? 0,
		},
		color: {
			saturation: centered(legacy.saturation) ?? 0,
			vibrance: legacy.vibrance ?? 0,
			hue: legacy.hueRotate ?? 0,
			temperature: legacy.temperature ?? 0,
			tint: legacy.tint ?? 0,
			isGrayscale: legacy.isGrayscale ?? false,
			sepia: legacy.sepia ?? 0,
			invert: legacy.invert ?? 0,
		},
		curves: legacy.curves ?? {
			rgb: identityCurve(),
			red: identityCurve(),
			green: identityCurve(),
			blue: identityCurve(),
		},
		detail: { clarity: legacy.clarity ?? 0, blur: legacy.blur ?? 0 },
		effects: convertEffects(legacy),
		vignette: legacy.vignette ?? 0,
		// v1 drew the map from the active gradient or palette, which is not persisted, so after a
		// reload v1 rendered no map at all. `null` keeps what the user sees.
		gradientMap: null,
		opacity: legacy.opacity ?? 1,
		layers: [],
		strokes: (legacy.drawStrokes ?? []).map((stroke) => ({
			...stroke,
			color: canonicalHex(stroke.color),
		})),
	});

	const lostLayerCount = legacy.layers?.length ?? 0;
	if (lostLayerCount > 0) {
		console.warn(
			`"${legacy.name}": ${lostLayerCount} layer(s) not migrated; their images were session-only blob: URLs.`
		);
	}
	return {
		reference,
		recipe,
		blobs: [
			{ id: originalBlobId, blob: original },
			{ id: thumbBlobId, blob: thumbnail },
		],
	};
}

/** Moves v1 references into `references`, `recipes` and `blobs`. The v1 data is kept. */
export function referencesMigration(
	describeImage: DescribeImage
): Migration<LegacyReference, MigratedReference> {
	return {
		name: "references-v1",
		legacyKey: "phoenyx_references",
		legacySchema: LegacyReferenceSchema,
		stores: ["references", "recipes", "blobs"],
		convert: (legacy) => convertReference(legacy, describeImage),
		async write(tx, { reference, recipe, blobs }) {
			for (const { id, blob } of blobs) await tx.objectStore("blobs").put(blob, id);
			await tx.objectStore("references").put(reference);
			await tx.objectStore("recipes").put(recipe);
		},
	};
}

/** Drops the keys a preset leaves unset, so applying it never overwrites them with nothing. */
function setOnly<TValue>(values: Record<string, TValue | undefined>): Record<string, TValue> {
	const entries = Object.entries(values).filter(
		(entry): entry is [string, TValue] => entry[1] !== undefined
	);
	return Object.fromEntries(entries);
}

async function convertFilterPreset(legacy: LegacyFilterPreset): Promise<MigratedFilterPreset> {
	const { settings } = legacy;
	// A v1 preset thumbnail is a cached preview; one that is not a data URL is simply not carried.
	const thumbnail = legacy.thumbnail?.startsWith("data:")
		? { id: newBlobId(), blob: await blobFromDataUrl(legacy.thumbnail) }
		: null;
	const preset = parseConverted(FilterPresetSchema, {
		id: legacy.id,
		name: legacy.name,
		category: legacy.category,
		createdAt: legacy.createdAt.toISOString(),
		settings: {
			tone: setOnly({
				brightness: centered(settings.brightness),
				contrast: centered(settings.contrast),
				shadows: settings.shadows,
				highlights: settings.highlights,
			}),
			color: {
				...setOnly({
					saturation: centered(settings.saturation),
					vibrance: settings.vibrance,
					hue: settings.hueRotate,
					temperature: settings.temperature,
					tint: settings.tint,
					sepia: settings.sepia,
					invert: settings.invert,
				}),
				...setOnly({ isGrayscale: settings.isGrayscale }),
			},
			detail: setOnly({ clarity: settings.clarity }),
			...setOnly({ vignette: settings.vignette }),
		},
		thumbBlobId: thumbnail?.id ?? null,
	});
	return { preset, blobs: thumbnail ? [thumbnail] : [] };
}

/** Moves v1 filter presets into `presets` (and their thumbnails into `blobs`). */
export const filterPresetsMigration: Migration<LegacyFilterPreset, MigratedFilterPreset> = {
	name: "filter-presets-v1",
	legacyKey: "phoenyx_filter_presets",
	legacySchema: LegacyFilterPresetSchema,
	stores: ["presets", "blobs"],
	convert: convertFilterPreset,
	async write(tx, { preset, blobs }) {
		for (const { id, blob } of blobs) await tx.objectStore("blobs").put(blob, id);
		await tx.objectStore("presets").put(preset);
	},
};
