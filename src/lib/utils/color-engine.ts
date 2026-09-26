import { converter, type Oklab, parse } from "culori";

const toOklab = converter("oklab");

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
