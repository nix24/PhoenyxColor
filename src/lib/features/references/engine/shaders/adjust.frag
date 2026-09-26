#version 300 es
precision highp float;

// Per-pixel adjustments in one pass, in the plan's order: white balance, tone, color, curves.
// Works in linear light; sepia, invert and curves use encoded sRGB levels, as CSS and v1 did.
uniform sampler2D u_image;
uniform sampler2D u_curves; // 256x1: channel curve then master curve, encoded levels
uniform bool u_hasCurves;
uniform vec3 u_whiteBalance; // per-channel gain
uniform float u_gain; // brightness
uniform float u_contrast; // exponent around mid grey; 1 = unchanged
uniform vec2 u_shadowsHighlights; // -1..1 each
uniform float u_saturation; // 1 = unchanged
uniform float u_vibrance; // -1..1
uniform mat3 u_hueRotation;
uniform float u_grayscale; // 0 or 1
uniform float u_sepia; // 0..1
uniform float u_invert; // 0..1

in vec2 v_uv;
out vec4 outColor;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const float MID_GREY = 0.18;
// CSS sepia() matrix, column-major.
const mat3 SEPIA = mat3(0.393, 0.349, 0.272, 0.769, 0.686, 0.534, 0.189, 0.168, 0.131);

vec3 linearToSrgb(vec3 linear) {
	vec3 clamped = clamp(linear, 0.0, 1.0);
	return mix(
		clamped * 12.92,
		1.055 * pow(clamped, vec3(1.0 / 2.4)) - 0.055,
		step(vec3(0.0031308), clamped)
	);
}

vec3 srgbToLinear(vec3 srgb) {
	return mix(srgb / 12.92, pow((srgb + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), srgb));
}

float curve(vec3 level, int channel) {
	return texture(u_curves, vec2((level[channel] * 255.0 + 0.5) / 256.0, 0.5))[channel];
}

void main() {
	vec4 color = texture(u_image, v_uv);
	vec3 rgb = max(color.rgb, 0.0) * u_whiteBalance * u_gain;

	rgb = MID_GREY * pow(max(rgb, 1e-6) / MID_GREY, vec3(u_contrast));

	// Shadows lift or deepen the darker half, highlights the brighter half (perceptual lightness).
	float luma = dot(rgb, LUMA);
	float lightness = pow(max(luma, 0.0), 1.0 / 2.2);
	float shadowWeight = max(0.0, 1.0 - 2.0 * lightness);
	float highlightWeight = max(0.0, 2.0 * lightness - 1.0);
	float adjusted = max(
		0.0,
		lightness + 0.2 * (shadowWeight * u_shadowsHighlights.x + highlightWeight * u_shadowsHighlights.y)
	);
	if (luma > 1e-5) rgb *= pow(adjusted / lightness, 2.2);

	// Vibrance boosts muted colors more than saturated ones.
	float brightest = max(rgb.r, max(rgb.g, rgb.b));
	float saturation = brightest > 0.0 ? (brightest - min(rgb.r, min(rgb.g, rgb.b))) / brightest : 0.0;
	float chroma = u_saturation * (1.0 + u_vibrance * (1.0 - saturation) * 0.5);
	luma = dot(rgb, LUMA);
	rgb = max(vec3(luma) + (rgb - luma) * chroma, 0.0);
	rgb = max(u_hueRotation * rgb, 0.0);
	rgb = mix(rgb, vec3(dot(rgb, LUMA)), u_grayscale);

	if (u_sepia > 0.0 || u_invert > 0.0 || u_hasCurves) {
		vec3 level = linearToSrgb(rgb);
		level = mix(level, clamp(SEPIA * level, 0.0, 1.0), u_sepia);
		level = mix(level, 1.0 - level, u_invert);
		if (u_hasCurves) level = vec3(curve(level, 0), curve(level, 1), curve(level, 2));
		rgb = srgbToLinear(level);
	}
	outColor = vec4(rgb, color.a);
}
