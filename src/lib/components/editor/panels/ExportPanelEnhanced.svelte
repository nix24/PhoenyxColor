<script lang="ts">
import Icon from "@iconify/svelte";
import { cn } from "$lib/utils/cn";
import { app } from "$lib/stores/root.svelte";
import { toast } from "svelte-sonner";
import type { ValidatedGradient, ValidatedColorPalette } from "$lib/schemas/validation";
import { downloadBlob } from "$lib/core/download";
import type { ExportOptions } from "$lib/features/references";

let { imageName, extractedPalette, outputSize, isSourceDownscaled, onExport } = $props<{
	imageName: string;
	extractedPalette: string[] | null;
	/** The edit's size at 1×, in pixels. */
	outputSize: { width: number; height: number };
	isSourceDownscaled: boolean;
	/** Renders the edit through the preview's own pipeline and encodes it. */
	onExport: (
		options: ExportOptions
	) => Promise<{ blob: Blob; width: number; height: number; isReduced: boolean }>;
}>();

// Export settings. The saved preference may be "svg", which this panel cannot emit.
type RasterFormat = "png" | "jpeg" | "webp";
const savedFormat = app.settings.state.exportPreferences.defaultFormat;
let format = $state<RasterFormat>(savedFormat === "svg" ? "png" : savedFormat);
let scale = $state(app.settings.state.exportPreferences.defaultScale || 1);
let quality = $state(90);
/** Off keeps transparency (PNG, WebP); JPEG has no alpha, so it is always filled. */
let fillTransparency = $state(false);
let embedPalette = $state(false);
let isExporting = $state(false);

const FORMATS: RasterFormat[] = ["png", "jpeg", "webp"];

async function handleExport() {
	isExporting = true;
	try {
		const image = await onExport({
			format,
			scale,
			quality: quality / 100,
			hasBackground: format === "jpeg" || fillTransparency,
		});
		downloadBlob(image.blob, `${imageName}-edited.${format}`);

		if (image.isReduced) {
			toast.warning(
				`Exported at ${image.width}×${image.height}: smaller than requested (GPU size limit).`
			);
		} else {
			toast.success(`Exported ${image.width}×${image.height} ${format.toUpperCase()}`);
		}
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
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/60 uppercase tracking-wider">Format</h4>
		<div class="grid grid-cols-3 gap-2" role="group" aria-label="Format">
			{#each FORMATS as f (f)}
				<button
					class={cn(
						"min-h-11 rounded-lg font-bold uppercase text-sm transition-colors focus-visible:outline-2 focus-visible:outline-phoenix-primary",
						format === f
							? "bg-phoenix-primary text-white shadow-lg"
							: "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
					)}
					onclick={() => (format = f)}
					aria-pressed={format === f}
					type="button"
				>
					{f}
				</button>
			{/each}
		</div>
	</div>

	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<label for="export-scale" class="text-sm text-white">Scale</label>
			<span class="text-xs font-mono text-phoenix-primary">{scale}×</span>
		</div>
		<input id="export-scale" type="range" min="1" max="4" step="1" bind:value={scale} class="range range-xs range-primary" />
		<div class="flex justify-between text-[10px] text-white/60 px-1" aria-hidden="true">
			<span>1×</span>
			<span>2×</span>
			<span>3×</span>
			<span>4×</span>
		</div>
	</div>

	{#if format !== "png"}
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<label for="export-quality" class="text-sm text-white">Quality</label>
				<span class="text-xs font-mono text-white/70">{quality}%</span>
			</div>
			<input id="export-quality" type="range" min="10" max="100" step="5" bind:value={quality} class="range range-xs range-secondary" />
		</div>
	{/if}

	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/60 uppercase tracking-wider">Options</h4>
		{#if format === "jpeg"}
			<p class="text-xs text-white/60">JPEG has no transparency; transparent areas export white.</p>
		{:else}
			<label class="flex items-center justify-between cursor-pointer" for="export-fill">
				<span class="text-sm text-white/80">Fill transparency with white</span>
				<input id="export-fill" type="checkbox" class="toggle toggle-sm toggle-primary" bind:checked={fillTransparency} />
			</label>
		{/if}
		{#if extractedPalette && extractedPalette.length > 0}
			<label class="flex items-center justify-between cursor-pointer" for="export-palette">
				<span class="text-sm text-white/80">Also save the palette (JSON)</span>
				<input id="export-palette" type="checkbox" class="toggle toggle-sm toggle-accent" bind:checked={embedPalette} />
			</label>
		{/if}
	</div>

	<div class="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
		<div class="flex items-center justify-between">
			<span>Output size</span>
			<span class="font-mono text-sm text-white tabular-nums">
				{Math.round(outputSize.width * scale)} × {Math.round(outputSize.height * scale)} px
			</span>
		</div>
		{#if isSourceDownscaled}
			<p class="mt-2 flex gap-1.5 leading-relaxed">
				<Icon icon="material-symbols:info-outline" class="mt-0.5 h-4 w-4 shrink-0" />
				This image is larger than your GPU can edit, so it is edited and exported at a reduced size.
			</p>
		{/if}
	</div>

	<button
		class="btn btn-primary min-h-11 w-full gap-2 shadow-lg shadow-phoenix-primary/30"
		onclick={handleExport}
		disabled={isExporting}
		type="button"
	>
		{#if isExporting}
			<span class="loading loading-spinner loading-sm"></span>
			Exporting…
		{:else}
			<Icon icon="material-symbols:download" class="w-5 h-5" />
			Export image
		{/if}
	</button>
</div>
