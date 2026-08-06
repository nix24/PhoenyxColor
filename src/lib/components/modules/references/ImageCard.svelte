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

let imageFailed = $state(false);
let triedOriginal = $state(false);

function handleImageError(event: Event) {
	const image = event.currentTarget as HTMLImageElement;
	if (!triedOriginal && reference.thumbnailSrc && reference.thumbnailSrc !== reference.src) {
		triedOriginal = true;
		image.src = reference.src;
		return;
	}
	imageFailed = true;
}
</script>

<article
	class={cn(
		"group relative overflow-hidden rounded-xl transition-all duration-300",
		"bg-white/5 border border-white/5 hover:border-white/15",
		isFeatured && "@md:col-span-2 @md:row-span-2",
		isSelected && "ring-2 ring-phoenix-primary ring-offset-1 ring-offset-void"
	)}
	oncontextmenu={(e) => onContextMenu(e, reference)}
>
	<button
		type="button"
		class="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-primary"
		onclick={() => onEdit(reference.id)}
		aria-label={`Edit ${reference.name}`}
	></button>

	<!-- Image -->
	<div class={cn("relative overflow-hidden", isFeatured ? "aspect-4/3" : "aspect-square")}>
		{#if imageFailed}
			<div class="flex h-full w-full flex-col items-center justify-center gap-2 bg-white/4 px-4 text-center text-white/45" role="status">
				<Icon icon="material-symbols:broken-image-outline" class="h-8 w-8" />
				<span class="text-xs">Preview unavailable</span>
			</div>
		{:else}
			<img
				src={reference.thumbnailSrc || reference.src}
				alt={reference.name}
				class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
				style:opacity={reference.opacity}
				style:filter={buildReferenceFilterString(reference)}
				loading="lazy"
				onerror={handleImageError}
			/>
		{/if}

		<!-- Bottom gradient -->
		<div class="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/70 to-transparent"></div>

		<!-- Action buttons -->
		<div class="absolute right-2 top-2 z-20 flex gap-1 opacity-100 transition-opacity duration-200 @md:pointer-events-none @md:opacity-0 @md:group-hover:pointer-events-auto @md:group-hover:opacity-100 @md:group-focus-within:pointer-events-auto @md:group-focus-within:opacity-100">
			<button
				class="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-white/80 backdrop-blur-sm transition-all hover:bg-black/80 hover:text-white"
				onclick={(e) => {
					e.stopPropagation();
					onDuplicate(reference.id);
				}}
				aria-label={`Duplicate ${reference.name}`}
				type="button"
			>
				<Icon icon="material-symbols:content-copy" class="h-4 w-4" />
			</button>
			<button
				class="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-white/80 backdrop-blur-sm transition-all hover:bg-red-400/20 hover:text-red-300"
				onclick={(e) => {
					e.stopPropagation();
					onDelete(reference.id);
				}}
				aria-label={`Delete ${reference.name}`}
				type="button"
			>
				<Icon icon="material-symbols:delete-outline" class="h-4 w-4" />
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
	<div class="flex items-center gap-2 px-2.5 py-2">
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
</article>
