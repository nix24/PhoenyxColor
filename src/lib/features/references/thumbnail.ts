import type { BlobId } from "$lib/core/storage";
import type { EditRecipe } from "./domain";
import { RenderEngine } from "./engine/engine";
import { exportImage } from "./engine/export";
import { outputGeometry } from "./engine/geometry";

const THUMBNAIL_SIZE = 256;

/** One engine for every thumbnail, so the library holds one WebGL context, not one per image. */
let thumbnailEngine: RenderEngine | undefined;

/**
 * Renders a reference as edited, fitted inside 256 px (never upscaled), through the same path as
 * the editor's export, so the grid shows exactly what the editor shows. WebP keeps transparency.
 */
export async function renderThumbnail(
	original: Blob,
	recipe: EditRecipe,
	layerImages: Map<BlobId, Blob>
): Promise<Blob> {
	thumbnailEngine ??= new RenderEngine(document.createElement("canvas"));
	const engine = thumbnailEngine;
	await engine.setSource(original);
	engine.retainLayerImages(new Set(layerImages.keys()));
	for (const [blobId, image] of layerImages) await engine.setLayerImage(blobId, image);
	return exportThumbnail(engine, recipe);
}

/** A thumbnail from an engine that already holds the reference's images (e.g. the editor's). */
export async function exportThumbnail(engine: RenderEngine, recipe: EditRecipe): Promise<Blob> {
	const source = engine.sourceSize;
	if (!source) throw new Error("The thumbnail source was not uploaded.");
	const { width, height } = outputGeometry(source.width, source.height, recipe.geometry);
	const { blob } = await exportImage(engine, recipe, {
		format: "webp",
		scale: Math.min(1, THUMBNAIL_SIZE / Math.max(width, height)),
		quality: 0.85,
		hasBackground: false,
	});
	return blob;
}
