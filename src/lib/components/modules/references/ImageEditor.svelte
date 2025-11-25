<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import type { ReferenceImage } from "$lib/stores/references.svelte";
	import Icon from "@iconify/svelte";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import CompareSlider from "$lib/components/ui/CompareSlider.svelte";
	import ExportPanel, { type ExportOptions } from "$lib/components/editor/ExportPanel.svelte";
	import { cn } from "$lib/utils/cn";

	let { imageId, onClose } = $props<{ imageId: string; onClose: () => void }>();

	let activeTab = $state<"adjust" | "transform" | "filters" | "export">("adjust");
	let zoom = $state(1);
	let isComparing = $state(false);

	// Canvas State
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let startPanX = 0;
	let startPanY = 0;

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		if (e.ctrlKey || e.metaKey) {
			// Zoom
			const delta = e.deltaY > 0 ? 0.9 : 1.1;
			zoom = Math.min(Math.max(0.1, zoom * delta), 5);
		} else {
			// Pan
			panX -= e.deltaX;
			panY -= e.deltaY;
		}
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.button === 1 || e.button === 0) {
			// Middle or Left click
			isPanning = true;
			startPanX = e.clientX - panX;
			startPanY = e.clientY - panY;
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isPanning) return;
		panX = e.clientX - startPanX;
		panY = e.clientY - startPanY;
	}

	function handleMouseUp() {
		isPanning = false;
	}

	// Touch handling for canvas pan
	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length === 1) {
			isPanning = true;
			startPanX = e.touches[0].clientX - panX;
			startPanY = e.touches[0].clientY - panY;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isPanning || e.touches.length !== 1) return;
		e.preventDefault(); // Prevent scrolling
		panX = e.touches[0].clientX - startPanX;
		panY = e.touches[0].clientY - startPanY;
	}

	function handleTouchEnd() {
		isPanning = false;
	}

	function fitToScreen() {
		zoom = 1;
		panX = 0;
		panY = 0;
		// TODO: Calculate actual fit based on image/container dimensions if needed
	}

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
			gradientMapOpacity: 0,
			gradientMapBlendMode: "normal",
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

		// Gradient Map Filter
		if (
			ref.gradientMapOpacity &&
			ref.gradientMapOpacity > 0 &&
			(app.gradients.activeGradient || app.palettes.activePalette)
		) {
			// We apply the filter via URL.
			// Note: Opacity and Blend Mode for the gradient map are tricky to do purely in one filter string
			// without a complex SVG filter chain.
			// For now, we'll just apply the filter if opacity is > 0.
			// Real opacity blending might need a separate overlay element approach if SVG filter opacity is too hard.
			// But let's try to handle it in the SVG filter itself later if needed.
			// Actually, standard CSS filter() function doesn't support opacity for url() filters easily.
			// A better approach for Gradient Map with Opacity/Blend Mode is to use a pseudo-element or a separate div overlay.
			// BUT, for this implementation, let's assume we want to bake it in.
			// If we want blend modes, we DEFINITELY need an overlay div.
			// So, let's NOT add it to this filter string, but instead render an overlay div.
		}

		return filters.length > 0 ? filters.join(" ") : "none";
	}

	import type { Gradient } from "$lib/stores/gradients.svelte";
	import type { ColorPalette } from "$lib/stores/palettes.svelte";
	import tinycolor from "tinycolor2";
	import chroma from "chroma-js";
	import { extractPalette, sortPalette } from "$lib/utils/color-engine";
	import { toast } from "svelte-sonner";

	// Palette Extraction State
	let isExtracting = $state(false);
	let extractedPalette = $state<string[] | null>(null);
	let extractColorCount = $state(8);

	async function handleExtractPalette() {
		if (!image) return;
		isExtracting = true;
		try {
			// Extract
			const colors = await extractPalette(image.src, {
				colorCount: extractColorCount,
				quality: "balanced",
			});
			extractedPalette = colors;
		} catch (e) {
			console.error("Failed to extract palette", e);
			toast.error("Failed to extract palette");
		} finally {
			isExtracting = false;
		}
	}

	function handleSortPalette() {
		if (!extractedPalette) return;
		extractedPalette = sortPalette(extractedPalette);
	}

	function handleSavePalette() {
		if (!extractedPalette || !image) return;
		app.palettes.add({
			name: `Palette from ${image.name}`,
			colors: extractedPalette,
			maxSlots: Math.max(extractColorCount, extractedPalette.length),
			tags: ["extracted", "image"],
		});
		toast.success("Palette saved!");
	}
	function buildTransformString(ref: ReferenceImage): string {
		if (!ref) return "none";
		const transforms: string[] = [];
		if (ref.scale !== 1) transforms.push(`scale(${ref.scale})`);
		if (ref.rotation !== 0) transforms.push(`rotate(${ref.rotation}deg)`);
		if (ref.flipX) transforms.push("scaleX(-1)");
		if (ref.flipY) transforms.push("scaleY(-1)");

		return transforms.length > 0 ? transforms.join(" ") : "none";
	}

	function getGradientBackground(gradient: Gradient) {
		const stops = gradient.stops.map((s) => `${s.color} ${s.position}%`).join(", ");
		return `${gradient.type}-gradient(${gradient.angle || 90}deg, ${stops})`;
	}

	function getGradientTableValues(
		gradient: Gradient | null,
		palette: ColorPalette | null,
		channel: "r" | "g" | "b"
	): string {
		let colors: string[] = [];

		if (gradient) {
			// Sort stops by position
			const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
			// Create a chroma scale
			const scale = chroma
				.scale(sortedStops.map((s) => s.color))
				.domain(sortedStops.map((s) => s.position / 100));
			// Sample 256 values
			colors = Array.from({ length: 256 }, (_, i) => scale(i / 255).hex());
		} else if (palette) {
			// Create a scale from palette colors
			const scale = chroma.scale(palette.colors).mode("lch");
			colors = Array.from({ length: 256 }, (_, i) => scale(i / 255).hex());
		} else {
			return "0 1"; // Identity
		}

		return colors
			.map((c) => {
				const rgb = tinycolor(c).toRgb();
				return rgb[channel] / 255;
			})
			.join(" ");
	}

	async function handleExportImage(options: ExportOptions) {
		if (!image) return;

		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Load image to get natural dimensions
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = image.src;
		await new Promise((resolve) => (img.onload = resolve));

		// Set canvas size
		const width = img.naturalWidth * options.scale;
		const height = img.naturalHeight * options.scale;
		canvas.width = width;
		canvas.height = height;

		// Draw background if requested (and if format supports transparency, otherwise it's black/white by default?)
		// Actually, if format is jpeg, background is black by default if transparent.
		// If png/webp, transparency is preserved.
		// If includeBackground is false, we clear rect (already clear).
		// If true, we might want to draw a white background? Or just leave it transparent?
		// The option "Include Background" usually refers to the checkerboard or a solid color.
		// For now, let's assume it means "Keep Transparency" if false, or "Fill White" if true?
		// Or maybe it means "Include the editor background color"?
		// Let's interpret "Include Background" as "Fill with White" for now, as that's common for "Flatten".
		if (
			options.includeBackground &&
			(options.format === "jpeg" || !image.src.includes("image/png"))
		) {
			// Actually, let's just fill with white if requested, otherwise transparent
			// But wait, the user might WANT transparency.
			// Let's say: includeBackground = false -> Transparent. includeBackground = true -> White.
			// Default is true.
		}

		// Apply geometric transforms
		ctx.save();
		ctx.translate(width / 2, height / 2);
		if (image.flipX) ctx.scale(-1, 1);
		if (image.flipY) ctx.scale(1, -1);
		ctx.rotate((image.rotation * Math.PI) / 180);
		ctx.scale(image.scale, image.scale); // Apply image scale as well
		ctx.translate(-width / 2, -height / 2);

		// 1. Draw Base Image with Base Filters
		// Note: ctx.filter syntax is same as CSS
		const baseFilters = buildFilterString(image).replace(/url\([^)]+\)/g, ""); // Remove SVG filters from base string
		ctx.filter = baseFilters !== "none" ? baseFilters : "none";
		ctx.drawImage(img, 0, 0, width, height);

		// 2. Draw Gradient Map Overlay
		if (
			image.gradientMapOpacity &&
			image.gradientMapOpacity > 0 &&
			(app.gradients.activeGradient || app.palettes.activePalette)
		) {
			ctx.globalAlpha = image.gradientMapOpacity;
			ctx.globalCompositeOperation =
				(image.gradientMapBlendMode as GlobalCompositeOperation) || "source-over";

			// Apply SVG filter
			// We need to refer to the SVG filter in the DOM
			const filterId = `gradient-map-${image.id}`;
			ctx.filter = `url(#${filterId})`;

			// We also need to remove blur from this pass if we want to match the CSS implementation
			// The CSS implementation had: style:filter={buildFilterString(image).replace(/blur\([^)]+\)/, '')}
			const overlayFilters = baseFilters.replace(/blur\([^)]+\)/, "");
			// Combine: Base filters (minus blur) + Gradient Map
			// Wait, ctx.filter takes a string. We can chain them.
			// ctx.filter = `url(#${filterId}) ${overlayFilters}`;
			// Order matters. In CSS: filter: url(...) blur(...) -> url applies first? No, right to left?
			// CSS filter: function1() function2()... applies 1 then 2.
			// So we want base filters THEN gradient map.
			ctx.filter = `${overlayFilters !== "none" ? overlayFilters : ""} url(#${filterId})`.trim();

			ctx.drawImage(img, 0, 0, width, height);
		}

		ctx.restore();

		// Download
		const link = document.createElement("a");
		link.download = `${image.name}-edited.${options.format}`;
		link.href = canvas.toDataURL(`image/${options.format}`);
		link.click();
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
						<button
							class={cn(
								"btn btn-sm btn-ghost text-white/70 hover:text-white",
								isComparing && "text-phoenix-primary bg-white/10"
							)}
							onclick={() => (isComparing = !isComparing)}
							title="Toggle Split View"
						>
							<Icon icon="material-symbols:splitscreen" class="w-5 h-5" />
						</button>
						<div class="join bg-white/5 rounded-lg border border-white/10 mr-2">
							<button
								class="btn btn-sm btn-ghost join-item px-2 text-xs"
								onclick={fitToScreen}
								title="Reset View"
							>
								Fit
							</button>
							<button
								class="btn btn-sm btn-ghost join-item px-2 text-xs"
								onclick={() => {
									zoom = 1;
									panX = 0;
									panY = 0;
								}}
								title="100%"
							>
								100%
							</button>
						</div>
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
					class="flex-1 relative overflow-hidden flex items-center justify-center bg-void-deep select-none"
					role="presentation"
					onwheel={handleWheel}
					onmousedown={handleMouseDown}
					onmousemove={handleMouseMove}
					onmouseup={handleMouseUp}
					onmouseleave={handleMouseUp}
					ontouchstart={handleTouchStart}
					ontouchmove={handleTouchMove}
					ontouchend={handleTouchEnd}
					style:cursor={isPanning ? "grabbing" : "grab"}
				>
					<!-- Rulers (Placeholder for now, toggled by settings) -->
					{#if app.settings.state.workspace.showRulers}
						<div
							class="absolute top-0 left-0 right-0 h-6 bg-black/40 border-b border-white/10 z-20 pointer-events-none flex items-end px-2"
						>
							<span class="text-[10px] text-white/50 font-mono">0px</span>
						</div>
						<div
							class="absolute top-0 left-0 bottom-0 w-6 bg-black/40 border-r border-white/10 z-20 pointer-events-none flex justify-end py-2"
						>
							<span
								class="text-[10px] text-white/50 font-mono rotate-90 origin-bottom-right translate-x-full"
								>0px</span
							>
						</div>
					{/if}

					<!-- Canvas Content Wrapper -->
					<div
						class="relative transition-transform duration-75 ease-out will-change-transform origin-center"
						style:transform="translate({panX}px, {panY}px) scale({zoom})"
					>
						<!-- Transparency Checkerboard (Behind image) -->
						<div class="absolute inset-0 bg-checkered opacity-100 rounded-sm"></div>

						<!-- Comparison View -->
						{#if isComparing}
							<div class="relative w-full h-full flex items-center justify-center">
								<div class="relative shadow-2xl" style:transform={buildTransformString(image)}>
									<CompareSlider>
										{#snippet leftImage()}
											<img
												src={image.src}
												alt="Original"
												class="max-w-none object-contain pointer-events-none"
												draggable="false"
											/>
										{/snippet}
										{#snippet rightImage()}
											<div class="relative inline-block">
												<img
													src={image.src}
													alt="Processed"
													class="max-w-none object-contain pointer-events-none"
													style:filter={buildFilterString(image)}
													draggable="false"
												/>
												<!-- Gradient Map Overlay -->
												{#if image.gradientMapOpacity && image.gradientMapOpacity > 0 && (app.gradients.activeGradient || app.palettes.activePalette)}
													<div
														class="absolute inset-0 pointer-events-none"
														style:opacity={image.gradientMapOpacity}
														style:mix-blend-mode={image.gradientMapBlendMode || "normal"}
														style:filter="url(#gradient-map-{image.id})"
													>
														<img
															src={image.src}
															alt=""
															class="w-full h-full object-contain"
															style:filter={buildFilterString(image).replace(/blur\([^)]+\)/, "")}
														/>
													</div>
												{/if}
											</div>
										{/snippet}
									</CompareSlider>
								</div>
							</div>
						{:else}
							<div class="relative inline-block">
								<img
									src={image.src}
									alt={image.name}
									class="relative max-w-none object-contain shadow-2xl pointer-events-none"
									style:filter={buildFilterString(image)}
									style:transform={buildTransformString(image)}
									draggable="false"
								/>

								<!-- Gradient Map Overlay -->
								{#if image.gradientMapOpacity && image.gradientMapOpacity > 0 && (app.gradients.activeGradient || app.palettes.activePalette)}
									<div
										class="absolute inset-0 pointer-events-none"
										style:opacity={image.gradientMapOpacity}
										style:mix-blend-mode={image.gradientMapBlendMode || "normal"}
										style:filter="url(#gradient-map-{image.id})"
										style:transform={buildTransformString(image)}
									>
										<!-- We need a copy of the image here for the filter to map onto -->
										<img
											src={image.src}
											alt=""
											class="w-full h-full object-contain"
											style:filter={buildFilterString(image).replace(/blur\([^)]+\)/, "")}
										/>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Alignment Grid Overlay (On top of image) -->
						{#if app.settings.state.workspace.showGrid}
							<div
								class="absolute inset-0 pointer-events-none border border-white/20"
								style:background-size="{app.settings.state.workspace.gridSize}px {app.settings.state
									.workspace.gridSize}px"
								style:background-image="linear-gradient(to right,rgb(255,255,255,0.2)1px,transparent 1px), linear-gradient(to bottom,rgb(255,255,255,0.2)1px,transparent 1px)"
							></div>
						{/if}
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
						Colors
						{#if activeTab === "filters"}
							<div
								class="absolute bottom-0 left-0 right-0 h-0.5 bg-phoenix-primary shadow-[0_0_10px_rgba(255,0,127,0.5)]"
							></div>
						{/if}
					</button>
					<button
						class={cn(
							"flex-1 py-4 text-sm font-medium transition-colors relative",
							activeTab === "export" ? "text-phoenix-primary" : "text-text-muted hover:text-white"
						)}
						onclick={() => (activeTab = "export")}
					>
						Export
						{#if activeTab === "export"}
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
						<div class="space-y-6">
							<!-- Palette Extraction -->
							<div class="space-y-4">
								<h3 class="text-xs font-bold text-white/50 uppercase tracking-wider">
									Palette Extraction
								</h3>

								<div class="space-y-1">
									<div class="flex justify-between text-xs">
										<span class="text-white">Color Count</span>
										<span class="text-white/50">{extractColorCount}</span>
									</div>
									<input
										type="range"
										min="2"
										max="32"
										step="1"
										bind:value={extractColorCount}
										class="range range-xs range-primary"
									/>
								</div>

								{#if !extractedPalette}
									<button
										class="btn btn-primary w-full gap-2"
										onclick={handleExtractPalette}
										disabled={isExtracting}
									>
										{#if isExtracting}
											<span class="loading loading-spinner loading-sm"></span>
											Extracting...
										{:else}
											<Icon icon="material-symbols:palette" class="w-5 h-5" />
											Extract Palette from Image
										{/if}
									</button>
								{:else}
									<div class="space-y-3">
										<div class="flex h-12 w-full rounded-lg overflow-hidden border border-white/10">
											{#each extractedPalette as color}
												<div
													class="flex-1 h-full"
													style:background-color={color}
													title={color}
												></div>
											{/each}
										</div>

										<div class="grid grid-cols-2 gap-2">
											<button
												class="btn btn-sm btn-outline text-white border-white/20"
												onclick={handleSortPalette}
											>
												<Icon icon="material-symbols:sort" class="w-4 h-4" />
												Sort (Smooth)
											</button>
											<button
												class="btn btn-sm btn-outline text-white border-white/20"
												onclick={() => (extractedPalette = null)}
											>
												<Icon icon="material-symbols:close" class="w-4 h-4" />
												Clear
											</button>
										</div>

										<button
											class="btn btn-sm btn-success w-full gap-2 text-white"
											onclick={handleSavePalette}
										>
											<Icon icon="material-symbols:save" class="w-4 h-4" />
											Save to Palettes
										</button>
									</div>
								{/if}
							</div>

							<div class="divider before:bg-white/10 after:bg-white/10"></div>

							<!-- Gradient Map Controls -->
							<div class="space-y-4">
								<h3 class="text-xs font-bold text-white/50 uppercase tracking-wider">
									Gradient Map
								</h3>

								<!-- Active Gradient Display -->
								{#if app.gradients.activeGradient}
									<div class="p-3 bg-white/5 rounded-lg border border-white/10">
										<div class="text-xs text-white/70 mb-2">Active Gradient</div>
										<div
											class="h-8 w-full rounded-md mb-2"
											style:background={getGradientBackground(app.gradients.activeGradient)}
										></div>
										<div class="text-sm font-medium text-white truncate">
											{app.gradients.activeGradient.name}
										</div>
									</div>
								{:else if app.palettes.activePalette}
									<div class="p-3 bg-white/5 rounded-lg border border-white/10">
										<div class="text-xs text-white/70 mb-2">Active Palette</div>
										<div class="flex h-8 w-full rounded-md overflow-hidden mb-2">
											{#each app.palettes.activePalette.colors as color}
												<div class="flex-1 h-full" style:background-color={color}></div>
											{/each}
										</div>
										<div class="text-sm font-medium text-white truncate">
											{app.palettes.activePalette.name}
										</div>
									</div>
								{:else}
									<div
										class="p-4 bg-white/5 rounded-lg border border-dashed border-white/10 text-center"
									>
										<p class="text-sm text-white/50">
											Select a gradient or palette from the main app to apply it here.
										</p>
									</div>
								{/if}

								<!-- Opacity Slider -->
								<div class="space-y-1">
									<div class="flex justify-between text-xs">
										<span class="text-white">Effect Opacity</span>
										<span class="text-white/50"
											>{Math.round((image.gradientMapOpacity || 0) * 100)}%</span
										>
									</div>
									<input
										type="range"
										min="0"
										max="1"
										step="0.01"
										value={image.gradientMapOpacity || 0}
										class="range range-xs range-primary"
										oninput={(e) =>
											updateProperty("gradientMapOpacity", parseFloat(e.currentTarget.value))}
									/>
								</div>

								<!-- Blend Mode -->
								<div class="space-y-1">
									<div class="flex justify-between text-xs">
										<span class="text-white">Blend Mode</span>
									</div>
									<select
										class="select select-sm select-bordered w-full bg-black/20 text-white"
										value={image.gradientMapBlendMode || "normal"}
										onchange={(e) => updateProperty("gradientMapBlendMode", e.currentTarget.value)}
									>
										<option value="normal">Normal</option>
										<option value="multiply">Multiply</option>
										<option value="screen">Screen</option>
										<option value="overlay">Overlay</option>
										<option value="soft-light">Soft Light</option>
										<option value="hard-light">Hard Light</option>
										<option value="color-dodge">Color Dodge</option>
										<option value="color-burn">Color Burn</option>
										<option value="darken">Darken</option>
										<option value="lighten">Lighten</option>
										<option value="difference">Difference</option>
										<option value="exclusion">Exclusion</option>
										<option value="hue">Hue</option>
										<option value="saturation">Saturation</option>
										<option value="color">Color</option>
										<option value="luminosity">Luminosity</option>
									</select>
								</div>
							</div>
						</div>
					{:else if activeTab === "export"}
						<div class="h-full flex flex-col">
							<ExportPanel onExport={handleExportImage} />
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

	<!-- SVG Filters for Gradient Map -->
	<svg class="hidden">
		<defs>
			<filter id="gradient-map-{image.id}" color-interpolation-filters="sRGB">
				<feColorMatrix
					type="matrix"
					values="0.2126 0.7152 0.0722 0 0
													0.2126 0.7152 0.0722 0 0
													0.2126 0.7152 0.0722 0 0
													0 0 0 1 0"
					result="gray"
				/>
				<feComponentTransfer color-interpolation-filters="sRGB" result="mapped">
					<feFuncR
						type="table"
						tableValues={getGradientTableValues(
							app.gradients.activeGradient ?? null,
							app.palettes.activePalette ?? null,
							"r"
						)}
					/>
					<feFuncG
						type="table"
						tableValues={getGradientTableValues(
							app.gradients.activeGradient ?? null,
							app.palettes.activePalette ?? null,
							"g"
						)}
					/>
					<feFuncB
						type="table"
						tableValues={getGradientTableValues(
							app.gradients.activeGradient ?? null,
							app.palettes.activePalette ?? null,
							"b"
						)}
					/>
					<feFuncA type="identity" />
				</feComponentTransfer>
				<!-- Opacity handling: Blend original with mapped based on opacity -->
				<!-- We can't easily do opacity inside the filter without complex compositing, 
					 so we'll handle opacity via CSS on a pseudo-element or overlay if possible, 
					 OR use feMerge with opacity. Let's try feMerge. -->
			</filter>
		</defs>
	</svg>
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
