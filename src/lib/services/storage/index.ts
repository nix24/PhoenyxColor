import { LocalStorageAdapter } from "./adapter.local";
import { IndexedDBAdapter } from "./adapter.idb";
import type { StorageAdapter } from "./adapter.interface";

export class StorageService {
	private static instance: StorageService;

	// Separate adapters for different data types
	public local: StorageAdapter;
	public db: StorageAdapter;

	private constructor() {
		this.local = new LocalStorageAdapter();
		this.db = new IndexedDBAdapter();
	}

	static getInstance(): StorageService {
		if (!StorageService.instance) {
			StorageService.instance = new StorageService();
		}
		return StorageService.instance;
	}

	/**
	 * Helper to determine which adapter to use based on key or context
	 * For now, we expose both explicitly, but this could be automated.
	 */
}

export const storage = StorageService.getInstance();
