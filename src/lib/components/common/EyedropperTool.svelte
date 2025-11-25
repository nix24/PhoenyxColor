<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import Icon from "@iconify/svelte";
	import { toast } from "svelte-sonner";
	import { onMount, onDestroy } from "svelte";

	let {
		onColorPicked = null,
		showButton = true,
		buttonClass = "btn btn-outline btn-sm",
		buttonLabel = "Eyedropper",
		autoAddToHistory = true,
		autoAddToPalette = false,
	} = $props<{
		onColorPicked?: ((color: string) => void) | null;
		showButton?: boolean;
		buttonClass?: string;
		buttonLabel?: string;
		autoAddToHistory?: boolean;
		autoAddToPalette?: boolean;
	}>();

	let isActive = $state(false);
	let cursorPosition = $state({ x: 0, y: 0 });
	let previewColor = $state<string | null>(null);
	let canvas: HTMLCanvasElement | null = $state(null);
	let ctx: CanvasRenderingContext2D | null = $state(null);
	let isSupported = $state(false);

	// Check if EyeDropper API is supported
	onMount(() => {
		isSupported = "EyeDropper" in window;
		if (!isSupported) {
			console.warn("EyeDropper API not supported in this browser");
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (isActive) {
			stopEyedropper();
		}
	});

	async function startEyedropper() {
		if (!isSupported) {
			toast.error("Eyedropper not supported in this browser");
			return;
		}

		try {
			isActive = true;
			app.toggleEyedropper();

			// Create EyeDropper instance
			const eyeDropper = new (window as any).EyeDropper();

			// Add visual feedback
			document.body.style.cursor = "crosshair";
			document.body.classList.add("eyedropper-active");

			// Start color picking
			const result = await eyeDropper.open();

			if (result?.sRGBHex) {
				const pickedColor = result.sRGBHex;

				// Store in global color buffer
				app.setGlobalColor(pickedColor);

				// Auto-add to active palette if enabled and palette exists
				if (autoAddToPalette && app.palettes.activePaletteId) {
					const activePalette = app.palettes.palettes.find(
						(p) => p.id === app.palettes.activePaletteId
					);
					if (activePalette && activePalette.colors.length < activePalette.maxSlots) {
						if (!activePalette.colors.includes(pickedColor)) {
							app.palettes.addColor(activePalette.id, pickedColor);
							toast.success(`Color ${pickedColor} added to "${activePalette.name}"`);
						} else {
							toast.info(`Color ${pickedColor} already exists in palette`);
						}
					} else if (activePalette && activePalette.colors.length >= activePalette.maxSlots) {
						toast.warning(`Palette "${activePalette.name}" is full`);
					}
				} else {
					toast.success(`Color picked: ${pickedColor}`);
				}

				// Call custom callback if provided
				if (onColorPicked) {
					onColorPicked(pickedColor);
				}
			}
		} catch (error: any) {
			if (error.name !== "AbortError") {
				console.error("Eyedropper error:", error);
				toast.error("Failed to pick color");
			}
		} finally {
			stopEyedropper();
		}
	}

	function stopEyedropper() {
		isActive = false;
		document.body.style.cursor = "";
		document.body.classList.remove("eyedropper-active");
		// Always ensure the app store state is synchronized
		if (app.isEyedropperActive) {
			app.toggleEyedropper();
		}
	}

	// Fallback eyedropper using canvas (for unsupported browsers)
	async function startFallbackEyedropper() {
		try {
			isActive = true;
			app.toggleEyedropper();

			// Request screen capture
			const stream = await navigator.mediaDevices.getDisplayMedia({
				video: true,
			});

			// Create video element to capture frame
			const video = document.createElement("video");
			video.srcObject = stream;
			video.play();

			video.addEventListener("loadedmetadata", () => {
				// Create canvas for frame capture
				if (!canvas) {
					canvas = document.createElement("canvas");
					ctx = canvas.getContext("2d");
				}

				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;

				// Draw video frame to canvas
				ctx?.drawImage(video, 0, 0);

				// Stop video stream
				for (const track of stream.getTracks()) {
					track.stop();
				}

				// Add click listener for color picking
				document.addEventListener("click", handleCanvasClick);
				document.addEventListener("mousemove", handleMouseMove);
				document.body.style.cursor = "crosshair";
				document.body.classList.add("eyedropper-active");

				toast.info("Click anywhere to pick a color");
			});
		} catch (error) {
			console.error("Fallback eyedropper error:", error);
			toast.error("Screen capture not available");
			stopEyedropper();
		}
	}

	function handleMouseMove(event: MouseEvent) {
		cursorPosition = { x: event.clientX, y: event.clientY };

		if (canvas && ctx) {
			// Get pixel color at cursor position
			const imageData = ctx.getImageData(event.clientX, event.clientY, 1, 1);
			const [r, g, b] = imageData.data;
			previewColor = `rgb(${r}, ${g}, ${b})`;
		}
	}

	function handleCanvasClick(event: MouseEvent) {
		if (canvas && ctx) {
			// Get pixel color at click position
			const imageData = ctx.getImageData(event.clientX, event.clientY, 1, 1);
			const [r, g, b] = imageData.data;
			const pickedColor = rgbToHex(r, g, b);

			// Store in global color buffer
			app.setGlobalColor(pickedColor);

			// Auto-add to active palette if enabled and palette exists
			if (autoAddToPalette && app.palettes.activePaletteId) {
				const activePalette = app.palettes.palettes.find(
					(p) => p.id === app.palettes.activePaletteId
				);
				if (activePalette && activePalette.colors.length < activePalette.maxSlots) {
					if (!activePalette.colors.includes(pickedColor)) {
						app.palettes.addColor(activePalette.id, pickedColor);
						toast.success(`Color ${pickedColor} added to "${activePalette.name}"`);
					} else {
						toast.info(`Color ${pickedColor} already exists in palette`);
					}
				} else if (activePalette && activePalette.colors.length >= activePalette.maxSlots) {
					toast.warning(`Palette "${activePalette.name}" is full`);
				}
			} else {
				toast.success(`Color picked: ${pickedColor}`);
			}

			// Call custom callback if provided
			if (onColorPicked) {
				onColorPicked(pickedColor);
			}
		}

		// Cleanup
		document.removeEventListener("click", handleCanvasClick);
		document.removeEventListener("mousemove", handleMouseMove);
		stopEyedropper();
	}

	function rgbToHex(r: number, g: number, b: number): string {
		return (
			"#" +
			[r, g, b]
				.map((x) => {
					const hex = x.toString(16);
					return hex.length === 1 ? `0${hex}` : hex;
				})
				.join("")
				.toUpperCase()
		);
	}

	function handleEyedropperClick() {
		if (isActive) {
			stopEyedropper();
		} else {
			if (isSupported) {
				startEyedropper();
			} else {
				startFallbackEyedropper();
			}
		}
	}

	// Keyboard shortcut support
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && isActive) {
			stopEyedropper();
		}
	}
