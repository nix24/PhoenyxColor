<script lang="ts">
	import type { ValidatedReferenceImage } from "$lib/schemas/validation";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { buildReferenceFilterString } from "$lib/utils/image-filters";

	interface Props {
		reference: ValidatedReferenceImage;
		isSelected: boolean;
		isFeatured?: boolean;
		onEdit: (id: string) => void;
		onDuplicate: (id: string) => void;
		onDelete: (id: string) => void;
		onContextMenu: (e: MouseEvent, ref: ValidatedReferenceImage) => void;
	}

	const {
		reference,
		isSelected,
		isFeatured = false,
		onEdit,
		onDuplicate,
		onDelete,
		onContextMenu,
	}: Props = $props();
</script>

<div
	class={cn(
		"group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
		"bg-white/5 border border-white/5 hover:border-white/15",
		isFeatured && "@md:col-span-2 @md:row-span-2",
		isSelected && "ring-2 ring-phoenix-primary ring-offset-1 ring-offset-void"
	)}
	onclick={() => onEdit(reference.id)}
	oncontextmenu={(e) => onContextMenu(e, reference)}
	role="button"
	tabindex="0"
	onkeydown={(e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onEdit(reference.id);
		}
	}}
>
	<!-- Image -->
	<div class={cn("relative overflow-hidden", isFeatured ? "aspect-4/3" : "aspect-square")}>
		<img
			src={reference.thumbnailSrc || reference.src}
			alt={reference.name}
			class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
			style:opacity={reference.opacity}
			style:filter={buildReferenceFilterString(reference)}
			loading="lazy"
		/>

		<!-- Bottom gradient -->
		<div class="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/70 to-transparent"></div>

		<!-- Action buttons -->
		<div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
			<button
				class="w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all"
				onclick={(e) => {
					e.stopPropagation();
					onDuplicate(reference.id);
				}}
				title="Duplicate"
				type="button"
			>
				<Icon icon="material-symbols:content-copy" class="w-3.5 h-3.5" />
			</button>
			<button
				class="w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/80 hover:text-red-400 hover:bg-red-400/20 transition-all"
				onclick={(e) => {
					e.stopPropagation();
					onDelete(reference.id);
				}}
				title="Delete"
				type="button"
			>
				<Icon icon="material-symbols:close" class="w-3.5 h-3.5" />
			</button>
		</div>

		<!-- Selected indicator -->
		{#if isSelected}
			<div class="absolute top-2 left-2">
				<div class="w-6 h-6 rounded-full bg-phoenix-primary flex items-center justify-center shadow-lg">
					<Icon icon="material-symbols:check" class="w-4 h-4 text-white" />
				</div>
			</div>
		{/if}
	</div>

	<!-- Image name -->
	<div class="px-2.5 py-2 flex items-center gap-2">
		<p
			class={cn(
				"text-xs truncate flex-1 transition-colors",
				isSelected ? "text-phoenix-primary font-medium" : "text-text-muted group-hover:text-white"
			)}
			title={reference.name}
		>
			{reference.name}
		</p>
		<Icon
			icon="material-symbols:edit"
			class="w-3.5 h-3.5 text-white/30 shrink-0 @md:hidden"
		/>
	</div>
</div>
