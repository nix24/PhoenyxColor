<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import Icon from "@iconify/svelte";
	import { dndzone } from "svelte-dnd-action";
	import { cn } from "$lib/utils/cn";
	import {
		getContrastRatio,
		getWcagLevel,
		generateAnalogousColors,
		generateTriadicColors,
		generateComplementaryColor,
		generateSplitComplementaryColors,
		generateMonochromaticColors,
	} from "./palette-utils";
	import { toast } from "svelte-sonner";

	interface Props {
		activeColorIndex: number | null;
		onColorIndexSelect: (index: number) => void;
	}

	let { activeColorIndex, onColorIndexSelect }: Props = $props();

	// Local state for dnd - this is key! We manage items locally, not derived.
	let localItems = $state<Array<{ id: string; color: string; index: number }>>([]);

	// Sync local items when palette changes (but not during drag)
	let isDragging = $state(false);

	$effect(() => {
		if (!isDragging && app.palettes.activePalette) {
			localItems = app.palettes.activePalette.colors.map((color, index) => ({
				id: `color-${index}-${color}`,
				color,
				index,
			}));
		}
	});

	function handleDndConsider(e: CustomEvent<any>) {
		isDragging = true;
		localItems = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<any>) {
		isDragging = false;
		localItems = e.detail.items;

		if (!app.palettes.activePalette) return;

		// Extract colors from reordered items
		const newColors = localItems.map((item) => item.color);
		app.palettes.update(app.palettes.activePalette.id, { colors: newColors });
	}

	// Accessibility Checks derived from active palette
	let activePaletteColors = $derived(app.palettes.activePalette?.colors ?? []);

	let accessibilityStats = $derived.by(() => {
		if (activePaletteColors.length < 2) return { aaa: 0, aa: 0, fail: 0, bestRatio: 0 };

		let aaa = 0;
		let aa = 0;
		let fail = 0;
		let bestRatio = 0;

		for (let i = 0; i < activePaletteColors.length; i++) {
			for (let j = i + 1; j < activePaletteColors.length; j++) {
				const ratio = getContrastRatio(activePaletteColors[i]!, activePaletteColors[j]!);
				if (ratio > bestRatio) bestRatio = ratio;
				const level = getWcagLevel(ratio);
				if (level.aaa) aaa++;
				else if (level.aa) aa++;
				else fail++;
			}
		}
		return { aaa, aa, fail, bestRatio };
	});

	function setActiveIndex(index: number) {
		onColorIndexSelect(index);
	}

	function addColor() {
		if (app.palettes.activePaletteId) {
			app.palettes.addColor(app.palettes.activePaletteId, "#808080");
		}
	}

	function removeColor(idx: number, e: Event) {
		e.stopPropagation();
		if (app.palettes.activePaletteId) {
			app.palettes.removeColor(app.palettes.activePaletteId, idx);
		}
	}

	// Harmony generation
	let selectedHarmony = $state<string>("none");
	const harmonyOptions = [
		{ value: "none", label: "Select Harmony..." },
		{ value: "complementary", label: "Complementary" },
		{ value: "analogous", label: "Analogous" },
		{ value: "triadic", label: "Triadic" },
		{ value: "split-complementary", label: "Split Complementary" },
		{ value: "monochromatic", label: "Monochromatic" },
	];

	function applyHarmony() {
		if (!app.palettes.activePalette || selectedHarmony === "none") return;

		const baseColor =
			(activeColorIndex !== null && activePaletteColors[activeColorIndex]) ||
			activePaletteColors[0] ||
			"#FF0080";
		let newColors: string[] = [baseColor];

		switch (selectedHarmony) {
			case "complementary":
				newColors.push(generateComplementaryColor(baseColor));
				break;
			case "analogous":
				newColors.push(...generateAnalogousColors(baseColor));
				break;
			case "triadic":
				newColors.push(...generateTriadicColors(baseColor));
				break;
			case "split-complementary":
				newColors.push(...generateSplitComplementaryColors(baseColor));
				break;
			case "monochromatic":
				newColors.push(...generateMonochromaticColors(baseColor, 4));
				break;
		}

		const harmonyName = selectedHarmony;
		app.palettes.update(app.palettes.activePalette.id, { colors: newColors });
		selectedHarmony = "none";
		toast.success(`Applied ${harmonyName} harmony!`);
	}

	function handleUndo() {
		toast.info("Undo not yet implemented");
	}

	function handleRedo() {
		toast.info("Redo not yet implemented");
	}

	// Calculate minimum width needed for hex code display
	function getMinWidth(colorCount: number): string {
		// Each color needs at least 80px to show hex code fully
		const minPerColor = 80;
		const total = colorCount * minPerColor;
		return `${Math.max(total, 400)}px`;
	}
</script>

<div
	class="flex-1 flex flex-col h-full overflow-hidden bg-black/20 rounded-xl border border-white/5 relative"
