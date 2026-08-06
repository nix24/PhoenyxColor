import { describe, test, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/svelte";
import Page from "./+page.svelte";

describe("/+page.svelte", () => {
	test("shows an accessible redirect fallback", () => {
		render(Page);
		expect(screen.getByRole("status")).toHaveTextContent("Opening the reference library");
	});
});
