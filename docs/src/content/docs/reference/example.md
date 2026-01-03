---
title: Type Definitions
description: Core type definitions used throughout PhoenyxColor.
---

# Type Definitions

This page outlines the core TypeScript types and interfaces used throughout PhoenyxColor.

## Branded Types

PhoenyxColor uses branded types for type-safe IDs, preventing accidental mixing of different ID types:

```typescript
// src/lib/types/brands.ts
declare const brand: unique symbol;

type Brand<T, TBrand> = T & { [brand]: TBrand };

export type PaletteId = Brand<string, "PaletteId">;
export type GradientId = Brand<string, "GradientId">;
export type ReferenceId = Brand<string, "ReferenceId">;
export type UndoActionId = Brand<string, "UndoActionId">;
```

## Color Palette

```typescript
interface ValidatedColorPalette {
    id: PaletteId;
    name: string;
    colors: string[];        // Array of CSS color strings
    maxSlots: number;        // Maximum allowed colors
    createdAt: Date;
}
```

## Gradient

```typescript
interface ValidatedGradient {
    id: GradientId;
    name: string;
    type: "linear" | "radial" | "conic";
    stops: ValidatedGradientStop[];
    angle: number;           // For linear gradients
    createdAt: Date;
}

interface ValidatedGradientStop {
    color: string;           // CSS color string
    position: number;        // 0-100
}
```

## Reference Image

```typescript
interface ValidatedReferenceImage {
    id: ReferenceId;
    name: string;
    src: string;             // Full image data URL
    thumbnailSrc: string;    // Thumbnail for gallery view
    width: number;
    height: number;
    
    // Transform state
    scale: number;
    rotation: number;
    flipX: boolean;
    flipY: boolean;
    
    // Adjustments
    opacity: number;
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    
    // Filters
    grayscale: number;
    sepia: number;
    invert: number;
    hueRotate: number;
    
    createdAt: Date;
}
```

## App Settings

```typescript
interface ValidatedAppSettings {
    theme: "light" | "dark" | "system";
    defaultPaletteSlots: number;
    alwaysOnTop: boolean;
    enableAnimations: boolean;
    globalEyedropperEnabled: boolean;
    referenceBoardSavePath: string | null;
    
    workspace: {
        showGrid: boolean;
        snapToGrid: boolean;
        gridSize: number;
        showRulers: boolean;
    };
    
    exportPreferences: {
        defaultFormat: "png" | "svg" | "json" | "css";
        defaultScale: number;
        includeBackground: boolean;
        defaultPngResolution: number;
        defaultSvgSize: { width: number; height: number };
        compressionLevel: number;
    };
    
    autoSave: boolean;
    autoSaveInterval: number;  // Minutes
}
```

## Undo/Redo Action

```typescript
interface HistoryAction<T> {
    label: string;
    undo: (state: T) => void;
    redo: (state: T) => void;
}
```

## Theme Palette

Used by the ThemeStore for procedural theming:

```typescript
interface ThemePalette {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
}
```

## Color Engine Types

```typescript
interface PaletteOptions {
    colorCount: number;
    quality: "fast" | "balanced" | "best";
}

interface ColorStop {
    color: string;       // CSS string
    position?: number;   // 0-100
}
```
