#version 300 es
// Draws a source-space quad (the crop, a layer, the stroke overlay) rotated/flipped/scaled into
// the output, so geometry costs nothing per pixel and everything moves with the photo.

in vec2 a_corner; // unit square corners, -0.5..0.5

uniform vec2 u_quadCentre; // source pixels, relative to the crop centre
uniform vec2 u_quadSize; // source pixels
uniform vec4 u_uvRect; // xy: top-left, zw: size, in the texture's UV (row 0 = top)
uniform mat2 u_sourceToOutput; // crop-centred source px -> output-centred px, y down
uniform vec2 u_outputSize; // output pixels

out vec2 v_uv;

void main() {
	vec2 outputPx = u_sourceToOutput * (u_quadCentre + a_corner * u_quadSize);
	// Row 0 of every target holds the image's top row, so +y (down) maps to +clip y.
	gl_Position = vec4(outputPx / (u_outputSize * 0.5), 0.0, 1.0);
	v_uv = u_uvRect.xy + (a_corner + 0.5) * u_uvRect.zw;
}
