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

Last updated: 2026-09-26 · Current stage: **Stage 1 (steps 1–6 of 8 done; step 7 in progress: 7a done)** · Stage 0: done except the items listed under Stage 0

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

1. **Backend/architecture phase only. No UI changes.** Markup, styling, layout, copy and visual
   design stay exactly as they are. You may change what a component _reads from or calls_
   (rewiring). You may not change what it _looks like_. The UI redesign is a separate, later phase
   and is not planned yet.
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

| Command                           | What it does                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `bun run check:all`               | **The gate.** `oxfmt --check` → `oxlint` → `svelte-kit sync` → `svelte-check` → `vitest --run`. Must be 0 errors / 0 warnings. |
| `bun run lint` / `lint:fix`       | oxlint + the vendored anti-slop plugin (`tools/oxlint/anti-slop`, all rules at `"error"`)                                      |
| `bun run format` / `format:check` | oxfmt (tabs, width 100, double quotes, `es5` trailing commas)                                                                  |
| `bun run build` / `preview`       | static SPA build into `build/`                                                                                                 |

- Package manager: **bun**. Never use npm/yarn/pnpm lockfiles.
- `.oxfmtrc.json` uses **oxfmt/Prettier option names** (`useTabs`, `printWidth`, …). The Biome
  names (`indentStyle`, `lineWidth`) are silently ignored; that bug has already been fixed once.
- `.oxlintrc.json` turns off `no-unassigned-vars` for `*.svelte` only, because oxlint cannot see
  Svelte `bind:this` assignments. Do not widen that override.
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
- [ ] Delete `src/routes/mockup`, `src/typescriptPRD.md` and `src/PhoenyxColor.md` once the new
      docs cover their content (to do when writing docs; check with the maintainer first)
- **Deviation from the plan:** the v2 database and the migrations moved to Stage 1 and later (see
  "Storage v2"). Migrating before a feature switched to v2 would have lost edits.

### Stage 1: References rewrite · 🚧 in progress

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
7. [ ] Rewire (no visual change): `ReferencesModule`, `references/*`, `editor/panels/*`.
8. [ ] Delete the old code: `wasm/`, `static/phoenyx-color.wasm`, `services/wasm.ts`,
       `utils/{effects-processing,image-processing,canvas-renderer,image-filters,layer-compositor}.ts`,
       `hooks/useImageEditor.svelte.ts`, `components/editor/EditorHistory.svelte.ts`,
       `stores/references.svelte.ts`, `stores/filter-presets.svelte.ts`, `stores/history.svelte.ts`
       (once nothing uses it), `services/performance.ts`, the SVG filter defs in `ImageCanvas.svelte`.
       Library-level undo becomes delete-with-undo-toast (soft delete).

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

### Stage 2: Palettes · 🔒 blocked until Stage 1 is signed off

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
- The UI redesign phase.
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

| Issue                                                                                                                                                                                                                                                                                                                                                                                    | Where                                                                          | Fixed in                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------- |
| Import shrinks every image to 1920×1080 JPEG, which destroys PNG transparency                                                                                                                                                                                                                                                                                                            | `services/performance.ts#optimizeImage`, `ReferencesModule.svelte#processFile` | Stage 1                               |
| Preview ≠ export (CSS/SVG filters vs Canvas2D path)                                                                                                                                                                                                                                                                                                                                      | `hooks/useImageEditor.svelte.ts`, `utils/canvas-renderer.ts`                   | Stage 1                               |
| Two undo systems per edit; every slider commit rewrites the whole references array (with base64 images) to IDB                                                                                                                                                                                                                                                                           | `useImageEditor.handleStateUpdate → syncToStore → ReferenceStore.update`       | Stage 1                               |
| History clones layer data URLs on every step (`JSON.parse(JSON.stringify)`)                                                                                                                                                                                                                                                                                                              | `components/editor/EditorHistory.svelte.ts`                                    | Stage 1                               |
| `mergeDown` deletes the layer instead of merging it; layers never appear in the render                                                                                                                                                                                                                                                                                                   | `useImageEditor.mergeDown`                                                     | Stage 1                               |
| Pixel ops run on the main thread, in gamma space, with a copy into and out of WASM each time                                                                                                                                                                                                                                                                                             | `services/wasm.ts#processImage`                                                | Stage 1                               |
| ~~Two separate image-palette extractors with different algorithms~~ fixed in step 6 (one worker)                                                                                                                                                                                                                                                                                         | see Stage 1 step 6                                                             | Stage 1 ✔                             |
| The palettes, gradients and filter-presets stores call `save()` without awaiting it or catching errors, so failed writes (e.g. storage full) go unnoticed                                                                                                                                                                                                                                | `stores/*.svelte.ts`                                                           | Stages 1–3 (stores replaced)          |
| Mesh gradient: per-pixel JS on the main thread, `Math.random` noise (no two renders match), CSS export is a separate approximation                                                                                                                                                                                                                                                       | `gradients/MeshGradientCanvas.svelte`                                          | Stage 3                               |
| `interpolateGradientColors` maps `oklch`→`lch` and `oklab`→`lab` for chroma-js, so gradients labelled OKLCH are not actually OKLCH                                                                                                                                                                                                                                                       | `gradients/gradient-utils.ts`                                                  | Stage 3                               |
| The migrations are built and tested but not run at runtime yet. The browser `describeImage` exists (`image-description.ts`) but has no test yet: it needs Vitest browser mode (step 5). Running the migrations belongs with the references UI reading v2 (never migrate before the feature reads v2)                                                                                     | `features/references/v1-migration.ts`                                          | Stage 1 step 7                        |
| v1 originals were already recompressed to ≤ 1920×1080 JPEG on import (known issue above). The migration keeps those bytes as-is, so migrated images stay at v1 quality; only new imports get full resolution                                                                                                                                                                             | `features/references/v1-migration.ts`                                          | not fixable (data already lost in v1) |
| Removing a layer leaves its image in `blobs` (undo may bring the layer back); only images the final recipe points to are deleted with the reference. Needs an orphan-blob sweep                                                                                                                                                                                                          | `features/references/library.svelte.ts`                                        | later (not planned)                   |
| Engine ceilings (each has a `ponytail:` note or a log entry): resampling filters straight alpha (dark fringe possible on rotated transparent edges; fix: premultiply on upload); blur kernel capped at 96 px; output and textures capped at the GPU limit (fix: tiles); export goes through a 2D canvas, which premultiplies, so semi-transparent export pixels can lose color precision | `features/references/engine/`                                                  | when a user hits one                  |
| 16 ms frame budget on a 4K image is unmeasured (headless Chromium has no GPU)                                                                                                                                                                                                                                                                                                            | engine                                                                         | Stage 1 step 7 (DevTools, real app)   |
| The `docs/` Astro site still describes the Zig WASM architecture                                                                                                                                                                                                                                                                                                                         | `docs/src/content/docs/guides/*`                                               | after Stage 1                         |

## 9. Progress log (newest first)

Add one entry per work session: date, stage, what changed, checks actually run, any deviations,
and what comes next.

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
