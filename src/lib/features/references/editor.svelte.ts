import { SvelteMap } from "svelte/reactivity";
import { toHex } from "$lib/core/color";
import type { BlobId, PhoenyxDatabase } from "$lib/core/storage";
import type { QuickEffect } from "$lib/types/effects";
import type { ReferenceId } from "$lib/types/brands";
import { neutralRecipe, type EditRecipe, type Reference } from "./domain";
import { RenderEngine } from "./engine/engine";
import { exportImage, type ExportedImage, type ExportOptions } from "./engine/export";
import {
	outputGeometry,
	outputToSource,
	type CropRect,
	type OutputGeometry,
	type Point,
} from "./engine/geometry";
import { mergeLayerImages } from "./layer-merge";
import { exportThumbnail } from "./thumbnail";
import type { ReferenceLibrary } from "./library.svelte";
import { openEditSession, type EditSession } from "./session.svelte";

type Effect = EditRecipe["effects"][number];
type RecipeLayer = EditRecipe["layers"][number];
type Geometry = EditRecipe["geometry"];

/**
 * What the canvas shows: the edit; the uncropped, unrotated image while a crop is drawn (the crop
 * is in source pixels, before rotation); or the untouched original while comparing.
 */
export type EditorView = "edit" | "crop" | "compare";

const UPRIGHT: Geometry = { crop: null, rotation: 0, flipX: false, flipY: false, scale: 1 };
const DEFAULT_EFFECT_INTENSITY = 50;
/** Palette extraction samples ≤ 128 px, so a small render is plenty. */
const EXTRACTION_SIZE = 512;
const MAX_LAYER_NAME_LENGTH = 100;
/** How long after a change the library thumbnail is re-rendered. */
const THUMBNAIL_DELAY_MS = 1000;

