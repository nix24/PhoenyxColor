import type { BlobId } from "$lib/core/storage";
import { BLEND_MODE_VALUES } from "$lib/types/image-editor";
import type { EditRecipe } from "../domain";
import { adjustUniforms } from "./adjustments";
import { curvesLut, isIdentityCurves } from "./curves";
import { effectUniforms } from "./effects";
import { layerRect, outputGeometry, sourceToOutputMatrix, type CropRect } from "./geometry";
import { createGpuResources, deleteGpuResources, type GpuResources } from "./gpu-resources";
import { gradientMapLut } from "./gradient-map";
import { rasterizeStrokes } from "./strokes";
import {
	createRenderTarget,
	deleteRenderTarget,
	type RenderTarget,
	type ShaderProgram,
	type TargetFormat,
} from "./webgl";

/**
 * An uploaded image. `width`/`height` are the image's own size; the texture may be smaller when
 * the image exceeds the GPU's texture limit.
 */
interface ImageTexture {
	texture: WebGLTexture;
	width: number;
	height: number;
	isDownscaled: boolean;
}

/** An uploaded blob, kept so it can be uploaded again after a context loss. */
interface UploadedBlob {
	blob: Blob;
	image: ImageTexture;
}

export interface RenderResult {
	width: number;
	height: number;
	/** The output was capped below the requested size by the GPU's limits. */
	isReduced: boolean;
}

/** A texture a pass reads, by its sampler uniform name. */
type PassInput = [sampler: string, texture: WebGLTexture];

type WorkTargets = [RenderTarget, RenderTarget, RenderTarget];

/** Clarity's surround, as a fraction of the longer output side, so preview and export agree. */
const CLARITY_RADIUS = 0.008;

/**
 * Renders an edit recipe with WebGL2. One `render` path serves the preview and the export, so
 * they match by construction: the preview is `render` at a smaller `outputScale`, then `present`.
 *
 * Pipeline: geometry (crop/rotate/flip/scale, sampling the sRGB source as linear light) →
 * adjust (white balance, tone, color, curves) → blur → clarity → effects → gradient map →
 * layers → finish (vignette, opacity, strokes on top, linear → sRGB into the 8-bit output).
 *
 * If the browser drops the WebGL context, `render` throws until it is restored; the engine then
 * re-uploads its images and calls `onContextRestored` so the caller can render again.
 */
export class RenderEngine {
	readonly #canvas: HTMLCanvasElement;
	readonly #gl: WebGL2RenderingContext;
	readonly #onContextRestored: () => void;
	#gpu: GpuResources;
	#isContextLost = false;
	#source: UploadedBlob | null = null;
	readonly #layerImages = new Map<BlobId, UploadedBlob>();
	/** The rasterized strokes and the strokes they were drawn from. */
	#strokes: { drawn: EditRecipe["strokes"]; image: ImageTexture } | null = null;
	#work: WorkTargets | null = null;
	#layer: RenderTarget | null = null;
	#output: RenderTarget | null = null;

