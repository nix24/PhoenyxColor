<script lang="ts">
import type { LibraryItem } from "$lib/features/references";
import type { ReferenceId } from "$lib/types/brands";
import type { SortMode, ViewMode } from "$lib/types/image-editor";
import Icon from "@iconify/svelte";
import { cn } from "$lib/utils/cn";
import ImageCard from "./ImageCard.svelte";
import ReferenceActionsMenu from "./ReferenceActionsMenu.svelte";
import SkeletonCard from "$lib/components/ui/SkeletonCard.svelte";

interface Props {
	items: LibraryItem[];
	isLoading: boolean;
	loadError: string | null;
	isDragOver: boolean;
	onAddFiles: () => void;
	onClearAll: () => void;
	onEdit: (id: ReferenceId) => void;
	onDuplicate: (id: ReferenceId) => void;
	onDelete: (id: ReferenceId) => void;
	onRetry: () => void;
}

const {
	items,
	isLoading,
	loadError,
	isDragOver,
	onAddFiles,
	onClearAll,
	onEdit,
	onDuplicate,
	onDelete,
	onRetry,
}: Props = $props();

let listMenus: Record<string, ReferenceActionsMenu | null> = $state({});

let searchTerm = $state("");
let sortMode = $state<SortMode>("date");
let viewMode = $state<ViewMode>("grid");

const filteredItems = $derived.by(() => {
	let result = items;

	if (searchTerm.trim()) {
		const term = searchTerm.toLowerCase();
		result = result.filter(({ reference }) => reference.name.toLowerCase().includes(term));
	}

	result = [...result].sort((a, b) => {
		switch (sortMode) {
			case "name":
				return a.reference.name.localeCompare(b.reference.name);
			case "date":
				return b.reference.createdAt.localeCompare(a.reference.createdAt);
			default:
				return 0;
		}
	});

	return result;
});

const refCount = $derived(items.length);
</script>

