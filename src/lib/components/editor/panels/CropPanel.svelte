<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import type { CropGuideType } from "$lib/types/image-editor";

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
		guideType = "thirds",
		onCropChange,
		onAspectRatioChange,
		onGuideTypeChange,
		onApplyCrop,
		onCancelCrop,
		onExtractFromRegion,
		imageWidth,
		imageHeight,
	} = $props<{
		cropRect: CropRect | null;
		aspectRatio: AspectRatio;
		guideType: CropGuideType;
		onCropChange: (rect: CropRect) => void;
		onAspectRatioChange: (ratio: AspectRatio) => void;
		onGuideTypeChange: (guide: CropGuideType) => void;
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

	const guideTypes: Array<{ id: CropGuideType; label: string; icon: string }> = [
		{ id: "none", label: "None", icon: "material-symbols:grid-off" },
		{ id: "thirds", label: "Thirds", icon: "material-symbols:grid-on" },
		{ id: "golden", label: "Golden", icon: "material-symbols:filter-hdr" },
		{ id: "diagonal", label: "Diagonal", icon: "material-symbols:texture" },
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

	function flipCrop() {
		if (!cropRect) return;
		const centerX = cropRect.x + cropRect.width / 2;
		const centerY = cropRect.y + cropRect.height / 2;
		const newWidth = cropRect.height;
		const newHeight = cropRect.width;
		onCropChange({
			x: Math.max(0, Math.min(centerX - newWidth / 2, imageWidth - newWidth)),
			y: Math.max(0, Math.min(centerY - newHeight / 2, imageHeight - newHeight)),
			width: Math.min(newWidth, imageWidth),
			height: Math.min(newHeight, imageHeight),
		});
	}

	function handleDimensionInput(field: "width" | "height", value: string) {
		const num = parseInt(value, 10);
		if (isNaN(num) || num <= 0) return;
		if (!cropRect) {
			const w = field === "width" ? Math.min(num, imageWidth) : Math.min(num, imageWidth);
			const h = field === "height" ? Math.min(num, imageHeight) : Math.min(num, imageHeight);
			onCropChange({ x: 0, y: 0, width: w, height: h });
			return;
		}
		const clamped = field === "width"
			? Math.min(num, imageWidth - cropRect.x)
			: Math.min(num, imageHeight - cropRect.y);
		onCropChange({ ...cropRect, [field]: Math.max(1, clamped) });
	}

	const cropDimensions = $derived(
		cropRect
			? { w: Math.round(cropRect.width), h: Math.round(cropRect.height) }
			: { w: imageWidth, h: imageHeight }
	);
</script>

<div class="space-y-5">
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

	<!-- Guide Type -->
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Guide Overlay</h4>
		<div class="grid grid-cols-4 gap-2">
			{#each guideTypes as guide}
				<button
					class={cn(
						"flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200",
						guideType === guide.id
							? "bg-phoenix-primary text-white"
							: "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
					)}
					onclick={() => onGuideTypeChange(guide.id)}
				>
					<Icon icon={guide.icon} class="w-4 h-4" />
					<span class="text-[10px] font-medium">{guide.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Quick Actions</h4>
		<div class="grid grid-cols-3 gap-2">
			<button
				class="btn btn-sm bg-white/5 border-white/10 text-white hover:bg-white/10"
				onclick={setFullCrop}
			>
				<Icon icon="material-symbols:fullscreen" class="w-4 h-4" />
				Full
			</button>
			<button
				class="btn btn-sm bg-white/5 border-white/10 text-white hover:bg-white/10"
				onclick={setCenterCrop}
			>
				<Icon icon="material-symbols:center-focus-strong" class="w-4 h-4" />
				Center
			</button>
			<button
				class="btn btn-sm bg-white/5 border-white/10 text-white hover:bg-white/10"
				onclick={flipCrop}
				disabled={!cropRect}
			>
				<Icon icon="material-symbols:swap-horiz" class="w-4 h-4" />
				Flip
			</button>
		</div>
	</div>

	<!-- Numeric Dimensions -->
	<div class="space-y-3">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider">Dimensions</h4>
		<div class="grid grid-cols-2 gap-3">
			<div class="space-y-1">
				<label for="crop-width" class="text-[10px] text-white/40 uppercase">Width</label>
				<input
					id="crop-width"
					type="number"
					class="input input-sm w-full bg-white/5 border-white/10 text-white font-mono text-sm"
					value={cropDimensions.w}
					min="1"
					max={imageWidth}
					onchange={(e) => handleDimensionInput("width", e.currentTarget.value)}
				/>
			</div>
			<div class="space-y-1">
				<label for="crop-height" class="text-[10px] text-white/40 uppercase">Height</label>
				<input
					id="crop-height"
					type="number"
					class="input input-sm w-full bg-white/5 border-white/10 text-white font-mono text-sm"
					value={cropDimensions.h}
					min="1"
					max={imageHeight}
					onchange={(e) => handleDimensionInput("height", e.currentTarget.value)}
				/>
			</div>
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
