import { wasm } from "$lib/services/wasm";

/**
 * Effects Processing Utilities
 * Real implementations of image effects like posterize, pixelate, solarize, emboss, etc.
 */

export type EffectType =
	| "none"
	| "posterize"
	| "pixelate"
	| "solarize"
	| "duotone"
	| "halftone"
	| "vhs"
	| "glitch"
	| "emboss"
	| "sharpen";

/**
 * Apply posterize effect - reduces color levels
 */
export function applyPosterize(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number
): void {
	const imageData = ctx.getImageData(0, 0, width, height);

	try {
		wasm.applyPosterize(imageData.data, width, height, intensity);
	} catch (e) {
		console.error("WASM applyPosterize failed", e);
	}

	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply pixelate effect - block averaging for retro pixel look
 */
export function applyPixelate(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number
): void {
	const imageData = ctx.getImageData(0, 0, width, height);

	try {
		wasm.applyPixelate(imageData.data, width, height, intensity);
	} catch (e) {
		console.error("WASM applyPixelate failed", e);
	}

	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply solarize effect - partial inversion above threshold
 */
export function applySolarize(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number
): void {
	const imageData = ctx.getImageData(0, 0, width, height);

	try {
		wasm.applySolarize(imageData.data, width, height, intensity);
	} catch (e) {
		console.error("WASM applySolarize failed", e);
	}

	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply duotone effect - map grayscale to two colors
 */
export function applyDuotone(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number,
	darkColor: string,
	lightColor: string
): void {
	const imageData = ctx.getImageData(0, 0, width, height);

	const dark = hexToRgb(darkColor);
	const light = hexToRgb(lightColor);

	try {
		wasm.applyDuotone(imageData.data, width, height, intensity, dark, light);
	} catch (e) {
		console.error("WASM applyDuotone failed", e);
	}

	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply emboss effect using convolution kernel
 */
export function applyEmboss(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number
): void {
	const imageData = ctx.getImageData(0, 0, width, height);
	const data = imageData.data;
	const tempData = new Uint8ClampedArray(data);
	const factor = intensity / 100;

	// Emboss kernel
	const kernel = [-2, -1, 0, -1, 1, 1, 0, 1, 2];

	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const i = (y * width + x) * 4;

			for (let c = 0; c < 3; c++) {
				let sum = 0;
				for (let ky = -1; ky <= 1; ky++) {
					for (let kx = -1; kx <= 1; kx++) {
						const ki = ((y + ky) * width + (x + kx)) * 4;
						const pixelVal = tempData[ki + c] ?? 0;
						const kernelVal = kernel[(ky + 1) * 3 + (kx + 1)] ?? 0;
						sum += pixelVal * kernelVal;
					}
				}

				// Add 128 to center the result around middle gray
				const embossed = 128 + sum;
				const original = tempData[i + c] ?? 0;

				// Blend based on intensity
				data[i + c] = Math.max(0, Math.min(255, Math.round(original * (1 - factor) + embossed * factor)));
			}
		}
	}

	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply sharpen effect using unsharp mask convolution
 */
export function applySharpen(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number
): void {
	const imageData = ctx.getImageData(0, 0, width, height);
	const data = imageData.data;
	const tempData = new Uint8ClampedArray(data);
	const factor = intensity / 100;

	// Sharpen kernel
	const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const i = (y * width + x) * 4;

			for (let c = 0; c < 3; c++) {
				let sum = 0;
				for (let ky = -1; ky <= 1; ky++) {
					for (let kx = -1; kx <= 1; kx++) {
						const ki = ((y + ky) * width + (x + kx)) * 4;
						const pixelVal = tempData[ki + c] ?? 0;
						const kernelVal = kernel[(ky + 1) * 3 + (kx + 1)] ?? 0;
						sum += pixelVal * kernelVal;
					}
				}

				const original = tempData[i + c] ?? 0;
				// Blend sharpened with original based on intensity
				data[i + c] = Math.max(0, Math.min(255, Math.round(original + (sum - original) * factor)));
			}
		}
	}

	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply halftone effect - convert to dot pattern
 */
export function applyHalftone(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number
): void {
	const imageData = ctx.getImageData(0, 0, width, height);
	const data = imageData.data;

	// Dot size based on intensity
	const dotSize = Math.max(2, Math.round((intensity / 100) * 8));
	const spacing = dotSize * 2;

	// Create a new canvas for the halftone pattern
	const tempCanvas = document.createElement("canvas");
	tempCanvas.width = width;
	tempCanvas.height = height;
	const tempCtx = tempCanvas.getContext("2d");
	if (!tempCtx) return;

	// Fill with white
	tempCtx.fillStyle = "#ffffff";
	tempCtx.fillRect(0, 0, width, height);

	// Draw dots based on luminance
	for (let y = 0; y < height; y += spacing) {
		for (let x = 0; x < width; x += spacing) {
			// Sample average luminance in area
			let totalLum = 0;
			let count = 0;

			for (let sy = 0; sy < spacing && y + sy < height; sy++) {
				for (let sx = 0; sx < spacing && x + sx < width; sx++) {
					const i = ((y + sy) * width + (x + sx)) * 4;
					const r = data[i] ?? 0;
					const g = data[i + 1] ?? 0;
					const b = data[i + 2] ?? 0;
					totalLum += (r * 0.299 + g * 0.587 + b * 0.114) / 255;
					count++;
				}
			}

			const avgLum = totalLum / count;
			// Invert: darker areas = larger dots
			const radius = (1 - avgLum) * dotSize;

			if (radius > 0.5) {
				tempCtx.fillStyle = "#000000";
				tempCtx.beginPath();
				tempCtx.arc(x + spacing / 2, y + spacing / 2, radius, 0, Math.PI * 2);
				tempCtx.fill();
			}
		}
	}

	// Blend halftone with original based on intensity
	const halftoneData = tempCtx.getImageData(0, 0, width, height).data;
	const factor = intensity / 100;

	for (let i = 0; i < data.length; i += 4) {
		data[i] = Math.round((data[i] ?? 0) * (1 - factor) + (halftoneData[i] ?? 0) * factor);
		data[i + 1] = Math.round((data[i + 1] ?? 0) * (1 - factor) + (halftoneData[i + 1] ?? 0) * factor);
		data[i + 2] = Math.round((data[i + 2] ?? 0) * (1 - factor) + (halftoneData[i + 2] ?? 0) * factor);
	}

	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply VHS effect - chromatic aberration, scan lines, noise
 */
export function applyVHS(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number
): void {
	const imageData = ctx.getImageData(0, 0, width, height);
	const data = imageData.data;
	const tempData = new Uint8ClampedArray(data);
	const factor = intensity / 100;

	// Chromatic aberration offset
	const offset = Math.round(factor * 5);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;

			// Shift red channel left
			const redX = Math.max(0, x - offset);
			const redI = (y * width + redX) * 4;
			data[i] = tempData[redI] ?? 0;

			// Keep green in place
			data[i + 1] = tempData[i + 1] ?? 0;

			// Shift blue channel right
			const blueX = Math.min(width - 1, x + offset);
			const blueI = (y * width + blueX) * 4;
			data[i + 2] = tempData[blueI + 2] ?? 0;
		}
	}

	// Add scan lines
	const scanLineSpacing = 3;
	for (let y = 0; y < height; y += scanLineSpacing) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			const darkening = 0.8 + (1 - factor) * 0.2; // More intense = darker lines
			data[i] = Math.round((data[i] ?? 0) * darkening);
			data[i + 1] = Math.round((data[i + 1] ?? 0) * darkening);
			data[i + 2] = Math.round((data[i + 2] ?? 0) * darkening);
		}
	}

	// Add subtle noise
	const noiseAmount = factor * 20;
	for (let i = 0; i < data.length; i += 4) {
		const noise = (Math.random() - 0.5) * noiseAmount;
		data[i] = Math.max(0, Math.min(255, (data[i] ?? 0) + noise));
		data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] ?? 0) + noise));
		data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] ?? 0) + noise));
	}

	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply glitch effect - RGB channel offset, horizontal slice displacement
 */
