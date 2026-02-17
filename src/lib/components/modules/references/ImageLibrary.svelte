<script lang="ts">
	import type { ValidatedReferenceImage } from "$lib/schemas/validation";
	import type { SortMode, ViewMode } from "$lib/types/image-editor";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import ImageCard from "./ImageCard.svelte";
	import SkeletonCard from "$lib/components/ui/SkeletonCard.svelte";
	import { buildReferenceFilterString } from "$lib/utils/image-filters";

	interface Props {
		references: ValidatedReferenceImage[];
		selectedImageId: string | null;
		isLoading: boolean;
		isDragOver: boolean;
		onAddFiles: () => void;
		onClearAll: () => void;
		onEdit: (id: string) => void;
		onDuplicate: (id: string) => void;
		onDelete: (id: string) => void;
		onContextMenu: (e: MouseEvent, ref: ValidatedReferenceImage) => void;
	}

	const {
		references,
		selectedImageId,
		isLoading,
		isDragOver,
		onAddFiles,
		onClearAll,
		onEdit,
		onDuplicate,
		onDelete,
		onContextMenu,
	}: Props = $props();

	let searchTerm = $state("");
	let sortMode = $state<SortMode>("date");
	let viewMode = $state<ViewMode>("grid");

	const filteredReferences = $derived.by(() => {
		let result = references;

		// Filter by search
		if (searchTerm.trim()) {
			const term = searchTerm.toLowerCase();
			result = result.filter((ref) => ref.name.toLowerCase().includes(term));
		}

		// Sort
		result = [...result].sort((a, b) => {
			switch (sortMode) {
				case "name":
					return a.name.localeCompare(b.name);
				case "date":
					return b.createdAt.getTime() - a.createdAt.getTime();
				case "recent":
					return b.createdAt.getTime() - a.createdAt.getTime();
				default:
					return 0;
			}
		});

		return result;
	});

	const refCount = $derived(references.length);
</script>

