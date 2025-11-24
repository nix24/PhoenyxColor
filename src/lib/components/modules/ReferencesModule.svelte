<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import type { ReferenceImage } from "$lib/stores/references.svelte";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import { performanceService } from "$lib/services/performance";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";
	import ImageEditor from "$lib/components/modules/references/ImageEditor.svelte";

	let fileInput: HTMLInputElement;
	let isDragOver = $state(false);
	let uploadProgress: Record<string, number> = $state({});
	let selectedImageId: string | null = $state(null);
	let viewMode: "gallery" | "transform" = $state("gallery");
	let showControls = $state(false);

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

	// Mobile action sheet handling
	let actionTarget: ReferenceImage | null = $state(null);

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
		event.dataTransfer!.dropEffect = "copy";
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

		// Validate all files first
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

		// Process valid files
		for (const file of validFiles) {
			await processFile(file);
		}

		toast.success(`Added ${validFiles.length} reference image(s)`);
	}

	async function processFile(file: File): Promise<void> {
		const progressId = `${file.name}-${Date.now()}`;
		uploadProgress[progressId] = 0;

		try {
			// Optimize image and generate thumbnail
			const { optimized, thumbnail } = await performanceService.optimizeImage(file, {
				maxWidth: 1920,
				maxHeight: 1080,
				quality: 0.85,
			});

			uploadProgress[progressId] = 50;

			// Convert optimized image to data URL for persistence across page refreshes
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
			toast.success(`Added "${file.name}" to references`);
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
			viewMode = "transform";
			showControls = true;
			// Open transform modal
			const dlg = document.getElementById("transform-modal") as HTMLDialogElement | null;
			if (dlg && !dlg.open) {
				dlg.showModal();
			}
		} else {
			showControls = false;
			// Close modal if open
			const dlg = document.getElementById("transform-modal") as HTMLDialogElement | null;
			if (dlg && dlg.open) dlg.close();
		}
	}

	function removeReference(id: string) {
		const reference = app.references.references.find((ref) => ref.id === id);
		if (reference) {
			// Cleanup blob URLs to prevent memory leaks (if any are still using blob URLs)
			if (reference.src.startsWith("blob:")) {
				URL.revokeObjectURL(reference.src);
			}
			if (reference.thumbnailSrc && reference.thumbnailSrc.startsWith("blob:")) {
				URL.revokeObjectURL(reference.thumbnailSrc);
			}

			app.references.remove(id);
			toast.info(`Removed "${reference.name}"`);

			if (selectedImageId === id) {
				selectedImageId = null;
				showControls = false;
			}
		}
	}

	function clearAllReferences() {
		if (app.references.references.length === 0) return;

		const count = app.references.references.length;

		// Cleanup blob URLs to prevent memory leaks
		app.references.references.forEach((ref) => {
			if (ref.src.startsWith("blob:")) {
				URL.revokeObjectURL(ref.src);
			}
			if (ref.thumbnailSrc && ref.thumbnailSrc.startsWith("blob:")) {
				URL.revokeObjectURL(ref.thumbnailSrc);
			}
			app.references.remove(ref.id);
		});

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
	}

	function updateImageProperty(id: string, property: keyof ReferenceImage, value: any) {
		app.references.update(id, { [property]: value });
		// Auto-save changes
		app.references.save().catch((error) => {
			console.error("Failed to auto-save after updating image property:", error);
		});
	}

	function resetTransforms(id: string) {
		app.references.update(id, {
			scale: 1,
			rotation: 0,
			opacity: 1,
			isGrayscale: false,
			brightness: 100,
			contrast: 100,
			saturation: 100,
			hueRotate: 0,
			blur: 0,
			sepia: 0,
			invert: 0,
			flipX: false,
			flipY: false,
		});
		toast.success("All transforms reset");
	}

	// Get selected reference
	const selectedReference = $derived(
		selectedImageId ? app.references.references.find((ref) => ref.id === selectedImageId) : null
	);

	function closeActionSheet() {
		const dlg = document.getElementById("reference-action-modal") as HTMLDialogElement | null;
		if (dlg && dlg.open) dlg.close();
		actionTarget = null;
	}

	function handleImageClick(reference: ReferenceImage) {
		if (window.innerWidth < 768) {
			actionTarget = reference;
			const dlg = document.getElementById("reference-action-modal") as HTMLDialogElement;
			dlg.showModal();
		} else {
			selectImage(reference.id);
		}
	}

	function closeTransformModal() {
		showControls = false;
		selectedImageId = null;
	}

	function transformFromActionSheet(id: string) {
		closeActionSheet();
		selectImage(id);
	}

	function buildFilterString(reference: ReferenceImage): string {
		const filters: string[] = [];

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

		return filters.length > 0 ? filters.join(" ") : "none";
	}
