#version 300 es

in vec2 a_corner; // unit square corners, -0.5..0.5

out vec2 v_uv;

void main() {
	gl_Position = vec4(a_corner * 2.0, 0.0, 1.0);
	v_uv = a_corner + 0.5;
}
