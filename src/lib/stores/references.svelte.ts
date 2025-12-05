import { storage } from "$lib/services/storage";
import { HistoryStore } from "./history.svelte";
import type { ValidatedReferenceImage } from "$lib/schemas/validation";
import type { ReferenceId } from "$lib/types/brands";

export class ReferenceStore {
	references = $state<ValidatedReferenceImage[]>([]);
	isReady = $state(false);
	history = new HistoryStore<ValidatedReferenceImage[]>();

	private STORAGE_KEY = "phoenyx_references";
	private loadPromise: Promise<void>;

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
		try {
			const saved = await storage.db.get<ValidatedReferenceImage[]>(this.STORAGE_KEY);
			if (saved) {
				this.references = saved.map((r) => ({
					...r,
					createdAt: new Date(r.createdAt),
				}));
			}
		} catch (error) {
			console.warn("Failed to load references:", error);
		} finally {
			this.isReady = true;
		}
	}

	async save() {
		// In a real massive app, we might want to store images separately in IDB as Blobs
		// and only keep metadata here. For now, we store the whole array in IDB which is
		// much better than LocalStorage.
		await storage.db.set(this.STORAGE_KEY, $state.snapshot(this.references));
	}

	add(ref: Omit<ValidatedReferenceImage, "id" | "createdAt">) {
		const newRef: ValidatedReferenceImage = {
			...ref,
			id: crypto.randomUUID() as ReferenceId,
			createdAt: new Date(),
		};

		const prevState = $state.snapshot(this.references);
		this.references.push(newRef);
		this.save();

		this.history.push({
			label: "Add Reference",
			undo: () => {
				this.references = prevState;
				this.save();
			},
			redo: () => {
				this.references = [...prevState, newRef];
				this.save();
			},
		});
	}

	remove(id: string) {
		const index = this.references.findIndex((r) => r.id === id);
		if (index === -1) return;

		const prevState = $state.snapshot(this.references);
		this.references.splice(index, 1);
		this.save();

		this.history.push({
			label: "Remove Reference",
			undo: () => {
				this.references = prevState;
				this.save();
			},
			redo: () => {
				const nextState = [...prevState];
				nextState.splice(index, 1);
				this.references = nextState;
				this.save();
			},
		});
	}

	update(id: string, updates: Partial<ValidatedReferenceImage>) {
		const index = this.references.findIndex((r) => r.id === id);
		if (index === -1) return;

		const item = this.references[index];
		if (item) {
			const prevState = $state.snapshot(this.references);
			Object.assign(item, updates);
			this.save();

			this.history.push({
				label: "Update Reference",
				undo: () => {
					this.references = prevState;
					this.save();
				},
				redo: () => {
					// We can't just re-apply updates because we need the full state snapshot
					// But since we modified the state in place above, we can just snapshot it now
					const nextState = $state.snapshot(this.references);
					this.references = nextState;
					this.save();
				},
			});
		}
	}
}
