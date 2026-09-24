# PhoenyxColor rewrite: vision and progress log

> **Read this whole file before you change any code.** It is the source of truth for the rewrite:
> what the product is for, what has been decided, and what stage the work is in. If something here
> conflicts with your own judgement, ask the maintainer. Do not quietly deviate.
>
> **Work in stages. One stage at a time.** Finish the current stage, meet its acceptance criteria,
> log it here, and get the maintainer's sign-off. Only then start the next stage. Never start work
> from a later stage "while you're in there".

Last updated: 2026-09-24 · Current stage: **Stage 1 (not started)** · Stage 0: done except the items listed under Stage 0

---

## 1. Product vision

PhoenyxColor is a **free, easy-to-use color suite for individual artists and creatives of every
kind.** Two example users:

- an artist who wants to pull a color palette out of a photo so they can draw with it;
- a UI designer who wants to see how a color scheme actually looks and whether it is accessible.

It is **not** a business or team product. There are no accounts, no paywall, and no server. The
goal is a tool artists actually use: fast, reliable, and pleasant to use.

The app has three modules. Each gets rewritten in its own stage, in this order:

| # | Module (route) | Job it must do |
|---|---|---|
| 1 | **References** (`/references`) | Picsart-style photo editor. Import images, apply non-destructive edits (crop/rotate/flip, tone, color, curves, effects, layers, drawing), export. **The main product. Top priority.** |
| 2 | **Palettes** (`/palettes`) | (a) Artist palettes: extract from an image, harmonies, color-blind preview, lock + regenerate. (b) UI scheme builder: map colors to roles (background/surface/text/accent), check WCAG + APCA contrast, generate OKLCH tonal scales, export as CSS variables / Tailwind / JSON tokens. |
| 3 | **Gradients** (`/gradients`) | Linear, radial, conic, and mesh gradients in OKLCH. The preview must match the export exactly. |

"References" is the existing domain name for the image editor tab. Keep that name in code. Do not
introduce synonyms like "photos", "images module" or "editor module" for the same concept.

## 2. Hard constraints (non-negotiable)

1. **Backend/architecture phase only. No UI changes.** Markup, styling, layout, copy and visual
   design stay exactly as they are. You may change what a component *reads from or calls*
   (rewiring). You may not change what it *looks like*. The UI redesign is a separate, later phase
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
  `presets`, `palettes`, `gradients`, `meta` (schema version, per-collection migration markers,
  quarantine).
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

WebGL2 on the main thread. Upload the source texture once, then run the recipe as fragment passes
over ping-pong framebuffers (`RGBA16F` when `EXT_color_buffer_float` is available, else `RGBA8`).
Pass order: sRGB→linear · white balance · tone · color · curves (256×1 LUT texture) · clarity/sharpen
· effects · layer composite (all 16 blend modes in-shader) · vignette · linear→sRGB. Geometry
(crop/rotate/flip/scale) goes in the final vertex transform. Strokes are rasterized once per change
into an overlay texture. The same `render(recipe, target)` function drives preview (viewport × DPR)
and export (full resolution: `readPixels` → `OffscreenCanvas.convertToBlob` → `core/download`).
Handle `webglcontextlost`/`webglcontextrestored`. Images larger than `MAX_TEXTURE_SIZE` get
downscaled with a notice (known ceiling; the upgrade path is tiled rendering). Shaders live in
`.glsl` files imported with Vite `?raw`.

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

| Command | What it does |
|---|---|
| `bun run check:all` | **The gate.** `oxfmt --check` → `oxlint` → `svelte-kit sync` → `svelte-check` → `vitest --run`. Must be 0 errors / 0 warnings. |
| `bun run lint` / `lint:fix` | oxlint + the vendored anti-slop plugin (`tools/oxlint/anti-slop`, all rules at `"error"`) |
| `bun run format` / `format:check` | oxfmt (tabs, width 100, double quotes, `es5` trailing commas) |
| `bun run build` / `preview` | static SPA build into `build/` |

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

### Stage 1: References rewrite · ⏳ next

Build in this order. Each step ends with `check:all` green.

1. [ ] `core/storage` v2: DB schema, typed repositories, blob store, migration runner (per
       collection, marker written last, quarantine in `meta`).
2. [ ] `features/references/domain`: `Reference` (metadata only: id, name, createdAt, width,
       height, `originalBlobId`, `thumbBlobId`, tags) and `EditRecipe` (versioned zod schema,
       JSON only: geometry · tone · color · curves · detail · `effects[]` each with a stored
       **seed** · vignette · `layers[]` referencing blob ids · `strokes[]`).
3. [ ] References + filter-presets migration: v1 fields → recipe (e.g. `brightness: 100` means
       neutral); data URLs → Blobs. Test it against a v1 fixture that includes data-URL images and
       one invalid record.
4. [ ] Edit session (`features/references/session.svelte.ts`): one per open image; owns one
       `core/history`; slider drag = `preview`, pointer-up = `commit` (one undo entry per gesture);
       recipe saved debounced (~400 ms) and on `visibilitychange`/`pagehide`.
5. [ ] WebGL2 engine (see "Engine"), preview + export through the same `render`.
6. [ ] Palette-from-image: k-means in OKLab on a ≤128 px downsample, in a Web Worker, fixed seed.
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

| Issue | Where | Fixed in |
|---|---|---|
| Import shrinks every image to 1920×1080 JPEG, which destroys PNG transparency | `services/performance.ts#optimizeImage`, `ReferencesModule.svelte#processFile` | Stage 1 |
| Preview ≠ export (CSS/SVG filters vs Canvas2D path) | `hooks/useImageEditor.svelte.ts`, `utils/canvas-renderer.ts` | Stage 1 |
| Two undo systems per edit; every slider commit rewrites the whole references array (with base64 images) to IDB | `useImageEditor.handleStateUpdate → syncToStore → ReferenceStore.update` | Stage 1 |
| History clones layer data URLs on every step (`JSON.parse(JSON.stringify)`) | `components/editor/EditorHistory.svelte.ts` | Stage 1 |
| `mergeDown` deletes the layer instead of merging it; layers never appear in the render | `useImageEditor.mergeDown` | Stage 1 |
| Pixel ops run on the main thread, in gamma space, with a copy into and out of WASM each time | `services/wasm.ts#processImage` | Stage 1 |
| Two separate image-palette extractors with different algorithms | see Stage 1 step 6 | Stage 1 |
| The palettes, gradients and filter-presets stores call `save()` without awaiting it or catching errors, so failed writes (e.g. storage full) go unnoticed | `stores/*.svelte.ts` | Stages 1–3 (stores replaced) |
| Mesh gradient: per-pixel JS on the main thread, `Math.random` noise (no two renders match), CSS export is a separate approximation | `gradients/MeshGradientCanvas.svelte` | Stage 3 |
| `interpolateGradientColors` maps `oklch`→`lch` and `oklab`→`lab` for chroma-js, so gradients labelled OKLCH are not actually OKLCH | `gradients/gradient-utils.ts` | Stage 3 |
| The `docs/` Astro site still describes the Zig WASM architecture | `docs/src/content/docs/guides/*` | after Stage 1 |

## 9. Progress log (newest first)

Add one entry per work session: date, stage, what changed, checks actually run, any deviations,
and what comes next.

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
