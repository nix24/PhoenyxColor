/**
 * Shared utilities and types for the Palette Studio module
 */

import { rgbToHex } from "$lib/utils/colorUtils";

// --- Color Validation ---

export function isValidHexColor(color: string): boolean {
    return /^#?([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

export function isValidRgbColor(color: string): boolean {
    return /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0?\.\d+|1|0))?\s*\)$/.test(
        color
    );
}

export function isValidHslColor(color: string): boolean {
    return /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*(0?\.\d+|1|0))?\s*\)$/.test(
        color
    );
}

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

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result?.[1] && result?.[2] && result?.[3]
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;

    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0,
        s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
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

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
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

export function formatColor(hex: string, format: "hex" | "rgb" | "hsl" = "hex"): string {
    switch (format) {
        case "rgb": {
            const rgb = hexToRgb(hex);
            return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : hex;
        }
        case "hsl": {
            const hsl = hexToHsl(hex);
            return hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : hex;
        }
        default:
            return hex;
    }
}

// --- Color Validation with Normalization ---

export function validateAndNormalizeColor(color: string): {
    valid: boolean;
    color?: string;
    error?: string;
} {
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
            if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b) && r <= 255 && g <= 255 && b <= 255) {
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
            if (!Number.isNaN(h) && !Number.isNaN(s) && !Number.isNaN(l) && h <= 360 && s <= 100 && l <= 100) {
                return { valid: true, color: hslToHex(h, s, l) };
            }
        }
    }

    return {
        valid: false,
        error:
            "Invalid color format. Use HEX (#FF0000), RGB (rgb(255,0,0)), or HSL (hsl(0,100%,50%))",
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
    return [
        hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
        hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
    ];
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
    return [
        hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l),
        hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l),
    ];
}

// --- Contrast Calculation (WCAG) ---

function getLuminance(r: number, g: number, b: number): number {
    const transform = (c: number) => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
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

export function getWcagLevel(ratio: number): { aa: boolean; aaLarge: boolean; aaa: boolean; aaaLarge: boolean } {
    return {
        aa: ratio >= 4.5,
        aaLarge: ratio >= 3,
        aaa: ratio >= 7,
        aaaLarge: ratio >= 4.5,
    };
}

// --- Color Blindness Simulation ---

// Matrices for color blindness simulation (Brettel et al.)
const colorBlindnessMatrices = {
    protanopia: [
        [0.567, 0.433, 0],
        [0.558, 0.442, 0],
        [0, 0.242, 0.758],
    ],
    deuteranopia: [
        [0.625, 0.375, 0],
        [0.7, 0.3, 0],
        [0, 0.3, 0.7],
    ],
    tritanopia: [
        [0.95, 0.05, 0],
        [0, 0.433, 0.567],
        [0, 0.475, 0.525],
    ],
};

export type ColorBlindnessType = keyof typeof colorBlindnessMatrices;

export function simulateColorBlindness(hex: string, type: ColorBlindnessType): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const matrix = colorBlindnessMatrices[type];
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    // Apply transformation matrix - using non-null assertion as matrix is guaranteed by type
    const [[r0, r1, r2], [g0, g1, g2], [b0, b1, b2]] = matrix as [[number, number, number], [number, number, number], [number, number, number]];

    const newR = Math.round((r0 * r + r1 * g + r2 * b) * 255);
    const newG = Math.round((g0 * r + g1 * g + g2 * b) * 255);
    const newB = Math.round((b0 * r + b1 * g + b2 * b) * 255);

    return rgbToHex(
        Math.max(0, Math.min(255, newR)),
        Math.max(0, Math.min(255, newG)),
        Math.max(0, Math.min(255, newB))
    );
}

// --- Global Palette Adjustments ---

export function adjustPaletteHue(colors: string[], shift: number, lockedIndices: Set<number>): string[] {
    return colors.map((color, index) => {
        if (lockedIndices.has(index)) return color;
        const hsl = hexToHsl(color);
        if (!hsl) return color;
        return hslToHex((hsl.h + shift + 360) % 360, hsl.s, hsl.l);
    });
}

export function adjustPaletteSaturation(colors: string[], delta: number, lockedIndices: Set<number>): string[] {
    return colors.map((color, index) => {
        if (lockedIndices.has(index)) return color;
        const hsl = hexToHsl(color);
        if (!hsl) return color;
        const newS = Math.max(0, Math.min(100, hsl.s + delta));
        return hslToHex(hsl.h, newS, hsl.l);
    });
}

