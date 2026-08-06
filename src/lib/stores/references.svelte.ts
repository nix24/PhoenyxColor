import { storage } from "$lib/services/storage";
import { HistoryStore } from "./history.svelte";
import { ReferenceImageSchema, type ValidatedReferenceImage } from "$lib/schemas/validation";
import type { ReferenceId } from "$lib/types/brands";

export class ReferenceStore {
	references = $state<ValidatedReferenceImage[]>([]);
	isReady = $state(false);
	loadError = $state<string | null>(null);
	saveError = $state<string | null>(null);
	history = new HistoryStore<ValidatedReferenceImage[]>();

	private STORAGE_KEY = "phoenyx_references";
	private loadPromise: Promise<void>;
	private saveQueue: Promise<void> = Promise.resolve();

	constructor() {
		// Non-blocking initialization - store the promise but don't await
		this.loadPromise = this.load();
	}

	/**
	 * Wait for the store to be ready (for components that need data immediately)
	 */
	async whenReady(): Promise<void> {
		return this.loadPromise;
	}

	async load() {
		this.isReady = false;
		this.loadError = null;
		try {
			const saved = await storage.db.get<ValidatedReferenceImage[]>(this.STORAGE_KEY);
			if (saved) {
				const references: ValidatedReferenceImage[] = [];
				let invalidCount = 0;
				for (const stored of saved) {
					const result = ReferenceImageSchema.safeParse({
						...stored,
						createdAt: new Date(stored.createdAt),
					});
					if (result.success) references.push(result.data);
					else invalidCount += 1;
				}
				this.references = references;
				if (invalidCount > 0) {
					this.loadError = `${invalidCount} saved reference ${invalidCount === 1 ? "was" : "were"} invalid and could not be restored.`;
				}
			}
		} catch (error) {
			console.error("Failed to load references:", error);
			this.loadError = "Reference images could not be loaded from this device.";
		} finally {
			this.isReady = true;
		}
	}

	reload(): Promise<void> {
		this.loadPromise = this.load();
		return this.loadPromise;
	}

	async save() {
		// In a real massive app, we might want to store images separately in IDB as Blobs
		// and only keep metadata here. For now, we store the whole array in IDB which is
		// much better than LocalStorage.
		await storage.db.set(this.STORAGE_KEY, $state.snapshot(this.references));
		this.saveError = null;
	}

	private queueSave() {
		this.saveQueue = this.saveQueue
			.then(() => this.save())
			.catch((error: unknown) => {
				console.error("Failed to save references:", error);
				this.saveError = "Changes are visible, but could not be saved on this device.";
			});
	}

	add(ref: Omit<ValidatedReferenceImage, "id" | "createdAt">) {
		const newRef: ValidatedReferenceImage = {
			...ref,
			id: crypto.randomUUID() as ReferenceId,
			createdAt: new Date(),
		};

		const prevState = $state.snapshot(this.references);
		this.references.push(newRef);
		this.queueSave();

		this.history.push({
			label: "Add Reference",
			undo: () => {
				this.references = prevState;
				this.queueSave();
			},
			redo: () => {
				this.references = [...prevState, newRef];
				this.queueSave();
			},
		});
	}

	remove(id: string) {
		const index = this.references.findIndex((r) => r.id === id);
		if (index === -1) return;

		const prevState = $state.snapshot(this.references);
		this.references.splice(index, 1);
		this.queueSave();

		this.history.push({
			label: "Remove Reference",
			undo: () => {
				this.references = prevState;
				this.queueSave();
			},
			redo: () => {
				const nextState = [...prevState];
				nextState.splice(index, 1);
				this.references = nextState;
				this.queueSave();
			},
		});
	}

	update(id: string, updates: Partial<ValidatedReferenceImage>) {
		const index = this.references.findIndex((r) => r.id === id);
		if (index === -1) return;

		const item = this.references[index];
		if (item) {
			const prevState = $state.snapshot(this.references);
			// Create next state before applying updates
			const nextState = prevState.map((r, i) => (i === index ? { ...r, ...updates } : r));
			Object.assign(item, updates);
			this.queueSave();

			this.history.push({
				label: "Update Reference",
				undo: () => {
					this.references = prevState;
					this.queueSave();
				},
				redo: () => {
					this.references = nextState;
					this.queueSave();
				},
			});
		}
	}
}
// fallow-ignore-file unused-class-member
