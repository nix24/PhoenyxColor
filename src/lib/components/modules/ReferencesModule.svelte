<script lang="ts">
import { onMount } from "svelte";
import Icon from "@iconify/svelte";
import { toast } from "svelte-sonner";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import {
	referenceLibrary,
	type ReferenceLibrary,
	type RemovedReference,
} from "$lib/features/references";
import type { ReferenceId } from "$lib/types/brands";
import ImageLibrary from "$lib/components/modules/references/ImageLibrary.svelte";
import ImageEditorLayout from "$lib/components/modules/references/ImageEditorLayout.svelte";
import { editorHref, requestedReferenceId } from "$lib/components/modules/references/editor-url";

const library: ReferenceLibrary = referenceLibrary();

let fileInput: HTMLInputElement;
let isDragOver = $state(false);
let isLoading = $state(true);

/** One file being imported, shown by name until it lands (or fails). */
interface ImportEntry {
	id: string;
	name: string;
	status: "importing" | "done" | "failed";
}
let imports = $state<ImportEntry[]>([]);

/** The reference the URL asks for, once the library knows it. */
const requestedId = $derived(requestedReferenceId(page.url));
const selectedImageId = $derived<ReferenceId | null>(
	requestedId === null || isLoading
		? null
		: (library.items.find((item) => item.reference.id === requestedId)?.reference.id ?? null)
);
/** Set when this tab pushed the editor's history entry, so closing can simply go back. */
let hasEditorEntry = false;

// A link or reload to a reference that no longer exists falls back to the gallery.
$effect(() => {
	if (isLoading || requestedId === null || selectedImageId !== null) return;
	toast.error("This reference no longer exists.");
	void goto(editorHref(page.url, null), { replaceState: true });
});

onMount(() => {
	let cancelled = false;
	void library.whenReady().finally(() => {
		if (!cancelled) isLoading = false;
	});
	return () => {
		cancelled = true;
	};
});

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILES_AT_ONCE = 20;

/** Whether a dropped or selected file is an image this module will accept. */
type FileAcceptance = { valid: boolean; error?: string };

