import type { z } from "zod";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { browser } from "$app/environment";

interface PhoenyxDB extends DBSchema {
	keyval: {
		key: string;
		value: unknown;
	};
}

/** A stored collection after validation. */
export interface LoadedCollection<TRecord> {
	records: TRecord[];
	/** Records that failed validation and were moved to `<key>_quarantine`. */
	invalidCount: number;
}

export class IndexedDBAdapter {
	private dbPromise: Promise<IDBPDatabase<PhoenyxDB>> | null = null;
	private dbName = "PhoenyxColorDB";
	private storeName = "keyval" as const;

	constructor() {
		if (browser) {
			this.dbPromise = openDB<PhoenyxDB>(this.dbName, 1, {
				upgrade(db) {
					db.createObjectStore("keyval");
				},
			});
		}
	}

	private async getDB() {
		if (!this.dbPromise) return null;
		return await this.dbPromise;
	}

	/**
	 * Read a stored collection, validating record by record so one corrupt entry cannot void the
	 * rest. Failed records are copied to `<key>_quarantine` first, so the caller's next save
	 * cannot destroy them.
	 */
	async getCollection<TSchema extends z.ZodType>(
		key: string,
		recordSchema: TSchema
	): Promise<LoadedCollection<z.infer<TSchema>>> {
		const db = await this.getDB();
		if (!db) return { records: [], invalidCount: 0 };

		const stored = await db.get(this.storeName, key);
		if (stored === undefined || stored === null) return { records: [], invalidCount: 0 };
		const entries = Array.isArray(stored) ? stored : [stored];

		const records: z.infer<TSchema>[] = [];
		const invalid = [];
		for (const entry of entries) {
			const parsed = recordSchema.safeParse(entry);
			if (parsed.success) records.push(parsed.data);
			else invalid.push(entry);
		}

		if (invalid.length > 0) {
			const quarantineKey = `${key}_quarantine`;
			const previous = await db.get(this.storeName, quarantineKey);
			const kept = Array.isArray(previous) ? previous : [];
			// Loads repeat until the next save rewrites the collection; skip entries already kept.
			const seen = new Set(kept.map((entry) => JSON.stringify(entry)));
			const fresh = invalid.filter((entry) => !seen.has(JSON.stringify(entry)));
			await db.put(this.storeName, [...kept, ...fresh], quarantineKey);
			console.warn(`${invalid.length} invalid record(s) in "${key}" moved to "${quarantineKey}".`);
		}

		return { records, invalidCount: invalid.length };
	}

	async set<T>(key: string, value: T): Promise<void> {
		const db = await this.getDB();
		if (!db) return;
		await db.put(this.storeName, value, key);
	}

	async clear(): Promise<void> {
		const db = await this.getDB();
		if (!db) return;
		await db.clear(this.storeName);
	}
}
