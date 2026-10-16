import { describe, expect, test } from "vite-plus/test";
import { editorHref, requestedReferenceId } from "./editor-url";

const id = "5b4a3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d";

describe("editor URL state", () => {
	test("reads the open reference from ?image=", () => {
		expect(requestedReferenceId(new URL(`http://x/references?image=${id}`))).toBe(id);
		expect(requestedReferenceId(new URL("http://x/references"))).toBeNull();
		expect(requestedReferenceId(new URL("http://x/references?image=%20"))).toBeNull();
	});

	test("opening and closing round-trip and keep other parameters", () => {
		const gallery = new URL("http://x/references?sort=name#top");
		const opened = editorHref(gallery, id);
		expect(opened).toBe(`/references?sort=name&image=${id}#top`);
		expect(editorHref(new URL(`http://x${opened}`), null)).toBe("/references?sort=name#top");
	});
});
