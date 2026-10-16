import type { AspectRatio, CropGuideType, CropRect } from "$lib/types/image-editor";

/** A point in the source image's own pixel coordinate space. */
export interface ImagePoint {
	x: number;
	y: number;
}

/** Crops snap to an image edge within this many source pixels. */
const SNAP_THRESHOLD = 8;

function snapToEdge(value: number, edge: number): number {
	return Math.abs(value - edge) < SNAP_THRESHOLD ? edge : value;
}

function ratioOf(aspectRatio: AspectRatio): number | null {
	if (aspectRatio === "free") return null;
	const [width = 1, height = 1] = aspectRatio.split(":").map(Number);
	return width / height;
}

/** Keeps a crop inside an image of `width` × `height`. */
export function clampCrop(rect: CropRect, width: number, height: number): CropRect {
	const w = Math.min(rect.width, width);
	const h = Math.min(rect.height, height);
	return {
		x: Math.max(0, Math.min(rect.x, width - w)),
		y: Math.max(0, Math.min(rect.y, height - h)),
		width: w,
		height: h,
	};
}

/** The largest centred crop with `aspectRatio` (the whole image for "free"). */
export function largestCrop(aspectRatio: AspectRatio, width: number, height: number): CropRect {
	const ratio = ratioOf(aspectRatio);
	if (ratio === null) return { x: 0, y: 0, width, height };
	const w = Math.min(width, height * ratio);
	const h = w / ratio;
	return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}

/** Signed width/height constrained to `aspectRatio`, keeping the drag direction. */
function constrain(aspectRatio: AspectRatio, width: number, height: number): [number, number] {
	const ratio = ratioOf(aspectRatio);
	if (ratio === null) return [width, height];
	if (Math.abs(width) / Math.max(Math.abs(height), 1) > ratio) {
		return [Math.sign(width) * Math.abs(height) * ratio, height];
	}
	return [width, (Math.sign(height) * Math.abs(width)) / ratio];
}

type DragMode =
	| { kind: "new"; start: ImagePoint }
	| { kind: "handle"; handle: string; anchor: ImagePoint }
	| { kind: "move"; offset: ImagePoint };

/**
 * The crop box being edited, in source pixels. `rect` is null until the tool starts; the
 * recipe keeps the applied crop, this keeps the one being drawn.
 */
export class CropInteraction {
	rect = $state<CropRect | null>(null);
	aspectRatio = $state<AspectRatio>("free");
	guideType = $state<CropGuideType>("thirds");
	#drag: DragMode | null = null;
	#width = 0;
	#height = 0;

	/** Starts editing from the applied crop, or the whole image. */
	begin(applied: CropRect | null, width: number, height: number): void {
		this.#width = width;
		this.#height = height;
		this.rect = applied ? { ...applied } : { x: 0, y: 0, width, height };
	}

	end(): void {
		this.rect = null;
		this.#drag = null;
	}

	setAspectRatio(aspectRatio: AspectRatio): void {
		this.aspectRatio = aspectRatio;
		this.rect = largestCrop(aspectRatio, this.#width, this.#height);
	}

	set(rect: CropRect): void {
		this.rect = clampCrop(rect, this.#width, this.#height);
	}

	startNew(point: ImagePoint): void {
		this.#drag = { kind: "new", start: point };
	}

	startHandle(handle: string): void {
		const rect = this.rect;
		if (!rect) return;
		// The anchor is the opposite corner or edge.
		const anchor = {
			x: handle.includes("left") ? rect.x + rect.width : rect.x,
			y: handle.includes("top") ? rect.y + rect.height : rect.y,
		};
		this.#drag = { kind: "handle", handle, anchor };
	}

	startMove(point: ImagePoint): void {
		const rect = this.rect;
		if (!rect) return;
		this.#drag = { kind: "move", offset: { x: point.x - rect.x, y: point.y - rect.y } };
	}

	move(point: ImagePoint): void {
		const drag = this.#drag;
		const rect = this.rect;
		if (!drag) return;
		if (drag.kind === "move" && rect) {
			let x = snapToEdge(point.x - drag.offset.x, 0);
			let y = snapToEdge(point.y - drag.offset.y, 0);
			x = snapToEdge(x, this.#width - rect.width);
			y = snapToEdge(y, this.#height - rect.height);
			this.set({ x, y, width: rect.width, height: rect.height });
			return;
		}
		if (drag.kind === "handle" && rect) {
			this.#resize(drag.handle, drag.anchor, rect, point);
			return;
		}
		if (drag.kind === "new") this.#drawNew(drag.start, point);
	}

	stop(): void {
		this.#drag = null;
	}

	/** Arrow keys move the box; Shift moves 10 px; Alt resizes. Returns whether it handled the key. */
	nudge(event: KeyboardEvent): boolean {
		const rect = this.rect;
		if (!rect) return false;
		const step = event.shiftKey ? 10 : 1;
		let { x, y, width, height } = rect;
		switch (event.key) {
			case "ArrowLeft":
				if (event.altKey) width = Math.max(1, width - step);
				else x -= step;
				break;
			case "ArrowRight":
				if (event.altKey) width += step;
				else x += step;
				break;
			case "ArrowUp":
				if (event.altKey) height = Math.max(1, height - step);
				else y -= step;
				break;
			case "ArrowDown":
				if (event.altKey) height += step;
				else y += step;
				break;
			default:
				return false;
		}
		this.set({ x, y, width, height });
		return true;
	}

	#resize(handle: string, anchor: ImagePoint, rect: CropRect, point: ImagePoint): void {
		let x = anchor.x;
		let y = anchor.y;
		let w: number;
		let h: number;
		if (handle === "left" || handle === "right") {
			w = handle === "left" ? anchor.x - point.x : point.x - anchor.x;
			if (handle === "left") x = point.x;
			h = rect.height;
			y = rect.y;
		} else if (handle === "top" || handle === "bottom") {
			h = handle === "top" ? anchor.y - point.y : point.y - anchor.y;
			if (handle === "top") y = point.y;
			w = rect.width;
			x = rect.x;
		} else {
			[w, h] = constrain(this.aspectRatio, point.x - anchor.x, point.y - anchor.y);
		}
		if (w < 0) {
			x += w;
			w = -w;
		}
		if (h < 0) {
			y += h;
			h = -h;
		}
		x = snapToEdge(x, 0);
		y = snapToEdge(y, 0);
		if (Math.abs(x + w - this.#width) < SNAP_THRESHOLD) w = this.#width - x;
		if (Math.abs(y + h - this.#height) < SNAP_THRESHOLD) h = this.#height - y;
		this.set({ x, y, width: Math.max(1, w), height: Math.max(1, h) });
	}

	#drawNew(start: ImagePoint, point: ImagePoint): void {
		const [width, height] = constrain(this.aspectRatio, point.x - start.x, point.y - start.y);
		let x = width >= 0 ? start.x : start.x + width;
		let y = height >= 0 ? start.y : start.y + height;
		const w = Math.abs(width);
		const h = Math.abs(height);
		x = snapToEdge(x, 0);
		y = snapToEdge(y, 0);
		if (Math.abs(x + w - this.#width) < SNAP_THRESHOLD) x = this.#width - w;
		if (Math.abs(y + h - this.#height) < SNAP_THRESHOLD) y = this.#height - h;
		this.set({ x, y, width: w, height: h });
	}
}
