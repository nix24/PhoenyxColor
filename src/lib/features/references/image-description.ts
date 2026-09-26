const THUMBNAIL_SIZE = 256;

export interface ImageDescription {
	width: number;
	height: number;
	/** The original scaled to fit 256 px, never upscaled. */
	thumbnail: Blob;
}

/**
 * Measures an image and makes its thumbnail. Browser only (`createImageBitmap`, `OffscreenCanvas`).
 * `imageOrientation: "from-image"` applies EXIF rotation, so the size is the one the user sees;
 * the engine must upload the texture with the same option.
 */
export async function describeImage(image: Blob): Promise<ImageDescription> {
	const bitmap = await createImageBitmap(image, { imageOrientation: "from-image" });
	try {
		const scale = Math.min(1, THUMBNAIL_SIZE / Math.max(bitmap.width, bitmap.height));
		const canvas = new OffscreenCanvas(
			Math.max(1, Math.round(bitmap.width * scale)),
			Math.max(1, Math.round(bitmap.height * scale))
		);
		const context = canvas.getContext("2d");
		if (!context) throw new Error("A 2D canvas is not available in this browser.");
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		// WebP keeps transparency; a browser that cannot encode WebP returns PNG instead.
		const thumbnail = await canvas.convertToBlob({ type: "image/webp", quality: 0.85 });
		return { width: bitmap.width, height: bitmap.height, thumbnail };
	} finally {
		bitmap.close();
	}
}
