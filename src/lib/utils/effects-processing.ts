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
	wasm.applyPosterize(imageData.data, width, height, intensity);
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
	wasm.applyPixelate(imageData.data, width, height, intensity);
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
	wasm.applySolarize(imageData.data, width, height, intensity);
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

	wasm.applyDuotone(imageData.data, width, height, intensity, dark, light);
	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply emboss effect using WASM convolution kernel
 */
export function applyEmboss(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number
): void {
	const imageData = ctx.getImageData(0, 0, width, height);
	wasm.applyConvolution3x3(imageData.data, width, height, [-2, -1, 0, -1, 1, 1, 0, 1, 2], intensity, 128);
	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply sharpen effect using WASM convolution kernel
 */
export function applySharpen(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number
): void {
	const imageData = ctx.getImageData(0, 0, width, height);
	wasm.applyConvolution3x3(imageData.data, width, height, [0, -1, 0, -1, 5, -1, 0, -1, 0], intensity, 0);
	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply halftone effect using WASM
 */
export function applyHalftone(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number
): void {
	const imageData = ctx.getImageData(0, 0, width, height);
	wasm.applyHalftone(imageData.data, width, height, intensity);
	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply VHS effect using WASM
 */
export function applyVHS(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number
): void {
	const imageData = ctx.getImageData(0, 0, width, height);
	wasm.applyVHS(imageData.data, width, height, intensity);
	ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply glitch effect using WASM
 */
export function applyGlitch(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	intensity: number
): void {
	const imageData = ctx.getImageData(0, 0, width, height);
	wasm.applyGlitch(imageData.data, width, height, intensity);
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