<div class="flex flex-col h-full gap-3">
	<!-- Header -->
	<div class="flex flex-col @md:flex-row @md:items-center justify-between px-4 pt-4 @md:px-6 @md:pt-5 gap-3 shrink-0">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-linear-to-br from-phoenix-primary/20 to-phoenix-violet/20 flex items-center justify-center shrink-0">
				<Icon icon="material-symbols:photo-library" class="w-5 h-5 text-phoenix-primary" />
			</div>
			<div>
				<h2 class="text-lg @md:text-xl font-bold text-white tracking-wide leading-tight">
					References
					{#if refCount > 0}
						<span class="text-sm font-normal text-text-muted ml-1.5">({refCount})</span>
					{/if}
				</h2>
				<p class="text-xs text-text-muted/70 mt-0.5">
					Click to edit &middot; Right-click for options
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				class="btn btn-sm gap-1.5 border-none bg-linear-to-r from-phoenix-primary to-phoenix-violet text-white shadow-lg hover:shadow-phoenix-primary/40 transition-all duration-300"
				onclick={onAddFiles}
				type="button"
			>
				<Icon icon="material-symbols:add-photo-alternate" class="w-4 h-4" />
				<span class="hidden @sm:inline">Add Images</span>
				<span class="@sm:hidden">Add</span>
			</button>

			{#if refCount > 0}
				<button
					class="btn btn-sm btn-ghost text-white/50 hover:text-red-400 hover:bg-red-400/10 gap-1.5"
					onclick={onClearAll}
					type="button"
					title="Clear all references"
				>
					<Icon icon="material-symbols:delete-sweep" class="w-4 h-4" />
					<span class="hidden @md:inline">Clear</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Search & Controls -->
	{#if refCount > 0}
		<div class="px-4 @md:px-6 flex items-center gap-2 shrink-0">
			<!-- Search -->
			<div class="relative flex-1">
				<Icon icon="material-symbols:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/50" />
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search images..."
					class="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/5 rounded-lg text-white placeholder:text-text-muted/40 focus:outline-none focus:border-phoenix-primary/40 transition-colors"
				/>
			</div>

			<!-- Sort -->
			<select
				bind:value={sortMode}
				class="px-2 py-2 text-xs bg-white/5 border border-white/5 rounded-lg text-text-muted focus:outline-none focus:border-phoenix-primary/40 cursor-pointer"
				aria-label="Sort images by"
			>
				<option value="date">Newest</option>
				<option value="name">A-Z</option>
			</select>

			<!-- View Toggle -->
			<div class="flex border border-white/5 rounded-lg overflow-hidden">
				<button
					class={cn(
						"px-2 py-1.5 text-xs transition-colors",
						viewMode === "grid" ? "bg-white/10 text-white" : "text-text-muted/50 hover:text-white"
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
						"px-2 py-1.5 text-xs transition-colors",
						viewMode === "list" ? "bg-white/10 text-white" : "text-text-muted/50 hover:text-white"
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

	<!-- Content -->
	<div class="flex-1 overflow-hidden relative">
		{#if isLoading}
			<div class="h-full overflow-y-auto px-4 @md:px-6 pb-4">
				<div class="grid grid-cols-2 @sm:grid-cols-3 @md:grid-cols-4 @lg:grid-cols-5 gap-3">
					{#each Array(8) as _, i}
						<div
							style:animation-delay="{i * 60}ms"
							class={cn("stagger-item", i === 0 && "@md:col-span-2 @md:row-span-2")}
						>
							<SkeletonCard type="image" class="h-full" />
						</div>
					{/each}
				</div>
			</div>
		{:else if filteredReferences.length > 0}
			{#if viewMode === "grid"}
				<!-- Grid View -->
				<div class="h-full overflow-y-auto px-4 @md:px-6 pb-4 custom-scrollbar">
					<div class="grid grid-cols-2 @sm:grid-cols-3 @md:grid-cols-4 @lg:grid-cols-5 gap-3">
						{#each filteredReferences as reference, idx (reference.id)}
							<ImageCard
								{reference}
								isSelected={selectedImageId === reference.id}
								isFeatured={idx === 0 && filteredReferences.length > 4}
								{onEdit}
								{onDuplicate}
								{onDelete}
								{onContextMenu}
							/>
						{/each}

						<!-- Add More Card -->
						<div
							class="aspect-square border-2 border-dashed border-white/8 hover:border-phoenix-primary/40 hover:bg-phoenix-primary/5 transition-all duration-300 cursor-pointer rounded-xl flex items-center justify-center group"
							onclick={onAddFiles}
							role="button"
							tabindex="0"
							onkeydown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onAddFiles();
								}
							}}
						>
							<div class="text-center">
								<div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2 group-hover:bg-phoenix-primary/15 transition-colors">
									<Icon
										icon="material-symbols:add"
										class="w-5 h-5 text-text-muted/60 group-hover:text-phoenix-primary transition-colors"
									/>
								</div>
								<p class="text-[11px] text-text-muted/50 group-hover:text-text-muted transition-colors">
									Add more
								</p>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<!-- List View -->
				<div class="h-full overflow-y-auto px-4 @md:px-6 pb-4 custom-scrollbar">
					<div class="flex flex-col gap-1.5">
						{#each filteredReferences as reference (reference.id)}
							{@const isSelected = selectedImageId === reference.id}
							<div
								class={cn(
									"group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200",
									"hover:bg-white/5",
									isSelected && "bg-phoenix-primary/10 border border-phoenix-primary/20"
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
								<!-- Thumbnail -->
								<div class="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/5">
									<img
										src={reference.thumbnailSrc || reference.src}
										alt={reference.name}
										class="w-full h-full object-cover"
										style:filter={buildReferenceFilterString(reference)}
										loading="lazy"
									/>
								</div>

								<!-- Info -->
								<div class="flex-1 min-w-0">
									<p class={cn(
										"text-sm truncate",
										isSelected ? "text-phoenix-primary font-medium" : "text-white/80"
									)}>
										{reference.name}
									</p>
									<p class="text-[10px] text-text-muted/50">
										{reference.dimensions ? `${reference.dimensions.width}×${reference.dimensions.height}` : "Image"}
									</p>
								</div>

								<!-- Actions -->
								<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button
										class="w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
										onclick={(e) => {
											e.stopPropagation();
											onDuplicate(reference.id);
										}}
										type="button"
										title="Duplicate"
									>
										<Icon icon="material-symbols:content-copy" class="w-3.5 h-3.5" />
									</button>
									<button
										class="w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
										onclick={(e) => {
											e.stopPropagation();
											onDelete(reference.id);
										}}
										type="button"
										title="Delete"
									>
										<Icon icon="material-symbols:delete-outline" class="w-3.5 h-3.5" />
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{:else if refCount > 0 && searchTerm.trim()}
			<!-- No search results -->
			<div class="flex items-center justify-center h-full p-6">
				<div class="text-center">
					<Icon icon="material-symbols:search-off" class="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
					<p class="text-sm text-text-muted/60">No images match "{searchTerm}"</p>
				</div>
			</div>
		{:else}
			<!-- Empty State -->
			<div class="flex items-center justify-center h-full p-6">
				<div
					class={cn(
						"w-full max-w-sm text-center cursor-pointer transition-all duration-300",
						"p-8 @md:p-10 rounded-2xl border-2 border-dashed",
						"bg-white/2",
						isDragOver
							? "border-phoenix-primary bg-phoenix-primary/5 scale-[1.02]"
							: "border-white/8 hover:border-white/15"
					)}
					onclick={onAddFiles}
					onkeydown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onAddFiles();
						}
					}}
					role="button"
					tabindex="0"
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

					<h3 class="text-lg font-bold mb-1.5 text-white">Add References</h3>
					<p class="text-sm text-text-muted/70 mb-6 max-w-[240px] mx-auto leading-relaxed">
						Drop images here or click to browse your files
					</p>

					<button
						class="btn btn-sm btn-primary gap-1.5"
						type="button"
					>
						<Icon icon="material-symbols:upload" class="w-4 h-4" />
						Choose Files
					</button>

					<p class="text-[10px] text-text-muted/40 mt-5 tracking-wide">
						JPG, PNG, GIF, WebP, SVG &middot; Up to 50MB
					</p>
				</div>
			</div>
		{/if}
	</div>
</div>
