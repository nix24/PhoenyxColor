<script lang="ts">
	import { fly, fade } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import { app } from "$lib/stores/root.svelte";
	import type { ValidatedReferenceImage } from "$lib/schemas/validation";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";
	import { toast } from "svelte-sonner";
	import { onMount } from "svelte";

	// Import editor components
	import EditorPanel from "$lib/components/editor/EditorPanel.svelte";
	import EditorToolbar, { type EditorTool } from "$lib/components/editor/EditorToolbar.svelte";
	import {
		createEditorHistory,
		DEFAULT_EDITOR_STATE,
		type ImageEditorState,
	} from "$lib/components/editor/EditorHistory.svelte";

	// Import panels
	import AdjustPanel from "$lib/components/editor/panels/AdjustPanel.svelte";
	import TransformPanel from "$lib/components/editor/panels/TransformPanel.svelte";
	import CropPanel, {
		type CropRect,
		type AspectRatio,
	} from "$lib/components/editor/panels/CropPanel.svelte";
	import PalettePanel from "$lib/components/editor/panels/PalettePanel.svelte";
	import FiltersPanel from "$lib/components/editor/panels/FiltersPanel.svelte";
	import EffectsPanel, {
		type QuickEffect,
	} from "$lib/components/editor/panels/EffectsPanel.svelte";
	import ExportPanelEnhanced from "$lib/components/editor/panels/ExportPanelEnhanced.svelte";
	import CurvesPanel from "$lib/components/editor/panels/CurvesPanel.svelte";

	// Import utilities
	import { extractPalette } from "$lib/utils/color-engine";
	import chroma from "chroma-js";
	import tinycolor from "tinycolor2";

	let { imageId, onClose } = $props<{ imageId: string; onClose: () => void }>();

	// Editor state
	const history = createEditorHistory();
	let activeTool = $state<EditorTool>(null);
	let isComparing = $state(false);
	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let startPanX = 0;
	let startPanY = 0;

	// Crop state
	let isCropping = $state(false);
	let cropRect = $state<CropRect | null>(null);
	let aspectRatio = $state<AspectRatio>("free");
	let cropStartPos = $state<{ x: number; y: number } | null>(null);

	// Quick effects state
	let quickEffect = $state<QuickEffect>("none");
	let effectIntensity = $state(50);
	let duotoneColors = $state<[string, string]>(["#000000", "#ffffff"]);

	// Extracted palette
	let extractedPalette = $state<string[] | null>(null);

	// Image dimensions
	let imageWidth = $state(0);
	let imageHeight = $state(0);
	let canvasContainer: HTMLDivElement | null = $state(null);
	let imageElement: HTMLImageElement | null = $state(null);

	// UI state
	let showShortcuts = $state(false);

	// Get the image from the store
	let image = $derived(app.references.references.find((r) => r.id === imageId));

	// Initialize history with image properties
	$effect(() => {
		if (image) {
			history.initialize({
				brightness: image.brightness ?? 100,
				contrast: image.contrast ?? 100,
				saturation: image.saturation ?? 100,
				hueRotate: image.hueRotate ?? 0,
				blur: image.blur ?? 0,
				opacity: image.opacity ?? 1,
				sepia: image.sepia ?? 0,
				invert: image.invert ?? 0,
				isGrayscale: image.isGrayscale ?? false,
				scale: image.scale ?? 1,
				rotation: image.rotation ?? 0,
				flipX: image.flipX ?? false,
				flipY: image.flipY ?? false,
				gradientMapOpacity: image.gradientMapOpacity ?? 0,
				gradientMapBlendMode: image.gradientMapBlendMode ?? "normal",
			});
		}
	});

	// Sync state changes to the store
	function syncToStore() {
		if (!image) return;
		const state = history.currentState;
		app.references.update(imageId, {
			brightness: state.brightness,
			contrast: state.contrast,
			saturation: state.saturation,
			hueRotate: state.hueRotate,
			blur: state.blur,
			opacity: state.opacity,
			sepia: state.sepia,
			invert: state.invert,
			isGrayscale: state.isGrayscale,
			scale: state.scale,
			rotation: state.rotation,
			flipX: state.flipX,
			flipY: state.flipY,
			gradientMapOpacity: state.gradientMapOpacity,
			gradientMapBlendMode: state.gradientMapBlendMode,
		});
	}

	// Handle state updates from panels
	function handleStateUpdate(updates: Partial<ImageEditorState>) {
		history.pushState(updates);
		syncToStore();
	}

	// Handle preset application with intensity
	function handlePresetApply(preset: Partial<ImageEditorState>, intensity: number) {
		if (intensity === 100) {
			handleStateUpdate({ ...DEFAULT_EDITOR_STATE, ...preset });
		} else {
			// Blend preset with defaults based on intensity
			const blended: Partial<ImageEditorState> = {};
			for (const [key, value] of Object.entries(preset)) {
				const defaultVal = DEFAULT_EDITOR_STATE[key as keyof ImageEditorState];
				if (typeof value === "number" && typeof defaultVal === "number") {
					(blended as any)[key] = defaultVal + (value - defaultVal) * (intensity / 100);
				} else {
					(blended as any)[key] = value;
				}
			}
			handleStateUpdate({ ...DEFAULT_EDITOR_STATE, ...blended });
		}
	}

	// Undo/Redo handlers
	function handleUndo() {
		history.undo();
		syncToStore();
	}

	function handleRedo() {
		history.redo();
		syncToStore();
	}

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		// Skip if typing in an input
		if (
			(e.target as HTMLElement)?.tagName === "INPUT" ||
			(e.target as HTMLElement)?.tagName === "TEXTAREA"
		) {
			return;
		}

		// Modifier + key shortcuts
		if (e.ctrlKey || e.metaKey) {
			switch (e.key.toLowerCase()) {
				case "z":
					e.preventDefault();
					if (e.shiftKey) {
						handleRedo();
					} else {
						handleUndo();
					}
					break;
				case "y":
					e.preventDefault();
					handleRedo();
					break;
				case "s":
					e.preventDefault();
					activeTool = "export";
					break;
				case "0":
					e.preventDefault();
					fitToScreen();
					break;
				case "=":
				case "+":
					e.preventDefault();
					zoom = Math.min(5, zoom + 0.2);
					break;
				case "-":
					e.preventDefault();
					zoom = Math.max(0.1, zoom - 0.2);
					break;
			}
			return;
		}

		// Single key shortcuts
		switch (e.key.toLowerCase()) {
			case "escape":
				if (activeTool) {
					activeTool = null;
				} else {
					onClose();
				}
				break;
			case "a":
				activeTool = activeTool === "adjust" ? null : "adjust";
				break;
			case "f":
				activeTool = activeTool === "filters" ? null : "filters";
				break;
			case "c":
				activeTool = activeTool === "crop" ? null : "crop";
				isCropping = activeTool === "crop";
				break;
			case "p":
				activeTool = activeTool === "palette" ? null : "palette";
				break;
			case "e":
				activeTool = activeTool === "effects" ? null : "effects";
				break;
			case "x":
				activeTool = activeTool === "export" ? null : "export";
				break;
			case " ":
				e.preventDefault();
				isComparing = !isComparing;
				break;
			case "r":
				// Reset to fit
				fitToScreen();
				break;
			case "[":
				// Rotate left
				handleStateUpdate({ rotation: (history.currentState.rotation - 90 + 360) % 360 });
				break;
			case "]":
				// Rotate right
				handleStateUpdate({ rotation: (history.currentState.rotation + 90) % 360 });
				break;
			case "h":
				// Flip horizontal
				handleStateUpdate({ flipX: !history.currentState.flipX });
				break;
			case "v":
				// Flip vertical
				handleStateUpdate({ flipY: !history.currentState.flipY });
				break;
		}
	}

	// Canvas pan/zoom handlers
	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		if (e.ctrlKey || e.metaKey) {
			const delta = e.deltaY > 0 ? 0.9 : 1.1;
			zoom = Math.min(Math.max(0.1, zoom * delta), 5);
		} else {
			panX -= e.deltaX;
			panY -= e.deltaY;
		}
	}

	function handleMouseDown(e: MouseEvent) {
		if (isCropping && activeTool === "crop") {
			// Start crop selection
			const rect = canvasContainer?.getBoundingClientRect() ?? {
				left: 0,
				top: 0,
				width: 0,
				height: 0,
			};
			cropStartPos = {
				x: (e.clientX - rect.left - panX) / zoom,
				y: (e.clientY - rect.top - panY) / zoom,
			};
			return;
		}

		if (e.button === 1 || (e.button === 0 && !isCropping)) {
			isPanning = true;
			startPanX = e.clientX - panX;
			startPanY = e.clientY - panY;
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (cropStartPos && activeTool === "crop") {
			const rect = canvasContainer?.getBoundingClientRect() ?? {
				left: 0,
				top: 0,
				width: 0,
				height: 0,
			};
			const currentX = (e.clientX - rect.left - panX) / zoom;
			const currentY = (e.clientY - rect.top - panY) / zoom;

			let width = currentX - cropStartPos.x;
			let height = currentY - cropStartPos.y;

			// Apply aspect ratio constraint
			if (aspectRatio !== "free") {
				const parts = aspectRatio.split(":").map(Number);
				const w = parts[0] ?? 1;
				const h = parts[1] ?? 1;
				const ratio = w / h;
				if (Math.abs(width) / Math.abs(height) > ratio) {
					width = Math.sign(width) * Math.abs(height) * ratio;
				} else {
					height = (Math.sign(height) * Math.abs(width)) / ratio;
				}
			}

			cropRect = {
				x: width >= 0 ? cropStartPos.x : cropStartPos.x + width,
				y: height >= 0 ? cropStartPos.y : cropStartPos.y + height,
				width: Math.abs(width),
				height: Math.abs(height),
			};
			return;
		}

		if (!isPanning) return;
		panX = e.clientX - startPanX;
		panY = e.clientY - startPanY;
	}

	function handleMouseUp() {
		isPanning = false;
		cropStartPos = null;
	}

	// Touch handlers for mobile
	let touchStartDist = 0;
	let touchStartZoom = 1;

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length === 1) {
			// Single touch - pan
			const touch = e.touches[0];
			if (touch) {
				isPanning = true;
				startPanX = touch.clientX - panX;
				startPanY = touch.clientY - panY;
			}
		} else if (e.touches.length === 2) {
			// Pinch to zoom
			e.preventDefault();
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			if (t1 && t2) {
				touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
				touchStartZoom = zoom;
			}
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (e.touches.length === 1 && isPanning) {
			const touch = e.touches[0];
			if (touch) {
				panX = touch.clientX - startPanX;
				panY = touch.clientY - startPanY;
			}
		} else if (e.touches.length === 2) {
			e.preventDefault();
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			if (t1 && t2) {
				const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
				const scale = dist / touchStartDist;
				zoom = Math.min(5, Math.max(0.1, touchStartZoom * scale));
			}
		}
	}

	function handleTouchEnd() {
		isPanning = false;
	}

	function fitToScreen() {
		zoom = 1;
		panX = 0;
		panY = 0;
	}

	// Crop handlers
	function handleApplyCrop() {
		if (cropRect) {
			history.pushState({ cropRect });
			toast.success("Crop applied");
		}
		isCropping = false;
		cropRect = null;
		activeTool = null;
	}

	function handleCancelCrop() {
		isCropping = false;
		cropRect = null;
	}

	async function handleExtractFromRegion() {
		if (!cropRect || !image) return;

		try {
			// Create a canvas with just the cropped region
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			const img = new Image();
			img.crossOrigin = "anonymous";
			await new Promise((resolve) => {
				img.onload = resolve;
				img.src = image.src;
			});

			canvas.width = cropRect.width;
			canvas.height = cropRect.height;
			ctx.drawImage(
				img,
				cropRect.x,
				cropRect.y,
				cropRect.width,
				cropRect.height,
				0,
				0,
				cropRect.width,
				cropRect.height
			);

			const dataUrl = canvas.toDataURL();
			const colors = await extractPalette(dataUrl, { colorCount: 8, quality: "balanced" });
			extractedPalette = colors;

			toast.success("Extracted palette from selection!");
			activeTool = "palette";
		} catch (error) {
			console.error("Failed to extract from region:", error);
			toast.error("Failed to extract palette");
		}
	}

	// Tool selection handler
	function handleToolSelect(tool: EditorTool) {
		activeTool = tool;
		if (tool === "crop") {
			isCropping = true;
		} else {
			isCropping = false;
			cropRect = null;
		}
	}

	// Build CSS filter string - as a derived value for reactivity
	let filterString = $derived.by(() => {
		const state = history.currentState;
		if (isComparing) return "none";

		const filters: string[] = [];
		if (state.isGrayscale) filters.push("grayscale(100%)");
		if (state.sepia) filters.push(`sepia(${state.sepia}%)`);
		if (state.invert) filters.push(`invert(${state.invert}%)`);

		// Brightness with shadows/highlights approximation
		let brightnessAdj = state.brightness;
		if (state.shadows !== 0) {
			// Shadows affect dark tones - reduce brightness slightly for darker shadows
			brightnessAdj += state.shadows * 0.1;
		}
		if (state.highlights !== 0) {
			// Highlights affect light tones - slight brightness boost
			brightnessAdj += state.highlights * 0.15;
		}
		if (brightnessAdj !== 100) filters.push(`brightness(${brightnessAdj}%)`);

		// Contrast with clarity approximation
		let contrastAdj = state.contrast;
		if (state.clarity !== 0) {
			// Clarity is essentially local contrast - approximate with global contrast
			contrastAdj += state.clarity * 0.3;
		}
		if (contrastAdj !== 100) filters.push(`contrast(${contrastAdj}%)`);

		// Saturation with vibrance approximation
		let satAdj = state.saturation;
		if (state.vibrance !== 0) {
			// Vibrance is like saturation but protects already-saturated colors
			// Approximate by adding less saturation
			satAdj += state.vibrance * 0.5;
		}
		if (satAdj !== 100) filters.push(`saturate(${satAdj}%)`);

		// Hue rotation with temperature/tint
		let hueAdj = state.hueRotate;
		if (state.temperature !== 0) {
			// Warm = shift toward orange/yellow, Cool = shift toward blue
			hueAdj += state.temperature * -0.3;
		}
		if (state.tint !== 0) {
			// Tint shifts green/magenta axis
			hueAdj += state.tint * 0.2;
		}
		if (hueAdj !== 0) filters.push(`hue-rotate(${hueAdj}deg)`);

		// Temperature also affects sepia (warm) or saturate (cool)
		if (state.temperature > 0) {
			// Warm - add subtle sepia
			filters.push(`sepia(${state.temperature * 0.1}%)`);
		} else if (state.temperature < 0) {
			// Cool - slight desaturation could help but we already adjusted saturation
		}

		if (state.blur !== 0) filters.push(`blur(${state.blur}px)`);

		return filters.length > 0 ? filters.join(" ") : "none";
	});

	// Function version for use in getEditedImageData
	function buildFilterString(): string {
		return filterString;
	}

	// Get edited image as data URL (for palette extraction)
	async function getEditedImageData(): Promise<string> {
		if (!image) throw new Error("No image");

		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Could not get canvas context");

		const img = new Image();
		img.crossOrigin = "anonymous";
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
			img.src = image.src;
		});

		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;

		// Apply combined filters (including quick effects)
		const filterStr = combinedFilterString.replace("none", "");
		if (filterStr) {
			ctx.filter = filterStr;
		}

		// Apply transforms
		ctx.save();
		const state = history.currentState;
		ctx.translate(canvas.width / 2, canvas.height / 2);
		if (state.flipX) ctx.scale(-1, 1);
		if (state.flipY) ctx.scale(1, -1);
		ctx.rotate((state.rotation * Math.PI) / 180);
		ctx.translate(-canvas.width / 2, -canvas.height / 2);

		ctx.drawImage(img, 0, 0);
		ctx.restore();

		// Apply duotone overlay if active
		if (quickEffect === "duotone") {
			ctx.globalAlpha = effectIntensity / 100;
			ctx.globalCompositeOperation = "color";
			const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
			gradient.addColorStop(0, duotoneColors[1]);
			gradient.addColorStop(1, duotoneColors[0]);
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = "source-over";
		}

		return canvas.toDataURL("image/png");
	}

	// Build CSS transform string - as a derived value for reactivity
	let transformString = $derived.by(() => {
		const state = history.currentState;
		const transforms: string[] = [];
		if (state.scale !== 1) transforms.push(`scale(${state.scale})`);
		if (state.rotation !== 0) transforms.push(`rotate(${state.rotation}deg)`);
		if (state.flipX) transforms.push("scaleX(-1)");
		if (state.flipY) transforms.push("scaleY(-1)");
		return transforms.length > 0 ? transforms.join(" ") : "none";
	});

	// Function version for use in getEditedImageData
	function buildTransformString(): string {
		return transformString;
	}

	// Quick effect filter string
	let quickEffectFilter = $derived.by(() => {
		if (quickEffect === "none") return "";

		const intensity = effectIntensity / 100;

		switch (quickEffect) {
			case "posterize":
				// Posterize effect using contrast + saturation combo
				return `contrast(${100 + intensity * 100}%) saturate(${100 + intensity * 50}%)`;
			case "solarize":
				// Partial inversion for solarize effect
				return `invert(${intensity * 50}%)`;
			case "emboss":
				// Emboss approximation using drop shadow and desaturation
				return `contrast(${100 + intensity * 80}%) saturate(${100 - intensity * 60}%)`;
			case "sharpen":
				// Sharpen approximation with contrast
				return `contrast(${100 + intensity * 30}%)`;
			case "vhs":
				// VHS look: slight blur, saturation boost, contrast drop
				return `blur(${intensity * 0.5}px) saturate(${100 + intensity * 40}%) contrast(${100 - intensity * 15}%)`;
			case "glitch":
				// Glitch: just some color aberration effect via hue rotate + contrast
				return `hue-rotate(${intensity * 10}deg) contrast(${100 + intensity * 40}%)`;
			case "duotone":
				// Duotone handled separately via gradient map
				return "grayscale(100%)";
			case "halftone":
				// Halftone approximation: high contrast + slight blur
				return `contrast(${100 + intensity * 60}%)`;
			case "pixelate":
				// Pixelate can't really be done with CSS - show high contrast instead
				return `contrast(${100 + intensity * 50}%)`;
			default:
				return "";
		}
	});

	// Combined filter string including quick effects
	let combinedFilterString = $derived.by(() => {
		const base = filterString;
		const effect = quickEffectFilter;

		if (base === "none" && !effect) return "none";
		if (base === "none") return effect;
		if (!effect) return base;
		return `${base} ${effect}`;
	});

	// Gradient map helpers
	function getGradientTableValues(channel: "r" | "g" | "b"): string {
		let colors: string[] = [];

		if (app.gradients.activeGradient) {
			const sortedStops = [...app.gradients.activeGradient.stops].sort(
				(a, b) => a.position - b.position
			);
			const scale = chroma
				.scale(sortedStops.map((s) => s.color))
				.domain(sortedStops.map((s) => s.position / 100));
			colors = Array.from({ length: 256 }, (_, i) => scale(i / 255).hex());
		} else if (app.palettes.activePalette) {
			const scale = chroma.scale(app.palettes.activePalette.colors).mode("lch");
			colors = Array.from({ length: 256 }, (_, i) => scale(i / 255).hex());
		} else {
			return "0 1";
		}

		return colors
			.map((c) => {
				const rgb = tinycolor(c).toRgb();
				return rgb[channel] / 255;
			})
			.join(" ");
	}

	// Load image dimensions
	function handleImageLoad(e: Event) {
		const img = e.target as HTMLImageElement;
		imageWidth = img.naturalWidth;
		imageHeight = img.naturalHeight;
	}

	onMount(() => {
		window.addEventListener("keydown", handleKeydown);
		return () => window.removeEventListener("keydown", handleKeydown);
	});
