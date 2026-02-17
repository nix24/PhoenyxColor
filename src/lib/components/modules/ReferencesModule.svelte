<script lang="ts">
	import { onMount } from "svelte";
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedReferenceImage } from "$lib/schemas/validation";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import { performanceService } from "$lib/services/performance";
	import ImageLibrary from "$lib/components/modules/references/ImageLibrary.svelte";
	import ImageEditorLayout from "$lib/components/modules/references/ImageEditorLayout.svelte";

	let fileInput: HTMLInputElement;
	let isDragOver = $state(false);
	let uploadProgress: Record<string, number> = $state({});
	let selectedImageId: string | null = $state(null);
	let showControls = $state(false);
	let isLoading = $state(true);

	// Context menu state
	let contextMenuTarget: ValidatedReferenceImage | null = $state(null);
	let contextMenuPos = $state({ x: 0, y: 0 });

	onMount(() => {
		const timer = setTimeout(() => {
			isLoading = false;
		}, 400);
		return () => clearTimeout(timer);
	});

	// File validation
	const MAX_FILE_SIZE = 50 * 1024 * 1024;
	const ALLOWED_TYPES = [
		"image/jpeg",
		"image/png",
		"image/gif",
		"image/webp",
		"image/bmp",
		"image/svg+xml",
	];
	const MAX_FILES_AT_ONCE = 20;

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
		if (files) addFiles(Array.from(files));
		if (event.target) (event.target as HTMLInputElement).value = "";
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;
		const files = event.dataTransfer?.files;
		if (files) addFiles(Array.from(files));
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (!event.dataTransfer) return;
		event.dataTransfer.dropEffect = "copy";
		isDragOver = true;
	}

	function handleDragLeave(event: DragEvent) {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const { clientX: x, clientY: y } = event;
		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
			isDragOver = false;
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
		if (validFiles.length === 0) return;

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

	function handleEdit(id: string) {
		selectedImageId = selectedImageId === id ? null : id;
		showControls = !!selectedImageId;
	}

	function handleDelete(id: string) {
		const reference = app.references.references.find((ref) => ref.id === id);
		if (reference) {
			if (reference.src.startsWith("blob:")) URL.revokeObjectURL(reference.src);
			if (reference.thumbnailSrc?.startsWith("blob:")) URL.revokeObjectURL(reference.thumbnailSrc);
			app.references.remove(id);
			toast.info(`Removed "${reference.name}"`);
			if (selectedImageId === id) {
				selectedImageId = null;
				showControls = false;
			}
		}
		contextMenuTarget = null;
	}

	function handleClearAll() {
		if (app.references.references.length === 0) return;
		const count = app.references.references.length;
		for (const ref of app.references.references) {
			if (ref.src.startsWith("blob:")) URL.revokeObjectURL(ref.src);
			if (ref.thumbnailSrc?.startsWith("blob:")) URL.revokeObjectURL(ref.thumbnailSrc);
			app.references.remove(ref.id);
		}
		selectedImageId = null;
		showControls = false;
		toast.success(`Cleared ${count} reference image(s)`);
	}

	function handleDuplicate(id: string) {
		const reference = app.references.references.find((ref) => ref.id === id);
		if (reference) {
			app.references.add({
				...reference,
				name: `${reference.name} (Copy)`,
				position: { x: reference.position.x + 20, y: reference.position.y + 20 },
			});
			toast.success(`Duplicated "${reference.name}"`);
		}
		contextMenuTarget = null;
	}

	function handleContextMenu(e: MouseEvent, reference: ValidatedReferenceImage) {
		e.preventDefault();
		contextMenuTarget = reference;
		contextMenuPos = { x: e.clientX, y: e.clientY };
	}

	function closeContextMenu() {
		contextMenuTarget = null;
	}

	function closeEditor() {
		showControls = false;
		selectedImageId = null;
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="h-full flex flex-col @container relative"
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	onclick={closeContextMenu}
	onkeydown={(e) => e.key === "Escape" && closeContextMenu()}
	role="application"
	aria-label="Reference images"
>
	<!-- Upload Progress -->
	{#if Object.keys(uploadProgress).length > 0}
		<div class="mx-4 @md:mx-6 mt-2">
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

	<!-- Drag Overlay -->
	{#if isDragOver}
		<div class="absolute inset-0 z-30 flex items-center justify-center bg-void-deep/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-phoenix-primary pointer-events-none">
			<div class="text-center">
				<Icon icon="material-symbols:cloud-upload" class="w-12 h-12 text-phoenix-primary mx-auto mb-3 animate-float" />
				<p class="text-lg font-bold text-white">Drop images here</p>
				<p class="text-xs text-text-muted mt-1">Up to {MAX_FILES_AT_ONCE} files, 50MB each</p>
			</div>
		</div>
	{/if}

	<!-- Image Library -->
	<ImageLibrary
		references={app.references.references}
		{selectedImageId}
		{isLoading}
		{isDragOver}
		onAddFiles={() => fileInput.click()}
		onClearAll={handleClearAll}
		onEdit={handleEdit}
		onDuplicate={handleDuplicate}
		onDelete={handleDelete}
		onContextMenu={handleContextMenu}
	/>

	<!-- Context Menu -->
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
					if (contextMenuTarget) handleEdit(contextMenuTarget.id);
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
				onclick={() => contextMenuTarget && handleDuplicate(contextMenuTarget.id)}
				role="menuitem"
				type="button"
			>
				<Icon icon="material-symbols:content-copy" class="w-4 h-4 text-white/60" />
				Duplicate
			</button>
			<div class="h-px bg-white/5 my-1"></div>
			<button
				class="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors text-left"
				onclick={() => contextMenuTarget && handleDelete(contextMenuTarget.id)}
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
		<ImageEditorLayout imageId={selectedImageId} onClose={closeEditor} />
	{/if}
</div>
