#version 300 es
precision highp float;

// Output-space finishing: vignette and opacity, then the stroke overlay on top (v1 drew strokes
// last), then linear -> sRGB into the 8-bit output.
uniform sampler2D u_image;
uniform sampler2D u_overlay; // strokes placed in output space; transparent when there are none
uniform float u_vignette; // 0..1
uniform float u_opacity; // 0..1

in vec2 v_uv;
out vec4 outColor;

#include blend-modes

void main() {
	vec4 color = texture(u_image, v_uv);
	// v1's vignette: clear to 55% of the half-size radius, then a linear ramp to full strength.
	vec2 size = vec2(textureSize(u_image, 0));
	float radius = length((v_uv - 0.5) * size) / (max(size.x, size.y) * 0.5);
	float falloff = clamp((radius - 0.55) / 0.45, 0.0, 1.0);
	vec4 image = vec4(linearToSrgb(color.rgb * (1.0 - u_vignette * falloff)), clamp(color.a * u_opacity, 0.0, 1.0));
	vec4 overlay = texture(u_overlay, v_uv);
	outColor = composite(image, vec4(linearToSrgb(overlay.rgb), overlay.a), 0);
}