</script>

{#if image}
	<div class="fixed inset-0 z-50 flex flex-col bg-void-deep" transition:fade={{ duration: 200 }}>
		<!-- Top Bar -->
		<div
			class="h-14 flex items-center justify-between px-4 bg-black/40 border-b border-white/10 z-20"
		>
			<!-- Left: Back + Title -->
			<div class="flex items-center gap-3">
				<button
					class="btn btn-sm btn-circle btn-ghost text-white/70 hover:text-white hover:bg-white/10"
					onclick={onClose}
				>
					<Icon icon="material-symbols:arrow-back" class="w-5 h-5" />
				</button>
				<div class="h-5 w-px bg-white/10"></div>
				<h2
					class="text-white font-semibold text-sm sm:text-base truncate max-w-[150px] sm:max-w-[250px]"
				>
					{image.name}
				</h2>
			</div>

			<!-- Center: Undo/Redo + Compare -->
			<div class="flex items-center gap-1">
				<button
					class="btn btn-sm btn-ghost text-white/60 hover:text-white disabled:opacity-30"
					onclick={handleUndo}
					disabled={!history.canUndo}
					title="Undo (Ctrl+Z)"
				>
					<Icon icon="material-symbols:undo" class="w-5 h-5" />
				</button>
				<button
					class="btn btn-sm btn-ghost text-white/60 hover:text-white disabled:opacity-30"
					onclick={handleRedo}
					disabled={!history.canRedo}
					title="Redo (Ctrl+Shift+Z)"
				>
					<Icon icon="material-symbols:redo" class="w-5 h-5" />
				</button>
				<div class="h-5 w-px bg-white/10 mx-1"></div>
				<button
					class={cn(
						"btn btn-sm btn-ghost",
						isComparing ? "text-phoenix-primary" : "text-white/60 hover:text-white"
					)}
					onmousedown={() => (isComparing = true)}
					onmouseup={() => (isComparing = false)}
					onmouseleave={() => (isComparing = false)}
					title="Hold to compare original"
				>
					<Icon icon="material-symbols:compare" class="w-5 h-5" />
				</button>
			</div>

			<!-- Right: Zoom Controls + Help -->
			<div class="flex items-center gap-1">
				<button
					class="btn btn-sm btn-ghost text-white/60 hover:text-white"
					onclick={fitToScreen}
					title="Fit to screen (R)"
				>
					<Icon icon="material-symbols:fit-screen" class="w-5 h-5" />
				</button>
				<button
					class="btn btn-sm btn-ghost text-white/60 hover:text-white"
					onclick={() => (zoom = Math.max(0.1, zoom - 0.2))}
					title="Zoom out (Ctrl+-)"
				>
					<Icon icon="material-symbols:remove" class="w-4 h-4" />
				</button>
				<span class="text-xs font-mono text-white/60 min-w-[45px] text-center">
					{Math.round(zoom * 100)}%
				</span>
				<button
					class="btn btn-sm btn-ghost text-white/60 hover:text-white"
					onclick={() => (zoom = Math.min(5, zoom + 0.2))}
					title="Zoom in (Ctrl++)"
				>
					<Icon icon="material-symbols:add" class="w-4 h-4" />
				</button>
				<div class="h-5 w-px bg-white/10 mx-1 hidden sm:block"></div>
				<button
					class="btn btn-sm btn-ghost text-white/60 hover:text-white hidden sm:flex"
					onclick={() => (showShortcuts = true)}
					title="Keyboard shortcuts"
				>
					<Icon icon="material-symbols:keyboard" class="w-5 h-5" />
				</button>
			</div>
		</div>

		<!-- Canvas Area -->
		<div
			bind:this={canvasContainer}
			class="flex-1 relative overflow-hidden flex items-center justify-center select-none touch-none"
			onwheel={handleWheel}
			onmousedown={handleMouseDown}
			onmousemove={handleMouseMove}
			onmouseup={handleMouseUp}
			onmouseleave={handleMouseUp}
			ontouchstart={handleTouchStart}
			ontouchmove={handleTouchMove}
			ontouchend={handleTouchEnd}
			style:cursor={isCropping ? "crosshair" : isPanning ? "grabbing" : "grab"}
			role="presentation"
		>
			<!-- Checkered Background -->
			<div class="absolute inset-0 bg-checkered opacity-30"></div>

			<!-- Canvas Content -->
			<div
				class="relative transition-transform duration-75 ease-out will-change-transform"
				style:transform="translate({panX}px, {panY}px) scale({zoom})"
			>
				<!-- Image -->
				<img
					bind:this={imageElement}
					src={image.src}
					alt={image.name}
					class="max-w-none shadow-2xl"
					style:filter={combinedFilterString}
					style:transform={transformString}
					style:opacity={history.currentState.opacity}
					onload={handleImageLoad}
					draggable="false"
				/>

				<!-- Gradient Map Overlay -->
				{#if history.currentState.gradientMapOpacity > 0 && (app.gradients.activeGradient || app.palettes.activePalette)}
					<div
						class="absolute inset-0 pointer-events-none"
						style:opacity={history.currentState.gradientMapOpacity}
						style:mix-blend-mode={history.currentState.gradientMapBlendMode}
						style:transform={transformString}
					>
						<img
							src={image.src}
							alt=""
							class="w-full h-full object-contain"
							style:filter="url(#gradient-map-{image.id}) {filterString.replace(
								/blur\([^)]+\)/,
								''
							)}"
						/>
					</div>
				{/if}

				<!-- Duotone Effect Overlay -->
				{#if quickEffect === "duotone"}
					<div
						class="absolute inset-0 pointer-events-none"
						style:opacity={effectIntensity / 100}
						style:mix-blend-mode="color"
						style:transform={transformString}
					>
						<div
							class="w-full h-full"
							style:background="linear-gradient(to bottom, {duotoneColors[1]}, {duotoneColors[0]})"
						></div>
					</div>
				{/if}

				<!-- Vignette Overlay -->
				{#if history.currentState.vignette > 0}
					<div
						class="absolute inset-0 pointer-events-none"
						style:background="radial-gradient(ellipse at center, transparent 0%, transparent 50%,
						rgba(0,0,0,{history.currentState.vignette / 100}) 100%)"
						style:transform={transformString}
					></div>
				{/if}

				<!-- Crop Overlay -->
				{#if isCropping && cropRect}
					<div class="absolute inset-0 pointer-events-none">
						<!-- Darkened area outside crop -->
						<div class="absolute inset-0 bg-black/60"></div>
						<!-- Crop selection -->
						<div
							class="absolute border-2 border-white shadow-lg"
							style:left="{cropRect.x}px"
							style:top="{cropRect.y}px"
							style:width="{cropRect.width}px"
							style:height="{cropRect.height}px"
						>
							<!-- Clear area inside -->
							<div class="absolute inset-0" style:box-shadow="0 0 0 9999px rgba(0,0,0,0.6)"></div>
							<!-- Rule of thirds grid -->
							<div class="absolute inset-0 grid grid-cols-3 grid-rows-3">
								{#each Array(9) as _, i}
									<div class="border border-white/30"></div>
								{/each}
							</div>
							<!-- Corner handles -->
							{#each ["top-left", "top-right", "bottom-left", "bottom-right"] as corner}
								<div
									class={cn(
										"absolute w-4 h-4 bg-white rounded-full border-2 border-phoenix-primary",
										corner.includes("top") && "top-0 -translate-y-1/2",
										corner.includes("bottom") && "bottom-0 translate-y-1/2",
										corner.includes("left") && "left-0 -translate-x-1/2",
										corner.includes("right") && "right-0 translate-x-1/2"
									)}
								></div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Rulers (if enabled) -->
			{#if app.settings.state.workspace.showRulers}
				<div class="absolute top-0 left-8 right-0 h-6 bg-black/60 border-b border-white/10 z-10">
					<span class="text-[10px] text-white/40 font-mono ml-2">0px</span>
				</div>
				<div class="absolute top-6 left-0 bottom-0 w-6 bg-black/60 border-r border-white/10 z-10">
					<span class="text-[10px] text-white/40 font-mono mt-2 ml-1 rotate-90 origin-top-left"
						>0px</span
					>
				</div>
			{/if}
		</div>

		<!-- Bottom Toolbar -->
		<EditorToolbar {activeTool} onToolSelect={handleToolSelect} />

		<!-- Panels -->
		<EditorPanel
			title="Adjust"
			icon="material-symbols:tune"
			isOpen={activeTool === "adjust"}
			onClose={() => (activeTool = null)}
		>
			<AdjustPanel editorState={history.currentState} onUpdate={handleStateUpdate} />
		</EditorPanel>

		<EditorPanel
			title="Filters"
			icon="material-symbols:filter-vintage"
			isOpen={activeTool === "filters"}
			onClose={() => (activeTool = null)}
			size="lg"
		>
			<div class="space-y-6">
				<!-- Filter Presets -->
				<FiltersPanel
					currentState={history.currentState}
					imageSrc={image.src}
					onApplyPreset={handlePresetApply}
				/>

				<!-- Curves Panel -->
				<div class="pt-4 border-t border-white/10">
					<h4
						class="text-xs font-bold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2"
					>
						<Icon icon="material-symbols:show-chart" class="w-4 h-4" />
						Curves
					</h4>
					<CurvesPanel
						imageSrc={image.src}
						curves={history.currentState.curves}
						onCurvesChange={(newCurves) => handleStateUpdate({ curves: newCurves })}
					/>
				</div>

				<!-- Transform -->
				<div class="pt-4 border-t border-white/10">
					<h4
						class="text-xs font-bold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2"
					>
						<Icon icon="material-symbols:transform" class="w-4 h-4" />
						Transform
					</h4>
					<TransformPanel editorState={history.currentState} onUpdate={handleStateUpdate} />
				</div>
			</div>
		</EditorPanel>

		<EditorPanel
			title="Crop"
			icon="material-symbols:crop"
			isOpen={activeTool === "crop"}
			onClose={() => {
				handleCancelCrop();
				activeTool = null;
			}}
		>
			<CropPanel
				{cropRect}
				{aspectRatio}
				onCropChange={(rect) => (cropRect = rect)}
				onAspectRatioChange={(ratio) => (aspectRatio = ratio)}
				onApplyCrop={handleApplyCrop}
				onCancelCrop={handleCancelCrop}
				onExtractFromRegion={handleExtractFromRegion}
				{imageWidth}
				{imageHeight}
			/>
		</EditorPanel>

		<EditorPanel
			title="Palette"
			icon="material-symbols:palette"
			isOpen={activeTool === "palette"}
			onClose={() => (activeTool = null)}
		>
			<PalettePanel
				imageSrc={image.src}
				{getEditedImageData}
				gradientMapOpacity={history.currentState.gradientMapOpacity}
				gradientMapBlendMode={history.currentState.gradientMapBlendMode}
				onGradientMapChange={(opacity, blendMode) =>
					handleStateUpdate({ gradientMapOpacity: opacity, gradientMapBlendMode: blendMode })}
			/>
		</EditorPanel>

		<EditorPanel
			title="Effects"
			icon="material-symbols:auto-fix-high"
			isOpen={activeTool === "effects"}
			onClose={() => (activeTool = null)}
		>
			<EffectsPanel
				activeEffect={quickEffect}
				{effectIntensity}
				{duotoneColors}
				onEffectChange={(effect) => (quickEffect = effect)}
				onIntensityChange={(intensity) => (effectIntensity = intensity)}
				onDuotoneColorsChange={(colors) => (duotoneColors = colors)}
			/>
		</EditorPanel>

		<EditorPanel
			title="Export"
			icon="material-symbols:download"
			isOpen={activeTool === "export"}
			onClose={() => (activeTool = null)}
		>
			<ExportPanelEnhanced
				imageSrc={image.src}
				imageName={image.name}
				editorState={history.currentState}
				{quickEffect}
				{effectIntensity}
				{duotoneColors}
				{extractedPalette}
			/>
		</EditorPanel>
	</div>

	<!-- SVG Filters -->
	<svg class="hidden" aria-hidden="true">
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
					<feFuncR type="table" tableValues={getGradientTableValues("r")} />
					<feFuncG type="table" tableValues={getGradientTableValues("g")} />
					<feFuncB type="table" tableValues={getGradientTableValues("b")} />
					<feFuncA type="identity" />
				</feComponentTransfer>
			</filter>
		</defs>
	</svg>

	<!-- Keyboard Shortcuts Dialog -->
	{#if showShortcuts}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm"
			onclick={() => (showShortcuts = false)}
			onkeydown={(e) => e.key === "Escape" && (showShortcuts = false)}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			transition:fade={{ duration: 150 }}
		>
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="bg-void-deep border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
				role="document"
			>
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-lg font-bold text-white flex items-center gap-2">
						<Icon icon="material-symbols:keyboard" class="w-5 h-5 text-phoenix-primary" />
						Keyboard Shortcuts
					</h3>
					<button
						class="btn btn-sm btn-circle btn-ghost text-white/60 hover:text-white"
						onclick={() => (showShortcuts = false)}
					>
						<Icon icon="material-symbols:close" class="w-5 h-5" />
					</button>
				</div>

				<div class="space-y-4 text-sm">
					<!-- Tools -->
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Tools</h4>
						<div class="grid grid-cols-2 gap-1">
							<div class="flex justify-between text-white/70">
								<span>Adjust</span><kbd class="kbd kbd-sm">A</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Filters</span><kbd class="kbd kbd-sm">F</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Crop</span><kbd class="kbd kbd-sm">C</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Palette</span><kbd class="kbd kbd-sm">P</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Effects</span><kbd class="kbd kbd-sm">E</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Export</span><kbd class="kbd kbd-sm">X</kbd>
							</div>
						</div>
					</div>

					<!-- Actions -->
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Actions</h4>
						<div class="grid grid-cols-2 gap-1">
							<div class="flex justify-between text-white/70">
								<span>Undo</span><kbd class="kbd kbd-sm">Ctrl+Z</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Redo</span><kbd class="kbd kbd-sm">Ctrl+Y</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Save</span><kbd class="kbd kbd-sm">Ctrl+S</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Compare</span><kbd class="kbd kbd-sm">Space</kbd>
							</div>
						</div>
					</div>

					<!-- View -->
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">View</h4>
						<div class="grid grid-cols-2 gap-1">
							<div class="flex justify-between text-white/70">
								<span>Zoom In</span><kbd class="kbd kbd-sm">Ctrl++</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Zoom Out</span><kbd class="kbd kbd-sm">Ctrl+-</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Fit</span><kbd class="kbd kbd-sm">R</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>100%</span><kbd class="kbd kbd-sm">Ctrl+0</kbd>
							</div>
						</div>
					</div>

					<!-- Transform -->
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Transform</h4>
						<div class="grid grid-cols-2 gap-1">
							<div class="flex justify-between text-white/70">
								<span>Rotate Left</span><kbd class="kbd kbd-sm">[</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Rotate Right</span><kbd class="kbd kbd-sm">]</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Flip H</span><kbd class="kbd kbd-sm">H</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Flip V</span><kbd class="kbd kbd-sm">V</kbd>
							</div>
						</div>
					</div>

					<!-- General -->
					<div>
						<h4 class="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">General</h4>
						<div class="grid grid-cols-2 gap-1">
							<div class="flex justify-between text-white/70">
								<span>Close Panel</span><kbd class="kbd kbd-sm">Esc</kbd>
							</div>
							<div class="flex justify-between text-white/70">
								<span>Exit Editor</span><kbd class="kbd kbd-sm">Esc</kbd>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
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
