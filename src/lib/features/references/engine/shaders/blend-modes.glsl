// The 16 W3C Compositing Level 1 blend modes on encoded sRGB, as CSS mix-blend-mode applies them.
// Spliced into shaders that `#include blend-modes` (see engine.ts). Mode numbers follow
// BLEND_MODE_VALUES in types/image-editor.ts.

float lum(vec3 c) {
	return dot(c, vec3(0.3, 0.59, 0.11));
}

vec3 clipColor(vec3 c) {
	float l = lum(c);
	float low = min(c.r, min(c.g, c.b));
	float high = max(c.r, max(c.g, c.b));
	if (low < 0.0) c = l + (c - l) * l / (l - low);
	if (high > 1.0) c = l + (c - l) * (1.0 - l) / (high - l);
	return c;
}

vec3 setLum(vec3 c, float l) {
	return clipColor(c + (l - lum(c)));
}

float sat(vec3 c) {
	return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
}

vec3 setSat(vec3 c, float s) {
	float low = min(c.r, min(c.g, c.b));
	float range = sat(c);
	return range > 0.0 ? (c - low) * s / range : vec3(0.0);
}

vec3 hardLight(vec3 backdrop, vec3 source) {
	return mix(
		backdrop * 2.0 * source,
		backdrop + (2.0 * source - 1.0) - backdrop * (2.0 * source - 1.0),
		step(0.5, source)
	);
}

vec3 softLight(vec3 backdrop, vec3 source) {
	vec3 d = mix(sqrt(backdrop), ((16.0 * backdrop - 12.0) * backdrop + 4.0) * backdrop, step(backdrop, vec3(0.25)));
	return mix(
		backdrop - (1.0 - 2.0 * source) * backdrop * (1.0 - backdrop),
		backdrop + (2.0 * source - 1.0) * (d - backdrop),
		step(0.5, source)
	);
}

float colorDodge(float backdrop, float source) {
	if (backdrop == 0.0) return 0.0;
	if (source >= 1.0) return 1.0;
	return min(1.0, backdrop / (1.0 - source));
}

float colorBurn(float backdrop, float source) {
	if (backdrop >= 1.0) return 1.0;
	if (source <= 0.0) return 0.0;
	return 1.0 - min(1.0, (1.0 - backdrop) / source);
}

vec3 blend(int mode, vec3 backdrop, vec3 source) {
	if (mode == 1) return backdrop * source; // multiply
	if (mode == 2) return backdrop + source - backdrop * source; // screen
	if (mode == 3) return hardLight(source, backdrop); // overlay
	if (mode == 4) return min(backdrop, source); // darken
	if (mode == 5) return max(backdrop, source); // lighten
	if (mode == 6) {
		return vec3(colorDodge(backdrop.r, source.r), colorDodge(backdrop.g, source.g), colorDodge(backdrop.b, source.b));
	}
	if (mode == 7) {
		return vec3(colorBurn(backdrop.r, source.r), colorBurn(backdrop.g, source.g), colorBurn(backdrop.b, source.b));
	}
	if (mode == 8) return hardLight(backdrop, source); // hard-light
	if (mode == 9) return softLight(backdrop, source); // soft-light
	if (mode == 10) return abs(backdrop - source); // difference
	if (mode == 11) return backdrop + source - 2.0 * backdrop * source; // exclusion
	if (mode == 12) return setLum(setSat(source, sat(backdrop)), lum(backdrop)); // hue
	if (mode == 13) return setLum(setSat(backdrop, sat(source)), lum(backdrop)); // saturation
	if (mode == 14) return setLum(source, lum(backdrop)); // color
	if (mode == 15) return setLum(backdrop, lum(source)); // luminosity
	return source; // normal
}

// Source-over with a blend mode, straight alpha in and out (W3C compositing formula).
vec4 composite(vec4 backdrop, vec4 source, int mode) {
	vec3 mixed = (1.0 - backdrop.a) * source.rgb + backdrop.a * clamp(blend(mode, backdrop.rgb, source.rgb), 0.0, 1.0);
	float alpha = source.a + backdrop.a * (1.0 - source.a);
	if (alpha <= 0.0) return vec4(0.0);
	return vec4((source.a * mixed + (1.0 - source.a) * backdrop.a * backdrop.rgb) / alpha, alpha);
}

vec3 linearToSrgb(vec3 linear) {
	vec3 clamped = clamp(linear, 0.0, 1.0);
	return mix(clamped * 12.92, 1.055 * pow(clamped, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), clamped));
}

vec3 srgbToLinear(vec3 srgb) {
	return mix(srgb / 12.92, pow((srgb + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), srgb));
}
