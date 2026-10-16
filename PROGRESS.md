# PhoenyxColor rewrite: vision and progress log

You are continuing the PhoenyxColor rewrite. The repo is a SvelteKit 5 + TypeScript app using bun.

1. Read PROGRESS.md in the repo root, all of it, before doing anything else. It is the source of
   truth: product vision, hard constraints, target architecture, code standards, stage plan,
   known issues, and the progress log. If anything I say here conflicts with PROGRESS.md, stop
   and ask me.

2. Work out where we are. Use the "Current stage" line at the top and the newest progress-log
   entry. Find the first unticked checklist item in the current stage. Run `git status` and
   `bun run check:all` so you know the actual state of the code before you touch it. Tell me in
   3–5 lines: the current stage, the next step, whether the gate is green right now, and any
   uncommitted work you found.

3. Work on the current stage only. Never start a later stage's work, and never "improve" code
   the current stage doesn't touch. If a stage is marked blocked or has open questions, ask me
   those questions first, one at a time, and wait for my answers. Never invent product intent.

4. Before editing, give a short plan: steps, each with an observable way to verify it. Then
   implement in small steps and keep `bun run check:all` at 0 errors and 0 warnings after each
   one. Follow section 5 of PROGRESS.md (no AI slop, strict types, parse at boundaries, no UI
   changes, never destroy user data).

5. If you find a problem that belongs to a later stage, log it in PROGRESS.md section 8 instead
   of fixing it, unless it blocks the current step.

6. Before you stop, always:
   - update PROGRESS.md: tick the checklist items, update the "Last updated / Current stage"
     line, add a dated entry to the progress log (what changed, the checks you actually ran and
     their results, any deviation from the plan and why, what comes next), and fix any fact in
     the doc that turned out to be wrong;
   - report to me: what's done, the files you changed, the checks you ran with their real
     results, anything you couldn't verify, and remaining risks.

7. Stop at the end of the stage, or sooner if you're blocked, and wait for my sign-off. Do not
   commit, push, or delete my old data unless I explicitly ask. Never claim a check passed
   unless you ran it and saw it pass.

> **Read this whole file before you change any code.** It is the source of truth for the rewrite:
> what the product is for, what has been decided, and what stage the work is in. If something here
> conflicts with your own judgement, ask the maintainer. Do not quietly deviate.
>
> **Work in stages. One stage at a time.** Finish the current stage, meet its acceptance criteria,
> log it here, and get the maintainer's sign-off. Only then start the next stage. Never start work
> from a later stage "while you're in there".

Last updated: 2026-10-16 · Current stage: **UI phase: References redesign (built; awaiting maintainer sign-off)** · Stage 1: signed off by the maintainer (4K frame-time check still open, see section 8) · Stage 0: done except the items listed under Stage 0

---

## 1. Product vision

PhoenyxColor is a **free, easy-to-use color suite for individual artists and creatives of every
kind.** Two example users:

- an artist who wants to pull a color palette out of a photo so they can draw with it;
- a UI designer who wants to see how a color scheme actually looks and whether it is accessible.

It is **not** a business or team product. There are no accounts, no paywall, and no server. The
goal is a tool artists actually use: fast, reliable, and pleasant to use.

The app has three modules. Each gets rewritten in its own stage, in this order:

| #   | Module (route)                 | Job it must do                                                                                                                                                                                                                                                                         |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **References** (`/references`) | Picsart-style photo editor. Import images, apply non-destructive edits (crop/rotate/flip, tone, color, curves, effects, layers, drawing), export. **The main product. Top priority.**                                                                                                  |
| 2   | **Palettes** (`/palettes`)     | (a) Artist palettes: extract from an image, harmonies, color-blind preview, lock + regenerate. (b) UI scheme builder: map colors to roles (background/surface/text/accent), check WCAG + APCA contrast, generate OKLCH tonal scales, export as CSS variables / Tailwind / JSON tokens. |
| 3   | **Gradients** (`/gradients`)   | Linear, radial, conic, and mesh gradients in OKLCH. The preview must match the export exactly.                                                                                                                                                                                         |

"References" is the existing domain name for the image editor tab. Keep that name in code. Do not
introduce synonyms like "photos", "images module" or "editor module" for the same concept.

## 2. Hard constraints (non-negotiable)

1. **UI changes only where the active phase allows them.** The maintainer started the UI phase for
   References on 2026-10-15: its markup, styling, layout and copy may change. Everywhere else
   (Palettes, Gradients, Settings) the UI stays exactly as it is; you may change only what a
   component _reads from or calls_ (rewiring). The UI phase never changes the engine, the edit
   session or storage.
2. **Local-first, client-only.** No server, no accounts, no network sync. All data lives in the
   browser (IndexedDB + localStorage). The app builds as a static SPA (`@sveltejs/adapter-static`,
   `ssr = false`). A sync backend is out of scope. Do not add one.
3. **Pixel work runs on the GPU with WebGL2.** One render pipeline serves both the on-screen preview
   and the export, so **the preview must match the export by construction.** No CSS-filter
   previews, no second export path.
4. **The Zig WASM module gets retired** (in Stage 1). Add Rust WASM **only** if profiling shows a
   CPU hotspot that JS in a Web Worker cannot handle (threshold: palette extraction on a 4K source
   takes more than ~100 ms after downsampling). The maintainer knows Rust, not Zig. Never add Zig code.
5. **Never destroy user data.** Migrations are idempotent, safe to restart after a crash, and
   keep the old data until the maintainer explicitly approves deleting it. Records that fail
   validation get quarantined, never dropped.
6. **Incremental rewrite in place.** Build the new modules next to the old code, switch one
   feature over, then delete the old code that feature used. The app must build and run after
   every stage.
7. **No AI slop.** See section 5. The lint gate enforces it; a stage is not done until the gate is green.

## 3. Staged workflow (how every agent must work)

1. Read this file and the section for the current stage.
2. If the stage section has open questions, ask the maintainer before building anything that
   depends on the answer. Never invent product intent.
3. Before editing, state a short plan with observable acceptance criteria.
4. Build the smallest change that meets the stage's acceptance criteria. Do not start the next
   stage's work, and do not "improve" code the stage does not touch.
5. Run `bun run check:all`. It must pass with **0 errors and 0 warnings**.
6. Do the stage's manual verification (section 7).
7. **Update this file:** tick the checklist, add a dated entry to the log (section 9), and record
   any deviation from the plan and why. Anyone reading only this file must be able to tell exactly
   where things stand.
8. Stop and hand off to the maintainer for sign-off. Commit only when the maintainer asks.

If you find a problem that belongs to a later stage, **log it in section 8 (Known issues).** Do
not fix it now unless it blocks the current stage.

## 4. Target architecture

```
src/lib/
  core/                    shared, framework-light, fully unit-tested
    color/                 THE ONLY color-math module (culori/fn). Nothing else may do color math.
    history/               the ONE undo/redo implementation (snapshot + preview/commit)
    download.ts            Blob → file download
    storage/               (Stage 1) IndexedDB v2 schema, repositories, blob store, migrations
  features/                (Stage 1+) one folder per module, each with a small public index.ts
    references/            domain (Reference, EditRecipe), library state, edit session,
                           engine/ (WebGL2), export, palette-from-image worker
    palettes/              Stage 2
    gradients/             Stage 3
  components/              existing UI, rewired only. Components import from a feature's
                           index.ts, never from its internals.
```

Rules:

- **Separate state by kind.** Domain state (records in IndexedDB) stays apart from session state
  (the open editor, a drag in progress) and from derived state (GPU textures, object URLs,
  thumbnails).
- **Parse at the boundary.** Zod validates at every I/O edge: IndexedDB/localStorage reads, file
  import, JSON import. Internal code only ever sees typed domain objects. `unknown` never crosses a
  function signature (anti-slop enforces this).
- **One color library: `culori`,** always through `$lib/core/color`. `chroma-js` and `colord` get
  removed by Stage 3. Do not add new uses of them.
- **Keep dependencies lean.** Current runtime deps: `culori`, `idb`, `zod`, `svelte-sonner`,
  `svelte-dnd-action`, `@iconify/svelte`, plus `chroma-js` and `colord` until Stage 3. Add a
  package only if it removes significant code we would otherwise own, and justify it in the log.
- **The `app` god-store (`stores/root.svelte.ts`) is legacy.** Each feature replaces its slice when
  its stage lands. Never add new state to `app`.

### Storage v2 (built at the start of Stage 1)

- New IndexedDB database `phoenyx` with object stores: `references` (keyPath `id`, index
  `createdAt`), `blobs` (id → `Blob`: originals and thumbnails), `recipes` (keyPath `referenceId`),
  `presets`, `palettes`, `gradients`, `meta` (per-collection migration markers `migration:<name>`,
  quarantine entries `quarantine:<uuid>`). The IndexedDB version itself is the schema version.
- Writes are per record. Never rewrite a whole collection. Changes that span several stores
  (e.g. deleting a reference + its blobs + its recipe) go in one transaction.
- Images are stored as `Blob`s: the original file as-is, plus a 256 px thumbnail. No base64 data
  URLs, no lossy recompression on import.
- Settings stay in localStorage (key `phoenyx_settings`) so the theme can apply synchronously at boot.
- Call `navigator.storage.persist()` on the first image import.
- **Migrations run per collection, in the stage that switches that collection over:** references
  and filter presets in Stage 1, palettes in Stage 2, gradients in Stage 3. Never migrate a
  collection before its feature reads from v2, or edits made in the old DB after migration get lost.
- Migration source: DB `PhoenyxColorDB`, object store `keyval`, keys `phoenyx_references`,
  `phoenyx_filter_presets`, `phoenyx_palettes`, `phoenyx_gradients`. Each migration: read,
  validate each record, convert data URLs to Blobs, write everything in one transaction, quarantine
  failures in `meta`, and write the migration marker **last**. **Keep the old DB.**

### Engine (Stage 1)

As built in step 5 (`features/references/engine/`). WebGL2 on the main thread. The source is
uploaded once as `SRGB8_ALPHA8` (the hardware does sRGB→linear), then the recipe runs as
fragment passes over ping-pong framebuffers (`RGBA16F` when `EXT_color_buffer_float` is
available, else `RGBA8`). Pass order: **geometry first** (crop/rotate/flip/scale in the vertex
shader, resampling to the output size) · adjust (white balance · tone · color · curves as a
256×1 LUT, one pass) · blur · clarity · effects (one pass each) · gradient map · layer composite
(all 16 blend modes in-shader) · finish (vignette · opacity · stroke overlay · linear→sRGB).
Geometry moved from last to first so every pass runs at output size; see the 2026-09-26 step 5
log. Strokes are rasterized once per change into an overlay texture. The same
`render(recipe, outputScale)` drives preview (viewport × DPR, then `present()`) and export
(`exportImage`: `readPixels` → `OffscreenCanvas.convertToBlob`; the UI saves it with
`core/download`). `webglcontextlost`/`webglcontextrestored` are handled: images are re-uploaded
from their Blobs and `onContextRestored` is called. Images larger than the GPU limit are
downscaled on upload (`isSourceDownscaled`), and output beyond it is capped (`isReduced`): both
flags are for the UI's notice (known ceiling; the upgrade path is tiled rendering). Shaders live
in `.frag`/`.vert`/`.glsl` files imported with Vite `?raw`.

## 5. Code standards (the "no AI slop" rules)

