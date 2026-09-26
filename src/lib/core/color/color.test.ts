import { describe, expect, it } from "vitest";
import {
	contrastRatio,
	cssToLinearRgb,
	cssToOklab,
	cssToSrgb,
	mixOklab,
	oklabToSrgb,
	oklabToHex,
	oklchToHex,
	parseColor,
	srgbBytesToOklab,
	toHex,
} from "./index";

describe("parseColor", () => {
	it("reads hex, named and functional CSS colors", () => {
		expect(parseColor("#ffffff")?.l).toBeCloseTo(1, 5);
		expect(parseColor("black")?.l).toBeCloseTo(0, 5);
		expect(parseColor("oklch(70% 0.1 200)")).toEqual({ l: 0.7, c: 0.1, h: 200 });
	});

	it("gives achromatic colors a hue of 0", () => {
		expect(parseColor("#808080")?.h).toBe(0);
	});

	it("rejects garbage", () => {
		expect(parseColor("not a color")).toBeUndefined();
	});
});

describe("hex round-trips", () => {
	it.each(["#000000", "#ffffff", "#ff0000", "#3b82f6", "#8b5cf6", "#123456"])("%s", (hex) => {
		const oklch = parseColor(hex);
		expect(oklch).toBeDefined();
		if (oklch) expect(oklchToHex(oklch)).toBe(hex);
	});

	it("maps the 8-bit pixel path back to the same hex", () => {
		expect(oklabToHex(srgbBytesToOklab(59, 130, 246))).toBe("#3b82f6");
	});
});

describe("gamut mapping", () => {
	it("keeps out-of-sRGB colors displayable instead of clipping channels", () => {
		// Very high chroma: far outside sRGB.
		const hex = oklchToHex({ l: 0.7, c: 0.4, h: 150 });
		expect(hex).toMatch(/^#[0-9a-f]{6}$/);
		// Hue must survive mapping (naive per-channel clipping shifts it).
		const mapped = parseColor(hex);
		expect(mapped?.h).toBeGreaterThan(135);
		expect(mapped?.h).toBeLessThan(165);
	});
});

describe("toHex", () => {
	it("normalizes shorthand and functional input", () => {
		expect(toHex("#abc")).toBe("#aabbcc");
		expect(toHex("rgb(255 0 0)")).toBe("#ff0000");
		expect(toHex("nope")).toBeUndefined();
	});
});

describe("cssToLinearRgb", () => {
	it("linearizes sRGB mid-grey", () => {
		const linear = cssToLinearRgb("#808080");
		expect(linear?.[0]).toBeCloseTo(0.2159, 3);
	});
});

describe("contrastRatio", () => {
	it("matches known WCAG pairs", () => {
		expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
		expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
		// #767676 on white is the classic 4.54:1 AA threshold color.
		expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
	});

	it("is undefined for unparseable input", () => {
		expect(contrastRatio("nope", "#fff")).toBeUndefined();
	});
});

describe("encoded sRGB and OKLab mixing", () => {
	it("reads encoded channels, not linear ones", () => {
		// Gamut mapping round-trips through OKLCH, so compare at 8-bit precision.
		const levels = (cssToSrgb("#808000") ?? []).map((channel) => Math.round(channel * 255));
		expect(levels).toEqual([128, 128, 0]);
		expect(cssToSrgb("nope")).toBeUndefined();
	});

	it("round-trips a color through OKLab", () => {
		const oklab = cssToOklab("#3b82f6");
		if (!oklab) throw new Error("unparseable");
		oklabToSrgb(oklab).forEach((channel, c) =>
			expect(channel).toBeCloseTo((cssToSrgb("#3b82f6") ?? [])[c] ?? Number.NaN, 5)
		);
	});

	it("mixes at the ends and halfway in lightness", () => {
		const black = cssToOklab("black");
		const white = cssToOklab("white");
		if (!black || !white) throw new Error("unparseable");
		expect(mixOklab(black, white, 0)).toEqual(black);
		expect(mixOklab(black, white, 1).l).toBeCloseTo(white.l, 10);
		expect(mixOklab(black, white, 0.5).l).toBeCloseTo((black.l + white.l) / 2, 10);
	});
});
