/**
 * Color utility functions for the PhoenyxColor application
 * Advanced color ordering based on perceptual color science
 */

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
			}
		: null;
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
 * Convert RGB to XYZ color space (D65 illuminant)
 */
function rgbToXyz(r: number, g: number, b: number): { x: number; y: number; z: number } {
	// Normalize RGB values to 0-1
	let rNorm = r / 255;
	let gNorm = g / 255;
	let bNorm = b / 255;

	// Apply gamma correction
	rNorm = rNorm > 0.04045 ? ((rNorm + 0.055) / 1.055) ** 2.4 : rNorm / 12.92;
	gNorm = gNorm > 0.04045 ? ((gNorm + 0.055) / 1.055) ** 2.4 : gNorm / 12.92;
	bNorm = bNorm > 0.04045 ? ((bNorm + 0.055) / 1.055) ** 2.4 : bNorm / 12.92;

	// Observer = 2°, Illuminant = D65
	const x = rNorm * 0.4124564 + gNorm * 0.3575761 + bNorm * 0.1804375;
	const y = rNorm * 0.2126729 + gNorm * 0.7151522 + bNorm * 0.072175;
	const z = rNorm * 0.0193339 + gNorm * 0.119192 + bNorm * 0.9503041;

	return { x: x * 100, y: y * 100, z: z * 100 };
}

/**
 * Convert XYZ to CIELAB color space
 */
function xyzToLab(x: number, y: number, z: number): { l: number; a: number; b: number } {
	// D65 illuminant reference values
	const xn = 95.047;
	const yn = 100.0;
	const zn = 108.883;

	let fx = x / xn;
	let fy = y / yn;
	let fz = z / zn;

	fx = fx > 0.008856 ? fx ** (1 / 3) : 7.787 * fx + 16 / 116;
	fy = fy > 0.008856 ? fy ** (1 / 3) : 7.787 * fy + 16 / 116;
	fz = fz > 0.008856 ? fz ** (1 / 3) : 7.787 * fz + 16 / 116;

	const l = 116 * fy - 16;
	const a = 500 * (fx - fy);
	const b = 200 * (fy - fz);

	return { l, a, b };
}

/**
 * Convert RGB to CIELAB color space
 */
function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
	const xyz = rgbToXyz(r, g, b);
	return xyzToLab(xyz.x, xyz.y, xyz.z);
}

/**
 * Convert hex color to CIELAB
 */
function hexToLab(hex: string): { l: number; a: number; b: number } | null {
	const rgb = hexToRgb(hex);
	if (!rgb) return null;
	return rgbToLab(rgb.r, rgb.g, rgb.b);
}

/**
 * Convert CIELAB to LCH (Lightness, Chroma, Hue)
 */
function labToLch(l: number, a: number, b: number): { l: number; c: number; h: number } {
	const c = Math.sqrt(a * a + b * b);
	let h = Math.atan2(b, a) * (180 / Math.PI);
	if (h < 0) h += 360;
	return { l, c, h };
}

/**
 * Convert hex color to LCH
 */
function hexToLch(hex: string): { l: number; c: number; h: number } | null {
	const lab = hexToLab(hex);
	if (!lab) return null;
	return labToLch(lab.l, lab.a, lab.b);
}

/**
 * Calculate Delta E 2000 - the most accurate perceptual color difference
 */
