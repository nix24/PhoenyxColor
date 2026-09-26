#version 300 es
precision highp float;
precision highp int;

// One stacked effect. Effects work on encoded sRGB levels, as v1 did; sizes are v1's pixel sizes
// times u_pixelScale (output pixels per source pixel), so a preview looks like the export.
uniform sampler2D u_image;
uniform int u_effect; // index into EFFECT_TYPES (effects.ts)
uniform float u_intensity; // 0..1
uniform uint u_seed;
uniform float u_pixelScale;
uniform vec3 u_duotoneDark; // encoded sRGB
uniform vec3 u_duotoneLight;

out vec4 outColor;

const int POSTERIZE = 0;
const int PIXELATE = 1;
const int SOLARIZE = 2;
const int DUOTONE = 3;
const int HALFTONE = 4;
const int VHS = 5;
const int GLITCH = 6;
const int EMBOSS = 7;
const int SHARPEN = 8;

// v1's luminance weights (Rec. 601, on encoded levels).
const vec3 LUMA = vec3(0.299, 0.587, 0.114);
// Block averages take at most 8×8 evenly spread samples, so cost stays flat at any size.
const int BLOCK_SAMPLES = 8;

ivec2 size;

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

vec3 levelAt(ivec2 pixel) {
	return linearToSrgb(texelFetch(u_image, clamp(pixel, ivec2(0), size - 1), 0).rgb);
}

// PCG hash: the same seed gives the same pattern in every render.
uint hash(uint value) {
	uint state = value * 747796405u + 2891336453u;
	uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
	return (word >> 22u) ^ word;
}

float random(uint a, uint b) {
	return float(hash(hash(u_seed ^ a) + b)) / 4294967295.0;
}

vec3 blockAverage(ivec2 origin, int blockSize) {
	int samples = min(blockSize, BLOCK_SAMPLES);
	vec3 sum = vec3(0.0);
	for (int y = 0; y < samples; y++) {
		for (int x = 0; x < samples; x++) {
			sum += levelAt(origin + (ivec2(x, y) * blockSize) / samples);
		}
	}
	return sum / float(samples * samples);
}

vec3 convolve(ivec2 pixel, float kernel[9], float bias) {
	vec3 sum = vec3(0.0);
	for (int i = 0; i < 9; i++) sum += levelAt(pixel + ivec2(i % 3 - 1, i / 3 - 1)) * kernel[i];
	return sum + bias;
}

vec3 applyEffect(ivec2 pixel, vec3 level) {
	float amount = u_intensity;
	if (u_effect == POSTERIZE) {
		float levels = max(2.0, round(10.0 - amount * 8.0));
		return min(floor(level * levels) / levels, 1.0);
	}
	if (u_effect == PIXELATE) {
		int block = max(1, int(round(amount * 20.0 * u_pixelScale)));
		return blockAverage((pixel / block) * block, block);
	}
	if (u_effect == SOLARIZE) {
		return mix(level, 1.0 - level, vec3(greaterThan(level, vec3(1.0 - amount))));
	}
	if (u_effect == DUOTONE) {
		return mix(level, mix(u_duotoneDark, u_duotoneLight, dot(level, LUMA)), amount);
	}
	if (u_effect == HALFTONE) {
		float dotSize = max(2.0, floor(amount * 8.0)) * u_pixelScale;
		int spacing = max(1, int(round(dotSize * 2.0)));
		ivec2 origin = (pixel / spacing) * spacing;
		float radius = (1.0 - dot(blockAverage(origin, spacing), LUMA)) * dotSize;
		vec2 centre = vec2(origin) + float(spacing) * 0.5;
		bool isInk = radius >= 0.5 && distance(vec2(pixel) + 0.5, centre) <= radius;
		return mix(level, vec3(isInk ? 0.0 : 1.0), amount);
	}
	if (u_effect == VHS) {
		int shift = int(round(amount * 5.0 * u_pixelScale));
		vec3 shifted = vec3(
			levelAt(pixel - ivec2(shift, 0)).r,
			level.g,
			levelAt(pixel + ivec2(shift, 0)).b
		);
		int scanSpacing = max(1, int(round(3.0 * u_pixelScale)));
		if (pixel.y % scanSpacing == 0) shifted *= 0.8 + (1.0 - amount) * 0.2;
		float noise = (random(uint(pixel.x), uint(pixel.y)) - 0.5) * amount * 20.0 / 255.0;
		return clamp(shifted + noise, 0.0, 1.0);
	}
	if (u_effect == GLITCH) {
		int shift = int(round(amount * 10.0 * u_pixelScale));
		vec3 result = vec3(
			levelAt(pixel - ivec2(shift, 0)).r,
			level.g,
			levelAt(pixel + ivec2(shift, 0)).b
		);
		// Displaced slices copy the unshifted image, and a later slice wins, as in v1.
		int sliceCount = int(round(amount * 10.0));
		int sliceHeight = max(1, size.y / 20);
		for (int slice = 0; slice < sliceCount; slice++) {
			int top = int(random(uint(slice), 0u) * float(max(1, size.y - sliceHeight)));
			if (pixel.y < top || pixel.y >= top + sliceHeight) continue;
			int offset = int((random(uint(slice), 1u) - 0.5) * amount * 30.0 * u_pixelScale);
			result = levelAt(ivec2(pixel.x + offset, pixel.y));
		}
		return result;
	}
	if (u_effect == EMBOSS) {
		float kernel[9] = float[9](-2.0, -1.0, 0.0, -1.0, 1.0, 1.0, 0.0, 1.0, 2.0);
		return mix(level, clamp(convolve(pixel, kernel, 0.5), 0.0, 1.0), amount);
	}
	// SHARPEN
	float kernel[9] = float[9](0.0, -1.0, 0.0, -1.0, 5.0, -1.0, 0.0, -1.0, 0.0);
	return mix(level, clamp(convolve(pixel, kernel, 0.0), 0.0, 1.0), amount);
}

void main() {
	size = textureSize(u_image, 0);
	ivec2 pixel = ivec2(gl_FragCoord.xy);
	vec4 color = texelFetch(u_image, pixel, 0);
	outColor = vec4(srgbToLinear(applyEffect(pixel, linearToSrgb(color.rgb))), color.a);
}