</script>

{#if showButton}
	<button
		class={buttonClass}
		class:btn-active={isActive}
		onclick={handleEyedropperClick}
		disabled={!isSupported && !navigator.mediaDevices?.getDisplayMedia}
		title={isSupported ? "Pick color from screen" : "Eyedropper not supported"}
		aria-label={buttonLabel}
	>
		<Icon
			icon={isActive ? "material-symbols:close" : "material-symbols:colorize"}
			class="w-4 h-4"
		/>
		{buttonLabel}
	</button>
{/if}

<!-- Global color preview when active -->
{#if isActive && previewColor}
	<div
		class="fixed pointer-events-none z-50 bg-base-100 border border-base-300 rounded-lg p-2 shadow-lg"
		style:left="{cursorPosition.x + 10}px"
		style:top="{cursorPosition.y - 40}px"
	>
		<div class="flex items-center space-x-2">
			<div
				class="w-6 h-6 rounded border border-base-300"
				style:background-color={previewColor}
			></div>
			<span class="text-xs font-mono">{previewColor}</span>
		</div>
	</div>
{/if}

<!-- Global keyboard listener -->
<svelte:window onkeydown={handleKeydown} />

<style>
	/* Ensure the eyedropper cursor is visible globally when active */
	:global(body.eyedropper-active) {
		cursor: crosshair !important;
	}

	:global(body.eyedropper-active *) {
		cursor: crosshair !important;
	}
</style>
