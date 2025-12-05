<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedColorPalette } from "$lib/schemas/validation";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";
	import { dndzone, type DndEvent } from "svelte-dnd-action";
	import { flip } from "svelte/animate";
	import {
		formatColor,
		hexToHsl,
		hslToHex,
		validateAndNormalizeColor,
		adjustPaletteHue,
		adjustPaletteSaturation,
		adjustPaletteLightness,
		interpolateColors,
	} from "./palette-utils";
	import { orderColorsByHueLightness, getColorLightness } from "$lib/utils/colorUtils";

	interface Props {
		selectedColor: string;
		colorHistory: string[];
		onColorHistoryAdd: (color: string) => void;
		onShowColorPicker: () => void;
		onImport: () => void;
		onExport: (format: "json" | "css" | "png") => void;
		onCreateNew: () => void;
	}

	let {
		selectedColor,
		colorHistory,
		onColorHistoryAdd,
		onShowColorPicker,
		onImport,
		onExport,
		onCreateNew,
	}: Props = $props();

	// Locked colors state (indices that won't be affected by global adjustments)
	let lockedColors = $state<Set<number>>(new Set());

	// Global adjustment values
	let hueShift = $state(0);
	let saturationDelta = $state(0);
	let lightnessDelta = $state(0);

	// Tween mode state
	let tweenMode = $state(false);
	let tweenStartIndex = $state<number | null>(null);

	// Context menu state
	let contextMenu = $state<{
		show: boolean;
		x: number;
		y: number;
		colorIndex: number;
		color: string;
	} | null>(null);

	// DnD items derived from palette colors
	let dndItems = $derived(
		app.palettes.activePalette?.colors.map((color, index) => ({
			id: `${color}-${index}`,
			color,
			originalIndex: index,
		})) ?? []
	);

	function handleDndConsider(
		e: CustomEvent<DndEvent<{ id: string; color: string; originalIndex: number }>>
	) {
		if (!app.palettes.activePalette) return;
		const newColors = e.detail.items.map((item) => item.color);
		app.palettes.update(app.palettes.activePalette.id, { colors: newColors });
	}

	function handleDndFinalize(
		e: CustomEvent<DndEvent<{ id: string; color: string; originalIndex: number }>>
	) {
		if (!app.palettes.activePalette) return;
		const newColors = e.detail.items.map((item) => item.color);
		app.palettes.update(app.palettes.activePalette.id, { colors: newColors });
		// Reset locked indices since order changed
		lockedColors = new Set();
		toast.success("Colors reordered");
	}

	function toggleLock(index: number) {
		const newLocked = new Set(lockedColors);
		if (newLocked.has(index)) {
			newLocked.delete(index);
		} else {
			newLocked.add(index);
		}
		lockedColors = newLocked;
	}

	function applyGlobalHueShift() {
		if (!app.palettes.activePalette || hueShift === 0) return;
		const newColors = adjustPaletteHue(app.palettes.activePalette.colors, hueShift, lockedColors);
		app.palettes.update(app.palettes.activePalette.id, { colors: newColors });
		hueShift = 0;
		toast.success("Hue adjusted");
	}

	function applyGlobalSaturation() {
		if (!app.palettes.activePalette || saturationDelta === 0) return;
		const newColors = adjustPaletteSaturation(
			app.palettes.activePalette.colors,
			saturationDelta,
			lockedColors
		);
		app.palettes.update(app.palettes.activePalette.id, { colors: newColors });
		saturationDelta = 0;
		toast.success("Saturation adjusted");
	}

	function applyGlobalLightness() {
		if (!app.palettes.activePalette || lightnessDelta === 0) return;
		const newColors = adjustPaletteLightness(
			app.palettes.activePalette.colors,
			lightnessDelta,
			lockedColors
		);
		app.palettes.update(app.palettes.activePalette.id, { colors: newColors });
		lightnessDelta = 0;
		toast.success("Lightness adjusted");
	}

	function handleTweenClick(index: number) {
		if (!tweenMode) return;

		if (tweenStartIndex === null) {
			tweenStartIndex = index;
			toast.info("Now select the end color for interpolation");
		} else {
			if (tweenStartIndex === index) {
				tweenStartIndex = null;
				toast.info("Selection cancelled");
				return;
			}

			const palette = app.palettes.activePalette;
			if (!palette) return;

			const startIdx = Math.min(tweenStartIndex, index);
			const endIdx = Math.max(tweenStartIndex, index);
			const startColor = palette.colors[startIdx];
			const endColor = palette.colors[endIdx];
			const stepsNeeded = endIdx - startIdx - 1;

			if (stepsNeeded > 0 && startColor && endColor) {
				const interpolated = interpolateColors(startColor, endColor, stepsNeeded);
				const newColors = [...palette.colors];
				for (let i = 0; i < interpolated.length; i++) {
					const interpColor = interpolated[i];
					if (interpColor) newColors[startIdx + i] = interpColor;
				}
				app.palettes.update(palette.id, { colors: newColors });
				toast.success(`Generated ${stepsNeeded} intermediate colors`);
			}

			tweenMode = false;
			tweenStartIndex = null;
		}
	}

	function isDuplicateColor(color: string): boolean {
		const palette = app.palettes.activePalette;
		return palette ? palette.colors.includes(color) : false;
	}

	function addColorToPalette(color: string) {
		const palette = app.palettes.activePalette;
		if (!palette) return;

		const validation = validateAndNormalizeColor(color);
		if (!validation.valid) {
			toast.error(validation.error || "Invalid color");
			return;
		}

		const normalizedColor = validation.color;
		if (!normalizedColor) return;

		if (isDuplicateColor(normalizedColor)) {
			toast.warning("This color is already in the palette");
			return;
		}

		if (palette.colors.length >= palette.maxSlots) {
			toast.error("Palette is full");
			return;
		}

		app.palettes.addColor(palette.id, normalizedColor);
		onColorHistoryAdd(normalizedColor);
		toast.success(`Color ${normalizedColor} added`);
	}

	async function copyColor(color: string) {
		try {
			await navigator.clipboard.writeText(color);
			onColorHistoryAdd(color);
			toast.success(`${color} copied!`);
		} catch {
			toast.error("Failed to copy");
		}
	}

	function showContextMenu(event: MouseEvent, colorIndex: number, color: string) {
		event.preventDefault();
		event.stopPropagation();
		contextMenu = {
			show: true,
			x: event.clientX,
			y: event.clientY,
			colorIndex,
			color,
		};
	}

	function hideContextMenu() {
		contextMenu = null;
	}

	function deleteColor() {
		if (!contextMenu || !app.palettes.activePalette) return;
		app.palettes.removeColor(app.palettes.activePalette.id, contextMenu.colorIndex);
		toast.info(`Color removed`);
		hideContextMenu();
	}

	function fillPaletteWithHarmony(
		harmonyType: "complementary" | "analogous" | "triadic" | "monochromatic" | "split-complementary"
	) {
		const palette = app.palettes.activePalette;
		if (!palette) return;

		const baseColor = selectedColor;
		const remainingSlots = palette.maxSlots - palette.colors.length;

		if (remainingSlots <= 0) {
			toast.warning("Palette is already full");
			return;
		}

		const hsl = hexToHsl(baseColor);
		if (!hsl) return;

		const harmoniousColors: string[] = [];

		switch (harmonyType) {
			case "complementary":
				for (let i = 0; i < remainingSlots; i++) {
					const hueShift = i === 0 ? 180 : 180 + i * 15;
					const lightShift = i * 10;
					harmoniousColors.push(
						hslToHex(
							(hsl.h + hueShift) % 360,
							Math.max(20, hsl.s - lightShift),
							Math.max(10, Math.min(90, hsl.l + (i % 2 === 0 ? lightShift : -lightShift)))
						)
					);
				}
				break;
			case "analogous":
				for (let i = 0; i < remainingSlots; i++) {
					const hueShift = (i % 2 === 0 ? 30 : -30) + Math.floor(i / 2) * 15;
					harmoniousColors.push(
						hslToHex(
							(hsl.h + hueShift + 360) % 360,
							Math.max(20, hsl.s - i * 5),
							Math.max(10, Math.min(90, hsl.l + (i % 3 === 0 ? 10 : i % 3 === 1 ? 0 : -10)))
						)
					);
				}
				break;
			case "triadic":
				for (let i = 0; i < remainingSlots; i++) {
					const baseHue = i < 2 ? 120 + 120 * i : 120 + (i - 2) * 30;
					harmoniousColors.push(
						hslToHex(
							(hsl.h + baseHue) % 360,
							Math.max(20, hsl.s - i * 8),
							Math.max(10, Math.min(90, hsl.l + (i % 2 === 0 ? 15 : -15)))
						)
					);
				}
				break;
			case "monochromatic":
				for (let i = 0; i < remainingSlots; i++) {
					const lightStep = 70 / (remainingSlots + 1);
					const newL = 15 + (i + 1) * lightStep;
					const saturationVariation = i % 2 === 0 ? 10 : -5;
					harmoniousColors.push(
						hslToHex(
							hsl.h,
							Math.max(10, Math.min(100, hsl.s + saturationVariation)),
							Math.max(10, Math.min(90, newL))
						)
					);
				}
				break;
			case "split-complementary":
				for (let i = 0; i < remainingSlots; i++) {
					const baseHue = i % 2 === 0 ? 150 : 210;
					const variation = Math.floor(i / 2) * 15;
					harmoniousColors.push(
						hslToHex(
							(hsl.h + baseHue + variation) % 360,
							Math.max(20, hsl.s - i * 6),
							Math.max(10, Math.min(90, hsl.l + (i % 3 === 0 ? 10 : i % 3 === 1 ? 0 : -10)))
						)
					);
				}
				break;
		}

		const uniqueColors = harmoniousColors.filter(
			(color, idx) => !isDuplicateColor(color) && !harmoniousColors.slice(0, idx).includes(color)
		);

		uniqueColors.slice(0, remainingSlots).forEach((color) => {
			app.palettes.addColor(palette.id, color);
		});

		toast.success(`Added ${Math.min(uniqueColors.length, remainingSlots)} ${harmonyType} colors!`);
	}

	// Click outside to close context menu
	function handleDocumentClick(event: MouseEvent) {
		if (contextMenu && !(event.target as Element).closest(".context-menu")) {
			hideContextMenu();
		}
	}