</script>

<div class="h-full flex flex-col gap-4">
	<!-- Module Header -->
	<GlassPanel
		class="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 gap-4 shrink-0"
		intensity="low"
	>
		<div>
			<h2 class="text-xl md:text-2xl font-bold text-white tracking-wide">Reference Images</h2>
			<p class="text-sm text-text-muted">
				{viewMode === "gallery"
					? "Click images to transform them"
					: "Transform your reference images"}
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<!-- View Mode Toggle -->
			<div class="join bg-black/20 rounded-lg p-1 border border-white/5">
				<button
					class={cn(
						"btn btn-sm join-item border-none transition-all duration-300",
						viewMode === "gallery"
							? "bg-phoenix-primary text-white shadow-lg"
							: "bg-transparent text-text-muted hover:text-white"
					)}
					onclick={() => {
						viewMode = "gallery";
						selectedImageId = null;
						showControls = false;
					}}
				>
					<Icon icon="material-symbols:grid-view" class="w-4 h-4" />
					Gallery
				</button>
				<button
					class={cn(
						"btn btn-sm join-item border-none transition-all duration-300",
						viewMode === "transform"
							? "bg-phoenix-primary text-white shadow-lg"
							: "bg-transparent text-text-muted hover:text-white"
					)}
					onclick={() => {
						viewMode = "transform";
					}}
					disabled={app.references.references.length === 0}
				>
					<Icon icon="material-symbols:transform" class="w-4 h-4" />
					Transform
				</button>
			</div>

			<button
				class="btn btn-sm border-none bg-gradient-to-r from-phoenix-primary to-phoenix-violet text-white shadow-lg hover:shadow-phoenix-primary/50 hover:scale-105 transition-all duration-300"
				onclick={() => fileInput.click()}
				type="button"
			>
				<Icon icon="material-symbols:add" class="w-4 h-4" />
				Add Images
			</button>

			<button
				class="btn btn-outline btn-error btn-sm hover:bg-error/20"
				onclick={clearAllReferences}
				type="button"
				disabled={app.references.references.length === 0}
			>
				<Icon icon="material-symbols:clear-all" class="w-4 h-4" />
				Clear All
			</button>
		</div>
	</GlassPanel>

	<!-- Upload Progress -->
	{#if Object.keys(uploadProgress).length > 0}
		<GlassPanel class="p-3" intensity="low">
			<div class="text-sm text-text-muted mb-2">Uploading images...</div>
			{#each Object.entries(uploadProgress) as [id, progress]}
				<div class="mb-1">
					<div class="flex justify-between text-xs text-text-muted/60 mb-1">
						<span>{id.split("-")[0]}</span>
						<span>{progress}%</span>
					</div>
					<div class="w-full bg-black/20 rounded-full h-1">
						<div
							class="bg-phoenix-primary h-1 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(255,0,127,0.5)]"
							style:width="{progress}%"
						></div>
					</div>
				</div>
			{/each}
		</GlassPanel>
	{/if}

	<!-- Main Content -->
	<div class="flex-1 overflow-hidden relative rounded-xl">
		{#if app.references.references.length > 0}
			<!-- Image Gallery -->
			<div class="h-full overflow-y-auto p-1">
				<div
					class="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
				>
					{#each app.references.references as reference (reference.id)}
						<GlassPanel
							class="group cursor-pointer !p-0 !overflow-visible"
							intensity="low"
							hoverEffect={true}
							onclick={() => handleImageClick(reference)}
							role="button"
							tabindex="0"
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									handleImageClick(reference);
								}
							}}
						>
							<div
								class={cn(
									"relative aspect-square overflow-hidden rounded-t-xl transition-all duration-300",
									selectedImageId === reference.id
										? "ring-2 ring-phoenix-primary ring-offset-2 ring-offset-void"
										: ""
								)}
							>
								<!-- Image with transforms applied visually -->
								<img
									src={reference.thumbnailSrc || reference.src}
									alt={reference.name}
									class="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
									style:opacity={reference.opacity}
									style:filter={buildFilterString(reference)}
									style:transform="scale({reference.scale}) rotate({reference.rotation}deg)"
									loading="lazy"
								/>

								<!-- Gradient Overlay (Bottom Fade) -->
								<div
									class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"
								></div>

								<!-- Overlay on hover/selection -->
								<div
									class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center pointer-events-none"
								>
									{#if selectedImageId === reference.id}
										<div
											class="bg-phoenix-primary text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse-slow"
										>
											Selected
										</div>
									{:else}
										<div
											class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2"
										>
											<button
												class="hidden md:inline-flex btn btn-xs md:btn-sm btn-circle bg-phoenix-primary border-none text-white pointer-events-auto hover:bg-phoenix-primary/80"
												onclick={(e) => {
													e.stopPropagation();
													duplicateReference(reference.id);
												}}
												title="Duplicate"
											>
												<Icon icon="material-symbols:content-copy" class="w-4 h-4" />
											</button>
											<button
												class="hidden md:inline-flex btn btn-xs md:btn-sm btn-circle btn-error pointer-events-auto"
												onclick={(e) => {
													e.stopPropagation();
													removeReference(reference.id);
												}}
												title="Delete"
											>
												<Icon icon="material-symbols:delete-outline" class="w-4 h-4" />
											</button>
										</div>
									{/if}
								</div>
							</div>

							<!-- Image name -->
							<div class="p-2 border-t border-white/5 bg-black/20">
								<p
									class="text-xs text-center text-text-muted truncate group-hover:text-white transition-colors"
									title={reference.name}
								>
									{reference.name}
								</p>
							</div>
						</GlassPanel>
					{/each}

					<!-- Add More Card -->
					<div
						class="aspect-square border-2 border-dashed border-white/10 hover:border-phoenix-primary/50 hover:bg-white/5 transition-all duration-300 cursor-pointer rounded-xl flex items-center justify-center group"
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
						<div class="text-center group-hover:scale-105 transition-transform duration-300">
							<div
								class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2 group-hover:bg-phoenix-primary/20 transition-colors"
							>
								<Icon
									icon="material-symbols:add-photo-alternate"
									class="w-6 h-6 text-text-muted group-hover:text-phoenix-primary transition-colors"
								/>
							</div>
							<p class="text-xs text-text-muted group-hover:text-white transition-colors">
								Add More
							</p>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- Empty State -->
			<div class="flex items-center justify-center h-full p-4">
				<GlassPanel
					class={cn(
						"w-full max-w-md p-10 text-center cursor-pointer transition-all duration-300 border-2 border-dashed",
						isDragOver
							? "border-phoenix-primary bg-phoenix-primary/10 scale-105"
							: "border-white/10 hover:border-white/20"
					)}
					intensity="medium"
					ondrop={handleDrop}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					onkeydown={handleDropZoneKeydown}
					onclick={() => fileInput.click()}
					role="button"
					tabindex="0"
				>
					<div
						class="w-20 h-20 rounded-full bg-gradient-to-br from-phoenix-primary/20 to-phoenix-violet/20 flex items-center justify-center mx-auto mb-6 animate-float"
					>
						<Icon
							icon="material-symbols:cloud-upload"
							class={cn(
								"w-10 h-10 transition-colors duration-300",
								isDragOver ? "text-phoenix-primary" : "text-text-muted"
							)}
						/>
					</div>

					<h3 class="text-2xl font-bold mb-2 text-white tracking-wide">No References Yet</h3>
					<p class="text-text-muted mb-8 max-w-xs mx-auto">
						Drop your inspiration here or click to browse.
					</p>

					<button
						class="btn btn-primary bg-gradient-to-r from-phoenix-primary to-phoenix-violet border-none shadow-lg hover:shadow-phoenix-primary/50 hover:scale-105 transition-all duration-300"
						type="button"
					>
						<Icon icon="material-symbols:add-photo-alternate" class="w-5 h-5" />
						Add Your First Reference
					</button>

					<p class="text-[10px] text-text-muted/50 mt-6 uppercase tracking-wider">
						Max {MAX_FILES_AT_ONCE} files • 50MB each
					</p>
				</GlassPanel>
			</div>
		{/if}
	</div>

	<!-- Hidden file input -->
	<input
		bind:this={fileInput}
		type="file"
		multiple
		accept={ALLOWED_TYPES.join(",")}
		class="hidden"
		onchange={handleFileSelect}
	/>

	<!-- Mobile action sheet modal -->
	<dialog id="reference-action-modal" class="modal modal-bottom sm:modal-middle">
		{#if actionTarget}
			<div class="modal-box">
				<div class="flex items-center justify-between mb-4">
					<h3 class="font-bold text-lg">{actionTarget.name}</h3>
					<button class="btn btn-sm btn-circle btn-ghost" onclick={closeActionSheet}>
						<Icon icon="material-symbols:close" class="w-4 h-4" />
					</button>
				</div>
				<div class="flex flex-col space-y-3">
					<button
						class="btn btn-primary btn-lg"
						onclick={() => transformFromActionSheet(actionTarget!.id)}
					>
						<Icon icon="material-symbols:transform" class="w-5 h-5" />
						Transform Image
					</button>
					<button
						class="btn btn-outline btn-lg"
						onclick={() => {
							duplicateReference(actionTarget!.id);
							closeActionSheet();
						}}
					>
						<Icon icon="material-symbols:content-copy" class="w-5 h-5" />
						Duplicate
					</button>
					<button
						class="btn btn-error btn-outline btn-lg"
						onclick={() => {
							removeReference(actionTarget!.id);
							closeActionSheet();
						}}
					>
						<Icon icon="material-symbols:delete-outline" class="w-5 h-5" />
						Delete
					</button>
				</div>
				<div class="modal-action">
					<button class="btn btn-ghost" onclick={closeActionSheet}>Cancel</button>
				</div>
			</div>
			<form method="dialog" class="modal-backdrop">
				<button onclick={closeActionSheet}>close</button>
			</form>
		{/if}
	</dialog>

	<!-- Image Editor Overlay -->
	{#if selectedImageId && showControls}
		<ImageEditor imageId={selectedImageId} onClose={closeTransformModal} />
	{/if}
</div>

{#snippet mobileTransformControls(reference: ReferenceImage)}
	<div class="space-y-6">
		<!-- Rotation -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="mobile-rotation-{reference.id}" class="text-base font-medium text-base-content"
					>Rotation</label
				>
				<span class="text-base text-base-content/70 font-mono">{reference.rotation}°</span>
			</div>
			<input
				id="mobile-rotation-{reference.id}"
				type="range"
				min="0"
				max="360"
				step="5"
				value={reference.rotation}
				class="range range-primary range-lg"
				oninput={(e) => {
					const value = parseInt((e.target as HTMLInputElement)?.value || "0");
					updateImageProperty(reference.id, "rotation", value);
				}}
			/>
			<div class="flex justify-between gap-2">
				<button
					class="btn btn-sm btn-outline flex-1"
					onclick={() => updateImageProperty(reference.id, "rotation", reference.rotation - 90)}
				>
					<Icon icon="material-symbols:rotate-left" class="w-4 h-4" />
					-90°
				</button>
				<button
					class="btn btn-sm btn-outline flex-1"
					onclick={() => updateImageProperty(reference.id, "rotation", reference.rotation + 90)}
				>
					<Icon icon="material-symbols:rotate-right" class="w-4 h-4" />
					+90°
				</button>
			</div>
		</div>

		<!-- Scale -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="mobile-scale-{reference.id}" class="text-base font-medium text-base-content"
					>Scale</label
				>
				<span class="text-base text-base-content/70 font-mono"
					>{Math.round(reference.scale * 100)}%</span
				>
			</div>
			<input
				id="mobile-scale-{reference.id}"
				type="range"
				min="0.1"
				max="3"
				step="0.1"
				value={reference.scale}
				class="range range-primary range-lg"
				oninput={(e) => {
					const value = parseFloat((e.target as HTMLInputElement)?.value || "1");
					updateImageProperty(reference.id, "scale", value);
				}}
			/>
			<div class="grid grid-cols-3 gap-2">
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "scale", 0.5)}
				>
					50%
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "scale", 1)}
				>
					100%
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "scale", 2)}
				>
					200%
				</button>
			</div>
		</div>

		<!-- Opacity -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="mobile-opacity-{reference.id}" class="text-base font-medium text-base-content"
					>Opacity</label
				>
				<span class="text-base text-base-content/70 font-mono"
					>{Math.round(reference.opacity * 100)}%</span
				>
			</div>
			<input
				id="mobile-opacity-{reference.id}"
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={reference.opacity}
				class="range range-primary range-lg"
				oninput={(e) => {
					const value = parseFloat((e.target as HTMLInputElement)?.value || "1");
					updateImageProperty(reference.id, "opacity", value);
				}}
			/>
			<div class="grid grid-cols-3 gap-2">
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "opacity", 0.25)}
				>
					25%
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "opacity", 0.5)}
				>
					50%
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "opacity", 1)}
				>
					100%
				</button>
			</div>
		</div>

		<!-- Brightness -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label
					for="mobile-brightness-{reference.id}"
					class="text-base font-medium text-base-content">Brightness</label
				>
				<span class="text-base text-base-content/70 font-mono">{reference.brightness || 100}%</span>
			</div>
			<input
				id="mobile-brightness-{reference.id}"
				type="range"
				min="0"
				max="200"
				step="5"
				value={reference.brightness || 100}
				class="range range-primary range-lg"
				oninput={(e) => {
					const value = parseInt((e.target as HTMLInputElement)?.value || "100");
					updateImageProperty(reference.id, "brightness", value);
				}}
			/>
			<div class="grid grid-cols-3 gap-2">
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "brightness", 50)}
				>
					50%
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "brightness", 100)}
				>
					100%
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "brightness", 150)}
				>
					150%
				</button>
			</div>
		</div>

		<!-- Contrast -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="mobile-contrast-{reference.id}" class="text-base font-medium text-base-content"
					>Contrast</label
				>
				<span class="text-base text-base-content/70 font-mono">{reference.contrast || 100}%</span>
			</div>
			<input
				id="mobile-contrast-{reference.id}"
				type="range"
				min="0"
				max="200"
				step="5"
				value={reference.contrast || 100}
				class="range range-primary range-lg"
				oninput={(e) => {
					const value = parseInt((e.target as HTMLInputElement)?.value || "100");
					updateImageProperty(reference.id, "contrast", value);
				}}
			/>
			<div class="grid grid-cols-3 gap-2">
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "contrast", 50)}
				>
					50%
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "contrast", 100)}
				>
					100%
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "contrast", 150)}
				>
					150%
				</button>
			</div>
		</div>

		<!-- Saturation -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label
					for="mobile-saturation-{reference.id}"
					class="text-base font-medium text-base-content">Saturation</label
				>
				<span class="text-base text-base-content/70 font-mono">{reference.saturation || 100}%</span>
			</div>
			<input
				id="mobile-saturation-{reference.id}"
				type="range"
				min="0"
				max="200"
				step="5"
				value={reference.saturation || 100}
				class="range range-primary range-lg"
				oninput={(e) => {
					const value = parseInt((e.target as HTMLInputElement)?.value || "100");
					updateImageProperty(reference.id, "saturation", value);
				}}
			/>
			<div class="grid grid-cols-3 gap-2">
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "saturation", 0)}
				>
					0%
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "saturation", 100)}
				>
					100%
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "saturation", 150)}
				>
					150%
				</button>
			</div>
		</div>

		<!-- Hue Rotate -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="mobile-hue-{reference.id}" class="text-base font-medium text-base-content"
					>Hue Shift</label
				>
				<span class="text-base text-base-content/70 font-mono">{reference.hueRotate || 0}°</span>
			</div>
			<input
				id="mobile-hue-{reference.id}"
				type="range"
				min="0"
				max="360"
				step="10"
				value={reference.hueRotate || 0}
				class="range range-primary range-lg"
				oninput={(e) => {
					const value = parseInt((e.target as HTMLInputElement)?.value || "0");
					updateImageProperty(reference.id, "hueRotate", value);
				}}
			/>
			<div class="grid grid-cols-4 gap-2">
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "hueRotate", 0)}
				>
					0°
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "hueRotate", 90)}
				>
					90°
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "hueRotate", 180)}
				>
					180°
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "hueRotate", 270)}
				>
					270°
				</button>
			</div>
		</div>

		<!-- Blur -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="mobile-blur-{reference.id}" class="text-base font-medium text-base-content"
					>Blur</label
				>
				<span class="text-base text-base-content/70 font-mono">{reference.blur || 0}px</span>
			</div>
			<input
				id="mobile-blur-{reference.id}"
				type="range"
				min="0"
				max="10"
				step="0.5"
				value={reference.blur || 0}
				class="range range-primary range-lg"
				oninput={(e) => {
					const value = parseFloat((e.target as HTMLInputElement)?.value || "0");
					updateImageProperty(reference.id, "blur", value);
				}}
			/>
			<div class="grid grid-cols-3 gap-2">
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "blur", 0)}
				>
					0px
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "blur", 2)}
				>
					2px
				</button>
				<button
					class="btn btn-sm btn-outline"
					onclick={() => updateImageProperty(reference.id, "blur", 5)}
				>
					5px
				</button>
			</div>
		</div>

		<!-- Effects -->
		<div class="space-y-3">
			<h4 class="text-base font-medium text-base-content">Effects</h4>
			<label class="flex items-center justify-between cursor-pointer p-3 bg-base-200 rounded-lg">
				<span class="text-base text-base-content">Grayscale</span>
				<input
					type="checkbox"
					checked={reference.isGrayscale}
					onchange={(e) => {
						const checked = (e.target as HTMLInputElement)?.checked || false;
						updateImageProperty(reference.id, "isGrayscale", checked);
					}}
					class="toggle toggle-primary toggle-lg"
				/>
			</label>
		</div>

		<!-- Action Buttons -->
		<div class="space-y-3 pt-4 border-t border-base-300">
			<button class="btn btn-outline w-full" onclick={() => resetTransforms(reference.id)}>
				<Icon icon="material-symbols:refresh" class="w-5 h-5" />
				Reset All Transforms
			</button>
			<div class="grid grid-cols-2 gap-3">
				<button class="btn btn-outline" onclick={() => duplicateReference(reference.id)}>
					<Icon icon="material-symbols:content-copy" class="w-4 h-4" />
					Duplicate
				</button>
				<button class="btn btn-error btn-outline" onclick={() => removeReference(reference.id)}>
					<Icon icon="material-symbols:delete-outline" class="w-4 h-4" />
					Delete
				</button>
			</div>
		</div>
	</div>
{/snippet}

