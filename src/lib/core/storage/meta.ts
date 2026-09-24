/** A record that failed validation, kept in `meta` so it is never lost. */
export interface QuarantineEntry {
	/** The store or legacy key the record came from. */
	source: string;
	/** Its key in that source, when it had one. */
	key: string | null;
	record: unknown;
	reason: string;
	quarantinedAt: string;
}

/** Each entry gets its own key so a record quarantined twice never overwrites the first copy. */
export function newQuarantineKey(): string {
	return `quarantine:${crypto.randomUUID()}`;
}

export function migrationMarkerKey(migrationName: string): string {
	return `migration:${migrationName}`;
}
