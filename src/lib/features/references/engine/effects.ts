import { cssToSrgb, type SrgbChannels } from "$lib/core/color";
import type { EditRecipe } from "../domain";

type Effect = EditRecipe["effects"][number];

/** Shader effect numbers: the index here is `u_effect` in `effects.frag`. */
const EFFECT_TYPES = [
	"posterize",
	"pixelate",
	"solarize",
	"duotone",
	"halftone",
	"vhs",
	"glitch",
	"emboss",
	"sharpen",
] as const satisfies readonly Effect["type"][];

export interface EffectUniforms {
	effect: number;
	intensity: number;
	seed: number;
	duotoneDark: SrgbChannels;
	duotoneLight: SrgbChannels;
}

function srgbOf(hex: string): SrgbChannels {
	const channels = cssToSrgb(hex);
	// The recipe schema only admits `#rrggbb`, so an unreadable color is a bug, not bad input.
	if (!channels) throw new Error(`Recipe color "${hex}" is not a color.`);
	return channels;
}

export function effectUniforms(effect: Effect): EffectUniforms {
	const [dark, light] = effect.type === "duotone" ? effect.colors : ["#000000", "#ffffff"];
	return {
		effect: EFFECT_TYPES.indexOf(effect.type),
		intensity: effect.intensity / 100,
		seed: effect.seed,
		duotoneDark: srgbOf(dark),
		duotoneLight: srgbOf(light),
	};
}
