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

	function removeReference(id: string) {
		const reference = appStore.references.find((ref) => ref.id === id);
		if (reference) {
			appStore.removeReference(id);
			toast.info(`Removed "${reference.name}"`);

			if (selectedImageId === id) {
				selectedImageId = null;
			}
		}
	}

	function clearAllReferences() {
		if (appStore.references.length === 0) return;

		const count = appStore.references.length;
		appStore.references.forEach((ref) => appStore.removeReference(ref.id));
		selectedImageId = null;
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
</script>

<div class="h-full flex flex-col bg-base-100">
	<!-- Header -->
	<div
		class="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 border-b border-base-300 bg-base-100 gap-4"
	>
		<div>
			<h2 class="text-xl md:text-2xl font-bold text-base-content">Reference Images</h2>
			<p class="text-sm text-base-content/70">
				Manage your reference images for inspiration and color picking
			</p>
		</div>

		<div
			class="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3"
		>
			<button
				class="btn btn-primary btn-sm w-full sm:w-auto"
				onclick={() => fileInput.click()}
				type="button"
				aria-label="Add reference images"
			>
				<Icon icon="material-symbols:add" class="w-4 h-4" />
				Add Images
			</button>

			<button
				class="btn btn-outline btn-error btn-sm w-full sm:w-auto"
				title="Clear All References"
				onclick={clearAllReferences}
				type="button"
				disabled={appStore.references.length === 0}
				aria-label="Clear all reference images"
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
	<div class="flex-1 overflow-hidden">
		{#if appStore.references.length > 0}
			<!-- References Grid -->
			<div class="h-full overflow-y-auto p-4">
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{#each appStore.references as reference (reference.id)}
						<div
							class="card bg-base-100 shadow-lg border border-base-300 hover:shadow-xl transition-all duration-200"
						>
							<!-- Image -->
							<figure class="relative aspect-video overflow-hidden">
								<img
									src={reference.thumbnailSrc || reference.src}
									alt={reference.name}
									class="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
									style:opacity={reference.opacity}
									style:filter={reference.isGrayscale ? "grayscale(100%)" : "none"}
									loading="lazy"
								/>

								<!-- Overlay Controls -->
								<div
									class="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200 flex items-center justify-center opacity-0 hover:opacity-100"
								>
									<div class="flex space-x-2">
										<button
											class="btn btn-sm btn-circle btn-primary"
											onclick={() => duplicateReference(reference.id)}
											title="Duplicate"
											type="button"
										>
											<Icon icon="material-symbols:content-copy" class="w-4 h-4" />
										</button>
										<button
											class="btn btn-sm btn-circle btn-error"
											onclick={() => removeReference(reference.id)}
											title="Delete"
											type="button"
										>
											<Icon icon="material-symbols:delete-outline" class="w-4 h-4" />
										</button>
									</div>
								</div>
							</figure>

							<!-- Content -->
							<div class="card-body p-4">
								<h3 class="card-title text-sm font-medium truncate" title={reference.name}>
									{reference.name}
								</h3>

								<!-- Quick Stats -->
								<div class="text-xs text-base-content/60 space-y-1">
									<div class="flex justify-between">
										<span>Scale:</span>
										<span>{Math.round(reference.scale * 100)}%</span>
									</div>
									<div class="flex justify-between">
										<span>Rotation:</span>
										<span>{reference.rotation}°</span>
									</div>
									<div class="flex justify-between">
										<span>Opacity:</span>
										<span>{Math.round(reference.opacity * 100)}%</span>
									</div>
								</div>

								<!-- Controls -->
								<div class="mt-3 space-y-2">
									<!-- Opacity -->
									<div class="flex items-center space-x-2">
										<label for="opacity-range" class="text-xs text-base-content/70 w-12"
											>Opacity:</label
										>
										<input
											type="range"
											min="0"
											max="1"
											step="0.05"
											value={reference.opacity}
											class="range range-xs range-primary flex-1"
											oninput={(e) => {
												const value = parseFloat((e.target as HTMLInputElement)?.value || "1");
												appStore.updateReference(reference.id, {
													opacity: value,
												});
											}}
										/>
									</div>

									<!-- Scale -->
									<div class="flex items-center space-x-2">
										<label for="scale-range" class="text-xs text-base-content/70 w-12">Scale:</label
										>
										<input
											type="range"
											min="0.1"
											max="3"
											step="0.1"
											value={reference.scale}
											class="range range-xs range-primary flex-1"
											oninput={(e) => {
												const value = parseFloat((e.target as HTMLInputElement)?.value || "1");
												appStore.updateReference(reference.id, {
													scale: value,
												});
											}}
										/>
									</div>

									<!-- Rotation -->
									<div class="flex items-center space-x-2">
										<label for="rotation-range" class="text-xs text-base-content/70 w-12"
											>Rotate:</label
										>
										<input
											type="range"
											min="0"
											max="360"
											step="5"
											value={reference.rotation}
											class="range range-xs range-primary flex-1"
											oninput={(e) => {
												const value = parseInt((e.target as HTMLInputElement)?.value || "0");
												appStore.updateReference(reference.id, {
													rotation: value,
												});
											}}
										/>
									</div>

									<!-- Grayscale Toggle -->
									<div class="flex items-center justify-between">
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												type="checkbox"
												checked={reference.isGrayscale}
												onchange={(e) => {
													const checked = (e.target as HTMLInputElement)?.checked || false;
													appStore.updateReference(reference.id, {
														isGrayscale: checked,
													});
												}}
												class="checkbox checkbox-xs"
											/>
											<span class="text-xs text-base-content/70">Grayscale</span>
										</label>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Add More Images Card -->
				<div
					class="card bg-base-200 border-2 border-dashed border-base-300 hover:border-primary transition-colors duration-200 cursor-pointer"
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
					<div class="card-body items-center text-center">
						<Icon
							icon="material-symbols:add-photo-alternate"
							class="w-12 h-12 text-base-content/40"
						/>
						<h3 class="text-sm font-medium text-base-content/70">Add More Images</h3>
						<p class="text-xs text-base-content/50">Click or drag & drop</p>
					</div>
				</div>
			</div>
		{:else}
			<!-- Empty State with Drop Zone -->
			<div class="flex items-center justify-center h-full p-4">
				<div
					class="w-full max-w-md p-8 border-2 border-dashed border-base-300 rounded-lg text-center hover:border-primary transition-colors duration-200 cursor-pointer"
					class:border-primary={isDragOver}
					class:bg-primary-bg={isDragOver}
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

<style>
	.bg-primary-bg {
		background-color: hsl(var(--p) / 0.1);
	}
</style>
