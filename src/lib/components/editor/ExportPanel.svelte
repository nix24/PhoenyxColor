<script lang="ts">
import { app } from "$lib/stores/root.svelte";
import Icon from "@iconify/svelte";
import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
import { cn } from "$lib/utils/cn";

let { onExport } = $props<{ onExport: (options: ExportOptions) => void }>();

export interface ExportOptions {
	format: "png" | "jpeg" | "webp";
	scale: number;
	includeBackground: boolean;
}

let format = $state<"png" | "jpeg" | "webp">(
	(app.settings.state.exportPreferences.defaultFormat as "png" | "jpeg" | "webp") || "png",
);
let scale = $state(app.settings.state.exportPreferences.defaultScale || 1);
let includeBackground = $state(app.settings.state.exportPreferences.includeBackground ?? true);
let isExporting = $state(false);

async function handleExport() {
	isExporting = true;
	try {
		await onExport({ format, scale, includeBackground });
	} finally {
		isExporting = false;
	}
}
</script>

<GlassPanel class="p-4 w-full" intensity="medium">
	<div class="space-y-4">
		<h3 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
			<Icon icon="material-symbols:download" class="w-4 h-4" />
			Export Image
		</h3>

		<!-- Format -->
		<div class="space-y-1">
			<span class="text-xs text-white/70">Format</span>
			<div class="join w-full">
				{#each ["png", "jpeg", "webp"] as f}
					<button
						class={cn(
							"btn btn-sm join-item flex-1 border-white/10",
							format === f ? "btn-primary text-white" : "btn-ghost text-white/50"
						)}
						onclick={() => (format = f as any)}
					>
						{f.toUpperCase()}
					</button>
				{/each}
			</div>
		</div>

		<!-- Scale -->
		<div class="space-y-1">
			<div class="flex justify-between text-xs">
				<span class="text-white/70">Scale</span>
				<span class="text-white font-mono">{scale}x</span>
			</div>
			<input
				type="range"
				min="1"
				max="4"
				step="1"
				value={scale}
				class="range range-xs range-secondary"
				oninput={(e) => (scale = parseInt(e.currentTarget.value))}
			/>
			<div class="flex justify-between text-[10px] text-white/30 px-1">
				<span>1x</span>
				<span>2x</span>
				<span>3x</span>
				<span>4x</span>
			</div>
		</div>

		<!-- Background -->
		<div class="form-control">
			<label class="label cursor-pointer justify-start gap-3 p-0">
				<input
					type="checkbox"
					class="toggle toggle-sm toggle-accent"
					checked={includeBackground}
					onchange={(e) => (includeBackground = e.currentTarget.checked)}
				/>
				<span class="label-text text-white/70 text-xs">Include Background (if transparent)</span>
			</label>
		</div>

		<!-- Action -->
		<button
			class="btn btn-primary w-full gap-2 shadow-lg shadow-primary/20"
			onclick={handleExport}
			disabled={isExporting}
		>
			{#if isExporting}
				<span class="loading loading-spinner loading-sm"></span>
				Exporting...
			{:else}
				<Icon icon="material-symbols:save-alt" class="w-5 h-5" />
				Save Image
			{/if}
		</button>
	</div>
</GlassPanel>
