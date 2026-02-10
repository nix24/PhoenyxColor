<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { app } from "$lib/stores/root.svelte";
	import { extractPalette, sortPalette } from "$lib/utils/color-engine";
	import { toast } from "svelte-sonner";
	import type { ValidatedGradient, ValidatedColorPalette } from "$lib/schemas/validation";
	import tinycolor from "tinycolor2";
	import chroma from "chroma-js";

	let {
		imageSrc,
		getEditedImageData,
		onGradientMapChange,
		gradientMapOpacity,
		gradientMapBlendMode,
	} = $props<{
		imageSrc: string;
		getEditedImageData: () => Promise<string>;
		onGradientMapChange: (opacity: number, blendMode: string) => void;
		gradientMapOpacity: number;
		gradientMapBlendMode: string;
	}>();

	// Extraction state
	let isExtracting = $state(false);
	let extractedPalette = $state<string[] | null>(null);
	let extractColorCount = $state(8);
	let paletteNames = $state<string[]>([]);
	let paletteName = $state("Extracted Palette");
	let showSaveDialog = $state(false);

	// Export formats
	type ExportFormat = "css" | "tailwind" | "json" | "scss" | "less" | "ase" | "gpl";

	const exportFormats: Array<{ id: ExportFormat; label: string; icon: string }> = [
		{ id: "css", label: "CSS", icon: "material-symbols:css" },
		{ id: "tailwind", label: "Tailwind", icon: "simple-icons:tailwindcss" },
		{ id: "json", label: "JSON", icon: "material-symbols:data-object" },
		{ id: "scss", label: "SCSS", icon: "simple-icons:sass" },
		{ id: "less", label: "Less", icon: "simple-icons:less" },
		{ id: "ase", label: "ASE", icon: "material-symbols:palette" },
		{ id: "gpl", label: "GIMP", icon: "simple-icons:gimp" },
	];

	const blendModes = [
		"normal",
		"multiply",
		"screen",
		"overlay",
		"soft-light",
		"hard-light",
		"color-dodge",
		"color-burn",
		"darken",
		"lighten",
		"difference",
		"exclusion",
		"hue",
		"saturation",
		"color",
		"luminosity",
	];

	async function handleExtractPalette() {
		isExtracting = true;
		try {
			// Get the edited image data (with filters applied)
			const editedSrc = await getEditedImageData();
			const colors = await extractPalette(editedSrc, {
				colorCount: extractColorCount,
				quality: "balanced",
			});
			extractedPalette = colors;
			// Generate default color names
			paletteNames = colors.map((_, i) => `Color ${i + 1}`);
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

	function openSaveDialog() {
		showSaveDialog = true;
	}

	function handleSavePalette() {
		if (!extractedPalette) return;
		app.palettes.add({
			name: paletteName.trim() || "Extracted Palette",
			colors: extractedPalette,
			maxSlots: Math.max(extractColorCount, extractedPalette.length),
			tags: ["extracted", "image"],
		});
		toast.success("Palette saved to library!");
		showSaveDialog = false;
		paletteName = "Extracted Palette";
	}

	function generateColorName(hex: string): string {
		const color = tinycolor(hex);
		const hsl = color.toHsl();

		// Determine lightness descriptor
		let lightness = "";
		if (hsl.l < 0.2) lightness = "Dark ";
		else if (hsl.l > 0.8) lightness = "Light ";

		// Determine saturation descriptor
		let saturation = "";
		if (hsl.s < 0.1) return `${lightness}Gray`;
		if (hsl.s < 0.3) saturation = "Muted ";
		else if (hsl.s > 0.7) saturation = "Vivid ";

		// Determine hue name
		const hue = hsl.h;
		let hueName = "";
		if (hue < 15) hueName = "Red";
		else if (hue < 45) hueName = "Orange";
		else if (hue < 75) hueName = "Yellow";
		else if (hue < 150) hueName = "Green";
		else if (hue < 210) hueName = "Cyan";
		else if (hue < 270) hueName = "Blue";
		else if (hue < 330) hueName = "Purple";
		else hueName = "Red";

		return (lightness + saturation + hueName).trim();
	}

	function exportPalette(format: ExportFormat) {
		if (!extractedPalette) {
			toast.error("No palette to export");
			return;
		}

		let content = "";
		let filename = `palette.${format}`;
		let mimeType = "text/plain";

		const colorNames = extractedPalette.map((c, i) => {
			const name = paletteNames[i];
			return name?.trim() ? name : generateColorName(c);
		});
		const cssVarNames = colorNames.map((name) =>
			name
				.toLowerCase()
				.replace(/\s+/g, "-")
				.replace(/[^a-z0-9-]/g, "")
		);

		switch (format) {
			case "css":
				content = `:root {\n${extractedPalette
					.map((color, i) => `  --color-${cssVarNames[i]}: ${color};`)
					.join("\n")}\n}`;
				filename = "palette.css";
				mimeType = "text/css";
				break;

			case "tailwind": {
				const tailwindColors = extractedPalette.reduce(
					(acc, color, i) => {
						const varName = cssVarNames[i] ?? `color-${i}`;
						acc[varName] = color;
						return acc;
					},
					{} as Record<string, string>
				);
				content = `// tailwind.config.js colors\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify(tailwindColors, null, 8).replace(/"/g, "'")}\n    }\n  }\n}`;
				filename = "tailwind-colors.js";
				mimeType = "text/javascript";
				break;
			}

			case "json": {
				const jsonData = extractedPalette.map((color, i) => ({
					name: colorNames[i],
					hex: color,
					rgb: tinycolor(color).toRgbString(),
					hsl: tinycolor(color).toHslString(),
				}));
				content = JSON.stringify({ palette: jsonData }, null, 2);
				filename = "palette.json";
				mimeType = "application/json";
				break;
			}

			case "scss":
				content = extractedPalette
					.map((color, i) => `$color-${cssVarNames[i]}: ${color};`)
					.join("\n");
				filename = "palette.scss";
				mimeType = "text/x-scss";
				break;

			case "less":
				content = extractedPalette
					.map((color, i) => `@color-${cssVarNames[i]}: ${color};`)
					.join("\n");
				filename = "palette.less";
				mimeType = "text/x-less";
				break;

			case "ase":
				// Adobe Swatch Exchange format (simplified text representation)
				// For actual ASE binary, we'd need a more complex implementation
				content = `SWATCHEXCHANGE\nVersion: 1.0\n\n${extractedPalette
					.map((color, i) => {
						const rgb = tinycolor(color).toRgb();
						return `${colorNames[i]}\tRGB\t${rgb.r / 255}\t${rgb.g / 255}\t${rgb.b / 255}`;
					})
					.join("\n")}`;
				filename = "palette.ase.txt";
				break;

			case "gpl":
				// GIMP Palette format
				content = `GIMP Palette\nName: Extracted Palette\nColumns: ${extractedPalette.length}\n#\n${extractedPalette
					.map((color, i) => {
						const rgb = tinycolor(color).toRgb();
						return `${rgb.r}\t${rgb.g}\t${rgb.b}\t${colorNames[i]}`;
					})
					.join("\n")}`;
				filename = "palette.gpl";
				break;
		}

		downloadFile(content, filename, mimeType);
		toast.success(`Exported as ${format.toUpperCase()}`);
	}

	function copyToClipboard(format: ExportFormat) {
		if (!extractedPalette) return;

		let content = "";
		const cssVarNames = extractedPalette.map((c, i) => {
			const name = paletteNames[i];
			const finalName = name?.trim() ? name : generateColorName(c);
			return finalName
				.toLowerCase()
				.replace(/\s+/g, "-")
				.replace(/[^a-z0-9-]/g, "");
		});

		switch (format) {
			case "css":
				content = extractedPalette
					.map((color, i) => `--color-${cssVarNames[i]}: ${color};`)
					.join("\n");
				break;
			case "json":
				content = JSON.stringify(extractedPalette);
				break;
			default:
				content = extractedPalette.join(", ");
		}

		navigator.clipboard.writeText(content);
		toast.success("Copied to clipboard!");
	}

	function downloadFile(content: string, filename: string, mimeType: string) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	function getGradientBackground(gradient: ValidatedGradient) {
		const stops = gradient.stops.map((s) => `${s.color} ${s.position}%`).join(", ");
		// Only include angle for linear gradients; radial and conic don't support it
		if (gradient.type === "linear") {
			return `${gradient.type}-gradient(${gradient.angle || 90}deg, ${stops})`;
		}
		return `${gradient.type}-gradient(${stops})`;
	}
</script>

<div class="space-y-6">
	<!-- Palette Extraction -->
	<div class="space-y-4">
		<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
			<Icon icon="material-symbols:colorize" class="w-4 h-4" />
			Extract Colors
		</h4>

		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<span class="text-sm text-white">Color Count</span>
				<span class="text-xs font-mono text-white/60">{extractColorCount}</span>
			</div>
			<input
				type="range"
				min="2"
				max="16"
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
			<!-- Extracted Palette Display -->
			<div class="space-y-3">
				<div class="flex h-12 w-full rounded-lg overflow-hidden border border-white/10">
					{#each extractedPalette as color, i}
						<button
							class="flex-1 h-full relative group"
							style:background-color={color}
							title={color}
							onclick={() => {
								navigator.clipboard.writeText(color);
								toast.success(`Copied ${color}`);
							}}
						>
							<span
								class="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors"
							>
								<Icon
									icon="material-symbols:content-copy"
									class="w-4 h-4 text-white opacity-0 group-hover:opacity-100"
								/>
							</span>
						</button>
					{/each}
				</div>

				<!-- Color Names (editable) -->
				<div class="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
					{#each extractedPalette as color, i}
						<div class="flex items-center gap-2">
							<div class="w-4 h-4 rounded" style:background-color={color}></div>
							<input
								type="text"
								class="input input-xs flex-1 bg-white/5 border-white/10 text-white text-xs"
								bind:value={paletteNames[i]}
								placeholder={generateColorName(color)}
							/>
							<span class="text-[10px] font-mono text-white/40">{color}</span>
						</div>
					{/each}
				</div>

				<!-- Quick Actions -->
				<!-- Save Dialog -->
				{#if showSaveDialog}
					<div class="p-3 bg-white/5 rounded-lg border border-white/10 space-y-3">
						<div class="space-y-2">
							<span class="text-xs text-white/60">Palette Name</span>
							<input
								type="text"
								class="input input-sm w-full bg-white/5 border-white/10 text-white"
								bind:value={paletteName}
								placeholder="Enter palette name..."
								onkeydown={(e) => e.key === "Enter" && handleSavePalette()}
							/>
						</div>
						<div class="flex gap-2">
							<button
								class="btn btn-xs flex-1 btn-ghost text-white/60"
								onclick={() => (showSaveDialog = false)}
							>
								Cancel
							</button>
							<button class="btn btn-xs flex-1 btn-success" onclick={handleSavePalette}>
								Save Palette
							</button>
						</div>
					</div>
				{:else}
					<div class="flex gap-2">
						<button
							class="btn btn-xs flex-1 bg-white/5 border-white/10 text-white"
							onclick={handleSortPalette}
						>
							<Icon icon="material-symbols:sort" class="w-3 h-3" />
							Sort
						</button>
						<button
							class="btn btn-xs flex-1 bg-white/5 border-white/10 text-white"
							onclick={() => (extractedPalette = null)}
						>
							<Icon icon="material-symbols:refresh" class="w-3 h-3" />
							Clear
						</button>
						<button class="btn btn-xs flex-1 btn-success text-white" onclick={openSaveDialog}>
							<Icon icon="material-symbols:save" class="w-3 h-3" />
							Save
						</button>
					</div>
				{/if}

				<!-- Export Options -->
				<div class="pt-4 border-t border-white/10 space-y-3">
					<h5 class="text-xs font-bold text-white/50 uppercase tracking-wider">Export Palette</h5>

					<div class="grid grid-cols-4 gap-2">
						{#each exportFormats as format}
							<button
								class="btn btn-xs bg-white/5 border-white/10 text-white hover:bg-white/10 flex-col h-auto py-2"
								onclick={() => exportPalette(format.id)}
								title={`Export as ${format.label}`}
							>
								<Icon icon={format.icon} class="w-4 h-4" />
								<span class="text-[9px]">{format.label}</span>
							</button>
						{/each}
					</div>

					<div class="flex gap-2">
						<button
							class="btn btn-xs flex-1 bg-phoenix-primary/20 border-phoenix-primary/30 text-phoenix-primary"
							onclick={() => copyToClipboard("css")}
						>
							<Icon icon="material-symbols:content-copy" class="w-3 h-3" />
							Copy CSS
						</button>
						<button
							class="btn btn-xs flex-1 bg-phoenix-violet/20 border-phoenix-violet/30 text-phoenix-violet"
							onclick={() => copyToClipboard("json")}
						>
							<Icon icon="material-symbols:content-copy" class="w-3 h-3" />
							Copy JSON
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Divider -->
	<div class="divider before:bg-white/10 after:bg-white/10 text-white/30 text-xs">Gradient Map</div>

	<!-- Gradient Map Application -->
	<div class="space-y-4">
		<!-- Active Gradient/Palette Display -->
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
			<div class="p-4 bg-white/5 rounded-lg border border-dashed border-white/10 text-center">
				<p class="text-sm text-white/50">
					Select a gradient or palette from the main app to apply it here.
				</p>
			</div>
		{/if}

		<!-- Gradient Map Controls -->
		<div class="space-y-3">
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-sm text-white">Effect Opacity</span>
					<span class="text-xs font-mono text-white/60"
						>{Math.round(gradientMapOpacity * 100)}%</span
					>
				</div>
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={gradientMapOpacity}
					class="range range-xs range-primary"
					oninput={(e) =>
						onGradientMapChange(parseFloat(e.currentTarget.value), gradientMapBlendMode)}
				/>
			</div>

			<div class="space-y-2">
				<span class="text-sm text-white">Blend Mode</span>
				<select
					class="select select-sm w-full bg-white/5 border-white/10 text-white"
					value={gradientMapBlendMode}
					onchange={(e) => onGradientMapChange(gradientMapOpacity, e.currentTarget.value)}
				>
					{#each blendModes as mode}
						<option value={mode}
							>{mode
								.split("-")
								.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
								.join(" ")}</option
						>
					{/each}
				</select>
			</div>
		</div>
	</div>
</div>