>
	{#if app.palettes.activePalette}
		<!-- Header -->
		<div
			class="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-black/40"
		>
			<div class="flex items-center gap-3">
				<h2 class="text-white font-bold text-lg">{app.palettes.activePalette.name}</h2>
				<button class="text-text-muted hover:text-white" aria-label="Edit palette name">
					<Icon icon="material-symbols:edit" class="w-4 h-4" />
				</button>
			</div>

			<div class="flex items-center gap-4">
				<button class="text-text-muted hover:text-white" title="Undo" onclick={handleUndo}>
					<Icon icon="material-symbols:undo" class="w-5 h-5" />
				</button>
				<button class="text-text-muted hover:text-white" title="Redo" onclick={handleRedo}>
					<Icon icon="material-symbols:redo" class="w-5 h-5" />
				</button>
				<div class="w-px h-4 bg-white/10 mx-2"></div>
				<select
					bind:value={selectedHarmony}
					onchange={applyHarmony}
					class="select select-sm bg-white/5 border-white/10 text-white text-xs"
				>
					{#each harmonyOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Main Color Area -->
		<div class="flex-1 min-h-0 relative flex flex-col items-stretch overflow-hidden">
			<div class="flex-1 overflow-x-auto overflow-y-hidden p-6">
				<div
					class="h-full flex rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
					style:min-width="fit-content"
					use:dndzone={{
						items: localItems,
						flipDurationMs: 200,
						type: "palette-colors",
					}}
					onconsider={handleDndConsider}
					onfinalize={handleDndFinalize}
				>
					{#each localItems as item, idx (item.id)}
						<div
							class={cn(
								"h-full w-20 min-w-20 shrink-0 relative group transition-colors duration-200 ease-out cursor-pointer",
								activeColorIndex === idx && "ring-4 ring-white/40 ring-inset"
							)}
							style:background-color={item.color}
							onclick={() => setActiveIndex(idx)}
							tabindex="0"
							onkeydown={(e) => e.key === "Enter" && setActiveIndex(idx)}
							role="button"
							aria-label={`Select color ${item.color}`}
						>
							<!-- Delete button -->
							<button
								class="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 text-white/70 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
								onclick={(e) => removeColor(idx, e)}
								aria-label="Remove color"
							>
								<Icon icon="material-symbols:close" class="w-4 h-4" />
							</button>

							<!-- Drag Handle -->
							<div
								class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 rounded hover:bg-black/20 text-white/80"
								aria-hidden="true"
							>
								<Icon icon="material-symbols:drag-indicator" class="w-4 h-4" />
							</div>

							<!-- Color hex code - smaller text -->
							<div
								class="absolute inset-x-0 bottom-0 p-3 flex flex-col items-center justify-end text-center mix-blend-difference"
							>
								<span class="text-sm font-bold font-mono tracking-wide text-white drop-shadow-lg"
									>{item.color.toUpperCase()}</span
								>
								<span class="text-[10px] opacity-70 uppercase tracking-wider font-medium text-white"
									>Color {idx + 1}</span
								>
							</div>
						</div>
					{/each}
					<!-- Add Color Button -->
					{#if localItems.length < (app.palettes.activePalette?.maxSlots ?? 10)}
						<button
							class="h-full min-w-[80px] w-20 shrink-0 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 border-l border-white/10 transition-colors group"
							onclick={addColor}
							aria-label="Add new color"
						>
							<Icon
								icon="material-symbols:add-circle-outline"
								class="w-8 h-8 text-white/30 group-hover:text-white/60 transition-colors"
							/>
							<span class="text-[10px] text-white/30 group-hover:text-white/60 mt-1">Add</span>
						</button>
					{/if}
				</div>
			</div>
			{#if localItems.length === 0}
				<div class="absolute inset-0 flex items-center justify-center text-text-muted/50">
					<p>Click + to add colors</p>
				</div>
			{/if}
		</div>

		<!-- Footer / Stats -->
		<div class="h-20 bg-black/40 border-t border-white/5 flex items-center px-6 gap-6">
			<div class="flex items-center gap-2">
				<div class="w-4 h-4 rounded bg-green-500"></div>
				<span class="text-sm text-white font-medium">{accessibilityStats.aaa} AAA</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="w-4 h-4 rounded bg-blue-500"></div>
				<span class="text-sm text-white font-medium">{accessibilityStats.aa} AA</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="w-4 h-4 rounded bg-red-500"></div>
				<span class="text-sm text-white font-medium">{accessibilityStats.fail} Fail</span>
			</div>
			<div class="ml-auto text-xs text-text-muted">
				Best contrast: {accessibilityStats.bestRatio.toFixed(1)}:1
			</div>
		</div>
	{:else}
		<div class="w-full h-full flex items-center justify-center text-text-muted">
			<div class="text-center">
				<Icon icon="material-symbols:palette-outline" class="w-12 h-12 mx-auto mb-4 opacity-20" />
				<p>Select a palette to edit</p>
			</div>
		</div>
	{/if}
</div>
