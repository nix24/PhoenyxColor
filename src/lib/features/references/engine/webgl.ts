/** Attribute slot for `a_corner`, bound before linking so every program shares the quad. */
export const CORNER_ATTRIBUTE = 0;

export interface ShaderProgram {
	handle: WebGLProgram;
	uniform(name: string): WebGLUniformLocation | null;
}

function compileShader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) throw new Error("WebGL could not create a shader.");
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`Shader failed to compile: ${log}`);
	}
	return shader;
}

export function createProgram(
	gl: WebGL2RenderingContext,
	vertexSource: string,
	fragmentSource: string
): ShaderProgram {
	const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
	const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
	const handle = gl.createProgram();
	gl.attachShader(handle, vertex);
	gl.attachShader(handle, fragment);
	gl.bindAttribLocation(handle, CORNER_ATTRIBUTE, "a_corner");
	gl.linkProgram(handle);
	gl.deleteShader(vertex);
	gl.deleteShader(fragment);
	if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) {
		const log = gl.getProgramInfoLog(handle);
		gl.deleteProgram(handle);
		throw new Error(`Shader program failed to link: ${log}`);
	}
	const locations = new Map<string, WebGLUniformLocation | null>();
	return {
		handle,
		uniform(name) {
			if (!locations.has(name)) locations.set(name, gl.getUniformLocation(handle, name));
			return locations.get(name) ?? null;
		},
	};
}

/** A texture the engine renders into. Row 0 holds the image's top row. */
export interface RenderTarget {
	texture: WebGLTexture;
	framebuffer: WebGLFramebuffer;
	width: number;
	height: number;
}

export type TargetFormat = "rgba16f" | "rgba8";

export function createRenderTarget(
	gl: WebGL2RenderingContext,
	width: number,
	height: number,
	format: TargetFormat
): RenderTarget {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	if (format === "rgba16f") {
		gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
	} else {
		gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
	}
	// Passes read texel centres of a same-size target, so nearest sampling is exact.
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	const framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	if (status !== gl.FRAMEBUFFER_COMPLETE) {
		gl.deleteFramebuffer(framebuffer);
		gl.deleteTexture(texture);
		throw new Error(`Render target ${width}×${height} (${format}) is incomplete: ${status}.`);
	}
	return { texture, framebuffer, width, height };
}

export function deleteRenderTarget(gl: WebGL2RenderingContext, target: RenderTarget): void {
	gl.deleteFramebuffer(target.framebuffer);
	gl.deleteTexture(target.texture);
}
