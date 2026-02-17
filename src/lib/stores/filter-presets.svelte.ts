import { storage } from "$lib/services/storage";
import { HistoryStore } from "./history.svelte";
import type { FilterPreset, PresetCategory, FilterPresetSettings } from "$lib/types/image-editor";

const STORAGE_KEY = "phoenyx_filter_presets";

export class FilterPresetStore {
	presets = $state<FilterPreset[]>([]);
	isReady = $state(false);
	history = new HistoryStore<FilterPreset[]>();

	private loadPromise: Promise<void>;

	constructor() {
		this.loadPromise = this.load();
	}

	async whenReady(): Promise<void> {
		return this.loadPromise;
	}

	private async load() {
		try {
			const saved = await storage.db.get<FilterPreset[]>(STORAGE_KEY);
			if (saved) {
				this.presets = saved.map((p) => ({
					...p,
					createdAt: new Date(p.createdAt),
				}));
			}
		} catch (error) {
			console.warn("Failed to load filter presets:", error);
		} finally {
			this.isReady = true;
		}
	}

	private async save() {
		await storage.db.set(STORAGE_KEY, $state.snapshot(this.presets));
	}

	add(preset: { name: string; category: PresetCategory; settings: Partial<FilterPresetSettings>; thumbnail?: string }) {
		const newPreset: FilterPreset = {
			id: crypto.randomUUID(),
			name: preset.name,
			category: preset.category,
			settings: preset.settings,
			createdAt: new Date(),
			...(preset.thumbnail ? { thumbnail: preset.thumbnail } : {}),
		};

		const prevState = $state.snapshot(this.presets);
		this.presets.push(newPreset);
		this.save();

		this.history.push({
			label: "Add Preset",
			undo: () => {
				this.presets = prevState;
				this.save();
			},
			redo: () => {
				this.presets = [...prevState, newPreset];
				this.save();
			},
		});

		return newPreset.id;
	}

	remove(id: string) {
		const index = this.presets.findIndex((p) => p.id === id);
		if (index === -1) return;

		const prevState = $state.snapshot(this.presets);
		this.presets.splice(index, 1);
		this.save();

		this.history.push({
			label: "Remove Preset",
			undo: () => {
				this.presets = prevState;
				this.save();
			},
			redo: () => {
				const nextState = [...prevState];
				nextState.splice(index, 1);
				this.presets = nextState;
				this.save();
			},
		});
	}

	update(id: string, updates: Partial<FilterPreset>) {
		const index = this.presets.findIndex((p) => p.id === id);
		if (index === -1) return;

		const item = this.presets[index];
		if (item) {
			const prevState = $state.snapshot(this.presets);
			const nextState = prevState.map((p, i) =>
				i === index ? { ...p, ...updates } : p
			);
			Object.assign(item, updates);
			this.save();

			this.history.push({
				label: "Update Preset",
				undo: () => {
					this.presets = prevState;
					this.save();
				},
				redo: () => {
					this.presets = nextState;
					this.save();
				},
			});
		}
	}

	getByCategory(category: PresetCategory): FilterPreset[] {
		return this.presets.filter((p) => p.category === category);
	}
}
