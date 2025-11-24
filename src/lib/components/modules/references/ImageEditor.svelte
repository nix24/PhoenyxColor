<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import type { ReferenceImage } from "$lib/stores/references.svelte";
	import Icon from "@iconify/svelte";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";
	import { onMount } from "svelte";

	let { imageId, onClose } = $props<{ imageId: string; onClose: () => void }>();

	let activeTab = $state<"adjust" | "transform" | "filters">("adjust");
	let zoom = $state(1);
	let isComparing = $state(false);

	// Get the image from the store
	let image = $derived(app.references.references.find((r) => r.id === imageId));

	// Local state for edits to allow "Cancel"
	// For now, we'll edit live but maybe add undo later via the store's history

	function updateProperty(property: keyof ReferenceImage, value: any) {
		if (!image) return;
		app.references.update(imageId, { [property]: value });
	}

	function resetAll() {
		if (!image) return;
		app.references.update(imageId, {
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
	}

	function buildFilterString(ref: ReferenceImage | undefined): string {
		if (!ref) return "none";
		if (isComparing) return "none";

		const filters: string[] = [];
		if (ref.isGrayscale) filters.push("grayscale(100%)");
		if (ref.sepia) filters.push(`sepia(${ref.sepia}%)`);
		if (ref.invert) filters.push(`invert(${ref.invert}%)`);
		if (ref.brightness !== 100) filters.push(`brightness(${ref.brightness}%)`);
		if (ref.contrast !== 100) filters.push(`contrast(${ref.contrast}%)`);
		if (ref.saturation !== 100) filters.push(`saturate(${ref.saturation}%)`);
		if (ref.hueRotate !== 0) filters.push(`hue-rotate(${ref.hueRotate}deg)`);
		if (ref.blur !== 0) filters.push(`blur(${ref.blur}px)`);

		return filters.length > 0 ? filters.join(" ") : "none";
	}

	function buildTransformString(ref: ReferenceImage | undefined): string {
		if (!ref) return "none";
		// We don't apply zoom here, zoom is for the canvas view
		// But we do apply the image's own scale/rotation/flip
		const transforms: string[] = [];
		if (ref.scale !== 1) transforms.push(`scale(${ref.scale})`);
		if (ref.rotation !== 0) transforms.push(`rotate(${ref.rotation}deg)`);
		if (ref.flipX) transforms.push("scaleX(-1)");
		if (ref.flipY) transforms.push("scaleY(-1)");

		return transforms.length > 0 ? transforms.join(" ") : "none";
	}
</script>

{#if image}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
		<div class="w-full h-full flex flex-col md:flex-row overflow-hidden bg-void-deep">
			<!-- Main Canvas Area -->
			<div class="flex-1 relative overflow-hidden flex flex-col">
				<!-- Toolbar -->
				<div
					class="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/20 backdrop-blur-md z-10"
				>
					<div class="flex items-center gap-2">
						<button class="btn btn-sm btn-ghost text-white" onclick={onClose}>
							<Icon icon="material-symbols:arrow-back" class="w-5 h-5" />
							Back
						</button>
						<span class="text-white/50">|</span>
						<h2 class="text-white font-medium truncate max-w-[200px]">{image.name}</h2>
					</div>

					<div class="flex items-center gap-2">
						<button
							class="btn btn-sm btn-ghost text-white/70 hover:text-white"
							onmousedown={() => (isComparing = true)}
							onmouseup={() => (isComparing = false)}
							onmouseleave={() => (isComparing = false)}
							title="Hold to compare"
						>
							<Icon icon="material-symbols:compare" class="w-5 h-5" />
						</button>
						<div class="join bg-white/5 rounded-lg border border-white/10">
							<button
								class="btn btn-sm btn-ghost join-item px-2"
								onclick={() => (zoom = Math.max(0.1, zoom - 0.1))}
							>
								<Icon icon="material-symbols:remove" class="w-4 h-4" />
							</button>
							<span
								class="flex items-center px-2 text-xs font-mono text-white/70 min-w-[3rem] justify-center"
							>
								{Math.round(zoom * 100)}%
							</span>
							<button
								class="btn btn-sm btn-ghost join-item px-2"
								onclick={() => (zoom = Math.min(5, zoom + 0.1))}
							>
								<Icon icon="material-symbols:add" class="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>

				<!-- Canvas -->
				<div
					class="flex-1 relative overflow-auto flex items-center justify-center p-8 bg-checkered"
				>
					<!-- Checkerboard background pattern via CSS class or inline style -->
					<div
						class="relative transition-all duration-200 ease-out shadow-2xl"
						style:transform="scale({zoom})"
					>
						<img
							src={image.src}
							alt={image.name}
							class="max-w-full max-h-[80vh] object-contain transition-all duration-200"
							style:filter={buildFilterString(image)}
							style:transform={buildTransformString(image)}
						/>
					</div>
				</div>
			</div>

			<!-- Sidebar Controls -->
			<GlassPanel
				class="w-full md:w-80 lg:w-96 flex flex-col border-l border-white/10 shrink-0 z-20"
				intensity="high"
			>
				<!-- Tabs -->
				<div class="flex border-b border-white/10">
					<button
						class={cn(
							"flex-1 py-4 text-sm font-medium transition-colors relative",
							activeTab === "adjust" ? "text-phoenix-primary" : "text-text-muted hover:text-white"
						)}
						onclick={() => (activeTab = "adjust")}
					>
						Adjust
						{#if activeTab === "adjust"}
							<div
								class="absolute bottom-0 left-0 right-0 h-0.5 bg-phoenix-primary shadow-[0_0_10px_rgba(255,0,127,0.5)]"
							></div>
						{/if}
					</button>
					<button
						class={cn(
							"flex-1 py-4 text-sm font-medium transition-colors relative",
							activeTab === "transform"
								? "text-phoenix-primary"
								: "text-text-muted hover:text-white"
						)}
						onclick={() => (activeTab = "transform")}
					>
						Transform
						{#if activeTab === "transform"}
							<div
								class="absolute bottom-0 left-0 right-0 h-0.5 bg-phoenix-primary shadow-[0_0_10px_rgba(255,0,127,0.5)]"
							></div>
						{/if}
					</button>
					<button
						class={cn(
							"flex-1 py-4 text-sm font-medium transition-colors relative",
							activeTab === "filters" ? "text-phoenix-primary" : "text-text-muted hover:text-white"
						)}
						onclick={() => (activeTab = "filters")}
					>
						Filters
						{#if activeTab === "filters"}
							<div
								class="absolute bottom-0 left-0 right-0 h-0.5 bg-phoenix-primary shadow-[0_0_10px_rgba(255,0,127,0.5)]"
							></div>
						{/if}
					</button>
				</div>

				<!-- Controls Area -->
				<div class="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
					{#if activeTab === "adjust"}
						<!-- Light -->
						<div class="space-y-4">
							<h3 class="text-xs font-bold text-white/50 uppercase tracking-wider">
								Light & Color
							</h3>

							<div class="space-y-1">
								<div class="flex justify-between text-xs">
									<span class="text-white">Brightness</span>
									<span class="text-white/50">{image.brightness}%</span>
								</div>
								<input
									type="range"
									min="0"
									max="200"
									value={image.brightness}
									class="range range-xs range-primary"
									oninput={(e) => updateProperty("brightness", parseInt(e.currentTarget.value))}
								/>
							</div>

							<div class="space-y-1">
								<div class="flex justify-between text-xs">
									<span class="text-white">Contrast</span>
									<span class="text-white/50">{image.contrast}%</span>
								</div>
								<input
									type="range"
									min="0"
									max="200"
									value={image.contrast}
									class="range range-xs range-primary"
									oninput={(e) => updateProperty("contrast", parseInt(e.currentTarget.value))}
								/>
							</div>

							<div class="space-y-1">
								<div class="flex justify-between text-xs">
									<span class="text-white">Saturation</span>
									<span class="text-white/50">{image.saturation}%</span>
								</div>
								<input
									type="range"
									min="0"
									max="200"
									value={image.saturation}
									class="range range-xs range-primary"
									oninput={(e) => updateProperty("saturation", parseInt(e.currentTarget.value))}
								/>
							</div>

							<div class="space-y-1">
								<div class="flex justify-between text-xs">
									<span class="text-white">Hue</span>
									<span class="text-white/50">{image.hueRotate}°</span>
								</div>
								<input
									type="range"
									min="0"
									max="360"
									value={image.hueRotate}
									class="range range-xs range-secondary"
									oninput={(e) => updateProperty("hueRotate", parseInt(e.currentTarget.value))}
								/>
							</div>
						</div>

						<!-- Effects -->
						<div class="space-y-4 pt-4 border-t border-white/10">
							<h3 class="text-xs font-bold text-white/50 uppercase tracking-wider">Effects</h3>

							<div class="space-y-1">
								<div class="flex justify-between text-xs">
									<span class="text-white">Blur</span>
									<span class="text-white/50">{image.blur}px</span>
								</div>
								<input
									type="range"
									min="0"
									max="20"
									value={image.blur}
									class="range range-xs range-accent"
									oninput={(e) => updateProperty("blur", parseInt(e.currentTarget.value))}
								/>
							</div>

							<div class="space-y-1">
								<div class="flex justify-between text-xs">
									<span class="text-white">Opacity</span>
									<span class="text-white/50">{Math.round(image.opacity * 100)}%</span>
								</div>
								<input
									type="range"
									min="0"
									max="1"
									step="0.01"
									value={image.opacity}
									class="range range-xs range-accent"
									oninput={(e) => updateProperty("opacity", parseFloat(e.currentTarget.value))}
								/>
							</div>

							<div class="space-y-1">
								<div class="flex justify-between text-xs">
									<span class="text-white">Sepia</span>
									<span class="text-white/50">{image.sepia || 0}%</span>
								</div>
								<input
									type="range"
									min="0"
									max="100"
									value={image.sepia || 0}
									class="range range-xs range-warning"
									oninput={(e) => updateProperty("sepia", parseInt(e.currentTarget.value))}
								/>
							</div>

							<div class="space-y-1">
								<div class="flex justify-between text-xs">
									<span class="text-white">Invert</span>
									<span class="text-white/50">{image.invert || 0}%</span>
								</div>
								<input
									type="range"
									min="0"
									max="100"
									value={image.invert || 0}
									class="range range-xs range-error"
									oninput={(e) => updateProperty("invert", parseInt(e.currentTarget.value))}
								/>
							</div>

							<div class="form-control">
								<label class="label cursor-pointer justify-start gap-3">
									<input
										type="checkbox"
										class="toggle toggle-sm toggle-primary"
										checked={image.isGrayscale}
										onchange={(e) => updateProperty("isGrayscale", e.currentTarget.checked)}
									/>
									<span class="label-text text-white">Grayscale</span>
								</label>
							</div>
						</div>
					{:else if activeTab === "transform"}
						<div class="space-y-6">
							<!-- Flip -->
							<div class="space-y-2">
								<h3 class="text-xs font-bold text-white/50 uppercase tracking-wider">Flip</h3>
								<div class="flex gap-2">
									<button
										class={cn(
											"btn btn-sm flex-1 gap-2",
											image.flipX ? "btn-primary" : "btn-outline border-white/20 text-white"
										)}
										onclick={() => updateProperty("flipX", !image.flipX)}
									>
										<Icon icon="material-symbols:swap-horiz" class="w-5 h-5" />
										Horizontal
									</button>
									<button
										class={cn(
											"btn btn-sm flex-1 gap-2",
											image.flipY ? "btn-primary" : "btn-outline border-white/20 text-white"
										)}
										onclick={() => updateProperty("flipY", !image.flipY)}
									>
										<Icon icon="material-symbols:swap-vert" class="w-5 h-5" />
										Vertical
									</button>
								</div>
							</div>

							<!-- Rotate -->
							<div class="space-y-2">
								<h3 class="text-xs font-bold text-white/50 uppercase tracking-wider">Rotate</h3>
								<div class="flex gap-2 mb-2">
									<button
										class="btn btn-sm btn-outline flex-1 border-white/20 text-white"
										onclick={() => updateProperty("rotation", image.rotation - 90)}
									>
										<Icon icon="material-symbols:rotate-left" class="w-5 h-5" />
										-90°
									</button>
									<button
										class="btn btn-sm btn-outline flex-1 border-white/20 text-white"
										onclick={() => updateProperty("rotation", image.rotation + 90)}
									>
										<Icon icon="material-symbols:rotate-right" class="w-5 h-5" />
										+90°
									</button>
								</div>
								<div class="space-y-1">
									<div class="flex justify-between text-xs">
										<span class="text-white">Fine Rotation</span>
										<span class="text-white/50">{image.rotation}°</span>
									</div>
									<input
										type="range"
										min="0"
										max="360"
										value={image.rotation}
										class="range range-xs range-primary"
										oninput={(e) => updateProperty("rotation", parseInt(e.currentTarget.value))}
									/>
								</div>
							</div>

							<!-- Scale -->
							<div class="space-y-2">
								<h3 class="text-xs font-bold text-white/50 uppercase tracking-wider">Scale</h3>
								<div class="space-y-1">
									<div class="flex justify-between text-xs">
										<span class="text-white">Image Scale</span>
										<span class="text-white/50">{Math.round(image.scale * 100)}%</span>
									</div>
									<input
										type="range"
										min="0.1"
										max="3"
										step="0.1"
										value={image.scale}
										class="range range-xs range-primary"
										oninput={(e) => updateProperty("scale", parseFloat(e.currentTarget.value))}
									/>
								</div>
							</div>
						</div>
					{:else if activeTab === "filters"}
						<div class="text-center py-10 text-white/50">
							<Icon
								icon="material-symbols:auto-fix-high"
								class="w-12 h-12 mx-auto mb-2 opacity-50"
							/>
							<p>Presets coming soon!</p>
						</div>
					{/if}
				</div>

				<!-- Footer Actions -->
				<div class="p-4 border-t border-white/10 bg-black/20">
					<button class="btn btn-outline btn-error btn-sm w-full gap-2" onclick={resetAll}>
						<Icon icon="material-symbols:restart-alt" class="w-4 h-4" />
						Reset All Changes
					</button>
				</div>
			</GlassPanel>
		</div>
	</div>
{/if}

<style>
	.bg-checkered {
		background-image:
			linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
			linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
			linear-gradient(-45deg, transparent 75%, #1a1a1a 75%);
		background-size: 20px 20px;
		background-position:
			0 0,
			0 10px,
			10px -10px,
			-10px 0px;
	}
</style>
