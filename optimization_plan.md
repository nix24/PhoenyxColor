# PhoenyxColor Optimization & Overhaul Plan

This document outlines the findings from a comprehensive code audit and proposes a plan to fix bugs, improve performance, and future-proof the application.

## 1. Critical Fixes
### 🚨 Navigation Error
**Issue**: `Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'pathname')` in `Navigation.svelte`.
**Cause**: Unsafe access to `$page.url.pathname` during initialization or state transitions where `$page` or `$page.url` might be undefined.
**Fix**: Use optional chaining and a fallback value in the derived store.
```typescript
// src/lib/components/Navigation.svelte
let currentPath = $derived($page?.url?.pathname ?? '/');
```

## 2. Architecture Overhaul
### 💾 Unified Storage Layer
**Current State**: Two competing storage services (`persistence.ts` and `simpleStorage.ts`) with overlapping functionality. `simpleStorage.ts` uses `localStorage` which has a 5MB limit, causing potential data loss for image-heavy apps.
**Plan**:
- **Merge**: Consolidate into a single `StorageService`.
- **Upgrade**: Use **IndexedDB** (via `idb` or `localforage`) for storing `references` (images) and `palettes`. Keep `localStorage` only for lightweight `settings`.
- **Benefit**: Removes "Quota Exceeded" errors and allows for much larger libraries.

### 📦 Store Modularization
**Current State**: `app.svelte.ts` is a "God Object" (~950 lines) managing all application state (references, palettes, gradients, settings, undo/redo).
**Plan**:
- **Split**: Refactor into domain-specific stores:
    - `referenceStore.svelte.ts`
    - `paletteStore.svelte.ts`
    - `gradientStore.svelte.ts`
    - `settingsStore.svelte.ts`
- **Compose**: Create a root store that composes these slices.
- **Benefit**: Improves maintainability, readability, and reduces the risk of merge conflicts.

## 3. Performance Optimization
### 🚀 Image Handling
**Current State**: Large base64 strings might be stored in state/storage, causing main-thread blocking and memory bloat.
**Plan**:
- **Offload**: Ensure `PerformanceService` is actively used to resize/compress images *before* they enter the store.
- **Async**: Move heavy image processing to a Web Worker (optional, but recommended for "massive" optimization).

### ⚡ Reactivity
**Current State**: `Navigation.svelte` and other components might be re-rendering unnecessarily.
**Plan**:
- **Runes**: Verify all components leverage Svelte 5's fine-grained reactivity (`$state`, `$derived`, `$effect`) correctly.
- **Memoization**: Ensure expensive calculations (like gradient generation) are properly memoized.

## 4. Code Quality & Safety
### 🛡️ Type Safety
**Current State**: Usage of `any` in storage validation logic (`persistence.ts`).
**Plan**:
- **Zod**: Use `zod` schemas (already in dependencies) for robust runtime validation of imported/loaded data.
- **Strict Types**: Replace `any` with proper interfaces.

### 🧹 Cleanup & Bloat Removal
**Current State**:
- Redundant storage files.
- `errorHandling.ts` (10KB) seems large; investigate if it's fully utilized or over-engineered.
**Plan**:
- Delete `simpleStorage.ts` after merging into `persistence.ts`.
- Audit `errorHandling.ts` and simplify if necessary.

## 5. Future-Proofing
- **Undo/Redo**: Abstract the undo/redo logic into a reusable `createHistory` primitive or class, rather than hardcoding it in the main store.
- **Theming**: Ensure `theme-change` and Tailwind 4 integration is seamless (Tailwind 4 handles dark mode differently than 3).

---

## Action Plan
1.  **Fix `Navigation.svelte`** immediately.
2.  **Refactor Storage**: Implement IndexedDB-based storage.
3.  **Split Stores**: Modularize `app.svelte.ts`.
4.  **Audit Components**: Review `AdvancedColorPicker` and `EyedropperTool` for optimization.

## 6. Proposed Software Architecture

To ensure robustness and scalability for this medium-large codebase, we will adopt a **Modular Domain-Driven Architecture** powered by Svelte 5 Runes.

### Core Principles
1.  **Separation of Concerns**: UI components should only handle display and user interaction. Business logic and state management belong in Stores. Side effects (API, Storage, Heavy Compute) belong in Services.
2.  **Single Source of Truth**: The `RootStore` will compose domain-specific stores, ensuring a unified state tree while keeping files small and manageable.
3.  **Service Abstraction**: Components never talk to `localStorage` or `IndexedDB` directly. They call methods on the `StorageService`, which handles the implementation details.

### Directory Structure
We will reorganize `src/lib` to reflect this architecture:

```text
src/lib/
├── components/
│   ├── ui/                 # Generic, reusable UI atoms (Buttons, Inputs, Modals)
│   ├── features/           # Complex, domain-specific organisms
│   │   ├── palettes/       # e.g., PaletteEditor.svelte, PaletteList.svelte
│   │   ├── references/     # e.g., ReferenceCanvas.svelte, ImageUploader.svelte
│   │   └── gradients/      # e.g., GradientGenerator.svelte
│   └── layout/             # Layout components (Navigation, Sidebar)
├── stores/
│   ├── root.svelte.ts      # The main entry point that composes all other stores
│   ├── references.svelte.ts
│   ├── palettes.svelte.ts
│   ├── gradients.svelte.ts
│   ├── settings.svelte.ts
│   └── history.svelte.ts   # Generic Undo/Redo logic implementation
├── services/
│   ├── storage/
│   │   ├── index.ts        # Unified Storage Interface
│   │   ├── adapter.idb.ts  # IndexedDB adapter for heavy data (Images, Palettes)
│   │   └── adapter.local.ts# LocalStorage adapter for lightweight settings
│   ├── image.ts            # Image processing, resizing, compression (Web Worker ready)
│   └── export.ts           # File export logic (JSON, PNG, SVG)
└── utils/                  # Pure utility functions (math, color conversion)
```

### State Management Strategy (Svelte 5 Runes)
Instead of one massive `app.svelte.ts`, we will have:

**1. Generic History Store (`history.svelte.ts`)**
A reusable class that handles undo/redo stacks for *any* state object, decoupling the history logic from the domain logic.

**2. Domain Stores (e.g., `palettes.svelte.ts`)**
Each store will:
- Manage its own slice of state using `$state`.
- Expose actions (add, remove, update).
- Integrate with the `HistoryStore` for undo/redo.
- Call `StorageService` for persistence.

**3. Root Store (`root.svelte.ts`)**
```typescript
class RootStore {
    palettes = new PaletteStore();
    references = new ReferenceStore();
    settings = new SettingsStore();
    // ...
}
const app = new RootStore();
export const getApp = () => app;
```

### Storage Strategy: The "Hybrid" Approach
- **Settings & Preferences**: Stored in `localStorage` (Sync, fast, small).
- **User Content (Images, Palettes)**: Stored in `IndexedDB` (Async, massive capacity, non-blocking).
- **Migration**: We will write a one-time migration script to move existing data from `localStorage` to `IndexedDB` on the first run.

### Next Steps for Implementation
1.  **Scaffold**: Create the new folder structure.
2.  **Base Classes**: Implement `StorageService` (with IDB) and `HistoryStore`.
3.  **Migrate**: Move `Settings` first (easiest), then `Palettes`, then `References` (hardest due to images).
4.  **Refactor**: Update components to use the new stores.

