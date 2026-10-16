---
name: PhoenyxColor
description: Dark, glass-on-void color workbench with Phoenix fire accents.
colors:
  phoenix-primary: "oklch(65% 0.22 30)"
  phoenix-violet: "oklch(55% 0.25 290)"
  phoenix-accent: "oklch(70% 0.15 40)"
  void: "oklch(15% 0.05 280)"
  void-deep: "#0a0810"
  text-main: "oklch(95% 0.01 280)"
  text-muted: "#a0a0c0"
  error-ember: "oklch(70.4% 0.191 22.216)"
  error-ember-soft: "oklch(88.5% 0.062 18.334)"
  warning-amber: "oklch(87.9% 0.169 91.605)"
  warning-amber-soft: "oklch(96.2% 0.059 95.617)"
typography:
  display:
    fontFamily: "Clash Display, Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    letterSpacing: "0.025em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: '"cv02", "cv03", "cv04", "cv11"'
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.05em"
  micro:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.25
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    fontFeature: '"ss01", "ss02"'
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  pop: "1rem"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.phoenix-primary}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.pill}"
    typography: "{typography.label}"
    height: "32px"
  button-icon:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.lg}"
    size: "36px"
  tool-active:
    backgroundColor: "{colors.phoenix-primary}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.xl}"
    size: "48px"
  section-tab-active:
    backgroundColor: "{colors.phoenix-primary}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  input-search:
    textColor: "{colors.text-main}"
    rounded: "{rounded.lg}"
    padding: "8px 12px 8px 36px"
    typography: "{typography.body}"
  card-reference:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.xl}"
    padding: "8px 10px"
  panel-editor:
    backgroundColor: "{colors.void-deep}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: PhoenyxColor

## Overview

**Creative North Star: "The Ember in the Void"** (provisional, pending maintainer confirmation)

PhoenyxColor is a dark workbench where the user's images and colors are the brightest thing on screen. The ground is a deep blue-violet void; everything that sits on it (headers, toolbars, panels, cards) is a translucent, blurred sheet of near-black with a hairline white border. Color from the chrome itself is rationed: a single orange-red Phoenix flame marks what is active, selected, or primary, occasionally blended into violet as a gradient for the main call to action.

Density is tool-like rather than editorial. Controls are small (36px icon buttons, 12-14px text), grouped tightly with 4-12px gaps, and quiet by default at half-opacity white, brightening to full white on hover. Motion is snappy and slightly elastic (spring easings on press and indicator slides), never decorative loops on working surfaces.

The light daisyUI theme is technically active on `<html>` (`data-theme="light"` at measurement), but the visible look is entirely driven by app classes painting the void, white-alpha text, and white-alpha surfaces. Treat that dark look as the system, not the daisyUI theme.

**Key Characteristics:**

- Void-dark ground with a fine 3% fractal-noise overlay across the whole viewport.
- Glass sheets: near-black translucency, heavy backdrop blur, 1px white borders at 4-10% alpha.
- One flame: Phoenix orange-red is the only chrome accent that signals state.
- White-alpha text hierarchy (100 / 80 / 50 / 30%) instead of a gray ramp.
- Material Symbols icons everywhere, rounded-lg (8px) as the default corner.

## Colors

A near-monochrome void lit by one warm flame, with violet held back for gradients.

### Primary

- **Phoenix Flame** (phoenix-primary): the active and selected state. Active editor tool, active adjust tab, selected card ring and check badge, selected list-row tint (10% fill, 20% border), changed slider values, focused input borders (40% alpha), header nav active icon, the "COLOR" half of the wordmark, panel header icon tile (15% fill).

### Secondary

- **Phoenix Violet** (phoenix-violet): never used alone on working surfaces. It appears only as the far stop of the flame gradient (primary CTA, brand mark) and as 15-20% tint in decorative icon tiles.

### Tertiary

- **Phoenix Ember** (phoenix-accent): a softer orange defined as a token; it has no observed use in the References route or editor. Keep it in reserve; do not introduce it as a new accent role.

### Neutral

- **Void** (void): page background behind everything, and the ring-offset color around selected cards.
- **Deep Void** (void-deep): the full-screen image editor background and editor side panels (at 97% opacity), error toast backing (95%).
- **Starlight** (text-main): primary text. In components it is usually expressed as `text-white` and its alpha steps: 80% for secondary names, 50% for idle icons and labels, 30% for disabled or default-value numerals.
- **Dusk Lavender** (text-muted): secondary copy, counts, filenames on cards, placeholders (at 40%), and helper lines (at 50-70%).
- **White-alpha surfaces**: surfaces are not tokens but white at fixed alphas over the void: 2% (empty dropzone), 5% (inputs, cards, idle tabs), 8% (hover, dividers, borders), 10% (active toggles, icon-button hover), 15% (handle bars, hover borders). Black at 60-70% with blur backs the editor header and toolbar.