	/** `canvas` is where `present` shows the preview; export never touches it. */
	constructor(canvas: HTMLCanvasElement, onContextRestored: () => void = () => undefined) {
		this.#canvas = canvas;
		this.#onContextRestored = onContextRestored;
		const gl = canvas.getContext("webgl2", {
			alpha: true,
			premultipliedAlpha: false,
			antialias: false,
			depth: false,
			stencil: false,
		});
		if (!gl) throw new Error("WebGL2 is not available in this browser.");
		this.#gl = gl;
		this.#gpu = createGpuResources(gl);
		canvas.addEventListener("webglcontextlost", this.#handleContextLost);
		canvas.addEventListener("webglcontextrestored", this.#handleContextRestored);
	}

	get workFormat(): TargetFormat {
		return this.#gpu.workFormat;
	}

	get isContextLost(): boolean {
		return this.#isContextLost;
	}

	/** True when the source was larger than the GPU allows and was uploaded downscaled. */
	get isSourceDownscaled(): boolean {
		return this.#source?.image.isDownscaled ?? false;
	}

	/** Uploads the original once; every later `render` reuses it. */
	async setSource(image: Blob): Promise<void> {
		const uploaded = await this.#uploadBlob(image, this.#source?.image);
		this.#source = { blob: image, image: uploaded };
		this.#strokes = null;
	}

	/** Uploads a layer's image. Every visible layer's image must be set before `render`. */
	async setLayerImage(blobId: BlobId, image: Blob): Promise<void> {
		const uploaded = await this.#uploadBlob(image, this.#layerImages.get(blobId)?.image);
		this.#layerImages.set(blobId, { blob: image, image: uploaded });
	}

	/**
	 * Renders `recipe` into the output target. `outputScale` is the fraction of full resolution:
	 * 1 for export at full size, smaller for a preview that fits the viewport, larger to upscale.
	 */
	render(recipe: EditRecipe, requestedScale = 1): RenderResult {
		if (this.#isContextLost) throw new Error("The WebGL context is lost; wait for it to return.");
		const source = this.#source?.image;
		if (!source) throw new Error("render() called before setSource().");
		const gl = this.#gl;
		const gpu = this.#gpu;
		const geometry = outputGeometry(source.width, source.height, recipe.geometry);
		// ponytail: output larger than one GPU texture is capped, not tiled. Upgrade path: tiles.
		const capScale = gpu.maxSize / Math.max(geometry.width, geometry.height);
		const outputScale = Math.min(requestedScale, capScale);
		const width = Math.max(1, Math.round(geometry.width * outputScale));
		const height = Math.max(1, Math.round(geometry.height * outputScale));
		// Output pixels per source pixel: sizes stored in source pixels are multiplied by this.
		const pixelScale = recipe.geometry.scale * outputScale;
		const work = this.#ensureWorkTargets(width, height);
		gl.bindVertexArray(gpu.quad);
		gl.disable(gl.BLEND);

		const { crop } = geometry;
		/** Draws a source-space rectangle of `image` into `target`, placed like the photo. */
		const place = (image: ImageTexture, rect: CropRect, uvRect: CropRect, target: RenderTarget) =>
			this.#pass(gpu.programs.geometry, target, [["u_source", image.texture]], (program) => {
				gl.uniform2f(
					program.uniform("u_quadCentre"),
					rect.x + rect.width / 2 - (crop.x + crop.width / 2),
					rect.y + rect.height / 2 - (crop.y + crop.height / 2)
				);
				gl.uniform2f(program.uniform("u_quadSize"), rect.width, rect.height);
				gl.uniform4f(program.uniform("u_uvRect"), uvRect.x, uvRect.y, uvRect.width, uvRect.height);
				gl.uniformMatrix2fv(
					program.uniform("u_sourceToOutput"),
					false,
					sourceToOutputMatrix(recipe.geometry, outputScale)
				);
				gl.uniform2f(program.uniform("u_outputSize"), width, height);
			});
		const wholeImage = { x: 0, y: 0, width: 1, height: 1 };

		place(
			source,
			crop,
			{
				x: crop.x / source.width,
				y: crop.y / source.height,
				width: crop.width / source.width,
				height: crop.height / source.height,
			},
			work[0]
		);
		let [current, spare, extra] = work;
		const swap = () => {
			[current, spare] = [spare, current];
		};

		const hasCurves = !isIdentityCurves(recipe.curves);
		if (hasCurves) this.#uploadLut(gpu.curves, curvesLut(recipe.curves));
		const adjust = adjustUniforms(recipe);
		this.#pass(
			gpu.programs.adjust,
			spare,
			[
				["u_image", current.texture],
				["u_curves", gpu.curves],
			],
			(program) => {
				gl.uniform1i(program.uniform("u_hasCurves"), hasCurves ? 1 : 0);
				gl.uniform3fv(program.uniform("u_whiteBalance"), adjust.whiteBalance);
				gl.uniform1f(program.uniform("u_gain"), adjust.gain);
				gl.uniform1f(program.uniform("u_contrast"), adjust.contrast);
				gl.uniform2fv(program.uniform("u_shadowsHighlights"), adjust.shadowsHighlights);
				gl.uniform1f(program.uniform("u_saturation"), adjust.saturation);
				gl.uniform1f(program.uniform("u_vibrance"), adjust.vibrance);
				gl.uniformMatrix3fv(program.uniform("u_hueRotation"), false, adjust.hueRotation);
				gl.uniform1f(program.uniform("u_grayscale"), adjust.grayscale);
				gl.uniform1f(program.uniform("u_sepia"), adjust.sepia);
				gl.uniform1f(program.uniform("u_invert"), adjust.invert);
			}
		);
		swap();

		if (recipe.detail.blur > 0) {
			this.#blur(current, spare, current, recipe.detail.blur * pixelScale);
		}
		if (recipe.detail.clarity !== 0) {
			this.#blur(current, spare, extra, CLARITY_RADIUS * Math.max(width, height));
			this.#pass(
				gpu.programs.clarity,
				spare,
				[
					["u_image", current.texture],
					["u_blurred", extra.texture],
				],
				(program) => gl.uniform1f(program.uniform("u_amount"), recipe.detail.clarity / 100)
			);
			swap();
		}