export function applyGlitch(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number
): void {
	const imageData = ctx.getImageData(0, 0, width, height);
	const data = imageData.data;
	const tempData = new Uint8ClampedArray(data);
	const factor = intensity / 100;

	// RGB channel offset
	const channelOffset = Math.round(factor * 10);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;

			// Offset red channel
			const redX = Math.max(0, Math.min(width - 1, x - channelOffset));
			const redI = (y * width + redX) * 4;
			data[i] = tempData[redI] ?? 0;

			// Keep green
			data[i + 1] = tempData[i + 1] ?? 0;

			// Offset blue channel opposite direction
			const blueX = Math.max(0, Math.min(width - 1, x + channelOffset));
			const blueI = (y * width + blueX) * 4;
			data[i + 2] = tempData[blueI + 2] ?? 0;
		}
	}

	// Horizontal slice displacement
	const numSlices = Math.round(factor * 10);
	const sliceHeight = Math.round(height / 20);

	for (let s = 0; s < numSlices; s++) {
		const sliceY = Math.floor(Math.random() * (height - sliceHeight));
		const displacement = Math.round((Math.random() - 0.5) * factor * 30);

		for (let y = sliceY; y < sliceY + sliceHeight && y < height; y++) {
			for (let x = 0; x < width; x++) {
				const srcX = Math.max(0, Math.min(width - 1, x + displacement));
				const srcI = (y * width + srcX) * 4;
				const dstI = (y * width + x) * 4;

				// Read from tempData (original) instead of data (already modified)
				data[dstI] = tempData[srcI] ?? 0;
				data[dstI + 1] = tempData[srcI + 1] ?? 0;
				data[dstI + 2] = tempData[srcI + 2] ?? 0;
			}
		}
	}

	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply effect based on type
 */
export function applyEffect(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	effect: EffectType,
	intensity: number,
	duotoneColors?: [string, string]
): void {
	switch (effect) {
		case "posterize":
			applyPosterize(ctx, width, height, intensity);
			break;
		case "pixelate":
			applyPixelate(ctx, width, height, intensity);
			break;
		case "solarize":
			applySolarize(ctx, width, height, intensity);
			break;
		case "duotone":
			if (duotoneColors) {
				applyDuotone(ctx, width, height, intensity, duotoneColors[0] ?? "#000000", duotoneColors[1] ?? "#ffffff");
			}
			break;
		case "halftone":
			applyHalftone(ctx, width, height, intensity);
			break;
		case "vhs":
			applyVHS(ctx, width, height, intensity);
			break;
		case "glitch":
			applyGlitch(ctx, width, height, intensity);
			break;
		case "emboss":
			applyEmboss(ctx, width, height, intensity);
			break;
		case "sharpen":
			applySharpen(ctx, width, height, intensity);
			break;
		default:
			break;
	}
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result || !result[1] || !result[2] || !result[3]) {
		return { r: 0, g: 0, b: 0 };
	}
	return {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16),
	};
}

