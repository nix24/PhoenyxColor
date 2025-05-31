<script lang="ts">
	import { appStore } from "$lib/stores/app.svelte";
	import type { ReferenceImage } from "$lib/stores/app.svelte";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import { performanceService } from "$lib/services/performance";

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

			const imageUrl = URL.createObjectURL(optimized);

			uploadProgress[progressId] = 80;

			appStore.addReference({
				src: imageUrl,
				thumbnailSrc: thumbnail,
				name: file.name.replace(/\.[^/.]+$/, ""),
				position: { x: 50, y: 50 },
				scale: 1,
				rotation: 0,
				opacity: 1,
				isGrayscale: false,
				createdAt: new Date(),
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
		} else {
			showControls = false;
		}
	}

	function removeReference(id: string) {
		const reference = appStore.references.find((ref) => ref.id === id);
		if (reference) {
			appStore.removeReference(id);
			toast.info(`Removed "${reference.name}"`);

			if (selectedImageId === id) {
				selectedImageId = null;
				showControls = false;
			}
		}
	}

	function clearAllReferences() {
		if (appStore.references.length === 0) return;

		const count = appStore.references.length;
		appStore.references.forEach((ref) => appStore.removeReference(ref.id));
		selectedImageId = null;
		showControls = false;
		toast.success(`Cleared ${count} reference image(s)`);
	}

	function duplicateReference(id: string) {
		const reference = appStore.references.find((ref) => ref.id === id);
		if (reference) {
			appStore.addReference({
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
		appStore.updateReference(id, { [property]: value });
		// Auto-save changes
		appStore.saveToStorage().catch((error) => {
			console.error("Failed to auto-save after updating image property:", error);
		});
	}

	function resetTransforms(id: string) {
		appStore.updateReference(id, {
			scale: 1,
			rotation: 0,
			opacity: 1,
			isGrayscale: false,
		});
		toast.success("Transforms reset");
	}

	// Get selected reference
	const selectedReference = $derived(
		selectedImageId ? appStore.references.find((ref) => ref.id === selectedImageId) : null
	);
</script>

<div class="h-full flex flex-col bg-base-100">
	<!-- Header with Mode Toggle -->
	<div
		class="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 border-b border-base-300 bg-base-100 gap-4"
	>
		<div>
			<h2 class="text-xl md:text-2xl font-bold text-base-content">Reference Images</h2>
			<p class="text-sm text-base-content/70">
				{viewMode === "gallery"
					? "Click images to transform them"
					: "Transform your reference images"}
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<!-- View Mode Toggle -->
			<div class="join">
				<button
					class="btn btn-sm join-item {viewMode === 'gallery' ? 'btn-active' : 'btn-outline'}"
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
					class="btn btn-sm join-item {viewMode === 'transform' ? 'btn-active' : 'btn-outline'}"
					onclick={() => {
						viewMode = "transform";
					}}
					disabled={appStore.references.length === 0}
				>
					<Icon icon="material-symbols:transform" class="w-4 h-4" />
					Transform
				</button>
			</div>

			<button class="btn btn-primary btn-sm" onclick={() => fileInput.click()} type="button">
				<Icon icon="material-symbols:add" class="w-4 h-4" />
				Add Images
			</button>

			<button
				class="btn btn-outline btn-error btn-sm"
				onclick={clearAllReferences}
				type="button"
				disabled={appStore.references.length === 0}
			>
				<Icon icon="material-symbols:clear-all" class="w-4 h-4" />
				Clear All
			</button>
		</div>
	</div>

	<!-- Upload Progress -->
	{#if Object.keys(uploadProgress).length > 0}
		<div class="bg-base-200 border-b border-base-300 p-3">
			<div class="text-sm text-base-content/70 mb-2">Uploading images...</div>
			{#each Object.entries(uploadProgress) as [id, progress]}
				<div class="mb-1">
					<div class="flex justify-between text-xs text-base-content/60 mb-1">
						<span>{id.split("-")[0]}</span>
						<span>{progress}%</span>
					</div>
					<div class="w-full bg-base-300 rounded-full h-1">
						<div
							class="bg-primary h-1 rounded-full transition-all duration-300"
							style:width="{progress}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Main Content -->
	<div class="flex-1 overflow-hidden relative">
		{#if appStore.references.length > 0}
			<!-- Image Gallery -->
			<div class="h-full overflow-y-auto p-4">
				<div
					class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
				>
					{#each appStore.references as reference (reference.id)}
						<div class="relative group">
							<!-- Image Container -->
							<div
								class="relative aspect-square overflow-hidden rounded-lg cursor-pointer transition-all duration-300 hover:shadow-lg {selectedImageId ===
								reference.id
									? 'ring-4 ring-primary ring-offset-2 ring-offset-base-100'
									: 'hover:scale-105'}"
								onclick={() => selectImage(reference.id)}
								role="button"
								tabindex="0"
								onkeydown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										selectImage(reference.id);
									}
								}}
							>
								<!-- Image with transforms applied visually -->
								<img
									src={reference.thumbnailSrc || reference.src}
									alt={reference.name}
									class="w-full h-full object-cover transition-all duration-300"
									style:opacity={reference.opacity}
									style:filter={reference.isGrayscale ? "grayscale(100%)" : "none"}
									style:transform="scale({reference.scale}) rotate({reference.rotation}deg)"
									loading="lazy"
								/>

								<!-- Overlay on hover/selection -->
								<div
									class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center"
								>
									{#if selectedImageId === reference.id}
										<div
											class="bg-primary text-primary-content px-2 py-1 rounded-full text-xs font-medium"
										>
											Selected
										</div>
									{:else}
										<div
											class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2"
										>
											<button
												class="btn btn-sm btn-circle btn-primary"
												onclick={(e) => {
													e.stopPropagation();
													duplicateReference(reference.id);
												}}
												title="Duplicate"
											>
												<Icon icon="material-symbols:content-copy" class="w-4 h-4" />
											</button>
											<button
												class="btn btn-sm btn-circle btn-error"
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

								<!-- Transform indicators -->
								{#if reference.rotation !== 0 || reference.scale !== 1 || reference.opacity !== 1 || reference.isGrayscale}
									<div class="absolute top-2 right-2 flex gap-1">
										{#if reference.rotation !== 0}
											<div class="bg-blue-500 text-white text-xs px-1 rounded" title="Rotated">
												{reference.rotation}°
											</div>
										{/if}
										{#if reference.scale !== 1}
											<div class="bg-green-500 text-white text-xs px-1 rounded" title="Scaled">
												{Math.round(reference.scale * 100)}%
											</div>
										{/if}
										{#if reference.opacity !== 1}
											<div class="bg-orange-500 text-white text-xs px-1 rounded" title="Opacity">
												{Math.round(reference.opacity * 100)}%
											</div>
										{/if}
										{#if reference.isGrayscale}
											<div class="bg-gray-500 text-white text-xs px-1 rounded" title="Grayscale">
												BW
											</div>
										{/if}
									</div>
								{/if}
							</div>

							<!-- Image name -->
							<p
								class="text-xs text-center text-base-content/70 mt-2 truncate"
								title={reference.name}
							>
								{reference.name}
							</p>
						</div>
					{/each}

					<!-- Add More Card -->
					<div
						class="aspect-square border-2 border-dashed border-base-300 hover:border-primary transition-colors duration-200 cursor-pointer rounded-lg flex items-center justify-center"
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
							<Icon
								icon="material-symbols:add-photo-alternate"
								class="w-8 h-8 mx-auto text-base-content/40 mb-2"
							/>
							<p class="text-xs text-base-content/50">Add More</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Transform Controls Panel (Mobile-first bottom sheet / Desktop sidebar) -->
			{#if showControls && selectedReference}
				<div class="absolute inset-x-0 bottom-0 md:right-0 md:top-0 md:w-80 md:inset-x-auto">
					<!-- Mobile: Bottom Sheet -->
					<div
						class="md:hidden bg-base-100 border-t border-base-300 shadow-lg p-4 max-h-80 overflow-y-auto"
					>
						<div class="flex items-center justify-between mb-4">
							<h3 class="font-semibold text-base-content">Transform: {selectedReference.name}</h3>
							<button
								class="btn btn-sm btn-circle btn-ghost"
								onclick={() => {
									showControls = false;
									selectedImageId = null;
								}}
							>
								<Icon icon="material-symbols:close" class="w-4 h-4" />
							</button>
						</div>

						<!-- Controls Content -->
						<div class="space-y-4">
							{@render transformControls(selectedReference)}
						</div>
					</div>

					<!-- Desktop: Right Sidebar -->
					<div
						class="hidden md:block bg-base-100 border-l border-base-300 shadow-lg h-full overflow-y-auto"
					>
						<div class="p-4 border-b border-base-300">
							<div class="flex items-center justify-between">
								<h3 class="font-semibold text-base-content">Transform Controls</h3>
								<button
									class="btn btn-sm btn-circle btn-ghost"
									onclick={() => {
										showControls = false;
										selectedImageId = null;
									}}
								>
									<Icon icon="material-symbols:close" class="w-4 h-4" />
								</button>
							</div>
							<p class="text-sm text-base-content/70 mt-1">{selectedReference.name}</p>
						</div>

						<div class="p-4 space-y-6">
							{@render transformControls(selectedReference)}
						</div>
					</div>
				</div>
			{/if}
		{:else}
			<!-- Empty State -->
			<div class="flex items-center justify-center h-full p-4">
				<div
					class="w-full max-w-md p-8 border-2 border-dashed border-base-300 rounded-lg text-center hover:border-primary transition-colors duration-200 cursor-pointer"
					class:border-primary={isDragOver}
					class:bg-primary={isDragOver}
					class:bg-opacity-10={isDragOver}
					ondrop={handleDrop}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					onkeydown={handleDropZoneKeydown}
					onclick={() => fileInput.click()}
					role="button"
					tabindex="0"
				>
					<Icon
						icon="material-symbols:cloud-upload"
						class="w-16 h-16 mx-auto mb-4 transition-colors {isDragOver
							? 'text-primary'
							: 'text-base-content/40'}"
					/>
					<h3 class="text-xl font-semibold mb-2 text-base-content">No References Yet</h3>
					<p class="text-base-content/70 mb-4">
						Add reference images to get started with your project
					</p>
					<button class="btn btn-primary" type="button">
						<Icon icon="material-symbols:add-photo-alternate" class="w-4 h-4" />
						Add Your First Reference
					</button>
					<p class="text-xs text-base-content/50 mt-4">
						Max {MAX_FILES_AT_ONCE} files, 50MB each
					</p>
				</div>
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
</div>

{#snippet transformControls(reference: ReferenceImage)}
	<!-- Image Preview -->
	<div class="relative aspect-video bg-base-200 rounded-lg overflow-hidden mb-4">
		<img
			src={reference.thumbnailSrc || reference.src}
			alt={reference.name}
			class="w-full h-full object-cover"
			style:opacity={reference.opacity}
			style:filter={reference.isGrayscale ? "grayscale(100%)" : "none"}
			style:transform="scale({reference.scale}) rotate({reference.rotation}deg)"
		/>
	</div>

	<!-- Rotation -->
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<label for="rotation-range" class="text-sm font-medium text-base-content">Rotation</label>
			<span class="text-sm text-base-content/70">{reference.rotation}°</span>
		</div>
		<input
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
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<label for="scale-range" class="text-sm font-medium text-base-content">Scale</label>
			<span class="text-sm text-base-content/70">{Math.round(reference.scale * 100)}%</span>
		</div>
		<input
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
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<label for="opacity-range" class="text-sm font-medium text-base-content">Opacity</label>
			<span class="text-sm text-base-content/70">{Math.round(reference.opacity * 100)}%</span>
		</div>
		<input
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

	<!-- Effects -->
	<div class="space-y-3">
		<h4 class="text-sm font-medium text-base-content">Effects</h4>

		<!-- Grayscale Toggle -->
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

		<button class="btn btn-sm btn-error btn-outline" onclick={() => removeReference(reference.id)}>
			<Icon icon="material-symbols:delete-outline" class="w-4 h-4" />
			Delete Image
		</button>
	</div>
{/snippet}
