/**
 * The open reference lives in the URL (`/references?image=<id>`), so Back closes the editor,
 * a reload reopens the same image, and the link can be shared on this device.
 */
const PARAM = "image";

/** The reference id the URL asks to open, if any. Not validated: the library decides. */
export function requestedReferenceId(url: URL): string | null {
	const id = url.searchParams.get(PARAM)?.trim();
	return id ? id : null;
}

/** `url` with the editor opened on `id`, or closed for `null`; other parameters are kept. */
export function editorHref(url: URL, id: string | null): string {
	const next = new URL(url);
	if (id === null) next.searchParams.delete(PARAM);
	else next.searchParams.set(PARAM, id);
	return `${next.pathname}${next.search}${next.hash}`;
}