The maintainer's rules. They apply to every line.

- Readable in one pass. Domain names only, no `data`/`item`/`manager`/`helper`/`utils` in new
  names. Booleans read as predicates (`isReady`, `canUndo`).
- Build discipline: before writing code, ask (1) does it need to exist? (2) is it already in the
  codebase? (3) does the platform or an installed dependency do it? (4) can it be one line? Only
  then write the minimum code that works. No speculative features, abstractions, config options,
  or error handling for impossible states.
- Strict types: no `any`, no unexplained casts. Every type assertion needs a
  `// SAFETY:` comment explaining why it is sound (enforced by lint).
- Comments explain constraints and decisions, not what the code does. No emoji logging. Use
  `console.warn`/`console.error` only; `console.log` is a lint error.
- Surgical edits: match the surrounding style, don't reformat or "improve" adjacent code. Remove
  only the orphans your change created.
- Fix bugs at the root cause. Check a function's callers before changing it.
- Stop adding `// fallow-ignore-file` markers. Delete them from any file you rewrite.
- Tests: add focused, deterministic tests when behavior, parsing, state transitions, or failure
  handling change. Don't write tests that just mirror the implementation. Never mock modules
  (lint rule `anti-slop/no-module-mocking`). Use `fake-indexeddb` for IndexedDB.

### Tooling (enforced)

| Command                           | What it does                                                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run check:all`               | **The gate.** `bun run check` → `vp test --run` (Vitest 5: jsdom `unit` + Chromium `browser` projects). Must be 0 errors / 0 warnings.                    |
| `bun run check` / `check:fix`     | `svelte-kit sync` → `vp check` (format, lint, type-aware lint, TS type-check of `.ts`) → `svelte-check` (`.svelte` files). `check:fix` = `vp check --fix` |
| `bun run lint` / `lint:fix`       | `vp lint` (Oxlint) + the vendored anti-slop plugin (`tools/oxlint/anti-slop`, all rules at `"error"`)                                                     |
| `bun run format` / `format:check` | `vp fmt` (Oxfmt: tabs, width 100, double quotes, `es5` trailing commas)                                                                                   |
| `bun run build` / `preview`       | `vp build` / `vp preview`: static SPA build into `build/`                                                                                                 |

- Toolchain: **Vite+** (`vite-plus`, `vp` CLI). `vite` is aliased to `@voidzero-dev/vite-plus-core`
  (Vite 8, Rolldown) and `vitest` is pinned to the version Vite+ bundles, both through
  `overrides` in `package.json`. Keep `vitest`, `@vitest/browser-playwright` and
  `@vitest/coverage-v8` on that same exact version. Test files import from `vite-plus/test`.
- Package manager: **bun**. Never use npm/yarn/pnpm lockfiles.
- Lint and format config live in `vite.config.ts` (`lint` and `fmt` blocks); there is no
  `.oxlintrc.json`/`.oxfmtrc.json` any more. `fmt` uses **Prettier option names** (`useTabs`,
  `printWidth`, …); Biome names (`indentStyle`, `lineWidth`) are silently ignored.
- The `lint` override turns off `no-unassigned-vars` for `*.svelte` only, because Oxlint cannot see
  Svelte `bind:this` assignments. Do not widen that override.
- `vp check` type-checks with tsgo (TypeScript 7), `svelte-check` with TypeScript 5.9. They can
  disagree on inference (see the 2026-10-15 log); code must pass both.
- Never commit `.agents/` or `skills-lock.json`.

## 6. Stage plan and status

### Stage 0: Foundation · ✅ done (items not done yet are listed below)

- [x] Quality gate: fixed the `+layout.svelte` JSON-LD parse error, deleted ~60 dead exports,
      added the stricter oxlint rules (`no-console`, `no-unused-vars`, `no-explicit-any`) and the
      `check:all` script
- [x] Fixed the oxfmt config (it used Biome option names) and reformatted the repo
- [x] `src/lib/core/color/`: culori/fn wrapper (parse, OKLCH/OKLab, gamut-mapped hex, linear RGB,
      WCAG contrast) with 15 tests
- [x] `src/lib/core/history/history.svelte.ts`: `History<T>` with `preview` / `commit` /
      `cancelPreview` / `undo` / `redo` / `reset`, 100-entry cap, snapshots never aliased; 8 tests
- [x] SPA mode: `adapter-static` (fallback `index.html`) + `ssr = false`; deep links verified
- [x] Removed `file-saver`; added `src/lib/core/download.ts`; one validated backup export
      (`exportBackup` in `services/persistence.ts`) used by both Settings and the keyboard shortcut
- [x] Storage reads validated at the boundary: `storage.db.getCollection(key, schema)` and
      `storage.local.get(key, schema)`. Invalid records go to `<key>_quarantine`. Gradients with
      bad stops get repaired, not dropped. Settings merge over defaults. Tests use `fake-indexeddb`.
- [x] Delete `src/routes/mockup`, `src/typescriptPRD.md` and `src/PhoenyxColor.md` once the new
      docs cover their content (done 2026-10-16 with the maintainer's approval, see the log)
- **Deviation from the plan:** the v2 database and the migrations moved to Stage 1 and later (see
  "Storage v2"). Migrating before a feature switched to v2 would have lost edits.

### Stage 1: References rewrite · ✅ signed off by the maintainer on 2026-10-15 (4K frame-time check still open)

Decided: the `EditRecipe` stores a snapshot of the gradient-map colors (see the 2026-09-24 log entry).

Build in this order. Each step ends with `check:all` green.

1. [x] `core/storage` v2: DB schema, typed repositories, blob store, migration runner (per
       collection, marker written last, quarantine in `meta`).
2. [x] `features/references/domain`: `Reference` (metadata only: id, name, createdAt, width,
       height, `originalBlobId`, `thumbBlobId`, tags) and `EditRecipe` (versioned zod schema,
       JSON only: geometry · tone · color · curves · detail · `effects[]` each with a stored
       **seed** · vignette · `layers[]` referencing blob ids · `strokes[]`).
3. [x] References + filter-presets migration: v1 fields → recipe (e.g. `brightness: 100` means
       neutral); data URLs → Blobs. Test it against a v1 fixture that includes data-URL images and
       one invalid record.
4. [x] Edit session (`features/references/session.svelte.ts`): one per open image; owns one
       `core/history`; slider drag = `preview`, pointer-up = `commit` (one undo entry per gesture);
       recipe saved debounced (~400 ms) and on `visibilitychange`/`pagehide`.
5. [x] WebGL2 engine (see "Engine"), preview + export through the same `render`.
6. [x] Palette-from-image: k-means in OKLab on a ≤128 px downsample, in a Web Worker, fixed seed.
       It replaces **both** current extractors: `utils/color-engine.ts#extractPalette` (Zig
       k-means; called from `ImageEditorLayout.svelte`, `PalettesModule.svelte`,
       `editor/panels/PalettePanel.svelte`, `gradients/dialogs/ImageExtractDialog.svelte`) and
       `services/color-engine.ts#extractTheme` (naive quantizer; called from
       `stores/theme.svelte.ts`). Every call site moves to the worker.
7. [x] Rewire (no visual change): `ReferencesModule`, `references/*`, `editor/panels/*`.
       7a library ✔ · 7b gallery ✔ · 7c editor ✔ (7b and 7c landed together) · 7d other consumers ✔.
8. [x] Delete the old code: `wasm/`, `static/phoenyx-color.wasm`, `services/wasm.ts`,
       `utils/{effects-processing,image-processing,canvas-renderer,image-filters,layer-compositor}.ts`,
       `hooks/useImageEditor.svelte.ts`, `components/editor/EditorHistory.svelte.ts`,
       `stores/references.svelte.ts`, `stores/filter-presets.svelte.ts`, `stores/history.svelte.ts`
       (once nothing uses it), `services/performance.ts`, the SVG filter defs in `ImageCanvas.svelte`.
       Library-level undo becomes delete-with-undo-toast (soft delete). Done; `stores/history.svelte.ts`
       stays, because the palettes and gradients stores still use it (Stages 2–3).

**Acceptance criteria (all must hold):**

- Dragging any slider on a 4K image keeps every frame under 16 ms (DevTools Performance panel).
- The preview and the exported PNG are pixel-identical at the same size.
- Undo/redo creates exactly one entry per gesture. The recipe survives a page reload (history is
  per session and is not expected to survive).
- A v1 library migrates with every image and every edit intact, and `PhoenyxColorDB` still exists.
- Crop, rotate, flip, every effect, layers (merge down really composites), strokes, presets and
  PNG/JPEG/WebP export all work.
- Imports keep full resolution and transparency.
- New tests: recipe schema + migration mapping, session commit/preview/undo, geometry math (port
  the cases in `utils/canvas-renderer.test.ts`), plus engine smoke tests in Vitest browser mode
  (Chromium via Playwright): identity recipe ≈ source within ±1, every pass runs, export has the
  right size.

### UI phase: References redesign · 🚧 active (started 2026-10-15)

The maintainer finds `/references` clunky to use and asked for a full UI/UX overhaul, "audit
first". Scope: the gallery, the editor layout and panels, and canvas interaction. Out of scope:
the engine, `EditSession`, storage, and every other route.

