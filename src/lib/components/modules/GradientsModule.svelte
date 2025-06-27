<script lang="ts">
	import { appStore } from "$lib/stores/app.svelte";
	import type { Gradient, GradientStop } from "$lib/stores/app.svelte";
	import { validateGradient, validateColor } from "$lib/schemas/validation";
	import pkg from "file-saver";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import { onMount } from "svelte";
	import { colord } from "colord";
	import chroma from "chroma-js";
	import tinygradient from "tinygradient";
	import { dndzone } from "svelte-dnd-action";
	import { orderColorsForGradient } from "$lib/utils/colorUtils";

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
		appStore.gradients.filter((gradient) =>
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
			return "linear-gradient(45deg, #3b82f6, #8b5cf6)";
		}

		const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
		const colorStops = sortedStops.map((stop) => `${stop.color} ${stop.position}%`).join(", ");

		switch (gradient.type) {
			case "linear":
				return `linear-gradient(${gradient.angle || 45}deg, ${colorStops})`;
			case "radial":
				return `radial-gradient(circle at ${gradient.centerX || 50}% ${gradient.centerY || 50}%, ${colorStops})`;
			case "conic":
				return `conic-gradient(from ${gradient.angle || 0}deg at ${gradient.centerX || 50}% ${gradient.centerY || 50}%, ${colorStops})`;
			default:
				return `linear-gradient(45deg, ${colorStops})`;
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
			appStore.addGradient(gradientData);
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
			appStore.addGradient({
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

	// Generate from palette
	function generateFromPalette(paletteId: string) {
		const palette = appStore.palettes.find((p) => p.id === paletteId);
		if (!palette || palette.colors.length < 2) {
			toast.error("Need at least 2 colors in palette");
			return;
		}

		// Sort colors using perceptual color ordering for better gradient flow
		const colors = orderColorsForGradient(palette.colors);

		const stops: GradientStop[] = colors.map((color: string, index: number) => ({
			color,
			position: (index / (colors.length - 1)) * 100,
		}));

		try {
			appStore.addGradient({
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

	// Export functions
	async function exportAsSVG(gradient: Gradient) {
		const gradientId = `gradient-${Date.now()}`;
		let gradientDef = "";

		switch (gradient.type) {
			case "linear":
				const angle = gradient.angle || 45;
				const x1 = 50 - 50 * Math.cos((angle * Math.PI) / 180);
				const y1 = 50 - 50 * Math.sin((angle * Math.PI) / 180);
				const x2 = 50 + 50 * Math.cos((angle * Math.PI) / 180);
				const y2 = 50 + 50 * Math.sin((angle * Math.PI) / 180);
				gradientDef = `<linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
                    ${gradient.stops.map((stop) => `<stop offset="${stop.position}%" stop-color="${stop.color}"/>`).join("\n")}
                </linearGradient>`;
				break;
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
				case "css":
					const css = `background: ${generateCSSGradient(gradient)};`;
					await navigator.clipboard.writeText(css);
					toast.success("CSS copied to clipboard!");
					break;
				case "json":
					const json = JSON.stringify(gradient, null, 2);
					const jsonBlob = new Blob([json], { type: "application/json;charset=utf-8" });
					saveAs(jsonBlob, `${gradient.name}.json`);
					break;
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
		let grad;
		switch (gradient.type) {
			case "linear":
				const angle = ((gradient.angle || 45) * Math.PI) / 180;
				const x1 = canvas.width / 2 - (Math.cos(angle) * canvas.width) / 2;
				const y1 = canvas.height / 2 - (Math.sin(angle) * canvas.height) / 2;
				const x2 = canvas.width / 2 + (Math.cos(angle) * canvas.width) / 2;
				const y2 = canvas.height / 2 + (Math.sin(angle) * canvas.height) / 2;
				grad = ctx.createLinearGradient(x1, y1, x2, y2);
				break;
			case "radial":
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
		if (appStore.activeGradient) {
			appStore.activeGradient.stops = e.detail.items;
		}
	}

	function handleStopDndFinalize(e: CustomEvent) {
		if (appStore.activeGradient) {
			appStore.activeGradient.stops = e.detail.items;
			// Update positions based on new order
			appStore.activeGradient.stops.forEach((stop, index) => {
				stop.position = (index / (appStore.activeGradient!.stops.length - 1)) * 100;
			});
			toast.success("Color stops reordered!");
		}
	}
</script>

<div class="h-full flex flex-col bg-base-50">
	<!-- Enhanced Header -->
	<div
		class="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-base-300 bg-base-100 shadow-sm"
	>
		<div>
			<h2 class="text-2xl font-bold text-base-content flex items-center gap-2">
				<Icon icon="material-symbols:gradient" class="w-6 h-6 text-primary" />
				Gradient Generator
			</h2>
			<p class="text-sm text-base-content/70 mt-1">
				Create beautiful gradients with advanced controls
			</p>
		</div>

		<div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 md:mt-0">
			<!-- Search -->
			<div class="relative">
				<input
					bind:value={searchTerm}
					type="text"
					placeholder="Search gradients..."
					class="input input-sm input-bordered w-48 pl-8"
				/>
				<Icon
					icon="material-symbols:search"
					class="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50"
				/>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-2">
				<button
					class="btn btn-primary btn-sm gap-2"
					onclick={() => (showCreateDialog = true)}
					type="button"
				>
					<Icon icon="material-symbols:add" class="w-4 h-4" />
					New Gradient
				</button>

				<button
					class="btn btn-outline btn-sm gap-2"
					onclick={() => (showPresetsDialog = true)}
					type="button"
				>
					<Icon icon="material-symbols:auto-awesome" class="w-4 h-4" />
					Browse Presets
				</button>

				{#if appStore.palettes.length > 0}
					<div class="dropdown dropdown-end">
						<button class="btn btn-outline btn-sm gap-2" type="button" tabindex="0">
							<Icon icon="material-symbols:palette" class="w-4 h-4" />
							From Palette
						</button>
						<ul
							class="dropdown-content menu bg-base-100 rounded-box z-[1] w-64 p-2 shadow-xl border border-base-300 max-h-64 overflow-y-auto"
						>
							{#each appStore.palettes as palette (palette.id)}
								<li>
									<button
										onclick={() => generateFromPalette(palette.id)}
										type="button"
										class="flex items-center gap-3 p-2"
										disabled={palette.colors.length < 2}
										title="Generate gradient with perceptually ordered colors"
									>
										<div class="flex gap-1">
											{#each palette.colors.slice(0, 4) as color}
												<div
													class="w-3 h-3 rounded border border-base-300"
													style:background-color={color}
												></div>
											{/each}
										</div>
										<div class="flex-1 text-left">
											<p class="text-sm font-medium">
												{palette.name}
											</p>
											<p class="text-xs text-base-content/60">
												{palette.colors.length} colors • Optimized
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
	</div>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col lg:flex-row">
		<!-- Gradients Sidebar -->
		<div class="w-full lg:w-80 border-r border-base-300 bg-base-100 overflow-y-auto">
			<div class="p-4">
				<h3 class="font-semibold text-base-content mb-4 flex items-center justify-between">
					Gradients ({filteredGradients.length})
					{#if appStore.gradients.length > 0}
						<button
							class="btn btn-xs btn-ghost text-error"
							onclick={async () => {
								appStore.gradients.forEach((g) => appStore.removeGradient(g.id));
								toast.success("All gradients cleared!");
							}}
							title="Clear all gradients"
						>
							<Icon icon="material-symbols:clear-all" class="w-3 h-3" />
						</button>
					{/if}
				</h3>

				<div class="space-y-3">
					{#each filteredGradients as gradient (gradient.id)}
						<button
							class="card bg-base-100 border cursor-pointer transition-all duration-200 hover:shadow-md"
							class:border-primary={appStore.state.activeGradient === gradient.id}
							class:shadow-md={appStore.state.activeGradient === gradient.id}
							onclick={() => appStore.setActiveGradient(gradient.id)}
							tabindex="0"
						>
							<div class="card-body p-3">
								<div class="flex items-center justify-between mb-2">
									<h4 class="font-medium text-sm truncate">
										{gradient.name}
									</h4>
									<div class="flex gap-1">
										<div
											role="button"
											onkeydown={(e) => {
												if (e.key === "Enter") {
													exportGradient(gradient, "css");
												}
											}}
											tabindex="0"
											class="btn btn-xs btn-ghost"
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
													appStore.removeGradient(gradient.id);
													toast.info(`Deleted "${gradient.name}"`);
												}
											}}
											tabindex="0"
											class="btn btn-xs btn-ghost text-error"
											onclick={(e) => {
												e.stopPropagation();
												appStore.removeGradient(gradient.id);
												toast.info(`Deleted "${gradient.name}"`);
											}}
											title="Delete gradient"
										>
											<Icon icon="material-symbols:delete-outline" class="w-3 h-3" />
										</div>
									</div>
								</div>
								<div
									class="h-12 rounded border border-base-300"
									style:background={generateCSSGradient(gradient)}
								></div>
								<p class="text-xs text-base-content/60 mt-1 capitalize">
									{gradient.type} • {gradient.stops.length} stops
								</p>
							</div>
						</button>
					{/each}

					{#if filteredGradients.length === 0}
						<div class="text-center py-8 text-base-content/70">
							<Icon icon="material-symbols:gradient" class="w-12 h-12 mx-auto mb-2 opacity-50" />
							<p>No gradients found</p>
							<p class="text-xs">Create your first gradient or try a preset</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Gradient Editor -->
		<div class="flex-1 bg-base-50 overflow-y-auto">
			{#if appStore.activeGradient}
				<div class="p-6">
					<!-- Editor Header -->
					<div class="flex items-center justify-between mb-6">
						<div>
							<h3 class="text-xl font-bold text-base-content">
								{appStore.activeGradient.name}
							</h3>
							<p class="text-sm text-base-content/70">
								{appStore.activeGradient.type} gradient • {appStore.activeGradient.stops.length} stops
							</p>
						</div>

						<div class="flex gap-2">
							<!-- Gradient Type Selector -->
							<div class="join">
								{#each ["linear", "radial", "conic"] as type}
									<button
										class="btn btn-sm join-item"
										class:btn-primary={appStore.activeGradient.type === type}
										class:btn-outline={appStore.activeGradient.type !== type}
										onclick={() => {
											appStore.updateGradient(appStore.activeGradient!.id, {
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
								<button class="btn btn-outline btn-sm gap-2" type="button" tabindex="0">
									<Icon icon="material-symbols:download" class="w-4 h-4" />
									Export
								</button>
								<ul
									class="dropdown-content menu bg-base-100 rounded-box z-[1] w-48 p-2 shadow-xl border"
								>
									<li>
										<button onclick={() => exportGradient(appStore.activeGradient!, "css")}
											>Copy CSS</button
										>
									</li>
									<li>
										<button onclick={() => exportGradient(appStore.activeGradient!, "json")}
											>JSON File</button
										>
									</li>
									<li>
										<button onclick={() => exportGradient(appStore.activeGradient!, "png")}
											>PNG Image</button
										>
									</li>
									<li>
										<button onclick={() => exportGradient(appStore.activeGradient!, "svg")}
											>SVG File</button
										>
									</li>
								</ul>
							</div>
						</div>
					</div>

					<!-- Large Preview -->
					<div class="bg-white rounded-lg border border-base-300 shadow-inner p-4 mb-6">
						<div
							class="rounded-lg mx-auto transition-all duration-300"
							style:background={generateCSSGradient(appStore.activeGradient)}
							style:width="{previewSize.width}px"
							style:height="{previewSize.height}px"
						></div>
					</div>

					<!-- Gradient Controls -->
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
						<!-- Type-specific Controls -->
						<div class="space-y-4">
							<h4 class="font-semibold text-base-content">Gradient Settings</h4>

							{#if appStore.activeGradient.type === "linear"}
								<div>
									<label class="label" for="angle-input">
										<span class="label-text">Angle: {appStore.activeGradient.angle || 45}°</span>
									</label>
									<input
										type="range"
										min="0"
										max="360"
										value={appStore.activeGradient.angle || 45}
										class="range range-primary"
										onchange={(e) => {
											const angle = parseInt((e.target as HTMLInputElement).value);
											appStore.updateGradient(appStore.activeGradient!.id, { angle });
										}}
									/>
								</div>
							{/if}

							{#if appStore.activeGradient.type === "radial" || appStore.activeGradient.type === "conic"}
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label class="label" for="center-x-input">
											<span class="label-text"
												>Center X: {appStore.activeGradient.centerX || 50}%</span
											>
										</label>
										<input
											type="range"
											min="0"
											max="100"
											value={appStore.activeGradient.centerX || 50}
											class="range range-primary"
											onchange={(e) => {
												const centerX = parseInt((e.target as HTMLInputElement).value);
												appStore.updateGradient(appStore.activeGradient!.id, { centerX });
											}}
										/>
									</div>
									<div>
										<label class="label" for="center-y-input">
											<span class="label-text"
												>Center Y: {appStore.activeGradient.centerY || 50}%</span
											>
										</label>
										<input
											type="range"
											min="0"
											max="100"
											value={appStore.activeGradient.centerY || 50}
											class="range range-primary"
											onchange={(e) => {
												const centerY = parseInt((e.target as HTMLInputElement).value);
												appStore.updateGradient(appStore.activeGradient!.id, { centerY });
											}}
										/>
									</div>
								</div>
							{/if}
						</div>

						<!-- Preview Size Controls -->
						<div class="space-y-4">
							<h4 class="font-semibold text-base-content">Preview Size</h4>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<label class="label" for="width-input">
										<span class="label-text">Width: {previewSize.width}px</span>
									</label>
									<input
										type="range"
										min="200"
										max="600"
										bind:value={previewSize.width}
										class="range range-secondary"
									/>
								</div>
								<div>
									<label class="label" for="height-input">
										<span class="label-text">Height: {previewSize.height}px</span>
									</label>
									<input
										type="range"
										min="100"
										max="400"
										bind:value={previewSize.height}
										class="range range-secondary"
									/>
								</div>
							</div>
						</div>
					</div>

					<!-- Color Stops Editor -->
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h4 class="font-semibold text-base-content">Color Stops</h4>
							<div class="flex gap-2">
								<button
									class="btn btn-sm btn-outline gap-2"
									onclick={() => reverseGradient(appStore.activeGradient!)}
								>
									<Icon icon="material-symbols:swap-horiz" class="w-4 h-4" />
									Reverse
								</button>
								<button
									class="btn btn-sm btn-outline gap-2"
									onclick={() => smoothenGradient(appStore.activeGradient!)}
								>
									<Icon icon="material-symbols:auto-fix-high" class="w-4 h-4" />
									Smooth
								</button>
								<button
									class="btn btn-sm btn-primary gap-2"
									onclick={() => addColorStop(appStore.activeGradient!)}
								>
									<Icon icon="material-symbols:add" class="w-4 h-4" />
									Add Stop
								</button>
							</div>
						</div>

						<!-- Color Stops List -->
						<div class="space-y-2">
							{#each appStore.activeGradient.stops as stop, index (stop.color + stop.position)}
								<div
									class="flex items-center gap-4 p-3 bg-base-100 rounded-lg border border-base-300"
								>
									<!-- Color Preview -->
									<div
										role="button"
										tabindex="0"
										class="w-8 h-8 rounded border border-base-300 cursor-pointer"
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
										class="input input-sm input-bordered w-24 font-mono"
										onchange={(e) => {
											const color = (e.target as HTMLInputElement).value;
											updateColorStop(appStore.activeGradient!, index, { color });
										}}
									/>

									<!-- Position Slider -->
									<div class="flex-1">
										<label for="position-input" class="text-xs text-base-content/70"
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
												updateColorStop(appStore.activeGradient!, index, { position });
											}}
										/>
									</div>

									<!-- Remove Button -->
									<button
										class="btn btn-sm btn-circle btn-ghost text-error"
										onclick={() => removeColorStop(appStore.activeGradient!, index)}
										disabled={appStore.activeGradient.stops.length <= 2}
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
					<div class="text-center text-base-content/70">
						<Icon icon="material-symbols:gradient" class="w-24 h-24 mx-auto mb-4 opacity-30" />
						<h3 class="text-xl font-semibold mb-2">No Gradient Selected</h3>
						<p class="mb-4">Create or select a gradient to start editing</p>
						<button class="btn btn-primary gap-2" onclick={() => (showCreateDialog = true)}>
							<Icon icon="material-symbols:add" class="w-4 h-4" />
							Create Your First Gradient
						</button>
					</div>
				</div>
			{/if}
		</div>
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
								style:background={`linear-gradient(45deg, ${preset.colors.join(", ")})`}
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
