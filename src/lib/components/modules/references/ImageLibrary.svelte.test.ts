import { render, screen } from "@testing-library/svelte";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import ImageLibrary from "./ImageLibrary.svelte";

describe("ImageLibrary", () => {
	test("shows a recoverable error instead of an empty library", async () => {
		const onRetry = vi.fn();
		render(ImageLibrary, {
			props: {
				references: [],
				selectedImageId: null,
				isLoading: false,
				loadError: "Reference images could not be loaded.",
				isDragOver: false,
				onAddFiles: vi.fn(),
				onClearAll: vi.fn(),
				onEdit: vi.fn(),
				onDuplicate: vi.fn(),
				onDelete: vi.fn(),
				onContextMenu: vi.fn(),
				onRetry,
			},
		});

		expect(screen.getByRole("alert")).toHaveTextContent("Reference images could not be loaded.");
		await userEvent.click(screen.getByRole("button", { name: /try again/i }));
		expect(onRetry).toHaveBeenCalledOnce();
	});
});
