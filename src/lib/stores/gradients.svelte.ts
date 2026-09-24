import { storage } from "$lib/services/storage";
import { HistoryStore } from "./history.svelte";
import { StoredRecordSchemas, type ValidatedGradient } from "$lib/schemas/validation";
import type { GradientId } from "$lib/types/brands";

export class GradientStore {
	gradients = $state<ValidatedGradient[]>([]);
	activeGradientId = $state<string | null>(null);
	isReady = $state(false);
	history = new HistoryStore<ValidatedGradient[]>();

	private STORAGE_KEY = "phoenyx_gradients";
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

	get activeGradient() {
		return this.activeGradientId
			? this.gradients.find((g) => g.id === this.activeGradientId)
			: null;
	}

	async load() {
		try {
			const { records } = await storage.db.getCollection(
				this.STORAGE_KEY,
				StoredRecordSchemas.gradients
			);
			this.gradients = records;
		} catch (error) {
			console.warn("Failed to load gradients:", error);
		} finally {
			this.isReady = true;
		}
	}

	async save() {
		await storage.db.set(this.STORAGE_KEY, $state.snapshot(this.gradients));
	}

	add(gradient: Omit<ValidatedGradient, "id" | "createdAt">) {
		// SAFETY: `GradientId` brands a UUID string, which is exactly what
		// `crypto.randomUUID()` produces.
		const newGradient: ValidatedGradient = {
			...gradient,
			id: crypto.randomUUID() as GradientId,
			createdAt: new Date(),
		};

		const prevState = $state.snapshot(this.gradients);
		this.gradients.push(newGradient);
		this.save();

		this.history.push({
			label: "Add Gradient",
			undo: () => {
				this.gradients = prevState;
				this.save();
			},
			redo: () => {
				this.gradients = [...prevState, newGradient];
				this.save();
			},
		});

		return newGradient.id;
	}

	remove(id: string) {
		const index = this.gradients.findIndex((g) => g.id === id);
		if (index === -1) return;

		const prevState = $state.snapshot(this.gradients);
		this.gradients.splice(index, 1);

		if (this.activeGradientId === id) {
			this.activeGradientId = null;
		}

		this.save();

		this.history.push({
			label: "Remove Gradient",
			undo: () => {
				this.gradients = prevState;
				this.save();
			},
			redo: () => {
				const nextState = [...prevState];
				nextState.splice(index, 1);
				this.gradients = nextState;
				this.save();
			},
		});
	}

	update(id: string, updates: Partial<ValidatedGradient>) {
		const index = this.gradients.findIndex((g) => g.id === id);
		if (index === -1) return;

		const item = this.gradients[index];
		if (item) {
			const prevState = $state.snapshot(this.gradients);
			// Create next state before applying updates
			const nextState = prevState.map((g, i) => (i === index ? { ...g, ...updates } : g));
			Object.assign(item, updates);
			this.save();

			this.history.push({
				label: "Update Gradient",
				undo: () => {
					this.gradients = prevState;
					this.save();
				},
				redo: () => {
					this.gradients = nextState;
					this.save();
				},
			});
		}
	}

	setActive(id: string | null) {
		this.activeGradientId = id;
	}
}
// fallow-ignore-file unused-class-member
