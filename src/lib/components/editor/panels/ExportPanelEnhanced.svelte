<script lang="ts">
import Icon from "@iconify/svelte";
import { cn } from "$lib/utils/cn";
import { app } from "$lib/stores/root.svelte";
import { toast } from "svelte-sonner";
import type { ValidatedGradient, ValidatedColorPalette } from "$lib/schemas/validation";

let { imageName, extractedPalette, getEditedImageData } = $props<{
	imageName: string;
	extractedPalette: string[] | null;
	getEditedImageData: () => Promise<string>;
}>();

// Export settings
let format = $state<"png" | "jpeg" | "webp">(
	(app.settings.state.exportPreferences.defaultFormat as "png" | "jpeg" | "webp") || "png",
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
		const sourceDataUrl = await getEditedImageData();
		const sourceImage = new Image();
		await new Promise<void>((resolve, reject) => {
			sourceImage.onload = () => resolve();
			sourceImage.onerror = () => reject(new Error("The edited image could not be loaded."));
			sourceImage.src = sourceDataUrl;
		});

		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.round(sourceImage.naturalWidth * scale));
		canvas.height = Math.max(1, Math.round(sourceImage.naturalHeight * scale));
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Could not create the export canvas.");

		if (includeBackground || format === "jpeg") {
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
		ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

		const mimeType = `image/${format}`;
		const qualityValue = format === "png" ? undefined : quality / 100;
		const dataUrl = canvas.toDataURL(mimeType, qualityValue);
		const link = document.createElement("a");
		link.download = `${imageName}-edited.${format}`;
		link.href = dataUrl;
		link.click();

		toast.success("Image exported successfully!");
		if (embedPalette && extractedPalette && extractedPalette.length > 0) {
			exportPaletteJSON();
		}
	} catch (error) {
		console.error("Export failed:", error);
		toast.error("The image could not be exported. Try again.");
	} finally {
		isExporting = false;
	}
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
