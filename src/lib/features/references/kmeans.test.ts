import { describe, expect, it } from "vitest";
import { clusterColors } from "./kmeans";

/** `count` copies of each [l, a, b], in order. */
function samplesOf(...groups: [l: number, a: number, b: number, count: number][]): Float32Array {
	return new Float32Array(
		groups.flatMap(([l, a, b, count]) => Array.from({ length: count }, () => [l, a, b]).flat())
	);
}

describe("clusterColors", () => {
	it("finds planted clusters, largest first", () => {
		const threeGroups = samplesOf([0.2, 0.1, 0, 50], [0.9, -0.1, 0.05, 300], [0.5, 0, -0.2, 120]);
		const clusters = clusterColors(threeGroups, 3);
		expect(clusters.map((cluster) => cluster.size)).toEqual([300, 120, 50]);
		expect(clusters[0]?.centre.l).toBeCloseTo(0.9, 5);
		expect(clusters[2]?.centre.a).toBeCloseTo(0.1, 5);
	});

	it("gives the same result for the same seed", () => {
		const noisy = new Float32Array(
			Array.from({ length: 3000 }, (_, i) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1)
		);
		expect(clusterColors(noisy, 6, 7)).toEqual(clusterColors(noisy, 6, 7));
	});

	it("returns fewer clusters than asked when there are fewer colors", () => {
		const twoColors = samplesOf([0.1, 0, 0, 10], [0.8, 0, 0, 10]);
		expect(clusterColors(twoColors, 5)).toHaveLength(2);
	});

	it("returns nothing for no samples", () => {
		expect(clusterColors(new Float32Array(0), 4)).toEqual([]);
	});
});
