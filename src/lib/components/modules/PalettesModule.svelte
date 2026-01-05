<script lang="ts">
	import { scale } from "svelte/transition";
	import { elasticOut } from "svelte/easing";
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedColorPalette } from "$lib/schemas/validation";
	import pkg from "file-saver";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import { extractPalette } from "$lib/utils/color-engine";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";
	import { validatePalette } from "$lib/schemas/validation";

	// Sub-components
	import PaletteList from "./palettes/PaletteList.svelte";
	import PaletteEditor from "./palettes/PaletteEditor.svelte";
	import PaletteInspector from "./palettes/PaletteInspector.svelte";
	import { isValidHexColor, normalizeHexColor } from "./palettes/palette-utils";

	const { saveAs } = pkg;

	// State
	let newPaletteName = $state("");
	let showCreateDialog = $state(false);
	let newPaletteSlots = $state(5);
	let activeColorIndex = $state<number | null>(null); // Index-based selection
	let colorHistory: string[] = $state(["#FF0080", "#00E5FF", "#FFB800"]);
	let searchTerm = $state("");

	// Color extraction state
	let showExtractDialog = $state(false);
	let showImagePicker = $state(false);
	let extractSlots = $state(5);
	let extractingFrom: string | null = $state(null);

	function addToColorHistory(color: string) {
		if (!colorHistory.includes(color)) {
			colorHistory = [color, ...colorHistory.slice(0, 19)];
		}
	}

	function validatePaletteName(name: string): { valid: boolean; error?: string } {
		const trimmed = name.trim();
		if (!trimmed) return { valid: false, error: "Palette name cannot be empty" };
		if (trimmed.length > 50)
			return { valid: false, error: "Palette name too long (max 50 characters)" };
		if (app.palettes.palettes.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
			return { valid: false, error: "A palette with this name already exists" };
		}
		return { valid: true };
	}

	function createPalette() {
		const validation = validatePaletteName(newPaletteName);
		if (!validation.valid) {
			toast.error(validation.error || "Invalid palette name");
			return;
		}

		if (newPaletteSlots < 3 || newPaletteSlots > 50) {
			toast.error("Number of slots must be between 3 and 50");
			return;
		}

		const paletteName = newPaletteName.trim();
		app.palettes.add({
			name: paletteName,
			colors: [],
			maxSlots: newPaletteSlots,
			tags: [],
		});

		newPaletteName = "";
		showCreateDialog = false;
		toast.success(`Palette "${paletteName}" created!`);
	}

	function exportPalette(format: "json" | "css" | "png") {
		const palette = app.palettes.activePalette;
		if (!palette) return;

		const validation = validatePalette(palette);
		if (!validation.valid) {
			toast.error(`Cannot export invalid palette: ${validation.error}`);
			return;
		}

		let content = "";
		let filename = "";
		let mimeType = "text/plain";

		switch (format) {
			case "json":
				content = JSON.stringify(
					{
						id: palette.id,
						name: palette.name,
						colors: palette.colors,
						maxSlots: palette.maxSlots,
						createdAt: palette.createdAt.toISOString(),
						tags: palette.tags,
					},
					null,
					2
				);
				filename = `${palette.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "palette"}.json`;
				mimeType = "application/json";
				break;
			case "css":
				content = `:root {\n${palette.colors
					.map(
						(color, index) =>
							`  --color-${palette.name.replace(/\s+/g, "-").toLowerCase()}-${index + 1}: ${color};`
					)
					.join("\n")}\n}`;
				filename = `${palette.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "palette"}.css`;
				break;
			case "png":
				exportPaletteAsImage(palette);
				return;
		}

		const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
		saveAs(blob, filename);
		toast.success(`Palette exported as ${filename}`);
	}

	function exportPaletteAsImage(palette: ValidatedColorPalette) {
		const swatchSize = 100;
		const padding = 10;
		const textHeight = 30;
		const totalColors = palette.colors.length;
		if (totalColors === 0) {
			toast.error("Cannot export empty palette as image.");
			return;
		}

		const canvasWidth = totalColors * swatchSize + (totalColors + 1) * padding;
		const canvasHeight = swatchSize + 2 * padding + textHeight;

		const canvas = document.createElement("canvas");
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			toast.error("Failed to create canvas for PNG export");
			return;
		}

		ctx.fillStyle = "#1a1a2e";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		palette.colors.forEach((color, index) => {
			const x = padding + index * (swatchSize + padding);
			ctx.fillStyle = color;
			ctx.fillRect(x, padding, swatchSize, swatchSize);

			ctx.fillStyle = "#ffffff";
			ctx.font = "12px monospace";
			ctx.textAlign = "center";
			ctx.fillText(color, x + swatchSize / 2, padding + swatchSize + textHeight / 1.5);
		});

		canvas.toBlob((blob) => {
			if (blob) {
				saveAs(blob, `${palette.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "palette"}.png`);
				toast.success(`Palette exported as PNG.`);
			} else {
				toast.error("Failed to generate PNG blob.");
			}
		}, "image/png");
	}

	// Color extraction functions
	function buildFilterString(reference: any): string {
		const filters: string[] = [];
		if (reference.isGrayscale) filters.push("grayscale(100%)");
		if (reference.brightness !== undefined && reference.brightness !== 100) {
			filters.push(`brightness(${reference.brightness}%)`);
		}
		if (reference.contrast !== undefined && reference.contrast !== 100) {
			filters.push(`contrast(${reference.contrast}%)`);
		}
		if (reference.saturation !== undefined && reference.saturation !== 100) {
			filters.push(`saturate(${reference.saturation}%)`);
		}
		if (reference.hueRotate !== undefined && reference.hueRotate !== 0) {
			filters.push(`hue-rotate(${reference.hueRotate}deg)`);
		}
		if (reference.blur !== undefined && reference.blur !== 0) {
			filters.push(`blur(${reference.blur}px)`);
		}
		return filters.length > 0 ? filters.join(" ") : "none";
	}

	async function extractColorsFromTransformedImage(
		reference: any,
		numColors: number
	): Promise<string[]> {
		return new Promise((resolve, reject) => {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			const img = new Image();

			img.onload = async () => {
				const maxSize = 200;
				const scale = Math.min(maxSize / img.width, maxSize / img.height);
				canvas.width = img.width * scale;
				canvas.height = img.height * scale;

				if (!ctx) {
					reject(new Error("Failed to create canvas context"));
					return;
				}

				const filterString = buildFilterString(reference);
				if (filterString !== "none") {
					ctx.filter = filterString;
				}

				ctx.globalAlpha = reference.opacity || 1;
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

				try {
					const dataUrl = canvas.toDataURL();
					const colors = await extractPalette(dataUrl, {
						colorCount: numColors,
						quality: "balanced",
					});
					resolve(colors);
				} catch (error) {
					reject(error);
				}
			};

			img.onerror = () => reject(new Error("Failed to load image"));
			img.crossOrigin = "anonymous";
			img.src = reference.src;
		});
	}

	async function startColorExtraction(referenceId: string) {
		const reference = app.references.references.find((r) => r.id === referenceId);
		if (!reference) {
			toast.error("Reference not found");
			return;
		}
		extractingFrom = referenceId;
		showExtractDialog = true;
	}

	async function createPaletteFromReference() {
		if (!extractingFrom) return;

		const reference = app.references.references.find((r) => r.id === extractingFrom);
		if (!reference) {
			toast.error("Reference not found");
			return;
		}

		try {
			toast.info("Extracting colors from transformed image...");
			const colors = await extractColorsFromTransformedImage(reference, extractSlots);

			const baseName = reference.name.split(".")[0] ?? reference.name;
			const suffix = " Colors";
			const maxBaseLength = 50 - suffix.length;
			const truncatedBaseName =
				baseName.length > maxBaseLength ? baseName.substring(0, maxBaseLength).trim() : baseName;

			let uniqueName = `${truncatedBaseName}${suffix}`;
			let counter = 1;
			while (app.palettes.palettes.some((p) => p.name === uniqueName)) {
				const counterSuffix = ` ${counter}`;
				const maxNameLength = 50 - counterSuffix.length;
				const basePaletteName =
					uniqueName.length > maxNameLength
						? uniqueName.substring(0, maxNameLength).trim()
						: uniqueName;
				uniqueName = `${basePaletteName}${counterSuffix}`;
				counter++;
			}

			app.palettes.add({
				name: uniqueName,
				colors: colors,
				maxSlots: extractSlots,
				tags: ["extracted"],
			});

			showExtractDialog = false;
			extractingFrom = null;
			toast.success(`Created palette "${uniqueName}" with ${colors.length} colors!`);
		} catch (error) {
			toast.error("Failed to extract colors from image");
			console.error(error);
		}
	}

	function handleColorChange(newColor: string) {
		if (!app.palettes.activePaletteId || activeColorIndex === null) return;

		const palette = app.palettes.activePalette;
		if (!palette) return;

		const newColors = [...palette.colors];
		if (activeColorIndex >= 0 && activeColorIndex < newColors.length) {
			newColors[activeColorIndex] = newColor;
			app.palettes.update(palette.id, { colors: newColors });
			addToColorHistory(newColor);
		}
	}

	function deletePalette() {
		if (!app.palettes.activePaletteId) return;
		const name = app.palettes.activePalette?.name || "Palette";
		app.palettes.remove(app.palettes.activePaletteId);
		activeColorIndex = null;
		toast.success(`Deleted "${name}"`);
	}

	function openImagePicker() {
		if (!app.references?.references || app.references.references.length === 0) {
			toast.error("No reference images available. Add images in the References module first.");
			return;
		}
		showImagePicker = true;
	}

	function selectImageForExtraction(refId: string) {
		showImagePicker = false;
		startColorExtraction(refId);
	}
	// View State for Mobile
	type MobileView = "list" | "editor" | "inspector";
	let mobileView = $state<MobileView>("list");
	let containerWidth = $state(0);

	function handlePaletteSelect() {
		// Switch to editor view if container is small (mobile layout)
		if (containerWidth < 768) {
			mobileView = "editor";
		}
	}

	function handleBackToList() {
		mobileView = "list";
		activeColorIndex = null;
	}

	function toggleInspector() {
		if (mobileView === "inspector") {
			mobileView = "editor";
		} else {
			mobileView = "inspector";
		}
	}
