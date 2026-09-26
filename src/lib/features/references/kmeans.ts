import type { Oklab } from "$lib/core/color";

export interface ColorCluster {
	centre: Oklab;
	/** How many samples the cluster holds. */
	size: number;
}

const MAX_ITERATIONS = 30;

/** Mulberry32: a tiny seeded PRNG, so the same image always gives the same palette. */
function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function distanceSquared(samples: Float32Array, index: number, centre: Oklab): number {
	const dl = (samples[index * 3] ?? 0) - centre.l;
	const da = (samples[index * 3 + 1] ?? 0) - centre.a;
	const db = (samples[index * 3 + 2] ?? 0) - centre.b;
	return dl * dl + da * da + db * db;
}

function sampleAt(samples: Float32Array, index: number): Oklab {
	return {
		l: samples[index * 3] ?? 0,
		a: samples[index * 3 + 1] ?? 0,
		b: samples[index * 3 + 2] ?? 0,
	};
}

/** k-means++: each new centre is picked with probability proportional to its squared distance. */
function initialCentres(
	samples: Float32Array,
	count: number,
	k: number,
	random: () => number
): Oklab[] {
	const centres = [sampleAt(samples, Math.floor(random() * count))];
	const nearest = new Float64Array(count).fill(Number.POSITIVE_INFINITY);
	while (centres.length < k) {
		const latest = centres.at(-1);
		if (!latest) break;
		let total = 0;
		for (let i = 0; i < count; i++) {
			nearest[i] = Math.min(nearest[i] ?? 0, distanceSquared(samples, i, latest));
			total += nearest[i] ?? 0;
		}
		// Every sample already sits on a centre: the image has fewer colors than asked for.
		if (total === 0) break;
		let target = random() * total;
		let chosen = count - 1;
		for (let i = 0; i < count; i++) {
			target -= nearest[i] ?? 0;
			if (target <= 0) {
				chosen = i;
				break;
			}
		}
		centres.push(sampleAt(samples, chosen));
	}
	return centres;
}

/**
 * Clusters OKLab samples (`l, a, b` triples) into at most `k` colors, largest cluster first.
 * Deterministic for a given `seed`. Returns fewer than `k` clusters when the samples hold fewer
 * distinct colors.
 */
export function clusterColors(samples: Float32Array, k: number, seed = 1): ColorCluster[] {
	const count = Math.floor(samples.length / 3);
	if (count === 0 || k < 1) return [];
	const random = seededRandom(seed);
	let centres = initialCentres(samples, count, k, random);
	const assignment = new Int32Array(count).fill(-1);
	let sizes: number[] = [];

	for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
		let hasChanged = false;
		for (let i = 0; i < count; i++) {
			let best = 0;
			let bestDistance = Number.POSITIVE_INFINITY;
			centres.forEach((centre, c) => {
				const distance = distanceSquared(samples, i, centre);
				if (distance < bestDistance) {
					bestDistance = distance;
					best = c;
				}
			});
			if (assignment[i] !== best) {
				assignment[i] = best;
				hasChanged = true;
			}
		}
		const sums = centres.map(() => ({ l: 0, a: 0, b: 0 }));
		sizes = centres.map(() => 0);
		for (let i = 0; i < count; i++) {
			const c = assignment[i] ?? 0;
			const sum = sums[c];
			if (!sum) continue;
			sum.l += samples[i * 3] ?? 0;
			sum.a += samples[i * 3 + 1] ?? 0;
			sum.b += samples[i * 3 + 2] ?? 0;
			sizes[c] = (sizes[c] ?? 0) + 1;
		}
		// An empty cluster keeps its centre; it is dropped from the result below.
		centres = centres.map((centre, c) => {
			const size = sizes[c] ?? 0;
			const sum = sums[c];
			return size > 0 && sum ? { l: sum.l / size, a: sum.a / size, b: sum.b / size } : centre;
		});
		if (!hasChanged) break;
	}

	return centres
		.map((centre, c) => ({ centre, size: sizes[c] ?? 0 }))
		.filter((cluster) => cluster.size > 0)
		.sort((a, b) => b.size - a.size);
}
