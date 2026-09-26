import type { EditRecipe } from "../domain";
import type { RenderEngine } from "./engine";

export type ExportFormat = "png" | "jpeg" | "webp";

export interface ExportOptions {
	format: ExportFormat;
	/** Fraction of full resolution; above 1 upscales. */
	scale: number;
	/** 0–1, for JPEG and WebP. */
	quality: number;
	/** Put the image on white. JPEG always is, since it has no transparency (as in v1). */
	hasBackground: boolean;
}

export interface ExportedImage {
	blob: Blob;
	width: number;
	height: number;
	/** The GPU could not render the requested size, so the export is smaller. */
	isReduced: boolean;
}

/**
 * Renders the recipe through the same path as the preview and encodes it. The engine's last render
 * becomes the export, so render the preview again before the next `present`.
 */
export async function exportImage(
	engine: RenderEngine,
	recipe: EditRecipe,
	options: ExportOptions
): Promise<ExportedImage> {
	const { width, height, isReduced } = engine.render(recipe, options.scale);
	const pixels = engine.readPixels();
	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext("2d");
	if (!context) throw new Error("A 2D canvas is not available in this browser.");
	if (options.hasBackground || options.format === "jpeg") {
		// putImageData ignores compositing, so draw the pixels over white from a second canvas.
		const image = new OffscreenCanvas(width, height);
		image.getContext("2d")?.putImageData(pixels, 0, 0);
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, width, height);
		context.drawImage(image, 0, 0);
	} else {
		context.putImageData(pixels, 0, 0);
	}
	const encoding: ImageEncodeOptions = { type: `image/${options.format}` };
	if (options.format !== "png") encoding.quality = options.quality;
	return { blob: await canvas.convertToBlob(encoding), width, height, isReduced };
}
