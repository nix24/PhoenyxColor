import type { EditRecipe } from "../domain";

/**
 * Draws the strokes onto a transparent `width`×`height` canvas the way v1 did (round caps and
 * joins; a single point is a dot). Stroke coordinates are source pixels; `scale` maps them onto
 * the canvas when it is smaller than the source. The engine does this once per change.
 */
export function rasterizeStrokes(
	strokes: EditRecipe["strokes"],
	width: number,
	height: number,
	scale: number
): OffscreenCanvas {
	const canvas = new OffscreenCanvas(width, height);
	const context = canvas.getContext("2d");
	if (!context) throw new Error("A 2D canvas is not available in this browser.");
	context.scale(scale, scale);
	context.lineCap = "round";
	context.lineJoin = "round";
	for (const stroke of strokes) {
		const [first, ...rest] = stroke.points;
		if (!first) continue;
		context.strokeStyle = stroke.color;
		context.fillStyle = stroke.color;
		context.lineWidth = stroke.size;
		context.beginPath();
		if (rest.length === 0) {
			context.arc(first.x, first.y, stroke.size / 2, 0, Math.PI * 2);
			context.fill();
			continue;
		}
		context.moveTo(first.x, first.y);
		for (const point of rest) context.lineTo(point.x, point.y);
		context.stroke();
	}
	return canvas;
}