### Status

- **Error Ember** (error-ember) with **Error Ember Soft** (error-ember-soft): destructive hovers (text plus 10% tint), error panels (20% border, 8% fill), error-text in the canvas preview alert.
- **Warning Amber** (warning-amber) with **Warning Amber Soft** (warning-amber-soft): non-fatal load warnings (20% border, 8% fill, soft-amber text).
- Success is delivered by svelte-sonner toasts (`richColors`, dark theme, glass styling), not a project token.

### Named Rules

**The One Flame Rule.** Phoenix orange-red is the only hue that marks state in the chrome. If something is active, selected, focused, or changed, it is the flame; nothing else competes for that job.

**The Violet Only In Gradient Rule.** Violet appears as the second stop of the flame-to-violet gradient or as a faint tint; it never fills a control on its own.

**The Alpha Ladder Rule.** Text and surfaces step through white alpha (5 / 8 / 10 / 15% surfaces; 30 / 50 / 80 / 100% text). Do not add gray hex values.

## Typography

**Display Font:** Clash Display (with Inter, system-ui)
**Body Font:** Inter (with system-ui, -apple-system), stylistic sets cv02, cv03, cv04, cv11
**Label/Mono Font:** Geist Mono is declared (`--font-mono`, `.font-mono`), but at runtime it does not load, so mono text renders in the `ui-monospace` fallback. Write mono usage expecting the platform monospace.

**Character:** A geometric, slightly sharp display face for headings over a neutral, tight-set Inter for everything you actually operate.

### Hierarchy

- **Display** (Clash Display 600, 1.125-1.25rem, -0.02em): every `h1`/`h2` picks this up from the base stylesheet; the References library title, the editor image name (at 0.875rem), and the PHOENYX wordmark (bold, 15px, wide tracking).
- **Headline** (Inter 600, 1rem, -0.01em): `h3`-`h6` such as error and empty-state headings.
- **Title** (Inter 700, 0.875rem, wide tracking): editor panel titles.
- **Body** (Inter 400, 0.875rem, relaxed leading): inputs, list row names, descriptions; helper copy at 0.75rem.
- **Label** (Inter 700, 0.75rem, 0.05em, uppercase, white at 50%): section labels inside panels and dialogs ("Tools", "Actions", "View").
- **Micro** (Inter 500, 10-11px): toolbar tool names, dimensions, format hints. 13px for slider names and nav links.
- **Mono** (0.75rem / 11px, tabular figures): zoom percentage, slider values, hex readouts.

### Named Rules

**The Display For Headings Only Rule.** Clash Display is for `h1`/`h2` and the wordmark. Controls, labels, and values stay in Inter or mono.

## Layout

The References route is a container-query layout: the library sizes itself with `@sm` / `@md` / `@lg` container breakpoints rather than viewport ones. Header and controls sit above a scrolling grid of square reference cards (2 / 3 / 4 / 5 columns, 12px gaps, 16px side padding growing to 24px at `@md`); when there are more than four items, the first card is featured at 2x2 with a 4:3 image. A list view replaces the grid with 40px thumbnail rows.

The image editor is a full-bleed overlay in a fixed stack: a 48-56px blurred header bar, the canvas filling the middle, and a blurred bottom tool strip with 48px minimum targets. Tool panels open as a right sidebar on desktop (between header and toolbar) and as a bottom sheet capped at 65vh with a handle bar on mobile.

Spacing runs on a 4px base: 4, 8, 12, 16, 24px, with 6px and 10px used inside tight control clusters. App chrome uses a 48px (h-12) header with a centered pill nav.

## Elevation & Depth

Depth is mostly material, not shadow: translucency plus backdrop blur (12px to 40px) layered over the void, separated by 1px white-alpha hairlines. Shadows are reserved for things that float over content (editor panels, error toasts, selected badges) and for state glows under the active flame.

### Shadow Vocabulary

- **Floating panel** (`shadow-2xl` with black at 60%): editor side panel and bottom sheet.
- **Flame glow** (`shadow-lg` tinted phoenix-primary at 25%; 20% with `shadow-md` on tabs): only under the active tool or active section tab.
- **Glass lift** (`0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)`): the shared GlassPanel surface; hover deepens it and adds a faint violet bloom.
- **Island** (`0 8px 30px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)`): GlassPanel `island` variant.

### Named Rules

