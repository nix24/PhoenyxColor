/**
 * Shared utilities and types for the Palette Studio module
 */

import { hexToRgb, rgbToHex, rgbToHsl } from "$lib/utils/colorUtils";
import type { Rgb } from "$lib/utils/colorUtils";

export interface HSL {
	h: number;
	s: number;
	l: number;
}

/** Outcome of normalizing a user-entered color into canonical hex. */
export interface ColorNormalization {
	valid: boolean;
	color?: string;
	error?: string;
}

/** WCAG conformance a contrast ratio reaches, per text size. */
export interface WcagLevel {
	aa: boolean;
	aaLarge: boolean;
	aaa: boolean;
	aaaLarge: boolean;
}

// --- Color Validation ---

// fallow-ignore-next-line unused-export
export function isValidHexColor(color: string): boolean {
	return /^#?([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

function isValidRgbColor(color: string): boolean {
	return /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0?\.\d+|1|0))?\s*\)$/.test(
		color
	);
}

function isValidHslColor(color: string): boolean {
	return /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*(0?\.\d+|1|0))?\s*\)$/.test(
		color
	);
}

// fallow-ignore-next-line unused-export
export function normalizeHexColor(color: string): string {
	color = color.replace("#", "");
	if (color.length === 3) {
		color = color
			.split("")
			.map((c) => c + c)
			.join("");
	} else if (color.length === 8) {
		color = color.substring(0, 6);
	}
	return `#${color.toUpperCase()}`;
}

// --- Color Conversions ---

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
	const rgb = hexToRgb(hex);
	if (!rgb) return null;
	const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
	return { h: Math.round(hsl.h), s: Math.round(hsl.s), l: Math.round(hsl.l) };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
	h /= 360;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => {
		const k = (n + h / (1 / 12)) % 12;
		const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
		return Math.round(255 * color);
	};
	return { r: f(0), g: f(8), b: f(4) };
}

export function hslToHex(h: number, s: number, l: number): string {
	const rgb = hslToRgb(h, s / 100, l / 100);
	return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// --- Color Validation with Normalization ---

export function validateAndNormalizeColor(color: string): ColorNormalization {
	color = color.trim();

	if (isValidHexColor(color)) {
		return { valid: true, color: normalizeHexColor(color) };
	}

	if (isValidRgbColor(color)) {
		const match = color.match(
			/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0?\.\d+|1|0))?\s*\)/
		);
		if (match) {
			const r = Number(match[1]);
			const g = Number(match[2]);
			const b = Number(match[3]);
			if (
				!Number.isNaN(r) &&
				!Number.isNaN(g) &&
				!Number.isNaN(b) &&
				r <= 255 &&
				g <= 255 &&
				b <= 255
			) {
				return { valid: true, color: rgbToHex(r, g, b) };
			}
		}
	}

	if (isValidHslColor(color)) {
		const match = color.match(
			/hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*(0?\.\d+|1|0))?\s*\)/
		);
		if (match) {
			const h = Number(match[1]);
			const s = Number(match[2]);
			const l = Number(match[3]);
			if (
				!Number.isNaN(h) &&
				!Number.isNaN(s) &&
				!Number.isNaN(l) &&
				h <= 360 &&
				s <= 100 &&
				l <= 100
			) {
				return { valid: true, color: hslToHex(h, s, l) };
			}
		}
	}

	return {
		valid: false,
		error: "Invalid color format. Use HEX (#FF0000), RGB (rgb(255,0,0)), or HSL (hsl(0,100%,50%))",
	};
}

// --- Harmony Generators ---

export function generateComplementaryColor(baseColor: string): string {
	const hsl = hexToHsl(baseColor);
	if (!hsl) return baseColor;
	return hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l);
}

export function generateAnalogousColors(baseColor: string): string[] {
	const hsl = hexToHsl(baseColor);
	if (!hsl) return [baseColor];
	return [
		hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l),
		hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),
	];
}

export function generateTriadicColors(baseColor: string): string[] {
	const hsl = hexToHsl(baseColor);
	if (!hsl) return [baseColor];
	return [hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l), hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)];
}

export function generateMonochromaticColors(baseColor: string, count: number = 4): string[] {
	const hsl = hexToHsl(baseColor);
	if (!hsl) return [baseColor];

	const colors: string[] = [];
	const lightStep = 20;
	const satStep = 15;

	for (let i = 0; i < count; i++) {
		const newL = Math.max(10, Math.min(90, hsl.l + (i - 1) * lightStep));
		const newS = Math.max(10, Math.min(100, hsl.s + (i % 2 === 0 ? satStep : -satStep)));
		colors.push(hslToHex(hsl.h, newS, newL));
	}

	return colors;
}

export function generateSplitComplementaryColors(baseColor: string): string[] {
	const hsl = hexToHsl(baseColor);
	if (!hsl) return [baseColor];
	return [hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l), hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l)];
}

// --- Contrast Calculation (WCAG) ---

function getLuminance(r: number, g: number, b: number): number {
	const transform = (c: number) => {
		c = c / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

export function getContrastRatio(color1: string, color2: string): number {
	const rgb1 = hexToRgb(color1);
	const rgb2 = hexToRgb(color2);
	if (!rgb1 || !rgb2) return 1;

	const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
	const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

	const lighter = Math.max(lum1, lum2);
	const darker = Math.min(lum1, lum2);

	return (lighter + 0.05) / (darker + 0.05);
}

export function getWcagLevel(ratio: number): WcagLevel {
	return {
		aa: ratio >= 4.5,
		aaLarge: ratio >= 3,
		aaa: ratio >= 7,
		aaaLarge: ratio >= 4.5,
	};
}

// --- Color Blindness Simulation ---

// --- Global Palette Adjustments ---

// --- Mood/Theme Generators ---

// --- Semantic Theme Generator ---

// --- Smart Color Assignment for UI Previews ---

// --- Tween/Interpolation ---

// --- Export Formatters ---