<div class="flex flex-col h-full gap-3">
	<div class="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 @md:px-6 @md:pt-5">
		<h2 class="text-lg font-bold leading-tight tracking-wide text-white @md:text-xl">
			References
			{#if refCount > 0}
				<span class="ml-1.5 text-sm font-normal text-text-muted">({refCount})</span>
			{/if}
		</h2>

		{#if refCount > 0}
			<div class="flex items-center gap-1">
				<button
					class="btn btn-sm min-h-11 gap-1.5 border-none bg-linear-to-r from-phoenix-primary to-phoenix-violet text-white shadow-lg transition-shadow duration-300 hover:shadow-phoenix-primary/40"
					onclick={onAddFiles}
					type="button"
				>
					<Icon icon="material-symbols:add-photo-alternate" class="w-4 h-4" />
					Add images
				</button>
				<div class="dropdown dropdown-end">
					<div
						tabindex="0"
						role="button"
						class="flex h-11 w-11 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-phoenix-primary"
						aria-label="More library actions"
					>
						<Icon icon="material-symbols:more-vert" class="h-5 w-5" />
					</div>
					<ul class="dropdown-content menu z-40 mt-1 w-56 rounded-xl border border-white/10 bg-void-deep/95 p-1.5 shadow-2xl backdrop-blur-xl">
						<li>
							<button class="min-h-11 text-sm text-red-400 hover:bg-red-400/10 hover:text-red-300" onclick={onClearAll} type="button">
								<Icon icon="material-symbols:delete-sweep" class="h-4 w-4" />
								Remove all references
							</button>
						</li>
					</ul>
				</div>
			</div>
		{/if}
	</div>

	{#if refCount > 0}
		<div class="px-4 @md:px-6 grid grid-cols-[minmax(0,1fr)_auto] @sm:flex items-center gap-2 shrink-0">
			<div class="relative flex-1 col-span-2 @sm:col-span-1">
				<label for="reference-search" class="sr-only">Search references</label>
				<Icon icon="material-symbols:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
				<input
					id="reference-search"
					type="text"
					bind:value={searchTerm}
					placeholder="Search"
					class="w-full min-h-11 pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-text-muted focus:outline-none focus:border-phoenix-primary/60 focus-visible:outline-2 focus-visible:outline-phoenix-primary transition-colors"
				/>
			</div>

			<div class="relative">
				<select
					bind:value={sortMode}
					class="min-h-11 appearance-none rounded-lg border border-white/10 bg-white/5 py-2 pl-3 pr-8 text-sm text-text-muted cursor-pointer focus:outline-none focus:border-phoenix-primary/60 focus-visible:outline-2 focus-visible:outline-phoenix-primary"
					aria-label="Sort references"
				>
					<option value="date">Newest</option>
					<option value="name">A–Z</option>
				</select>
				<Icon icon="material-symbols:expand-more" class="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
			</div>

			<div class="flex border border-white/10 rounded-lg overflow-hidden">
				<button
					class={cn(
						"min-h-11 min-w-11 flex items-center justify-center text-xs transition-colors",
						viewMode === "grid" ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
					)}
					onclick={() => viewMode = "grid"}
					type="button"
					aria-pressed={viewMode === "grid"}
					aria-label="Grid view"
				>
					<Icon icon="material-symbols:grid-view" class="w-4 h-4" />
				</button>
				<button
					class={cn(
						"min-h-11 min-w-11 flex items-center justify-center text-xs transition-colors",
						viewMode === "list" ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
					)}
					onclick={() => viewMode = "list"}
					type="button"
					aria-pressed={viewMode === "list"}
					aria-label="List view"
				>
					<Icon icon="material-symbols:view-list" class="w-4 h-4" />
				</button>
			</div>
		</div>
	{/if}

	{#if loadError && items.length > 0 && !isLoading}
		<div role="alert" class="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-amber-100 @md:mx-6">
			<Icon icon="material-symbols:warning-outline" class="h-5 w-5 shrink-0" />
			<p class="min-w-0 flex-1 leading-relaxed">{loadError}</p>
			<button class="btn btn-sm btn-ghost shrink-0" type="button" onclick={onRetry}>Retry</button>
		</div>
	{/if}

	<div class="flex-1 overflow-hidden relative">
		{#if isLoading}
			<div class="h-full overflow-y-auto px-4 @md:px-6 pb-4">
				<div class="grid grid-cols-2 @lg:grid-cols-3 @2xl:grid-cols-4 @4xl:grid-cols-5 gap-3">
					{#each Array(8) as _, i}
						<div
							style:animation-delay="{i * 60}ms"
							class="stagger-item"
						>
							<SkeletonCard type="image" class="h-full" />
						</div>
					{/each}
				</div>
			</div>
		{:else if loadError && items.length === 0}
			<div class="flex items-center justify-center h-full p-6">
				<div role="alert" class="w-full max-w-md rounded-2xl border border-red-400/20 bg-red-400/8 p-6 text-center">
					<div class="w-12 h-12 rounded-xl bg-red-400/10 flex items-center justify-center mx-auto mb-4">
						<Icon icon="material-symbols:cloud-off" class="w-6 h-6 text-red-300" />
					</div>
					<h3 class="text-base font-semibold text-white">References unavailable</h3>
					<p class="mt-2 text-sm text-text-muted leading-relaxed">{loadError}</p>
					<button class="btn btn-sm btn-primary mt-5" type="button" onclick={onRetry}>
						<Icon icon="material-symbols:refresh" class="w-4 h-4" />
						Try again
					</button>
				</div>
			</div>
		{:else if filteredItems.length > 0}
			{#if viewMode === "grid"}
				<div class="h-full overflow-y-auto px-4 @md:px-6 pb-4 custom-scrollbar">
					<div class="grid grid-cols-2 @lg:grid-cols-3 @2xl:grid-cols-4 @4xl:grid-cols-5 gap-3">
						{#each filteredItems as item (item.reference.id)}
							<ImageCard {item} {onEdit} {onDuplicate} {onDelete} />
						{/each}

						<button
							class="aspect-square border-2 border-dashed border-white/10 hover:border-phoenix-primary/40 hover:bg-phoenix-primary/5 transition-colors duration-200 rounded-xl flex flex-col items-center justify-center gap-2 group focus-visible:outline-2 focus-visible:outline-phoenix-primary"
							onclick={onAddFiles}
							type="button"
						>
							<span class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-phoenix-primary/15 transition-colors">
								<Icon icon="material-symbols:add" class="w-5 h-5 text-text-muted group-hover:text-phoenix-primary transition-colors" />
							</span>
							<span class="text-xs text-text-muted group-hover:text-white transition-colors">Add more</span>
						</button>
					</div>
				</div>
			{:else}
				<div class="h-full overflow-y-auto px-4 @md:px-6 pb-4 custom-scrollbar">
					<div class="flex flex-col gap-1.5" role="list">
						{#each filteredItems as item (item.reference.id)}
							{@const reference = item.reference}
							<div
								class="group flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-white/5"
								role="listitem"
								oncontextmenu={(e) => {
									e.preventDefault();
									listMenus[reference.id]?.openAt(e.clientX, e.clientY);
								}}
							>
								<button
									class="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-phoenix-primary"
									onclick={() => onEdit(reference.id)}
									type="button"
								>
									<span class="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/5">
										<img src={item.thumbnailUrl} alt="" class="w-full h-full object-cover" loading="lazy" />
									</span>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-sm text-white/90">{reference.name}</span>
										<span class="block text-xs text-text-muted tabular-nums">{reference.width} × {reference.height}</span>
									</span>
								</button>
								<ReferenceActionsMenu
									bind:this={listMenus[reference.id]}
									referenceName={reference.name}
									menuId={`reference-list-actions-${reference.id}`}
									onOpen={() => onEdit(reference.id)}
									onDuplicate={() => onDuplicate(reference.id)}
									onDelete={() => onDelete(reference.id)}
								/>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{:else if refCount > 0 && searchTerm.trim()}
			<div class="flex items-center justify-center h-full p-6">
				<div class="text-center">
					<Icon icon="material-symbols:search-off" class="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
					<p class="text-sm text-text-muted">No references match "{searchTerm}"</p>
				</div>
			</div>
		{:else}
			<div class="flex items-center justify-center h-full p-6">
				<div
					class={cn(
						"w-full max-w-sm text-center transition-all duration-300",
						"p-8 @md:p-10 rounded-2xl border-2 border-dashed",
						"bg-white/2",
						isDragOver
							? "border-phoenix-primary bg-phoenix-primary/5 scale-[1.02]"
							: "border-white/8 hover:border-white/15"
					)}
				>
					<div class="w-16 h-16 rounded-2xl bg-linear-to-br from-phoenix-primary/15 to-phoenix-violet/15 flex items-center justify-center mx-auto mb-5">
						<Icon
							icon="material-symbols:add-photo-alternate"
							class={cn(
								"w-8 h-8 transition-colors duration-300",
								isDragOver ? "text-phoenix-primary" : "text-text-muted/60"
							)}
						/>
					</div>

					<h3 class="text-lg font-bold mb-1.5 text-white">Add your first reference</h3>
					<p class="text-sm text-text-muted mb-6 max-w-60 mx-auto leading-relaxed">
						Drop images here, or choose them from your device.
					</p>

					<button
						class="btn btn-sm min-h-11 btn-primary gap-1.5"
						type="button"
						onclick={onAddFiles}
					>
						<Icon icon="material-symbols:upload" class="w-4 h-4" />
						Choose files
					</button>

					<p class="text-xs text-text-muted mt-5 tracking-wide">
						JPG, PNG or WebP &middot; up to 50 MB each
					</p>
				</div>
			</div>
		{/if}
	</div>
</div>