function deltaE2000(
	color1: { l: number; a: number; b: number },
	color2: { l: number; a: number; b: number },
): number {
	const { l: l1, a: a1, b: b1 } = color1;
	const { l: l2, a: a2, b: b2 } = color2;

	// Calculate C1, C2, and C_bar
	const c1 = Math.sqrt(a1 * a1 + b1 * b1);
	const c2 = Math.sqrt(a2 * a2 + b2 * b2);
	const cBar = (c1 + c2) / 2;

	// Calculate a'1 and a'2
	const g = 0.5 * (1 - Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7)));
	const a1Prime = a1 * (1 + g);
	const a2Prime = a2 * (1 + g);

	// Calculate C'1, C'2, and C'_bar
	const c1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
	const c2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);
	const cBarPrime = (c1Prime + c2Prime) / 2;

	// Calculate h'1 and h'2
	let h1Prime = Math.atan2(b1, a1Prime) * (180 / Math.PI);
	let h2Prime = Math.atan2(b2, a2Prime) * (180 / Math.PI);
	if (h1Prime < 0) h1Prime += 360;
	if (h2Prime < 0) h2Prime += 360;

	// Calculate ΔL', ΔC', and ΔH'
	const deltaLPrime = l2 - l1;
	const deltaCPrime = c2Prime - c1Prime;

	let deltaHPrime: number;
	if (c1Prime * c2Prime === 0) {
		deltaHPrime = 0;
	} else if (Math.abs(h2Prime - h1Prime) <= 180) {
		deltaHPrime = h2Prime - h1Prime;
	} else if (h2Prime - h1Prime > 180) {
		deltaHPrime = h2Prime - h1Prime - 360;
	} else {
		deltaHPrime = h2Prime - h1Prime + 360;
	}

	const deltaHPrimeValue =
		2 * Math.sqrt(c1Prime * c2Prime) * Math.sin((deltaHPrime * Math.PI) / 360);

	// Calculate L'_bar, C'_bar, and H'_bar
	const lBarPrime = (l1 + l2) / 2;

	let hBarPrime: number;
	if (c1Prime * c2Prime === 0) {
		hBarPrime = h1Prime + h2Prime;
	} else if (Math.abs(h1Prime - h2Prime) <= 180) {
		hBarPrime = (h1Prime + h2Prime) / 2;
	} else if (Math.abs(h1Prime - h2Prime) > 180 && h1Prime + h2Prime < 360) {
		hBarPrime = (h1Prime + h2Prime + 360) / 2;
	} else {
		hBarPrime = (h1Prime + h2Prime - 360) / 2;
	}

	// Calculate T
	const t =
		1 -
		0.17 * Math.cos(((hBarPrime - 30) * Math.PI) / 180) +
		0.24 * Math.cos((2 * hBarPrime * Math.PI) / 180) +
		0.32 * Math.cos(((3 * hBarPrime + 6) * Math.PI) / 180) -
		0.2 * Math.cos(((4 * hBarPrime - 63) * Math.PI) / 180);

	// Calculate ΔΘ
	const deltaTheta = 30 * Math.exp(-(((hBarPrime - 275) / 25) ** 2));

	// Calculate RC
	const rc = 2 * Math.sqrt(cBarPrime ** 7 / (cBarPrime ** 7 + 25 ** 7));

	// Calculate SL, SC, and SH
	const sl =
		1 + (0.015 * (lBarPrime - 50) ** 2) / Math.sqrt(20 + (lBarPrime - 50) ** 2);
	const sc = 1 + 0.045 * cBarPrime;
	const sh = 1 + 0.015 * cBarPrime * t;

	// Calculate RT
	const rt = -Math.sin((2 * deltaTheta * Math.PI) / 180) * rc;

	// Calculate ΔE00
	const kL = 1;
	const kC = 1;
	const kH = 1;

	const deltaE = Math.sqrt(
		(deltaLPrime / (kL * sl)) ** 2 +
			(deltaCPrime / (kC * sc)) ** 2 +
			(deltaHPrimeValue / (kH * sh)) ** 2 +
			rt * (deltaCPrime / (kC * sc)) * (deltaHPrimeValue / (kH * sh)),
	);

	return deltaE;
}

/**
 * Order colors using iterative nearest neighbor algorithm in perceptual color space
 * This creates smooth transitions by minimizing perceptual color differences
 */
