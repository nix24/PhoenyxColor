#version 300 es
precision highp float;

// Copies the encoded output to the canvas, which stores its top row last.
uniform sampler2D u_image;

in vec2 v_uv;
out vec4 outColor;

void main() {
	outColor = texture(u_image, vec2(v_uv.x, 1.0 - v_uv.y));
}
