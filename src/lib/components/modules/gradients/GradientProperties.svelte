<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import Icon from "@iconify/svelte";
	import type { InterpolationMode } from "./gradient-utils";
	import { generateCSSGradient } from "./gradient-utils";
	import { toast } from "svelte-sonner";
	import GradientControls from "./GradientControls.svelte";

	interface Props {
		interpolationMode: InterpolationMode;
		onInterpolationModeChange: (mode: InterpolationMode) => void;
		onExport: () => void;
		onDelete: () => void;
	}

	let { interpolationMode, onInterpolationModeChange, onExport, onDelete } = $props();

	let colorPickerValue = $state("#3b82f6");

	// Safe access to active gradient
	let activeGradient = $derived(app.gradients.activeGradient);

	let cssOutput = $derived(
		activeGradient ? generateCSSGradient(activeGradient, interpolationMode) : ""
	);
</script>

<div class="flex flex-col h-full gap-4 w-full overflow-y-auto custom-scrollbar">
	<div class="flex items-center justify-between">
		<div class="text-xs font-bold text-text-muted uppercase tracking-wider">Properties</div>
		{#if activeGradient}
			<button
				class="btn btn-xs btn-ghost text-error hover:bg-error/10"
				onclick={onDelete}
				title="Delete gradient"
			>
				<Icon icon="material-symbols:delete-outline" class="w-4 h-4" />
			</button>
		{/if}
	</div>

	{#if activeGradient}
		<!-- Gradient Info -->
		<div class="text-sm text-white mb-2">
			<span class="font-semibold">{activeGradient.name}</span>
			<span class="text-text-muted/60 ml-1">({activeGradient.type})</span>
		</div>

		<!-- Full Gradient Controls from original component -->
		<GradientControls
			gradient={activeGradient}
			{interpolationMode}
			{onInterpolationModeChange}
			{colorPickerValue}
			onColorPickerChange={(color) => (colorPickerValue = color)}
		/>

		<div class="w-full h-px bg-white/5 my-2"></div>

		<!-- CSS Output -->
		<section class="mt-auto">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-bold text-text-muted uppercase tracking-wider">CSS Output</span>
				<button
					class="text-phoenix-primary hover:text-white transition-colors"
					onclick={() => {
						navigator.clipboard
							.writeText(`background: ${cssOutput};`)
							.then(() => toast.success("CSS copied!"))
							.catch(() => toast.error("Failed to copy"));
					}}
				>
					<Icon icon="material-symbols:content-copy" class="text-sm" />
				</button>
			</div>
			<div
				class="bg-black/40 rounded-xl p-3 border border-white/5 font-mono text-[10px] text-text-muted/80 break-all leading-relaxed max-h-24 overflow-y-auto custom-scrollbar relative group"
			>
				<div
					class="absolute top-2 left-2 w-1 h-full bg-linear-to-b from-phoenix-primary to-transparent opacity-50"
				></div>
				<div class="pl-2">
					<span class="text-phoenix-violet">background</span>: {cssOutput};
				</div>
			</div>
		</section>

		<!-- Export Action -->
		<button
			class="btn btn-primary w-full bg-linear-to-r from-phoenix-primary to-phoenix-rose border-none shadow-lg shadow-phoenix-primary/20 hover:shadow-phoenix-primary/40 text-white font-bold tracking-wide mt-2"
			onclick={onExport}
		>
			<Icon icon="material-symbols:download" class="text-lg" />
			Export
		</button>
	{:else}
		<div
			class="flex-1 flex items-center justify-center text-text-muted/40 text-sm text-center px-4"
		>
			Select a gradient from the library to edit its properties
		</div>
	{/if}
</div>
