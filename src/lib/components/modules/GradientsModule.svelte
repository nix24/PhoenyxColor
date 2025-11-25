<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import type { Gradient, GradientStop } from "$lib/stores/gradients.svelte";
	import { validateGradient, validateColor } from "$lib/schemas/validation";
	import pkg from "file-saver";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import { onMount } from "svelte";
	import { colord } from "colord";
	import chroma from "chroma-js";

	import { sortPalette } from "$lib/utils/color-engine";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";

	const { saveAs } = pkg;

	// State management
	let newGradientName = $state("");
	let showCreateDialog = $state(false);
	let showPresetsDialog = $state(false);
	let showExportDialog = $state(false);
	let gradientType: "linear" | "radial" | "conic" = $state("linear");
	let previewSize = $state({ width: 400, height: 200 });
	let searchTerm = $state("");
	let selectedCategory = $state("all");
	let isEditingStops = $state(false);
	let selectedStopIndex = $state(-1);

	// Gradient editor state
	let gradientAngle = $state(45);
	let gradientCenterX = $state(50);
	let gradientCenterY = $state(50);
	let gradientScale = $state(100);
	let colorPickerValue = $state("#3b82f6");
	let showColorPicker = $state(false);

	// Enhanced gradient presets with better categorization
	const gradientPresets = [
		// Trending
		{
			name: "Sunset Vibes",
			colors: ["#ff9a9e", "#fecfef", "#fecfef"],
			category: "trending",
			type: "linear",
			angle: 135,
		},
		{
			name: "Ocean Breeze",
			colors: ["#667eea", "#764ba2"],
			category: "trending",
			type: "linear",
			angle: 45,
		},
		{
			name: "Northern Lights",
			colors: ["#00c3f7", "#9921e8"],
			category: "trending",
			type: "radial",
		},
		{
			name: "Cyber Wave",
			colors: ["#4facfe", "#00f2fe"],
			category: "trending",
			type: "linear",
			angle: 90,
		},

		// Nature
		{
			name: "Forest Dawn",
			colors: ["#134e5e", "#71b280"],
			category: "nature",
			type: "linear",
			angle: 45,
		},
		{
			name: "Desert Sand",
			colors: ["#ffeaa7", "#fab1a0"],
			category: "nature",
			type: "linear",
			angle: 135,
		},
		{
			name: "Mountain Peak",
			colors: ["#74b9ff", "#0984e3", "#2d3436"],
			category: "nature",
			type: "linear",
			angle: 0,
		},
		{
			name: "Tropical Storm",
			colors: ["#00b894", "#00cec9"],
			category: "nature",
			type: "radial",
		},

		// Vibrant
		{
			name: "Electric Lime",
			colors: ["#00f260", "#0575e6"],
			category: "vibrant",
			type: "linear",
			angle: 45,
		},
		{
			name: "Pink Burst",
			colors: ["#f093fb", "#f5576c"],
			category: "vibrant",
			type: "radial",
		},
		{
			name: "Neon Dreams",
			colors: ["#ff0844", "#00dbde"],
			category: "vibrant",
			type: "linear",
			angle: 90,
		},
		{
			name: "Rainbow Explosion",
			colors: ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec"],
			category: "vibrant",
			type: "conic",
		},

		// Dark
		{
			name: "Midnight",
			colors: ["#232526", "#414345"],
			category: "dark",
			type: "linear",
			angle: 45,
		},
		{
			name: "Deep Space",
			colors: ["#000428", "#004e92"],
			category: "dark",
			type: "radial",
		},
		{
			name: "Shadow Realm",
			colors: ["#1a1a2e", "#16213e", "#0f3460"],
			category: "dark",
			type: "linear",
			angle: 135,
		},

		// Pastel
		{
			name: "Cotton Candy",
			colors: ["#ffecd2", "#fcb69f"],
			category: "pastel",
			type: "linear",
			angle: 45,
		},
		{
			name: "Dreamy Cloud",
			colors: ["#a8edea", "#fed6e3"],
			category: "pastel",
			type: "radial",
		},
		{
			name: "Soft Sunrise",
			colors: ["#fff1eb", "#ace0f9"],
			category: "pastel",
			type: "linear",
			angle: 90,
		},
	];

	const categories = [
		{ id: "all", name: "All", icon: "material-symbols:grid-view" },
		{
			id: "trending",
			name: "Trending",
			icon: "material-symbols:trending-up",
		},
		{ id: "nature", name: "Nature", icon: "material-symbols:eco" },
		{
			id: "vibrant",
			name: "Vibrant",
			icon: "material-symbols:electric-bolt",
		},
		{ id: "dark", name: "Dark", icon: "material-symbols:dark-mode" },
		{ id: "pastel", name: "Pastel", icon: "material-symbols:cloud" },
	];

	// Computed values
	let filteredPresets = $derived(
		gradientPresets.filter((preset) => {
			const matchesSearch = preset.name.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesCategory = selectedCategory === "all" || preset.category === selectedCategory;
			return matchesSearch && matchesCategory;
		})
	);

	let filteredGradients = $derived(
		app.gradients.gradients.filter((gradient) =>
			gradient.name.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);

	// Clear any persistent gradients on mount
	onMount(async () => {
		// Initialize gradient module - removed auto-clear to prevent data loss
		console.log("Gradients module initialized");
	});

	// Enhanced gradient CSS generation
	function generateCSSGradient(gradient: Gradient | null): string {
		if (!gradient || !gradient.stops.length) {
			return "linear-gradient(45deg in oklch, #3b82f6, #8b5cf6)";
		}

		const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
		const colorStops = sortedStops.map((stop) => `${stop.color} ${stop.position}%`).join(", ");

		switch (gradient.type) {
			case "linear":
				return `linear-gradient(${gradient.angle || 45}deg in oklch, ${colorStops})`;
			case "radial":
				return `radial-gradient(circle at ${gradient.centerX || 50}% ${gradient.centerY || 50}% in oklch, ${colorStops})`;
			case "conic":
				return `conic-gradient(from ${gradient.angle || 0}deg at ${gradient.centerX || 50}% ${gradient.centerY || 50}% in oklch, ${colorStops})`;
			default:
				return `linear-gradient(45deg in oklch, ${colorStops})`;
		}
	}

	// Create new gradient
	function createGradient() {
		if (!newGradientName.trim()) {
			toast.error("Please enter a gradient name");
			return;
		}

		const defaultStops: GradientStop[] = [
			{ color: "#3b82f6", position: 0 },
			{ color: "#8b5cf6", position: 100 },
		];

		const gradientData = {
			id: crypto.randomUUID(),
			name: newGradientName.trim(),
			type: gradientType,
			stops: defaultStops,
			angle: gradientType === "linear" ? gradientAngle : 0,
			centerX: gradientType === "radial" ? gradientCenterX : 50,
			centerY: gradientType === "radial" ? gradientCenterY : 50,
			createdAt: new Date(),
		};

		// Validate gradient data before adding
		const validation = validateGradient(gradientData);
		if (!validation.valid) {
			toast.error(`Invalid gradient: ${validation.error}`);
			return;
		}

		try {
			app.gradients.add(gradientData);
			newGradientName = "";
			showCreateDialog = false;
			toast.success("Gradient created successfully!");
		} catch (error) {
			console.error("Error creating gradient:", error);
			toast.error("Failed to create gradient");
		}
	}

	// Apply preset gradient
	function applyPreset(preset: any) {
		const stops: GradientStop[] = preset.colors.map((color: string, index: number) => ({
			color,
			position:
				index === 0
					? 0
					: index === preset.colors.length - 1
						? 100
						: (index / (preset.colors.length - 1)) * 100,
		}));

		try {
			app.gradients.add({
				name: preset.name,
				type: preset.type as "linear" | "radial" | "conic",
				stops,
				angle: preset.angle || 45,
				centerX: 50,
				centerY: 50,
			});

			showPresetsDialog = false;
			toast.success(`Applied "${preset.name}" preset!`);
		} catch (error) {
			console.error("Error applying preset:", error);
			toast.error("Failed to apply preset");
		}
	}

	let interpolateGradient = $state(true);

	// Generate from palette
	function generateFromPalette(paletteId: string) {
		const palette = app.palettes.palettes.find((p) => p.id === paletteId);
		if (!palette || palette.colors.length < 2) {
			toast.error("Need at least 2 colors in palette");
			return;
		}

		// Sort colors using perceptual color ordering for better gradient flow
		let colors = sortPalette(palette.colors);

		if (interpolateGradient && colors.length < 5) {
			colors = chroma.scale(colors).mode("lch").colors(5);
		}

		const stops: GradientStop[] = colors.map((color: string, index: number) => ({
			color,
			position: (index / (colors.length - 1)) * 100,
		}));

		try {
			app.gradients.add({
				name: `${palette.name} Gradient`,
				type: "linear",
				stops,
				angle: 45,
				centerX: 50,
				centerY: 50,
			});

			toast.success(`Generated gradient from "${palette.name}"!`);
		} catch (error) {
			console.error("Error generating from palette:", error);
			toast.error("Failed to generate gradient from palette");
		}
	}

	// Color stop management
	function addColorStop(gradient: Gradient, color: string = colorPickerValue, position?: number) {
		// Validate color before adding
		const colorValidation = validateColor(color);
		if (!colorValidation.valid) {
			toast.error(`Invalid color: ${colorValidation.error}`);
			return;
		}

		if (position === undefined) {
			// Find best position between existing stops
			const positions = gradient.stops.map((s) => s.position).sort((a, b) => a - b);
			position = 50; // Default to middle

			for (let i = 0; i < positions.length - 1; i++) {
				const gap = positions[i + 1] - positions[i];
				if (gap > 20) {
					position = positions[i] + gap / 2;
					break;
				}
			}
		}

		// Validate position
		if (position < 0 || position > 100) {
			toast.error("Position must be between 0 and 100");
			return;
		}

		const newStop: GradientStop = { color, position };
		gradient.stops.push(newStop);
		gradient.stops.sort((a, b) => a.position - b.position);
		toast.success("Color stop added!");
	}

	function removeColorStop(gradient: Gradient, index: number) {
		if (gradient.stops.length <= 2) {
			toast.warning("Gradient must have at least 2 color stops");
			return;
		}
		gradient.stops.splice(index, 1);
		toast.info("Color stop removed");
	}

	function updateColorStop(gradient: Gradient, index: number, updates: Partial<GradientStop>) {
		if (gradient.stops[index]) {
			Object.assign(gradient.stops[index], updates);
			if (updates.position !== undefined) {
				gradient.stops.sort((a, b) => a.position - b.position);
			}
		}
	}

	// Advanced gradient operations
	function reverseGradient(gradient: Gradient) {
		gradient.stops = gradient.stops
			.map((stop) => ({
				...stop,
				position: 100 - stop.position,
			}))
			.reverse();
		toast.success("Gradient reversed!");
	}

	function randomizeGradient(gradient: Gradient) {
		const colors = chroma
			.scale(["red", "yellow", "green", "blue", "purple"])
			.mode("lch")
			.colors(gradient.stops.length);
		gradient.stops.forEach((stop, index) => {
			stop.color = colors[index];
		});
		toast.success("Gradient randomized!");
	}

	function smoothenGradient(gradient: Gradient) {
		if (gradient.stops.length < 3) return;

		const colors = gradient.stops.map((stop) => stop.color);
		const smoothColors = chroma.scale(colors).mode("lch").colors(gradient.stops.length);

		gradient.stops.forEach((stop, index) => {
			stop.color = smoothColors[index];
		});
		toast.success("Gradient smoothened!");
	}

	function smartSortStops(gradient: Gradient) {
		const colors = gradient.stops.map((s) => s.color);
		const sortedColors = sortPalette(colors);

		gradient.stops = sortedColors.map((color, index) => ({
			color,
			position: (index / (sortedColors.length - 1)) * 100,
		}));
		toast.success("Smart sorted gradient stops!");
	}

	// Export functions
	async function exportAsSVG(gradient: Gradient) {
		const gradientId = `gradient-${Date.now()}`;
		let gradientDef = "";

		switch (gradient.type) {
			case "linear": {
				const angle = gradient.angle || 45;
				const x1 = 50 - 50 * Math.cos((angle * Math.PI) / 180);
				const y1 = 50 - 50 * Math.sin((angle * Math.PI) / 180);
				const x2 = 50 + 50 * Math.cos((angle * Math.PI) / 180);
				const y2 = 50 + 50 * Math.sin((angle * Math.PI) / 180);
				gradientDef = `<linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
                    ${gradient.stops.map((stop) => `<stop offset="${stop.position}%" stop-color="${stop.color}"/>`).join("\n")}
                </linearGradient>`;
				break;
			}
			case "radial":
				gradientDef = `<radialGradient id="${gradientId}" cx="${gradient.centerX || 50}%" cy="${gradient.centerY || 50}%" r="50%">
                    ${gradient.stops.map((stop) => `<stop offset="${stop.position}%" stop-color="${stop.color}"/>`).join("\n")}
                </radialGradient>`;
				break;
			default:
				gradientDef = `<linearGradient id="${gradientId}">
                    ${gradient.stops.map((stop) => `<stop offset="${stop.position}%" stop-color="${stop.color}"/>`).join("\n")}
                </linearGradient>`;
		}

		const svg = `<svg width="${previewSize.width}" height="${previewSize.height}" xmlns="http://www.w3.org/2000/svg">
            <defs>${gradientDef}</defs>
            <rect width="100%" height="100%" fill="url(#${gradientId})"/>
        </svg>`;

		// Use file-saver for reliable downloads
		const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
		saveAs(blob, `${gradient.name}.svg`);
		toast.success("SVG exported!");
	}

	// Export functions
	async function exportGradient(gradient: Gradient, format: "css" | "png" | "svg" | "json") {
		// Validate gradient before export
		const validation = validateGradient(gradient);
		if (!validation.valid) {
			toast.error(`Cannot export invalid gradient: ${validation.error}`);
			return;
		}

		try {
			switch (format) {
				case "css": {
					const css = `background: ${generateCSSGradient(gradient)};`;
					await navigator.clipboard.writeText(css);
					toast.success("CSS copied to clipboard!");
					break;
				}
				case "json": {
					const json = JSON.stringify(gradient, null, 2);
					const jsonBlob = new Blob([json], { type: "application/json;charset=utf-8" });
					saveAs(jsonBlob, `${gradient.name}.json`);
					break;
				}
				case "png":
					await exportAsPNG(gradient);
					break;
				case "svg":
					await exportAsSVG(gradient);
					break;
			}
		} catch (error) {
			console.error("Export error:", error);
			toast.error(`Failed to export as ${format.toUpperCase()}`);
		}
	}

	async function exportAsPNG(gradient: Gradient) {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		canvas.width = previewSize.width;
		canvas.height = previewSize.height;

		// Create gradient based on type
		let grad: CanvasGradient;
		switch (gradient.type) {
			case "linear": {
				const angle = ((gradient.angle || 45) * Math.PI) / 180;
				const x1 = canvas.width / 2 - (Math.cos(angle) * canvas.width) / 2;
				const y1 = canvas.height / 2 - (Math.sin(angle) * canvas.height) / 2;
				const x2 = canvas.width / 2 + (Math.cos(angle) * canvas.width) / 2;
				const y2 = canvas.height / 2 + (Math.sin(angle) * canvas.height) / 2;
				grad = ctx.createLinearGradient(x1, y1, x2, y2);
				break;
			}
			case "radial": {
				const centerX = ((gradient.centerX || 50) / 100) * canvas.width;
				const centerY = ((gradient.centerY || 50) / 100) * canvas.height;
				grad = ctx.createRadialGradient(
					centerX,
					centerY,
					0,
					centerX,
					centerY,
					Math.max(canvas.width, canvas.height) / 2
				);
				break;
			}
			default:
				grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
		}

		// Add color stops
		gradient.stops.forEach((stop) => {
			grad.addColorStop(stop.position / 100, stop.color);
		});

		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Download
		canvas.toBlob((blob) => {
			if (blob) {
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `${gradient.name}.png`;
				a.click();
				URL.revokeObjectURL(url);
				toast.success("PNG exported!");
			}
		});
	}

	// Enhanced drag and drop for color stops
	function handleStopDndConsider(e: CustomEvent) {
		if (app.gradients.activeGradient) {
			app.gradients.activeGradient.stops = e.detail.items;
		}
	}

	function handleStopDndFinalize(e: CustomEvent) {
		const activeGradient = app.gradients.activeGradient;
		if (activeGradient) {
			activeGradient.stops = e.detail.items;
			// Update positions based on new order
			activeGradient.stops.forEach((stop, index) => {
				stop.position = (index / (activeGradient.stops.length - 1)) * 100;
			});
			toast.success("Color stops reordered!");
		}
	}
</script>

<div class="h-full flex flex-col gap-4">
	<!-- Enhanced Header -->
	<GlassPanel
		class="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4 shrink-0 overflow-visible z-20"
		intensity="low"
	>
		<div>
			<h2 class="text-2xl font-bold text-white flex items-center gap-2 tracking-wide">
				<Icon icon="material-symbols:gradient" class="w-6 h-6 text-phoenix-primary" />
				Gradient Generator
			</h2>
			<p class="text-sm text-text-muted mt-1">Create beautiful gradients with advanced controls</p>
		</div>

		<div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 md:mt-0">
			<!-- Search -->
			<div class="relative">
				<input
					bind:value={searchTerm}
					type="text"
					placeholder="Search gradients..."
					class="input input-sm bg-black/20 border-white/10 text-white placeholder:text-text-muted/50 w-48 pl-8 focus:border-phoenix-primary focus:outline-none transition-colors"
				/>
				<Icon
					icon="material-symbols:search"
					class="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted"
				/>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-2">
				<button
					class="btn btn-sm border-none bg-gradient-to-r from-phoenix-primary to-phoenix-violet text-white shadow-lg hover:shadow-phoenix-primary/50 hover:scale-105 transition-all duration-300 gap-2"
					onclick={() => (showCreateDialog = true)}
					type="button"
				>
					<Icon icon="material-symbols:add" class="w-4 h-4" />
					New Gradient
				</button>

				<button
					class="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 gap-2"
					onclick={() => (showPresetsDialog = true)}
					type="button"
				>
					<Icon icon="material-symbols:auto-awesome" class="w-4 h-4" />
					Presets
				</button>

				{#if app.palettes.palettes.length > 0}
					<div class="dropdown dropdown-end">
						<button
							class="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 gap-2"
							type="button"
							tabindex="0"
						>
							<Icon icon="material-symbols:palette" class="w-4 h-4" />
							From Palette
						</button>
						<ul
							class="dropdown-content menu bg-void-deep border border-white/10 rounded-xl z-[100] w-64 p-2 shadow-xl max-h-64 overflow-y-auto backdrop-blur-xl"
						>
							<div class="p-2 border-b border-white/10 mb-2">
								<label class="label cursor-pointer justify-start gap-2 p-0">
									<input
										type="checkbox"
										class="checkbox checkbox-xs checkbox-primary"
										bind:checked={interpolateGradient}
									/>
									<span class="label-text text-xs text-white">Smooth Gradient</span>
								</label>
							</div>
							{#each app.palettes.palettes as palette (palette.id)}
								<li>
									<button
										onclick={() => generateFromPalette(palette.id)}
										type="button"
										class="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-colors"
										disabled={palette.colors.length < 2}
										title="Generate gradient with perceptually ordered colors"
									>
										<div class="flex gap-1">
											{#each palette.colors.slice(0, 4) as color}
												<div
													class="w-3 h-3 rounded-full border border-white/10"
													style:background-color={color}
												></div>
											{/each}
										</div>
										<div class="flex-1 text-left min-w-0">
											<p class="text-sm font-medium truncate">
												{palette.name}
											</p>
											<p class="text-[10px] text-text-muted/60 uppercase tracking-wider">
												{palette.colors.length} colors
											</p>
										</div>
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</div>
	</GlassPanel>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
		<!-- Gradients Sidebar -->
		<GlassPanel class="w-full lg:w-80 overflow-hidden" intensity="low">
			<div class="flex flex-col h-full">
				<div class="p-4 border-b border-white/5 bg-black/20">
					<h3 class="font-semibold text-white mb-0 flex items-center justify-between">
						Gradients ({filteredGradients.length})
						{#if app.gradients.gradients.length > 0}
							<button
								class="btn btn-xs btn-ghost text-error hover:bg-error/10"
								onclick={async () => {
									if (confirm("Are you sure you want to delete all gradients?")) {
										app.gradients.gradients.forEach((g) => app.gradients.remove(g.id));
										toast.success("All gradients cleared!");
									}
								}}
								title="Clear all gradients"
							>
								<Icon icon="material-symbols:clear-all" class="w-3 h-3" />
							</button>
						{/if}
					</h3>
				</div>

				<div class="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
					{#each filteredGradients as gradient (gradient.id)}
						<button
							class={cn(
								"w-full text-left p-3 rounded-xl cursor-pointer transition-all duration-200 border group relative overflow-hidden",
								app.gradients.activeGradientId === gradient.id
									? "bg-phoenix-primary/20 border-phoenix-primary/50 shadow-[0_0_15px_rgba(255,0,127,0.2)]"
									: "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
							)}
							onclick={() => app.gradients.setActive(gradient.id)}
							tabindex="0"
						>
							<div class="flex items-center justify-between mb-2 relative z-10">
								<h4
									class={cn(
										"font-medium text-sm truncate",
										app.gradients.activeGradientId === gradient.id
											? "text-white"
											: "text-text-muted group-hover:text-white"
									)}
								>
									{gradient.name}
								</h4>
								<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<div
										role="button"
										onkeydown={(e) => {
											if (e.key === "Enter") {
												exportGradient(gradient, "css");
											}
										}}
										tabindex="0"
										class="btn btn-xs btn-ghost text-text-muted hover:text-white"
										onclick={(e) => {
											e.stopPropagation();
											exportGradient(gradient, "css");
										}}
										title="Copy CSS"
									>
										<Icon icon="material-symbols:code" class="w-3 h-3" />
									</div>
									<div
										role="button"
										onkeydown={(e) => {
											if (e.key === "Enter") {
												app.gradients.remove(gradient.id);
												toast.info(`Deleted "${gradient.name}"`);
											}
										}}
										tabindex="0"
										class="btn btn-xs btn-ghost text-error hover:bg-error/10"
										onclick={(e) => {
											e.stopPropagation();
											app.gradients.remove(gradient.id);
											toast.info(`Deleted "${gradient.name}"`);
										}}
										title="Delete gradient"
									>
										<Icon icon="material-symbols:delete-outline" class="w-3 h-3" />
									</div>
								</div>
							</div>
							<div
								class="h-12 rounded-lg border border-white/10 shadow-inner"
								style:background={generateCSSGradient(gradient)}
							></div>
							<p
								class="text-[10px] text-text-muted/60 mt-1 capitalize uppercase tracking-wider relative z-10"
							>
								{gradient.type} • {gradient.stops.length} stops
							</p>
						</button>
					{/each}

					{#if filteredGradients.length === 0}
						<div class="text-center py-8 text-text-muted/50">
							<Icon icon="material-symbols:gradient" class="w-12 h-12 mx-auto mb-2 opacity-30" />
							<p>No gradients found</p>
						</div>
					{/if}
				</div>
			</div>
		</GlassPanel>

		<!-- Gradient Editor -->
		<GlassPanel class="flex-1 overflow-hidden relative" intensity="medium">
			<div class="flex flex-col h-full">
				{#if app.gradients.activeGradient}
					<div class="p-6 flex-1 overflow-y-auto custom-scrollbar">
						<!-- Editor Header -->
						<div class="flex items-center justify-between mb-6">
							<div>
								<h3 class="text-xl font-bold text-white tracking-wide">
									{app.gradients.activeGradient.name}
								</h3>
								<p class="text-sm text-text-muted">
									{app.gradients.activeGradient.type} gradient • {app.gradients.activeGradient.stops
										.length} stops
								</p>
							</div>

							<div class="flex gap-2">
								<!-- Gradient Type Selector -->
								<div class="join border border-white/10 rounded-lg">
									{#each ["linear", "radial", "conic"] as type}
										<button
											class={cn(
												"btn btn-sm join-item border-none",
												app.gradients.activeGradient.type === type
													? "bg-phoenix-primary text-white"
													: "bg-transparent text-text-muted hover:bg-white/5 hover:text-white"
											)}
											onclick={() => {
												app.gradients.update(app.gradients.activeGradient!.id, {
													type: type as "linear" | "radial" | "conic",
												});
												toast.success(`Changed to ${type} gradient`);
											}}
										>
											{type}
										</button>
									{/each}
								</div>

								<!-- Export Button -->
								<div class="dropdown dropdown-end">
									<button
										class="btn btn-sm btn-outline border-white/20 text-white hover:bg-white/10 hover:border-white/40 gap-2"
										type="button"
										tabindex="0"
									>
										<Icon icon="material-symbols:download" class="w-4 h-4" />
										Export
									</button>
									<ul
										class="dropdown-content menu bg-void-deep border border-white/10 rounded-xl z-[1] w-48 p-2 shadow-xl backdrop-blur-xl"
									>
										<li>
											<button
												onclick={() => exportGradient(app.gradients.activeGradient!, "css")}
												class="text-text-muted hover:text-white hover:bg-white/5">Copy CSS</button
											>
										</li>
										<li>
											<button
												onclick={() => exportGradient(app.gradients.activeGradient!, "json")}
												class="text-text-muted hover:text-white hover:bg-white/5">JSON File</button
											>
										</li>
										<li>
											<button
												onclick={() => exportGradient(app.gradients.activeGradient!, "png")}
												class="text-text-muted hover:text-white hover:bg-white/5">PNG Image</button
											>
										</li>
										<li>
											<button
												onclick={() => exportGradient(app.gradients.activeGradient!, "svg")}
												class="text-text-muted hover:text-white hover:bg-white/5">SVG File</button
											>
										</li>
									</ul>
								</div>
							</div>
						</div>

						<!-- Large Preview -->
						<div
							class="bg-void-deep rounded-xl border border-white/10 shadow-inner p-4 mb-6 flex items-center justify-center relative overflow-hidden"
						>
							<!-- Checkerboard pattern for transparency -->
							<div
								class="absolute inset-0 opacity-20"
								style="background-image: radial-gradient(#444 1px, transparent 1px); background-size: 10px 10px;"
							></div>

							<div
								class="rounded-lg transition-all duration-300 shadow-2xl relative z-10"
								style:background={generateCSSGradient(app.gradients.activeGradient)}
								style:width="{previewSize.width}px"
								style:height="{previewSize.height}px"
							></div>
						</div>

						<!-- Gradient Controls -->
						<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
							<!-- Type-specific Controls -->
							<div class="space-y-4">
								<h4 class="font-semibold text-white">Gradient Settings</h4>

								{#if app.gradients.activeGradient.type === "linear"}
									<div>
										<label class="label" for="angle-input">
											<span class="label-text text-text-muted"
												>Angle: {app.gradients.activeGradient.angle || 45}°</span
											>
										</label>
										<input
											type="range"
											min="0"
											max="360"
											value={app.gradients.activeGradient.angle || 45}
											class="range range-xs range-primary"
											onchange={(e) => {
												const angle = parseInt((e.target as HTMLInputElement).value);
												app.gradients.update(app.gradients.activeGradient!.id, { angle });
											}}
										/>
									</div>
								{/if}

								{#if app.gradients.activeGradient.type === "radial" || app.gradients.activeGradient.type === "conic"}
									<div class="grid grid-cols-2 gap-4">
										<div>
											<label class="label" for="center-x-input">
												<span class="label-text text-text-muted"
													>Center X: {app.gradients.activeGradient.centerX || 50}%</span
												>
											</label>
											<input
												type="range"
												min="0"
												max="100"
												value={app.gradients.activeGradient.centerX || 50}
												class="range range-xs range-primary"
												onchange={(e) => {
													const centerX = parseInt((e.target as HTMLInputElement).value);
													app.gradients.update(app.gradients.activeGradient!.id, { centerX });
												}}
											/>
										</div>
										<div>
											<label class="label" for="center-y-input">
												<span class="label-text text-text-muted"
													>Center Y: {app.gradients.activeGradient.centerY || 50}%</span
												>
											</label>
											<input
												type="range"
												min="0"
												max="100"
												value={app.gradients.activeGradient.centerY || 50}
												class="range range-xs range-primary"
												onchange={(e) => {
													const centerY = parseInt((e.target as HTMLInputElement).value);
													app.gradients.update(app.gradients.activeGradient!.id, { centerY });
												}}
											/>
										</div>
									</div>
								{/if}
							</div>

							<!-- Preview Size Controls -->
							<div class="space-y-4">
								<h4 class="font-semibold text-white">Preview Size</h4>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label class="label" for="width-input">
											<span class="label-text text-text-muted">Width: {previewSize.width}px</span>
										</label>
										<input
											type="range"
											min="200"
											max="600"
											bind:value={previewSize.width}
											class="range range-xs range-secondary"
										/>
									</div>
									<div>
										<label class="label" for="height-input">
											<span class="label-text text-text-muted">Height: {previewSize.height}px</span>
										</label>
										<input
											type="range"
											min="100"
											max="400"
											bind:value={previewSize.height}
											class="range range-xs range-secondary"
										/>
									</div>
								</div>
							</div>
						</div>

						<!-- Color Stops Editor -->
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<h4 class="font-semibold text-white">Color Stops</h4>
								<div class="flex gap-2">
									<button
										class="btn btn-sm btn-outline border-white/20 text-text-muted hover:text-white hover:bg-white/10 gap-2"
										onclick={() => reverseGradient(app.gradients.activeGradient!)}
									>
										<Icon icon="material-symbols:swap-horiz" class="w-4 h-4" />
										Reverse
									</button>
									<button
										class="btn btn-sm btn-outline border-white/20 text-text-muted hover:text-white hover:bg-white/10 gap-2"
										onclick={() => smoothenGradient(app.gradients.activeGradient!)}
									>
										<Icon icon="material-symbols:auto-fix-high" class="w-4 h-4" />
										Smooth
									</button>
									<button
										class="btn btn-sm btn-outline border-white/20 text-text-muted hover:text-white hover:bg-white/10 gap-2"
										onclick={() => smartSortStops(app.gradients.activeGradient!)}
									>
										<Icon icon="material-symbols:sort" class="w-4 h-4" />
										Smart Sort
									</button>
									<button
										class="btn btn-sm bg-phoenix-primary border-none text-white hover:bg-phoenix-primary/80 gap-2"
										onclick={() => addColorStop(app.gradients.activeGradient!)}
									>
										<Icon icon="material-symbols:add" class="w-4 h-4" />
										Add Stop
									</button>
								</div>
							</div>

							<!-- Color Stops List -->
							<div class="space-y-2">
								{#each app.gradients.activeGradient.stops as stop, index (stop.color + stop.position)}
									<div
										class="flex items-center gap-4 p-3 bg-black/20 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
									>
										<!-- Color Preview -->
										<div
											role="button"
											tabindex="0"
											class="w-8 h-8 rounded border border-white/20 cursor-pointer shadow-sm"
											style={`background-color: ${stop.color}`}
											onclick={() => {
												selectedStopIndex = index;
												colorPickerValue = stop.color;
												showColorPicker = true;
											}}
											onkeydown={(e) => {
												if (e.key === "Enter") {
													selectedStopIndex = index;
													colorPickerValue = stop.color;
													showColorPicker = true;
												}
											}}
										></div>

										<!-- Color Input -->
										<input
											type="text"
											value={stop.color}
											class="input input-sm bg-black/30 border-white/10 text-white w-24 font-mono focus:border-phoenix-primary"
											onchange={(e) => {
												const color = (e.target as HTMLInputElement).value;
												updateColorStop(app.gradients.activeGradient!, index, { color });
											}}
										/>

										<!-- Position Slider -->
										<div class="flex-1">
											<label for="position-input" class="text-xs text-text-muted"
												>Position: {stop.position}%</label
											>
											<input
												type="range"
												min="0"
												max="100"
												value={stop.position}
												class="range range-xs range-primary w-full"
												onchange={(e) => {
													const position = parseInt((e.target as HTMLInputElement).value);
													updateColorStop(app.gradients.activeGradient!, index, { position });
												}}
											/>
										</div>

										<!-- Remove Button -->
										<button
											class="btn btn-sm btn-circle btn-ghost text-error hover:bg-error/10"
											onclick={() => removeColorStop(app.gradients.activeGradient!, index)}
											disabled={app.gradients.activeGradient.stops.length <= 2}
										>
											<Icon icon="material-symbols:delete-outline" class="w-4 h-4" />
										</button>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else}
					<!-- Empty State -->
					<div class="flex items-center justify-center h-full">
						<div class="text-center text-text-muted/50">
							<div
								class="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 animate-float"
							>
								<Icon icon="material-symbols:gradient" class="w-12 h-12 opacity-50" />
							</div>
							<h3 class="text-xl font-bold text-white mb-2">No Gradient Selected</h3>
							<p class="mb-6 max-w-xs mx-auto">Create or select a gradient to start editing</p>
							<button
								class="btn btn-primary bg-gradient-to-r from-phoenix-primary to-phoenix-violet border-none text-white shadow-lg hover:shadow-phoenix-primary/50 gap-2"
								onclick={() => (showCreateDialog = true)}
							>
								<Icon icon="material-symbols:add" class="w-4 h-4" />
								Create Gradient
							</button>
						</div>
					</div>
				{/if}
			</div>
		</GlassPanel>
	</div>
</div>

<!-- Create Gradient Dialog -->
{#if showCreateDialog}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg mb-4">Create New Gradient</h3>

			<div class="space-y-4">
				<div>
					<label class="label" for="gradient-name-input">
						<span class="label-text">Gradient Name</span>
					</label>
					<input
						bind:value={newGradientName}
						type="text"
						placeholder="Enter gradient name..."
						class="input input-bordered w-full"
						onkeydown={(e) => e.key === "Enter" && createGradient()}
					/>
				</div>

				<div>
					<label class="label" for="gradient-type-select">
						<span class="label-text">Gradient Type</span>
					</label>
					<div class="join w-full">
						{#each ["linear", "radial", "conic"] as type}
							<button
								class="btn join-item flex-1"
								class:btn-primary={gradientType === type}
								class:btn-outline={gradientType !== type}
								onclick={() => (gradientType = type as "linear" | "radial" | "conic")}
							>
								{type}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<div class="modal-action">
				<button class="btn btn-ghost" onclick={() => (showCreateDialog = false)}>Cancel</button>
				<button class="btn btn-primary" onclick={createGradient} disabled={!newGradientName.trim()}>
					Create Gradient
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Presets Dialog -->
{#if showPresetsDialog}
	<div class="modal modal-open">
		<div class="modal-box max-w-4xl">
			<h3 class="font-bold text-lg mb-4">Gradient Presets</h3>

			<!-- Categories -->
			<div class="flex flex-wrap gap-2 mb-4">
				{#each categories as category}
					<button
						class="btn btn-sm"
						class:btn-primary={selectedCategory === category.id}
						class:btn-outline={selectedCategory !== category.id}
						onclick={() => (selectedCategory = category.id)}
					>
						<Icon icon={category.icon} class="w-4 h-4" />
						{category.name}
					</button>
				{/each}
			</div>

			<!-- Presets Grid -->
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
				{#each filteredPresets as preset}
					<div
						role="button"
						tabindex="0"
						class="card bg-base-100 border cursor-pointer hover:shadow-md transition-all"
						onclick={() => applyPreset(preset)}
						onkeydown={(e) => {
							if (e.key === "Enter") {
								applyPreset(preset);
							}
						}}
					>
						<div class="card-body p-3">
							<div
								class="h-16 rounded border border-base-300 mb-2"
								style:background={`linear-gradient(45deg in oklch, ${preset.colors.join(", ")})`}
							></div>
							<h4 class="font-medium text-sm">{preset.name}</h4>
							<p class="text-xs text-base-content/60 capitalize">
								{preset.type}
							</p>
						</div>
					</div>
				{/each}
			</div>

			<div class="modal-action">
				<button class="btn btn-ghost" onclick={() => (showPresetsDialog = false)}>Close</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.range-primary::-webkit-slider-thumb {
		background: hsl(var(--p));
	}

	.range-secondary::-webkit-slider-thumb {
		background: hsl(var(--s));
	}
</style>
