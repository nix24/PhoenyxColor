import { converter, formatHex, type Oklab, parse } from "culori";

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

	// 2. Convert to Oklab vectors
	// We store them as simple arrays [L, a, b] for faster math
	const pixels: [number, number, number][] = [];
	for (let i = 0; i < pixelData.length; i += 4) {
		// Skip transparent pixels
		if (pixelData[i + 3] < 128) continue;

		const r = pixelData[i] / 255;
		const g = pixelData[i + 1] / 255;
		const b = pixelData[i + 2] / 255;

		const oklab = toOklab({ mode: "rgb" as const, r, g, b });
		if (oklab) {
			pixels.push([oklab.l, oklab.a, oklab.b]);
		}
	}

	if (pixels.length === 0) return ["#000000"];

	// 3. K-Means Clustering
	const centroids = kMeans(pixels, options.colorCount, KMEANS_ITERATIONS[options.quality]);

	// 4. Convert centroids back to CSS strings
	return centroids.map((c) => {
		const color = { mode: "oklab", l: c[0], a: c[1], b: c[2] } as Oklab;
		return formatHex(toRgb(color)) || "#000000";
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
		let nearestDist = Infinity;
		let nearestIndex = -1;

		for (let i = 0; i < colors.length; i++) {
			if (visited.has(i)) continue;

			const d = dist(current, oklabColors[i]);
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

	return sortedIndices.map((i) => colors[i]);
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
			const ctx = canvas.getContext("2d");
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

function kMeans(
	points: [number, number, number][],
	k: number,
	iterations: number,
): [number, number, number][] {
	// Initialize centroids randomly from points
	const centroids = [];
	const usedIndices = new Set<number>();
	while (centroids.length < k && centroids.length < points.length) {
		const idx = Math.floor(Math.random() * points.length);
		if (!usedIndices.has(idx)) {
			centroids.push([...points[idx]] as [number, number, number]);
			usedIndices.add(idx);
		}
	}

	const assignments = new Int32Array(points.length);
	const clusterSizes = new Int32Array(k);
	const clusterSums = new Float32Array(k * 3);

	for (let iter = 0; iter < iterations; iter++) {
		// Assignment Step
		for (let i = 0; i < points.length; i++) {
			const p = points[i];
			let minDist = Infinity;
			let bestCluster = 0;

			for (let c = 0; c < k; c++) {
				const cent = centroids[c];
				const d = (p[0] - cent[0]) ** 2 + (p[1] - cent[1]) ** 2 + (p[2] - cent[2]) ** 2;
				if (d < minDist) {
					minDist = d;
					bestCluster = c;
				}
			}
			assignments[i] = bestCluster;
		}

		// Update Step
		clusterSizes.fill(0);
		clusterSums.fill(0);

		for (let i = 0; i < points.length; i++) {
			const cluster = assignments[i];
			const p = points[i];
			clusterSizes[cluster]++;
			clusterSums[cluster * 3] += p[0];
			clusterSums[cluster * 3 + 1] += p[1];
			clusterSums[cluster * 3 + 2] += p[2];
		}

		let changed = false;
		for (let c = 0; c < k; c++) {
			if (clusterSizes[c] > 0) {
				const newL = clusterSums[c * 3] / clusterSizes[c];
				const newA = clusterSums[c * 3 + 1] / clusterSizes[c];
				const newB = clusterSums[c * 3 + 2] / clusterSizes[c];

				// Check for convergence (optional optimization, skipping for fixed iterations)
				centroids[c][0] = newL;
				centroids[c][1] = newA;
				centroids[c][2] = newB;
			}
		}
	}

	return centroids;
}
