<script lang="ts">
    import ColorPicker, { ChromeVariant } from "svelte-awesome-color-picker";
    import type { RgbaColor, HsvaColor } from "svelte-awesome-color-picker";
    import { createEventDispatcher } from "svelte";

    let {
        hex = $bindable("#3B82F6"),
        rgb = $bindable(undefined),
        hsv = $bindable(undefined),
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

    const dispatch = createEventDispatcher();

    function handleLibraryInput(detail: {
        hex: string | null;
        rgb: RgbaColor | null;
        hsv: HsvaColor | null;
        color: any;
    }) {
        hex = detail.hex;
        rgb = detail.rgb;
        hsv = detail.hsv;

        if (onInput) {
            onInput(detail);
        }
        dispatch("input", detail);

        // If this component is a dialog, and it closes, that's a good time to fire 'change'
        // However, svelte-awesome-color-picker manages its own dialog state internally if isDialog=true.
        // We might need to tap into its isOpen binding or find another way to detect close.
        // For a non-dialog picker, 'change' might be after a debounce.
        // For now, we will call our own onChange if provided, alongside input.
        // This makes the AdvancedColorPicker's onChange behave more like a continuous update for now.
        // True "final change" logic might need more specific triggers.
        if (onChange) {
            onChange(detail);
        }
        dispatch("change", detail); // Dispatch our own change event alongside input for now
    }

    // TODO: Add color history and custom swatches if required by design
</script>

<div class="phoenyx-advanced-color-picker">
    <ColorPicker
        bind:hex
        bind:rgb
        bind:hsv
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
