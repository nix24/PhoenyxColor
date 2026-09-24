/**
 * Layer thumbnail generation.
 */

async function loadImageElement(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Failed to load layer image: ${src}`));
		img.src = src;
	});
}

/**
 * Generate a small thumbnail for a layer.
 */
export async function generateLayerThumbnail(src: string, maxSize: number = 64): Promise<string> {
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
