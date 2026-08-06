import { render, screen } from "@testing-library/svelte";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi } from "vitest";
import EditorToolbar from "./EditorToolbar.svelte";

describe("EditorToolbar", () => {
	test("exposes drawing as a first-class editor tool", () => {
		render(EditorToolbar, {
			props: { activeTool: null, onToolSelect: vi.fn() },
		});

		expect(screen.getByRole("button", { name: /draw/i })).toBeInTheDocument();
	});
});
