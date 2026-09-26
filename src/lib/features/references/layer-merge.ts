import type { BlendMode } from "$lib/types/image-editor";
import type { EditRecipe } from "./domain";
import { layerRect } from "./engine/geometry";

type RecipeLayer = EditRecipe["layers"][number];

export interface LayerImage {
	layer: RecipeLayer;
	image: Blob;
}

/** Canvas 2D uses the CSS blend-mode names, except that "normal" is "source-over". */
function compositeOperation(mode: BlendMode): GlobalCompositeOperation {
	return mode === "normal" ? "source-over" : mode;
}

/**
 * Merges `upper` into `lower` (Photoshop's "merge down"): the upper layer is blended onto the
 * lower one's pixels with its own blend mode and opacity. The result is a source-sized PNG, so
 * `layerRect` places it over the whole photo; it keeps the lower layer's opacity and blend mode.
 * Canvas 2D blends in encoded sRGB with CSS semantics, as the engine's composite pass does.
 */
export async function mergeLayerImages(
	lower: LayerImage,
	upper: LayerImage,
	sourceWidth: number,
	sourceHeight: number
): Promise<Blob> {
	const canvas = new OffscreenCanvas(sourceWidth, sourceHeight);
	const context = canvas.getContext("2d");
	if (!context) throw new Error("A 2D canvas is not available in this browser.");
	const draw = async ({ image }: LayerImage) => {
		// Same orientation rule as the engine's upload, so the merge matches the render.
		const bitmap = await createImageBitmap(image, { imageOrientation: "from-image" });
		try {
			const rect = layerRect(bitmap.width, bitmap.height, sourceWidth, sourceHeight);
			context.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height);
		} finally {
			bitmap.close();
		}
	};
	await draw(lower);
	if (upper.layer.isVisible) {
		context.globalAlpha = upper.layer.opacity;
		context.globalCompositeOperation = compositeOperation(upper.layer.blendMode);
		await draw(upper);
	}
	return canvas.convertToBlob({ type: "image/png" });
}
