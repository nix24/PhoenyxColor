# PhoenyxColor Feature Overview

## 1. References Route

The **References** module provides a powerful workspace for managing and manipulating visual inspiration.

### Key Features

- **Image Management**: Support for drag-and-drop uploads with validation for size and type. Users can manage a collection of reference images in a responsive **Bento Grid** gallery.
- **Advanced Transformations**: Detailed control over image properties including:
  - **Geometry**: Scale, Rotation, Flip (X/Y).
  - **Adjustments**: Opacity, Brightness, Contrast, Saturation, Blur.
  - **Filters**: Grayscale, Sepia, Invert, Hue Rotation.
- **Organization**: Features to duplicate, delete, or clear all references.
- **View Modes**: Switch between a "Gallery" view for browsing and a "Transform" mode for focused editing.

## 2. Palettes Route

The **Palettes** module is a comprehensive studio for color creation, analysis, and management.

### Key Features

- **Multiple Views**:
  - **Editor**: For fine-tuning colors and palette structure.
  - **Gallery**: A visual overview of all created palettes.
  - **Analysis & Preview**: Tools to analyze color harmony and valid contrast (implied).
- **Creation Tools**:
  - **Manual Creation**: Custom slot counts and naming.
  - **Smart Generator**: Generate palettes based on specific moods (e.g., Calm, Energetic) or semantic themes.
  - **Extraction**: Extract color palettes directly from uploaded Reference images using configurable slot counts.
- **Import/Export**: Full support for importing/exporting palettes as **JSON**, **CSS** variables, or **PNG** images.
- **Advanced Picking**: Integrated Eyedropper tool and Advanced Color Picker with history.

## 3. Gradients Route

The **Gradients** module allows for the design of complex, beautiful gradients with modern web capabilities.

### Key Features

- **Gradient Types**: Support for **Linear**, **Radial**, and **Conic** gradients.
- **Smart Generation**:
  - **Mood-based**: Generate gradients based on emotional keywords.
  - **From Palettes**: Automatically convert existing palettes into smooth gradients (with optional interpolation).
  - **From Images**: Extract dominant colors from an image to form a gradient.
- **Presets Library**: A categorized collection of ready-to-use gradient presets.
- **Editor**: Fine-grained control over color stops (`position` and `color`) and angle.

## Overall UI Design

The project follows a **"Cyber-Pop Glassmorphism"** aesthetic, characterized by:

- **Glassmorphism**: Extensive use of translucent panels (`GlassPanel`) with blurring and subtle borders to create depth.
- **Dark Mode**: A deep "void" background (`#0a0a0f`) contrasts with vibrant neon accents, particularly the primary "Phoenix" pink (`#ff007f`).
- **Interactive Elements**:
  - **Bento Grids**: Modern, grid-based layouts that flexibly adapt to screen size.
  - **Micro-interactions**: Hover effects, smooth transitions, and scaling animations on actionable elements.
  - **Responsive Layouts**: tailored mobile experiences (e.g., action sheets for touch devices) vs. desktop modal interactions.
- **Iconography**: Consistent use of Material Symbols via Iconify for intuitive navigation and actions.
