import type { ImageEditorState, AppliedEffect } from "$lib/components/editor/EditorHistory.svelte";
import { applyAllAdjustments, applyCurves } from "$lib/utils/image-processing";
import { applyEffect, type EffectType } from "$lib/utils/effects-processing";

function applyEditorTransform(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	state: ImageEditorState,
	sourceScale: number,
): void {
	ctx.translate(width / 2, height / 2);
	ctx.scale(state.flipX ? -sourceScale : sourceScale, state.flipY ? -sourceScale : sourceScale);
	ctx.rotate((state.rotation * Math.PI) / 180);
}

export interface OutputGeometryInput {
	sourceWidth: number;
	sourceHeight: number;
	rotation: number;
	cropRect: ImageEditorState["cropRect"];
	scale?: number;
}

export interface OutputGeometry {
	sourceX: number;
	sourceY: number;
	sourceWidth: number;
	sourceHeight: number;
	outputWidth: number;
	outputHeight: number;
}

export function getOutputGeometry({
	sourceWidth,
	sourceHeight,
	rotation,
	cropRect,
	scale = 1,
}: OutputGeometryInput): OutputGeometry {
	const sourceX = Math.max(0, Math.min(cropRect?.x ?? 0, sourceWidth - 1));
	const sourceY = Math.max(0, Math.min(cropRect?.y ?? 0, sourceHeight - 1));
	const croppedWidth = Math.max(1, Math.min(cropRect?.width ?? sourceWidth, sourceWidth - sourceX));
	const croppedHeight = Math.max(
		1,
		Math.min(cropRect?.height ?? sourceHeight, sourceHeight - sourceY),
	);
	const radians = (rotation * Math.PI) / 180;
	const rawCos = Math.cos(radians);
	const rawSin = Math.sin(radians);
	const cos = Math.abs(rawCos) < 1e-10 ? 0 : Math.abs(rawCos);
	const sin = Math.abs(rawSin) < 1e-10 ? 0 : Math.abs(rawSin);
	const safeScale = Math.max(0.1, scale);

	return {
		sourceX,
		sourceY,
		sourceWidth: croppedWidth,
		sourceHeight: croppedHeight,
		outputWidth: Math.max(1, Math.ceil((croppedWidth * cos + croppedHeight * sin) * safeScale)),
		outputHeight: Math.max(1, Math.ceil((croppedWidth * sin + croppedHeight * cos) * safeScale)),
	};
}

/**
 * Load an image from a source URL
 */
