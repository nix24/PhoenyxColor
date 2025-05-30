<script lang="ts">
	import ColorPicker, { ChromeVariant } from "svelte-awesome-color-picker";
	import type { RgbaColor, HsvaColor } from "svelte-awesome-color-picker";

	let {
		hex = $bindable("#3B82F6"),
		rgb = $bindable(),
		hsv = $bindable(),
		label = "Choose a color",
		isDialog = true,
		isAlpha = true,
		alwaysOpen = false,
		nullable = false,
		onInput = null,
		onChange = null,
	} = $props<{
		hex?: string | null;
		rgb?: RgbaColor | null;
		hsv?: HsvaColor | null;
		label?: string;
		isDialog?: boolean; // If false, picker is always visible
		isAlpha?: boolean; // Enable/disable alpha slider
		alwaysOpen?: boolean; // Alias for !isDialog, for clarity
		nullable?: boolean; // If true, color can be undefined
		onInput?: (detail: {
			hex: string | null;
			rgb: RgbaColor | null;
			hsv: HsvaColor | null;
			color: any;
		}) => void; // Continuous input
		onChange?: (detail: {
			hex: string | null;
			rgb: RgbaColor | null;
			hsv: HsvaColor | null;
			color: any;
		}) => void; // On final change (e.g. dialog close)
	}>();

	// Initialize local color state for internal management with proper defaults
	let localHex = $state(hex || "#3B82F6");
	let localRgb = $state<RgbaColor>(rgb || { r: 59, g: 130, b: 246, a: 1 }); // Default blue in RGB
	let localHsv = $state<HsvaColor>(hsv || { h: 217, s: 91, v: 96, a: 1 }); // Default blue in HSV

	// Sync local state with props
	$effect(() => {
		if (hex !== undefined && hex !== localHex) {
			localHex = hex || "#3B82F6";
		}
	});

	$effect(() => {
		if (rgb !== undefined && rgb !== localRgb) {
			localRgb = rgb || { r: 59, g: 130, b: 246, a: 1 };
		}
	});

	$effect(() => {
		if (hsv !== undefined && hsv !== localHsv) {
			localHsv = hsv || { h: 217, s: 91, v: 96, a: 1 };
		}
	});

	function handleLibraryInput(detail: {
		hex: string | null;
		rgb: RgbaColor | null;
		hsv: HsvaColor | null;
		color: any;
	}) {
		// Update local state with defaults if null
		if (detail.hex) localHex = detail.hex;
		if (detail.rgb) localRgb = detail.rgb;
		if (detail.hsv) localHsv = detail.hsv;

		// Update bound props only if they were originally provided (not undefined)
		hex = detail.hex;
		if (rgb !== undefined) rgb = detail.rgb;
		if (hsv !== undefined) hsv = detail.hsv;

		// Use callback props instead of dispatching events
		if (onInput) {
			onInput(detail);
		}

		if (onChange) {
			onChange(detail);
		}
	}

	// TODO: Add color history and custom swatches if required by design
</script>

<div class="phoenyx-advanced-color-picker">
	<ColorPicker
		bind:hex={localHex}
		bind:rgb={localRgb}
		bind:hsv={localHsv}
		{label}
		isDialog={alwaysOpen ? false : isDialog}
		{isAlpha}
		{nullable}
		onInput={handleLibraryInput}
		components={ChromeVariant}
		sliderDirection="horizontal"
		position="responsive"
	/>
</div>

<style>
	.phoenyx-advanced-color-picker :global(.sacp-dialog-wrapper) {
		z-index: 100; /* Ensure it appears above other elements like modals */
	}
	/* Add any additional global or local styling needed */
</style>
