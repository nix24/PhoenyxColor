#version 300 es
precision highp float;

// Blends a layer (already placed in output space) over the image.
uniform sampler2D u_image;
uniform sampler2D u_layer;
uniform int u_blendMode;
uniform float u_opacity;

out vec4 outColor;

#include blend-modes

void main() {
	ivec2 pixel = ivec2(gl_FragCoord.xy);
	vec4 backdrop = texelFetch(u_image, pixel, 0);
	vec4 layer = texelFetch(u_layer, pixel, 0);
	vec4 result = composite(
		vec4(linearToSrgb(backdrop.rgb), backdrop.a),
		vec4(linearToSrgb(layer.rgb), layer.a * u_opacity),
		u_blendMode
	);
	outColor = vec4(srgbToLinear(result.rgb), result.a);
}
