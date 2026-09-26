#version 300 es
precision highp float;

// Maps each pixel's luminance through the gradient, then blends that over the image, like v1's
// gradient-map overlay (same alpha as the image, its own blend mode and opacity).
uniform sampler2D u_image;
uniform sampler2D u_gradient; // 256x1, encoded sRGB, dark to light
uniform int u_blendMode;
uniform float u_opacity;

out vec4 outColor;

#include blend-modes

void main() {
	vec4 color = texelFetch(u_image, ivec2(gl_FragCoord.xy), 0);
	vec3 level = linearToSrgb(color.rgb);
	float luminance = dot(level, vec3(0.2126, 0.7152, 0.0722));
	vec3 mapped = texture(u_gradient, vec2((luminance * 255.0 + 0.5) / 256.0, 0.5)).rgb;
	vec4 result = composite(vec4(level, color.a), vec4(mapped, color.a * u_opacity), u_blendMode);
	outColor = vec4(srgbToLinear(result.rgb), result.a);
}
