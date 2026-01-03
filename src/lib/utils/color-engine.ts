import { converter, formatHex, type Oklab, parse } from "culori";
import { wasm } from "$lib/services/wasm";

// --- Types ---

export interface PaletteOptions {
	colorCount: number;
	quality: "fast" | "balanced" | "best"; // Controls downsampling size and iterations
}

export interface ColorStop {
	color: string; // CSS string
	position?: number; // 0-100
}

// --- Constants ---

const DOWNSAMPLE_SIZES = {
	fast: 64,
	balanced: 128,
	best: 256,
};

const KMEANS_ITERATIONS = {
	fast: 5,
	balanced: 10,
	best: 20,
};

// --- Converters ---

const toOklab = converter("oklab");
const toRgb = converter("rgb");

// --- Core Functions ---

/**
 * Extracts a representative color palette from an image using K-Means clustering in Oklab space.
 */
export async function extractPalette(
	imageSrc: string,
	options: PaletteOptions = { colorCount: 5, quality: "balanced" },
): Promise<string[]> {
	// 1. Load Image and Downsample
	const pixelData = await getDownsampledPixelData(imageSrc, DOWNSAMPLE_SIZES[options.quality]);

	// 2. K-Means Clustering (WASM)
	let centroids: { l: number, a: number, b: number }[] = [];
	try {
		centroids = wasm.runKMeans(pixelData, options.colorCount, KMEANS_ITERATIONS[options.quality]);
	} catch (e) {
		console.error("WASM K-Means failed", e);
		return ["#000000"];
	}

	// 3. Convert centroids back to CSS strings
	return centroids.map((c) => {
		const color = { mode: "oklab", l: c.l, a: c.a, b: c.b } as Oklab;
		const rgb = toRgb(color);
		// Validate RGB values to prevent NaN in CSS output
		if (!rgb || isNaN(rgb.r) || isNaN(rgb.g) || isNaN(rgb.b)) {
			return "#000000";
		}
		const hex = formatHex(rgb);
		return hex || "#000000";
	});
}

/**
 * Sorts a palette of colors to create the smoothest possible gradient.
 * Uses a heuristic for the Traveling Salesman Problem (TSP) in 3D Oklab space.
 */
export function sortPalette(colors: string[]): string[] {
	if (colors.length <= 2) return colors;

	const oklabColors = colors.map((c) => {
		const parsed = parse(c);

		const converted = parsed ? toOklab(parsed) : undefined;
		return converted || { mode: "oklab" as const, l: 0, a: 0, b: 0 };
	});

	// Calculate distance matrix
	const dist = (c1: Oklab, c2: Oklab) =>
		Math.sqrt((c1.l - c2.l) ** 2 + (c1.a - c2.a) ** 2 + (c1.b - c2.b) ** 2);

	// Simple Greedy TSP:
	// Start with the darkest color (or most extreme) to anchor the gradient
	// Then always jump to the nearest unvisited neighbor.

	// Find starting point: lowest Lightness usually anchors well
	let currentIndex = 0;
	let minL = 100;

	oklabColors.forEach((c, i) => {
		if (c.l < minL) {
			minL = c.l;
			currentIndex = i;
		}
	});

	const sortedIndices = [currentIndex];
	const visited = new Set([currentIndex]);

	while (sortedIndices.length < colors.length) {
		const current = oklabColors[currentIndex];
		if (!current) break;

		let nearestDist = Infinity;
		let nearestIndex = -1;

		for (let i = 0; i < colors.length; i++) {
			if (visited.has(i)) continue;

			const nextColor = oklabColors[i];
			if (!nextColor) continue;

			const d = dist(current, nextColor);
			if (d < nearestDist) {
				nearestDist = d;
				nearestIndex = i;
			}
		}

		if (nearestIndex !== -1) {
			sortedIndices.push(nearestIndex);
			visited.add(nearestIndex);
			currentIndex = nearestIndex;
		} else {
			break; // Should not happen
		}
	}

	return sortedIndices.map((i) => colors[i]).filter((c): c is string => c !== undefined);
}

/**
 * Generates a CSS linear gradient string using Oklch interpolation.
 */
export function generateGradient(colors: string[], direction: string = "to right"): string {
	// We use 'in oklch' for the interpolation space, which is the key for modern smooth gradients
	const stops = colors.join(", ");
	return `linear-gradient(${direction} in oklch, ${stops})`;
}

// --- Helper Functions ---

async function getDownsampledPixelData(src: string, maxSize: number): Promise<Uint8ClampedArray> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "Anonymous";
		img.onload = () => {
			const canvas = document.createElement("canvas");
			let width = img.width;
			let height = img.height;

			if (width > maxSize || height > maxSize) {
				if (width > height) {
					height = Math.round((height * maxSize) / width);
					width = maxSize;
				} else {
					width = Math.round((width * maxSize) / height);
					height = maxSize;
				}
			}

			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (!ctx) {
				reject(new Error("Could not get canvas context"));
				return;
			}

			ctx.drawImage(img, 0, 0, width, height);
			resolve(ctx.getImageData(0, 0, width, height).data);
		};
		img.onerror = reject;
		img.src = src;
	});
}