export function orderColorsForGradient(colors: string[]): string[] {
	if (colors.length <= 2) return colors;

	// Convert all colors to LAB color space
	const labColors = colors
		.map((color) => {
			const lab = hexToLab(color);
			return lab ? { hex: color, lab } : null;
		})
		.filter(Boolean) as Array<{ hex: string; lab: { l: number; a: number; b: number } }>;

	if (labColors.length <= 2) return colors;

	// Find the starting color (darkest L* value for consistency)
	let startIndex = 0;
	let minLightness = labColors[0].lab.l;
	for (let i = 1; i < labColors.length; i++) {
		if (labColors[i].lab.l < minLightness) {
			minLightness = labColors[i].lab.l;
			startIndex = i;
		}
	}

	// Iterative nearest neighbor ordering
	const orderedColors: string[] = [];
	const remaining = [...labColors];

	// Start with the darkest color
	orderedColors.push(remaining[startIndex].hex);
	remaining.splice(startIndex, 1);

	// Iteratively find the nearest color to the last added color
	while (remaining.length > 0) {
		const lastColor = hexToLab(orderedColors[orderedColors.length - 1]);
		if (!lastColor) continue;

		let nearestIndex = 0;
		let smallestDistance = deltaE2000(lastColor, remaining[0].lab);

		for (let i = 1; i < remaining.length; i++) {
			const distance = deltaE2000(lastColor, remaining[i].lab);
			if (distance < smallestDistance) {
				smallestDistance = distance;
				nearestIndex = i;
			}
		}

		orderedColors.push(remaining[nearestIndex].hex);
		remaining.splice(nearestIndex, 1);
	}

	return orderedColors;
}

/**
 * Alternative ordering method: Structured LCH sort with hue grouping
 * This method groups similar hues together and sorts by lightness within groups
 */
export function orderColorsByHueLightness(colors: string[]): string[] {
	if (colors.length <= 2) return colors;

	// Convert to LCH and filter valid colors
	const lchColors = colors
		.map((color) => {
			const lch = hexToLch(color);
			return lch ? { hex: color, lch } : null;
		})
		.filter(Boolean) as Array<{ hex: string; lch: { l: number; c: number; h: number } }>;

	if (lchColors.length <= 2) return colors;

	// Sort by hue first, then by lightness within similar hues
	return lchColors
		.sort((a, b) => {
			// Primary sort: by hue
			const hueDiff = a.lch.h - b.lch.h;
			if (Math.abs(hueDiff) > 30) {
				// Only consider significant hue differences
				return hueDiff;
			}

			// Secondary sort: by lightness (darkest first)
			const lightnessDiff = a.lch.l - b.lch.l;
			if (Math.abs(lightnessDiff) > 10) {
				return lightnessDiff;
			}

			// Tertiary sort: by chroma (least saturated first)
			return a.lch.c - b.lch.c;
		})
		.map((item) => item.hex);
}

/**
 * Calculate the perceived brightness/luminance of a color
 * Uses the standard luminance formula: 0.299*R + 0.587*G + 0.114*B
 */
export function getColorBrightness(color: string): number {
	const rgb = hexToRgb(color);
	if (!rgb) return 0;

	// Use standard luminance formula for perceived brightness
	return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

/**
 * Convert RGB to HSL to get lightness value
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
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

/**
 * Get the HSL lightness value of a color (0-100)
 */
export function getColorLightness(color: string): number {
	const rgb = hexToRgb(color);
	if (!rgb) return 0;

	const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
	return hsl.l;
}

/**
 * Determine if a color is considered "light" or "dark"
 */
export function isLightColor(color: string): boolean {
	return getColorBrightness(color) > 127.5; // Middle of 0-255 range
}

/**
 * Get a contrasting color (black or white) for text on a colored background
 */
export function getContrastColor(backgroundColor: string): string {
	return isLightColor(backgroundColor) ? "#000000" : "#FFFFFF";
}
