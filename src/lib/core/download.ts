/** Save a Blob to the user's device under `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	// Revoke on the next task: some engines start the download asynchronously after click().
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