function validateFile(file: File): FileAcceptance {
	if (!ALLOWED_TYPES.includes(file.type)) {
		return { valid: false, error: `Unsupported file type: ${file.type}` };
	}
	if (file.size > MAX_FILE_SIZE) {
		return {
			valid: false,
			error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 50MB)`,
		};
	}
	return { valid: true };
}

function handleFileSelect(event: Event) {
	// SAFETY: this handler is bound only to the hidden `<input type="file">` below, so
	// the event target is always that input.
	const input = event.target as HTMLInputElement;
	const files = input.files;
	if (files) addFiles(Array.from(files));
	input.value = "";
}

function handleDrop(event: DragEvent) {
	event.preventDefault();
	isDragOver = false;
	const files = event.dataTransfer?.files;
	if (files) addFiles(Array.from(files));
}

function handleDragOver(event: DragEvent) {
	event.preventDefault();
	if (!event.dataTransfer) return;
	event.dataTransfer.dropEffect = "copy";
	isDragOver = true;
}

function handleDragLeave(event: DragEvent) {
	// SAFETY: `currentTarget` is the element this handler is attached to — the drop zone
	// `<div>` — which is always an HTMLElement.
	const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
	const { clientX: x, clientY: y } = event;
	if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
		isDragOver = false;
	}
}

async function addFiles(files: File[]) {
	if (files.length > MAX_FILES_AT_ONCE) {
		toast.error(`Please select no more than ${MAX_FILES_AT_ONCE} files at once`);
		return;
	}

	const validFiles: File[] = [];
	let invalidCount = 0;

	for (const file of files) {
		const validation = validateFile(file);
		if (!validation.valid) {
			toast.error(`${file.name}: ${validation.error}`);
			invalidCount++;
			continue;
		}
		validFiles.push(file);
	}

	if (invalidCount > 0) {
		toast.error(`${invalidCount} file(s) were invalid and skipped`);
	}
	if (validFiles.length === 0) return;

	let successCount = 0;
	for (const file of validFiles) {
		if (await processFile(file)) successCount += 1;
	}
	if (successCount > 0) toast.success(`Added ${successCount} reference image(s)`);
	if (successCount < validFiles.length) {
		toast.error(`${validFiles.length - successCount} image(s) could not be processed`);
	}
}

function setImportStatus(id: string, status: ImportEntry["status"]) {
	imports = imports.map((entry) => (entry.id === id ? { ...entry, status } : entry));
}

async function processFile(file: File): Promise<boolean> {
	const id = crypto.randomUUID();
	imports = [...imports, { id, name: file.name, status: "importing" }];
	let isImported = false;
	try {
		// Stored as-is: full resolution, original bytes, transparency intact.
		await library.importImage(file);
		isImported = true;
	} catch (error) {
		console.error("Error processing file:", error);
	}
	setImportStatus(id, isImported ? "done" : "failed");
	// Done entries leave quickly; failures stay long enough to read (the toast says it too).
	setTimeout(
		() => {
			imports = imports.filter((entry) => entry.id !== id);
		},
		isImported ? 1500 : 6000
	);
	return isImported;
}

function handleEdit(id: ReferenceId) {
	hasEditorEntry = true;
	void goto(editorHref(page.url, id));
}

async function handleDelete(id: ReferenceId) {
	const item = library.find(id);
	if (!item) return;
	try {
		const removed = await library.remove(id);
		if (removed) {
			toast.info(`Removed "${item.reference.name}"`, {
				action: { label: "Undo", onClick: () => void restore([removed]) },
			});
		}
	} catch (error) {
		console.error("Failed to delete reference:", error);
		toast.error(`"${item.reference.name}" could not be removed. Try again.`);
	}
}

async function handleClearAll() {
	const ids = library.items.map((item) => item.reference.id);
	if (ids.length === 0) return;
	const removed: RemovedReference[] = [];
	for (const id of ids) {
		try {
			const bundle = await library.remove(id);
			if (bundle) removed.push(bundle);
		} catch (error) {
			console.error("Failed to delete reference:", error);
		}
	}
	const removedCount = removed.length;
	if (removedCount > 0) {
		toast.success(`Cleared ${removedCount} reference image(s)`, {
			action: { label: "Undo", onClick: () => void restore(removed) },
		});
	}
	if (removedCount < ids.length) {
		toast.error(`${ids.length - removedCount} image(s) could not be removed. Try again.`);
	}
}

/**
 * Library-level undo: a deletion keeps everything it removed in memory until the page closes,
 * so the toast's Undo puts the references back exactly as they were.
 */
async function restore(removed: RemovedReference[]) {
	try {
		for (const bundle of removed) await library.restore(bundle);
	} catch (error) {
		console.error("Failed to restore reference:", error);
		toast.error("The images could not be restored.");
	}
}

async function handleDuplicate(id: ReferenceId) {
	const item = library.find(id);
	if (!item) return;
	try {
		await library.duplicate(id);
		toast.success(`Duplicated "${item.reference.name}"`);
	} catch (error) {
		console.error("Failed to duplicate reference:", error);
		toast.error(`"${item.reference.name}" could not be duplicated. Try again.`);
	}
}

async function handleRetryLoad() {
	isLoading = true;
	await library.load();
	isLoading = false;
}

// Back from the editor: undo our own history entry, or replace a deep link's.
function closeEditor() {
	if (hasEditorEntry) {
		hasEditorEntry = false;
		history.back();
		return;
	}
	void goto(editorHref(page.url, null), { replaceState: true });
}
</script>

<div
	class="h-full flex flex-col @container relative"
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	role="region"
	aria-label="References"
>
	<div class="flex min-h-0 flex-1 flex-col" inert={selectedImageId !== null}>
		{#if imports.length > 0}
			<div class="mx-4 mt-2 @md:mx-6" role="status" aria-live="polite">
				<div class="rounded-xl border border-white/10 bg-white/5 p-3">
					<div class="mb-2 flex items-center gap-2 text-xs text-text-muted">
						<Icon icon="material-symbols:cloud-upload" class="h-4 w-4 text-phoenix-primary" />
						{#if imports.some((entry) => entry.status === "importing")}
							Importing {imports.filter((entry) => entry.status !== "importing").length + 1} of {imports.length}
						{:else}
							Import finished
						{/if}
					</div>
					<ul class="grid gap-1">
						{#each imports as entry (entry.id)}
							<li class="flex items-center gap-2 text-xs">
								{#if entry.status === "importing"}
									<span class="loading loading-spinner loading-xs text-phoenix-primary"></span>
								{:else if entry.status === "done"}
									<Icon icon="material-symbols:check-circle" class="h-4 w-4 text-white/70" />
								{:else}
									<Icon icon="material-symbols:error" class="h-4 w-4 text-red-400" />
								{/if}
								<span class="min-w-0 flex-1 truncate text-white/80" title={entry.name}>{entry.name}</span>
								<span class={entry.status === "failed" ? "text-red-200" : "text-text-muted"}>
									{entry.status === "importing" ? "Importing…" : entry.status === "done" ? "Added" : "Could not be read"}
								</span>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}

		{#if isDragOver}
			<div class="absolute inset-0 z-30 flex items-center justify-center bg-void-deep/80 backdrop-blur-sm rounded-xl border-2 border-dashed border-phoenix-primary pointer-events-none">
				<div class="text-center">
					<Icon icon="material-symbols:cloud-upload" class="w-12 h-12 text-phoenix-primary mx-auto mb-3" />
					<p class="text-lg font-bold text-white">Drop images to add them</p>
					<p class="text-xs text-text-muted mt-1">JPG, PNG or WebP · up to {MAX_FILES_AT_ONCE} files, 50 MB each</p>
				</div>
			</div>
		{/if}

		<ImageLibrary
			items={library.items}
			{isLoading}
			loadError={library.loadError}
			{isDragOver}
			onAddFiles={() => fileInput.click()}
			onClearAll={handleClearAll}
			onEdit={handleEdit}
			onDuplicate={handleDuplicate}
			onDelete={handleDelete}
			onRetry={handleRetryLoad}
		/>
	</div>

	<input
		bind:this={fileInput}
		type="file"
		multiple
		accept={ALLOWED_TYPES.join(",")}
		class="hidden"
		onchange={handleFileSelect}
	/>

	{#if selectedImageId}
		{#key selectedImageId}
			<ImageEditorLayout imageId={selectedImageId} onClose={closeEditor} />
		{/key}
	{/if}
</div>
