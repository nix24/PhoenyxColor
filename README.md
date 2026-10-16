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
  <a href="#-architecture">Architecture</a>
</p>

---

## ✨ What is PhoenyxColor?

**PhoenyxColor** is a next-generation color toolkit that rises from the ashes of traditional color pickers and palette generators. Built with **SvelteKit 5**, **WebGL2**, and modern **perceptual color science**, it offers a seamless experience for creating, managing, and exporting stunning color palettes and gradients.

Unlike conventional tools that operate in the outdated RGB or HSL color spaces, PhoenyxColor leverages the power of **OkLCH** and **Oklab**—perceptually uniform color spaces designed for how humans _actually see_ color. The result? Gradients that feel natural, palettes that harmonize effortlessly, and color manipulation that just makes sense.

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
- Non-destructive edits: crop/rotate/flip, tone, color, curves, effects, layers, drawing
- Export as PNG, JPEG or WebP, pixel-identical to the preview

### **High-Performance Processing**

- **WebGL2** render pipeline: one GPU path serves the preview and the export
- K-Means palette extraction in a Web Worker
- Local-first: images stored as Blobs in IndexedDB, no server

---

## 🔬 The Science

### Why OkLCH?

Traditional color spaces like **RGB** and **HSL** were designed for machines, not humans. A 50% change in "lightness" in HSL doesn't _feel_ like 50% to your eyes—because human color perception is non-linear.

**OkLCH** (part of the Oklab family) is a _perceptually uniform_ color space, meaning:

- **Equal numeric changes = equal perceived changes**
- Gradients look smooth and natural, without muddy middle tones
- Colors can be manipulated predictably without unexpected hue shifts

PhoenyxColor operates natively in OkLCH, converting to/from RGB only when necessary for display or export.

### Perceptual Sorting with Hilbert Curves

When extracting a palette from an image, the order of colors matters. PhoenyxColor uses a **Hilbert curve**—a space-filling fractal—to sort colors in 3D color space. This ensures visually similar colors are grouped together, creating natural progressions perfect for gradients.

### K-Means Clustering in Oklab

Rather than naive color quantization, PhoenyxColor uses **K-Means clustering** in the Oklab color space to find the most representative colors in an image. This produces palettes that _feel_ right, capturing the essence of your reference images.

### Delta E 2000

For color comparison and sorting, we use the **CIEDE2000 (ΔE00)** formula—the gold standard for measuring perceptual color difference. This powers our "smooth gradient" sorting algorithm, ensuring minimal perceptual jumps between adjacent colors.

---

## 🏗️ Architecture

PhoenyxColor uses a modular, reactive architecture built on **Svelte 5 runes**:

```
src/lib/
├── core/             # Shared, framework-light modules
│   ├── color/               # The only color-math module (culori)
│   ├── history/             # Undo/redo (preview/commit snapshots)
│   └── storage/             # IndexedDB v2: repositories, blobs, migrations
├── features/
│   └── references/   # Domain, library, edit session, WebGL2 engine, palette worker
├── stores/           # Legacy app-wide stores (palettes, gradients, settings, theme)
├── services/         # Persistence, keyboard shortcuts, legacy storage
└── components/       # UI components
```

### Core Principles

- **Non-blocking initialization** — Stores load asynchronously without blocking the UI
- **Undo/Redo everywhere** — One gesture is one undo step, via `core/history`
- **Type-safe IDs** — Branded types prevent mixing palette, gradient, and reference IDs
- **IndexedDB persistence** — Large data (images) stored efficiently; settings in LocalStorage

---

## 🛠️ Tech Stack

| Technology      | Purpose                                 |
| --------------- | --------------------------------------- |
| **SvelteKit 5** | Framework with runes-based reactivity   |
| **TypeScript**  | Type safety with branded types          |
| **WebGL2**      | GPU image processing (preview = export) |
| **Culori**      | Color space conversions (OkLCH, Oklab)  |
| **IndexedDB**   | Persistent storage for large data       |
| **Zod**         | Runtime validation schemas              |

---

## 🤝 Contributing

Contributions are welcome! Please read the [Architecture](#-architecture) section before diving in.

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
