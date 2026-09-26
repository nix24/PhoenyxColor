import type { EditRecipe } from "../domain";

export interface CropRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface OutputGeometry {
	/** The part of the source that is used, clamped to the source bounds. */
	crop: CropRect;
	/** Full-resolution output size: the crop rotated (bounding box) and scaled. */
	width: number;
	height: number;
}

export function outputGeometry(
	sourceWidth: number,
	sourceHeight: number,
	geometry: EditRecipe["geometry"]
): OutputGeometry {
	const x = Math.max(0, Math.min(geometry.crop?.x ?? 0, sourceWidth - 1));
	const y = Math.max(0, Math.min(geometry.crop?.y ?? 0, sourceHeight - 1));
	const cropWidth = Math.max(1, Math.min(geometry.crop?.width ?? sourceWidth, sourceWidth - x));
	const cropHeight = Math.max(1, Math.min(geometry.crop?.height ?? sourceHeight, sourceHeight - y));
	const radians = (geometry.rotation * Math.PI) / 180;
	// Snap float noise so quarter turns give exact sizes instead of one extra pixel.
	const cos = Math.abs(Math.cos(radians)) < 1e-10 ? 0 : Math.abs(Math.cos(radians));
	const sin = Math.abs(Math.sin(radians)) < 1e-10 ? 0 : Math.abs(Math.sin(radians));
	return {
		crop: { x, y, width: cropWidth, height: cropHeight },
		width: Math.max(1, Math.ceil((cropWidth * cos + cropHeight * sin) * geometry.scale)),
		height: Math.max(1, Math.ceil((cropWidth * sin + cropHeight * cos) * geometry.scale)),
	};
}

/**
 * Column-major 2×2 matrix (WebGL `mat2` order) taking crop-centred source pixels to
 * output-centred pixels, y down: rotate, then flip and scale, as v1's canvas transform did.
 * `outputScale` shrinks the result for a preview smaller than full resolution.
 */
export function sourceToOutputMatrix(
	geometry: EditRecipe["geometry"],
	outputScale: number
): [number, number, number, number] {
	const radians = (geometry.rotation * Math.PI) / 180;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	const scaleX = geometry.scale * outputScale * (geometry.flipX ? -1 : 1);
	const scaleY = geometry.scale * outputScale * (geometry.flipY ? -1 : 1);
	return [scaleX * cos, scaleY * sin, scaleX * -sin, scaleY * cos];
}

/**
 * Where a layer image sits, in source pixels: fitted inside the source frame (keeping its aspect
 * ratio) and centred. Layers carry no transform yet, so this is the only placement.
 */
export function layerRect(
	layerWidth: number,
	layerHeight: number,
	sourceWidth: number,
	sourceHeight: number
): CropRect {
	const fit = Math.min(sourceWidth / layerWidth, sourceHeight / layerHeight);
	const width = layerWidth * fit;
	const height = layerHeight * fit;
	return { x: (sourceWidth - width) / 2, y: (sourceHeight - height) / 2, width, height };
}
