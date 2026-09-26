import type { EditRecipe } from "../domain";

/** Uniform values for `adjust.frag`. Every slider at 0 gives the identity. */
export interface AdjustUniforms {
	whiteBalance: [number, number, number];
	gain: number;
	contrast: number;
	shadowsHighlights: [number, number];
	saturation: number;
	vibrance: number;
	/** Column-major `mat3`. */
	hueRotation: Float32Array;
	grayscale: number;
	sepia: number;
	invert: number;
}

/** CSS `hue-rotate()` matrix, which keeps luminance. */
function hueRotationMatrix(degrees: number): Float32Array {
	const radians = (degrees * Math.PI) / 180;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	const rows = [
		[
			0.213 + cos * 0.787 - sin * 0.213,
			0.715 - cos * 0.715 - sin * 0.715,
			0.072 - cos * 0.072 + sin * 0.928,
		],
		[
			0.213 - cos * 0.213 + sin * 0.143,
			0.715 + cos * 0.285 + sin * 0.14,
			0.072 - cos * 0.072 - sin * 0.283,
		],
		[
			0.213 - cos * 0.213 - sin * 0.787,
			0.715 - cos * 0.715 + sin * 0.715,
			0.072 + cos * 0.928 + sin * 0.072,
		],
	];
	// Column-major: element i is row i % 3 of column ⌊i / 3⌋.
	return Float32Array.from({ length: 9 }, (_, i) => rows[i % 3]?.[Math.floor(i / 3)] ?? 0);
}

export function adjustUniforms({ tone, color }: EditRecipe): AdjustUniforms {
	const warmth = color.temperature / 100;
	const magenta = color.tint / 100;
	return {
		// Warm: more red, less blue. Tint: magenta (red + blue) against green.
		whiteBalance: [
			(1 + 0.2 * warmth) * (1 + 0.1 * magenta),
			1 - 0.2 * magenta,
			(1 - 0.2 * warmth) * (1 + 0.1 * magenta),
		],
		// CSS brightness() scales encoded values; the same factor in linear light is its 2.2 power.
		gain: (1 + tone.brightness / 100) ** 2.2,
		contrast: 1 + tone.contrast / 100,
		shadowsHighlights: [tone.shadows / 100, tone.highlights / 100],
		saturation: 1 + color.saturation / 100,
		vibrance: color.vibrance / 100,
		hueRotation: hueRotationMatrix(color.hue),
		grayscale: color.isGrayscale ? 1 : 0,
		sepia: color.sepia / 100,
		invert: color.invert / 100,
	};
}
