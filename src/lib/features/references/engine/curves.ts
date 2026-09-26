import type { EditRecipe } from "../domain";

type CurvePoints = EditRecipe["curves"]["rgb"];

/** Catmull-Rom through the control points, sampled like v1 (`interpolateCurvePoints`). */
function sampleCurve(points: CurvePoints): CurvePoints {
	const sorted = [...points].sort((a, b) => a.x - b.x);
	const samples: CurvePoints = [];
	for (let i = 0; i < sorted.length - 1; i++) {
		const p0 = sorted[Math.max(0, i - 1)];
		const p1 = sorted[i];
		const p2 = sorted[i + 1];
		const p3 = sorted[Math.min(sorted.length - 1, i + 2)];
		if (!p0 || !p1 || !p2 || !p3) continue;
		for (let step = 0; step < 50; step++) {
			const t = step / 50;
			const t2 = t * t;
			const t3 = t2 * t;
			const along = (a: number, b: number, c: number, d: number) =>
				0.5 *
				(2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
			samples.push({
				x: Math.max(0, Math.min(255, along(p0.x, p1.x, p2.x, p3.x))),
				y: Math.max(0, Math.min(255, along(p0.y, p1.y, p2.y, p3.y))),
			});
		}
	}
	const last = sorted.at(-1);
	if (last) samples.push(last);
	return samples;
}

/** 256 output levels (0–255, fractional) for input levels 0–255. */
function curveTable(points: CurvePoints): Float32Array {
	const table = new Float32Array(256);
	const samples = sampleCurve(points);
	for (let level = 0; level < 256; level++) {
		let value = level;
		for (let i = 0; i < samples.length - 1; i++) {
			const a = samples[i];
			const b = samples[i + 1];
			if (a && b && a.x <= level && b.x >= level) {
				const t = b.x === a.x ? 0 : (level - a.x) / (b.x - a.x);
				value = a.y + t * (b.y - a.y);
				break;
			}
		}
		table[level] = Math.max(0, Math.min(255, value));
	}
	return table;
}

function lookup(table: Float32Array, level: number): number {
	const low = Math.floor(level);
	const high = Math.min(255, low + 1);
	const t = level - low;
	return (table[low] ?? 0) * (1 - t) + (table[high] ?? 0) * t;
}

/**
 * The 256×1 RGBA8 LUT the `adjust` shader samples: each channel curve, then the master curve,
 * in encoded (sRGB, 0–255) levels as v1 applied them. Alpha is unused.
 */
export function curvesLut(curves: EditRecipe["curves"]): Uint8Array {
	const master = curveTable(curves.rgb);
	const channels = [curveTable(curves.red), curveTable(curves.green), curveTable(curves.blue)];
	const lut = new Uint8Array(256 * 4);
	for (let level = 0; level < 256; level++) {
		channels.forEach((channel, c) => {
			lut[level * 4 + c] = Math.round(lookup(master, channel[level] ?? level));
		});
		lut[level * 4 + 3] = 255;
	}
	return lut;
}

export function isIdentityCurves(curves: EditRecipe["curves"]): boolean {
	return Object.values(curves).every(
		(points) =>
			points.length === 2 &&
			points[0]?.x === 0 &&
			points[0].y === 0 &&
			points[1]?.x === 255 &&
			points[1].y === 255
	);
}
