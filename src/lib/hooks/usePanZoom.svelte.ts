/**
 * Reusable pan/zoom logic for canvas-like components.
 * Handles mouse drag panning, scroll wheel zoom, and touch pinch zoom.
 */

export interface PanZoomState {
	zoom: number;
	panX: number;
	panY: number;
	isPanning: boolean;
}

export interface PanZoomOptions {
	minZoom?: number;
	maxZoom?: number;
	zoomStep?: number;
}

export function usePanZoom(options: PanZoomOptions = {}) {
	const { minZoom = 0.1, maxZoom = 5, zoomStep = 0.2 } = options;

	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);

	let startPanX = 0;
	let startPanY = 0;
	let touchStartDist = 0;
	let touchStartZoom = 1;

	function fitToScreen() {
		zoom = 1;
		panX = 0;
		panY = 0;
	}

	function zoomIn() {
		zoom = Math.min(maxZoom, zoom + zoomStep);
	}

	function zoomOut() {
		zoom = Math.max(minZoom, zoom - zoomStep);
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		if (e.ctrlKey || e.metaKey) {
			const delta = e.deltaY > 0 ? 0.9 : 1.1;
			zoom = Math.min(Math.max(minZoom, zoom * delta), maxZoom);
		} else {
			panX -= e.deltaX;
			panY -= e.deltaY;
		}
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.button === 0 || e.button === 1) {
			isPanning = true;
			startPanX = e.clientX - panX;
			startPanY = e.clientY - panY;
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isPanning) return;
		panX = e.clientX - startPanX;
		panY = e.clientY - startPanY;
	}

	function handleMouseUp() {
		isPanning = false;
	}

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length === 1) {
			const touch = e.touches[0];
			if (touch) {
				isPanning = true;
				startPanX = touch.clientX - panX;
				startPanY = touch.clientY - panY;
			}
		} else if (e.touches.length === 2) {
			e.preventDefault();
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			if (t1 && t2) {
				touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
				touchStartZoom = zoom;
			}
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (e.touches.length === 1 && isPanning) {
			const touch = e.touches[0];
			if (touch) {
				panX = touch.clientX - startPanX;
				panY = touch.clientY - startPanY;
			}
		} else if (e.touches.length === 2) {
			e.preventDefault();
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			if (t1 && t2) {
				const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
				const scale = dist / touchStartDist;
				zoom = Math.min(maxZoom, Math.max(minZoom, touchStartZoom * scale));
			}
		}
	}

	function handleTouchEnd() {
		isPanning = false;
	}

	return {
		get zoom() { return zoom; },
		set zoom(v: number) { zoom = v; },
		get panX() { return panX; },
		set panX(v: number) { panX = v; },
		get panY() { return panY; },
		set panY(v: number) { panY = v; },
		get isPanning() { return isPanning; },
		fitToScreen,
		zoomIn,
		zoomOut,
		handleWheel,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
	};
}
