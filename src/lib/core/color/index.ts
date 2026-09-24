/**
 * The app's only color-math module. Wraps culori's tree-shakeable `fn` build so the rest of the
 * code works with PhoenyxColor's own color types instead of culori's.
 */
import {
	useMode,
	modeRgb,
	modeLrgb,
	modeOklab,
	modeOklch,
	parse,
	formatHex as culoriFormatHex,
	toGamut,
	wcagContrast,
	type Color,
} from "culori/fn";

const toRgb = useMode(modeRgb);
const toLrgb = useMode(modeLrgb);
const toOklab = useMode(modeOklab);
const toOklch = useMode(modeOklch);
// CSS Color 4 gamut mapping: reduce OKLCH chroma until the color fits sRGB.
const toSrgbGamut = toGamut("rgb", "oklch");

/** Perceptual lightness `l` 0–1, chroma `c` ≥ 0, hue `h` in degrees (0 for achromatic colors). */
export type Oklch = { l: number; c: number; h: number };
/** OKLab: lightness `l` 0–1, opponent axes `a` and `b`. */
export type Oklab = { l: number; a: number; b: number };
/** Linear-light sRGB channels, 0–1. The form shaders consume. */
export type LinearRgb = [r: number, g: number, b: number];

function fromOklch(color: Oklch): Color {
	return { mode: "oklch", ...color };
}

/** Parse any CSS color string. Returns undefined for input culori cannot read. */
export function parseColor(css: string): Oklch | undefined {
	const parsed = parse(css);
	if (!parsed) return undefined;
	const { l, c, h } = toOklch(parsed);
	return { l, c, h: h ?? 0 };
}

/** `#rrggbb` for an OKLCH color, gamut-mapped into sRGB. */
export function oklchToHex(color: Oklch): string {
	return culoriFormatHex(toSrgbGamut(fromOklch(color)));
}

/** `#rrggbb` for an OKLab color, gamut-mapped into sRGB. */
export function oklabToHex(color: Oklab): string {
	return culoriFormatHex(toSrgbGamut({ mode: "oklab", ...color }));
}

/** OKLab coordinates of an 8-bit sRGB pixel. */
export function srgbBytesToOklab(r: number, g: number, b: number): Oklab {
	const { l, a, b: bAxis } = toOklab({ mode: "rgb", r: r / 255, g: g / 255, b: b / 255 });
	return { l, a, b: bAxis };
}

/** Linear-light sRGB of a CSS color, gamut-mapped. Undefined for unparseable input. */
export function cssToLinearRgb(css: string): LinearRgb | undefined {
	const parsed = parse(css);
	if (!parsed) return undefined;
	const { r, g, b } = toLrgb(toSrgbGamut(parsed));
	return [r, g, b];
}

/** Normalize any CSS color to `#rrggbb`. Undefined for unparseable input. */
export function toHex(css: string): string | undefined {
	const parsed = parse(css);
	return parsed ? culoriFormatHex(toSrgbGamut(toRgb(parsed))) : undefined;
}

/** WCAG 2 contrast ratio (1–21) between two CSS colors. Undefined if either is unparseable. */
export function contrastRatio(foreground: string, background: string): number | undefined {
	const fg = parse(foreground);
	const bg = parse(background);
	return fg && bg ? wcagContrast(fg, bg) : undefined;
}
