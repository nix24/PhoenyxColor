import { cssToOklab, mixOklab, oklabToSrgb, type Oklab } from "$lib/core/color";
import type { EditRecipe } from "../domain";

type GradientStops = NonNullable<EditRecipe["gradientMap"]>["stops"];

/** 256×1 RGBA8 LUT, dark to light, blended between stops in OKLab so steps look even. */
export function gradientMapLut(stops: GradientStops): Uint8Array {
	const sorted = [...stops]
		.sort((a, b) => a.position - b.position)
		.map((stop) => {
			const oklab = cssToOklab(stop.color);
			// The recipe schema only admits `#rrggbb`, so an unreadable color is a bug.
			if (!oklab) throw new Error(`Recipe color "${stop.color}" is not a color.`);
			return { position: stop.position, oklab };
		});
	const lut = new Uint8Array(256 * 4);
	for (let level = 0; level < 256; level++) {
		const t = level / 255;
		const after = sorted.findIndex((stop) => stop.position >= t);
		const to = sorted[after === -1 ? sorted.length - 1 : after];
		const from = sorted[Math.max(0, after === -1 ? sorted.length - 1 : after - 1)];
		if (!from || !to) throw new Error("A gradient map needs at least one stop.");
		const span = to.position - from.position;
		const color: Oklab =
			span > 0 ? mixOklab(from.oklab, to.oklab, (t - from.position) / span) : to.oklab;
		oklabToSrgb(color).forEach((channel, c) => {
			lut[level * 4 + c] = Math.round(channel * 255);
		});
		lut[level * 4 + 3] = 255;
	}
	return lut;
}