1. [x] Move the toolchain to Vite+ (done before the redesign, at the maintainer's request).
2. [x] Audit `/references` in a real browser; rank the friction points; agree a layout with the
       maintainer before building it.
3. [x] Build the agreed design; walk the critical journey (section 7) at desktop and phone widths.

### Stage 2: Palettes · 🔒 not started (Stage 1 is signed off; the References UI phase goes first)

Scope is in section 1. The domain: `Palette { swatches: { id, color (OKLCH), name? }[] }` plus
optional `SchemeRoles`. All math lives in `core/color`; add APCA, harmonies and color-blind
simulation there. Then delete most of `palette-utils.ts` and `utils/colorUtils.ts`. Migrate
`phoenyx_palettes` to v2 in this stage.
**Open questions (ask the maintainer before starting):** exact role set for UI schemes, export
formats beyond CSS vars/Tailwind/JSON, how many swatches per palette, and whether palettes link
to the gradients.

### Stage 3: Gradients · 🔒 blocked until Stage 2 is signed off

Domain `Gradient = linear | radial | conic | mesh`, stops in OKLCH, with an interpolation space.
Linear, radial and conic render with native CSS `… in oklch`. The mesh renders with a WebGL2 shader
that reuses the Stage 1 engine plumbing, with **seeded** noise, and the same shader produces the
PNG export. The CSS mesh export is labelled as an approximation. SVG export stays for
linear/radial only. Replace the per-pixel JS loop in `MeshGradientCanvas.svelte`. Remove
`chroma-js` and `colord`. Migrate `phoenyx_gradients` in this stage.

### Deferred (not planned; ask before touching)

- PWA/offline install (`src/service-worker.ts`). Decide after Stage 1.
- The UI redesign of the other routes (References is active, see above).
- A proper backup **import** (Settings currently shows "coming soon"). `parseImportedState` in
  `schemas/validation.ts` already parses the export format. Implement this with Stage 1 storage
  v2, and include the image blobs.

## 7. Verification checklist (every stage)

1. `bun run check:all` → 0 errors, 0 warnings, all tests pass.
2. `bun run build && bun run preview`, then open the stage's route **directly** (deep link).
3. Walk the critical journey in a real browser. Stage 1: load a v1 data fixture → reload
   (migration runs) → import an image → edit → undo/redo → reload → export → compare the export
   to the preview.
4. Stages with rendering: check the frame times in the DevTools Performance panel on a 4K image.
5. Report what was actually run. Never claim a check passed if it wasn't run.

## 8. Known issues and risks (carry forward until fixed)

| Issue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Where                                                                               | Fixed in                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------- |
| ~~Import shrinks every image to 1920×1080 JPEG, which destroys PNG transparency~~ fixed in 7b: import stores the file as-is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `services/performance.ts#optimizeImage`, `ReferencesModule.svelte#processFile`      | Stage 1 ✔                             |
| ~~Preview ≠ export (CSS/SVG filters vs Canvas2D path)~~ fixed in 7c: preview, export and thumbnails all go through the engine (old code is unused, deleted in step 8)                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `hooks/useImageEditor.svelte.ts`, `utils/canvas-renderer.ts`                        | Stage 1 ✔                             |
| ~~Two undo systems per edit; every slider commit rewrites the whole references array (with base64 images) to IDB~~ fixed in 7c: one `EditSession` per open image, one recipe record per save                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `useImageEditor.handleStateUpdate → syncToStore → ReferenceStore.update`            | Stage 1 ✔                             |
| ~~History clones layer data URLs on every step (`JSON.parse(JSON.stringify)`)~~ fixed in 7c: the editor no longer uses it (only its types are still imported; see the step 8 row below)                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `components/editor/EditorHistory.svelte.ts`                                         | Stage 1 ✔                             |
| ~~`mergeDown` deletes the layer instead of merging it; layers never appear in the render~~ fixed in 7c (`layer-merge.ts`; layers render in the engine)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `useImageEditor.mergeDown`                                                          | Stage 1 ✔                             |
| ~~Pixel ops run on the main thread, in gamma space, with a copy into and out of WASM each time~~ no longer called since 7c (the engine does the pixel work); the code is deleted in step 8                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `services/wasm.ts#processImage`                                                     | Stage 1 ✔                             |
| ~~Two separate image-palette extractors with different algorithms~~ fixed in step 6 (one worker)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | see Stage 1 step 6                                                                  | Stage 1 ✔                             |
| The palettes, gradients and settings stores call `save()` without awaiting it or catching errors (marked `void` since the Vite+ move), so failed writes (e.g. storage full) go unnoticed                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `stores/*.svelte.ts`                                                                | Stages 1–3 (stores replaced)          |
| Mesh gradient: per-pixel JS on the main thread, `Math.random` noise (no two renders match), CSS export is a separate approximation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `gradients/MeshGradientCanvas.svelte`                                               | Stage 3                               |
| `interpolateGradientColors` maps `oklch`→`lch` and `oklab`→`lab` for chroma-js, so gradients labelled OKLCH are not actually OKLCH                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `gradients/gradient-utils.ts`                                                       | Stage 3                               |
| ~~The migrations are built and tested but not run at runtime yet~~ fixed in 7b: the first load of `/references` runs them (checked in a real browser, see the log). `describeImage` has Chromium tests since step 5a                                                                                                                                                                                                                                                                                                                                                                                                                             | `features/references/v1-migration.ts`                                               | Stage 1 ✔                             |
| v1 originals were already recompressed to ≤ 1920×1080 JPEG on import (known issue above). The migration keeps those bytes as-is, so migrated images stay at v1 quality; only new imports get full resolution                                                                                                                                                                                                                                                                                                                                                                                                                                     | `features/references/v1-migration.ts`                                               | not fixable (data already lost in v1) |
| Removing a layer leaves its image in `blobs` (undo may bring the layer back); only images the final recipe points to are deleted with the reference. Needs an orphan-blob sweep                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `features/references/library.svelte.ts`                                             | later (not planned)                   |
| Engine ceilings (each has a `ponytail:` note or a log entry): resampling filters straight alpha (dark fringe possible on rotated transparent edges; fix: premultiply on upload); blur kernel capped at 96 px; output and textures capped at the GPU limit (fix: tiles); export goes through a 2D canvas, which premultiplies, so semi-transparent export pixels can lose color precision                                                                                                                                                                                                                                                         | `features/references/engine/`                                                       | when a user hits one                  |
| 16 ms frame budget on a 4K image is unmeasured (headless Chromium has no GPU). Needs the maintainer's real GPU and DevTools. The editor now opens fitted to the viewport and renders at zoom × devicePixelRatio (≤ 1), so a fitted 4K image renders far fewer pixels than 8 MP. At 100 % zoom it still renders the whole image (`ponytail` upgrade path: render only the visible viewport)                                                                                                                                                                                                                                                       | engine, `ImageEditorLayout.svelte`                                                  | open (maintainer, real GPU)           |
| ~~Ctrl+Z / Ctrl+Y never reach the editor~~ fixed in 7d: the editor listens in the capture phase and stops the app-wide handler for the shortcuts it handles                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `services/keyboardShortcuts.ts`                                                     | Stage 1 ✔                             |
| ~~Until 7d, the Palettes picker, the JSON backup and the global shortcuts still read the v1 store~~ fixed in 7d                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `PalettesModule.svelte`, `services/persistence.ts`, `services/keyboardShortcuts.ts` | Stage 1 ✔                             |
| ~~Step 8 could not delete the old code until its last users moved~~ done in step 8 (types moved, Curves and preset previews moved to the engine)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | see the text                                                                        | Stage 1 ✔                             |
| ~~The engine's `isReduced` and `isSourceDownscaled` are not shown to the user~~ shown since the UI phase: header "Edited at reduced size" (lg+), an explanation in the Export panel, and an "Exported at W×H: smaller than requested (GPU size limit)" warning toast                                                                                                                                                                                                                                                                                                                                                                             | `ExportPanelEnhanced.svelte`, `ImageEditorHeader.svelte`                            | UI phase ✔                            |
| Presets load once, after the library's first load. If that load failed and a retry then migrated the v1 presets, they appear only after a page reload                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `features/references/presets.svelte.ts`                                             | later (not planned)                   |
| ~~The `docs/` Astro site still describes the Zig WASM architecture~~ fixed 2026-10-16: guides rewritten, references generated from source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `docs/src/content/docs/guides/*`                                                    | after Stage 1                         |
| `app.css` defines the core tokens twice: hex in `@theme` (~line 45) and OKLCH in `:root` (~line 97). Measured in Chromium: the OKLCH values render for `void`, `phoenix-primary` (`oklch(65% .22 30)`, orange-red, not the hex `#ff007f`), `phoenix-violet`, `phoenix-accent`, `text-main`; `void-deep` (`#0a0810`) and `text-muted` (`#a0a0c0`) exist only as hex. Several glows are still hard-coded to the old pink `rgba(255,0,127)` (`.btn-primary` shadow, input focus ring, `.brand-mark`), and the `[data-theme="dark"]` block sets daisyUI 4 variables that daisyUI 5 ignores. Logged, not fixed (the UI phase keeps the rendered look) | `src/app.css`, `layout/Header.svelte`                                               | later (ask)                           |
| ~~App shell: the nav pill floats mid-screen over every route at ≥ md~~ fixed (maintainer-approved): `relative` on the `<header>`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `layout/Header.svelte:42`                                                           | UI phase ✔                            |
| Geist Mono is declared as `--font-mono` but never loads at runtime; mono text falls back to `ui-monospace`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `src/app.css`, font loading                                                         | later (ask)                           |
| Not verified on a real GPU: a full-size export of a 4000×3000 image (headless SwiftShader is too slow for it in the walk; exports up to 2400×500 were checked at every width), and the 16 ms frame budget (row above)                                                                                                                                                                                                                                                                                                                                                                                                                            | engine, Export panel                                                                | open (maintainer, real GPU)           |
| Toasts (app-wide `Toaster`, bottom right) sit over the bottom of the docked inspector for a few seconds on desktop                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `+layout.svelte` toaster position                                                   | later (ask; outside References)       |
| impeccable detector advisories: pre-existing 9/11/13 px text steps and the canvas checkerboard grey `#1a1a1a` are not in `DESIGN.md`. Kept (the UI phase keeps the look); document them or move to the ramp in a later pass                                                                                                                                                                                                                                                                                                                                                                                                                      | References panels, `ImageCanvas.svelte`                                             | later                                 |
| Crop & Rotate: the crop view shows the upright source (Stage 1 engine decision: the crop is stored before rotation), so the tool has two tabs; rotation is visible on the Rotate tab only                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `CropPanel.svelte`, `editor.svelte.ts#displayedRecipe`                              | known ceiling                         |
| The palettes, gradients, settings, theme and history stores and `palette-utils.ts` keep `fallow-ignore` markers. Without them fallow reports about 25 members: most are false positives (`app.palettes.add(…)` goes through a nested property fallow cannot follow), a few look really unused (e.g. `ThemeStore.generateFromImage`, reached only from `src/routes/mockup`). Remove the markers when each store is rewritten                                                                                                                                                                                                                      | `stores/*.svelte.ts`, `palettes/palette-utils.ts`                                   | Stages 2–3                            |

## 9. Progress log (newest first)

Add one entry per work session: date, stage, what changed, checks actually run, any deviations,
and what comes next.

### 2026-10-16 · Docs site removed (at the maintainer's request)

- The Astro/Starlight `docs/` site and `.github/workflows/docs.yml` are dropped; the entry below
  is superseded. Root `docs:dev` / `docs:build` scripts and the README docs section, guide links
  and Starlight tech-stack row removed. This file and `README.md` are the project docs.

### 2026-10-16 · Docs site modernized (outside the stage plan, at the maintainer's request)

- **Maintainer decisions:** keep Starlight and upgrade it; add generated Svelte component docs
  and `llms.txt`; no deploy (a CI job only builds); rewrite the guides; delete the Stage 0
  leftovers.
- `docs/` toolchain pinned exactly: Astro 7.3.5, Starlight 0.42.4, starlight-typedoc 0.23.1,
  TypeDoc 0.28.20, typedoc-plugin-markdown 4.13.1, starlight-links-validator 0.26.0,
  starlight-llms-txt 0.12.0, sveld 0.38.1 (each at least two weeks old).
- The API reference now covers `config`, `core`, `features`, `hooks`, `schemas`, `services`,
  `stores`, `types` and `utils` (tests, fixtures and workers excluded). `entryFileName: "index"`
  is required: starlight-typedoc deletes nested `README.md` files, which are TypeDoc's module pages.
- New `docs/integrations/component-docs.ts`: sveld → one page per component under
  `reference/components/`, regenerated on build and on `.svelte` add/change/unlink in dev.
  Generated folders stay gitignored (the stray tracked `reference/api/README.md` was untracked).
- Guides rewritten from this file and the code: Getting Started, Architecture, Rendering Engine
  (replaces the WASM guide). Starter pages and `houston.webp` removed. README docs, architecture
  and tech-stack sections updated (WASM references removed).
- Deleted (to the trash): `src/routes/mockup`, `src/typescriptPRD.md`, `src/PhoenyxColor.md`.
- Root scripts `docs:dev` / `docs:build`; `.github/workflows/docs.yml` builds the docs on
  pushes/PRs touching `src/` or `docs/`. `.impeccable/` is gitignored.
- Checks: `bun run check:all` → 0 errors, 0 warnings, 174/174 tests. `bun run docs:build` →
  42 component pages, "All internal links are valid", `llms*.txt` emitted. Dev regeneration
  checked by editing a component and restoring it. `actionlint` clean.
- Known gap: sveld cannot read prop types from the `$props<{…}>()` generic form (e.g.
  `AdjustPanel`), so those props show no type. `const { … }: Props = $props()` documents fully.
- Next: unchanged (maintainer sign-off on the References UI phase).

### 2026-10-16 · UI phase, step 3 (References redesign built)

- **Maintainer decisions (2026-10-16):** editor URL `/references?image=<id>`; docked inspector
  (desktop/tablet) and an in-flow sheet without backdrop (phone); panels regrouped with live,
  editable effects; approved: engine size notices, a reactive save state in `EditSession`, the
  Header nav fix, removing the fake rulers. The spec (layout, control map, keyboard, states,
  removals) was signed off before building.
- **Editor shell:** `EditorPanel` is an in-flow inspector (no fixed overlay, no backdrop, no
  `{#key}` remount). The canvas shrinks and refits (`ResizeObserver`; `usePanZoom.isFitted`), and
  refits after crop/rotate/scale. `fitContent` no longer clamps to `minZoom`, so any image fits
  a phone. Desktop opens on Adjust.
- **Panels:** Adjust = Light / Color / Detail / Curves (Curves moved from Filters; sepia, invert,
  grayscale → Color; opacity → Detail). Filters → **Presets**. Crop and Transform → **Crop &
  Rotate** with Crop / Rotate & flip tabs (the crop view is upright, see section 8): the tool opens
  with the applied crop (or the whole image); a ratio pick creates the largest centred box; Done /
  Cancel stay visible (sticky); leaving the tool applies; Esc cancels. Effects: tapping a tile
  adds the effect (one undo step); every applied effect stays editable (intensity, duotone colors,
  live preview, commit on release) through `editor-state.ts#withEffectPatch`. Palette extracts on
  first open, and the palette is lifted to the layout, which fixes a pre-existing bug: "Extract
  palette from this area" never reached the Palette panel. Draw moved to `DrawPanel.svelte`.
  Export shows the real output size, "Fill transparency with white" (off for PNG/WebP; JPEG always
  fills), the downscale note, and warns when the export came out smaller (`isReduced`).
- **Header:** labelled back/undo/redo; compare by tap (toggle), hold (peek), Enter/Space and
  Space-hold; fit and zoom % at every width (on phone % toggles fit/100 %); save status from the
  new `EditSession.hasUnsavedChanges` (Saving… / Saved / Not saved + Retry).
- **Keyboard:** `editor-shortcuts.ts` is the one map for the handler, toolbar/header tooltips
  and the dialog (Draw is listed; Redo shows both spellings). Shortcuts work while a slider or
  button has focus and stay off in text fields. Esc closes dialog → crop → panel → editor. The
  dialog is a native `<dialog>` (focus in, focus back to the opener).
- **Gallery:** title + count, one "Add images" button, "Remove all references" in a separate ⋮
  menu (still undoable). Stable grid (no featured tile; 2 columns on phone). One ⋯ actions popover
  per card and list row (also on right-click), in the top layer and kept inside the viewport.
  Import shows real file names and per-file status. Empty-state copy names only the accepted
  formats. The gallery is `inert` while the editor is open. Transparent thumbnails sit on a
  checkerboard.
- **Split:** `ImageEditorLayout.svelte` 904 → 642 lines; crop interaction →
  `crop-interaction.svelte.ts`, shortcuts → `editor-shortcuts.ts` + `ShortcutsDialog.svelte`, draw
  → `DrawPanel.svelte`, URL → `editor-url.ts`.
- **Accessibility:** every slider has a label; icon buttons have names; touch targets ≥ 44 px
  on phone (pointer-coarse in Layers/Palette); muted text raised to `white/60` / `text-muted`
  (≥ 4.5:1 on void-deep); focus rings on search/sort; reduced motion on the canvas transform and
  card hover.
- **Outside References (approved):** `layout/Header.svelte` gets `relative` (nav pill no longer
  floats mid-screen). `features/references/session.svelte.ts` gets `hasUnsavedChanges` (+ test).
- **Tests added (15):** shortcut map (7), crop interaction (4), URL state (2), effect patch (1),
  save state (1, plus an assertion in the failed-save test).
- **Click counts (from the gallery), before → after:** brighten + export 5 → 4 (phone 6 → 5);
  crop square 5 (+ manual refit) → 4 (box from the ratio, auto refit); pull a palette 3 → 2.
- **Deviation:** slices were verified in the browser together rather than one by one. Each code
  step kept `bun run check` at 0/0.
- **Finish review (impeccable) applied:** crop handles and the size badge keep their screen size
  at any zoom (44 px hit area on touch); Done/Cancel sticky; selected chips use the solid flame,
  not the gradient; Palette's green/violet buttons → neutral + flame; Retry buttons 44 px; dialog
  key chips themed; sort select chevron. Not applied: the toast position (app-wide; section 8).
- **Checks (final):** `bun run check:all` → fmt pass, lint + types 0/0 (147 files),
  `svelte-check` 0/0 (768 files), Vitest 29 files / 174 tests pass (159 → 174). `bun run build` ✔.
  impeccable detector: advisories only (pre-existing type steps and checkerboard grey; section 8).
  Browser walk on the built app, headless Chromium (SwiftShader), fresh profile per width, at
  1440×900, 1024×768 and 390×844 (touch): import 6 fixtures → open (URL `?image=`) → adjust →
  export (PNG, toast with real size) → crop square → rotate → effect → palette → compare → reload
  (editor reopens) → Back (closes) → card menu delete + Undo → right-click menu inside the
  viewport. 0 % of the image hidden by the inspector at every width; no console errors.
- **Not verified:** frame times and a full-size 4000×3000 export (need a real GPU; section 8).
  In the headless walk a second automatic download in the same browser profile closes the tab
  (Chrome's "multiple downloads" prompt); fresh profiles do not, so this is the harness, not the
  app.
- **Next:** maintainer sign-off on the redesign (and the 4K frame-time check), then commit.

### 2026-10-16 · UI phase, step 2 (Phase A: References audit; read-only)

- No source changed. Added `DESIGN.md` + `.impeccable/design.json` (impeccable documenter: the
  current visual system as the redesign's contract; North Star "The Ember in the Void" is
  provisional) and a critique snapshot in `.impeccable/critique/`.
- Walked the journey in headless Chromium (Playwright, SwiftShader) on the built app at
  1440×900, 1024×768 and 390×844 (touch): import 6 fixtures (4000×3000 JPEG, transparent PNG,
  tall, wide, 24 px, long name) → search/sort → open → adjust → filters → crop → rotate → draw →
  palette → effect → layer → undo/redo → compare → reload → export → delete + undo. No console
  errors. Ranked friction list and click counts are in the maintainer report; top items: panels
  cover the image (9 % / 28 % / 51 % of it), keyboard shortcuts die while a slider has focus, no
  URL state, phone hides compare/zoom and cannot fit a 4000 px image (`minZoom` 0.1).
- impeccable detector: 0 findings. Contrast (WCAG): `white/30` on void-deep 2.58:1,
  `text-muted/40` 2.15:1, `/50` 2.72:1, `/60` 3.42:1 (all fail AA).
- Checks: `bun run check:all` at the start: 0/0, 159/159 tests. `bun run build` ✔.
- Next: maintainer answers the layout questions (URL state, docked inspector, panel grouping
  and effects model, approvals), then Phase B spec and sign-off.

### 2026-10-15 · Stage 1 signed off; toolchain moved to Vite+; References UI phase started

- Maintainer signed off Stage 1 (the 4K frame-time check stays open in section 8) and started
  the References UI phase. First step, at their request: move the toolchain to Vite+.
- Ran `vp migrate --no-interactive --no-agent --no-hooks --no-editor` (Vite+ 1.2.0). It moved
  `.oxlintrc.json`/`.oxfmtrc.json` into the `lint`/`fmt` blocks of `vite.config.ts`, aliased
  `vite` to vite-plus-core (Vite 8.3, Rolldown), pinned `vitest` 5.0.4 (plus
  `@vitest/browser-playwright`/`coverage-v8`), rewrote test imports to `vite-plus/test` and the
  anti-slop plugin's `@oxlint/plugins` imports to `vite-plus/lint/plugins`, added `.vitest/` to
  `.gitignore`, and reformatted two files (Oxfmt version change: `PROGRESS.md`, `src/app.css`).
- Follow-up by hand:
  - Removed the three Vitest v4 compatibility settings migrate added (`clearMocks: false`,
    `sharedViteServer: false`, `locators.exact: false`); all tests pass without them.
  - `@sveltejs/vite-plugin-svelte` 6 → 7.3.1: v6 calls Vite 8 support experimental. Kit 2.70.2
    accepts v7.
  - `build.rollupOptions.output.manualChunks` → `build.rolldownOptions.output.codeSplitting.groups`
    (both deprecated in Vite 8; same vendor groups).
  - `plugins: lazyPlugins(…) ?? []`: `lazyPlugins` returns `undefined` when `vp check` loads the
    config, which `exactOptionalPropertyTypes` rejects.
  - Removed the unused `@oxlint/plugins`, `oxlint`, `oxfmt` dev deps.
  - Scripts: `check` now runs `vp check` (with `typeAware` + `typeCheck`) before `svelte-check`;
    added `check:fix`; `test` no longer goes through `npm run`.
- Type-aware lint found issues the old gate did not: tsgo rejected `db.transaction([...stores,
  "meta"], …)` in `core/storage/migration.ts` (fixed with an explicit `StoreName[]`); 16
  unawaited `save()` calls in the palettes/gradients/settings stores and the Ctrl+S handler got
  `void` (no behavior change; the real fix stays with the store rewrites, see section 8); one
  `unbound-method` (`URL.revokeObjectURL` passed bare) in `features/references/editor.svelte.ts`.
- Checks run: before the move, `check:all` green (159/159 tests). After: `bun run check:all`
  → fmt pass, lint + type-check 0 warnings / 0 errors (138 files), `svelte-check` 0/0 (759
  files), Vitest 5.0.4 26 files / 159 tests pass. `bun run build` succeeds with no deprecation
  warnings. `bun run preview` + headless Chromium deep link to `/references`: page renders,
  0 console messages, 0 page errors.
- Not run: the manual import → edit → export journey in a real browser (the Chromium tests cover
  the engine, editor and export paths).
- Next: the References UI audit (UI phase, step 2).

### 2026-09-26 · Stage 1, steps 7d and 8, fallow cleanup (Stage 1 built)

- **Maintainer (2026-09-26), after testing 7b + 7c:** image import and effects work. The editor
  opened "a little zoomed in" and should fit the whole image automatically. Asked to finish 7d
  and Stage 1, and to clear all fallow findings.
- **Fit to view:** the editor now opens fitted to the canvas area (at most 100 %, a small
  margin, `usePanZoom#fitContent`). The header's fit button and **R** fit; **Ctrl+0** is 100 %,
  as the shortcuts dialog already said. Since the preview renders at zoom × devicePixelRatio,
  a fitted large image now renders far fewer pixels per frame.
- **7d:**
  - The Palettes reference picker lists the v2 library (rendered thumbnails). "Extract from
    reference" uses the stored thumbnail (`ReferenceLibrary#thumbnail`), which is the edited
    render, so it still extracts from the image as edited (v1 applied CSS filters to the full
    image). Extraction samples at most 128 px, so 256 px is enough.
  - JSON backup: `references: []`, as decided. The file stays readable by
    `parseImportedState`.
  - Shortcuts: the app-wide Ctrl+Z/Y no longer touch References (the v1 branch is gone), and
    Ctrl+S no longer saves the v1 references. The editor's keydown listener runs in the
    capture phase and stops propagation for the Ctrl shortcuts it handles, so Ctrl+Z/Y undo
    and redo in the editor. On the library page, Ctrl+Z shows the existing "Undo not
    available here" toast; library undo is the delete toast (below).
- **Step 8:**
  - Deleted: `wasm/` (9 tracked Zig files), `static/phoenyx-color.wasm`, `services/wasm.ts`
    (and its `wasm.init()` in `+layout.svelte`), `services/performance.ts`,
    `utils/{effects-processing,image-processing,canvas-renderer,image-filters,layer-compositor}.ts`
    (and `canvas-renderer.test.ts`; its cases were ported to `geometry.test.ts` in step 5),
    `hooks/useImageEditor.svelte.ts`, `components/editor/EditorHistory.svelte.ts` (+ test),
    `stores/references.svelte.ts`, `stores/filter-presets.svelte.ts` (and their fields in
    `RootStore`). The SVG filter defs in `ImageCanvas.svelte` went in 7c.
    `stores/history.svelte.ts` stays: palettes and gradients still use it.
  - The panel types (`ImageEditorState`, `DEFAULT_EDITOR_STATE`, `DrawStroke`,
    `AppliedEffect`) moved to `types/image-editor.ts`. `QuickEffectType` duplicated
    `types/effects#QuickEffect` and was dropped.
  - Curves panel: the drawn curve uses the engine's own `sampleCurve` (the curve drawn is the
    curve applied), and the histogram decodes the original with `createImageBitmap`.
  - Preset tiles: rendered by the engine (the preset on the untouched original, fitted to
    256 px, cached per editor session, revoked on close), not CSS filters. Until a tile's
    render is ready it shows the plain original.
  - **Delete with undo:** deleting (or "Clear") shows the existing toast with an **Undo**
    action that restores the removed references from memory (`ReferenceLibrary#restore`).
    **New copy:** the "Undo" label and "The images could not be restored." on failure.
- **Fallow** (`fallow dead-code`, `fallow dupes`: both "No issues found" now):
  - False positives fixed by making types visible instead of adding markers:
    `let editor: ReferenceEditor | null = $state<ReferenceEditor | null>(null)` and
    `const library: ReferenceLibrary = referenceLibrary()`. The annotation alone made
    TypeScript narrow `editor` to `null`, hence the generic too. `LocalStorageAdapter` (a
    stateless class) became the object `localStorageAdapter`, which clears the long-standing
    `get/set/clear` false positive.
  - `ReferenceLibrary#storeLayerImage` got a real test: a stored layer image is found through
    the recipe and deleted with the reference. That behavior was not tested before.
  - Removed unused re-exports (`ReferenceSchema`, `Reference`, `ExportFormat`) from the
    feature index, and the orphaned `StoredRecordSchemas.references/filterPresets` plus the
    v1 `FilterPresetSchema` in `schemas/validation.ts`.
  - The two copies of the v1 reference shape are now one: `schemas/validation.ts` uses the
    migration's `LegacyReferenceSchema` for the backup/import format. Old backups have to go
    through that conversion (data URLs → blobs) anyway when the deferred import is built.
  - The UI preset type `FilterPreset` clashed with the domain `FilterPreset` and was renamed
    `PanelFilterPreset` (the Filters panel's view, in v1 units).
  - Duplicates: shared `decode` and `engineWithSource` test helpers in
    `engine/fixtures.ts`, one assertion helper for the duotone and gradient-map tests, one
    edit helper in the editor tests, and `History#step` shared by undo and redo (they were
    mirror images).
  - `RootStore`: removed the unused `isReady`, `whenReady`, `setGlobalColor`,
    `clearGlobalColor`, `openMobileMenu` and `spatial`, and its `fallow-ignore` marker.
    **Behavior change (a fix):** `services/spatial-nav.ts` is deleted. It was only reachable
    through the unused `spatial` field, nothing ever registered an element with it, and its
    window keydown handler called `preventDefault` on every arrow key app-wide. So arrow keys
    could not move range sliders anywhere in the app, or scroll. They work now (checked
    below).
  - Left alone: the `fallow-ignore` markers in the palettes/gradients/settings/theme/history
    stores and `palette-utils.ts` (Stages 2–3 rewrite those files; see section 8).
- Checks:
  - `bun run check:all` ✔: format, oxlint, svelte-check 0/0 (745 files), vitest 159/159 in
    26 files. The count went down from 162 because the deleted `EditorHistory` and
    `canvas-renderer` tests went with their code.
  - `fallow dead-code` ✔ and `fallow dupes` ✔. `bun run build` ✔.
  - Headless Chromium on the built app:
    - a 3000×2000 image opens fitted (29 %, whole image visible);
    - flip then Ctrl+Z undoes it in the editor;
    - an arrow key on a focused slider moves it (100 → 101) and records one undo step;
    - 11 preset tiles show engine renders (`blob:` URLs);
    - delete → 0 cards → Undo → 1 card → reload → still 1;
    - `/palettes` opens with its extract action;
    - no console errors.
- **Stage 1 acceptance criteria:** all hold in tests or the headless runs, except one.
  **"Every frame under 16 ms on a 4K image" is not verified:** it needs your real GPU and the
  DevTools Performance panel (walk in section 7, step 4). "Preview = export" is checked on the
  shared render path (`export.browser.test.ts`), not by reading back the on-screen canvas.
- Next: maintainer sign-off on Stage 1 (and the 4K frame-time check). Stage 2 stays blocked
  until then, and its open questions come first. Also due "after Stage 1": decide on the PWA
  (Deferred), update the `docs/` site (section 8), and the Stage 0 leftover (delete
  `src/routes/mockup` and the two old docs, after asking).

### 2026-09-26 · Stage 1, step 7 (7b + 7c: gallery and editor on v2)

- **Maintainer decision (2026-09-26):** 7b and 7c land together. The v1 editor looked images up in
  `app.references`, so a v2 gallery alone would have opened an empty editor between 7b and 7c.
- Plan (each step ended with `check:all` green): 1 adapter · 2 presets + thumbnails + app
  singletons · 3 editor controller · 4 UI rewire · 5 this log.
- **Adapter** `components/editor/editor-state.ts` (UI edge): recipe ⇄ the panels' flat v1-unit
  state (100 ⇄ 0 for brightness/contrast/saturation), layer edits, preset settings both ways,
  v1's preset blending (`presetUpdates`, ported from `useImageEditor`), and gradient-map
  snapshots of the active gradient (positions 0–100 → 0–1) or palette (evenly spaced; one color
  becomes two equal stops). Every result is parsed by `EditRecipeSchema`, so a bad value throws
  instead of being saved. Effects and layers are refused here (they need ids and seeds).
  10 unit tests.
- **Wiring** `features/references/app-library.ts`: lazy `referenceLibrary()`,
  `filterPresetLibrary()` (loads after the library's first load, so v1 presets are migrated
  first) and `openReferenceEditor(id)`. Nothing opens IndexedDB at import time.
  - `thumbnail.ts#renderThumbnail`: one shared engine, WebP fitted inside 256 px, never
    upscaled; `exportThumbnail(engine, recipe)` for an engine that already holds the images.
  - `presets.svelte.ts#FilterPresetLibrary`: presets on v2 (oldest first, as v1 listed them);
    delete removes the preset and its thumbnail in one transaction. 2 tests.
  - Engine: added `sourceSize` and `retainLayerImages(ids)` (frees layer textures the shared
    thumbnail engine no longer needs).
- **Editor** `features/references/editor.svelte.ts#ReferenceEditor` (replaces
  `useImageEditor`): owns the `EditSession` and a `RenderEngine` on the canvas.
  - Rendering: `requestRender(recipe, scale)` draws on the next animation frame (latest request
    wins); preview scale = min(1, zoom × devicePixelRatio). Views: `edit`; `crop` (whole,
    upright source, because the crop is stored in source pixels before rotation); `compare`
    (the neutral recipe).
  - `toSourcePoint` (new `geometry.ts#outputToSource`, the inverse of the geometry pass) maps
    the pointer through rotation/flip/scale/crop, so drawing on a rotated image lands under
    the pointer. v1 ignored the rotation there.
  - Effects: the effect being tried is previewed with a seed chosen when it is picked, and
    applied with that same seed, so the applied result equals the preview.
  - Layers: images are stored as blobs (`storeLayerImage`), not session `blob:` URLs. **Merge
    down really composites** (`layer-merge.ts`: Canvas 2D at source size, the upper layer's
    blend mode and opacity, CSS blend semantics like the engine; the result keeps the lower
    layer's opacity and blend mode, as in Photoshop). One undo step.
  - Export and palette extraction go through the engine (`export`, `editedImage`, and
    `originalRegion` for "extract from region").
  - Thumbnails: about 1 s after each committed change, and on close, the editor renders the
    library thumbnail with its own engine. The first thumbnail after opening is always
    rendered, because a reload saves the recipe (`pagehide`) but never closes the editor.
    Found in the real-browser run below: the grid showed a stale thumbnail.
  - 4 Chromium tests: merge composites (pixels within ±2 of the unmerged render, undo gives
    both layers back); an applied effect renders exactly like its preview; close saves and
    refreshes the thumbnail; a stale thumbnail is re-rendered after a "reload".
- **UI rewire, no markup or styling change** except what the switch itself requires:
  - `ReferencesModule`, `ImageLibrary`, `ImageCard` read `LibraryItem`s (rendered
    thumbnails, so the CSS filter/opacity on cards is gone). Import, delete, clear, duplicate
    and retry use the library. **New copy:** error toasts for a failed delete/duplicate/clear
    and a failed preset save/delete (these failures were silent or impossible before).
  - `ImageCanvas`: the `<img>` stack, the CSS/SVG filters, the layer/gradient-map/duotone/
    vignette/stroke overlays and the SVG filter defs are replaced by one `<canvas>` laid out at
    the full output size (as the `<img>` was). The crop overlay, pan/zoom, rulers and error
    alert are unchanged. The alert shows render errors and save errors.
  - `ImageEditorLayout` opens the editor and converts through the adapter. Panels got a
    preview callback next to the commit one: sliders preview on `input` and commit on
    `change` (Adjust, Transform, Layers opacity, Palette gradient-map opacity, Filters
    intensity); a Curves drag previews and commits on release; a Draw stroke previews while
    drawing and commits on release. One undo entry per gesture.
  - `ExportPanelEnhanced` gets `onExport(options) → Blob` and saves with `core/download`;
    `PalettePanel` gets `getEditedImage() → Blob`.
  - `FiltersPanel` reads and writes presets through `filterPresetLibrary()`.
- **Bugs found and fixed:**
  - `ReferenceLibrary` wrote `$state` proxies from `items` into IndexedDB. Chromium cannot
    clone them (`DataCloneError`) in `restore` and in the thumbnail swap. The node tests
    missed it because Svelte builds no proxies there. It now snapshots before writing, and
    `library.browser.test.ts` covers restore. The test failed before the fix (an accidental
    `git stash` of the fix showed it; restored at once, nothing else touched).
  - Two imports in the same millisecond got equal `createdAt`, so "newest first" could reorder
    a batch after a reload. This made the 7a test flaky: 1 of about 10 full runs failed.
    `createdAt` is now strictly increasing per library.
  - The editor could draw a frame before the source was uploaded ("render() called before
    setSource()" in the console). The engine is now attached only after the upload.
- **Decisions (reversible; tell me if you want otherwise):**
  - Crop mode shows the whole image upright. The crop is stored before rotation, and v1's
    overlay did not line up on rotated images.
  - "Flatten All" merges the visible layers into one layer and drops hidden ones, like
    Photoshop. The photo itself is never changed. v1 just deleted every layer.
  - Applying a preset resets the gradient map, curves, blur and opacity, as v1 did.
  - Export includes the effect being tried, if one is showing, as v1 did.
- Checks:
  - `bun run check:all` ✔: format, oxlint, svelte-check 0 errors / 0 warnings (758 files),
    vitest 162/162 in 28 files. Also ran the library test file 8 times after the timestamp
    fix: all green.
  - `bun run build` ✔. `vite preview`: deep link `/references` returns 200.
  - Real-browser walk in headless Chromium (SwiftShader; Playwright scripts kept out of the
    repo):
    - seed a v1 library with a data-URL image (brightness 150) → open `/references` → it
      migrates, shows the edited thumbnail, and `PhoenyxColorDB` still holds the v1 record;
    - import a PNG with transparency → stored byte-for-byte (219 B in, 219 B stored);
    - edit: a 3-step slider drag makes one undo entry; the undo/redo buttons work;
    - reload → the recipe survives (brightness 160);
    - export PNG at full size (64×32, RGBA);
    - rotate, then draw → the stroke lands under the pointer;
    - crop (upright view) → output 150×200; posterize; two layers, merge down gives one,
      undo gives two back; compare view;
    - no console errors (only SwiftShader's "GPU stall due to ReadPixels" performance
      warning).
- Not verified: the 16 ms frame budget on a 4K image (needs a real GPU and DevTools; still in
  section 8), and pixel equality of the on-screen canvas with the export in the real app. That
  equality is covered by `export.browser.test.ts` on the same render path. A WebGL canvas
  cannot be read back without `preserveDrawingBuffer`.
- Next: 7d. Move the Palettes reference picker, the JSON backup (references left out, per the
  2026-09-26 decision) and the keyboard shortcuts off `app.references`. This includes the
  Ctrl+Z bug in section 8.

### 2026-09-26 · Stage 1, step 7 (in progress: 7a of 7a–7d)

Sub-steps: **7a** library on v2 (done) · 7b gallery rewire (`ReferencesModule`, `ImageLibrary`,
`ImageCard`) · 7c editor rewire (`features/references/editor.svelte.ts` replaces
`useImageEditor`; `ImageCanvas` shows the engine canvas; panels get `onPreview` (slider
`input`) next to `onUpdate` (commit on `change`/pointer-up); a flat v1-units ⇄ recipe adapter
at the UI edge so panel markup stays unchanged; export, layers, strokes, presets and the
gradient-map snapshot) · 7d other consumers (`PalettesModule` reference picker, backup export,
keyboard shortcuts). Stopped after 7a at the maintainer's request; **the app is not wired to v2
yet and behaves exactly as before.**

- **Maintainer decision (2026-09-26):** until the proper backup (export + import with images,
  see "Deferred") is built, the JSON backup leaves references out. Apply this in 7d.
- `core/storage#appDatabase()`: the app's one memoized connection to the v2 DB (a failed open
  is not cached).
- `features/references/library.svelte.ts#ReferenceLibrary` (dependencies passed in: `database`,
  `describeImage`, `renderThumbnail`):
  - `load()`: runs the `references-v1` and `filter-presets-v1` migrations, then re-renders the
    thumbnails of migrated references whose recipe is not neutral (v1 showed edits in the grid
    with CSS filters; v2 shows rendered thumbnails), then reads everything through
    `Repository`. `items` holds `{ reference, thumbnailUrl }`, newest first; object URLs are
    derived state and are revoked when an item leaves.
  - `importImage(file)`: stores the file as-is (full resolution, original bytes) plus the
    thumbnail, the reference and a neutral recipe in one transaction; asks for
    `navigator.storage.persist()` once per session. Names drop the extension, are cut to 100
    characters, and an empty name becomes "Untitled".
  - `remove(id)`: deletes the reference, recipe, original, thumbnail and layer images in one
    transaction and returns the removed bundle; `restore(bundle)` puts it back (for the planned
    delete-with-undo toast).
  - `duplicate(id)`: copies the reference, recipe and **all** its images (layer images too), so
    either copy can be deleted alone.
  - `refreshThumbnail(id)`: re-renders from the current recipe and swaps the thumbnail blob in
    one transaction (for editor close).
  - `original(id)`, `storeLayerImage(blob)`, `layerImages(recipe)` for the editor.
- `library.svelte.test.ts`: 6 tests (fake-indexeddb, node): import keeps bytes + neutral recipe;
  reload lists newest first; delete removes every record and blob, and restore brings them
  back; duplicate is independent of its source; thumbnail refresh swaps the blob; first load
  migrates a v1 library and renders only the edited reference's thumbnail.
- Not yet written: the browser `renderThumbnail` (planned: one shared `RenderEngine`,
  `exportImage` as WebP fitted to 256 px), the singleton that wires the library to
  `appDatabase` + `describeImage` + `renderThumbnail`, and the presets store on v2 (7c).
- Checks: `bun run check:all` ✔ (svelte-check 0/0 on 747 files, vitest 139/139 in 23 files).
- Next: 7b.

### 2026-09-26 · Stage 1, step 6

- `features/references/kmeans.ts#clusterColors(samples, k, seed)`: k-means in OKLab with seeded
  (mulberry32) k-means++ initialization. It stops when assignments settle (≤ 30 iterations),
  returns clusters largest first, and drops empty clusters, so an image with fewer colors than
  asked gives fewer colors (v1 could return duplicates). `kmeans.test.ts`: 4 unit tests.
- `palette.worker.ts` + `palette-extraction.ts#extractPalette(image: Blob, colorCount)`,
  exported from `features/references/index.ts`. The worker decodes (EXIF-aware), draws a
  ≤ 128 px copy, skips pixels with alpha < 128, converts through `core/color`, clusters with a
  fixed seed and returns `#rrggbb` most common first. One lazily started worker serves all
  requests (matched by id); a crashed worker rejects its pending requests and is replaced on the
  next call. `palette-extraction.browser.test.ts`: 3 Chromium tests (finds the two colors of a
  3:1 image, most common first, ignoring a transparent column; same image gives the same
  palette; undecodable input rejects).
- Every call site moved to the worker, with no UI change (each gets a Blob, via
  `fetch(url).blob()`, or the `File` itself in the gradients dialog): `PalettesModule.svelte`,
  `ImageEditorLayout.svelte`, `editor/panels/PalettePanel.svelte`,
  `gradients/dialogs/ImageExtractDialog.svelte`, and `services/color-engine.ts#extractTheme`
  (used by `stores/theme.svelte.ts`). The `quality` option ("fast/balanced/best" = 64/128/256 px)
  is gone; the plan fixes the sample at ≤ 128 px.
- Deleted the old extractor code: `utils/color-engine.ts#extractPalette`,
  `getDownsampledPixelData`, `PaletteOptions`, the quality tables and its `wasm` import
  (`sortPalette` stays); `services/color-engine.ts#getImagePixels` and `quantizeColors`.
  `services/wasm.ts#runKMeans` is now unused; it goes with `services/wasm.ts` in step 8.
- Measured once in headless Chromium, with a temporary test file that was deleted afterwards: a
  3840×2160 PNG took **116–151 ms** end to end (mostly the browser decoding the 4K PNG, in the
  worker, off the main thread), and k-means on a realistic 128×72 sample (k = 8) took **21 ms**.
  That is under the ~100 ms "after downsampling" threshold in section 2, so **no Rust**. A
  worst case (pure noise, 128×128, k = 16, all 30 iterations) took up to 685 ms under full-suite
  load, which is still off the main thread. A wall-clock assertion was tried and removed, because
  it was flaky under parallel test load.
- Found, not touched: `services/color-engine.ts#sortColorsHilbert`/`hilbert3D` have no callers
  (pre-existing dead code, for Stage 2's palette cleanup). `extractTheme`'s only caller,
  `stores/theme.svelte.ts#generateFromImage`, is reached only from `src/routes/mockup` (pending
  deletion, see Stage 0).
- `.gitignore`: added `.vitest-attachments/` (browser-mode failure screenshot copies).
- Checks: `bun run check:all` ✔ (svelte-check 0/0 on 745 files, vitest 133/133 in 22 files);
  `bun run build` ✔ (the worker is emitted as its own chunk).
- Next: Stage 1 step 7 (rewire `ReferencesModule`, `references/*`, `editor/panels/*` onto v2).

### 2026-09-26 · Stage 1, step 5

Sub-steps, each ending with `check:all` green: **5a** browser test mode · 5b engine core
(context, texture, ping-pong, sRGB↔linear, geometry, `render`, `readPixels`) · 5c adjustment
passes · 5d effects, gradient map, layers, strokes · 5e export, context loss, texture-size limit.

- **5a done.** Added dev deps `@vitest/browser-playwright@4.1.10` (pinned to match `vitest`
  4.1.10; the caret range had resolved 4.1.11, and Vitest warns on mismatches) and
  `playwright@^1.63.0`. The plan calls for Vitest browser mode for the engine tests. Downloaded
  Chromium headless shell with `bunx playwright install chromium` (one-time, into
  `~/.cache/ms-playwright`; needed on any new machine).
  - `vite.config.ts`: `test.projects` = `unit` (jsdom, everything except `*.browser.test.ts`)
    and `browser` (Chromium headless, `src/**/*.browser.test.ts`). `check:all` runs both.
  - `image-description.browser.test.ts`: 3 real-Chromium tests (size + 256 px fit, no upscale,
    thumbnail keeps alpha).
  - Removed the Stage 0 leftovers of `file-saver` from `vite.config.ts` (`optimizeDeps.include`
    and a `manualChunks` branch). Browser mode printed "Failed to resolve dependency:
    file-saver" as a warning.
  - Checks: `bun run check:all` ✔ (svelte-check 0/0 on 723 files, vitest 63/63 in 14 files).
- **5b done.** `features/references/engine/`:
  - `geometry.ts`: `outputGeometry` (port of v1 `getOutputGeometry`: clamped crop, rotated
    bounding box, scale) and `sourceToOutputMatrix` (rotate, then flip + scale, like v1's
    canvas transform; y down). `geometry.test.ts`: 8 unit tests, including the 3 ported v1 cases.
  - `webgl.ts`: program compile/link with cached uniform lookups, and render targets
    (`RGBA16F`/`RGBA8` texture + framebuffer, nearest sampling, completeness checked).
  - `engine.ts`: `RenderEngine(canvas)` with `setSource(blob)` (uploaded once as
    `SRGB8_ALPHA8` + mipmaps, `imageOrientation: "from-image"`, `premultiplyAlpha: "none"`),
    `render(recipe, outputScale)` → `{width, height}`, `present()`, `readPixels()` → `ImageData`,
    `dispose()`. Work targets are `RGBA16F` with `EXT_color_buffer_float`, else `RGBA8`.
  - Shaders (`shaders/*.vert|frag`, imported with `?raw`): `geometry` (crop quad transformed in
    the vertex shader), `encode` (linear → sRGB into the 8-bit output), `present` (copy to the
    canvas, y flipped), `fullscreen.vert`.
  - `engine.browser.test.ts`: 7 real-Chromium WebGL2 tests: identity ≈ source within ±1 including
    alpha 0/128; quarter turn clockwise; mirror; crop; preview scale; present sizes the canvas;
    work format reported. Mutation check: an sRGB exponent of 1/2.2 fails 4 of them.
  - `.gitignore`: added `__screenshots__/` (Vitest browser-mode failure screenshots).
- **Deviation from the "Engine" pass order: geometry runs first, not last.** The source is
  resampled once to the output size (viewport × DPR for preview, full size for export), and every
  recipe pass runs at that size. Reasons: (1) per-frame cost scales with the preview size, not a
  4K source, which is what makes the 16 ms target reachable; (2) it keeps v1's meaning, where the
  vignette and effects were applied to the cropped, rotated output. Preview and export still share
  one path, so they match at the same size. Consequence for 5c/5d: blur/clarity radii and stroke
  widths are in source pixels and must be multiplied by the output scale.
  sRGB→linear happens in hardware via the `SRGB8_ALPHA8` source texture.
- Known ceiling: resampling filters straight (not premultiplied) alpha, so a rotated or scaled
  edge between transparent and opaque pixels can show a dark fringe. Upgrade path: premultiply on
  upload and unpremultiply in `encode`.
- Checks: `bun run check:all` ✔ (svelte-check 0/0 on 728 files, vitest 78/78 in 16 files: unit +
  Chromium).
- **5c done.** Adjustment passes, ported from v1's intent (direction and rough strength), not its
  8-bit math:
  - `adjust.frag` (one pass: white balance → tone → color → curves). Linear light. Brightness is
    a gain equal to CSS `brightness()` (`(1 + b)^2.2` in linear). Contrast is a power curve
    around mid grey (0.18). Shadows/highlights reweight perceptual lightness like v1's Zig
    (±0.2 at full weight). Vibrance scales saturation by `(1 − sat) × 0.5` like v1. Hue uses the
    CSS `hue-rotate()` matrix. Sepia (CSS matrix), invert and curves work on encoded sRGB levels,
    as CSS and v1 did. Temperature/tint are channel gains.
  - `curves.ts`: v1's Catmull-Rom sampling, turned into a 256×1 LUT (channel curve, then master
    curve, as v1 composed them), sampled with linear filtering. `curves.test.ts`: 4 unit tests.
  - `adjustments.ts`: recipe → uniforms (pure).
  - `blur.frag`: separable Gaussian, σ = blur × output pixels per source pixel (CSS
    `blur(Npx)` has σ = N), premultiplied inside the kernel so transparent pixels do not bleed.
    Kernel capped at 96 px (a `ponytail:` note in the shader).
  - `clarity.frag`: midtone-weighted unsharp mask on perceptual lightness against a blur with
    σ = 0.8 % of the longer output side, so preview and export look the same.
  - `finish.frag` (was `encode.frag`): v1's vignette (clear to 55 % of the half-size radius,
    then a linear ramp), `opacity` × alpha, then linear → sRGB. Folded into the last pass to
    save a full-screen pass per frame.
  - The engine now keeps three work targets. Passes run through one `#pass(program, output,
    inputs, setUniforms)` helper.
  - `adjust-passes.browser.test.ts`: 15 Chromium tests, each checking the direction of one
    control (brightness, contrast, shadows, highlights, temperature, tint, saturation,
    grayscale, vibrance, hue, sepia, invert, curves, blur, clarity, vignette, opacity).
    `fixtures.ts` holds the shared PNG and pixel helpers. Mutation checks: swapping the
    shadow/highlight weights fails 2 tests; flipping the clarity sign fails 1.
- Checks: `bun run check:all` ✔ (svelte-check 0/0 on 733 files, vitest 97/97 in 18 files).
- **5d done.** Effects, gradient map, layers and strokes:
  - `effects.frag` + `effects.ts`: all 9 effects, one pass each in recipe order, on encoded
    levels, with v1's formulas (posterize levels, solarize threshold, v1's Rec. 601 duotone
    luminance, halftone dots, VHS shift + scanlines + noise, glitch channel shift + displaced
    slices, emboss/sharpen 3×3 kernels). Randomness is a PCG hash of the stored `seed`, never
    `Math.random`. v1 pixel sizes are multiplied by output-px-per-source-px. Pixelate/halftone
    average at most 8×8 samples per block, so the cost stays flat at any size.
  - `blend-modes.glsl`: the 16 W3C blend modes + source-over compositing (straight alpha) in
    encoded sRGB (CSS `mix-blend-mode` semantics). Spliced into shaders at `#include blend-modes`.
  - `gradient-map.frag` + `gradient-map.ts`: 256-entry LUT from the recipe's snapshot stops,
    blended in **OKLab** (v1 used RGB for gradients and LCH for palettes; OKLab is the rewrite's
    color model). Luminance → LUT → blended with its blend mode and opacity, keeping the image's
    alpha.
  - `core/color`: added `cssToSrgb`, `cssToOklab`, `oklabToSrgb`, `mixOklab` (+3 tests), so the
    engine does no color math of its own.
  - Layers: `setLayerImage(blobId, blob)` uploads once. Each visible layer is placed by the
    geometry shader (now a general source-space quad: `u_quadCentre`/`u_quadSize`/`u_uvRect`), so
    it crops, rotates and flips with the photo, then `composite.frag` blends it. Rendering a
    visible layer whose image was never set throws. **Decision:** a layer is fitted inside the
    photo, keeping its aspect ratio, and centred (`geometry.ts#layerRect`). v1 never rendered
    layers and stores no layer transform, so there was nothing to port; a transform can be added
    to the layer schema later without breaking saved recipes.
  - Strokes: `strokes.ts` rasterizes them with Canvas 2D at source size, as v1 drew them (round
    caps/joins; one point = a dot). This happens only when the strokes change (cached by value),
    and the overlay is placed like a layer. `finish.frag` composites it **after** vignette and
    opacity, because v1 drew strokes last.
  - `compositing.browser.test.ts`: 17 Chromium tests (each effect changes pixels and the same
    seed repeats exactly; another seed moves the glitch; posterize levels; duotone; gradient map;
    normal/multiply/screen/darken/difference layers; hidden layer; layer flips with the photo;
    missing layer image throws; stroke drawn above the vignette; stroke moves with the crop).
    Mutation checks: a wrong multiply formula fails 1; a hash that ignores the seed fails 1.
- Checks: `bun run check:all` ✔ (svelte-check 0/0 on 737 files, vitest 122/122 in 19 files).
- **5e done. Step 5 done.**
  - `gpu-resources.ts`: programs, quad, LUT textures, work format and the GPU size limit (min of
    `MAX_TEXTURE_SIZE`, `MAX_RENDERBUFFER_SIZE`, `MAX_VIEWPORT_DIMS`), created and deleted as one
    unit, so a lost context is rebuilt in one call.
  - Engine: keeps the source/layer Blobs (references, not copies). On `webglcontextlost` it
    calls `preventDefault` and drops dead handles; `render` throws while lost. On
    `webglcontextrestored` it rebuilds, re-uploads and calls `onContextRestored` (constructor
    argument), so the UI can re-render. Oversized images are uploaded downscaled with
    `createImageBitmap` `resizeQuality: "high"` (`isSourceDownscaled`); crops and strokes stay in
    original pixels, because UVs are normalized. Output beyond the limit is capped and
    `render` reports `isReduced`. `render` now returns `{ width, height, isReduced }`.
  - `export.ts#exportImage(engine, recipe, { format, scale, quality, hasBackground })`: renders
    through the same path, then encodes PNG/JPEG/WebP. JPEG and "include background" go on
    white, as in v1's export panel.
  - `export.browser.test.ts`: 4 Chromium tests. **An exported PNG decodes to exactly the pixels
    `readPixels` gives at the same size**, on a recipe that touches geometry, adjust, clarity,
    blur, an effect, vignette and strokes (the "preview = export" acceptance criterion, checked
    on opaque pixels). JPEG on white; PNG keeps alpha; WebP type and 2× size. Context loss:
    render refuses while lost, the callback fires once on restore, and output is identical
    afterwards (via `WEBGL_lose_context`). Mutation check: skipping the source re-upload on
    restore fails the context test.
  - Not verified in a test: the size cap (it needs a > 16k-pixel texture, too big for CI) and
    the 16 ms frame budget on a 4K image (headless Chromium uses SwiftShader, a CPU renderer, so
    its timings mean nothing). Both need the real app (step 7) and DevTools.
- Checks: `bun run check:all` ✔ (svelte-check 0/0 on 740 files, vitest 126/126 in 20 files).
- Next: Stage 1 step 6 (palette-from-image worker).

### 2026-09-26 · Stage 1, step 4 (+ step 3 finishing touch)

- Maintainer (2026-09-26): keep going through the steps, update this file as you go. Nobody uses
  the app yet. Running the migrations at boot still waits for step 7, per section 4 ("never
  migrate a collection before its feature reads from v2"); wiring it earlier gains nothing.
- Added `features/references/image-description.ts`: `describeImage(blob)` → `{ width, height,
  thumbnail }`. It uses `createImageBitmap(…, { imageOrientation: "from-image" })`, so EXIF
  rotation is applied (**the engine must upload textures with the same option**), and an
  `OffscreenCanvas` makes a ≤ 256 px WebP thumbnail (PNG where WebP encoding is unsupported),
  never upscaled. The migration and the future import share it. `ImageDescription` moved here
  from `v1-migration.ts`.
- Added `features/references/session.svelte.ts`:
  - `openEditSession(db, referenceId)` loads the saved recipe (through a `Repository`, so a bad
    one is quarantined) or the neutral recipe.
  - `EditSession` owns one `core/history`. `preview` never saves; `commit`/`undo`/`redo` save
    the committed recipe 400 ms later (debounced); `visibilitychange` → hidden and `pagehide`
    save at once; `dispose()` saves and removes the listeners.
  - A failed save sets `saveError` and logs it, and the recipe stays queued for the next save
    (the known issue about unawaited `save()` does not repeat here).
  - No write queue: IndexedDB runs readwrite transactions on the same store in creation order.
- `session.svelte.test.ts`: 8 tests (neutral on open, one undo step per drag, nothing saved
  before 400 ms, previews never saved, hidden page saves at once, undo saves, reopen restores,
  no saves after dispose, failed save reported). Fake timers fake only `setTimeout`/
  `clearTimeout`, because fake-indexeddb schedules with `setImmediate`. Mutation checks: a
  0 ms delay fails the drag test; not removing the listener fails the dispose test.
- Checks run: `bun run check:all`: format ✔, oxlint ✔, svelte-check ✔ 0 errors / 0 warnings
  (693 files), vitest ✔ 60/60 (13 files).
- Next: Stage 1 step 5 (WebGL2 engine + Vitest browser mode).

### 2026-09-26 · Stage 1, step 3

- Added `features/references/v1-migration.ts`:
  - `referencesMigration(describeImage)`: `phoenyx_references` → `references` + `recipes` +
    `blobs`, in one transaction through `runMigration`. The original data URL becomes a Blob
    byte-for-byte (via `fetch`, no re-encode). `describeImage` measures the image and makes the
    256 px thumbnail; it is passed in so the node tests can supply a fake.
  - `filterPresetsMigration`: `phoenyx_filter_presets` → `presets` (+ the thumbnail blob if it
    is a data URL). A preset stores only the settings it set, grouped like the recipe.
  - Each record is parsed by a deliberately loose v1 schema, converted, then parsed by the v2
    schema. Any failure throws, and `runMigration` quarantines the record. v1 range rules are
    not reused: v1 capped `blur` at 10 while its slider went to 20.
- `domain.ts`: added `FilterPresetSchema`/`FilterPreset` and `FilterPresetCategorySchema`.
- `core/storage`: exported `newBlobId`, because a conversion assigns blob ids before the write
  transaction opens.
- `v1-migration.test.ts`: 4 tests against a v1 fixture that has two data-URL images (a
  transparent PNG), a fully edited record, one unreadable record (`blob:` src) and one invalid
  preset. They check the whole mapped recipe, the original bytes kept as-is, the quarantine
  reason, and that `PhoenyxColorDB` still holds every v1 record. Mutation check: changing the
  brightness offset to 99 fails 2 of them.
- Mapping decisions (from reading v1; each reproduces what v1 shows after a reload):
  - `gradientMap` → `null`. v1 drew the map from the active gradient/palette, which is held only
    in memory, so after a reload v1 rendered no map.
  - Layers → `[]`, with a `console.warn` per reference. v1 layer images were `blob:` URLs
    (`ImageEditorLayout` uses `createObjectURL`), which die with the session, and v1 never
    rendered layers. The v1 records stay in `PhoenyxColorDB`.
  - Effects: `"none"` dropped; a duotone without colors dropped (v1 skipped it); seed = the
    effect's index (v1 reseeded glitch/VHS from `Date.now()` on every render).
  - Hex colors normalized with `core/color#toHex`.
  - Width/height come from decoding the image, not v1's optional `dimensions`.
  - Dropped as unused or derived: `position` (nothing reads it), v1 `thumbnailSrc` (it baked in
    the edits; v2 regenerates the thumbnail from the original), `activeLayerId`,
    `gradientMapOpacity`/`BlendMode`.
- Resolved and removed from section 8: the blur range mismatch and the `position` question.
  Added two items there: runtime wiring + browser `DescribeImage` (step 7), and "migrated
  originals stay at v1 JPEG quality".
- Checks run: `bun run check:all`: format ✔, oxlint ✔, svelte-check ✔ 0 errors / 0 warnings
  (690 files), vitest ✔ 52/52 (12 files).
- Deviation: the browser `DescribeImage` and running the migrations at boot are deferred to step 7. The plan forbids migrating before the feature reads v2, and the browser decoder cannot run
  under the node test environment. Real-browser verification of the migration happens then.
- Next: Stage 1 step 4 (edit session: `features/references/session.svelte.ts`).

### 2026-09-26 · Stage 1, step 2

- Added `src/lib/features/references/` (public API in `index.ts`):
  - `domain.ts`: `ReferenceSchema` (id, name, `createdAt` as an ISO string to match the
    `createdAt: string` index, width, height, `originalBlobId`, `thumbBlobId`, tags) and
    `EditRecipeSchema` `version: 1` (`referenceId` · `geometry` · `tone` · `color` · `curves` ·
    `detail` · `effects[]` · `vignette` · `gradientMap` · `opacity` · `layers[]` · `strokes[]`), plus
    `neutralRecipe(referenceId)`, the recipe that renders the original unchanged.
  - `domain.test.ts`: 6 tests (neutral recipe JSON round trip, unknown version rejected, effect
    seed must be a uint32 integer, duotone needs two canonical hex colors, crop needs a positive
    size, gradient map needs ≥ 2 stops).
- `core/storage/blobs.ts`: added `BlobIdSchema` (UUID → `BlobId`) and exported it from the
  storage index, so records can validate the blob ids they hold.
- Recipe decisions (reversible; no v2 data exists yet):
  - Every slider is 0 = neutral. `brightness`/`contrast`/`saturation` go from v1's 0–200 to
    −100…100; step 3 maps them. All other ranges keep the v1 slider ranges (hue 0–360°, blur 0–20
    px, sepia/invert/vignette 0–100, scale 0.1–10).
  - Colors are stored only as lowercase `#rrggbb`; the migration normalizes v1 hex.
  - Effects are a discriminated union on `type`; each has a `seed`, and only `duotone` has
    `colors`. v1's `"none"` effect type is not in the recipe (the migration drops those entries).
  - `gradientMap` is `null` or `{ stops: {color, position 0–1}[] (≥ 2), opacity, blendMode }`
    (the snapshot decided on 2026-09-24).
  - Layers are image layers only, with a required `blobId` and a `kind: "image"` discriminator.
    v1 declares `adjustment`/`overlay` types, but only `useImageEditor.addLayer` creates layers,
    and it always creates `"image"`; the migration quarantines any v1 layer of another type. Pro
    editors (Photoshop, Affinity, Photopea) have adjustment layers, so a future kind (e.g.
    `"adjustment"` carrying its own tone/color/curves) is added as a new variant, which keeps
    existing recipes valid without a version bump. `visible`/`locked` became
    `isVisible`/`isLocked`.
  - IDs use `z.uuid()` (zod 4; `z.string().uuid()` is deprecated). It is stricter (RFC 9562
    variant bits), so step 3 must handle v1 ids that are not RFC UUIDs rather than quarantine them.
  - Left out, as session or derived state: `activeLayerId` and layer thumbnails.
- **Maintainer answers (2026-09-26):** 0 = neutral slider scale approved; `opacity` stays a
  recipe field; image-only layers plus a `kind` discriminator, per the answer to "is this
  standard and future-proof?".
- Deviation: `opacity` is a top-level recipe field that was not in the step's group list. v1 edits
  it (Adjust panel) and the gallery renders it, so dropping it would lose user edits.
- Found two v1 data issues that belong to step 3 and logged them in section 8 (blur range
  mismatch; `position` field).
- The gate was red at the start of this session: the pasted agent prompt at the top of this
  file had two extra blank lines. Ran `oxfmt` on it; whitespace only, the content is unchanged.
- Checks run: `bun run check:all`: format ✔, oxlint ✔ (exit 0), svelte-check ✔ 0 errors /
  0 warnings (688 files), vitest ✔ 48/48 (11 files).
- Nothing is wired to the app yet.
- Next: Stage 1 step 3 (references + filter-presets migration, v1 fixture with data URLs and one
  invalid record).

### 2026-09-24 · Stage 1, step 1

- Added `src/lib/core/storage/` (public API in `index.ts`):
  - `database.ts`: `openDatabase()` opens DB `phoenyx` v1 with the seven stores from "Storage v2".
    Record stores are typed `unknown`, because every read goes through a schema.
  - `repository.ts`: `Repository<TSchema>` (`get`/`getAll`/`put`/`delete`, one record per write).
    A record that fails its schema on read moves to a `meta` quarantine entry: the copy and the
    delete happen in one transaction, and the record is re-checked inside it first.
  - `blobs.ts`: `BlobId` brand, `newBlobId`, `putBlob`, `getBlob`.
  - `migration.ts`: `runMigration(db, migration)`. It reads one `PhoenyxColorDB`/`keyval` key
    (read only; the old DB is kept) and parses each record. Conversion runs outside the
    transaction, so it may be async. Then one transaction writes the records, the quarantine
    entries and, last, the marker. If the marker already exists, the run is a no-op. A failed
    write aborts the transaction, so nothing is written.
  - `meta.ts`: key helpers and `QuarantineEntry`.
  - `storage.test.ts`: 8 tests (store layout, repository quarantine, blob round trip, migration
    happy path + quarantine + legacy kept, rerun is a no-op, failed write writes nothing and a
    retry succeeds, a missing legacy key still gets its marker).
- Ran `oxfmt` on `PROGRESS.md`: the gate was red at the start of this session because this file
  was not formatted (tables and `*emphasis*` only; no content change).
- Checks run: `bun run check:all`: format ✔, oxlint ✔ (exit 0), svelte-check ✔ 0 errors /
  0 warnings, vitest ✔ 42/42 (rerun after the fallow cleanup, same result).
- Deviations:
  - The schema version is not stored in `meta`; the IndexedDB version already is the schema version.
  - The blob store has no delete helper. Deleting blobs belongs in the feature's cross-store
    transaction (reference + blobs + recipe), which the feature opens with `db.transaction`.
  - `storage.test.ts` runs in Vitest's `node` environment, because jsdom's `Blob` does not
    survive structured cloning into `fake-indexeddb`.
- Nothing is wired to the app yet; the v2 database is not opened at runtime until a feature uses it.
- Next: Stage 1 step 2 (`features/references/domain`: `Reference` + versioned `EditRecipe`).
- **Decision (maintainer, 2026-09-24):** the recipe stores a **snapshot** of the gradient-map
  colors, taken when the map is applied (not a link to a palette/gradient). Reason: the preview
  and the export must match, and so must reloads, even after the source palette changes or is
  deleted. Today `ImageCanvas.svelte#getGradientTableValues` reads the app-wide active
  gradient/palette, and `canvas-renderer.ts` ignores the gradient map. Both go away in Stage 1.
- Fallow cleanup (`fallow dead-code`, `fallow dupes`):
  - Unused code removed: the `DATABASE_NAME`/`newBlobId` exports and the extra
    `core/storage/index.ts` re-exports, `Repository.delete` (re-add it when a caller needs it),
    `IndexedDBAdapter.remove`, `LocalStorageAdapter.remove`.
  - `ReferenceImageSchema` (`schemas/validation.ts`) and `PageMetadata` (`config/seo.ts`) were
    used only inside their own files, so they are no longer exported.
  - Added `.fallowrc.jsonc`: it ignores the vendored `tools/oxlint/anti-slop/**` (mirroring
    `.oxlintrc.json`) and its `@oxlint/plugins` dependency, and it keeps `parseImportedState`
    for the deferred backup import.
  - Left as is: `LocalStorageAdapter.get/set/clear` are reported unused, but they are used through
    `storage.local` (a fallow false positive; the only way to silence it is a marker, which
    section 5 bans). The duplicated code in `services/wasm.ts` is deleted in step 8.
    `History.undo`/`redo` are deliberate mirror images.

### 2026-09-24 · Stage 0

- Wrote the rewrite plan; the maintainer approved it. Decisions: local-first/no server; WebGL2 +
  Rust only if needed; module-by-module stages in the order References → Palettes → Gradients;
  Palettes serves both artists and UI designers.
- Did all of the Stage 0 items ticked above. Fixed two bugs along the way: `spatial-nav.ts` never
  removed its keydown listener (`.bind(this)` made a new function on each call), and the Settings
  backup export skipped the envelope, so its files could not be re-imported.
- Checks run: `bun run check:all`: format ✔, oxlint ✔ (0/0), svelte-check ✔ (0/0), vitest ✔ 34/34.
  `bun run build` ✔. Deep links `/palettes` and `/gradients` return 200 in `vite preview`.
- Deviation: v2 DB and migrations moved to Stage 1+ (reason in the Stage 0 section).
- Nothing committed yet; the maintainer decides when to commit.
- Next: Stage 1 step 1 (`core/storage` v2).
