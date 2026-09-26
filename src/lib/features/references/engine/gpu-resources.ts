import adjustFragment from "./shaders/adjust.frag?raw";
import blendModes from "./shaders/blend-modes.glsl?raw";
import blurFragment from "./shaders/blur.frag?raw";
import clarityFragment from "./shaders/clarity.frag?raw";
import compositeFragment from "./shaders/composite.frag?raw";
import effectsFragment from "./shaders/effects.frag?raw";
import finishFragment from "./shaders/finish.frag?raw";
import fullscreenVertex from "./shaders/fullscreen.vert?raw";
import geometryFragment from "./shaders/geometry.frag?raw";
import geometryVertex from "./shaders/geometry.vert?raw";
import gradientMapFragment from "./shaders/gradient-map.frag?raw";
import presentFragment from "./shaders/present.frag?raw";
import { CORNER_ATTRIBUTE, createProgram, type ShaderProgram, type TargetFormat } from "./webgl";

type ProgramName =
	| "geometry"
	| "adjust"
	| "blur"
	| "clarity"
	| "effects"
	| "gradientMap"
	| "composite"
	| "finish"
	| "present";

/** Everything the engine needs from one WebGL context; rebuilt after a context loss. */
export interface GpuResources {
	programs: Record<ProgramName, ShaderProgram>;
	quad: WebGLVertexArrayObject;
	/** 256×1 lookup tables. */
	curves: WebGLTexture;
	gradient: WebGLTexture;
	/** 1×1 transparent: the stroke overlay when there are no strokes. */
	transparent: WebGLTexture;
	/** `RGBA16F` when the GPU can render to it; otherwise `RGBA8` (visible banding in darks). */
	workFormat: TargetFormat;
	/** The largest texture and render size this GPU allows, in pixels per side. */
	maxSize: number;
}

/** GLSL has no includes; shaders that need the blend modes carry this line instead. */
function withBlendModes(source: string): string {
	return source.replace("#include blend-modes", blendModes);
}

function createQuad(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]),
		gl.STATIC_DRAW
	);
	gl.enableVertexAttribArray(CORNER_ATTRIBUTE);
	gl.vertexAttribPointer(CORNER_ATTRIBUTE, 2, gl.FLOAT, false, 0, 0);
	gl.bindVertexArray(null);
	return vao;
}

function createLutTexture(gl: WebGL2RenderingContext): WebGLTexture {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, 256, 1);
	// Linear filtering interpolates between the 256 levels for 16-bit inputs.
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	return texture;
}

export function createGpuResources(gl: WebGL2RenderingContext): GpuResources {
	const fullscreen = (fragment: string) => createProgram(gl, fullscreenVertex, fragment);
	const transparent = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, transparent);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	const viewport: Int32Array = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
	return {
		programs: {
			geometry: createProgram(gl, geometryVertex, geometryFragment),
			adjust: fullscreen(adjustFragment),
			blur: fullscreen(blurFragment),
			clarity: fullscreen(clarityFragment),
			effects: fullscreen(effectsFragment),
			gradientMap: fullscreen(withBlendModes(gradientMapFragment)),
			composite: fullscreen(withBlendModes(compositeFragment)),
			finish: fullscreen(withBlendModes(finishFragment)),
			present: fullscreen(presentFragment),
		},
		quad: createQuad(gl),
		curves: createLutTexture(gl),
		gradient: createLutTexture(gl),
		transparent,
		workFormat: gl.getExtension("EXT_color_buffer_float") ? "rgba16f" : "rgba8",
		maxSize: Math.min(
			gl.getParameter(gl.MAX_TEXTURE_SIZE),
			gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
			viewport[0] ?? 0,
			viewport[1] ?? 0
		),
	};
}

export function deleteGpuResources(gl: WebGL2RenderingContext, gpu: GpuResources): void {
	for (const program of Object.values(gpu.programs)) gl.deleteProgram(program.handle);
	for (const texture of [gpu.curves, gpu.gradient, gpu.transparent]) gl.deleteTexture(texture);
	gl.deleteVertexArray(gpu.quad);
}
