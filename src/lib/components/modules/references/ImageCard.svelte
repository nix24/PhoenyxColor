<script lang="ts">
import type { LibraryItem } from "$lib/features/references";
import type { ReferenceId } from "$lib/types/brands";
import Icon from "@iconify/svelte";
import ReferenceActionsMenu from "./ReferenceActionsMenu.svelte";

interface Props {
	item: LibraryItem;
	onEdit: (id: ReferenceId) => void;
	onDuplicate: (id: ReferenceId) => void;
	onDelete: (id: ReferenceId) => void;
}

const { item, onEdit, onDuplicate, onDelete }: Props = $props();

const reference = $derived(item.reference);

// Thumbnails are rendered with the edits baked in, so there is no filter or opacity to apply here.
let imageFailed = $state(false);
let actions: ReferenceActionsMenu | null = $state(null);
</script>

<article
	class="group relative rounded-xl border border-white/5 bg-white/5 transition-colors duration-200 hover:border-white/15"
	oncontextmenu={(e) => {
		e.preventDefault();
		actions?.openAt(e.clientX, e.clientY);
	}}
>
	<button
		type="button"
		class="block w-full overflow-hidden rounded-t-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phoenix-primary"
		onclick={() => onEdit(reference.id)}
		aria-label={`Edit ${reference.name}`}
	>
		<span class="relative block aspect-square overflow-hidden bg-checkered-sm">
			{#if imageFailed || !item.thumbnailUrl}
				<span class="flex h-full w-full flex-col items-center justify-center gap-2 bg-white/4 px-4 text-center text-white/60">
					<Icon icon="material-symbols:broken-image-outline" class="h-8 w-8" />
					<span class="text-xs">Preview unavailable</span>
				</span>
			{:else}
				<img
					src={item.thumbnailUrl}
					alt=""
					class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
					loading="lazy"
					onerror={() => (imageFailed = true)}
				/>
			{/if}
		</span>
	</button>

	<div class="flex items-center gap-1 py-0.5 pl-2.5 pr-0.5">
		<p class="min-w-0 flex-1 truncate text-xs text-text-muted transition-colors group-hover:text-white" title={reference.name}>
			{reference.name}
		</p>
		<ReferenceActionsMenu
			bind:this={actions}
			referenceName={reference.name}
			menuId={`reference-actions-${reference.id}`}
			class="pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100 pointer-fine:focus-visible:opacity-100"
			onOpen={() => onEdit(reference.id)}
			onDuplicate={() => onDuplicate(reference.id)}
			onDelete={() => onDelete(reference.id)}
		/>
	</div>
</article>

<style>
	/* Transparent thumbnails sit on a quiet checkerboard, as the editor canvas does. */
	.bg-checkered-sm {
		background-color: rgb(255 255 255 / 0.03);
		background-image:
			linear-gradient(45deg, rgb(255 255 255 / 0.05) 25%, transparent 25%),
			linear-gradient(-45deg, rgb(255 255 255 / 0.05) 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, rgb(255 255 255 / 0.05) 75%),
			linear-gradient(-45deg, transparent 75%, rgb(255 255 255 / 0.05) 75%);
		background-size: 16px 16px;
		background-position:
			0 0,
			0 8px,
			8px -8px,
			-8px 0;
	}
</style>