</script>

<svelte:document onclick={handleDocumentClick} />

<GlassPanel class="flex-1 overflow-hidden relative" intensity="medium">
	<div class="flex flex-col h-full">
		{#if app.palettes.activePaletteId && app.palettes.activePalette}
			<div class="p-4 md:p-6 flex-1 overflow-y-auto custom-scrollbar">
				<!-- Header -->
				<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
					<div>
						<h3 class="text-2xl font-bold text-white tracking-wide">
							{app.palettes.activePalette.name}
						</h3>
						<div class="flex items-center gap-2 mt-1">
							<span class="badge badge-sm bg-phoenix-primary/20 text-phoenix-primary border-none">
								{app.palettes.activePalette.colors.length} Colors
							</span>
							{#each app.palettes.activePalette.tags as tag}
								<span class="badge badge-sm badge-ghost text-text-muted">{tag}</span>
							{/each}
						</div>
					</div>

					<!-- Actions Toolbar -->
					<div class="flex flex-wrap items-center gap-2">
						<button
							class="btn btn-sm btn-ghost text-text-muted hover:text-white"
							onclick={onImport}
							title="Import"
						>
							<Icon icon="material-symbols:file-upload" class="h-4 w-4" />
						</button>

						<div class="dropdown dropdown-end">
							<button
								class="btn btn-sm btn-ghost text-text-muted hover:text-white"
								tabindex="0"
								title="Export"
							>
								<Icon icon="material-symbols:download" class="h-4 w-4" />
							</button>
							<ul
								class="dropdown-content menu bg-void-deep border border-white/10 rounded-xl z-10 w-52 p-2 shadow-xl backdrop-blur-xl"
							>
								<li>
									<button
										onclick={() => onExport("json")}
										class="text-text-muted hover:text-white hover:bg-white/5">JSON</button
									>
								</li>
								<li>
									<button
										onclick={() => onExport("css")}
										class="text-text-muted hover:text-white hover:bg-white/5">CSS</button
									>
								</li>
								<li>
									<button
										onclick={() => onExport("png")}
										class="text-text-muted hover:text-white hover:bg-white/5">PNG Image</button
									>
								</li>
							</ul>
						</div>

						<div class="h-4 w-px bg-white/10 mx-1"></div>

						<button
							class="btn btn-sm btn-ghost text-error hover:bg-error/10"
							onclick={() => {
								if (confirm("Delete this palette?")) {
									app.palettes.remove(app.palettes.activePalette!.id);
								}
							}}
							title="Delete Palette"
						>
							<Icon icon="material-symbols:delete-outline" class="h-4 w-4" />
						</button>
					</div>
				</div>

				<!-- Global Adjustments Panel -->
				<div class="mb-6 p-4 rounded-xl bg-black/20 border border-white/5">
					<div class="flex items-center justify-between mb-3">
						<h4 class="text-sm font-medium text-text-muted uppercase tracking-wider">
							Global Adjustments
						</h4>
						<span class="text-xs text-text-muted/60">
							{lockedColors.size} color{lockedColors.size !== 1 ? "s" : ""} locked
						</span>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<!-- Hue Shift -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<label for="hue-shift-range" class="text-xs text-text-muted">Hue Shift</label>
								<span class="text-xs font-mono text-phoenix-primary">{hueShift}°</span>
							</div>
							<div class="flex gap-2">
								<input
									type="range"
									min="-180"
									max="180"
									bind:value={hueShift}
									class="range range-xs range-primary flex-1"
								/>
								<button
									class="btn btn-xs btn-ghost"
									onclick={applyGlobalHueShift}
									disabled={hueShift === 0}
								>
									Apply
								</button>
							</div>
						</div>

						<!-- Saturation -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<label for="saturation-range" class="text-xs text-text-muted">Saturation</label>
								<span class="text-xs font-mono text-phoenix-primary"
									>{saturationDelta > 0 ? "+" : ""}{saturationDelta}%</span
								>
							</div>
							<div class="flex gap-2">
								<input
									type="range"
									min="-50"
									max="50"
									bind:value={saturationDelta}
									class="range range-xs range-secondary flex-1"
								/>
								<button
									class="btn btn-xs btn-ghost"
									onclick={applyGlobalSaturation}
									disabled={saturationDelta === 0}
								>
									Apply
								</button>
							</div>
						</div>

						<!-- Lightness -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<label for="lightness-range" class="text-xs text-text-muted">Lightness</label>
								<span class="text-xs font-mono text-phoenix-primary"
									>{lightnessDelta > 0 ? "+" : ""}{lightnessDelta}%</span
								>
							</div>
							<div class="flex gap-2">
								<input
									type="range"
									min="-50"
									max="50"
									bind:value={lightnessDelta}
									class="range range-xs range-accent flex-1"
								/>
								<button
									class="btn btn-xs btn-ghost"
									onclick={applyGlobalLightness}
									disabled={lightnessDelta === 0}
								>
									Apply
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Harmony Generator -->
				<div class="mb-6 p-4 rounded-xl bg-black/20 border border-white/5">
					<h4 class="text-sm font-medium text-text-muted mb-3 uppercase tracking-wider">
						Generate Harmony
					</h4>
					<div class="flex flex-wrap gap-2">
						{#each ["complementary", "analogous", "triadic", "monochromatic", "split-complementary"] as harmony}
							<button
								class="btn btn-xs btn-outline border-white/10 text-text-muted hover:text-white hover:border-phoenix-primary hover:bg-phoenix-primary/10 capitalize"
								onclick={() => fillPaletteWithHarmony(harmony as any)}
							>
								{harmony.replace("-", " ")}
							</button>
						{/each}
					</div>
				</div>

				<!-- Tools Row -->
				<div class="flex flex-wrap justify-between items-center gap-2 mb-4">
					<div class="flex gap-2">
						<button
							class={cn(
								"btn btn-xs",
								tweenMode ? "btn-primary" : "btn-ghost text-text-muted hover:text-white"
							)}
							onclick={() => {
								tweenMode = !tweenMode;
								tweenStartIndex = null;
								if (tweenMode) {
									toast.info("Select two colors to interpolate between them");
								}
							}}
							title="Interpolate between two colors"
						>
							<Icon icon="material-symbols:gradient" class="w-4 h-4" />
							Tween
						</button>
					</div>

					<div class="flex gap-2">
						<button
							class="btn btn-xs btn-ghost text-text-muted hover:text-white"
							onclick={() => {
								if (app.palettes.activePalette) {
									const sorted = orderColorsByHueLightness(app.palettes.activePalette.colors);
									app.palettes.update(app.palettes.activePalette.id, { colors: sorted });
									lockedColors = new Set();
									toast.success("Sorted by Hue");
								}
							}}
							title="Sort by Hue"
						>
							<Icon icon="material-symbols:sort" class="w-4 h-4" />
							Sort Hue
						</button>
						<button
							class="btn btn-xs btn-ghost text-text-muted hover:text-white"
							onclick={() => {
								if (app.palettes.activePalette) {
									const sorted = [...app.palettes.activePalette.colors].sort((a, b) => {
										return getColorLightness(a) - getColorLightness(b);
									});
									app.palettes.update(app.palettes.activePalette.id, { colors: sorted });
									lockedColors = new Set();
									toast.success("Sorted by Lightness");
								}
							}}
							title="Sort by Lightness"
						>
							<Icon icon="material-symbols:format-list-bulleted" class="w-4 h-4" />
							Sort Light
						</button>
					</div>
				</div>

				<!-- Color Grid with DnD -->
				<div
					class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8 p-1"
					use:dndzone={{ items: dndItems, flipDurationMs: 200, dropTargetStyle: {} }}
					onconsider={handleDndConsider}
					onfinalize={handleDndFinalize}
				>
					{#each dndItems as item, index (item.id)}
						<div class="group relative" animate:flip={{ duration: 200 }}>
							<!-- Lock indicator -->
							{#if lockedColors.has(index)}
								<div class="absolute -top-1 -right-1 z-20">
									<div class="bg-phoenix-primary text-white rounded-full p-0.5">
										<Icon icon="material-symbols:lock" class="w-3 h-3" />
									</div>
								</div>
							{/if}

							<!-- Tween selection indicator -->
							{#if tweenMode && tweenStartIndex === index}
								<div
									class="absolute inset-0 ring-2 ring-phoenix-primary ring-offset-2 ring-offset-void-deep rounded-2xl z-10 pointer-events-none"
								></div>
							{/if}

							<button
								class={cn(
									"aspect-square rounded-2xl shadow-lg cursor-pointer w-full transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-phoenix-primary/30 hover:z-10 relative overflow-hidden border-2 border-white/10 group-active:scale-95",
									tweenMode && "cursor-crosshair"
								)}
								style:background-color={item.color}
								onclick={() => {
									if (tweenMode) {
										handleTweenClick(index);
									} else {
										copyColor(item.color);
									}
								}}
								oncontextmenu={(e) => showContextMenu(e, index, item.color)}
								type="button"
							>
								<!-- Glass Shine -->
								<div
									class="absolute inset-0 bg-linear-to-br from-white/40 to-transparent opacity-50 pointer-events-none"
								></div>

								<!-- Lock/Unlock on hover -->
								<div
									class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm p-1 rounded-full text-white hover:bg-black/60 cursor-pointer"
									role="button"
									tabindex="0"
									onclick={(e) => {
										e.stopPropagation();
										toggleLock(index);
									}}
									onkeydown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.stopPropagation();
											e.preventDefault();
											toggleLock(index);
										}
									}}
									title={lockedColors.has(index) ? "Unlock" : "Lock"}
								>
									<Icon
										icon={lockedColors.has(index)
											? "material-symbols:lock-open"
											: "material-symbols:lock"}
										class="w-3 h-3"
									/>
								</div>

								<!-- Copy Icon Overlay -->
								{#if !tweenMode}
									<div
										class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 scale-50 group-hover:scale-100"
									>
										<div
											class="bg-black/40 backdrop-blur-md p-2 rounded-full text-white shadow-lg border border-white/20"
										>
											<Icon icon="material-symbols:content-copy" class="w-5 h-5" />
										</div>
									</div>
								{/if}
							</button>

							<div class="mt-2 text-center">
								<p
									class="text-xs font-mono text-text-muted group-hover:text-white transition-colors select-all"
								>
									{formatColor(item.color, "hex")}
								</p>
							</div>
						</div>
					{/each}

					<!-- Add Slots -->
					{#each Array(Math.max(0, app.palettes.activePalette.maxSlots - app.palettes.activePalette.colors.length)) as _}
						<button
							class="aspect-square rounded-2xl border-2 border-dashed border-white/20 hover:border-phoenix-primary hover:bg-phoenix-primary/10 transition-all duration-300 flex items-center justify-center group hover:scale-105 active:scale-95"
							onclick={() => addColorToPalette(selectedColor)}
							type="button"
						>
							<div
								class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-phoenix-primary/20 transition-colors"
							>
								<Icon
									icon="material-symbols:add"
									class="w-6 h-6 text-white/50 group-hover:text-phoenix-primary transition-colors"
								/>
							</div>
						</button>
					{/each}
				</div>

				<!-- Recent Colors (History) -->
				{#if colorHistory.length > 0}
					<div class="border-t border-white/5 pt-6">
						<h4 class="text-sm font-medium text-text-muted mb-4 uppercase tracking-wider">
							Recent Colors
						</h4>
						<div class="flex flex-wrap gap-2">
							{#each colorHistory.slice(0, 12) as color}
								<button
									class="w-8 h-8 rounded-full border border-white/10 cursor-pointer hover:scale-110 transition-transform shadow-sm"
									style:background-color={color}
									onclick={() => addColorToPalette(color)}
									title={color}
									type="button"
								></button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Empty State -->
			<div class="flex items-center justify-center h-full">
				<div class="text-center text-text-muted/50">
					<div
						class="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 animate-float"
					>
						<Icon icon="material-symbols:palette-outline" class="h-12 w-12 opacity-50" />
					</div>
					<h3 class="text-xl font-bold text-white mb-2">No Palette Selected</h3>
					<p class="mb-6 max-w-xs mx-auto">
						Select a palette from the list or create a new one to start designing.
					</p>
					<button
						class="btn btn-primary bg-linear-to-r from-phoenix-primary to-phoenix-violet border-none text-white shadow-lg hover:shadow-phoenix-primary/50"
						onclick={onCreateNew}
						type="button"
					>
						Create Palette
					</button>
				</div>
			</div>
		{/if}
	</div>
</GlassPanel>

<!-- Context Menu -->
{#if contextMenu?.show}
	<div
		class="fixed bg-base-100 rounded-lg shadow-xl border border-base-300 py-2 z-50 context-menu"
		style:left="{contextMenu.x}px"
		style:top="{contextMenu.y}px"
	>
		<button
			class="flex items-center space-x-3 px-4 py-2 hover:bg-base-200 w-full text-left"
			onclick={() => {
				onShowColorPicker();
				hideContextMenu();
			}}
			type="button"
		>
			<Icon icon="material-symbols:edit" class="h-4 w-4" />
			<span>Change Color</span>
		</button>
		<button
			class="flex items-center space-x-3 px-4 py-2 hover:bg-base-200 w-full text-left"
			onclick={() => {
				toggleLock(contextMenu!.colorIndex);
				hideContextMenu();
			}}
			type="button"
		>
			<Icon
				icon={lockedColors.has(contextMenu.colorIndex)
					? "material-symbols:lock-open"
					: "material-symbols:lock"}
				class="h-4 w-4"
			/>
			<span>{lockedColors.has(contextMenu.colorIndex) ? "Unlock" : "Lock"} Color</span>
		</button>
		<button
			class="flex items-center space-x-3 px-4 py-2 hover:bg-base-200 w-full text-left text-error"
			onclick={deleteColor}
			type="button"
		>
			<Icon icon="material-symbols:delete-outline" class="h-4 w-4" />
			<span>Delete Color</span>
		</button>
		<hr class="my-1 border-base-300" />
		<button
			class="flex items-center space-x-3 px-4 py-2 hover:bg-base-200 w-full text-left"
			onclick={() => {
				if (contextMenu) {
					copyColor(contextMenu.color);
					hideContextMenu();
				}
			}}
			type="button"
		>
			<Icon icon="material-symbols:content-copy" class="h-4 w-4" />
			<span>Copy Color</span>
		</button>
	</div>
{/if}

<style>
	.animate-float {
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}
</style>
