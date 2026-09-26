#version 300 es
precision highp float;

// Local contrast: push each pixel's lightness away from (or toward) its blurred surroundings,
// strongest in the midtones so clipped blacks and whites do not halo.
uniform sampler2D u_image;
uniform sampler2D u_blurred;
uniform float u_amount; // -1..1

out vec4 outColor;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

void main() {
	ivec2 pixel = ivec2(gl_FragCoord.xy);
	vec4 color = texelFetch(u_image, pixel, 0);
	float luma = dot(color.rgb, LUMA);
	float lightness = pow(max(luma, 0.0), 1.0 / 2.2);
	float surrounding = pow(max(dot(texelFetch(u_blurred, pixel, 0).rgb, LUMA), 0.0), 1.0 / 2.2);
	float midtones = 1.0 - pow(clamp(2.0 * lightness - 1.0, -1.0, 1.0), 2.0);
	float adjusted = max(0.0, lightness + u_amount * midtones * (lightness - surrounding));
	vec3 rgb = luma > 1e-5 ? color.rgb * pow(adjusted / lightness, 2.2) : color.rgb;
	outColor = vec4(rgb, color.a);
}
