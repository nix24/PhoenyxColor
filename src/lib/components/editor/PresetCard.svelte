<script lang="ts">
	import type { FilterPreset } from "$lib/types/image-editor";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { buildReferenceFilterString } from "$lib/utils/image-filters";

	interface Props {
		preset: FilterPreset;
		imageSrc: string;
		isActive: boolean;
		onApply: (preset: FilterPreset) => void;
		onDelete: (id: string) => void;
	}

	const { preset, imageSrc, isActive, onApply, onDelete }: Props = $props();

	const previewFilter = $derived(buildReferenceFilterString(preset.settings));
</script>

<div class="relative group">
	<button
		class={cn(
			"w-full flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all duration-200",
			isActive
				? "bg-phoenix-primary/20 ring-2 ring-phoenix-primary/60 text-white"
				: "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
		)}
		onclick={() => onApply(preset)}
		title={preset.name}
	>
		<div class="w-full aspect-square rounded-md overflow-hidden bg-black/30">
			{#if preset.thumbnail}
				<img
					src={preset.thumbnail}
					alt={preset.name}
					class="w-full h-full object-cover"
					loading="lazy"
				/>
			{:else}
				<img
					src={imageSrc}
					alt={preset.name}
					class="w-full h-full object-cover"
					style:filter={previewFilter}
					loading="lazy"
				/>
			{/if}
		</div>
		<span class="text-[10px] font-medium truncate w-full text-center">{preset.name}</span>
	</button>
	<button
		class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
		onclick={(e) => {
			e.stopPropagation();
			onDelete(preset.id);
		}}
		title="Delete preset"
		type="button"
	>
		<Icon icon="material-symbols:close" class="w-3 h-3" />
	</button>
</div>
