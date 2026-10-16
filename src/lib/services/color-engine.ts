import { converter, type Oklch } from "culori";
import { extractPalette } from "$lib/features/references";

const toOklch = converter("oklch");
const toRgb = converter("rgb");

export interface ThemePalette {
	primary: string;
	secondary: string;
	background: string;
	text: string;
	accent: string;
}

export const ColorEngine = {
	/**
	 * Extracts a theme palette from an image URL or data.
	 * Uses OkLCH color space for perceptual uniformity.
	 */
	async extractTheme(imageSrc: string): Promise<ThemePalette> {
		const colors = await extractPalette(await (await fetch(imageSrc)).blob(), 16);
		// SAFETY: `toOklch` returns an `Oklch` for every color culori can parse; the inputs
		// here are `#rrggbb` strings produced by `extractPalette`.
		const oklchColors = colors.map((c) => toOklch(c) as Oklch);

		const vibrantColors = oklchColors.filter((c) => c.c > 0.1).sort((a, b) => b.c - a.c);

		const primary = vibrantColors.length > 0 ? vibrantColors[0] : oklchColors[0];

		if (!primary) {
			return {
				primary: "oklch(65% 0.22 30)",
				secondary: "oklch(55% 0.25 290)",
				background: "oklch(15% 0.05 280)",
				text: "oklch(95% 0.01 280)",
				accent: "oklch(70% 0.15 40)",
			};
		}

		const secondary =
			vibrantColors.find((c) => Math.abs((c.h || 0) - (primary.h || 0)) > 60) || primary;

		const isDark = (primary.l || 0) < 0.5;
		const background: Oklch = { ...primary, l: isDark ? 0.1 : 0.95, c: 0.02, mode: "oklch" };
		const text: Oklch = { ...primary, l: isDark ? 0.95 : 0.1, c: 0.01, mode: "oklch" };
		const accent: Oklch = { ...secondary, l: isDark ? 0.8 : 0.4, mode: "oklch" };

		return {
			primary: this.formatCss(primary),
			secondary: this.formatCss(secondary),
			background: this.formatCss(background),
			text: this.formatCss(text),
			accent: this.formatCss(accent),
		};
	},

	/**
	 * Sorts `hexColors` in place along a Z-order curve through RGB (see `hilbert3D`).
	 * Similar colors mostly end up near each other.
	 */
	sortColorsHilbert(hexColors: string[]): string[] {
		return hexColors.sort((a, b) => {
			const rgbA = toRgb(a);
			const rgbB = toRgb(b);
			if (!rgbA || !rgbB) return 0;

			const hilbertA = this.hilbert3D(rgbA.r * 255, rgbA.g * 255, rgbA.b * 255);
			const hilbertB = this.hilbert3D(rgbB.r * 255, rgbB.g * 255, rgbB.b * 255);

			return hilbertA - hilbertB;
		});
	},

	formatCss(color: Oklch): string {
		return `oklch(${((color.l || 0) * 100).toFixed(2)}% ${color.c.toFixed(3)} ${color.h?.toFixed(2) || 0})`;
	},

	/** Z-order (Morton) index of an RGB point, 0–255 per channel: a cheap stand-in for Hilbert. */
	hilbert3D(x: number, y: number, z: number): number {
		const X = Math.floor(x);
		const Y = Math.floor(y);
		const Z = Math.floor(z);

		let answer = 0;
		for (let i = 0; i < 8; ++i) {
			answer |=
				((X & (1 << i)) << (3 * i + 2)) |
				((Y & (1 << i)) << (3 * i + 1)) |
				((Z & (1 << i)) << (3 * i));
		}
		return answer;
	},
};
