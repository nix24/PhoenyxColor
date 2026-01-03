---
title: Getting Started
description: Quick start guide for using PhoenyxColor.
---

# Getting Started

PhoenyxColor is a professional-grade color toolkit for designers, artists, and developers. This guide will help you get up and running quickly.

## Installation

```bash
# Clone the repository
git clone https://github.com/youruser/phoenyxcolor.git
cd phoenyxcolor

# Install dependencies (using Bun for best performance)
bun install

# Start the development server
bun run dev
```

The application will be available at `http://localhost:5173`.

## Building the WASM Module

PhoenyxColor uses WebAssembly for high-performance image processing. The WASM module is written in Zig:

```bash
# Navigate to the wasm directory
cd wasm

# Build the WASM module (requires Zig installed)
zig build

# The output file will be placed in static/phoenyx-color.wasm
```

## Project Structure

```
phoenyxcolor/
├── src/                    # SvelteKit source
│   ├── lib/                # Shared library code
│   │   ├── components/     # UI components
│   │   ├── services/       # Business logic services
│   │   ├── stores/         # Svelte 5 runes state management
│   │   ├── utils/          # Pure utility functions
│   │   └── schemas/        # Validation schemas
│   └── routes/             # SvelteKit routes
├── wasm/                   # Zig WebAssembly source
├── static/                 # Static assets (including compiled WASM)
└── docs/                   # This documentation site
```

## Core Features

### 1. Color Palettes

Navigate to `/palettes` to:
- Create new palettes manually or with the smart generator
- Extract palettes from images using AI-powered K-Means clustering
- Edit colors with HSL sliders
- Export as JSON, CSS variables, or PNG

### 2. Gradients

Navigate to `/gradients` to:
- Design linear, radial, and conic gradients
- Generate gradients from existing palettes
- Export CSS with modern `oklch` interpolation

### 3. Reference Boards

Navigate to `/references` to:
- Upload and organize reference images
- Apply transformations (brightness, contrast, saturation, etc.)
- Apply creative filters (grayscale, sepia, invert)

## Using the Store

Import the global store singleton:

```svelte
<script>
  import { app } from "$lib/stores/root.svelte";
  
  // Access palettes
  $: palettes = app.palettes.palettes;
  
  // Add a new palette
  function createPalette() {
    app.palettes.add({
      name: "My Palette",
      colors: ["#ff0000", "#00ff00", "#0000ff"],
      maxSlots: 10
    });
  }
</script>
```

## Next Steps

- Read the [Architecture Guide](/guides/architecture/) for a deep dive into the codebase
- Explore the [API Reference](/reference/api/) for detailed documentation
- Check out the [WASM & Effects Guide](/guides/wasm-effects/) for image processing
