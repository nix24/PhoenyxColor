import type { Brand } from "$lib/types/brands";
import type { PhoenyxDatabase } from "./database";

export type BlobId = Brand<string, "BlobId">;

function newBlobId(): BlobId {
	// SAFETY: a fresh UUID is exactly what a BlobId is; the brand only marks where it came from.
	return crypto.randomUUID() as BlobId;
}

export async function putBlob(db: PhoenyxDatabase, blob: Blob): Promise<BlobId> {
	const id = newBlobId();
	await db.put("blobs", blob, id);
	return id;
}

export function getBlob(db: PhoenyxDatabase, id: BlobId): Promise<Blob | undefined> {
	return db.get("blobs", id);
}