</script>

<div
	class="h-full w-full bg-void text-text-muted relative overflow-hidden @container"
	bind:clientWidth={containerWidth}
>
	<!-- DESKTOP LAYOUT (Container query based) -->
	<div class="hidden @md:flex h-full w-full gap-0">
		<!-- LEFT SIDEBAR -->
		<div class="shrink-0 w-72 lg:w-80 border-r border-white/5 bg-void-deep">
			<PaletteList
				{searchTerm}
				onCreateNew={() => (showCreateDialog = true)}
				onExtract={openImagePicker}
				onDelete={deletePalette}
			/>
		</div>

		<!-- MAIN EDITOR AREA -->
		<div class="flex-1 min-w-0 bg-void p-4 overflow-hidden relative">
			<PaletteEditor
				{activeColorIndex}
				onColorIndexSelect={(idx: number) => (activeColorIndex = idx)}
			/>
		</div>

		<!-- RIGHT INSPECTOR SIDEBAR -->
		<div class="w-80 shrink-0 border-l border-white/5 bg-void-deep">
			<PaletteInspector
				{activeColorIndex}
				{colorHistory}
				onColorChange={handleColorChange}
				onExport={exportPalette}
				onColorHistorySelect={(color: string) => {
					if (activeColorIndex !== null) {
						handleColorChange(color);
					}
				}}
			/>
		</div>
	</div>

	<!-- MOBILE LAYOUT -->
	<div class="@md:hidden h-full w-full relative">
		<!-- HEADER / NAVIGATION FOR MOBILE -->
		{#if mobileView !== "list"}
			<div
				class="absolute top-0 left-0 right-0 h-14 bg-void-deep border-b border-white/5 flex items-center justify-between px-4 z-20"
			>
				<button class="btn btn-ghost btn-sm btn-square" onclick={handleBackToList}>
					<Icon icon="lucide:arrow-left" class="w-5 h-5" />
				</button>
				<span class="font-medium text-sm">
					{app.palettes.activePalette?.name || "Editor"}
				</span>
				<button
					class="btn btn-ghost btn-sm btn-square {mobileView === 'inspector'
						? 'bg-white/10 text-white'
						: ''}"
					onclick={toggleInspector}
				>
					<Icon icon="lucide:settings-2" class="w-5 h-5" />
				</button>
			</div>
		{/if}

		<!-- VIEWS -->
		<div class="h-full w-full transition-all duration-300" class:pt-14={mobileView !== "list"}>
			<!-- LIST VIEW -->
			<div class="{mobileView === 'list' ? 'block' : 'hidden'} h-full">
				<PaletteList
					{searchTerm}
					onCreateNew={() => (showCreateDialog = true)}
					onExtract={openImagePicker}
					onDelete={deletePalette}
					onSelect={handlePaletteSelect}
				/>
			</div>

			<!-- EDITOR VIEW -->
			<div class="{mobileView === 'editor' ? 'block' : 'hidden'} h-full p-4 relative">
				<PaletteEditor
					{activeColorIndex}
					onColorIndexSelect={(idx: number) => (activeColorIndex = idx)}
				/>
			</div>

			<!-- INSPECTOR VIEW -->
			<div class="{mobileView === 'inspector' ? 'block' : 'hidden'} h-full bg-void-deep p-4">
				<PaletteInspector
					{activeColorIndex}
					{colorHistory}
					onColorChange={handleColorChange}
					onExport={exportPalette}
					onColorHistorySelect={(color: string) => {
						if (activeColorIndex !== null) {
							handleColorChange(color);
						}
					}}
				/>
			</div>
		</div>
	</div>
