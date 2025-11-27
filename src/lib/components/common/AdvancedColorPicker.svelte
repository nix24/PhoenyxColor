<script lang="ts">
import Icon from "@iconify/svelte";

let {
	hex = $bindable("#3B82F6"),
	label = "Choose a color",
	alwaysOpen = false,
	onInput = null,
	onChange = null,
} = $props<{
	hex?: string | null;
	label?: string;
	alwaysOpen?: boolean;
	onInput?: (detail: { hex: string | null }) => void;
	onChange?: (detail: { hex: string | null }) => void;
}>();

// Local color state
let localHex = $state(hex || "#3B82F6");
let colorInput: HTMLInputElement;

// Color format state
let colorFormat: "hex" | "rgb" | "hsl" = $state("hex");
let showPresets = $state(true);

// HSL state for custom controls
let hue = $state(0);
let saturation = $state(50);
let lightness = $state(50);

// Preset colors
const presetColors = [
	"#FF0000",
	"#FF8000",
	"#FFFF00",
	"#80FF00",
	"#00FF00",
	"#00FF80",
	"#00FFFF",
	"#0080FF",
	"#0000FF",
	"#8000FF",
	"#FF00FF",
	"#FF0080",
	"#FFFFFF",
	"#E0E0E0",
	"#C0C0C0",
	"#A0A0A0",
	"#808080",
	"#606060",
	"#404040",
	"#202020",
	"#000000",
	"#8B4513",
	"#A0522D",
	"#CD853F",
];

// Sync local state with prop
$effect(() => {
	if (hex !== undefined && hex !== localHex) {
		localHex = hex || "#3B82F6";
		updateHSLFromHex(localHex);
	}
});