export async function loadImage(src: string): Promise<HTMLImageElement> {
	const img = new Image();
	img.crossOrigin = "anonymous";
	return new Promise((resolve, reject) => {
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

/**
 * Render the image with all effects applied to a canvas
 */
export async function renderCanvasImage(
	canvas: HTMLCanvasElement,
	image: HTMLImageElement,
	state: ImageEditorState,
	options: {
		previewEffect?:
			| {
					type: EffectType;
					intensity: number;
					duotoneColors?: [string, string] | undefined;
			  }
			| undefined;
		maxSize?: number;
	} = {},
): Promise<void> {
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error("Could not get canvas context");

	const geometry = getOutputGeometry({
		sourceWidth: image.naturalWidth,
		sourceHeight: image.naturalHeight,
		rotation: state.rotation,
		cropRect: state.cropRect,
		scale: state.scale,
	});
	const outputScale = options.maxSize
		? Math.min(1, options.maxSize / geometry.outputWidth, options.maxSize / geometry.outputHeight)
		: 1;
	const width = Math.max(1, Math.round(geometry.outputWidth * outputScale));
	const height = Math.max(1, Math.round(geometry.outputHeight * outputScale));
	const sourceScale = outputScale * Math.max(0.1, state.scale);

	canvas.width = width;
	canvas.height = height;

	// Apply basic CSS-achievable filters first (using ctx.filter)
	const basicFilters: string[] = [];
	if (state.isGrayscale) basicFilters.push("grayscale(100%)");
	if (state.sepia) basicFilters.push(`sepia(${state.sepia}%)`);
	if (state.invert) basicFilters.push(`invert(${state.invert}%)`);
	if (state.brightness !== 100) basicFilters.push(`brightness(${state.brightness}%)`);
	if (state.contrast !== 100) basicFilters.push(`contrast(${state.contrast}%)`);
	if (state.saturation !== 100) basicFilters.push(`saturate(${state.saturation}%)`);
	if (state.hueRotate !== 0) basicFilters.push(`hue-rotate(${state.hueRotate}deg)`);
	if (state.blur !== 0) basicFilters.push(`blur(${state.blur}px)`);

	if (basicFilters.length > 0) {
		ctx.filter = basicFilters.join(" ");
	}

	// Apply transforms
	ctx.save();
	applyEditorTransform(ctx, width, height, state, sourceScale);
	ctx.globalAlpha = state.opacity;
	ctx.drawImage(
		image,
		geometry.sourceX,
		geometry.sourceY,
		geometry.sourceWidth,
		geometry.sourceHeight,
		-geometry.sourceWidth / 2,
		-geometry.sourceHeight / 2,
		geometry.sourceWidth,
		geometry.sourceHeight,
	);
	ctx.restore();

	// Reset filter for pixel manipulation
	ctx.filter = "none";

	// Apply curves (RGB and Channels)
	if (state.curves) {
		applyCurves(ctx, width, height, state.curves);
	}

	// Apply temperature and tint
	if (state.temperature !== 0 || state.tint !== 0) {
		applyAllAdjustments(ctx, width, height, {
			temperature: state.temperature,
			tint: state.tint,
		});
	}

	// Apply shadows/highlights/vibrance/clarity
	if (
		state.shadows !== 0 ||
		state.highlights !== 0 ||
		state.vibrance !== 0 ||
		state.clarity !== 0
	) {
		applyAllAdjustments(ctx, width, height, {
			shadows: state.shadows,
			highlights: state.highlights,
			vibrance: state.vibrance,
			clarity: state.clarity,
		});
	}

	// Apply all stacked effects from state
	const appliedEffects = state.appliedEffects || [];
	for (const effect of appliedEffects) {
		if (effect.type !== "none") {
			applyEffect(
				ctx,
				width,
				height,
				effect.type as EffectType,
				effect.intensity,
				effect.duotoneColors,
			);
		}
	}

	// Apply current preview effect (not yet applied to stack)
	if (options.previewEffect && options.previewEffect.type !== "none") {
		applyEffect(
			ctx,
			width,
			height,
			options.previewEffect.type,
			options.previewEffect.intensity,
			options.previewEffect.duotoneColors,
		);
	}

	if (state.vignette > 0) {
		const vignette = ctx.createRadialGradient(
			width / 2,
			height / 2,
			0,
			width / 2,
			height / 2,
			Math.max(width, height) / 2,
		);
		vignette.addColorStop(0, "rgba(0,0,0,0)");
		vignette.addColorStop(0.55, "rgba(0,0,0,0)");
		vignette.addColorStop(1, `rgba(0,0,0,${state.vignette / 100})`);
		ctx.fillStyle = vignette;
		ctx.fillRect(0, 0, width, height);
	}

	if ((state.drawStrokes?.length ?? 0) > 0) {
		ctx.save();
		applyEditorTransform(ctx, width, height, state, sourceScale);
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		for (const stroke of state.drawStrokes ?? []) {
			const first = stroke.points[0];
			if (!first) continue;
			ctx.beginPath();
			ctx.strokeStyle = stroke.color;
			ctx.fillStyle = stroke.color;
			ctx.lineWidth = stroke.size;
			const offsetX = geometry.sourceX + geometry.sourceWidth / 2;
			const offsetY = geometry.sourceY + geometry.sourceHeight / 2;
			ctx.moveTo(first.x - offsetX, first.y - offsetY);
			for (const point of stroke.points.slice(1)) {
				ctx.lineTo(point.x - offsetX, point.y - offsetY);
			}
			if (stroke.points.length === 1) {
				ctx.arc(first.x - offsetX, first.y - offsetY, stroke.size / 2, 0, Math.PI * 2);
				ctx.fill();
			} else {
				ctx.stroke();
			}
		}
		ctx.restore();
	}
}
