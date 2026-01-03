---
title: WASM & Effects Processing
description: Guide to using WebAssembly-powered image processing and canvas effects.
---

# WASM & Effects Processing

PhoenyxColor leverages WebAssembly (Zig) for high-performance image processing operations that would be too slow in pure JavaScript.

## WASM Service

The WASM module is loaded lazily and provides color manipulation operations on raw pixel data.

### Initialization

```typescript
import { wasm } from "$lib/services/wasm";

// Initialize once (typically in your app's entry point)
await wasm.init();
```

### Image Adjustments

All adjustment functions work on `Uint8ClampedArray` pixel data (the format from `canvas.getImageData()`):

```typescript
// Temperature adjustment (-100 to 100)
wasm.applyTemperature(data, width, height, temperature);

// Tint adjustment (-100 to 100)
wasm.applyTint(data, width, height, tint);

// Shadows and highlights (-100 to 100 each)
wasm.applyShadowsHighlights(data, width, height, shadows, highlights);

// Vibrance adjustment (-100 to 100)
wasm.applyVibrance(data, width, height, vibrance);
```

### Effects

```typescript
// Posterize - reduces color levels (intensity: 0-100)
wasm.applyPosterize(data, width, height, intensity);

// Solarize - partial inversion (intensity: 0-100)
wasm.applySolarize(data, width, height, intensity);

// Duotone - map grayscale to two colors
wasm.applyDuotone(data, width, height, intensity, 
    { r: 0, g: 0, b: 0 },       // dark color
    { r: 255, g: 255, b: 255 }  // light color
);

// Pixelate (intensity controls block size)
wasm.applyPixelate(data, width, height, intensity);
```

### K-Means Clustering

Extract dominant colors from an image for palette generation:

```typescript
// Returns array of Lab color centroids
const centroids = wasm.runKMeans(pixelData, numColors, iterations);

// Each centroid: { l: number, a: number, b: number }
```

## Canvas Effects Processing

For more complex effects that require multi-pass or structural operations, we use pure TypeScript canvas manipulation:

```typescript
import { applyEffect, type EffectType } from "$lib/utils/effects-processing";

// Apply an effect to a canvas context
applyEffect(ctx, width, height, effectType, intensity, duotoneColors);
```

### Available Effects

| Effect | Description |
|--------|-------------|
| `posterize` | Reduces color palette to limited levels |
| `pixelate` | Block averaging for retro pixel look |
| `solarize` | Partial color inversion above threshold |
| `duotone` | Maps grayscale to two specified colors |
| `emboss` | Creates embossed/raised appearance |
| `sharpen` | Increases edge contrast |
| `halftone` | Converts to dot pattern |
| `vhs` | Retro VHS effect with scan lines and noise |
| `glitch` | RGB channel offset and slice displacement |

### Usage Example

```svelte
<script>
  import { applyEffect } from "$lib/utils/effects-processing";
  import { wasm } from "$lib/services/wasm";
  
  let canvas: HTMLCanvasElement;
  
  async function processImage(imageSrc: string) {
    await wasm.init();
    
    const img = new Image();
    img.src = imageSrc;
    await new Promise(resolve => img.onload = resolve);
    
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    
    // Apply WASM-based adjustment
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    wasm.applyTemperature(imageData.data, img.width, img.height, 20);
    ctx.putImageData(imageData, 0, 0);
    
    // Apply canvas-based effect
    applyEffect(ctx, img.width, img.height, "halftone", 50);
  }
</script>

<canvas bind:this={canvas} />
<button onclick={() => processImage("/my-image.jpg")}>Process</button>
```

## Palette Extraction

For extracting color palettes from images, use the utilities that wrap WASM K-Means:

```typescript
import { extractPalette, sortPalette, generateGradient } from "$lib/utils/color-engine";

// Extract 5 colors with balanced quality
const colors = await extractPalette(imageSrc, { 
    colorCount: 5, 
    quality: "balanced"  // "fast" | "balanced" | "best"
});

// Sort for visually smooth gradient
const sorted = sortPalette(colors);

// Generate CSS gradient with oklch interpolation
const css = generateGradient(sorted, "to right");
// Output: "linear-gradient(to right in oklch, #color1, #color2, ...)"
```

### Quality Settings

| Quality | Downsample Size | K-Means Iterations |
|---------|-----------------|-------------------|
| `fast` | 64px | 5 |
| `balanced` | 128px | 10 |
| `best` | 256px | 20 |

## Theme Extraction

For extracting full theme palettes (primary, secondary, background, text, accent):

```typescript
import { ColorEngine } from "$lib/services/color-engine";

const theme = await ColorEngine.extractTheme(imageSrc);
// {
//   primary: "oklch(65% 0.22 30)",
//   secondary: "oklch(55% 0.25 290)",
//   background: "oklch(15% 0.05 280)",
//   text: "oklch(95% 0.01 280)",
//   accent: "oklch(70% 0.15 40)"
// }
```

## Building the WASM Module

The WASM module is built from Zig source in the `/wasm` directory:

```bash
cd wasm
zig build
# Output: static/phoenyx-color.wasm
```

### Exported Functions

```zig
// Memory management
export fn alloc(len: usize) [*]u8
export fn dealloc(ptr: [*]u8, len: usize)

// Image adjustments
export fn applyTemperature(ptr: [*]u8, len: usize, temp: f32)
export fn applyTint(ptr: [*]u8, len: usize, tint: f32)
export fn applyShadowsHighlights(ptr: [*]u8, len: usize, shadows: f32, highlights: f32)
export fn applyVibrance(ptr: [*]u8, len: usize, vibrance: f32)

// Effects
export fn applyPosterize(ptr: [*]u8, len: usize, intensity: f32)
export fn applySolarize(ptr: [*]u8, len: usize, intensity: f32)
export fn applyDuotone(ptr: [*]u8, len: usize, intensity: f32, dr, dg, db, lr, lg, lb: u8)
export fn applyPixelate(ptr: [*]u8, width: u32, height: u32, intensity: f32)

// Clustering
export fn runKMeans(imgPtr: [*]u8, len: usize, k: u32, iterations: u32, seed: u32) [*]f32
```
