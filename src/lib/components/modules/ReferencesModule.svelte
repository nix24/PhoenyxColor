<script lang="ts">
	import { onMount } from "svelte";
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedReferenceImage } from "$lib/schemas/validation";
	import type { ReferenceId } from "$lib/types/brands";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import { performanceService } from "$lib/services/performance";
	import SkeletonCard from "$lib/components/ui/SkeletonCard.svelte";
	import { cn } from "$lib/utils/cn";
	import ImageEditor from "$lib/components/modules/references/ImageEditor.svelte";

	let fileInput: HTMLInputElement;
	let isDragOver = $state(false);
	let uploadProgress: Record<string, number> = $state({});
	let selectedImageId: string | null = $state(null);
	let showControls = $state(false);

	// Initial loading state for skeleton display
	let isLoading = $state(true);

	onMount(() => {
		const timer = setTimeout(() => {
			isLoading = false;
		}, 400);
		return () => clearTimeout(timer);
	});

	// File validation constants
	const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
	const ALLOWED_TYPES = [
		"image/jpeg",
		"image/png",
		"image/gif",
		"image/webp",
		"image/bmp",
		"image/svg+xml",
	];
	const MAX_FILES_AT_ONCE = 20;

	// Container query width tracking
	let containerWidth = $state(0);

	// Context menu state for mobile long-press
	let contextMenuTarget: ValidatedReferenceImage | null = $state(null);
	let contextMenuPos = $state({ x: 0, y: 0 });

	function validateFile(file: File): { valid: boolean; error?: string } {
		if (!ALLOWED_TYPES.includes(file.type)) {
			return { valid: false, error: `Unsupported file type: ${file.type}` };
		}

		if (file.size > MAX_FILE_SIZE) {
			return {
				valid: false,
				error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 50MB)`,
			};
		}

		return { valid: true };
	}

	function handleFileSelect(event: Event) {
		const files = (event.target as HTMLInputElement).files;
		if (files) {
			addFiles(Array.from(files));
		}
		// Reset input to allow re-selecting same file
		if (event.target) {
			(event.target as HTMLInputElement).value = "";
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;

		const files = event.dataTransfer?.files;
		if (files) {
			addFiles(Array.from(files));
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (!event.dataTransfer) return;
		event.dataTransfer.dropEffect = "copy";
		isDragOver = true;
	}

	function handleDragLeave(event: DragEvent) {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = event.clientX;
		const y = event.clientY;

		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
			isDragOver = false;
		}
	}

	function handleDropZoneKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			fileInput.click();
		}
	}

	async function addFiles(files: File[]) {
		if (files.length > MAX_FILES_AT_ONCE) {
			toast.error(`Please select no more than ${MAX_FILES_AT_ONCE} files at once`);
			return;
		}

		const validFiles: File[] = [];
		let invalidCount = 0;

		for (const file of files) {
			const validation = validateFile(file);
			if (!validation.valid) {
				toast.error(`${file.name}: ${validation.error}`);
				invalidCount++;
				continue;
			}

			validFiles.push(file);
		}

		if (invalidCount > 0) {
			toast.error(`${invalidCount} file(s) were invalid and skipped`);
		}

		if (validFiles.length === 0) {
			return;
		}

		for (const file of validFiles) {
			await processFile(file);
		}

		toast.success(`Added ${validFiles.length} reference image(s)`);
	}

	async function processFile(file: File): Promise<void> {
		const progressId = `${file.name}-${Date.now()}`;
		uploadProgress[progressId] = 0;

		try {
			const { optimized, thumbnail } = await performanceService.optimizeImage(file, {
				maxWidth: 1920,
				maxHeight: 1080,
				quality: 0.85,
			});

			uploadProgress[progressId] = 50;

			const imageUrl = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result as string);
				reader.onerror = () => reject(new Error("Failed to read optimized image"));
				reader.readAsDataURL(optimized);
			});

			uploadProgress[progressId] = 80;

			app.references.add({
				src: imageUrl,
				thumbnailSrc: thumbnail,
				name: file.name.replace(/\.[^/.]+$/, ""),
				position: { x: 50, y: 50 },
				scale: 1,
				rotation: 0,
				opacity: 1,
				isGrayscale: false,
				brightness: 100,
				contrast: 100,
				saturation: 100,
				hueRotate: 0,
				blur: 0,
			});

			uploadProgress[progressId] = 100;
		} catch (error) {
			console.error("Error processing file:", error);
			toast.error(`Failed to process "${file.name}"`);
		} finally {
			setTimeout(() => {
				delete uploadProgress[progressId];
			}, 1000);
		}
	}

	function selectImage(id: string) {
		selectedImageId = selectedImageId === id ? null : id;
		if (selectedImageId) {
			showControls = true;
		} else {
			showControls = false;
		}
	}

	function removeReference(id: string) {
		const reference = app.references.references.find((ref) => ref.id === id);
		if (reference) {
			if (reference.src.startsWith("blob:")) {
				URL.revokeObjectURL(reference.src);
			}
			if (reference.thumbnailSrc?.startsWith("blob:")) {
				URL.revokeObjectURL(reference.thumbnailSrc);
			}

			app.references.remove(id);
			toast.info(`Removed "${reference.name}"`);

			if (selectedImageId === id) {
				selectedImageId = null;
				showControls = false;
			}
		}
		contextMenuTarget = null;
	}

	function clearAllReferences() {
		if (app.references.references.length === 0) return;

		const count = app.references.references.length;

		for (const ref of app.references.references) {
			if (ref.src.startsWith("blob:")) {
				URL.revokeObjectURL(ref.src);
			}
			if (ref.thumbnailSrc?.startsWith("blob:")) {
				URL.revokeObjectURL(ref.thumbnailSrc);
			}
			app.references.remove(ref.id);
		}

		selectedImageId = null;
		showControls = false;
		toast.success(`Cleared ${count} reference image(s)`);
	}

	function duplicateReference(id: string) {
		const reference = app.references.references.find((ref) => ref.id === id);
		if (reference) {
			app.references.add({
				...reference,
				name: `${reference.name} (Copy)`,
				position: {
					x: reference.position.x + 20,
					y: reference.position.y + 20,
				},
			});
			toast.success(`Duplicated "${reference.name}"`);
		}
		contextMenuTarget = null;
	}

	function handleImageClick(reference: ValidatedReferenceImage) {
		selectImage(reference.id);
	}

	function handleContextMenu(e: MouseEvent, reference: ValidatedReferenceImage) {
		e.preventDefault();
		contextMenuTarget = reference;
		contextMenuPos = { x: e.clientX, y: e.clientY };
	}

	function closeContextMenu() {
		contextMenuTarget = null;
	}

	function closeTransformModal() {
		showControls = false;
		selectedImageId = null;
	}

	function buildFilterString(reference: ValidatedReferenceImage): string {
		const filters: string[] = [];
		const ref = reference as Record<string, unknown>;

		if (reference.isGrayscale) filters.push("grayscale(100%)");
		if (reference.sepia) filters.push(`sepia(${reference.sepia}%)`);
		if (reference.invert) filters.push(`invert(${reference.invert}%)`);
		if (reference.brightness !== undefined && reference.brightness !== 100)
			filters.push(`brightness(${reference.brightness}%)`);
		if (reference.contrast !== undefined && reference.contrast !== 100)
			filters.push(`contrast(${reference.contrast}%)`);
		if (reference.saturation !== undefined && reference.saturation !== 100)
			filters.push(`saturate(${reference.saturation}%)`);
		if (reference.hueRotate !== undefined && reference.hueRotate !== 0)
			filters.push(`hue-rotate(${reference.hueRotate}deg)`);
		if (reference.blur !== undefined && reference.blur !== 0)
			filters.push(`blur(${reference.blur}px)`);

		const temp = ref.temperature as number | undefined;
		if (temp && temp !== 0) {
			if (temp > 0) {
				filters.push(`sepia(${Math.abs(temp) * 0.15}%)`);
			} else {
				filters.push(`hue-rotate(${temp * 0.3}deg)`);
			}
		}

		return filters.length > 0 ? filters.join(" ") : "none";
	}

	// Reference count for header display
	const refCount = $derived(app.references.references.length);
</script>

<div
	class="h-full flex flex-col gap-3 @container"
	bind:clientWidth={containerWidth}
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	onclick={closeContextMenu}
	onkeydown={(e) => e.key === "Escape" && closeContextMenu()}
	role="application"
	aria-label="Reference images"
>
	<!-- Module Header -->
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
				onclick={() => fileInput.click()}
				type="button"
			>
				<Icon icon="material-symbols:add-photo-alternate" class="w-4 h-4" />
				<span class="hidden @sm:inline">Add Images</span>
				<span class="@sm:hidden">Add</span>
			</button>

			{#if refCount > 0}
				<button
					class="btn btn-sm btn-ghost text-white/50 hover:text-red-400 hover:bg-red-400/10 gap-1.5"
					onclick={clearAllReferences}
					type="button"
					title="Clear all references"
				>
					<Icon icon="material-symbols:delete-sweep" class="w-4 h-4" />
					<span class="hidden @md:inline">Clear</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- Upload Progress -->
	{#if Object.keys(uploadProgress).length > 0}
		<div class="mx-4 @md:mx-6">
			<div class="p-3 rounded-xl bg-white/5 border border-white/5">
				<div class="flex items-center gap-2 text-xs text-text-muted mb-2">
					<span class="loading loading-spinner loading-xs text-phoenix-primary"></span>
					Uploading...
				</div>
				{#each Object.entries(uploadProgress) as [id, progress]}
					<div class="mb-1.5 last:mb-0">
						<div class="flex justify-between text-[10px] text-text-muted/60 mb-1">
							<span class="truncate max-w-[200px]">{id.split("-").at(0)}</span>
							<span class="font-mono">{progress}%</span>
						</div>
						<div class="w-full bg-black/30 rounded-full h-1 overflow-hidden">
							<div
								class="bg-phoenix-primary h-full rounded-full transition-all duration-300 ease-out"
								style:width="{progress}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Drag Overlay (appears over gallery when dragging files) -->
	{#if isDragOver}
		<div class="absolute inset-0 z-30 flex items-center justify-center bg-void-deep/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-phoenix-primary pointer-events-none">
			<div class="text-center">
				<Icon icon="material-symbols:cloud-upload" class="w-12 h-12 text-phoenix-primary mx-auto mb-3 animate-float" />
				<p class="text-lg font-bold text-white">Drop images here</p>
				<p class="text-xs text-text-muted mt-1">Up to {MAX_FILES_AT_ONCE} files, 50MB each</p>
			</div>
		</div>
	{/if}

	<!-- Main Content -->
	<div class="flex-1 overflow-hidden relative">
		{#if isLoading}
			<!-- Skeleton Loading State -->
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
		{:else if refCount > 0}
			<!-- Image Gallery -->
			<div class="h-full overflow-y-auto px-4 @md:px-6 pb-4 custom-scrollbar">
				<div class="grid grid-cols-2 @sm:grid-cols-3 @md:grid-cols-4 @lg:grid-cols-5 gap-3">
					{#each app.references.references as reference, idx (reference.id)}
						{@const isFeatured = idx === 0 && refCount > 4}
						{@const isSelected = selectedImageId === reference.id}
						<div
							class={cn(
								"group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
								"bg-white/5 border border-white/5 hover:border-white/15",
								isFeatured && "@md:col-span-2 @md:row-span-2",
								isSelected && "ring-2 ring-phoenix-primary ring-offset-1 ring-offset-void"
							)}
							onclick={() => handleImageClick(reference)}
							oncontextmenu={(e) => handleContextMenu(e, reference)}
							role="button"
							tabindex="0"
							onkeydown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									handleImageClick(reference);
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
									style:filter={buildFilterString(reference)}
									loading="lazy"
								/>

								<!-- Bottom gradient -->
								<div class="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/70 to-transparent"></div>

								<!-- Action buttons - visible on hover (desktop) or always visible via touch context menu -->
								<div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
									<button
										class="w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all"
										onclick={(e) => {
											e.stopPropagation();
											duplicateReference(reference.id);
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
											removeReference(reference.id);
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
								<!-- Mobile: always-visible edit icon -->
								<Icon
									icon="material-symbols:edit"
									class="w-3.5 h-3.5 text-white/30 shrink-0 @md:hidden"
								/>
							</div>
						</div>
					{/each}

					<!-- Add More Card -->
					<div
						class="aspect-square border-2 border-dashed border-white/8 hover:border-phoenix-primary/40 hover:bg-phoenix-primary/5 transition-all duration-300 cursor-pointer rounded-xl flex items-center justify-center group"
						onclick={() => fileInput.click()}
						role="button"
						tabindex="0"
						onkeydown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								fileInput.click();
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
					onclick={() => fileInput.click()}
					onkeydown={handleDropZoneKeydown}
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

	<!-- Context Menu (right-click / long-press on mobile) -->
	{#if contextMenuTarget}
		<div
			class="fixed z-50 min-w-[160px] py-1.5 bg-void-deep/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50"
			style:left="{contextMenuPos.x}px"
			style:top="{contextMenuPos.y}px"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === "Escape" && closeContextMenu()}
			role="menu"
			tabindex="-1"
		>
			<button
				class="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left"
				onclick={() => {
					if (contextMenuTarget) handleImageClick(contextMenuTarget);
					closeContextMenu();
				}}
				role="menuitem"
				type="button"
			>
				<Icon icon="material-symbols:edit" class="w-4 h-4 text-phoenix-primary" />
				Edit Image
			</button>
			<button
				class="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left"
				onclick={() => contextMenuTarget && duplicateReference(contextMenuTarget.id)}
				role="menuitem"
				type="button"
			>
				<Icon icon="material-symbols:content-copy" class="w-4 h-4 text-white/60" />
				Duplicate
			</button>
			<div class="h-px bg-white/5 my-1"></div>
			<button
				class="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors text-left"
				onclick={() => contextMenuTarget && removeReference(contextMenuTarget.id)}
				role="menuitem"
				type="button"
			>
				<Icon icon="material-symbols:delete-outline" class="w-4 h-4" />
				Delete
			</button>
		</div>
	{/if}

	<!-- Hidden file input -->
	<input
		bind:this={fileInput}
		type="file"
		multiple
		accept={ALLOWED_TYPES.join(",")}
		class="hidden"
		onchange={handleFileSelect}
	/>

	<!-- Image Editor Overlay -->
	{#if selectedImageId && showControls}
		<ImageEditor imageId={selectedImageId} onClose={closeTransformModal} />
	{/if}
</div>
