/**
 * Layer compositor — renders a stack of ImageLayers onto a canvas
 * using globalCompositeOperation for blend mode support.
 */

import type { ImageLayer, BlendMode } from "$lib/types/image-editor";

const BLEND_MODE_MAP: Record<BlendMode, GlobalCompositeOperation> = {
	normal: "source-over",
	multiply: "multiply",
	screen: "screen",
	overlay: "overlay",
	darken: "darken",
	lighten: "lighten",
	"color-dodge": "color-dodge",
	"color-burn": "color-burn",
	"hard-light": "hard-light",
	"soft-light": "soft-light",
	difference: "difference",
	exclusion: "exclusion",
	hue: "hue",
	saturation: "saturation",
	color: "color",
	luminosity: "luminosity",
};

function toCompositeOp(blendMode: BlendMode): GlobalCompositeOperation {
	return BLEND_MODE_MAP[blendMode] ?? "source-over";
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Failed to load layer image: ${src}`));
		img.src = src;
	});
}

export interface CompositeOptions {
	width: number;
	height: number;
	baseImageSrc: string;
}

/**
 * Composite a layer stack onto the given canvas.
 * The base image is drawn first, then each visible layer on top.
 * Layers are drawn bottom-to-top (index 0 = bottom).
 */
export async function compositeLayers(
	canvas: HTMLCanvasElement,
	layers: ImageLayer[],
	options: CompositeOptions,
): Promise<void> {
	const { width, height, baseImageSrc } = options;
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not get canvas 2d context");

	// Draw the base image first
	const baseImg = await loadImageElement(baseImageSrc);
	ctx.drawImage(baseImg, 0, 0, width, height);

	// Draw each visible layer in order (bottom to top)
	for (const layer of layers) {
		if (!layer.visible || !layer.src) continue;

		ctx.save();
		ctx.globalAlpha = layer.opacity;
		ctx.globalCompositeOperation = toCompositeOp(layer.blendMode);

		const layerImg = await loadImageElement(layer.src);
		ctx.drawImage(layerImg, 0, 0, width, height);

		ctx.restore();
	}
}

/**
 * Flatten all visible layers into a single image data URL.
 */
export async function flattenLayers(
	layers: ImageLayer[],
	options: CompositeOptions,
): Promise<string> {
	const canvas = document.createElement("canvas");
	await compositeLayers(canvas, layers, options);
	return canvas.toDataURL("image/png");
}

/**
 * Generate a small thumbnail for a layer.
 */
export async function generateLayerThumbnail(
	src: string,
	maxSize: number = 64,
): Promise<string> {
	const img = await loadImageElement(src);
	const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight, 1);
	const width = Math.round(img.naturalWidth * scale);
	const height = Math.round(img.naturalHeight * scale);

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not get canvas context");

	ctx.drawImage(img, 0, 0, width, height);
	return canvas.toDataURL("image/jpeg", 0.7);
}