function hexToHsl(hex: string): { h: number; s: number; l: number } {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;

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

function hslToHex(h: number, s: number, l: number): string {
	h /= 360;
	s /= 100;
	l /= 100;

	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => {
		const k = (n + h / (1 / 12)) % 12;
		const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
		return Math.round(255 * color);
	};

	const r = f(0);
	const g = f(8);
	const b = f(4);

	return `#${[r, g, b]
		.map((x) => x.toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase()}`;
}

function updateHSLFromHex(hexColor: string) {
	const hsl = hexToHsl(hexColor);
	hue = hsl.h;
	saturation = hsl.s;
	lightness = hsl.l;
}

function updateHexFromHSL() {
	const newHex = hslToHex(hue, saturation, lightness);
	updateColor(newHex);
}

function updateColor(newHex: string) {
	localHex = newHex;
	hex = newHex;

	if (onInput) {
		onInput({ hex: newHex });
	}
	if (onChange) {
		onChange({ hex: newHex });
	}
}

function handleColorInput(event: Event) {
	const target = event.target as HTMLInputElement;
	updateColor(target.value.toUpperCase());
	updateHSLFromHex(target.value);
}

function handlePresetClick(color: string) {
	updateColor(color);
	updateHSLFromHex(color);
}

function handleHueChange(event: Event) {
	const target = event.target as HTMLInputElement;
	hue = parseInt(target.value, 10);
	updateHexFromHSL();
}

function handleSaturationChange(event: Event) {
	const target = event.target as HTMLInputElement;
	saturation = parseInt(target.value, 10);
	updateHexFromHSL();
}

function handleLightnessChange(event: Event) {
	const target = event.target as HTMLInputElement;
	lightness = parseInt(target.value, 10);
	updateHexFromHSL();
}

// Initialize HSL from hex
$effect(() => {
	updateHSLFromHex(localHex);
});
</script>

<div class="phoenyx-color-picker bg-base-100 rounded-lg border border-base-300 p-4 space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h4 class="font-medium text-base-content">{label}</h4>
		<div class="flex items-center space-x-2">
			<!-- Format Toggle -->
			<div class="join">
				<button
					class="btn btn-xs join-item {colorFormat === 'hex' ? 'btn-active' : 'btn-outline'}"
					onclick={() => (colorFormat = "hex")}
				>
					HEX
				</button>
				<button
					class="btn btn-xs join-item {colorFormat === 'rgb' ? 'btn-active' : 'btn-outline'}"
					onclick={() => (colorFormat = "rgb")}
				>
					RGB
				</button>
				<button
					class="btn btn-xs join-item {colorFormat === 'hsl' ? 'btn-active' : 'btn-outline'}"
					onclick={() => (colorFormat = "hsl")}
				>
					HSL
				</button>
			</div>
		</div>
	</div>

	<!-- Color Preview -->
	<div class="flex items-center space-x-3">
		<div class="relative">
			<div
				class="w-16 h-16 rounded-lg border-2 border-base-300 shadow-sm"
				style:background-color={localHex}
			></div>
			<input
				bind:this={colorInput}
				type="color"
				value={localHex}
				oninput={handleColorInput}
				class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
				title="Click to open color picker"
			/>
		</div>
		<div class="flex-1">
			<div class="text-lg font-mono text-base-content">{localHex}</div>
			<button class="btn btn-xs btn-outline" onclick={() => colorInput?.click()}>
				<Icon icon="material-symbols:colorize" class="w-3 h-3" />
				Pick Color
			</button>
		</div>
	</div>

	<!-- HSL Controls -->
	<div class="space-y-3">
		<div>
			<div class="flex items-center justify-between mb-2">
				<label for="hue-range" class="text-sm font-medium text-base-content">Hue</label>
				<span class="text-sm text-base-content/70">{hue}°</span>
			</div>
			<input
				id="hue-range"
				type="range"
				min="0"
				max="360"
				value={hue}
				oninput={handleHueChange}
				class="range range-primary w-full"
				style="background: linear-gradient(to right, 
					hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), 
					hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), 
					hsl(360, 100%, 50%))"
			/>
		</div>

		<div>
			<div class="flex items-center justify-between mb-2">
				<label for="saturation-range" class="text-sm font-medium text-base-content"
					>Saturation</label
				>
				<span class="text-sm text-base-content/70">{saturation}%</span>
			</div>
			<input
				id="saturation-range"
				type="range"
				min="0"
				max="100"
				value={saturation}
				oninput={handleSaturationChange}
				class="range range-secondary w-full"
				style="background: linear-gradient(to right, 
					hsl({hue}, 0%, {lightness}%), 
					hsl({hue}, 100%, {lightness}%))"
			/>
		</div>

		<div>
			<div class="flex items-center justify-between mb-2">
				<label for="lightness-range" class="text-sm font-medium text-base-content">Lightness</label>
				<span class="text-sm text-base-content/70">{lightness}%</span>
			</div>
			<input
				id="lightness-range"
				type="range"
				min="0"
				max="100"
				value={lightness}
				oninput={handleLightnessChange}
				class="range range-accent w-full"
				style="background: linear-gradient(to right, 
					hsl({hue}, {saturation}%, 0%), 
					hsl({hue}, {saturation}%, 50%), 
					hsl({hue}, {saturation}%, 100%))"
			/>
		</div>
	</div>

	<!-- Preset Colors -->
	{#if showPresets}
		<div>
			<div class="flex items-center justify-between mb-3">
				<h5 class="text-sm font-medium text-base-content">Preset Colors</h5>
				<button class="btn btn-xs btn-ghost" onclick={() => (showPresets = !showPresets)}>
					<Icon icon="material-symbols:keyboard-arrow-up" class="w-3 h-3" />
				</button>
			</div>
			<div class="grid grid-cols-6 gap-2">
				{#each presetColors as color}
					<button
						class="aspect-square rounded border border-base-300 hover:scale-110 transition-transform cursor-pointer"
						style:background-color={color}
						onclick={() => handlePresetClick(color)}
						title={color}
						aria-label="Select color {color}"
					></button>
				{/each}
			</div>
		</div>
	{:else}
		<button class="btn btn-xs btn-ghost w-full" onclick={() => (showPresets = !showPresets)}>
			<Icon icon="material-symbols:keyboard-arrow-down" class="w-3 h-3" />
			Show Preset Colors
		</button>
	{/if}

	<!-- Manual Input -->
	<div class="border-t border-base-300 pt-4">
		<label for="manual-input" class="text-sm font-medium text-base-content mb-2 block">
			Manual Input ({colorFormat.toUpperCase()})
		</label>
		<div class="join w-full">
			<input
				type="text"
				value={localHex}
				onchange={(e) => {
					const value = (e.target as HTMLInputElement).value.trim();
					if (/^#[0-9A-F]{6}$/i.test(value)) {
						updateColor(value.toUpperCase());
						updateHSLFromHex(value);
					}
				}}
				class="input input-bordered input-sm join-item flex-1"
				placeholder="#FFFFFF"
			/>
			<button
				class="btn btn-sm btn-outline join-item"
				onclick={() => {
					navigator.clipboard?.writeText(localHex);
				}}
				title="Copy to clipboard"
			>
				<Icon icon="material-symbols:content-copy" class="w-3 h-3" />
			</button>
		</div>
	</div>
</div>

<style>
	.phoenyx-color-picker {
		/* Custom range slider styling for theme integration */
		--range-shdw: transparent;
	}

	.range {
		height: 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid hsl(var(--b3));
	}

	.range::-webkit-slider-thumb {
		height: 1.2rem;
		width: 1.2rem;
		border-radius: 50%;
		border: 2px solid hsl(var(--b1));
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		cursor: pointer;
	}

	.range::-moz-range-thumb {
		height: 1.2rem;
		width: 1.2rem;
		border-radius: 50%;
		border: 2px solid hsl(var(--b1));
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		cursor: pointer;
	}
</style>
