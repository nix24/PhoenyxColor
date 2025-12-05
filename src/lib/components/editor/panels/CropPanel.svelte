<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";

	export interface CropRect {
		x: number;
		y: number;
		width: number;
		height: number;
	}

	export type AspectRatio = "free" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "3:2" | "2:3";

	let {
		cropRect,
		aspectRatio = "free",
		onCropChange,
		onAspectRatioChange,
		onApplyCrop,
		onCancelCrop,
		onExtractFromRegion,
		imageWidth,
		imageHeight,
	} = $props<{
		cropRect: CropRect | null;
		aspectRatio: AspectRatio;
		onCropChange: (rect: CropRect) => void;
		onAspectRatioChange: (ratio: AspectRatio) => void;
		onApplyCrop: () => void;
		onCancelCrop: () => void;
		onExtractFromRegion: () => void;
		imageWidth: number;
		imageHeight: number;
	}>();

	const aspectRatios: Array<{ id: AspectRatio; label: string; icon: string }> = [
		{ id: "free", label: "Free", icon: "material-symbols:crop-free" },
		{ id: "1:1", label: "1:1", icon: "material-symbols:crop-square" },
		{ id: "4:3", label: "4:3", icon: "material-symbols:crop-landscape" },
		{ id: "3:4", label: "3:4", icon: "material-symbols:crop-portrait" },
		{ id: "16:9", label: "16:9", icon: "material-symbols:crop-16-9" },
		{ id: "9:16", label: "9:16", icon: "material-symbols:crop-9-16" },
		{ id: "3:2", label: "3:2", icon: "material-symbols:crop-3-2" },
		{ id: "2:3", label: "2:3", icon: "material-symbols:crop-portrait" },
	];

	function setFullCrop() {
		onCropChange({ x: 0, y: 0, width: imageWidth, height: imageHeight });
	}

	function setCenterCrop() {
		const size = Math.min(imageWidth, imageHeight) * 0.8;
		onCropChange({
			x: (imageWidth - size) / 2,
			y: (imageHeight - size) / 2,
			width: size,
			height: size,
		});
	}

	// Dimensions display
	const cropDimensions = $derived(
		cropRect
			? `${Math.round(cropRect.width)} × ${Math.round(cropRect.height)}px`
			: `${imageWidth} × ${imageHeight}px`
	);
</script>

<div class="space-y-6">
	<!-- Aspect Ratio Selection -->
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Aspect Ratio</h4>
		<div class="grid grid-cols-4 gap-2">
			{#each aspectRatios as ratio}
				<button
					class={cn(
						"flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200",
						aspectRatio === ratio.id
							? "bg-phoenix-primary text-white"
							: "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
					)}
					onclick={() => onAspectRatioChange(ratio.id)}
				>
					<Icon icon={ratio.icon} class="w-5 h-5" />
					<span class="text-[10px] font-medium">{ratio.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Quick Actions</h4>
		<div class="grid grid-cols-2 gap-2">
			<button
				class="btn btn-sm bg-white/5 border-white/10 text-white hover:bg-white/10"
				onclick={setFullCrop}
			>
				<Icon icon="material-symbols:fullscreen" class="w-4 h-4" />
				Full Image
			</button>
			<button
				class="btn btn-sm bg-white/5 border-white/10 text-white hover:bg-white/10"
				onclick={setCenterCrop}
			>
				<Icon icon="material-symbols:center-focus-strong" class="w-4 h-4" />
				Center
			</button>
		</div>
	</div>

	<!-- Current Dimensions -->
	<div class="p-3 bg-white/5 rounded-lg border border-white/10">
		<div class="flex items-center justify-between">
			<span class="text-xs text-white/60">Selection Size</span>
			<span class="text-sm font-mono text-phoenix-primary">{cropDimensions}</span>
		</div>
	</div>

	<!-- Extract Palette from Region -->
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Color Extraction</h4>
		<button
			class="btn btn-sm w-full bg-phoenix-violet/20 border-phoenix-violet/30 text-phoenix-violet hover:bg-phoenix-violet/30"
			onclick={onExtractFromRegion}
			disabled={!cropRect}
		>
			<Icon icon="material-symbols:colorize" class="w-4 h-4" />
			Extract Palette from Selection
		</button>
		{#if !cropRect}
			<p class="text-xs text-white/40 text-center">Draw a selection first</p>
		{/if}
	</div>

	<!-- Action Buttons -->
	<div class="flex gap-2 pt-4 border-t border-white/10">
		<button class="btn btn-sm flex-1 btn-ghost text-white/60" onclick={onCancelCrop}>
			Cancel
		</button>
		<button class="btn btn-sm flex-1 btn-primary" onclick={onApplyCrop} disabled={!cropRect}>
			<Icon icon="material-symbols:check" class="w-4 h-4" />
			Apply Crop
		</button>
	</div>
</div>
