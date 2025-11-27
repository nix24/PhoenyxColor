import { storage } from "$lib/services/storage";
import { HistoryStore } from "./history.svelte";
import type { ValidatedGradient } from "$lib/schemas/validation";
import type { GradientId } from "$lib/types/brands";

export class GradientStore {
	gradients = $state<ValidatedGradient[]>([]);
	activeGradientId = $state<string | null>(null);
	history = new HistoryStore<ValidatedGradient[]>();

	private STORAGE_KEY = "phoenyx_gradients";

	constructor() {
		this.load();
	}

	get activeGradient() {
		return this.activeGradientId
			? this.gradients.find((g) => g.id === this.activeGradientId)
			: null;
	}

	async load() {
		const saved = await storage.db.get<ValidatedGradient[]>(this.STORAGE_KEY);
		if (saved) {
			this.gradients = saved.map((g) => ({
				...g,
				createdAt: new Date(g.createdAt),
			}));
		}
	}

	async save() {
		await storage.db.set(this.STORAGE_KEY, $state.snapshot(this.gradients));
	}

	add(gradient: Omit<ValidatedGradient, "id" | "createdAt">) {
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
			Object.assign(item, updates);
			this.save();

			this.history.push({
				label: "Update Gradient",
				undo: () => {
					this.gradients = prevState;
					this.save();
				},
				redo: () => {
					const nextState = $state.snapshot(this.gradients);
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
