import { wasm } from "$lib/services/wasm";

/**
 * Image Processing Utilities
 * Real photo editing algorithms for temperature, shadows/highlights, vibrance, and clarity
 */

export interface ImageProcessingOptions {
    temperature?: number; // -100 to 100 (cool to warm)
    tint?: number; // -100 to 100 (green to magenta)
    shadows?: number; // -100 to 100
    highlights?: number; // -100 to 100
    vibrance?: number; // -100 to 100
    clarity?: number; // -100 to 100
}

/**
 * Apply temperature adjustment using color matrix transformation
 * Warm shifts toward orange/yellow, cool shifts toward blue
 */
export function applyTemperature(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    temperature: number
): void {
    if (temperature === 0) return;

    const imageData = ctx.getImageData(0, 0, width, height);

    wasm.applyTemperature(imageData.data, width, height, temperature);
    ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply tint adjustment (green to magenta axis)
 */
export function applyTint(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    tint: number
): void {
    if (tint === 0) return;

    const imageData = ctx.getImageData(0, 0, width, height);

    wasm.applyTint(imageData.data, width, height, tint);
    ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply shadows and highlights adjustment using tonal curves
 * Shadows affects dark tones, highlights affects bright tones
 */
export function applyShadowsHighlights(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    shadows: number,
    highlights: number
): void {
    if (shadows === 0 && highlights === 0) return;

    const imageData = ctx.getImageData(0, 0, width, height);

    wasm.applyShadowsHighlights(imageData.data, width, height, shadows, highlights);
    ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply vibrance adjustment - intelligent saturation that protects already-saturated colors
 * and skin tones
 */
export function applyVibrance(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    vibrance: number
): void {
    if (vibrance === 0) return;

    const imageData = ctx.getImageData(0, 0, width, height);

    wasm.applyVibrance(imageData.data, width, height, vibrance);
    ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply clarity adjustment using WASM unsharp mask
 */
export function applyClarity(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    clarity: number
): void {
    if (clarity === 0) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    wasm.applyClarity(imageData.data, width, height, clarity);
    ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply all image processing adjustments in the correct order
 */
export function applyAllAdjustments(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    options: ImageProcessingOptions
): void {
    // Apply in order: temperature/tint first, then tonal, then detail
    if (options.temperature !== undefined && options.temperature !== 0) {
        applyTemperature(ctx, width, height, options.temperature);
    }
    if (options.tint !== undefined && options.tint !== 0) {
        applyTint(ctx, width, height, options.tint);
    }
    if (
        (options.shadows !== undefined && options.shadows !== 0) ||
        (options.highlights !== undefined && options.highlights !== 0)
    ) {
        applyShadowsHighlights(
            ctx,
            width,
            height,
            options.shadows ?? 0,
            options.highlights ?? 0
        );
    }
    if (options.vibrance !== undefined && options.vibrance !== 0) {
        applyVibrance(ctx, width, height, options.vibrance);
    }
    if (options.clarity !== undefined && options.clarity !== 0) {
        applyClarity(ctx, width, height, options.clarity);
    }
}

/**
 * Generate SVG color matrix values for temperature adjustment
 * This can be used for real-time preview via CSS filter
 */
export function getTemperatureColorMatrix(temperature: number): string {
    const factor = temperature / 100;

    if (factor === 0) {
        return "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0";
    }

    if (factor > 0) {
        // Warm: boost red, slightly boost green, reduce blue
        const rBoost = 1 + factor * 0.12;
        const gBoost = 1 + factor * 0.04;
        const bReduce = 1 - factor * 0.08;
        return `${rBoost} 0 0 0 0  0 ${gBoost} 0 0 0  0 0 ${bReduce} 0 0  0 0 0 1 0`;
    } else {
        // Cool: reduce red, boost blue
        const rReduce = 1 + factor * 0.08;
        const bBoost = 1 - factor * 0.12;
        return `${rReduce} 0 0 0 0  0 1 0 0 0  0 0 ${bBoost} 0 0  0 0 0 1 0`;
    }
}

/**
 * Generate SVG color matrix values for tint adjustment
 */
export function getTintColorMatrix(tint: number): string {
    const factor = tint / 100;

    if (factor === 0) {
        return "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0";
    }

    if (factor > 0) {
        // Magenta tint
        const rgBoost = 1 + factor * 0.06;
        const gReduce = 1 - factor * 0.08;
        return `${rgBoost} 0 0 0 0  0 ${gReduce} 0 0 0  0 0 ${rgBoost} 0 0  0 0 0 1 0`;
    } else {
        // Green tint
        const rgReduce = 1 + factor * 0.06;
        const gBoost = 1 - factor * 0.08;
        return `${rgReduce} 0 0 0 0  0 ${gBoost} 0 0 0  0 0 ${rgReduce} 0 0  0 0 0 1 0`;
    }
}

/**
 * Interpolate curve points using Catmull-Rom spline
 */
export function interpolateCurvePoints(
    points: Array<{ x: number; y: number }>
): Array<{ x: number; y: number }> {
    if (points.length < 2) return points;

    const sortedPoints = [...points].sort((a, b) => a.x - b.x);
    const result: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < sortedPoints.length - 1; i++) {
        const p0 = sortedPoints[Math.max(0, i - 1)];
        const p1 = sortedPoints[i];
        const p2 = sortedPoints[i + 1];
        const p3 = sortedPoints[Math.min(sortedPoints.length - 1, i + 2)];

        if (!p0 || !p1 || !p2 || !p3) continue;

        for (let t = 0; t < 1; t += 0.02) {
            const t2 = t * t;
            const t3 = t2 * t;

            const x =
                0.5 *
                (2 * p1.x +
                    (-p0.x + p2.x) * t +
                    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

            const y =
                0.5 *
                (2 * p1.y +
                    (-p0.y + p2.y) * t +
                    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

            result.push({ x: Math.max(0, Math.min(255, x)), y: Math.max(0, Math.min(255, y)) });
        }
    }

    const lastPoint = sortedPoints[sortedPoints.length - 1];
    if (lastPoint) {
        result.push(lastPoint);
    }

    return result;
}

/**
 * Apply curve adjustments to image data
 */
export function applyCurves(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    curves: {
        rgb: Array<{ x: number; y: number }>;
        red: Array<{ x: number; y: number }>;
        green: Array<{ x: number; y: number }>;
        blue: Array<{ x: number; y: number }>;
    }
): void {
    const isDefault = (points: Array<{ x: number; y: number }> | undefined) =>
        !points ||
        points.length < 2 ||
        (points.length === 2 &&
            points[0]?.x === 0 &&
            points[0]?.y === 0 &&
            points[1]?.x === 255 &&
            points[1]?.y === 255);

    if (
        isDefault(curves.rgb) &&
        isDefault(curves.red) &&
        isDefault(curves.green) &&
        isDefault(curves.blue)
    ) {
        return;
    }

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Generate lookup tables for each channel
    const getLut = (points: Array<{ x: number; y: number }>) => {
        const lut = new Uint8Array(256);
        if (isDefault(points)) {
            for (let i = 0; i < 256; i++) lut[i] = i;
            return lut;
        }

        const interpolated = interpolateCurvePoints(points);
        for (let x = 0; x < 256; x++) {
            let y = x;
            for (let i = 0; i < interpolated.length - 1; i++) {
                const p1 = interpolated[i];
                const p2 = interpolated[i + 1];
                if (p1 && p2 && p1.x <= x && p2.x >= x) {
                    const t = p2.x !== p1.x ? (x - p1.x) / (p2.x - p1.x) : 0;
                    y = p1.y + t * (p2.y - p1.y);
                    break;
                }
            }
            lut[x] = Math.max(0, Math.min(255, y));
        }
        return lut;
    };

    const lutRGB = getLut(curves.rgb);
    const lutR = getLut(curves.red);
    const lutG = getLut(curves.green);
    const lutB = getLut(curves.blue);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;

        // Apply individual channel curves
        let newR = lutR[r]!;
        let newG = lutG[g]!;
        let newB = lutB[b]!;

        // Apply RGB master curve
        newR = lutRGB[newR]!;
        newG = lutRGB[newG]!;
        newB = lutRGB[newB]!;

        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
    }

    ctx.putImageData(imageData, 0, 0);
}