export function adjustPaletteLightness(colors: string[], delta: number, lockedIndices: Set<number>): string[] {
    return colors.map((color, index) => {
        if (lockedIndices.has(index)) return color;
        const hsl = hexToHsl(color);
        if (!hsl) return color;
        const newL = Math.max(0, Math.min(100, hsl.l + delta));
        return hslToHex(hsl.h, hsl.s, newL);
    });
}

// --- Mood/Theme Generators ---

export type MoodType = "pastel" | "neon" | "earthy" | "muted" | "jewel";

export function generateMoodPalette(seedColor: string, mood: MoodType, count: number): string[] {
    const hsl = hexToHsl(seedColor);
    if (!hsl) return [seedColor];

    const colors: string[] = [];
    const hueStep = 360 / count;

    for (let i = 0; i < count; i++) {
        const hue = (hsl.h + i * hueStep) % 360;
        let s: number;
        let l: number;

        switch (mood) {
            case "pastel":
                s = 30 + Math.random() * 20; // 30-50%
                l = 75 + Math.random() * 15; // 75-90%
                break;
            case "neon":
                s = 90 + Math.random() * 10; // 90-100%
                l = 50 + Math.random() * 10; // 50-60%
                break;
            case "earthy":
                s = 20 + Math.random() * 30; // 20-50%
                l = 30 + Math.random() * 30; // 30-60%
                break;
            case "muted":
                s = 15 + Math.random() * 25; // 15-40%
                l = 40 + Math.random() * 30; // 40-70%
                break;
            case "jewel":
                s = 60 + Math.random() * 30; // 60-90%
                l = 35 + Math.random() * 20; // 35-55%
                break;
        }

        colors.push(hslToHex(hue, s, l));
    }

    return colors;
}

// --- Semantic Theme Generator ---

export interface SemanticTheme {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    background: string;
    text: string;
    muted: string;
}

export function generateSemanticTheme(seedColor: string): SemanticTheme {
    const hsl = hexToHsl(seedColor);
    if (!hsl) {
        return {
            primary: seedColor,
            secondary: "#6B7280",
            accent: "#F59E0B",
            surface: "#FFFFFF",
            background: "#F3F4F6",
            text: "#111827",
            muted: "#9CA3AF",
        };
    }

    return {
        primary: seedColor,
        secondary: hslToHex((hsl.h + 30) % 360, Math.max(20, hsl.s - 20), hsl.l),
        accent: hslToHex((hsl.h + 180) % 360, Math.min(100, hsl.s + 20), Math.min(60, hsl.l + 10)),
        surface: hslToHex(hsl.h, 5, 98),
        background: hslToHex(hsl.h, 8, 95),
        text: hslToHex(hsl.h, 10, 10),
        muted: hslToHex(hsl.h, 10, 60),
    };
}

// --- Smart Color Assignment for UI Previews ---

export interface AssignedColors {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    background: string;
    text: string;
    muted: string;
}

/**
 * Intelligently assigns colors to semantic roles based on their properties.
 * Analyzes lightness, saturation, and contrast to make smart decisions.
 */
