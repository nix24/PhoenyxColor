import { openDB } from "idb";
import { z } from "zod";
import type { PhoenyxDatabase, StoreName, WriteTransaction } from "./database";
import { migrationMarkerKey, newQuarantineKey, type QuarantineEntry } from "./meta";

/** The v1 database. Migrations only read it; it stays until the maintainer approves deleting it. */
const LEGACY_DATABASE_NAME = "PhoenyxColorDB";
const LEGACY_STORE = "keyval";

/** Moves one v1 collection into the v2 stores. */
export interface Migration<TLegacy, TConverted> {
	/** Names the marker that makes a rerun a no-op, e.g. `references-v1`. */
	name: string;
	/** The collection's key in the v1 `keyval` store, e.g. `phoenyx_references`. */
	legacyKey: string;
	legacySchema: z.ZodType<TLegacy>;
	/** Every store `write` touches. */
	stores: StoreName[];
	/**
	 * Runs before the write transaction opens, so it may do async work such as data URL → Blob.
	 * A throw quarantines that record.
	 */
	convert(record: TLegacy): Promise<TConverted>;
	/** Must await only IDB requests on `tx`; awaiting anything else commits the transaction early. */
	write(tx: WriteTransaction, converted: TConverted): Promise<void>;
}

export interface MigrationResult {
	isAlreadyDone: boolean;
	migratedCount: number;
	quarantinedCount: number;
}

/**
 * Validates and converts every record first, then writes the converted records, the quarantine
 * entries and, last, the marker in one transaction. Either all of it commits or none of it does,
 * so a crash at any point leaves the migration safe to run again.
 */
export async function runMigration<TLegacy, TConverted>(
	db: PhoenyxDatabase,
	migration: Migration<TLegacy, TConverted>
): Promise<MigrationResult> {
	const markerKey = migrationMarkerKey(migration.name);
	if ((await db.get("meta", markerKey)) !== undefined) {
		return { isAlreadyDone: true, migratedCount: 0, quarantinedCount: 0 };
	}

	// Same version and upgrade as the v1 adapter, so opening it here never leaves it without its store.
	const legacyDb = await openDB(LEGACY_DATABASE_NAME, 1, {
		upgrade(legacy) {
			legacy.createObjectStore(LEGACY_STORE);
		},
	});
	const stored = await legacyDb.get(LEGACY_STORE, migration.legacyKey);
	legacyDb.close();
	const legacyRecords = stored === undefined ? [] : Array.isArray(stored) ? stored : [stored];

	const converted: TConverted[] = [];
	const quarantined: QuarantineEntry[] = [];
	const quarantine = (record: QuarantineEntry["record"], reason: string) =>
		quarantined.push({
			source: migration.legacyKey,
			key: null,
			record,
			reason,
			quarantinedAt: new Date().toISOString(),
		});
	for (const record of legacyRecords) {
		const parsed = migration.legacySchema.safeParse(record);
		if (!parsed.success) {
			quarantine(record, z.prettifyError(parsed.error));
			continue;
		}
		try {
			converted.push(await migration.convert(parsed.data));
		} catch (cause) {
			quarantine(record, cause instanceof Error ? cause.message : String(cause));
		}
	}

	const tx = db.transaction([...migration.stores, "meta"], "readwrite");
	try {
		for (const record of converted) await migration.write(tx, record);
		const meta = tx.objectStore("meta");
		for (const entry of quarantined) await meta.put(entry, newQuarantineKey());
		await meta.put({ completedAt: new Date().toISOString() }, markerKey);
	} catch (cause) {
		// Abort so a half-written batch never commits. A failed request may have aborted it already.
		try {
			tx.abort();
		} catch {
			// Already aborted; the original failure is rethrown below.
		}
		await tx.done.catch(() => undefined);
		throw new Error(`Migration "${migration.name}" failed; nothing was written.`, { cause });
	}
	await tx.done;

	if (quarantined.length > 0) {
		console.warn(`${quarantined.length} record(s) from "${migration.legacyKey}" quarantined.`);
	}
	return {
		isAlreadyDone: false,
		migratedCount: converted.length,
		quarantinedCount: quarantined.length,
	};
}