function randomSeed(): number {
	return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

function canonicalHex(css: string): string {
	const hex = toHex(css);
	if (hex === undefined) throw new Error(`Unreadable color "${css}".`);
	return hex;
}

/**
 * One open reference in the editor: its edit session (history + saving), the WebGL engine that
 * draws the preview and the export, and the session state that is not part of the recipe (the
 * effect being tried, the active layer). Object URLs are derived state, revoked on `close`.
 */
export class ReferenceEditor {
	readonly reference: Reference;
	readonly session: EditSession;
	/** Object URL of the original, for the histogram and the preset previews. */
	readonly originalUrl: string;
	activeLayerId = $state<string | null>(null);
	/** The effect picked in the Effects panel but not applied yet; previewed on the canvas. */
	quickEffect = $state<QuickEffect>("none");
	effectIntensity = $state(DEFAULT_EFFECT_INTENSITY);
	duotoneColors = $state<[string, string]>(["#000000", "#ffffff"]);
	renderError = $state<string | null>(null);
	/** The original is larger than the GPU allows, so preview and export are downscaled. */
	isSourceDownscaled = $state(false);
	readonly #library: ReferenceLibrary;
	readonly #original: Blob;
	/**
	 * The recipe the library thumbnail shows, as JSON. Unknown at open: the last session may have
	 * ended with a reload before its thumbnail was rendered, so the first one is always rendered.
	 */
	#thumbnailRecipe: string | null = null;
	#thumbnailTimer: ReturnType<typeof setTimeout> | undefined;
	/** Small renders for the preset tiles, by recipe JSON; revoked on close. */
	readonly #previewUrls = new Map<string, Promise<string>>();
	/** The layer images this session has loaded, and their object URLs (reactive, for the panel). */
	readonly #layerImages = new Map<BlobId, Blob>();
	readonly #layerUrls = new SvelteMap<BlobId, string>();
	#engine: RenderEngine | null = null;
	/** Chosen with the effect, so the preview and the applied effect render identically. */
	#pendingSeed = randomSeed();
	#queued: { recipe: EditRecipe; scale: number } | null = null;
	#frame = 0;
	#isClosed = false;

	private constructor(
		library: ReferenceLibrary,
		reference: Reference,
		session: EditSession,
		original: Blob
	) {
		this.#library = library;
		this.reference = reference;
		this.session = session;
		this.#original = original;
		this.originalUrl = URL.createObjectURL(original);
	}

	static async open(
		library: ReferenceLibrary,
		database: PhoenyxDatabase,
		id: ReferenceId
	): Promise<ReferenceEditor> {
		await library.whenReady();
		const reference = library.find(id)?.reference;
		if (!reference) throw new Error("This reference no longer exists.");
		const original = await library.original(id);
		const session = await openEditSession(database, id);
		const editor = new ReferenceEditor(library, reference, session, original);
		await editor.#loadLayerImages(session.recipe);
		return editor;
	}

	get recipe(): EditRecipe {
		return this.session.recipe;
	}

	/** The effect being tried, as it would be applied. */
	get pendingEffect(): Effect | null {
		const intensity = this.effectIntensity;
		const seed = this.#pendingSeed;
		if (this.quickEffect === "none") return null;
		if (this.quickEffect === "duotone") {
			const [dark, light] = this.duotoneColors;
			return {
				type: "duotone",
				intensity,
				seed,
				colors: [canonicalHex(dark), canonicalHex(light)],
			};
		}
		return { type: this.quickEffect, intensity, seed };
	}

	/** The recipe the canvas shows in `view`. */
	displayedRecipe(view: EditorView): EditRecipe {
		if (view === "compare") return neutralRecipe(this.reference.id);
		const pending = this.pendingEffect;
		const recipe = pending
			? { ...this.recipe, effects: [...this.recipe.effects, pending] }
			: this.recipe;
		return view === "crop" ? { ...recipe, geometry: UPRIGHT } : recipe;
	}

	/** Full-resolution size of what the canvas shows; the canvas is laid out at this size. */
	displaySize(view: EditorView): OutputGeometry {
		const { width, height } = this.reference;
		return outputGeometry(width, height, this.displayedRecipe(view).geometry);
	}

	/** Maps a point on the displayed canvas (full-resolution pixels) to source pixels. */
	toSourcePoint(view: EditorView, point: Point): Point {
		const { width, height } = this.reference;
		return outputToSource(width, height, this.displayedRecipe(view).geometry, point);
	}

	layerUrl(layer: RecipeLayer): string | undefined {
		return this.#layerUrls.get(layer.blobId);
	}

	/** Starts drawing into `canvas`. Call once the canvas is in the DOM. */
	async attach(canvas: HTMLCanvasElement): Promise<void> {
		try {
			const engine = new RenderEngine(canvas, () => this.#scheduleFrame());
			await engine.setSource(this.#original);
			this.isSourceDownscaled = engine.isSourceDownscaled;
			for (const [blobId, image] of this.#layerImages) await engine.setLayerImage(blobId, image);
			if (this.#isClosed) {
				engine.dispose();
				return;
			}
			// Only now: a frame drawn before the source is uploaded would fail.
			this.#engine = engine;
			this.#scheduleFrame();
			this.#scheduleThumbnail();
		} catch (cause) {
			console.error("The editor could not start rendering:", cause);
			this.renderError = "The preview could not be rendered.";
		}
	}

	/** Draws `recipe` on the next animation frame; only the latest request per frame is drawn. */
	requestRender(recipe: EditRecipe, scale: number): void {
		this.#queued = { recipe: $state.snapshot(recipe), scale };
		this.#scheduleFrame();
	}

	preview(next: EditRecipe): void {
		this.session.preview(next);
	}

	/** One undo step. Without `next` it commits the current preview, if there is one. */
	commit(label: string, next?: EditRecipe): void {
		if (next === undefined && !this.session.history.isPreviewing) return;
		this.session.commit(label, next);
		this.#scheduleThumbnail();
	}

	undo(): void {
		this.session.undo();
		this.#scheduleThumbnail();
	}

	redo(): void {
		this.session.redo();
		this.#scheduleThumbnail();
	}

	selectEffect(effect: QuickEffect): void {
		this.quickEffect = effect;
		this.#pendingSeed = randomSeed();
	}

	applyEffect(): void {
		const pending = this.pendingEffect;
		if (!pending) return;
		this.commit("Apply Effect", { ...this.recipe, effects: [...this.recipe.effects, pending] });
		this.selectEffect("none");
		this.effectIntensity = DEFAULT_EFFECT_INTENSITY;
	}

	removeEffect(index: number): void {
		const effects = this.recipe.effects.filter((_, i) => i !== index);
		this.commit("Remove Effect", { ...this.recipe, effects });
	}

	clearEffects(): void {
		this.commit("Clear Effects", { ...this.recipe, effects: [] });
	}

	async addLayerImage(image: Blob, name: string): Promise<void> {
		const blobId = await this.#library.storeLayerImage(image);
		await this.#addLayerImage(blobId, image);
		const layer: RecipeLayer = {
			kind: "image",
			id: crypto.randomUUID(),
			name: name.slice(0, MAX_LAYER_NAME_LENGTH),
			blobId,
			opacity: 1,
			blendMode: "normal",
			isVisible: true,
			isLocked: false,
		};
		this.commit("Add Layer", { ...this.recipe, layers: [...this.recipe.layers, layer] });
		this.activeLayerId = layer.id;
	}

	removeLayer(layerId: string): void {
		const layers = this.recipe.layers.filter((layer) => layer.id !== layerId);
		this.commit("Remove Layer", { ...this.recipe, layers });
		if (this.activeLayerId === layerId) this.activeLayerId = layers.at(-1)?.id ?? null;
	}

	/** A layer edit; `isPreview` for a slider mid-drag, committed on release. */
	updateLayer(layerId: string, updates: Partial<RecipeLayer>, isPreview = false): void {
		const layers = this.recipe.layers.map((layer) =>
			layer.id === layerId ? { ...layer, ...updates } : layer
		);
		if (isPreview) this.preview({ ...this.recipe, layers });
		else this.commit("Update Layer", { ...this.recipe, layers });
	}

	reorderLayers(fromIndex: number, toIndex: number): void {
		const layers = [...this.recipe.layers];
		const [moved] = layers.splice(fromIndex, 1);
		if (!moved) return;
		layers.splice(toIndex, 0, moved);
		this.commit("Reorder Layers", { ...this.recipe, layers });
	}

	/** The copy shares the image blob; the library copies or deletes blobs per id, not per layer. */
	duplicateLayer(layerId: string): void {
		const index = this.recipe.layers.findIndex((layer) => layer.id === layerId);
		const source = this.recipe.layers[index];
		if (!source) return;
		const copy: RecipeLayer = {
			...source,
			id: crypto.randomUUID(),
			name: `${source.name} Copy`.slice(0, MAX_LAYER_NAME_LENGTH),
		};
		const layers = [...this.recipe.layers];
		layers.splice(index + 1, 0, copy);
		this.commit("Duplicate Layer", { ...this.recipe, layers });
		this.activeLayerId = copy.id;
	}

	/** Blends a layer into the one below it, pixels included, as one undo step. */
	async mergeDown(layerId: string): Promise<void> {
		const { layers } = this.recipe;
		const index = layers.findIndex((layer) => layer.id === layerId);
		const lower = layers[index - 1];
		const upper = layers[index];
		if (!lower || !upper) return;
		const merged = await this.#merge(lower, upper);
		const next = layers.flatMap((layer) => {
			if (layer.id === upper.id) return [];
			return layer.id === lower.id ? [merged] : [layer];
		});
		this.commit("Merge Down", { ...this.recipe, layers: next });
		this.activeLayerId = merged.id;
	}

	/**
	 * Merges the visible layers into one and drops the hidden ones, as Photoshop's flatten does.
	 * The photo itself is never changed; the merged layer stays editable and the step undoable.
	 */
	async flattenLayers(): Promise<void> {
		const [bottom, ...rest] = this.recipe.layers.filter((layer) => layer.isVisible);
		if (!bottom) {
			this.commit("Flatten Layers", { ...this.recipe, layers: [] });
			this.activeLayerId = null;
			return;
		}
		let merged = bottom;
		for (const layer of rest) merged = await this.#merge(merged, layer);
		this.commit("Flatten Layers", { ...this.recipe, layers: [merged] });
		this.activeLayerId = merged.id;
	}

	/** Exports what the canvas shows in the "edit" view, through the same render path. */
	async export(options: ExportOptions): Promise<ExportedImage> {
		const engine = this.#requireEngine();
		const exported = await exportImage(engine, this.displayedRecipe("edit"), options);
		// The export replaced the engine's last render; draw the preview again.
		this.#scheduleFrame();
		return exported;
	}

	/** The edited image, small, for palette extraction. */
	async editedImage(): Promise<Blob> {
		const { width, height } = this.displaySize("edit");
		const { blob } = await this.export({
			format: "png",
			scale: Math.min(1, EXTRACTION_SIZE / Math.max(width, height)),
			quality: 1,
			hasBackground: false,
		});
		return blob;
	}

	/** A small render of `recipe` (e.g. a preset on the original), as a cached object URL. */
	previewUrl(recipe: EditRecipe): Promise<string> {
		const key = JSON.stringify(recipe);
		let url = this.#previewUrls.get(key);
		if (!url) {
			url = this.#renderPreviewUrl(recipe);
			this.#previewUrls.set(key, url);
		}
		return url;
	}

	/** A region of the original, in source pixels. */
	async originalRegion(rect: CropRect): Promise<Blob> {
		const bitmap = await createImageBitmap(this.#original, { imageOrientation: "from-image" });
		try {
			const width = Math.max(1, Math.round(rect.width));
			const height = Math.max(1, Math.round(rect.height));
			const canvas = new OffscreenCanvas(width, height);
			const context = canvas.getContext("2d");
			if (!context) throw new Error("A 2D canvas is not available in this browser.");
			context.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height);
			return await canvas.convertToBlob({ type: "image/png" });
		} finally {
			bitmap.close();
		}
	}

	/** Saves pending edits, refreshes the library thumbnail if anything changed, frees the GPU. */
	async close(): Promise<void> {
		if (this.#isClosed) return;
		this.#isClosed = true;
		cancelAnimationFrame(this.#frame);
		clearTimeout(this.#thumbnailTimer);
		this.session.cancelPreview();
		await this.session.dispose();
		await this.#updateThumbnail();
		this.#engine?.dispose();
		this.#engine = null;
		URL.revokeObjectURL(this.originalUrl);
		for (const url of this.#layerUrls.values()) URL.revokeObjectURL(url);
		for (const url of this.#previewUrls.values())
			void url.then(URL.revokeObjectURL, () => undefined);
		this.#previewUrls.clear();
		this.#layerUrls.clear();
		this.#layerImages.clear();
	}

	async #merge(lower: RecipeLayer, upper: RecipeLayer): Promise<RecipeLayer> {
		const lowerImage = this.#layerImages.get(lower.blobId);
		const upperImage = this.#layerImages.get(upper.blobId);
		if (!lowerImage || !upperImage) throw new Error("A layer image is missing from the device.");
		const image = await mergeLayerImages(
			{ layer: lower, image: lowerImage },
			{ layer: upper, image: upperImage },
			this.reference.width,
			this.reference.height
		);
		const blobId = await this.#library.storeLayerImage(image);
		await this.#addLayerImage(blobId, image);
		return { ...lower, blobId };
	}

	async #renderPreviewUrl(recipe: EditRecipe): Promise<string> {
		try {
			const preview = await exportThumbnail(this.#requireEngine(), recipe);
			return URL.createObjectURL(preview);
		} catch (cause) {
			// Not cached, so the next request tries again.
			this.#previewUrls.delete(JSON.stringify(recipe));
			throw cause;
		} finally {
			// The preview replaced the engine's last render; draw the canvas again.
			this.#scheduleFrame();
		}
	}

	#scheduleThumbnail(): void {
		clearTimeout(this.#thumbnailTimer);
		this.#thumbnailTimer = setTimeout(() => {
			// Mid-gesture: wait for the commit.
			if (this.session.history.isPreviewing) this.#scheduleThumbnail();
			else void this.#updateThumbnail().then(() => this.#scheduleFrame());
		}, THUMBNAIL_DELAY_MS);
	}

	/** Renders the committed recipe into the library thumbnail, if it changed since the last one. */
	async #updateThumbnail(): Promise<void> {
		const engine = this.#engine;
		const recipe = $state.snapshot(this.session.recipe);
		const key = JSON.stringify(recipe);
		if (!engine || key === this.#thumbnailRecipe) return;
		try {
			await this.#library.storeThumbnail(this.reference.id, await exportThumbnail(engine, recipe));
			this.#thumbnailRecipe = key;
		} catch (cause) {
			// The old thumbnail stays; the next change or the next open renders it again.
			console.warn(`Could not refresh the thumbnail of "${this.reference.name}":`, cause);
		}
	}

	#scheduleFrame(): void {
		if (this.#isClosed) return;
		cancelAnimationFrame(this.#frame);
		this.#frame = requestAnimationFrame(() => void this.#draw());
	}

	async #draw(): Promise<void> {
		const engine = this.#engine;
		const queued = this.#queued;
		if (!engine || !queued || engine.isContextLost) return;
		try {
			// Undo can bring back a layer whose image this session has not loaded yet.
			if (queued.recipe.layers.some((layer) => !this.#layerImages.has(layer.blobId))) {
				await this.#loadLayerImages(queued.recipe);
				if (this.#queued !== queued) return;
			}
			engine.render(queued.recipe, queued.scale);
			engine.present();
			this.renderError = null;
		} catch (cause) {
			console.error("Preview render failed:", cause);
			this.renderError = "The preview could not be rendered.";
		}
	}

	async #loadLayerImages(recipe: EditRecipe): Promise<void> {
		for (const [blobId, image] of await this.#library.layerImages(recipe)) {
			if (!this.#layerImages.has(blobId)) await this.#addLayerImage(blobId, image);
		}
	}

	/** Keeps a layer image for this session and uploads it once the engine exists. */
	async #addLayerImage(blobId: BlobId, image: Blob): Promise<void> {
		this.#layerImages.set(blobId, image);
		this.#layerUrls.set(blobId, URL.createObjectURL(image));
		await this.#engine?.setLayerImage(blobId, image);
	}

	#requireEngine(): RenderEngine {
		if (!this.#engine) throw new Error("The editor canvas is not ready yet.");
		return this.#engine;
	}
}
