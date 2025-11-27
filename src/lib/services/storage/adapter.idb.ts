import type { StorageAdapter } from "./adapter.interface";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { browser } from "$app/environment";

interface PhoenyxDB extends DBSchema {
	keyval: {
		key: string;
		value: any;
	};
}

export class IndexedDBAdapter implements StorageAdapter {
	private dbPromise: Promise<IDBPDatabase<PhoenyxDB>> | null = null;
	private dbName = "PhoenyxColorDB";
	private storeName = "keyval";

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

	async get<T>(key: string): Promise<T | null> {
		const db = await this.getDB();
		if (!db) return null;
		return (await db.get(this.storeName as "keyval", key)) || null;
	}

	async set<T>(key: string, value: T): Promise<void> {
		const db = await this.getDB();
		if (!db) return;
		await db.put(this.storeName as "keyval", value, key);
	}

	async remove(key: string): Promise<void> {
		const db = await this.getDB();
		if (!db) return;
		await db.delete(this.storeName as "keyval", key);
	}

	async clear(): Promise<void> {
		const db = await this.getDB();
		if (!db) return;
		await db.clear(this.storeName as "keyval");
	}
}
