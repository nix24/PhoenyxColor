<script lang="ts">
	import { fly, scale } from "svelte/transition";
	import { elasticOut } from "svelte/easing";
	import { app } from "$lib/stores/root.svelte";
	import type { ColorPalette } from "$lib/stores/palettes.svelte";
	import pkg from "file-saver";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import AdvancedColorPicker from "$lib/components/common/AdvancedColorPicker.svelte";
	import EyedropperTool from "$lib/components/common/EyedropperTool.svelte";
	import { orderColorsByHueLightness, getColorLightness, rgbToHex } from "$lib/utils/colorUtils";
	import { extractPalette } from "$lib/utils/color-engine";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";
	import { validatePalette } from "$lib/schemas/validation";

	const { saveAs } = pkg;

	let newPaletteName = $state("");
	let showCreateDialog = $state(false);
	let newPaletteSlots = $state(5);
	let selectedColor = $state("#3b82f6");
	let showColorPicker = $state(false);
	let colorHistory: string[] = $state([]);
	let searchTerm = $state("");

	let editingColorContext: {
		paletteId: string;
		colorIndex: number;
		originalColor: string;
	} | null = $state(null);

	// Context menu state
	let contextMenu = $state<{
		show: boolean;
		x: number;
		y: number;
		colorIndex: number;
		paletteId: string;
		color: string;
	} | null>(null);

	// Color extraction state
	let showExtractDialog = $state(false);
	let extractSlots = $state(5);
	let extractingFrom: string | null = $state(null);

	// Color validation and utility functions
	function isValidHexColor(color: string): boolean {
		return /^#?([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
	}

	function isValidRgbColor(color: string): boolean {
		return /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0?\.\d+|1|0))?\s*\)$/.test(
			color
		);
	}

	function isValidHslColor(color: string): boolean {
		return /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*(0?\.\d+|1|0))?\s*\)$/.test(
			color
		);
	}

	function normalizeHexColor(color: string): string {
		color = color.replace("#", "");
		if (color.length === 3) {
			color = color
				.split("")
				.map((c) => c + c)
				.join("");
		} else if (color.length === 8) {
			// Remove alpha channel (last 2 characters) for 8-character hex
			color = color.substring(0, 6);
		}
		return `#${color.toUpperCase()}`;
	}

	function validateAndNormalizeColor(color: string): {
		valid: boolean;
		color?: string;
		error?: string;
	} {
		color = color.trim();

		if (isValidHexColor(color)) {
			return { valid: true, color: normalizeHexColor(color) };
		}

		if (isValidRgbColor(color)) {
			const match = color.match(
				/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0?\.\d+|1|0))?\s*\)/
			);
			if (match) {
				const [, r, g, b] = match.map(Number);
				if (r <= 255 && g <= 255 && b <= 255) {
					return { valid: true, color: rgbToHex(r, g, b) };
				}
			}
		}

		if (isValidHslColor(color)) {
			const match = color.match(
				/hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*(0?\.\d+|1|0))?\s*\)/
			);
			if (match) {
				const [, h, s, l] = match.map(Number);
				if (h <= 360 && s <= 100 && l <= 100) {
					return { valid: true, color: hslToHex(h, s, l) };
				}
			}
		}

		return {
			valid: false,
			error:
				"Invalid color format. Use HEX (#FF0000 or #FF0000FF), RGB (rgb(255,0,0) or rgba(255,0,0,0.5)), or HSL (hsl(0,100%,50%) or hsla(0,100%,50%,0.5))",
		};
	}

	function hslToHex(h: number, s: number, l: number): string {
		const rgb = hslToRgb(h, s / 100, l / 100);
		return rgbToHex(rgb.r, rgb.g, rgb.b);
	}

	function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
		h /= 360;
		const a = s * Math.min(l, 1 - l);
		const f = (n: number) => {
			const k = (n + h / (1 / 12)) % 12;
			const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
			return Math.round(255 * color);
		};
		return { r: f(0), g: f(8), b: f(4) };
	}

	function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16),
				}
			: null;
	}

	function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
		const rgb = hexToRgb(hex);
		if (!rgb) return null;

		const r = rgb.r / 255;
		const g = rgb.g / 255;
		const b = rgb.b / 255;

		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		let h = 0,
			s = 0,
			l = (max + min) / 2;

		if (max !== min) {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
					break;
			}
			h /= 6;
		}

		return {
			h: Math.round(h * 360),
			s: Math.round(s * 100),
			l: Math.round(l * 100),
		};
	}

	function formatColor(hex: string, format: "hex" | "rgb" | "hsl" = "hex"): string {
		switch (format) {
			case "rgb": {
				const rgb = hexToRgb(hex);
				return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : hex;
			}
			case "hsl": {
				const hsl = hexToHsl(hex);
				return hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : hex;
			}
			default:
				return hex;
		}
	}

	function getColorName(hex: string): string {
		// Basic color name mapping
		const colorNames: { [key: string]: string } = {
			"#FF0000": "Red",
			"#00FF00": "Lime",
			"#0000FF": "Blue",
			"#FFFF00": "Yellow",
			"#FF00FF": "Magenta",
			"#00FFFF": "Cyan",
			"#000000": "Black",
			"#FFFFFF": "White",
			"#808080": "Gray",
			"#800000": "Maroon",
			"#008000": "Green",
			"#000080": "Navy",
			"#808000": "Olive",
			"#800080": "Purple",
			"#008080": "Teal",
			"#C0C0C0": "Silver",
		};

		return colorNames[hex.toUpperCase()] || "";
	}

	function isDuplicateColor(paletteId: string, color: string): boolean {
		const palette = app.palettes.palettes.find((p) => p.id === paletteId);
		return palette ? palette.colors.includes(color) : false;
	}

	function updateSelectedColorFromPicker() {
		// No-op: Reactivity is handled by runes
	}

	function addToColorHistory(color: string) {
		if (!colorHistory.includes(color)) {
			colorHistory = [color, ...colorHistory.slice(0, 19)]; // Keep last 20 colors
		}
	}

	function validatePaletteName(name: string): {
		valid: boolean;
		error?: string;
	} {
		const trimmed = name.trim();

		if (!trimmed) {
			return { valid: false, error: "Palette name cannot be empty" };
		}

		if (trimmed.length > 50) {
			return {
				valid: false,
				error: "Palette name too long (max 50 characters)",
			};
		}

		if (app.palettes.palettes.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
			return {
				valid: false,
				error: "A palette with this name already exists",
			};
		}

		return { valid: true };
	}

	function createPalette() {
		const validation = validatePaletteName(newPaletteName);
		if (!validation.valid) {
			toast.error(validation.error || "Invalid palette name"); // Add fallback error message
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

	function addColorToPalette(paletteId: string, color: string) {
		const validation = validateAndNormalizeColor(color);
		if (!validation.valid) {
			toast.error(validation.error || "Invalid color");
			return;
		}

		const normalizedColor = validation.color;
		if (!normalizedColor) {
			toast.error("Invalid color");
			return;
		}

		if (isDuplicateColor(paletteId, normalizedColor)) {
			toast.warning("This color is already in the palette");
			return;
		}

		const palette = app.palettes.palettes.find((p) => p.id === paletteId);
		if (!palette) {
			toast.error("Palette not found");
			return;
		}

		if (palette.colors.length >= palette.maxSlots) {
			toast.error("Palette is full");
			return;
		}

		app.palettes.addColor(paletteId, normalizedColor);
		addToColorHistory(normalizedColor);
		toast.success(`Color ${normalizedColor} added to palette`);
	}

	function removeColorFromPalette(paletteId: string, colorIndex: number) {
		const palette = app.palettes.palettes.find((p) => p.id === paletteId);
		if (palette && colorIndex >= 0 && colorIndex < palette.colors.length) {
			const removedColor = palette.colors[colorIndex];
			app.palettes.removeColor(paletteId, colorIndex);
			toast.info(`Color ${removedColor} removed from palette`);
		}
	}

	async function copyColor(color: string) {
		try {
			await navigator.clipboard.writeText(color);
			addToColorHistory(color);
			toast.success(`Color ${color} copied to clipboard!`);
		} catch (error) {
			// Fallback for older browsers
			const textArea = document.createElement("textarea");
			textArea.value = color;
			document.body.appendChild(textArea);
			textArea.select();
			try {
				document.execCommand("copy");
				toast.success(`Color ${color} copied to clipboard!`);
			} catch (fallbackError) {
				toast.error("Failed to copy color to clipboard");
			}
			document.body.removeChild(textArea);
		}
	}

	function duplicatePalette(palette: ColorPalette) {
		let copyName = `${palette.name} Copy`;
		let counter = 1;

		// Ensure unique name
		while (app.palettes.palettes.some((p) => p.name === copyName)) {
			copyName = `${palette.name} Copy ${counter}`;
			counter++;
		}

		app.palettes.add({
			name: copyName,
			colors: [...palette.colors],
			maxSlots: palette.maxSlots,
			tags: [...palette.tags],
		});
		toast.success(`Palette "${palette.name}" duplicated!`);
	}

	function clearPalette(paletteId: string) {
		const palette = app.palettes.palettes.find((p) => p.id === paletteId);
		if (palette) {
			// We need to implement clearPalette in the store, or just update the palette
			// For now, let's update the palette with empty colors
			app.palettes.update(paletteId, { colors: [] });
			toast.info(`Cleared all colors from "${palette.name}"`);
		}
	}

	function generateComplementaryColor(baseColor: string): string {
		const hsl = hexToHsl(baseColor);
		if (!hsl) return baseColor;

		const complementaryH = (hsl.h + 180) % 360;
		return hslToHex(complementaryH, hsl.s, hsl.l);
	}

	function generateAnalogousColors(baseColor: string): string[] {
		const hsl = hexToHsl(baseColor);
		if (!hsl) return [baseColor];

		return [
			hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l),
			hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),
		];
	}

	function generateTriadicColors(baseColor: string): string[] {
		const hsl = hexToHsl(baseColor);
		if (!hsl) return [baseColor];

		return [
			hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
			hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
		];
	}

	function generateMonochromaticColors(baseColor: string, count: number = 4): string[] {
		const hsl = hexToHsl(baseColor);
		if (!hsl) return [baseColor];

		const colors: string[] = [];
		const lightStep = 20;
		const satStep = 15;

		for (let i = 0; i < count; i++) {
			// Vary lightness and slightly adjust saturation
			const newL = Math.max(10, Math.min(90, hsl.l + (i - 1) * lightStep));
			const newS = Math.max(10, Math.min(100, hsl.s + (i % 2 === 0 ? satStep : -satStep)));
			colors.push(hslToHex(hsl.h, newS, newL));
		}

		return colors;
	}

	function generateSplitComplementaryColors(baseColor: string): string[] {
		const hsl = hexToHsl(baseColor);
		if (!hsl) return [baseColor];

		return [
			hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l), // +150 degrees
			hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l), // +210 degrees
		];
	}

	function addColorHarmony(
		paletteId: string,
		type: "complementary" | "analogous" | "triadic" | "monochromatic" | "split-complementary"
	) {
		const baseColor = selectedColor;
		let colors: string[] = [];

		switch (type) {
			case "complementary":
				colors = [generateComplementaryColor(baseColor)];
				break;
			case "analogous":
				colors = generateAnalogousColors(baseColor);
				break;
			case "triadic":
				colors = generateTriadicColors(baseColor);
				break;
			case "monochromatic":
				colors = generateMonochromaticColors(baseColor, 4);
				break;
			case "split-complementary":
				colors = generateSplitComplementaryColors(baseColor);
				break;
		}

		colors.forEach((color) => {
			if (!isDuplicateColor(paletteId, color)) {
				addColorToPalette(paletteId, color);
			}
		});

		toast.success(`Added ${type} harmony colors!`);
	}

	// Smart harmony function that fills remaining slots with the selected harmony type
	function fillPaletteWithHarmony(
		paletteId: string,
		harmonyType: "complementary" | "analogous" | "triadic" | "monochromatic" | "split-complementary"
	) {
		const palette = app.palettes.palettes.find((p) => p.id === paletteId);
		if (!palette) return;

		const baseColor = selectedColor;
		const remainingSlots = palette.maxSlots - palette.colors.length;

		if (remainingSlots <= 0) {
			toast.warning("Palette is already full");
			return;
		}

		const hsl = hexToHsl(baseColor);
		if (!hsl) return;

		let harmoniousColors: string[] = [];

		switch (harmonyType) {
			case "complementary":
				// Generate complementary and variations
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
				// Generate analogous colors with variations
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
				// Generate triadic colors and variations
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
				// Generate monochromatic variations
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
				// Generate split complementary and variations
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

		// Remove duplicates and add colors
		const uniqueColors = harmoniousColors.filter(
			(color) =>
				!isDuplicateColor(paletteId, color) &&
				!harmoniousColors.slice(0, harmoniousColors.indexOf(color)).includes(color)
		);

		uniqueColors.slice(0, remainingSlots).forEach((color) => {
			addColorToPalette(paletteId, color);
		});

		toast.success(`Filled ${uniqueColors.length} slots with ${harmonyType} harmony!`);
	}

	function exportPalette(
		palette: ColorPalette,
		format: "json" | "css" | "ase" | "txt" | "png" | "svg"
	) {
		// Validate palette before export
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
			case "txt":
				content = palette.colors.join("\n");
				filename = `${palette.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "palette"}.txt`;
				break;
			case "png":
				exportPaletteAsImage(palette, "png");
				return;
			case "svg":
				exportPaletteAsImage(palette, "svg");
				return;
			case "ase":
				toast.info("Adobe Swatch Exchange (.ase) export is planned for a future version.");
				return;
			default:
				toast.error("Unsupported export format");
				return;
		}

		// Use file-saver for reliable downloads
		const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
		saveAs(blob, filename);
		toast.success(`Palette exported as ${filename}`);
	}

	function exportPaletteAsImage(palette: ColorPalette, format: "png" | "svg") {
		// Validate palette before export
		const validation = validatePalette(palette);
		if (!validation.valid) {
			toast.error(`Cannot export invalid palette: ${validation.error}`);
			return;
		}

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

		if (format === "svg") {
			let svgString = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">`;
			svgString += `<rect width="100%" height="100%" fill="hsl(var(--b1))"/>`; // Background
			palette.colors.forEach((color, index) => {
				const x = padding + index * (swatchSize + padding);
				svgString += `<rect x="${x}" y="${padding}" width="${swatchSize}" height="${swatchSize}" fill="${color}"/>`;
				svgString += `<text x="${x + swatchSize / 2}" y="${padding + swatchSize + textHeight / 1.5}" font-family="monospace" font-size="12" fill="hsl(var(--bc))" text-anchor="middle">${color}</text>`;
			});
			svgString += `</svg>`;

			// Use file-saver for reliable downloads
			const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
			saveAs(blob, `${palette.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "palette"}.svg`);
			toast.success(`Palette exported as SVG.`);
			return;
		}

		// PNG export
		const canvas = document.createElement("canvas");
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			toast.error("Failed to create canvas for PNG export");
			return;
		}

		ctx.fillStyle =
			getComputedStyle(document.documentElement).getPropertyValue("--b1").trim() || "#ffffff"; // DaisyUI base-100
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		palette.colors.forEach((color, index) => {
			const x = padding + index * (swatchSize + padding);
			ctx.fillStyle = color;
			ctx.fillRect(x, padding, swatchSize, swatchSize);

			ctx.fillStyle =
				getComputedStyle(document.documentElement).getPropertyValue("--bc").trim() || "#000000"; // DaisyUI base-content
			ctx.font = "12px monospace";
			ctx.textAlign = "center";
			ctx.fillText(color, x + swatchSize / 2, padding + swatchSize + textHeight / 1.5);
		});

		canvas.toBlob((blob) => {
			if (blob) {
				// Use file-saver for reliable downloads
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
		input.accept = ".json,.txt,.css"; // Add other supported types if implemented

		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			try {
				const text = await file.text();
				let importedPalette: Partial<ColorPalette> | null = null;
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
					// Basic CSS variable parsing (example: --color-var: #RRGGBB;)
					const colors: string[] = [];
					const regex = /--(?:[\w-]+):\s*(#[A-Fa-f0-9]{3,6});/g;

					let match: RegExpExecArray | null;
					while ((match = regex.exec(text)) !== null) {
						if (isValidHexColor(match[1])) {
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
				// Add other format parsers here (ASE, etc.) if implemented

				if (importedPalette?.colors && importedPalette.colors.length > 0) {
					// Ensure unique name
					let finalName = importedPalette.name || "Imported Palette";
					let counter = 1;
					while (app.palettes.palettes.some((p) => p.name === finalName)) {
						finalName = `${importedPalette.name || "Imported Palette"} (${counter++})`;
					}
					importedPalette.name = finalName;

					app.palettes.add(importedPalette as Omit<ColorPalette, "id" | "createdAt">);
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

	function handleColorInputKeydown(event: KeyboardEvent) {
		if (event.key === "Enter") {
			const input = event.target as HTMLInputElement;
			const validation = validateAndNormalizeColor(input.value);
			if (validation.valid && validation.color) {
				selectedColor = validation.color;
				updateSelectedColorFromPicker();
			} else {
				toast.error(validation.error || "Invalid color");
				input.value = selectedColor; // Reset to last valid value
			}
		}
	}

	// Filter palettes based on search
	let filteredPalettes = $derived(
		app.palettes.palettes.filter(
			(palette) =>
				palette.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				palette.colors.some((color) => color.toLowerCase().includes(searchTerm.toLowerCase()))
		)
	);

	// Color extraction from images
	function buildFilterString(reference: any): string {
		const filters: string[] = [];

		if (reference.isGrayscale) {
			filters.push("grayscale(100%)");
		}

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

	async function extractColorsFromImage(
		imageUrl: string,
		numColors: number = 5
	): Promise<string[]> {
		try {
			return await extractPalette(imageUrl, {
				colorCount: numColors,
				quality: "balanced",
			});
		} catch (error) {
			console.error("Failed to extract colors:", error);
			return [];
		}
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
				// Scale down image for performance while maintaining aspect ratio
				const maxSize = 200;
				const scale = Math.min(maxSize / img.width, maxSize / img.height);
				canvas.width = img.width * scale;
				canvas.height = img.height * scale;

				if (!ctx) {
					reject(new Error("Failed to create canvas context"));
					return;
				}

				// Apply CSS filters to canvas context
				const filterString = buildFilterString(reference);
				if (filterString !== "none") {
					ctx.filter = filterString;
				}

				// Apply opacity through globalAlpha
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

			// Create new palette with extracted colors - truncate name to avoid validation errors
			const baseName = reference.name.split(".")[0]; // Remove file extension
			const suffix = " Colors";
			const maxBaseLength = 50 - suffix.length; // Reserve space for " Colors"

			// Truncate base name if needed
			const truncatedBaseName =
				baseName.length > maxBaseLength ? baseName.substring(0, maxBaseLength).trim() : baseName;

			const paletteName = `${truncatedBaseName}${suffix}`;
			let uniqueName = paletteName;
			let counter = 1;

			// Ensure unique name while keeping within character limit
			while (app.palettes.palettes.some((p) => p.name === uniqueName)) {
				const counterSuffix = ` ${counter}`;
				const maxNameLength = 50 - counterSuffix.length;
				const basePaletteName =
					paletteName.length > maxNameLength
						? paletteName.substring(0, maxNameLength).trim()
						: paletteName;
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

	// Context menu functions
	function showContextMenu(
		event: MouseEvent,
		paletteId: string,
		colorIndex: number,
		color: string
	) {
		event.preventDefault();
		event.stopPropagation();

		contextMenu = {
			show: true,
			x: event.clientX,
			y: event.clientY,
			colorIndex,
			paletteId,
			color,
		};
	}

	function hideContextMenu() {
		contextMenu = null;
	}

	function changeColor() {
		if (!contextMenu) return;

		const originalColor = contextMenu.color;
		editingColorContext = {
			paletteId: contextMenu.paletteId,
			colorIndex: contextMenu.colorIndex,
			originalColor: originalColor,
		};
		selectedColor = originalColor; // Pre-fill picker with the color to be edited
		showColorPicker = true;
		hideContextMenu(); // Hide context menu once picker is shown for editing
	}

	function deleteColor() {
		if (!contextMenu) return;

		removeColorFromPalette(contextMenu.paletteId, contextMenu.colorIndex);
		hideContextMenu();
	}

	// Click outside to close context menu
	function handleDocumentClick(event: MouseEvent) {
		if (contextMenu && !(event.target as Element).closest(".context-menu")) {
			hideContextMenu();
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
			<h2 class="text-xl md:text-2xl font-bold text-white tracking-wide">Color Palettes</h2>
			<p class="text-sm text-text-muted">Create and manage your color palettes</p>
		</div>

		<div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
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
				aria-label="Create new palette"
			>
				<Icon icon="material-symbols:add" class="h-4 w-4" />
				New Palette
			</button>

			<!-- Color Picker Toggle -->
			<button
				class="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 w-full sm:w-auto"
				onclick={() => {
					showColorPicker = !showColorPicker;
					if (!showColorPicker) {
						editingColorContext = null;
					}
				}}
				title="Color Picker"
				type="button"
				aria-label="Open color picker"
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
						aria-label="Extract colors from references"
						title="Extract colors from reference images"
					>
						<Icon icon="material-symbols:colorize" class="h-4 w-4" />
						Extract Colors
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
										<p class="text-sm font-medium truncate">
											{reference.name}
										</p>
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
		<!-- Palettes List -->
		<GlassPanel class="w-full lg:w-80 overflow-hidden" intensity="low">
			<div class="flex flex-col h-full">
				<div class="p-4 border-b border-white/5 bg-black/20">
					<h3 class="font-semibold text-white">
						Palettes ({filteredPalettes.length})
					</h3>
				</div>

				<div class="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
					{#each filteredPalettes as palette, i (palette.id)}
						<button
							in:fly={{ y: 20, duration: 400, delay: i * 50, easing: elasticOut }}
							class={cn(
								"w-full text-left p-3 rounded-xl cursor-pointer transition-all duration-300 border group relative overflow-hidden",
								app.palettes.activePaletteId === palette.id
									? "bg-phoenix-primary/20 border-phoenix-primary/50 shadow-[0_0_20px_rgba(255,0,127,0.3)] scale-[1.02]"
									: "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-lg"
							)}
							onclick={() => app.palettes.setActive(palette.id)}
							tabindex="0"
							onkeydown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									app.palettes.setActive(palette.id);
								}
							}}
						>
							<!-- Shine Effect -->
							<div
								class="absolute inset-0 bg-linear-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
							></div>
							<!-- Palette Header -->
							<div class="flex items-center justify-between mb-2">
								<div class="flex-1 min-w-0">
									<h4
										class={cn(
											"font-medium truncate text-sm",
											app.palettes.activePaletteId === palette.id ? "text-white" : "text-text-muted"
										)}
										title={palette.name}
									>
										{palette.name}
									</h4>
									<p class="text-[10px] text-text-muted/60 uppercase tracking-wider">
										{palette.colors.length}/{palette.maxSlots} colors
									</p>
								</div>

								<div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
									<!-- Actions (only visible on hover/active could be better, but keeping simple for now) -->
								</div>
							</div>

							<!-- Mini Color Swatches -->
							<div class="flex gap-1 h-3 mt-2">
								{#each palette.colors.slice(0, 10) as color}
									<div
										class="flex-1 h-full rounded-full shadow-sm border border-black/10"
										style:background-color={color}
									></div>
								{/each}
								{#if palette.colors.length === 0}
									<div class="w-full h-full bg-white/5 rounded-full"></div>
								{/if}
							</div>
						</button>
					{/each}

					{#if app.palettes.palettes.length === 0}
						<div class="text-center py-8 text-text-muted/50">
							<Icon
								icon="material-symbols:palette-outline"
								class="h-12 w-12 mx-auto mb-2 opacity-30"
							/>
							<p>No palettes yet</p>
						</div>
					{:else if filteredPalettes.length === 0}
						<div class="text-center py-8 text-text-muted/50">
							<Icon icon="material-symbols:search-off" class="h-12 w-12 mx-auto mb-2 opacity-30" />
							<p>No matches found</p>
						</div>
					{/if}
				</div>
			</div>
		</GlassPanel>

		<!-- Palette Editor -->
		<GlassPanel class="flex-1 overflow-hidden relative" intensity="medium">
			<div class="flex flex-col h-full">
				{#if app.palettes.activePaletteId}
					<div class="p-4 md:p-6 flex-1 overflow-y-auto custom-scrollbar">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
							<div>
								<h3 class="text-2xl font-bold text-white tracking-wide">
									{app.palettes.activePalette?.name}
								</h3>
								<div class="flex items-center gap-2 mt-1">
									<span
										class="badge badge-sm bg-phoenix-primary/20 text-phoenix-primary border-none"
									>
										{app.palettes.activePalette?.colors.length} Colors
									</span>
									{#each app.palettes.activePalette?.tags || [] as tag}
										<span class="badge badge-sm badge-ghost text-text-muted">{tag}</span>
									{/each}
								</div>
							</div>

							<!-- Actions Toolbar -->
							<div class="flex flex-wrap items-center gap-2">
								<button
									class="btn btn-sm btn-ghost text-text-muted hover:text-white hover:scale-110 transition-transform duration-300"
									onclick={importPaletteFile}
									title="Import"
								>
									<Icon icon="material-symbols:file-upload" class="h-4 w-4" />
								</button>

								<div class="dropdown dropdown-end">
									<button
										class="btn btn-sm btn-ghost text-text-muted hover:text-white hover:scale-110 transition-transform duration-300"
										tabindex="0"
									>
										<Icon icon="material-symbols:download" class="h-4 w-4" />
									</button>
									<ul
										class="dropdown-content menu bg-void-deep border border-white/10 rounded-xl z-1 w-52 p-2 shadow-xl backdrop-blur-xl"
									>
										<li>
											<button
												onclick={() => exportPalette(app.palettes.activePalette!, "json")}
												class="text-text-muted hover:text-white hover:bg-white/5">JSON</button
											>
										</li>
										<li>
											<button
												onclick={() => exportPalette(app.palettes.activePalette!, "css")}
												class="text-text-muted hover:text-white hover:bg-white/5">CSS</button
											>
										</li>
										<li>
											<button
												onclick={() => exportPalette(app.palettes.activePalette!, "png")}
												class="text-text-muted hover:text-white hover:bg-white/5">PNG Image</button
											>
										</li>
									</ul>
								</div>

								<div class="h-4 w-px bg-white/10 mx-1"></div>

								<button
									class="btn btn-sm btn-ghost text-error hover:bg-error/10 hover:scale-110 transition-transform duration-300 group"
									onclick={() => {
										if (confirm("Are you sure you want to delete this palette?")) {
											app.palettes.remove(app.palettes.activePalette!.id);
										}
									}}
									title="Delete Palette"
								>
									<Icon icon="material-symbols:delete-outline" class="h-4 w-4" />
								</button>
							</div>
						</div>

						<!-- Harmony Generator -->
						<div class="mb-8 p-4 rounded-xl bg-black/20 border border-white/5">
							<h4 class="text-sm font-medium text-text-muted mb-3 uppercase tracking-wider">
								Generate Harmony
							</h4>
							<div class="flex flex-wrap gap-2">
								{#each ["complementary", "analogous", "triadic", "monochromatic", "split-complementary"] as harmony}
									<button
										class="btn btn-xs btn-outline border-white/10 text-text-muted hover:text-white hover:border-phoenix-primary hover:bg-phoenix-primary/10 capitalize"
										onclick={() =>
											fillPaletteWithHarmony(app.palettes.activePalette!.id, harmony as any)}
									>
										{harmony.replace("-", " ")}
									</button>
								{/each}
							</div>
						</div>

						<!-- Sorting & Grid -->
						<div class="flex justify-end gap-2 mb-2">
							<button
								class="btn btn-xs btn-ghost text-text-muted hover:text-white"
								onclick={() => {
									if (app.palettes.activePalette) {
										const sorted = orderColorsByHueLightness(app.palettes.activePalette.colors);
										app.palettes.update(app.palettes.activePalette.id, { colors: sorted });
										toast.success("Sorted by Hue & Lightness");
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
										toast.success("Sorted by Lightness");
									}
								}}
								title="Sort by Lightness"
							>
								<Icon icon="material-symbols:format-list-bulleted" class="w-4 h-4" />
								Sort Lightness
							</button>
						</div>

						<div
							class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8 p-1"
						>
							{#each app.palettes.activePalette!.colors as color, index}
								<div class="group relative">
									<button
										class="aspect-square rounded-2xl shadow-lg cursor-pointer w-full transition-all duration-300 hover:scale-110 hover:rotate-2 hover:shadow-xl hover:shadow-phoenix-primary/30 hover:z-10 relative overflow-hidden border-2 border-white/10 group-active:scale-95"
										style:background-color={color}
										onclick={() => copyColor(color)}
										oncontextmenu={(e) =>
											showContextMenu(e, app.palettes.activePalette!.id, index, color)}
										type="button"
									>
										<!-- Glass Shine -->
										<div
											class="absolute inset-0 bg-linear-to-br from-white/40 to-transparent opacity-50 pointer-events-none"
										></div>

										<!-- Bottom Reflection -->
										<div
											class="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-black/20 to-transparent pointer-events-none"
										></div>

										<!-- Copy Icon Overlay -->
										<div
											class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 scale-50 group-hover:scale-100"
										>
											<div
												class="bg-black/40 backdrop-blur-md p-2 rounded-full text-white shadow-lg border border-white/20"
											>
												<Icon icon="material-symbols:content-copy" class="w-6 h-6" />
											</div>
										</div>
									</button>

									<div class="mt-2 text-center">
										<p
											class="text-xs font-mono text-text-muted group-hover:text-white transition-colors select-all"
										>
											{formatColor(color, "hex")}
										</p>
									</div>
								</div>
							{/each}

							<!-- Add Slots -->
							{#each Array(Math.max(0, app.palettes.activePalette!.maxSlots - app.palettes.activePalette!.colors.length)) as _}
								<button
									class="aspect-square rounded-2xl border-2 border-dashed border-white/20 hover:border-phoenix-primary hover:bg-phoenix-primary/10 transition-all duration-300 flex items-center justify-center group hover:scale-105 active:scale-95"
									onclick={() => addColorToPalette(app.palettes.activePalette!.id, selectedColor)}
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
											onclick={() => {
												selectedColor = color;
												updateSelectedColorFromPicker();
											}}
											title={color}
											type="button"
										></button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{:else}
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
								onclick={() => (showCreateDialog = true)}
								type="button"
							>
								Create Palette
							</button>
						</div>
					</div>
				{/if}
			</div>
		</GlassPanel>
	</div>
</div>

<!-- Create Palette Dialog -->
{#if showCreateDialog}
	<div class="fixed inset-0 bg-base-content/20 flex items-center justify-center z-50">
		<div class="bg-base-100 rounded-lg p-6 w-96 shadow-xl scale-in">
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
						aria-describedby="name-help"
					/>
					<div id="name-help" class="text-xs text-base-content/60 mt-1">
						Max 50 characters, must be unique
					</div>
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
						aria-describedby="slots-help"
					/>
					<div id="slots-help" class="text-xs text-base-content/60 mt-1">
						Between 3 and 50 color slots
					</div>
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

<!-- Advanced Color Picker Integration -->
{#if showColorPicker}
	<!-- Mobile: Bottom Sheet / Desktop: Right Panel -->
	<div class="fixed inset-x-0 bottom-0 md:right-0 md:top-16 md:w-80 md:inset-x-auto z-40">
		<!-- Mobile: Bottom Sheet -->
		<div
			class="md:hidden bg-base-100 border-t border-base-300 shadow-lg p-4 max-h-80 overflow-y-auto"
		>
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-semibold text-base-content">Color Picker</h3>
				<button
					class="btn btn-sm btn-circle btn-ghost"
					onclick={() => {
						if (editingColorContext && selectedColor !== editingColorContext.originalColor) {
							const { paletteId, colorIndex } = editingColorContext;
							const palette = app.palettes.palettes.find((p) => p.id === paletteId);
							if (palette && palette.colors[colorIndex] !== undefined) {
								// Check for duplicates before updating
								if (
									palette.colors.includes(selectedColor) &&
									palette.colors.indexOf(selectedColor) !== colorIndex
								) {
									toast.warning("This color already exists in the palette.");
									selectedColor = editingColorContext.originalColor; // Revert to original
								} else {
									app.palettes.updateColor(paletteId, colorIndex, selectedColor);
									toast.success(`Color updated to ${selectedColor}`);
									addToColorHistory(selectedColor);
								}
							}
						}
						showColorPicker = false;
						editingColorContext = null; // Clear context after closing
					}}
					aria-label="Close color picker"
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
						addToColorHistory(detail.hex); // Add to history on confirmed change
					}
				}}
			/>
		</div>

		<!-- Desktop: Right Panel -->
		<div
			class="hidden md:block bg-base-100 border-l border-base-300 shadow-lg h-full overflow-y-auto"
		>
			<div class="p-4 border-b border-base-300">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-base-content">Color Picker</h3>
					<button
						class="btn btn-sm btn-circle btn-ghost"
						onclick={() => {
							if (editingColorContext && selectedColor !== editingColorContext.originalColor) {
								const { paletteId, colorIndex } = editingColorContext;
								const palette = app.palettes.palettes.find((p) => p.id === paletteId);
								if (palette && palette.colors[colorIndex] !== undefined) {
									// Check for duplicates before updating
									if (
										palette.colors.includes(selectedColor) &&
										palette.colors.indexOf(selectedColor) !== colorIndex
									) {
										toast.warning("This color already exists in the palette.");
										selectedColor = editingColorContext.originalColor; // Revert to original
									} else {
										app.palettes.updateColor(paletteId, colorIndex, selectedColor);
										toast.success(`Color updated to ${selectedColor}`);
										addToColorHistory(selectedColor);
									}
								}
							}
							showColorPicker = false;
							editingColorContext = null; // Clear context after closing
						}}
						aria-label="Close color picker"
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
							addToColorHistory(detail.hex); // Add to history on confirmed change
						}
					}}
				/>

				<!-- Color History -->
				{#if colorHistory.length > 0}
					<div class="mt-6">
						<h4 class="text-sm font-medium text-base-content mb-3">Recent Colors</h4>
						<div class="grid grid-cols-6 gap-2">
							{#each colorHistory.slice(0, 12) as historyColor}
								<button
									class="aspect-square rounded border border-base-300 hover:scale-110 transition-transform"
									style:background-color={historyColor}
									onclick={() => {
										selectedColor = historyColor;
									}}
									title={historyColor}
									aria-label="Select color {historyColor}"
								></button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Color Extraction Dialog -->
{#if showExtractDialog}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		role="button"
		tabindex="0"
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
			in:scale={{ duration: 500, start: 0.8, easing: elasticOut }}
			class="bg-base-100 rounded-lg shadow-xl p-6 w-96 max-w-90vw"
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
					aria-label="Close dialog"
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
								<p class="font-medium truncate">
									{reference.name}
								</p>
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

<!-- Context Menu -->
{#if contextMenu?.show}
	<div
		class="fixed bg-base-100 rounded-lg shadow-xl border border-base-300 py-2 z-50 context-menu"
		style:left="{contextMenu.x}px"
		style:top="{contextMenu.y}px"
	>
		<button
			class="flex items-center space-x-3 px-4 py-2 hover:bg-base-200 w-full text-left"
			onclick={changeColor}
			type="button"
		>
			<Icon icon="material-symbols:edit" class="h-4 w-4" />
			<span>Change Color</span>
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

<svelte:document onclick={handleDocumentClick} />

<style>
	.color-swatch-large {
		transition: all 0.2s var(--ease-smooth);
	}

	.color-swatch-large:hover {
		transform: translateY(-2px);
	}

	.bg-primary-selected {
		background-color: hsl(var(--p) / 0.1);
	}

	/* .bg-primary-bg {
        background-color: hsl(var(--p) / 0.1);
    } */

	/* Custom range slider styles for RGB/HSL */
	/* .range-error::-webkit-slider-thumb {
        background: #ef4444;
    }

    .range-success::-webkit-slider-thumb {
        background: #10b981;
    }

    .range-info::-webkit-slider-thumb {
        background: #3b82f6;
    } */
</style>