{#snippet desktopTransformControls(reference: ReferenceImage)}
	<div class="space-y-6">
		<!-- Rotation -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="desktop-rotation-{reference.id}" class="text-sm font-medium text-base-content"
					>Rotation</label
				>
				<span class="text-sm text-base-content/70 font-mono">{reference.rotation}°</span>
			</div>
			<input
				id="desktop-rotation-{reference.id}"
				type="range"
				min="0"
				max="360"
				step="5"
				value={reference.rotation}
				class="range range-primary"
				oninput={(e) => {
					const value = parseInt((e.target as HTMLInputElement)?.value || "0");
					updateImageProperty(reference.id, "rotation", value);
				}}
			/>
			<div class="flex justify-between gap-2">
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "rotation", reference.rotation - 90)}
				>
					<Icon icon="material-symbols:rotate-left" class="w-3 h-3" />
					-90°
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "rotation", reference.rotation + 90)}
				>
					<Icon icon="material-symbols:rotate-right" class="w-3 h-3" />
					+90°
				</button>
			</div>
		</div>

		<!-- Scale -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="desktop-scale-{reference.id}" class="text-sm font-medium text-base-content"
					>Scale</label
				>
				<span class="text-sm text-base-content/70 font-mono"
					>{Math.round(reference.scale * 100)}%</span
				>
			</div>
			<input
				id="desktop-scale-{reference.id}"
				type="range"
				min="0.1"
				max="3"
				step="0.1"
				value={reference.scale}
				class="range range-primary"
				oninput={(e) => {
					const value = parseFloat((e.target as HTMLInputElement)?.value || "1");
					updateImageProperty(reference.id, "scale", value);
				}}
			/>
			<div class="flex justify-between gap-2">
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "scale", 0.5)}
				>
					50%
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "scale", 1)}
				>
					100%
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "scale", 2)}
				>
					200%
				</button>
			</div>
		</div>

		<!-- Opacity -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="desktop-opacity-{reference.id}" class="text-sm font-medium text-base-content"
					>Opacity</label
				>
				<span class="text-sm text-base-content/70 font-mono"
					>{Math.round(reference.opacity * 100)}%</span
				>
			</div>
			<input
				id="desktop-opacity-{reference.id}"
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={reference.opacity}
				class="range range-primary"
				oninput={(e) => {
					const value = parseFloat((e.target as HTMLInputElement)?.value || "1");
					updateImageProperty(reference.id, "opacity", value);
				}}
			/>
			<div class="flex justify-between gap-2">
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "opacity", 0.25)}
				>
					25%
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "opacity", 0.5)}
				>
					50%
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "opacity", 1)}
				>
					100%
				</button>
			</div>
		</div>

		<!-- Brightness -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="desktop-brightness-{reference.id}" class="text-sm font-medium text-base-content"
					>Brightness</label
				>
				<span class="text-sm text-base-content/70 font-mono">{reference.brightness || 100}%</span>
			</div>
			<input
				id="desktop-brightness-{reference.id}"
				type="range"
				min="0"
				max="200"
				step="5"
				value={reference.brightness || 100}
				class="range range-primary"
				oninput={(e) => {
					const value = parseInt((e.target as HTMLInputElement)?.value || "100");
					updateImageProperty(reference.id, "brightness", value);
				}}
			/>
			<div class="flex justify-between gap-2">
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "brightness", 50)}
				>
					50%
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "brightness", 100)}
				>
					100%
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "brightness", 150)}
				>
					150%
				</button>
			</div>
		</div>

		<!-- Contrast -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="desktop-contrast-{reference.id}" class="text-sm font-medium text-base-content"
					>Contrast</label
				>
				<span class="text-sm text-base-content/70 font-mono">{reference.contrast || 100}%</span>
			</div>
			<input
				id="desktop-contrast-{reference.id}"
				type="range"
				min="0"
				max="200"
				step="5"
				value={reference.contrast || 100}
				class="range range-primary"
				oninput={(e) => {
					const value = parseInt((e.target as HTMLInputElement)?.value || "100");
					updateImageProperty(reference.id, "contrast", value);
				}}
			/>
			<div class="flex justify-between gap-2">
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "contrast", 50)}
				>
					50%
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "contrast", 100)}
				>
					100%
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "contrast", 150)}
				>
					150%
				</button>
			</div>
		</div>

		<!-- Saturation -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="desktop-saturation-{reference.id}" class="text-sm font-medium text-base-content"
					>Saturation</label
				>
				<span class="text-sm text-base-content/70 font-mono">{reference.saturation || 100}%</span>
			</div>
			<input
				id="desktop-saturation-{reference.id}"
				type="range"
				min="0"
				max="200"
				step="5"
				value={reference.saturation || 100}
				class="range range-primary"
				oninput={(e) => {
					const value = parseInt((e.target as HTMLInputElement)?.value || "100");
					updateImageProperty(reference.id, "saturation", value);
				}}
			/>
			<div class="flex justify-between gap-2">
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "saturation", 0)}
				>
					0%
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "saturation", 100)}
				>
					100%
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "saturation", 150)}
				>
					150%
				</button>
			</div>
		</div>

		<!-- Hue Rotate -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="desktop-hue-{reference.id}" class="text-sm font-medium text-base-content"
					>Hue Shift</label
				>
				<span class="text-sm text-base-content/70 font-mono">{reference.hueRotate || 0}°</span>
			</div>
			<input
				id="desktop-hue-{reference.id}"
				type="range"
				min="0"
				max="360"
				step="10"
				value={reference.hueRotate || 0}
				class="range range-primary"
				oninput={(e) => {
					const value = parseInt((e.target as HTMLInputElement)?.value || "0");
					updateImageProperty(reference.id, "hueRotate", value);
				}}
			/>
			<div class="flex justify-between gap-2">
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "hueRotate", 0)}
				>
					0°
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "hueRotate", 90)}
				>
					90°
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "hueRotate", 180)}
				>
					180°
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "hueRotate", 270)}
				>
					270°
				</button>
			</div>
		</div>

		<!-- Blur -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label for="desktop-blur-{reference.id}" class="text-sm font-medium text-base-content"
					>Blur</label
				>
				<span class="text-sm text-base-content/70 font-mono">{reference.blur || 0}px</span>
			</div>
			<input
				id="desktop-blur-{reference.id}"
				type="range"
				min="0"
				max="10"
				step="0.5"
				value={reference.blur || 0}
				class="range range-primary"
				oninput={(e) => {
					const value = parseFloat((e.target as HTMLInputElement)?.value || "0");
					updateImageProperty(reference.id, "blur", value);
				}}
			/>
			<div class="flex justify-between gap-2">
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "blur", 0)}
				>
					0px
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "blur", 2)}
				>
					2px
				</button>
				<button
					class="btn btn-xs btn-outline"
					onclick={() => updateImageProperty(reference.id, "blur", 5)}
				>
					5px
				</button>
			</div>
		</div>

		<!-- Effects -->
		<div class="space-y-3">
			<h4 class="text-sm font-medium text-base-content">Effects</h4>
			<label class="flex items-center justify-between cursor-pointer">
				<span class="text-sm text-base-content/70">Grayscale</span>
				<input
					type="checkbox"
					checked={reference.isGrayscale}
					onchange={(e) => {
						const checked = (e.target as HTMLInputElement)?.checked || false;
						updateImageProperty(reference.id, "isGrayscale", checked);
					}}
					class="toggle toggle-primary toggle-sm"
				/>
			</label>
		</div>

		<!-- Action Buttons -->
		<div class="flex flex-col gap-2 pt-4 border-t border-base-300">
			<button class="btn btn-sm btn-outline" onclick={() => resetTransforms(reference.id)}>
				<Icon icon="material-symbols:refresh" class="w-4 h-4" />
				Reset Transforms
			</button>

			<button class="btn btn-sm btn-outline" onclick={() => duplicateReference(reference.id)}>
				<Icon icon="material-symbols:content-copy" class="w-4 h-4" />
				Duplicate Image
			</button>

			<button
				class="btn btn-sm btn-error btn-outline"
				onclick={() => removeReference(reference.id)}
			>
				<Icon icon="material-symbols:delete-outline" class="w-4 h-4" />
				Delete Image
			</button>
		</div>
	</div>
{/snippet}
