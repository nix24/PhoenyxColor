<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { app } from "$lib/stores/root.svelte";
	import { toast } from "svelte-sonner";
	import type { ImageEditorState } from "../EditorHistory.svelte";
	import type { QuickEffect } from "./EffectsPanel.svelte";
	import type { ValidatedGradient, ValidatedColorPalette } from "$lib/schemas/validation";
	import { applyAllAdjustments } from "$lib/utils/image-processing";
	import { applyEffect, type EffectType } from "$lib/utils/effects-processing";
	import chroma from "chroma-js";
	import tinycolor from "tinycolor2";

	let {
		imageSrc,
		imageName,
		editorState,
		quickEffect,
		effectIntensity,
		duotoneColors,
		extractedPalette,
	} = $props<{
		imageSrc: string;
		imageName: string;
		editorState: ImageEditorState;
		quickEffect: QuickEffect;
		effectIntensity: number;
		duotoneColors: [string, string];
		extractedPalette: string[] | null;
	}>();

	// Export settings
	let format = $state<"png" | "jpeg" | "webp">(
		(app.settings.state.exportPreferences.defaultFormat as "png" | "jpeg" | "webp") || "png"
	);
	let scale = $state(app.settings.state.exportPreferences.defaultScale || 1);
	let quality = $state(90);
	let includeBackground = $state(true);
	let embedPalette = $state(false);
	let isExporting = $state(false);

	// Estimated file size (rough)
	let estimatedSize = $derived.by(() => {
		// Very rough estimate based on format and scale
		const baseSize = 500; // KB for a typical 1080p image
		const scaleFactor = scale * scale;
		const formatFactor = format === "jpeg" ? 0.3 : format === "webp" ? 0.25 : 1;
		const qualityFactor = format === "jpeg" || format === "webp" ? quality / 100 : 1;
		return Math.round(baseSize * scaleFactor * formatFactor * qualityFactor);
	});

	async function handleExport() {
		isExporting = true;
		try {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("Could not get canvas context");

			// Load image
			const img = new Image();
			img.crossOrigin = "anonymous";
			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
				img.src = imageSrc;
			});

			// Calculate dimensions with crop if applied
			let sourceX = 0,
				sourceY = 0,
				sourceW = img.naturalWidth,
				sourceH = img.naturalHeight;
			if (editorState.cropRect) {
				sourceX = editorState.cropRect.x;
				sourceY = editorState.cropRect.y;
				sourceW = editorState.cropRect.width;
				sourceH = editorState.cropRect.height;
			}

			// Set canvas size with scale
			const width = sourceW * scale;
			const height = sourceH * scale;
			canvas.width = width;
			canvas.height = height;

			// Fill background if needed (JPEG always needs background, others optional)
			if (includeBackground || format === "jpeg") {
				ctx.fillStyle = "#ffffff";
				ctx.fillRect(0, 0, width, height);
			}

			// Apply transforms
			ctx.save();
			ctx.translate(width / 2, height / 2);
			if (editorState.flipX) ctx.scale(-1, 1);
			if (editorState.flipY) ctx.scale(1, -1);
			ctx.rotate((editorState.rotation * Math.PI) / 180);
			ctx.translate(-width / 2, -height / 2);

			// Build filter string
			const filters = buildFilterString(editorState);
			if (filters !== "none") {
				ctx.filter = filters;
			}

			// Draw the image
			ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, width, height);
			ctx.restore();

			// Reset filter for pixel manipulation
			ctx.filter = "none";

			// Apply curves adjustment
			if (editorState.curves) {
				applyCurves(ctx, width, height, editorState.curves);
			}

			// Apply advanced image adjustments (temperature, tint, shadows, highlights, vibrance, clarity)
			if (
				editorState.temperature !== 0 ||
				editorState.tint !== 0 ||
				editorState.shadows !== 0 ||
				editorState.highlights !== 0 ||
				editorState.vibrance !== 0 ||
				editorState.clarity !== 0
			) {
				applyAllAdjustments(ctx, width, height, {
					temperature: editorState.temperature,
					tint: editorState.tint,
					shadows: editorState.shadows,
					highlights: editorState.highlights,
					vibrance: editorState.vibrance,
					clarity: editorState.clarity,
				});
			}

			// Apply all stacked effects from state
			const appliedEffects = editorState.appliedEffects || [];
			for (const effect of appliedEffects) {
				if (effect.type !== "none") {
					applyEffect(
						ctx,
						width,
						height,
						effect.type as EffectType,
						effect.intensity,
						effect.duotoneColors
					);
				}
			}

			// Apply current preview effect (if any)
			if (quickEffect !== "none") {
				applyEffect(ctx, width, height, quickEffect as EffectType, effectIntensity, duotoneColors);
			}

			// Apply gradient map overlay if active
			if (
				editorState.gradientMapOpacity > 0 &&
				(app.gradients.activeGradient || app.palettes.activePalette)
			) {
				applyGradientMap(
					ctx,
					width,
					height,
					editorState.gradientMapOpacity,
					editorState.gradientMapBlendMode
				);
			}

			// Apply vignette if set
			if (editorState.vignette > 0) {
				applyVignette(ctx, width, height, editorState.vignette);
			}

			// Export
			const mimeType = `image/${format}`;
			const qualityValue = format === "png" ? undefined : quality / 100;
			const dataUrl = canvas.toDataURL(mimeType, qualityValue);

			// Download
			const link = document.createElement("a");
			link.download = `${imageName}-edited.${format}`;
			link.href = dataUrl;
			link.click();

			toast.success("Image exported successfully!");

			// Also export palette if enabled
			if (embedPalette && extractedPalette && extractedPalette.length > 0) {
				exportPaletteJSON();
			}
		} catch (error) {
			console.error("Export failed:", error);
			toast.error("Failed to export image");
		} finally {
			isExporting = false;
		}
	}

	function buildFilterString(state: ImageEditorState): string {
		const filters: string[] = [];

		if (state.isGrayscale) filters.push("grayscale(100%)");
		if (state.sepia) filters.push(`sepia(${state.sepia}%)`);
		if (state.invert) filters.push(`invert(${state.invert}%)`);
		if (state.brightness !== 100) filters.push(`brightness(${state.brightness}%)`);
		if (state.contrast !== 100) filters.push(`contrast(${state.contrast}%)`);
		if (state.saturation !== 100) filters.push(`saturate(${state.saturation}%)`);
		if (state.hueRotate !== 0) filters.push(`hue-rotate(${state.hueRotate}deg)`);
		if (state.blur !== 0) filters.push(`blur(${state.blur}px)`);

		return filters.length > 0 ? filters.join(" ") : "none";
	}

	function applyGradientMap(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		opacity: number,
		blendMode: string
	) {
		const imageData = ctx.getImageData(0, 0, width, height);
		const data = imageData.data;

		// Get gradient colors
		let colors: string[] = [];
		if (app.gradients.activeGradient) {
			const sortedStops = [...app.gradients.activeGradient.stops].sort(
				(a, b) => a.position - b.position
			);
			const scale = chroma
				.scale(sortedStops.map((s) => s.color))
				.domain(sortedStops.map((s) => s.position / 100));
			colors = Array.from({ length: 256 }, (_, i) => scale(i / 255).hex());
		} else if (app.palettes.activePalette) {
			const scale = chroma.scale(app.palettes.activePalette.colors).mode("lch");
			colors = Array.from({ length: 256 }, (_, i) => scale(i / 255).hex());
		}

		if (colors.length === 0) return;

		// Apply gradient map
		const lut = colors.map((c) => tinycolor(c).toRgb());

		for (let i = 0; i < data.length; i += 4) {
			const r = data[i] ?? 0;
			const g = data[i + 1] ?? 0;
			const b = data[i + 2] ?? 0;
			const lum = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
			const mapped = lut[Math.min(lum, 255)];

			if (mapped) {
				// Simple overlay blend
				data[i] = Math.round(r * (1 - opacity) + mapped.r * opacity);
				data[i + 1] = Math.round(g * (1 - opacity) + mapped.g * opacity);
				data[i + 2] = Math.round(b * (1 - opacity) + mapped.b * opacity);
			}
		}

		ctx.putImageData(imageData, 0, 0);
	}

	function applyVignette(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		intensity: number
	) {
		const gradient = ctx.createRadialGradient(
			width / 2,
			height / 2,
			0,
			width / 2,
			height / 2,
			Math.max(width, height) / 2
		);
		gradient.addColorStop(0, "rgba(0,0,0,0)");
		gradient.addColorStop(0.5, "rgba(0,0,0,0)");
		gradient.addColorStop(1, `rgba(0,0,0,${intensity / 100})`);

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);
	}

	// Apply curves using lookup tables
	function applyCurves(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		curves: ImageEditorState["curves"]
	) {
		const isDefault = (points: Array<{ x: number; y: number }>) =>
			points.length === 2 &&
			points[0]?.x === 0 &&
			points[0]?.y === 0 &&
			points[1]?.x === 255 &&
			points[1]?.y === 255;

		// Skip if all curves are at default
		if (
			isDefault(curves.rgb) &&
			isDefault(curves.red) &&
			isDefault(curves.green) &&
			isDefault(curves.blue)
		) {
			return;
		}

		const imageData = ctx.getImageData(0, 0, width, height);
		const data = imageData.data;

		// Build lookup tables for each channel
		const buildLUT = (points: Array<{ x: number; y: number }>): number[] => {
			if (isDefault(points)) {
				return Array.from({ length: 256 }, (_, i) => i);
			}

			// Interpolate curve using Catmull-Rom spline
			const sortedPoints = [...points].sort((a, b) => a.x - b.x);
			const interpolated: Array<{ x: number; y: number }> = [];

			for (let i = 0; i < sortedPoints.length - 1; i++) {
				const p0 = sortedPoints[Math.max(0, i - 1)];
				const p1 = sortedPoints[i];
				const p2 = sortedPoints[i + 1];
				const p3 = sortedPoints[Math.min(sortedPoints.length - 1, i + 2)];

				if (!p0 || !p1 || !p2 || !p3) continue;

				for (let t = 0; t < 1; t += 0.02) {
					const t2 = t * t;
					const t3 = t2 * t;

					const x =
						0.5 *
						(2 * p1.x +
							(-p0.x + p2.x) * t +
							(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
							(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
					const y =
						0.5 *
						(2 * p1.y +
							(-p0.y + p2.y) * t +
							(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
							(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

					interpolated.push({ x: Math.max(0, Math.min(255, x)), y: Math.max(0, Math.min(255, y)) });
				}
			}
			const lastPoint = sortedPoints[sortedPoints.length - 1];
			if (lastPoint) interpolated.push(lastPoint);

			// Build LUT
			const lut = new Array(256).fill(0);
			for (let x = 0; x < 256; x++) {
				let y = x;
				for (let i = 0; i < interpolated.length - 1; i++) {
					const p1 = interpolated[i];
					const p2 = interpolated[i + 1];
					if (p1 && p2 && p1.x <= x && p2.x >= x) {
						const t = p2.x !== p1.x ? (x - p1.x) / (p2.x - p1.x) : 0;
						y = p1.y + t * (p2.y - p1.y);
						break;
					}
				}
				lut[x] = Math.max(0, Math.min(255, Math.round(y)));
			}
			return lut;
		};

		const rgbLUT = buildLUT(curves.rgb);
		const redLUT = buildLUT(curves.red);
		const greenLUT = buildLUT(curves.green);
		const blueLUT = buildLUT(curves.blue);

		// Apply LUTs to image data
		for (let i = 0; i < data.length; i += 4) {
			// First apply RGB master curve
			let r = rgbLUT[data[i] ?? 0] ?? data[i] ?? 0;
			let g = rgbLUT[data[i + 1] ?? 0] ?? data[i + 1] ?? 0;
			let b = rgbLUT[data[i + 2] ?? 0] ?? data[i + 2] ?? 0;

			// Then apply individual channel curves
			data[i] = redLUT[r] ?? r;
			data[i + 1] = greenLUT[g] ?? g;
			data[i + 2] = blueLUT[b] ?? b;
		}

		ctx.putImageData(imageData, 0, 0);
	}

	function exportPaletteJSON() {
		if (!extractedPalette) return;
		const data = JSON.stringify({ palette: extractedPalette }, null, 2);
		const blob = new Blob([data], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.download = `${imageName}-palette.json`;
		link.href = url;
		link.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="space-y-6">
	<!-- Format Selection -->
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Format</h4>
		<div class="grid grid-cols-3 gap-2">
			{#each ["png", "jpeg", "webp"] as f}
				<button
					class={cn(
						"py-3 rounded-lg font-bold uppercase text-sm transition-all",
						format === f
							? "bg-phoenix-primary text-white shadow-lg"
							: "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
					)}
					onclick={() => (format = f as any)}
				>
					{f}
				</button>
			{/each}
		</div>
	</div>

	<!-- Scale Selection -->
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<span class="text-sm text-white">Scale</span>
			<span class="text-xs font-mono text-phoenix-primary">{scale}x</span>
		</div>
		<input
			type="range"
			min="1"
			max="4"
			step="1"
			bind:value={scale}
			class="range range-xs range-primary"
		/>
		<div class="flex justify-between text-[10px] text-white/30 px-1">
			<span>1x</span>
			<span>2x</span>
			<span>3x</span>
			<span>4x</span>
		</div>
	</div>

	<!-- Quality (for lossy formats) -->
	{#if format !== "png"}
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<span class="text-sm text-white">Quality</span>
				<span class="text-xs font-mono text-white/60">{quality}%</span>
			</div>
			<input
				type="range"
				min="10"
				max="100"
				step="5"
				bind:value={quality}
				class="range range-xs range-secondary"
			/>
		</div>
	{/if}

	<!-- Options -->
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Options</h4>

		<label class="flex items-center justify-between cursor-pointer">
			<span class="text-sm text-white/80">Include Background</span>
			<input
				type="checkbox"
				class="toggle toggle-sm toggle-primary"
				bind:checked={includeBackground}
			/>
		</label>

		{#if extractedPalette && extractedPalette.length > 0}
			<label class="flex items-center justify-between cursor-pointer">
				<span class="text-sm text-white/80">Export Palette (JSON)</span>
				<input type="checkbox" class="toggle toggle-sm toggle-accent" bind:checked={embedPalette} />
			</label>
		{/if}
	</div>

	<!-- Estimated Size -->
	<div class="p-3 bg-white/5 rounded-lg border border-white/10">
		<div class="flex items-center justify-between">
			<span class="text-xs text-white/60">Estimated Size</span>
			<span class="text-sm font-mono text-white">~{estimatedSize} KB</span>
		</div>
	</div>

	<!-- Export Button -->
	<button
		class="btn btn-primary w-full gap-2 shadow-lg shadow-phoenix-primary/30"
		onclick={handleExport}
		disabled={isExporting}
	>
		{#if isExporting}
			<span class="loading loading-spinner loading-sm"></span>
			Exporting...
		{:else}
			<Icon icon="material-symbols:download" class="w-5 h-5" />
			Export Image
		{/if}
	</button>
</div>
