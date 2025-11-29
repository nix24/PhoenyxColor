<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { app } from "$lib/stores/root.svelte";
	import { toast } from "svelte-sonner";
	import type { ImageEditorState } from "../EditorHistory.svelte";
	import type { QuickEffect } from "./EffectsPanel.svelte";
	import type { ValidatedGradient, ValidatedColorPalette } from "$lib/schemas/validation";
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
	let estimatedSize = $derived(() => {
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

			// Fill background if needed
			if (includeBackground && format === "jpeg") {
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

			// Apply quick effects that need pixel manipulation
			if (quickEffect !== "none") {
				applyQuickEffect(ctx, width, height, quickEffect, effectIntensity, duotoneColors);
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

	function applyQuickEffect(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		effect: QuickEffect,
		intensity: number,
		duotone: [string, string]
	) {
		const imageData = ctx.getImageData(0, 0, width, height);
		const data = imageData.data;
		const factor = intensity / 100;

		switch (effect) {
			case "posterize": {
				const levels = Math.max(2, Math.round(10 - (intensity / 100) * 8));
				for (let i = 0; i < data.length; i += 4) {
					const r = data[i] ?? 0;
					const g = data[i + 1] ?? 0;
					const b = data[i + 2] ?? 0;
					data[i] = Math.round(r / (256 / levels)) * (256 / levels);
					data[i + 1] = Math.round(g / (256 / levels)) * (256 / levels);
					data[i + 2] = Math.round(b / (256 / levels)) * (256 / levels);
				}
				break;
			}
			case "pixelate": {
				const pixelSize = Math.max(1, Math.round(intensity / 5));
				for (let y = 0; y < height; y += pixelSize) {
					for (let x = 0; x < width; x += pixelSize) {
						const i = (y * width + x) * 4;
						const r = data[i] ?? 0;
						const g = data[i + 1] ?? 0;
						const b = data[i + 2] ?? 0;
						for (let py = 0; py < pixelSize && y + py < height; py++) {
							for (let px = 0; px < pixelSize && x + px < width; px++) {
								const pi = ((y + py) * width + (x + px)) * 4;
								data[pi] = r;
								data[pi + 1] = g;
								data[pi + 2] = b;
							}
						}
					}
				}
				break;
			}
			case "solarize": {
				const threshold = 128 * (1 - factor);
				for (let i = 0; i < data.length; i += 4) {
					const r = data[i] ?? 0;
					const g = data[i + 1] ?? 0;
					const b = data[i + 2] ?? 0;
					data[i] = r > threshold ? 255 - r : r;
					data[i + 1] = g > threshold ? 255 - g : g;
					data[i + 2] = b > threshold ? 255 - b : b;
				}
				break;
			}
			case "duotone": {
				const dark = tinycolor(duotone[0]).toRgb();
				const light = tinycolor(duotone[1]).toRgb();
				for (let i = 0; i < data.length; i += 4) {
					const r = data[i] ?? 0;
					const g = data[i + 1] ?? 0;
					const b = data[i + 2] ?? 0;
					const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
					data[i] = Math.round(dark.r + (light.r - dark.r) * lum * factor + r * (1 - factor));
					data[i + 1] = Math.round(dark.g + (light.g - dark.g) * lum * factor + g * (1 - factor));
					data[i + 2] = Math.round(dark.b + (light.b - dark.b) * lum * factor + b * (1 - factor));
				}
				break;
			}
			case "emboss": {
				const tempData = new Uint8ClampedArray(data);
				for (let y = 1; y < height - 1; y++) {
					for (let x = 1; x < width - 1; x++) {
						const i = (y * width + x) * 4;
						const iPrev = ((y - 1) * width + (x - 1)) * 4;
						for (let c = 0; c < 3; c++) {
							const curr = tempData[i + c] ?? 0;
							const prev = tempData[iPrev + c] ?? 0;
							const val = 128 + (curr - prev) * factor;
							data[i + c] = Math.min(255, Math.max(0, val));
						}
					}
				}
				break;
			}
			case "sharpen": {
				const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
				const tempData = new Uint8ClampedArray(data);
				for (let y = 1; y < height - 1; y++) {
					for (let x = 1; x < width - 1; x++) {
						const i = (y * width + x) * 4;
						for (let c = 0; c < 3; c++) {
							let sum = 0;
							for (let ky = -1; ky <= 1; ky++) {
								for (let kx = -1; kx <= 1; kx++) {
									const ki = ((y + ky) * width + (x + kx)) * 4;
									const pixelVal = tempData[ki + c] ?? 0;
									const kernelVal = kernel[(ky + 1) * 3 + (kx + 1)] ?? 0;
									sum += pixelVal * kernelVal;
								}
							}
							const original = tempData[i + c] ?? 0;
							data[i + c] = Math.min(255, Math.max(0, original + (sum - original) * factor));
						}
					}
				}
				break;
			}
		}

		ctx.putImageData(imageData, 0, 0);
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