export function assignColorsSmartly(colors: string[]): AssignedColors {
    if (colors.length === 0) {
        return {
            primary: "#3b82f6",
            secondary: "#6b7280",
            accent: "#f59e0b",
            surface: "#1e1e2e",
            background: "#11111b",
            text: "#ffffff",
            muted: "#6b7280",
        };
    }

    // Analyze all colors
    const analyzed = colors.map((color, index) => {
        const hsl = hexToHsl(color);
        return {
            color,
            index,
            h: hsl?.h ?? 0,
            s: hsl?.s ?? 0,
            l: hsl?.l ?? 50,
        };
    });

    // Sort by different properties for selection
    const byLightness = [...analyzed].sort((a, b) => a.l - b.l);
    const bySaturation = [...analyzed].sort((a, b) => b.s - a.s);

    // Find the darkest and lightest colors
    const darkest = byLightness[0];
    const lightest = byLightness[byLightness.length - 1];

    // Find most saturated colors (good for primary/accent)
    const mostSaturated = bySaturation.filter(c => c.s > 30);

    // Determine if this is a dark or light palette
    const avgLightness = analyzed.reduce((sum, c) => sum + c.l, 0) / analyzed.length;
    const isDarkPalette = avgLightness < 50;

    let primary: string;
    let secondary: string;
    let accent: string;
    let surface: string;
    let background: string;
    let text: string;
    let muted: string;

    // Get first color as fallback
    const firstColor = colors[0] ?? "#3b82f6";

    if (isDarkPalette) {
        // Dark palette: use dark colors for bg/surface, light for text
        background = darkest?.color ?? "#11111b";
        surface = byLightness[Math.min(1, byLightness.length - 1)]?.color ?? "#1e1e2e";
        text = lightest?.color ?? "#ffffff";

        // Primary: most saturated mid-lightness color
        const primaryCandidates = mostSaturated.filter(c => c.l > 30 && c.l < 70);
        primary = primaryCandidates[0]?.color ?? mostSaturated[0]?.color ?? firstColor;

        // Secondary: second most saturated or slightly desaturated
        const secondaryCandidates = analyzed.filter(c => c.color !== primary && c.s > 20);
        secondary = secondaryCandidates[0]?.color ?? hslToHex(
            (hexToHsl(primary)?.h ?? 0 + 30) % 360,
            30,
            40
        );

        // Accent: different hue from primary, high saturation
        const primaryHue = hexToHsl(primary)?.h ?? 0;
        const accentCandidates = mostSaturated.filter(c => {
            const hueDiff = Math.abs(c.h - primaryHue);
            return hueDiff > 60 && hueDiff < 300 && c.color !== primary;
        });
        accent = accentCandidates[0]?.color ?? hslToHex((primaryHue + 180) % 360, 80, 55);

        // Muted: mid-lightness, low saturation
        const mutedCandidates = analyzed.filter(c => c.s < 40 && c.l > 30 && c.l < 70);
        muted = mutedCandidates[0]?.color ?? hslToHex(0, 10, 50);
    } else {
        // Light palette: use light colors for bg/surface, dark for text
        background = lightest?.color ?? "#f3f4f6";
        surface = byLightness[Math.max(0, byLightness.length - 2)]?.color ?? "#ffffff";
        text = darkest?.color ?? "#111827";

        // Primary: most saturated darker color
        const primaryCandidates = mostSaturated.filter(c => c.l < 60);
        primary = primaryCandidates[0]?.color ?? mostSaturated[0]?.color ?? firstColor;

        // Secondary: second option
        const secondaryCandidates = analyzed.filter(c => c.color !== primary && c.s > 20 && c.l < 70);
        secondary = secondaryCandidates[0]?.color ?? hslToHex(
            (hexToHsl(primary)?.h ?? 0 + 30) % 360,
            40,
            50
        );

        // Accent: contrasting hue
        const primaryHue = hexToHsl(primary)?.h ?? 0;
        const accentCandidates = mostSaturated.filter(c => {
            const hueDiff = Math.abs(c.h - primaryHue);
            return hueDiff > 60 && hueDiff < 300 && c.color !== primary;
        });
        accent = accentCandidates[0]?.color ?? hslToHex((primaryHue + 150) % 360, 70, 50);

        // Muted
        const mutedCandidates = analyzed.filter(c => c.s < 30 && c.l > 40 && c.l < 80);
        muted = mutedCandidates[0]?.color ?? hslToHex(0, 5, 60);
    }

    return { primary, secondary, accent, surface, background, text, muted };
}

// --- Tween/Interpolation ---

export function interpolateColors(color1: string, color2: string, steps: number): string[] {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    if (!rgb1 || !rgb2) return [color1, color2];

    const result: string[] = [];
    for (let i = 0; i <= steps + 1; i++) {
        const t = i / (steps + 1);
        const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
        const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
        const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
        result.push(rgbToHex(r, g, b));
    }
    return result;
}

// --- Export Formatters ---

export function formatAsTailwindConfig(colors: string[], paletteName: string): string {
    const name = paletteName.toLowerCase().replace(/\s+/g, "-");
    const shades = colors.reduce((acc, color, index) => {
        const shade = index === 0 ? "50" : String((index) * 100);
        acc[shade] = color;
        return acc;
    }, {} as Record<string, string>);

    return `// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        '${name}': ${JSON.stringify(shades, null, 10).replace(/"/g, "'")}
      }
    }
  }
}`;
}

export function formatAsCssVariables(colors: string[], paletteName: string): string {
    const name = paletteName.toLowerCase().replace(/\s+/g, "-");
    const vars = colors
        .map((color, index) => `  --${name}-${index + 1}: ${color};`)
        .join("\n");
    return `:root {\n${vars}\n}`;
}

export function formatAsScss(colors: string[], paletteName: string): string {
    const name = paletteName.toLowerCase().replace(/\s+/g, "-");
    const vars = colors
        .map((color, index) => `$${name}-${index + 1}: ${color};`)
        .join("\n");
    const map = `$${name}: (\n${colors.map((color, i) => `  ${i + 1}: ${color}`).join(",\n")}\n);`;
    return `${vars}\n\n${map}`;
}

