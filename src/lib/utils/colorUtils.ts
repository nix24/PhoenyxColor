/**
 * Color utility functions for the PhoenyxColor application
 * Advanced color ordering based on perceptual color science
 */

/** sRGB channels, 0-255. */
export type Rgb = { r: number; g: number; b: number };
/** HSL with hue in degrees and saturation/lightness as percentages. */
export type Hsl = { h: number; s: number; l: number };

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): Rgb | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result || !result[1] || !result[2] || !result[3]) return null;
	return {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16),
	};
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
	return (
		"#" +
		[r, g, b]
			.map((x) => {
				const hex = x.toString(16);
				return hex.length === 1 ? `0${hex}` : hex;
			})
			.join("")
			.toUpperCase()
	);
}

/**
 * Convert RGB to HSL to get lightness value
 */
export function rgbToHsl(r: number, g: number, b: number): Hsl {
	r /= 255;
	g /= 255;
	b /= 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (max === min) {
		h = s = 0; // achromatic
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}

	return { h: h * 360, s: s * 100, l: l * 100 };
}