		for (const effect of recipe.effects) {
			const uniforms = effectUniforms(effect);
			this.#pass(gpu.programs.effects, spare, [["u_image", current.texture]], (program) => {
				gl.uniform1i(program.uniform("u_effect"), uniforms.effect);
				gl.uniform1f(program.uniform("u_intensity"), uniforms.intensity);
				gl.uniform1ui(program.uniform("u_seed"), uniforms.seed);
				gl.uniform1f(program.uniform("u_pixelScale"), pixelScale);
				gl.uniform3fv(program.uniform("u_duotoneDark"), uniforms.duotoneDark);
				gl.uniform3fv(program.uniform("u_duotoneLight"), uniforms.duotoneLight);
			});
			swap();
		}

		const { gradientMap } = recipe;
		if (gradientMap && gradientMap.opacity > 0) {
			this.#uploadLut(gpu.gradient, gradientMapLut(gradientMap.stops));
			this.#pass(
				gpu.programs.gradientMap,
				spare,
				[
					["u_image", current.texture],
					["u_gradient", gpu.gradient],
				],
				(program) => {
					gl.uniform1i(
						program.uniform("u_blendMode"),
						BLEND_MODE_VALUES.indexOf(gradientMap.blendMode)
					);
					gl.uniform1f(program.uniform("u_opacity"), gradientMap.opacity);
				}
			);
			swap();
		}

		for (const layer of recipe.layers) {
			if (!layer.isVisible || layer.opacity === 0) continue;
			const image = this.#layerImages.get(layer.blobId)?.image;
			if (!image) throw new Error(`Layer "${layer.name}" has no image; call setLayerImage first.`);
			const layerTarget = this.#layerTarget(width, height);
			place(
				image,
				layerRect(image.width, image.height, source.width, source.height),
				wholeImage,
				layerTarget
			);
			this.#pass(
				gpu.programs.composite,
				spare,
				[
					["u_image", current.texture],
					["u_layer", layerTarget.texture],
				],
				(program) => {
					gl.uniform1i(program.uniform("u_blendMode"), BLEND_MODE_VALUES.indexOf(layer.blendMode));
					gl.uniform1f(program.uniform("u_opacity"), layer.opacity);
				}
			);
			swap();
		}

		let overlay = gpu.transparent;
		if (recipe.strokes.length > 0) {
			const strokes = this.#strokeImage(recipe.strokes, source);
			place(strokes, { x: 0, y: 0, width: source.width, height: source.height }, wholeImage, spare);
			overlay = spare.texture;
		}
		this.#pass(
			gpu.programs.finish,
			this.#outputTarget(width, height),
			[
				["u_image", current.texture],
				["u_overlay", overlay],
			],
			(program) => {
				gl.uniform1f(program.uniform("u_vignette"), recipe.vignette / 100);
				gl.uniform1f(program.uniform("u_opacity"), recipe.opacity);
			}
		);
		return { width, height, isReduced: outputScale < requestedScale };
	}

	/** Shows the last render on the canvas, resizing it to the render size. */
	present(): void {
		const output = this.#requireOutput();
		this.#canvas.width = output.width;
		this.#canvas.height = output.height;
		this.#pass(this.#gpu.programs.present, null, [["u_image", output.texture]]);
	}

	/** The last render as straight-alpha sRGB RGBA, top row first. */
	readPixels(): ImageData {
		const output = this.#requireOutput();
		const gl = this.#gl;
		const pixels = new Uint8ClampedArray(output.width * output.height * 4);
		gl.bindFramebuffer(gl.FRAMEBUFFER, output.framebuffer);
		gl.readPixels(0, 0, output.width, output.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		return new ImageData(pixels, output.width, output.height);
	}

	dispose(): void {
		this.#canvas.removeEventListener("webglcontextlost", this.#handleContextLost);
		this.#canvas.removeEventListener("webglcontextrestored", this.#handleContextRestored);
		if (!this.#isContextLost) this.#deleteContextObjects();
		this.#source = null;
		this.#layerImages.clear();
	}

	readonly #handleContextLost = (event: Event): void => {
		// Without preventDefault the browser never restores the context.
		event.preventDefault();
		this.#isContextLost = true;
		// Every GL object died with the context; drop the handles without deleting them.
		this.#strokes = null;
		this.#work = null;
		this.#layer = null;
		this.#output = null;
	};

	readonly #handleContextRestored = (): void => {
		void this.#restore().catch((cause: unknown) => {
			console.error("Could not restore the WebGL context:", cause);
		});
	};

	async #restore(): Promise<void> {
		this.#gpu = createGpuResources(this.#gl);
		if (this.#source) {
			this.#source.image = await this.#uploadBlob(this.#source.blob, null);
		}
		for (const layer of this.#layerImages.values()) {
			layer.image = await this.#uploadBlob(layer.blob, null);
		}
		this.#isContextLost = false;
		this.#onContextRestored();
	}

	#deleteContextObjects(): void {
		const gl = this.#gl;
		const images = [this.#source?.image, this.#strokes?.image];
		for (const layer of this.#layerImages.values()) images.push(layer.image);
		for (const image of images) if (image) gl.deleteTexture(image.texture);
		for (const target of [...(this.#work ?? []), this.#layer, this.#output]) {
			if (target) deleteRenderTarget(gl, target);
		}
		deleteGpuResources(gl, this.#gpu);
		this.#strokes = null;
		this.#work = null;
		this.#layer = null;
		this.#output = null;
	}

	/** Draws the quad with `program` into `output` (null: the canvas). */
	#pass(
		program: ShaderProgram,
		output: RenderTarget | null,
		inputs: PassInput[],
		setUniforms?: (program: ShaderProgram) => void
	): void {
		const gl = this.#gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, output?.framebuffer ?? null);
		gl.viewport(0, 0, output?.width ?? this.#canvas.width, output?.height ?? this.#canvas.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(program.handle);
		inputs.forEach(([sampler, texture], unit) => {
			gl.activeTexture(gl.TEXTURE0 + unit);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.uniform1i(program.uniform(sampler), unit);
		});
		setUniforms?.(program);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	/** Separable Gaussian: `input` → `scratch` horizontally, then → `output` vertically. */
	#blur(input: RenderTarget, scratch: RenderTarget, output: RenderTarget, sigma: number): void {
		const gl = this.#gl;
		const passes: [RenderTarget, RenderTarget, [number, number]][] = [
			[input, scratch, [1, 0]],
			[scratch, output, [0, 1]],
		];
		for (const [from, to, direction] of passes) {
			this.#pass(this.#gpu.programs.blur, to, [["u_image", from.texture]], (program) => {
				gl.uniform2i(program.uniform("u_direction"), direction[0], direction[1]);
				gl.uniform1f(program.uniform("u_sigma"), sigma);
			});
		}
	}

	/** Re-rasterizes the strokes only when they changed since the last render. */
	#strokeImage(strokes: EditRecipe["strokes"], source: ImageTexture): ImageTexture {
		const cached = this.#strokes;
		if (cached && JSON.stringify(cached.drawn) === JSON.stringify(strokes)) return cached.image;
		// The overlay only needs the texture's resolution; strokes are scaled into it.
		const scale = this.#textureScale(source.width, source.height);
		const width = Math.max(1, Math.round(source.width * scale));
		const height = Math.max(1, Math.round(source.height * scale));
		const canvas = rasterizeStrokes(strokes, width, height, scale);
		const image = this.#upload(canvas, width, height, cached?.image);
		this.#strokes = {
			drawn: structuredClone(strokes),
			image: { ...image, width: source.width, height: source.height },
		};
		return this.#strokes.image;
	}

	/** 1, or the factor that fits an image of this size into one GPU texture. */
	#textureScale(width: number, height: number): number {
		return Math.min(1, this.#gpu.maxSize / Math.max(width, height));
	}

	async #uploadBlob(blob: Blob, replacing: ImageTexture | null | undefined): Promise<ImageTexture> {
		// Same orientation rule as `describeImage`, so the measured size matches the texture.
		const options: ImageBitmapOptions = {
			imageOrientation: "from-image",
			premultiplyAlpha: "none",
		};
		const full = await createImageBitmap(blob, options);
		const scale = this.#textureScale(full.width, full.height);
		if (scale === 1) {
			try {
				return this.#upload(full, full.width, full.height, replacing);
			} finally {
				full.close();
			}
		}
		// ponytail: an image beyond the texture limit is downscaled, not tiled (see engine notes).
		const { width, height } = full;
		full.close();
		const reduced = await createImageBitmap(blob, {
			...options,
			resizeWidth: Math.max(1, Math.floor(width * scale)),
			resizeHeight: Math.max(1, Math.floor(height * scale)),
			resizeQuality: "high",
		});
		try {
			const image = this.#upload(reduced, reduced.width, reduced.height, replacing);
			return { ...image, width, height, isDownscaled: true };
		} finally {
			reduced.close();
		}
	}

	/** Uploads an 8-bit sRGB image as `SRGB8_ALPHA8`, so sampling it returns linear light. */
	#upload(
		pixels: TexImageSource,
		width: number,
		height: number,
		replacing: ImageTexture | null | undefined
	): ImageTexture {
		const gl = this.#gl;
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		// Mipmaps keep a zoomed-out preview of a large image from aliasing.
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		if (replacing) gl.deleteTexture(replacing.texture);
		return { texture, width, height, isDownscaled: false };
	}

	#uploadLut(texture: WebGLTexture, lut: Uint8Array): void {
		const gl = this.#gl;
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, lut);
	}

	#ensureWorkTargets(width: number, height: number): WorkTargets {
		const work = this.#work;
		if (work && work[0].width === width && work[0].height === height) return work;
		const gl = this.#gl;
		for (const target of work ?? []) deleteRenderTarget(gl, target);
		const create = () => createRenderTarget(gl, width, height, this.#gpu.workFormat);
		const created: WorkTargets = [create(), create(), create()];
		this.#work = created;
		return created;
	}

	/** Where a layer is placed before it is blended; created on first use. */
	#layerTarget(width: number, height: number): RenderTarget {
		const layer = this.#layer;
		if (layer && layer.width === width && layer.height === height) return layer;
		if (layer) deleteRenderTarget(this.#gl, layer);
		const created = createRenderTarget(this.#gl, width, height, this.#gpu.workFormat);
		this.#layer = created;
		return created;
	}

	#outputTarget(width: number, height: number): RenderTarget {
		const output = this.#output;
		if (output && output.width === width && output.height === height) return output;
		if (output) deleteRenderTarget(this.#gl, output);
		const created = createRenderTarget(this.#gl, width, height, "rgba8");
		this.#output = created;
		return created;
	}

	#requireOutput(): RenderTarget {
		if (!this.#output) throw new Error("Nothing has been rendered yet.");
		return this.#output;
	}
}
