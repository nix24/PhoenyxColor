#version 300 es
precision highp float;

// One direction of a separable Gaussian. Weights premultiplied alpha so transparent pixels do
// not bleed their (meaningless) color into their neighbours.
uniform sampler2D u_image;
uniform ivec2 u_direction; // (1, 0) or (0, 1)
uniform float u_sigma; // output pixels

out vec4 outColor;

// ponytail: the kernel stops at 96 px, so a sigma above 32 px blurs less than asked (only
// reachable at very large exports). Upgrade path: blur a downsampled copy.
const int MAX_RADIUS = 96;

void main() {
	ivec2 size = textureSize(u_image, 0);
	ivec2 pixel = ivec2(gl_FragCoord.xy);
	int radius = min(int(ceil(3.0 * u_sigma)), MAX_RADIUS);
	vec4 sum = vec4(0.0);
	float total = 0.0;
	for (int i = -radius; i <= radius; i++) {
		vec4 sample_ = texelFetch(u_image, clamp(pixel + i * u_direction, ivec2(0), size - 1), 0);
		float weight = exp(-float(i * i) / (2.0 * u_sigma * u_sigma));
		sum += vec4(sample_.rgb * sample_.a, sample_.a) * weight;
		total += weight;
	}
	outColor = sum.a > 0.0 ? vec4(sum.rgb / sum.a, sum.a / total) : vec4(0.0);
}