**The Glow Means Active Rule.** A colored shadow appears only beneath the element currently in the flame state. Idle elements stay shadowless.

## Shapes

Soft, rounded rectangles throughout, scaled to the element: 6px for the smallest inline buttons (zoom steppers, reset), 8px as the default for icon buttons, inputs, tabs, and list rows, 12px for cards, tool buttons, and panels, 16px for empty-state and error containers and the mobile sheet top. Full pills belong to daisyUI buttons, the header nav, the color-buffer chip, and status dots. Borders are always 1px white at low alpha; dashed 2px borders mark drop and add-more targets.

## Components

### Buttons

- **Shape:** fully rounded pill (9999px) for daisyUI `btn`, uppercase Inter 600 with 0.02em tracking.
- **Primary:** flame-to-violet 135-degree gradient, white text, small size (`btn-sm`, 32px) in the References route.
- **Hover / Focus:** lift (scale 1.03, -1px), press compresses to 0.95 with a spring bounce-back on focus; a radial white ripple on press.
- **Ghost:** 5% white glass with blur and 5% border; 15% on hover. Destructive ghosts swap to error ember text with a 10% ember tint on hover.

### Icon Buttons

- **Style:** 36px square (32px in panel headers, 28px inside the zoom group, 44px on card overlays), 8px corners, white at 50% icon, no border.
- **Hover:** icon to full white, 10% white fill. Disabled drops to 25% opacity with no hover fill.
- **Active/toggled:** flame icon on a 10% flame tint (compare toggle).
- **Over imagery:** black at 60% with blur and a 10% white border, so actions stay legible on any photo.

### Chips / Section Tabs

- **Style:** 8px-corner tabs, 12px medium text with a 14px icon; idle at 5% white with 50% text.
- **State:** active is solid flame with a soft flame glow; changed-but-inactive tabs brighten to 8% white with a small flame dot.

### Cards / Containers

- **Corner Style:** 12px.
- **Background:** 5% white with a 5% white border, brightening the border to 15% on hover; image zooms to 105% on hover.
- **Selected:** 2px flame ring offset by 1px against the void, a 24px flame check badge top-left, filename turns flame.
- **Internal Padding:** 8px by 10px caption row under a square (or 4:3 featured) image with a black bottom scrim.

### Inputs / Fields

- **Style:** 5% white fill, 5% white border, 8px corners, 14px text; leading 16px search icon at 50% muted.
- **Focus:** border shifts to flame at 40%; no outline ring on these inline fields.
- **Range sliders:** daisyUI range in primary with a flame-glowing thumb.

### Navigation

- **App header:** 48px blurred void bar with a 4% hairline; gradient flame-to-violet brand tile; centered pill nav with a sliding white-8% indicator on a spring; active link white with a flame icon, idle at 45% white.
- **Editor header:** black 60% blurred bar, back arrow, Clash Display filename, centered undo/redo/compare cluster, right zoom group.
- **Editor toolbar:** bottom strip of 48px icon-over-label tools; active tool is solid flame, scaled 105%, glowing.

### Editor Panel (signature)

Deep void at 97% with heavy blur and a 60% black shadow; 12px left corners on desktop, 16px top corners as a mobile sheet. Header carries a 28px flame-tinted icon tile and a bold 14px title; content pads 16px. Section labels inside panels use the uppercase Label style at 50% white.

## Do's and Don'ts

### Do:

- **Do** reuse the existing tokens only: phoenix-primary, phoenix-violet, void, void-deep, text-main, text-muted, and the Tailwind red/amber status pairs already in use.
- **Do** mark every active, selected, focused, or changed state with Phoenix Flame, and nothing else.
- **Do** build new surfaces as white-alpha or void-deep glass with backdrop blur and a 1px white hairline (5-10% alpha).
- **Do** use Material Symbols (`material-symbols:*` via Iconify) for every UI icon; simple-icons is limited to third-party format logos.
- **Do** keep icon buttons at 36px or larger with 8px corners, 50% white idle, white on 10% fill on hover.
- **Do** use the uppercase 12px bold, 50% white Label style for section labels inside panels.

### Don't:

- **Don't** introduce new colors, fonts, or icon sets; layout and flow changes must be expressed with the existing vocabulary.
- **Don't** fill a control with solid violet; violet lives in the flame gradient or as a faint tint.
- **Don't** add gray hex values for text or surfaces; step the white alpha ladder instead.
- **Don't** use Clash Display for controls, labels, or values.
- **Don't** rely on Geist Mono rendering; it is not loaded at runtime.
- **Don't** add colored shadows to idle elements; glow is reserved for the active flame state.