</div>

<!-- Create Palette Dialog -->
{#if showCreateDialog}
	<div
		class="fixed inset-0 modal-backdrop-blur flex items-center justify-center z-50 p-4"
		onclick={(e) => e.target === e.currentTarget && (showCreateDialog = false)}
		onkeydown={(e) => e.key === "Escape" && (showCreateDialog = false)}
		role="dialog"
		tabindex="-1"
	>
		<div
			in:scale={{ duration: 300, start: 0.9, easing: elasticOut }}
			class="bg-base-100/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10 modal-enter"
		>
			<h3 class="text-lg font-semibold text-base-content mb-4">Create New Palette</h3>

			<div class="space-y-4">
				<div>
					<label for="palette-name-input" class="block text-sm font-medium text-base-content mb-2">
						Palette Name
					</label>
					<input
						id="palette-name-input"
						bind:value={newPaletteName}
						type="text"
						placeholder="Enter palette name..."
						class="input input-bordered w-full"
						maxlength="50"
						onkeydown={(e) => e.key === "Enter" && createPalette()}
					/>
				</div>

				<div>
					<label for="palette-slots-input" class="block text-sm font-medium text-base-content mb-2">
						Number of Slots ({newPaletteSlots})
					</label>
					<input
						id="palette-slots-input"
						type="range"
						min="3"
						max="20"
						bind:value={newPaletteSlots}
						class="range range-xs range-primary"
					/>
					<div class="flex justify-between text-xs text-base-content/60 mt-1">
						<span>3</span>
						<span>20</span>
					</div>
				</div>

				<div class="flex justify-end gap-3 mt-6">
					<button class="btn btn-ghost" onclick={() => (showCreateDialog = false)}> Cancel </button>
					<button class="btn btn-primary" onclick={createPalette} disabled={!newPaletteName.trim()}>
						Create
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Extract Dialog -->
{#if showExtractDialog}
	<div
		class="fixed inset-0 modal-backdrop-blur flex items-center justify-center z-50 p-4"
		onclick={(e) => e.target === e.currentTarget && (showExtractDialog = false)}
		onkeydown={(e) => e.key === "Escape" && (showExtractDialog = false)}
		role="dialog"
		tabindex="-1"
	>
		<div
			in:scale={{ duration: 300, start: 0.9, easing: elasticOut }}
			class="bg-base-100/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10 modal-enter"
		>
			<h3 class="text-lg font-semibold text-base-content mb-4">Extract Palette</h3>
			<p class="text-sm text-base-content/70 mb-4">
				Create a new palette from the selected reference image.
			</p>

			<div class="space-y-4">
				<div>
					<label for="extract-slots-input" class="block text-sm font-medium text-base-content mb-2">
						Colors to Extract ({extractSlots})
					</label>
					<input
						id="extract-slots-input"
						type="range"
						min="3"
						max="10"
						bind:value={extractSlots}
						class="range range-xs range-secondary"
					/>
					<div class="flex justify-between text-xs text-base-content/60 mt-1">
						<span>3</span>
						<span>10</span>
					</div>
				</div>

				<div class="flex justify-end gap-3 mt-6">
					<button class="btn btn-ghost" onclick={() => (showExtractDialog = false)}>
						Cancel
					</button>
					<button class="btn btn-secondary" onclick={createPaletteFromReference}>
						Extract & Create
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Image Picker Dialog -->
{#if showImagePicker}
	<div
		class="fixed inset-0 modal-backdrop-blur flex items-center justify-center z-50 p-4"
		onclick={(e) => e.target === e.currentTarget && (showImagePicker = false)}
		onkeydown={(e) => e.key === "Escape" && (showImagePicker = false)}
		role="dialog"
		tabindex="-1"
	>
		<div
			in:scale={{ duration: 300, start: 0.9, easing: elasticOut }}
			class="bg-base-100/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-white/10"
		>
			<h3 class="text-lg font-semibold text-base-content mb-4">Select Reference Image</h3>
			<p class="text-sm text-base-content/70 mb-4">Choose an image to extract colors from.</p>

			<div class="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto mb-4">
				{#if app.references?.references}
					{#each app.references.references as ref}
						<button
							class="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-phoenix-primary transition-colors relative group"
							onclick={() => selectImageForExtraction(ref.id)}
						>
							<img src={ref.src} alt={ref.name || "Reference"} class="w-full h-full object-cover" />
							<div
								class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
							>
								<Icon icon="material-symbols:colorize" class="w-8 h-8 text-white" />
							</div>
						</button>
					{/each}
				{/if}
			</div>

			<div class="flex justify-end">
				<button class="btn btn-ghost" onclick={() => (showImagePicker = false)}>Cancel</button>
			</div>
		</div>
	</div>
{/if}
