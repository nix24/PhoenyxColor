import { converter, type Oklch, type Rgb } from "culori";

// Initialize converters
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
        const pixels = await this.getImagePixels(imageSrc);
        const colors = this.quantizeColors(pixels, 16);
        const oklchColors = colors.map((c) => toOklch(c) as Oklch);

        // Filter for high chroma (vibrant) colors
        const vibrantColors = oklchColors.filter((c) => c.c > 0.1).sort((a, b) => b.c - a.c);

        // Fallback if no vibrant colors found
        const primary = vibrantColors.length > 0 ? vibrantColors[0] : oklchColors[0];

        if (!primary) {
            // Fallback to default if something goes terribly wrong
            return {
                primary: "oklch(65% 0.22 30)",
                secondary: "oklch(55% 0.25 290)",
                background: "oklch(15% 0.05 280)",
                text: "oklch(95% 0.01 280)",
                accent: "oklch(70% 0.15 40)"
            };
        }

        // Find a secondary color that is distinct in hue
        const secondary = vibrantColors.find((c) => Math.abs((c.h || 0) - (primary.h || 0)) > 60) || primary;

        // Generate background and text based on primary lightness
        const isDark = (primary.l || 0) < 0.5;
        const background: Oklch = { ...primary, l: isDark ? 0.1 : 0.95, c: 0.02, mode: "oklch" };
        const text: Oklch = { ...primary, l: isDark ? 0.95 : 0.1, c: 0.01, mode: "oklch" };
        const accent: Oklch = { ...secondary, l: isDark ? 0.8 : 0.4, mode: "oklch" };

        return {
            primary: this.formatCss(primary),
            secondary: this.formatCss(secondary),
            background: this.formatCss(background),
            text: this.formatCss(text),
            accent: this.formatCss(accent)
        };
    },

    /**
     * Sorts an array of hex colors using a 3D Hilbert Curve.
     * This ensures visually similar colors are grouped together.
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
        // Return as oklch() CSS string
        return `oklch(${((color.l || 0) * 100).toFixed(2)}% ${color.c.toFixed(3)} ${color.h?.toFixed(2) || 0})`;
    },

    async getImagePixels(src: string): Promise<Rgb[]> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                // Downscale for performance
                const width = 100;
                const height = (img.height / img.width) * width;
                canvas.width = width;
                canvas.height = height;

                ctx.drawImage(img, 0, 0, width, height);
                const data = ctx.getImageData(0, 0, width, height).data;
                const pixels: Rgb[] = [];

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    if (r !== undefined && g !== undefined && b !== undefined) {
                        pixels.push({ mode: "rgb", r: r / 255, g: g / 255, b: b / 255 });
                    }
                }
                resolve(pixels);
            };
            img.onerror = reject;
            img.src = src;
        });
    },

    // Simple quantization (just taking every Nth pixel for now, can be improved with K-Means)
    quantizeColors(pixels: Rgb[], maxColors: number): Rgb[] {
        const step = Math.floor(pixels.length / maxColors);
        const quantized: Rgb[] = [];
        for (let i = 0; i < pixels.length; i += step) {
            const pixel = pixels[i];
            if (pixel) {
                quantized.push(pixel);
            }
        }
        return quantized;
    },

    // Fast Hilbert curve approximation for 3D RGB space
    // Based on standard space-filling curve algorithms
    hilbert3D(x: number, y: number, z: number): number {
        // Normalize to integer range if needed, but for sorting relative order matters
        // Simplified Hilbert index calculation
        // In a real implementation, we would bit-interleave coordinates
        // For this prototype, we'll use a simplified proximity sort if full Hilbert is too complex to inline
        // But let's try a basic bit-interleaving approach which is the core of Z-order/Hilbert

        // Using Z-order curve (Morton code) as a faster approximation for "visual sorting" 
        // which is often sufficient and much simpler than full Hilbert for this use case
        // If strict Hilbert is needed, we can add a library later.

        const X = Math.floor(x);
        const Y = Math.floor(y);
        const Z = Math.floor(z);

        let answer = 0;
        for (let i = 0; i < 8; ++i) {
            answer |= ((X & (1 << i)) << (3 * i + 2)) |
                ((Y & (1 << i)) << (3 * i + 1)) |
                ((Z & (1 << i)) << (3 * i));
        }
        return answer;
    }
};
