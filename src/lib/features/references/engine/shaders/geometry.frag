#version 300 es
precision highp float;

// SRGB8_ALPHA8 texture: sampling returns linear light, filtered correctly.
uniform sampler2D u_source;

in vec2 v_uv;
out vec4 outColor;

void main() {
	outColor = texture(u_source, v_uv);
}
