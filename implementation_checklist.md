# PhoenyxColor Architecture Overhaul Checklist

## Phase 1: Foundation & Storage
- [x] **Scaffold Directory Structure**
    - [x] Create `src/lib/stores`
    - [x] Create `src/lib/services/storage`
    - [x] Create `src/lib/components/features`
    - [x] Create `src/lib/components/ui`
- [x] **Implement Storage Service**
    - [x] `adapter.interface.ts` (Define common interface)
    - [x] `adapter.local.ts` (LocalStorage implementation)
    - [x] `adapter.idb.ts` (IndexedDB implementation using `idb`)
    - [x] `index.ts` (Unified StorageService class)
- [x] **Implement History Primitive**
    - [x] `history.svelte.ts` (Generic Undo/Redo stack)

## Phase 2: Store Migration (The "Split")
- [x] **Settings Store**
    - [x] Create `settings.svelte.ts`
    - [x] Migrate settings logic from `app.svelte.ts`
    - [x] Connect to `LocalStorageAdapter`
- [x] **Palette Store**
    - [x] Create `palettes.svelte.ts`
    - [x] Migrate palette logic (CRUD, colors)
    - [x] Connect to `IndexedDBAdapter`
- [x] **Gradient Store**
    - [x] Create `gradients.svelte.ts`
    - [x] Migrate gradient logic
    - [x] Connect to `IndexedDBAdapter`
- [x] **Reference Store**
    - [x] Create `references.svelte.ts`
    - [x] Migrate reference image logic
    - [x] Connect to `IndexedDBAdapter` (Handle Blob/File storage)
- [x] **Root Store**
    - [x] Create `root.svelte.ts` to compose all stores

## Phase 3: Component Refactoring
- [x] **Refactor Navigation**
    - [x] Update to use `RootStore`
- [ ] **Refactor Settings Page**
    - [ ] Update to use `settingsStore`
- [ ] **Refactor Palette Editor**
    - [ ] Update to use `paletteStore`
- [ ] **Refactor Reference Canvas**
    - [ ] Update to use `referenceStore`

## Phase 4: Cleanup & Verification
- [ ] **Data Migration**
    - [ ] Write script to migrate existing `localStorage` data to `IndexedDB`
- [ ] **Cleanup**
    - [ ] Delete `app.svelte.ts` (The old God Store)
    - [ ] Delete `persistence.ts` and `simpleStorage.ts`
- [ ] **Verification**
    - [ ] Test persistence (reload page)
    - [ ] Test undo/redo
    - [ ] Test large image handling
