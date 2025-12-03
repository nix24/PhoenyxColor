<script lang="ts">
	import { scale } from "svelte/transition";
	import { elasticOut } from "svelte/easing";
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedColorPalette } from "$lib/schemas/validation";
	import pkg from "file-saver";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import AdvancedColorPicker from "$lib/components/common/AdvancedColorPicker.svelte";
	import EyedropperTool from "$lib/components/common/EyedropperTool.svelte";
	import { extractPalette } from "$lib/utils/color-engine";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";
	import { validatePalette } from "$lib/schemas/validation";

	// Sub-components
	import PaletteList from "./palettes/PaletteList.svelte";
	import PaletteEditor from "./palettes/PaletteEditor.svelte";
	import PaletteAnalysis from "./palettes/PaletteAnalysis.svelte";
	import PalettePreview from "./palettes/PalettePreview.svelte";
	import {
		isValidHexColor,
		normalizeHexColor,
		generateMoodPalette,
		generateSemanticTheme,
		type MoodType,
	} from "./palettes/palette-utils";

	const { saveAs } = pkg;

	// View mode
	type ViewMode = "editor" | "analysis" | "preview" | "gallery";
	let viewMode = $state<ViewMode>("editor");

	// State
	let newPaletteName = $state("");
	let showCreateDialog = $state(false);
	let newPaletteSlots = $state(5);
	let selectedColor = $state("#3b82f6");
	let showColorPicker = $state(false);
	let colorHistory: string[] = $state([]);
	let searchTerm = $state("");

	// Smart Generator State
	let showSmartGenerator = $state(false);
	let smartGeneratorSeed = $state("#3b82f6");
	let smartGeneratorCount = $state(5);

	// Color extraction state
	let showExtractDialog = $state(false);
	let extractSlots = $state(5);
	let extractingFrom: string | null = $state(null);

	// Editing context for color picker
	let editingColorContext: {
		paletteId: string;
		colorIndex: number;
		originalColor: string;
	} | null = $state(null);

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

	async function importPaletteFile() {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json,.txt,.css";

		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			try {
				const text = await file.text();
				let importedPalette: Partial<ValidatedColorPalette> | null = null;
				let paletteName = file.name.substring(0, file.name.lastIndexOf(".")) || "Imported Palette";

				if (file.name.endsWith(".json")) {
					const jsonData = JSON.parse(text);
					if (jsonData.colors && Array.isArray(jsonData.colors)) {
						importedPalette = {
							name: jsonData.name || paletteName,
							colors: jsonData.colors
								.map((c: string) => normalizeHexColor(c))
								.filter((c: string) => isValidHexColor(c)),
							maxSlots:
								jsonData.maxSlots ||
								Math.max(app.settings.state.defaultPaletteSlots, jsonData.colors.length),
							tags: jsonData.tags || [],
						};
					}
				} else if (file.name.endsWith(".txt")) {
					const colors = text
						.split(/\r?\n/)
						.map((c) => c.trim())
						.filter((c) => c && isValidHexColor(c))
						.map((c) => normalizeHexColor(c));
					if (colors.length > 0) {
						importedPalette = {
							name: paletteName,
							colors: colors,
							maxSlots: Math.max(app.settings.state.defaultPaletteSlots, colors.length),
							tags: ["imported"],
						};
					}
				} else if (file.name.endsWith(".css")) {
					const colors: string[] = [];
					const regex = /--(?:[\w-]+):\s*(#[A-Fa-f0-9]{3,6});/g;
					let match: RegExpExecArray | null;
					while ((match = regex.exec(text)) !== null) {
						if (match[1] && isValidHexColor(match[1])) {
							colors.push(normalizeHexColor(match[1]));
						}
					}
					if (colors.length > 0) {
						importedPalette = {
							name: paletteName,
							colors: colors,
							maxSlots: Math.max(app.settings.state.defaultPaletteSlots, colors.length),
							tags: ["imported"],
						};
					}
				}

				if (importedPalette?.colors && importedPalette.colors.length > 0) {
					let finalName = importedPalette.name || "Imported Palette";
					let counter = 1;
					while (app.palettes.palettes.some((p) => p.name === finalName)) {
						finalName = `${importedPalette.name || "Imported Palette"} (${counter++})`;
					}
					importedPalette.name = finalName;

					app.palettes.add(importedPalette as Omit<ValidatedColorPalette, "id" | "createdAt">);
					toast.success(`Imported palette "${finalName}"`);
				} else {
					toast.error("Failed to parse palette file or no valid colors found");
				}
			} catch (error) {
				console.error("Import failed:", error);
				toast.error("Failed to import palette");
			}
		};

		input.click();
	}

	// Smart Generator Functions
	function generateSmartPalette(mood: MoodType) {
		const colors = generateMoodPalette(smartGeneratorSeed, mood, smartGeneratorCount);

		let paletteName = `${mood.charAt(0).toUpperCase() + mood.slice(1)} Palette`;
		let counter = 1;
		while (app.palettes.palettes.some((p) => p.name === paletteName)) {
			paletteName = `${mood.charAt(0).toUpperCase() + mood.slice(1)} Palette ${counter++}`;
		}

		app.palettes.add({
			name: paletteName,
			colors,
			maxSlots: Math.max(smartGeneratorCount, 10),
			tags: [mood, "generated"],
		});

		showSmartGenerator = false;
		toast.success(`Created "${paletteName}" with ${colors.length} colors!`);
	}

	function generateThemePalette() {
		const theme = generateSemanticTheme(smartGeneratorSeed);
		const colors = Object.values(theme);

		let paletteName = "Semantic Theme";
		let counter = 1;
		while (app.palettes.palettes.some((p) => p.name === paletteName)) {
			paletteName = `Semantic Theme ${counter++}`;
		}

		app.palettes.add({
			name: paletteName,
			colors,
			maxSlots: 10,
			tags: ["theme", "semantic", "generated"],
		});

		showSmartGenerator = false;
		toast.success(`Created "${paletteName}" with semantic colors!`);
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
</script>

<div class="h-full flex flex-col gap-4">
	<!-- Module Header -->
	<GlassPanel
		class="flex flex-col md:flex-row md:items-center justify-between p-4 md:p-6 gap-4 shrink-0 overflow-visible z-20"
		intensity="low"
	>
		<div>
			<h2 class="text-xl md:text-2xl font-bold text-white tracking-wide">Palette Studio</h2>
			<p class="text-sm text-text-muted">Create, analyze, and preview color palettes</p>
		</div>

		<div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
			<!-- View Mode Toggle -->
			<div class="join">
				<button
					class={cn("join-item btn btn-sm", viewMode === "gallery" ? "btn-primary" : "btn-ghost")}
					onclick={() => (viewMode = "gallery")}
					title="Bento Gallery View"
				>
					<Icon icon="material-symbols:grid-view" class="w-4 h-4" />
					<span class="hidden sm:inline">Gallery</span>
				</button>
				<button
					class={cn("join-item btn btn-sm", viewMode === "editor" ? "btn-primary" : "btn-ghost")}
					onclick={() => (viewMode = "editor")}
				>
					<Icon icon="material-symbols:edit" class="w-4 h-4" />
					<span class="hidden sm:inline">Editor</span>
				</button>
				<button
					class={cn("join-item btn btn-sm", viewMode === "analysis" ? "btn-primary" : "btn-ghost")}
					onclick={() => (viewMode = "analysis")}
				>
					<Icon icon="material-symbols:analytics" class="w-4 h-4" />
					<span class="hidden sm:inline">Analysis</span>
				</button>
				<button
					class={cn("join-item btn btn-sm", viewMode === "preview" ? "btn-primary" : "btn-ghost")}
					onclick={() => (viewMode = "preview")}
				>
					<Icon icon="material-symbols:preview" class="w-4 h-4" />
					<span class="hidden sm:inline">Preview</span>
				</button>
			</div>

			<!-- Search -->
			<div class="relative w-full sm:w-48">
				<input
					bind:value={searchTerm}
					type="text"
					placeholder="Search palettes..."
					class="input input-sm bg-black/20 border-white/10 text-white placeholder:text-text-muted/50 w-full pl-8 focus:border-phoenix-primary focus:outline-none transition-colors"
				/>
				<Icon
					icon="material-symbols:search"
					class="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted"
				/>
			</div>

			<button
				class="btn btn-sm border-none bg-linear-to-r from-phoenix-primary to-phoenix-violet text-white shadow-lg hover:shadow-phoenix-primary/50 hover:scale-105 transition-all duration-300 w-full sm:w-auto"
				onclick={() => (showCreateDialog = true)}
				type="button"
			>
				<Icon icon="material-symbols:add" class="h-4 w-4" />
				New Palette
			</button>

			<!-- Smart Generator -->
			<button
				class="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 w-full sm:w-auto"
				onclick={() => (showSmartGenerator = true)}
				title="Smart Generate"
			>
				<Icon icon="material-symbols:auto-awesome" class="h-4 w-4" />
				Generate
			</button>

			<!-- Color Picker Toggle -->
			<button
				class="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 w-full sm:w-auto"
				onclick={() => {
					showColorPicker = !showColorPicker;
					if (!showColorPicker) editingColorContext = null;
				}}
				title="Color Picker"
			>
				<Icon icon="material-symbols:palette" class="h-4 w-4" />
				<div
					class="w-4 h-4 rounded border border-white/20 ml-2 shadow-sm"
					style:background-color={selectedColor}
				></div>
			</button>

			<!-- Eyedropper Tool -->
			<EyedropperTool
				buttonClass="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 w-full sm:w-auto"
				buttonLabel="Eyedropper"
				autoAddToPalette={true}
				onColorPicked={(color) => {
					selectedColor = color;
					addToColorHistory(color);
				}}
			/>

			<!-- Extract from References Button -->
			{#if app.references.references.length > 0}
				<div class="dropdown dropdown-end w-full sm:w-auto">
					<button
						class="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 w-full sm:w-auto"
						type="button"
						tabindex="0"
						title="Extract colors from reference images"
					>
						<Icon icon="material-symbols:colorize" class="h-4 w-4" />
						Extract
					</button>
					<ul
						class="dropdown-content menu bg-void-deep border border-white/10 rounded-xl z-100 w-64 p-2 shadow-xl max-h-64 overflow-y-auto backdrop-blur-xl"
					>
						{#each app.references.references as reference (reference.id)}
							<li>
								<button
									onclick={() => startColorExtraction(reference.id)}
									type="button"
									class="flex items-center justify-start p-2 text-left hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-colors"
								>
									<div
										class="w-8 h-8 rounded border border-white/10 bg-cover bg-center mr-3 shrink-0"
										style:background-image="url({reference.src})"
									></div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium truncate">{reference.name}</p>
										<p class="text-xs text-text-muted/60">Extract colors</p>
									</div>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</GlassPanel>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
		{#if viewMode === "gallery"}
			<!-- Bento Gallery View - Full Width -->
			<GlassPanel class="flex-1 overflow-hidden" intensity="low">
				<div class="flex flex-col h-full">
					<div class="p-4 border-b border-white/5 bg-black/20">
						<h3 class="font-semibold text-white flex items-center gap-2">
							<Icon icon="material-symbols:grid-view" class="w-5 h-5" />
							Palette Gallery
							<span class="text-text-muted/60 text-sm font-normal"
								>({app.palettes.palettes.length} palettes)</span
							>
						</h3>
					</div>

					<div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
						{#if app.palettes.palettes.length === 0}
							<div class="flex items-center justify-center h-full text-text-muted/50">
								<div class="text-center">
									<Icon
										icon="material-symbols:palette-outline"
										class="w-16 h-16 mx-auto mb-4 opacity-30"
									/>
									<p class="text-lg mb-2">No palettes yet</p>
									<p class="text-sm mb-4">Create your first palette to see it here</p>
									<button class="btn btn-primary btn-sm" onclick={() => (showCreateDialog = true)}>
										<Icon icon="material-symbols:add" class="w-4 h-4" />
										Create Palette
									</button>
								</div>
							</div>
						{:else}
							<!-- Bento Grid Layout -->
							<div
								class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-fr"
							>
								{#each app.palettes.palettes.filter((p) => p.name
											.toLowerCase()
											.includes(searchTerm.toLowerCase()) || p.colors.some((c) => c
												.toLowerCase()
												.includes(searchTerm.toLowerCase()))) as palette, idx (palette.id)}
									{@const isFeatured = idx === 0 && app.palettes.palettes.length > 4}
									{@const isLarge = palette.colors.length >= 8}
									<button
										class={cn(
											"group text-left rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer",
											isFeatured && "col-span-2 row-span-2",
											!isFeatured && isLarge && "col-span-2",
											app.palettes.activePaletteId === palette.id
												? "border-phoenix-primary/50 shadow-[0_0_20px_rgba(255,0,127,0.3)] scale-[1.02]"
												: "border-white/10 hover:border-white/20 hover:shadow-lg hover:scale-[1.01]"
										)}
										style:background="linear-gradient(135deg, rgba(30,30,45,0.6), rgba(20,20,30,0.8))"
										onclick={() => {
											app.palettes.setActive(palette.id);
											viewMode = "editor";
										}}
									>
										<!-- Color Grid Display -->
										<div
											class={cn(
												"grid gap-0.5 p-2",
												isFeatured
													? "grid-cols-5 h-40"
													: isLarge
														? "grid-cols-4 h-24"
														: "grid-cols-3 h-20"
											)}
										>
											{#each palette.colors.slice(0, isFeatured ? 15 : isLarge ? 12 : 9) as color}
												<div
													class="rounded-sm transition-transform group-hover:scale-105"
													style:background-color={color}
												></div>
											{/each}
											{#if palette.colors.length === 0}
												<div
													class="col-span-full flex items-center justify-center text-text-muted/30"
												>
													<Icon
														icon="material-symbols:palette-outline"
														class={isFeatured ? "w-12 h-12" : "w-8 h-8"}
													/>
												</div>
											{/if}
										</div>

										<!-- Palette Info -->
										<div class={cn("p-3 border-t border-white/5 bg-black/30", isFeatured && "p-4")}>
											<div class="flex items-center justify-between gap-2">
												<div class="min-w-0 flex-1">
													<h4
														class={cn(
															"font-medium truncate text-white group-hover:text-phoenix-primary transition-colors",
															isFeatured ? "text-lg" : "text-sm"
														)}
													>
														{palette.name}
													</h4>
													<p
														class={cn(
															"text-text-muted/60 uppercase tracking-wider",
															isFeatured ? "text-xs" : "text-[10px]"
														)}
													>
														{palette.colors.length}/{palette.maxSlots} colors
													</p>
												</div>
												{#if app.palettes.activePaletteId === palette.id}
													<div
														class="shrink-0 w-2 h-2 rounded-full bg-phoenix-primary animate-pulse"
													></div>
												{/if}
											</div>

											{#if isFeatured && palette.tags && palette.tags.length > 0}
												<div class="flex flex-wrap gap-1 mt-2">
													{#each palette.tags.slice(0, 3) as tag}
														<span
															class="px-2 py-0.5 bg-white/5 rounded-full text-[10px] text-text-muted"
														>
															{tag}
														</span>
													{/each}
												</div>
											{/if}
										</div>
									</button>
								{/each}

								<!-- Add New Palette Card -->
								<button
									class="rounded-xl border-2 border-dashed border-white/10 hover:border-phoenix-primary/50 hover:bg-white/5 transition-all duration-300 cursor-pointer flex items-center justify-center min-h-[120px] group"
									onclick={() => (showCreateDialog = true)}
								>
									<div class="text-center group-hover:scale-105 transition-transform">
										<div
											class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2 group-hover:bg-phoenix-primary/20 transition-colors"
										>
											<Icon
												icon="material-symbols:add"
												class="w-6 h-6 text-text-muted group-hover:text-phoenix-primary transition-colors"
											/>
										</div>
										<p class="text-xs text-text-muted group-hover:text-white transition-colors">
											New Palette
										</p>
									</div>
								</button>
							</div>
						{/if}
					</div>
				</div>
			</GlassPanel>
		{:else}
			<!-- Palettes List Sidebar -->
			<PaletteList {searchTerm} onCreateNew={() => (showCreateDialog = true)} />

			<!-- Main View Area -->
			{#if viewMode === "editor"}
				<PaletteEditor
					{selectedColor}
					{colorHistory}
					onColorHistoryAdd={addToColorHistory}
					onShowColorPicker={() => (showColorPicker = true)}
					onImport={importPaletteFile}
					onExport={exportPalette}
					onCreateNew={() => (showCreateDialog = true)}
				/>
			{:else if viewMode === "analysis"}
				<PaletteAnalysis />
			{:else if viewMode === "preview"}
				<PalettePreview />
			{/if}
		{/if}
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
					<div class="text-xs text-base-content/60 mt-1">Max 50 characters, must be unique</div>
				</div>

				<div>
					<label for="palette-slots-input" class="block text-sm font-medium text-base-content mb-2">
						Number of Color Slots
					</label>
					<input
						id="palette-slots-input"
						bind:value={newPaletteSlots}
						type="number"
						min="3"
						max="50"
						class="input input-bordered w-full"
					/>
					<div class="text-xs text-base-content/60 mt-1">Between 3 and 50 color slots</div>
				</div>
			</div>

			<div class="flex items-center justify-end space-x-3 mt-6">
				<button
					class="btn btn-ghost"
					onclick={() => {
						showCreateDialog = false;
						newPaletteName = "";
						newPaletteSlots = 5;
					}}
					type="button"
				>
					Cancel
				</button>
				<button
					class="btn btn-primary"
					onclick={createPalette}
					disabled={!newPaletteName.trim()}
					type="button"
				>
					Create Palette
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Smart Generator Dialog -->
{#if showSmartGenerator}
	<div
		class="fixed inset-0 modal-backdrop-blur flex items-center justify-center z-50 p-4"
		onclick={(e) => e.target === e.currentTarget && (showSmartGenerator = false)}
		onkeydown={(e) => e.key === "Escape" && (showSmartGenerator = false)}
		role="dialog"
		tabindex="-1"
	>
		<div
			in:scale={{ duration: 300, start: 0.9, easing: elasticOut }}
			class="bg-base-100/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10 modal-enter"
		>
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-semibold text-base-content flex items-center gap-2">
					<Icon icon="material-symbols:auto-awesome" class="w-5 h-5 text-phoenix-primary" />
					Smart Generator
				</h3>
				<button
					class="btn btn-sm btn-circle btn-ghost"
					onclick={() => (showSmartGenerator = false)}
				>
					<Icon icon="material-symbols:close" class="w-4 h-4" />
				</button>
			</div>

			<div class="space-y-4">
				<!-- Seed Color -->
				<div>
					<label
						for="smart-generator-seed"
						class="block text-sm font-medium text-base-content mb-2"
					>
						Seed Color
					</label>
					<div class="flex gap-2">
						<input
							type="color"
							bind:value={smartGeneratorSeed}
							class="w-12 h-10 rounded cursor-pointer"
						/>
						<input
							type="text"
							bind:value={smartGeneratorSeed}
							class="input input-bordered flex-1 font-mono"
						/>
					</div>
				</div>

				<!-- Color Count -->
				<div>
					<label
						for="smart-generator-count"
						class="block text-sm font-medium text-base-content mb-2"
					>
						Number of Colors: {smartGeneratorCount}
					</label>
					<input
						type="range"
						min="3"
						max="12"
						bind:value={smartGeneratorCount}
						class="range range-primary"
					/>
				</div>

				<!-- Mood Generators -->
				<div>
					<label
						for="smart-generator-mood"
						class="block text-sm font-medium text-base-content mb-2"
					>
						Generate by Mood
					</label>
					<div class="grid grid-cols-3 gap-2">
						{#each [{ mood: "pastel", label: "Pastel", icon: "material-symbols:cloud" }, { mood: "neon", label: "Neon", icon: "material-symbols:bolt" }, { mood: "earthy", label: "Earthy", icon: "material-symbols:forest" }, { mood: "muted", label: "Muted", icon: "material-symbols:water-drop" }, { mood: "jewel", label: "Jewel", icon: "material-symbols:diamond" }] as item}
							<button
								class="btn btn-sm btn-outline gap-1"
								onclick={() => generateSmartPalette(item.mood as MoodType)}
							>
								<Icon icon={item.icon} class="w-4 h-4" />
								{item.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Semantic Theme -->
				<div>
					<label
						for="smart-generator-theme"
						class="block text-sm font-medium text-base-content mb-2"
					>
						Generate Theme
					</label>
					<button class="btn btn-outline w-full gap-2" onclick={generateThemePalette}>
						<Icon icon="material-symbols:palette" class="w-4 h-4" />
						Generate Semantic Theme
						<span class="text-xs opacity-60">(Primary, Secondary, Accent, etc.)</span>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Color Picker Panel -->
{#if showColorPicker}
	<div class="fixed inset-x-0 bottom-0 md:right-0 md:top-16 md:w-80 md:inset-x-auto z-40">
		<div
			class="hidden md:block bg-base-100 border-l border-base-300 shadow-lg h-full overflow-y-auto"
		>
			<div class="p-4 border-b border-base-300">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-base-content">Color Picker</h3>
					<button
						class="btn btn-sm btn-circle btn-ghost"
						onclick={() => {
							showColorPicker = false;
							editingColorContext = null;
						}}
					>
						<Icon icon="material-symbols:close" class="w-4 h-4" />
					</button>
				</div>
			</div>

			<div class="p-4">
				<AdvancedColorPicker
					bind:hex={selectedColor}
					label="Select Color"
					alwaysOpen={true}
					onInput={(detail) => {
						if (detail.hex) selectedColor = detail.hex;
					}}
					onChange={(detail) => {
						if (detail.hex) {
							selectedColor = detail.hex;
							addToColorHistory(detail.hex);
						}
					}}
				/>

				{#if colorHistory.length > 0}
					<div class="mt-6">
						<h4 class="text-sm font-medium text-base-content mb-3">Recent Colors</h4>
						<div class="grid grid-cols-6 gap-2">
							{#each colorHistory.slice(0, 12) as historyColor}
								<button
									class="aspect-square rounded border border-base-300 hover:scale-110 transition-transform"
									style:background-color={historyColor}
									onclick={() => (selectedColor = historyColor)}
									title={historyColor}
								></button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Mobile Bottom Sheet -->
		<div
			class="md:hidden bg-base-100 border-t border-base-300 shadow-lg p-4 max-h-80 overflow-y-auto"
		>
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-semibold text-base-content">Color Picker</h3>
				<button
					class="btn btn-sm btn-circle btn-ghost"
					onclick={() => {
						showColorPicker = false;
						editingColorContext = null;
					}}
				>
					<Icon icon="material-symbols:close" class="w-4 h-4" />
				</button>
			</div>

			<AdvancedColorPicker
				bind:hex={selectedColor}
				label="Select Color"
				alwaysOpen={true}
				onInput={(detail) => {
					if (detail.hex) selectedColor = detail.hex;
				}}
				onChange={(detail) => {
					if (detail.hex) {
						selectedColor = detail.hex;
						addToColorHistory(detail.hex);
					}
				}}
			/>
		</div>
	</div>
{/if}

<!-- Color Extraction Dialog -->
{#if showExtractDialog}
	<div
		class="fixed inset-0 modal-backdrop-blur flex items-center justify-center z-50 p-4"
		role="dialog"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) {
				showExtractDialog = false;
				extractingFrom = null;
			}
		}}
		onkeydown={(e) => {
			if (e.key === "Escape") {
				showExtractDialog = false;
				extractingFrom = null;
			}
		}}
	>
		<div
			in:scale={{ duration: 400, start: 0.9, easing: elasticOut }}
			class="bg-base-100/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/10 modal-enter"
		>
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-bold text-lg">Extract Colors from Reference</h3>
				<button
					class="btn btn-xs btn-ghost"
					onclick={() => {
						showExtractDialog = false;
						extractingFrom = null;
					}}
					type="button"
				>
					<Icon icon="material-symbols:close" class="h-4 w-4" />
				</button>
			</div>

			{#if extractingFrom}
				{@const reference = app.references.references.find((r) => r.id === extractingFrom)}
				{#if reference}
					<div class="mb-4">
						<div class="flex items-center space-x-3 p-3 bg-base-200 rounded-lg">
							<div
								class="w-12 h-12 rounded border border-base-300 bg-cover bg-center shrink-0"
								style:background-image="url({reference.src})"
							></div>
							<div class="flex-1 min-w-0">
								<p class="font-medium truncate">{reference.name}</p>
								<p class="text-sm text-base-content/60">Reference image</p>
							</div>
						</div>
					</div>
				{/if}
			{/if}

			<div class="mb-4">
				<label for="extract-slots" class="label">
					<span class="label-text">Number of colors to extract</span>
				</label>
				<input
					id="extract-slots"
					bind:value={extractSlots}
					type="number"
					min="3"
					max="50"
					class="input input-bordered w-full"
					placeholder="5"
				/>
			</div>

			<div class="flex justify-end space-x-2">
				<button
					class="btn btn-ghost"
					onclick={() => {
						showExtractDialog = false;
						extractingFrom = null;
					}}
					type="button"
				>
					Cancel
				</button>
				<button
					class="btn btn-primary"
					onclick={createPaletteFromReference}
					disabled={extractSlots < 3 || extractSlots > 50}
					type="button"
				>
					<Icon icon="material-symbols:colorize" class="h-4 w-4" />
					Extract Colors
				</button>
			</div>
		</div>
	</div>
{/if}
