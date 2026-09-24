import { z } from "zod";
import type { PhoenyxDatabase, RecordStoreName } from "./database";
import { newQuarantineKey, type QuarantineEntry } from "./meta";

/**
 * Typed, per-record access to one store. Every read is parsed; a record that fails is moved to
 * `meta` as a quarantine entry instead of being returned or dropped.
 */
export class Repository<TSchema extends z.ZodType> {
	constructor(
		private readonly db: PhoenyxDatabase,
		private readonly store: RecordStoreName,
		private readonly schema: TSchema
	) {}

	async get(key: string): Promise<z.infer<TSchema> | undefined> {
		const stored = await this.db.get(this.store, key);
		if (stored === undefined) return undefined;
		const parsed = this.schema.safeParse(stored);
		if (parsed.success) return parsed.data;
		await this.quarantine([key]);
		return undefined;
	}

	async getAll(): Promise<z.infer<TSchema>[]> {
		const records: z.infer<TSchema>[] = [];
		const invalidKeys: string[] = [];
		let cursor = await this.db.transaction(this.store).store.openCursor();
		while (cursor) {
			const parsed = this.schema.safeParse(cursor.value);
			if (parsed.success) records.push(parsed.data);
			else invalidKeys.push(cursor.primaryKey);
			cursor = await cursor.continue();
		}
		if (invalidKeys.length > 0) await this.quarantine(invalidKeys);
		return records;
	}

	async put(record: z.infer<TSchema>): Promise<void> {
		await this.db.put(this.store, record);
	}

	private async quarantine(keys: string[]): Promise<void> {
		const tx = this.db.transaction([this.store, "meta"], "readwrite");
		const records = tx.objectStore(this.store);
		let movedCount = 0;
		for (const key of keys) {
			const stored = await records.get(key);
			const parsed = this.schema.safeParse(stored);
			// A write between the read and this transaction may have fixed or removed the record.
			if (stored === undefined || parsed.success) continue;
			const entry: QuarantineEntry = {
				source: this.store,
				key,
				record: stored,
				reason: z.prettifyError(parsed.error),
				quarantinedAt: new Date().toISOString(),
			};
			await tx.objectStore("meta").put(entry, newQuarantineKey());
			await records.delete(key);
			movedCount++;
		}
		await tx.done;
		if (movedCount > 0) {
			console.warn(`${movedCount} invalid record(s) in "${this.store}" moved to quarantine.`);
		}
	}
}
