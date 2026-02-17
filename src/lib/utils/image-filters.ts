import type { ImageEditorState } from "$lib/components/editor/EditorHistory.svelte";

/**
 * Shared CSS filter and transform string builders.
 * Single source of truth — used by both the gallery thumbnails and the editor canvas.
 */

export function buildCSSFilterString(
	state: Pick<
		ImageEditorState,
		"isGrayscale" | "sepia" | "invert" | "brightness" | "contrast" | "saturation" | "hueRotate" | "blur"
	>,
	isComparing = false,
): string {
	if (isComparing) return "none";

	const filters: string[] = [];

	if (state.isGrayscale) filters.push("grayscale(100%)");
	if (state.sepia) filters.push(`sepia(${state.sepia}%)`);
	if (state.invert) filters.push(`invert(${state.invert}%)`);
	if (state.brightness !== 100) filters.push(`brightness(${state.brightness}%)`);
	if (state.contrast !== 100) filters.push(`contrast(${state.contrast}%)`);
	if (state.saturation !== 100) filters.push(`saturate(${state.saturation}%)`);
	if (state.hueRotate !== 0) filters.push(`hue-rotate(${state.hueRotate}deg)`);
	if (state.blur !== 0) filters.push(`blur(${state.blur}px)`);

	return filters.length > 0 ? filters.join(" ") : "none";
}

export function buildTransformString(
	state: Pick<ImageEditorState, "scale" | "rotation" | "flipX" | "flipY">,
): string {
	const transforms: string[] = [];

	if (state.scale !== 1) transforms.push(`scale(${state.scale})`);
	if (state.rotation !== 0) transforms.push(`rotate(${state.rotation}deg)`);
	if (state.flipX) transforms.push("scaleX(-1)");
	if (state.flipY) transforms.push("scaleY(-1)");

	return transforms.length > 0 ? transforms.join(" ") : "none";
}

/**
 * Build a filter string from a reference image's stored properties.
 * Used by the gallery to show filter previews on thumbnails.
 */
export function buildReferenceFilterString(reference: {
	isGrayscale?: boolean | undefined;
	sepia?: number | undefined;
	invert?: number | undefined;
	brightness?: number | undefined;
	contrast?: number | undefined;
	saturation?: number | undefined;
	hueRotate?: number | undefined;
	blur?: number | undefined;
	temperature?: number | undefined;
}): string {
	const filters: string[] = [];

	if (reference.isGrayscale) filters.push("grayscale(100%)");
	if (reference.sepia) filters.push(`sepia(${reference.sepia}%)`);
	if (reference.invert) filters.push(`invert(${reference.invert}%)`);
	if (reference.brightness !== undefined && reference.brightness !== 100)
		filters.push(`brightness(${reference.brightness}%)`);
	if (reference.contrast !== undefined && reference.contrast !== 100)
		filters.push(`contrast(${reference.contrast}%)`);
	if (reference.saturation !== undefined && reference.saturation !== 100)
		filters.push(`saturate(${reference.saturation}%)`);
	if (reference.hueRotate !== undefined && reference.hueRotate !== 0)
		filters.push(`hue-rotate(${reference.hueRotate}deg)`);
	if (reference.blur !== undefined && reference.blur !== 0)
		filters.push(`blur(${reference.blur}px)`);

	// Temperature approximation for thumbnail preview
	if (reference.temperature !== undefined && reference.temperature !== 0) {
		const temp = reference.temperature;
		if (temp > 0) {
			filters.push(`sepia(${Math.abs(temp) * 0.15}%)`);
		} else {
			filters.push(`hue-rotate(${temp * 0.3}deg)`);
		}
	}

	return filters.length > 0 ? filters.join(" ") : "none";
}
