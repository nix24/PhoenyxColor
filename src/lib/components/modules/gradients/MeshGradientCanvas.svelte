<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import type { MeshPoint } from "./gradient-utils";
	import { getContrastColor } from "./gradient-utils";
	import chroma from "chroma-js";

	interface Props {
		points: MeshPoint[];
		width: number;
		height: number;
		showHandles?: boolean;
		noiseEnabled?: boolean;
		noiseIntensity?: number;
		noiseScale?: number;
		blendMode?: "normal" | "screen" | "multiply" | "overlay";
		onPointMove?: (id: string, x: number, y: number) => void;
		onPointAdd?: (x: number, y: number, color: string) => void;
		onPointRemove?: (id: string) => void;
		onPointColorChange?: (id: string, color: string) => void;
		onPointRadiusChange?: (id: string, radius: number) => void;
	}

	let {
		points,
		width,
		height,
		showHandles = true,
		noiseEnabled = false,
		noiseIntensity = 10,
		noiseScale = 1,
		blendMode = "normal",
		onPointMove,
		onPointAdd,
		onPointRemove,
		onPointColorChange,
		onPointRadiusChange,
	}: Props = $props();

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;

	// Interaction state
	let isDragging = $state(false);
	let dragPointId = $state<string | null>(null);
	let hoveredPointId = $state<string | null>(null);

	// Noise permutation table for Perlin noise
	const permutation: number[] = [];
	for (let i = 0; i < 256; i++) permutation[i] = i;
	for (let i = 255; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[permutation[i], permutation[j]] = [permutation[j]!, permutation[i]!];
	}
	const perm = [...permutation, ...permutation];

	function fade(t: number): number {
		return t * t * t * (t * (t * 6 - 15) + 10);
	}

	function lerp(a: number, b: number, t: number): number {
		return a + t * (b - a);
	}

	function grad(hash: number, x: number, y: number): number {
		const h = hash & 3;
		const u = h < 2 ? x : y;
		const v = h < 2 ? y : x;
		return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
	}

	function perlinNoise(x: number, y: number): number {
		const X = Math.floor(x) & 255;
		const Y = Math.floor(y) & 255;

		x -= Math.floor(x);
		y -= Math.floor(y);

		const u = fade(x);
		const v = fade(y);

		const A = perm[X]! + Y;
		const B = perm[X + 1]! + Y;

		return lerp(
			lerp(grad(perm[A]!, x, y), grad(perm[B]!, x - 1, y), u),
			lerp(grad(perm[A + 1]!, x, y - 1), grad(perm[B + 1]!, x - 1, y - 1), u),
			v
		);
	}

	function renderMeshGradient() {
		if (!ctx || points.length === 0) return;

		const imageData = ctx.createImageData(width, height);
		const data = imageData.data;

		// Parse colors once
		const parsedPoints = points.map((p) => ({
			...p,
			rgb: chroma(p.color).rgb(),
			px: (p.x / 100) * width,
			py: (p.y / 100) * height,
			effectiveRadius: (p.radius / 100) * Math.max(width, height),
		}));

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				let totalWeight = 0;
				let r = 0,
					g = 0,
					b = 0;

				// Calculate weighted color contribution from each point
				for (const point of parsedPoints) {
					const dx = x - point.px;
					const dy = y - point.py;
					const distance = Math.sqrt(dx * dx + dy * dy);

					// Smooth falloff using gaussian-like curve
					const normalizedDist = distance / point.effectiveRadius;
					const weight = Math.exp(-normalizedDist * normalizedDist * 2);

					if (weight > 0.001) {
						r += point.rgb[0] * weight;
						g += point.rgb[1] * weight;
						b += point.rgb[2] * weight;
						totalWeight += weight;
					}
				}

				// Normalize colors
				if (totalWeight > 0) {
					r /= totalWeight;
					g /= totalWeight;
					b /= totalWeight;
				}

				// Apply noise if enabled
				if (noiseEnabled && noiseIntensity > 0) {
					const noise = perlinNoise(x * noiseScale * 0.02, y * noiseScale * 0.02);
					const noiseAmount = (noise * noiseIntensity) / 100;
					r = Math.max(0, Math.min(255, r + noiseAmount * 255));
					g = Math.max(0, Math.min(255, g + noiseAmount * 255));
					b = Math.max(0, Math.min(255, b + noiseAmount * 255));
				}

				const idx = (y * width + x) * 4;
				data[idx] = Math.round(r);
				data[idx + 1] = Math.round(g);
				data[idx + 2] = Math.round(b);
				data[idx + 3] = 255;
			}
		}

		ctx.putImageData(imageData, 0, 0);

		// Draw handles if enabled
		if (showHandles) {
			drawHandles();
		}
	}

	function drawHandles() {
		if (!ctx) return;

		for (let i = 0; i < points.length; i++) {
			const point = points[i];
			if (!point) continue;

			const x = (point.x / 100) * width;
			const y = (point.y / 100) * height;
			const isHovered = hoveredPointId === point.id;
			const isDragTarget = isDragging && dragPointId === point.id;
			const radius = isHovered || isDragTarget ? 14 : 12;

			// Draw radius indicator for hovered/dragged points
			if (isHovered || isDragTarget) {
				ctx.beginPath();
				ctx.arc(x, y, (point.radius / 100) * Math.max(width, height) * 0.5, 0, Math.PI * 2);
				ctx.strokeStyle = point.color;
				ctx.setLineDash([4, 4]);
				ctx.lineWidth = 1;
				ctx.globalAlpha = 0.5;
				ctx.stroke();
				ctx.setLineDash([]);
				ctx.globalAlpha = 1;
			}

			// Draw main handle
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, Math.PI * 2);
			ctx.fillStyle = point.color;
			ctx.fill();
			ctx.strokeStyle = "white";
			ctx.lineWidth = 2;
			ctx.stroke();

			// Draw inner dot
			ctx.beginPath();
			ctx.arc(x, y, 3, 0, Math.PI * 2);
			ctx.fillStyle = getContrastColor(point.color);
			ctx.fill();

			// Draw point number
			ctx.fillStyle = "white";
			ctx.font = "bold 10px sans-serif";
			ctx.textAlign = "center";
			ctx.fillText(`${i + 1}`, x, y - 20);
		}
	}

	function handleMouseDown(e: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		// Check if clicking on a point
		for (const point of points) {
			const px = (point.x / 100) * width;
			const py = (point.y / 100) * height;
			const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

			if (distance < 15) {
				isDragging = true;
				dragPointId = point.id;
				return;
			}
		}
	}

	function handleMouseMove(e: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (isDragging && dragPointId && onPointMove) {
			const percentX = Math.max(0, Math.min(100, (x / width) * 100));
			const percentY = Math.max(0, Math.min(100, (y / height) * 100));
			onPointMove(dragPointId, Math.round(percentX), Math.round(percentY));
		} else {
			// Update hover state
			let foundHover = false;
			for (const point of points) {
				const px = (point.x / 100) * width;
				const py = (point.y / 100) * height;
				const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

				if (distance < 15) {
					hoveredPointId = point.id;
					foundHover = true;
					break;
				}
			}
			if (!foundHover) {
				hoveredPointId = null;
			}
		}
	}

	function handleMouseUp() {
		isDragging = false;
		dragPointId = null;
	}

	function handleDoubleClick(e: MouseEvent) {
		if (!onPointAdd) return;

		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		// Check if double-clicking on existing point (to potentially edit it)
		for (const point of points) {
			const px = (point.x / 100) * width;
			const py = (point.y / 100) * height;
			const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

			if (distance < 15) {
				// Could trigger color picker here
				return;
			}
		}

		// Add new point
		const percentX = (x / width) * 100;
		const percentY = (y / height) * 100;

		// Generate a color based on surrounding points
		let color = "#808080";
		if (points.length > 0) {
			// Find nearest point and use a similar color
			let nearestDist = Infinity;
			let nearestColor = "#808080";

			for (const point of points) {
				const px = (point.x / 100) * width;
				const py = (point.y / 100) * height;
				const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

				if (dist < nearestDist) {
					nearestDist = dist;
					nearestColor = point.color;
				}
			}

			// Shift the hue slightly for variety
			const hsl = chroma(nearestColor).hsl();
			color = chroma.hsl((hsl[0] + 30) % 360, hsl[1], hsl[2]).hex();
		}

		onPointAdd(percentX, percentY, color);
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();

		if (!onPointRemove) return;

		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		// Check if right-clicking on a point to remove it
		for (const point of points) {
			const px = (point.x / 100) * width;
			const py = (point.y / 100) * height;
			const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

			if (distance < 15) {
				onPointRemove(point.id);
				return;
			}
		}
	}

	onMount(() => {
		ctx = canvas.getContext("2d");
		renderMeshGradient();
	});

	$effect(() => {
		// Re-render when points or settings change
		if (ctx) {
			renderMeshGradient();
		}
	});

	onDestroy(() => {
		// Clean up any animation frames if they exist
	});
</script>

<canvas
	bind:this={canvas}
	{width}
	{height}
	class="rounded-lg cursor-crosshair"
	class:cursor-grab={hoveredPointId && !isDragging}
	class:cursor-grabbing={isDragging}
	onmousedown={handleMouseDown}
	onmousemove={handleMouseMove}
	onmouseup={handleMouseUp}
	onmouseleave={handleMouseUp}
	ondblclick={handleDoubleClick}
	oncontextmenu={handleContextMenu}
></canvas>

<style>
	canvas {
		image-rendering: auto;
	}
</style>
