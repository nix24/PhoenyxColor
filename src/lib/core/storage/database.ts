import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from "idb";

const DATABASE_NAME = "phoenyx";
/** The IndexedDB version is the schema version; bump it and extend `upgrade` to change stores. */
const SCHEMA_VERSION = 1;

/**
 * Record stores hold `unknown` because every read is parsed by a `Repository` schema; the types
 * of stored records live with their feature, not here.
 */
export interface PhoenyxSchema extends DBSchema {
	references: { key: string; value: unknown; indexes: { createdAt: string } };
	blobs: { key: string; value: Blob };
	recipes: { key: string; value: unknown };
	presets: { key: string; value: unknown };
	palettes: { key: string; value: unknown };
	gradients: { key: string; value: unknown };
	/** Migration markers and quarantined records, keyed `migration:<name>` / `quarantine:<id>`. */
	meta: { key: string; value: unknown };
}

export type RecordStoreName = "references" | "recipes" | "presets" | "palettes" | "gradients";
export type StoreName = RecordStoreName | "blobs" | "meta";
export type PhoenyxDatabase = IDBPDatabase<PhoenyxSchema>;
export type WriteTransaction = IDBPTransaction<PhoenyxSchema, StoreName[], "readwrite">;

export function openDatabase(name = DATABASE_NAME): Promise<PhoenyxDatabase> {
	return openDB<PhoenyxSchema>(name, SCHEMA_VERSION, {
		upgrade(db) {
			const references = db.createObjectStore("references", { keyPath: "id" });
			references.createIndex("createdAt", "createdAt");
			db.createObjectStore("blobs");
			db.createObjectStore("recipes", { keyPath: "referenceId" });
			db.createObjectStore("presets", { keyPath: "id" });
			db.createObjectStore("palettes", { keyPath: "id" });
			db.createObjectStore("gradients", { keyPath: "id" });
			db.createObjectStore("meta");
		},
	});
}
