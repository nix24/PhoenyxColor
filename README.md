<p align="center">
  <img src="static/phoenyx-logo.svg" alt="PhoenyxColor Logo" width="120" />
</p>

<h1 align="center">🔥 PhoenyxColor</h1>

<p align="center">
  <strong>A professional-grade color toolkit for designers, artists, and developers.</strong>
</p>

<p align="center">
  <em>Where perceptual color science meets creative expression.</em>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-the-science">The Science</a> •
  <a href="#-documentation">Docs</a> •
  <a href="#-architecture">Architecture</a>
</p>

---

## ✨ What is PhoenyxColor?

**PhoenyxColor** is a next-generation color toolkit that rises from the ashes of traditional color pickers and palette generators. Built with **SvelteKit 5**, **WebAssembly**, and modern **perceptual color science**, it offers a seamless experience for creating, managing, and exporting stunning color palettes and gradients.

Unlike conventional tools that operate in the outdated RGB or HSL color spaces, PhoenyxColor leverages the power of **OkLCH** and **Oklab**—perceptually uniform color spaces designed for how humans *actually see* color. The result? Gradients that feel natural, palettes that harmonize effortlessly, and color manipulation that just makes sense.

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/nix24/PhoenyxColor.git
cd PhoenyxColor

# Install dependencies (Bun recommended for speed)
bun install

# Start the development server
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) and start creating.

### Building for Production

```bash
bun run build
bun run preview
```

### Building the WASM Module

PhoenyxColor uses a custom **Zig**-based WebAssembly module for high-performance image processing:

```bash
cd wasm
zig build
# Output: static/phoenyx-color.wasm
```

---

## 🎨 Features

### **Color Palettes**
- Create palettes manually or with AI-powered smart generation
- Extract palettes from images using **K-Means clustering** in Oklab color space
- Organize with tags, rename, and manage multiple palettes
- Export as **JSON**, **CSS variables**, or **PNG swatches**

### **Gradient Designer**
- Design **linear**, **radial**, and **conic** gradients with precision
- Generate gradients from existing palettes with automatic color sorting
- Modern **Oklch interpolation** for perceptually smooth transitions
- Export production-ready CSS with a single click

### **Reference Boards**
- Drag-and-drop image uploads with automatic thumbnailing
- Advanced transformations: brightness, contrast, saturation, blur
- Creative filters: grayscale, sepia, invert, hue rotation
- WASM-powered effects: posterize, solarize, duotone, pixelate, VHS, glitch

### **High-Performance Processing**
- **WebAssembly (Zig)** for blazing-fast image manipulation
- K-Means clustering, temperature/tint adjustments, and creative effects
- Non-blocking architecture with IndexedDB persistence

---

## 🔬 The Science

### Why OkLCH?

Traditional color spaces like **RGB** and **HSL** were designed for machines, not humans. A 50% change in "lightness" in HSL doesn't *feel* like 50% to your eyes—because human color perception is non-linear.

**OkLCH** (part of the Oklab family) is a *perceptually uniform* color space, meaning:

- **Equal numeric changes = equal perceived changes**
- Gradients look smooth and natural, without muddy middle tones
- Colors can be manipulated predictably without unexpected hue shifts

PhoenyxColor operates natively in OkLCH, converting to/from RGB only when necessary for display or export.

### Perceptual Sorting with Hilbert Curves

When extracting a palette from an image, the order of colors matters. PhoenyxColor uses a **Hilbert curve**—a space-filling fractal—to sort colors in 3D color space. This ensures visually similar colors are grouped together, creating natural progressions perfect for gradients.

### K-Means Clustering in Oklab

Rather than naive color quantization, PhoenyxColor uses **K-Means clustering** in the Oklab color space to find the most representative colors in an image. This produces palettes that *feel* right, capturing the essence of your reference images.

### Delta E 2000

For color comparison and sorting, we use the **CIEDE2000 (ΔE00)** formula—the gold standard for measuring perceptual color difference. This powers our "smooth gradient" sorting algorithm, ensuring minimal perceptual jumps between adjacent colors.

---

## 📖 Documentation

Full documentation is available in the `/docs` directory, built with [Starlight](https://starlight.astro.build/):

```bash
cd docs
bun install
bun run dev
```

### Key Guides

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/src/content/docs/guides/example.md) | Quick setup and first steps |
| [Architecture](docs/src/content/docs/guides/architecture.mdx) | Deep dive into the codebase structure |
| [WASM & Effects](docs/src/content/docs/guides/wasm-effects.md) | Using WebAssembly image processing |
| [API Reference](docs/src/content/docs/reference/api/README.md) | Auto-generated TypeDoc documentation |

---

## 🏗️ Architecture

PhoenyxColor uses a modular, reactive architecture built on **Svelte 5 runes**:

```
src/lib/
├── stores/           # Reactive state management
│   ├── root.svelte.ts       # Central store singleton
│   ├── palettes.svelte.ts   # Color palette CRUD
│   ├── gradients.svelte.ts  # Gradient management
│   ├── references.svelte.ts # Reference images
│   ├── settings.svelte.ts   # User preferences
│   └── theme.svelte.ts      # Dynamic theming
├── services/         # Business logic
│   ├── wasm.ts              # WebAssembly interface
│   ├── color-engine.ts      # Theme extraction
│   └── storage/             # IndexedDB persistence
├── utils/            # Pure functions
│   ├── color-engine.ts      # Palette extraction & sorting
│   └── effects-processing.ts # Canvas effects
└── components/       # UI components
```

### Core Principles

- **Non-blocking initialization** — Stores load asynchronously without blocking the UI
- **Undo/Redo everywhere** — Every action is reversible via the HistoryStore
- **Type-safe IDs** — Branded types prevent mixing palette, gradient, and reference IDs
- **IndexedDB persistence** — Large data (images) stored efficiently; settings in LocalStorage

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **SvelteKit 5** | Framework with runes-based reactivity |
| **TypeScript** | Type safety with branded types |
| **Zig → WASM** | High-performance image processing |
| **Culori** | Color space conversions (OkLCH, Oklab) |
| **IndexedDB** | Persistent storage for large data |
| **Starlight** | Documentation site generator |
| **Zod** | Runtime validation schemas |

---

## 🤝 Contributing

Contributions are welcome! Please read the architecture guide before diving in.

```bash
# Run tests
bun test

# Type check
bun run check

# Lint
bun run lint
```

---

## 📜 License

MIT © [nix24](https://github.com/nix24)

---

<p align="center">
  <strong>🔥 Rise from the ashes. Create with color. 🔥</strong>
</p>
