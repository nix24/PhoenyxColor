<script lang="ts">
  import { appStore } from "$lib/stores/app.svelte";
  import type { ReferenceImage } from "$lib/stores/app.svelte";
  import Icon from "@iconify/svelte";
  import { toast } from "svelte-sonner";
  import { performanceService } from "$lib/services/performance";

  let fileInput: HTMLInputElement;
  let isDragOver = $state(false);
  let uploadProgress: Record<string, number> = $state({});
  let canvasZoom = $state(1);
  let canvasPan = $state({ x: 0, y: 0 });
  let draggedImage: { id: string; startX: number; startY: number } | null =
    $state(null);
  let selectedImageId: string | null = $state(null);

  // File validation constants
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/svg+xml",
  ];
  const MAX_FILES_AT_ONCE = 20;

  // Auto-create a default session if none exists
  function ensureDefaultSession() {
    if (appStore.referenceBoards.length === 0) {
      appStore.addReferenceBoard({
        name: "My References",
        references: [],
      });
    }

    // Auto-select the first board if none is selected
    if (
      !appStore.state.activeReferenceBoard &&
      appStore.referenceBoards.length > 0
    ) {
      appStore.setActiveReferenceBoard(appStore.referenceBoards[0].id);
    }
  }

  // Initialize default session on component mount
  ensureDefaultSession();

  function validateFile(file: File): { valid: boolean; error?: string } {
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

  function isDuplicateImage(fileName: string, fileSize: number): boolean {
    return appStore.references.some(
      (ref) =>
        ref.name === fileName && ref.src.length === Math.floor(fileSize * 1.33), // Rough base64 size estimate
    );
  }

  function handleFileSelect(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files) {
      addFiles(Array.from(files));
    }
    // Reset input to allow re-selecting same file
    if (event.target) {
      (event.target as HTMLInputElement).value = "";
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files) {
      addFiles(Array.from(files));
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = "copy";
    isDragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    // Only set to false if we're actually leaving the drop zone
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      isDragOver = false;
    }
  }

  function handleDropZoneKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  }

  async function addFiles(files: File[]) {
    if (files.length > MAX_FILES_AT_ONCE) {
      toast.error(
        `Please select no more than ${MAX_FILES_AT_ONCE} files at once`,
      );
      return;
    }

    const validFiles: File[] = [];
    let duplicateCount = 0;
    let invalidCount = 0;

    // Validate all files first
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        invalidCount++;
        continue;
      }

      if (isDuplicateImage(file.name, file.size)) {
        duplicateCount++;
        continue;
      }

      validFiles.push(file);
    }

    if (duplicateCount > 0) {
      toast.warning(`Skipped ${duplicateCount} duplicate image(s)`);
    }

    if (invalidCount > 0) {
      toast.error(`${invalidCount} file(s) were invalid and skipped`);
    }

    if (validFiles.length === 0) {
      return;
    }

    // Process valid files
    for (const file of validFiles) {
      await processFile(file);
    }

    toast.success(`Added ${validFiles.length} reference image(s)`);
  }

  async function processFile(file: File): Promise<void> {
    const progressId = `${file.name}-${Date.now()}`;
    uploadProgress[progressId] = 0;

    try {
      // Ensure we have an active session
      ensureDefaultSession();

      // Optimize image and generate thumbnail
      const { optimized, thumbnail } = await performanceService.optimizeImage(
        file,
        {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85,
        },
      );

      uploadProgress[progressId] = 50;

      const imageUrl = URL.createObjectURL(optimized);

      uploadProgress[progressId] = 80;

      appStore.addReference({
        src: imageUrl,
        thumbnailSrc: thumbnail,
        name: file.name.replace(/\.[^/.]+$/, ""),
        position: { x: 50, y: 50 },
        scale: 1,
        rotation: 0,
        opacity: 1,
        isGrayscale: false,
      });

      uploadProgress[progressId] = 100;
      toast.success(`Added "${file.name}" to references`);
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error(`Failed to process "${file.name}"`);
    } finally {
      setTimeout(() => {
        delete uploadProgress[progressId];
      }, 1000);
    }
  }

  function removeReference(id: string) {
    const reference = appStore.references.find((ref) => ref.id === id);
    if (reference) {
      appStore.removeReference(id);
      toast.info(`Removed "${reference.name}"`);

      // Clear selection if this was the selected image
      if (selectedImageId === id) {
        selectedImageId = null;
      }
    }
  }

  function updateReferenceProperty(
    id: string,
    property: keyof ReferenceImage,
    value: any,
  ) {
    // Validate numeric inputs
    if (property === "opacity" && (value < 0 || value > 1)) {
      value = Math.max(0, Math.min(1, value));
    }
    if (property === "scale" && (value < 0.1 || value > 5)) {
      value = Math.max(0.1, Math.min(5, value));
    }
    if (property === "rotation" && (value < 0 || value > 360)) {
      value = ((value % 360) + 360) % 360; // Normalize to 0-360
    }

    appStore.updateReference(id, { [property]: value });
  }

  function handleImageMouseDown(event: MouseEvent, referenceId: string) {
    event.preventDefault();
    selectedImageId = referenceId;

    const reference = appStore.references.find((ref) => ref.id === referenceId);
    if (!reference) return;

    draggedImage = {
      id: referenceId,
      startX: event.clientX - reference.position.x,
      startY: event.clientY - reference.position.y,
    };

    document.addEventListener("mousemove", handleImageMouseMove);
    document.addEventListener("mouseup", handleImageMouseUp);
  }

  function handleImageMouseMove(event: MouseEvent) {
    if (!draggedImage) return;

    const newX = event.clientX - draggedImage.startX;
    const newY = event.clientY - draggedImage.startY;

    updateReferenceProperty(draggedImage.id, "position", { x: newX, y: newY });
  }

  function handleImageMouseUp() {
    if (draggedImage) {
      draggedImage = null;
      document.removeEventListener("mousemove", handleImageMouseMove);
      document.removeEventListener("mouseup", handleImageMouseUp);
    }
  }

  function handleImageKeydown(event: KeyboardEvent, referenceId: string) {
    if (!selectedImageId || selectedImageId !== referenceId) return;

    const reference = appStore.references.find((ref) => ref.id === referenceId);
    if (!reference) return;

    const moveAmount = event.shiftKey ? 10 : 1;

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        updateReferenceProperty(referenceId, "position", {
          x: reference.position.x - moveAmount,
          y: reference.position.y,
        });
        break;
      case "ArrowRight":
        event.preventDefault();
        updateReferenceProperty(referenceId, "position", {
          x: reference.position.x + moveAmount,
          y: reference.position.y,
        });
        break;
      case "ArrowUp":
        event.preventDefault();
        updateReferenceProperty(referenceId, "position", {
          x: reference.position.x,
          y: reference.position.y - moveAmount,
        });
        break;
      case "ArrowDown":
        event.preventDefault();
        updateReferenceProperty(referenceId, "position", {
          x: reference.position.x,
          y: reference.position.y + moveAmount,
        });
        break;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        removeReference(referenceId);
        break;
      case "=":
      case "+":
        event.preventDefault();
        updateReferenceProperty(referenceId, "scale", reference.scale * 1.1);
        break;
      case "-":
        event.preventDefault();
        updateReferenceProperty(referenceId, "scale", reference.scale * 0.9);
        break;
    }
  }

  function resetImagePosition(id: string) {
    updateReferenceProperty(id, "position", { x: 0, y: 0 });
    toast.info("Image position reset to center");
  }

  function resetImageTransform(id: string) {
    const updates = {
      position: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      opacity: 1,
      isGrayscale: false,
    };
    appStore.updateReference(id, updates);
    toast.info("Image transform reset");
  }

  function clearAllReferences() {
    if (appStore.references.length === 0) return;

    const count = appStore.references.length;
    appStore.references.forEach((ref) => appStore.removeReference(ref.id));
    selectedImageId = null;
    toast.success(`Cleared ${count} reference image(s)`);
  }

  function duplicateReference(id: string) {
    const reference = appStore.references.find((ref) => ref.id === id);
    if (reference) {
      appStore.addReference({
        ...reference,
        name: `${reference.name} (Copy)`,
        position: {
          x: reference.position.x + 20,
          y: reference.position.y + 20,
        },
      });
      toast.success(`Duplicated "${reference.name}"`);
    }
  }

  async function exportReferenceBoard() {
    const activeSessionId = appStore.state.activeReferenceBoard;
    if (!activeSessionId) {
      toast.error("No active session to export.");
      return;
    }

    const sessionToExport = appStore.referenceBoards.find(
      (board) => board.id === activeSessionId,
    );
    if (!sessionToExport) {
      toast.error("Could not find the active session data.");
      return;
    }

    // We need to embed the actual reference image data (or a subset of it)
    // for a self-contained export if the references aren't globally accessible by src alone.
    // For simplicity here, we assume `ReferenceBoard` already stores necessary info.
    // Or, we might fetch full ReferenceImage objects related to the board.

    // Export session data
    const dataStr = JSON.stringify(sessionToExport, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sessionToExport.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "reference_session"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported session "${sessionToExport.name}"`);
  }

  function importReferenceBoard() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const boardData = JSON.parse(text);

        // Basic validation
        if (
          !boardData.id ||
          !boardData.name ||
          !Array.isArray(boardData.references)
        ) {
          throw new Error("Invalid session file format.");
        }

        // Check for duplicates or offer to overwrite/rename
        const existingBoard = appStore.referenceBoards.find(
          (b) => b.id === boardData.id,
        );
        if (existingBoard) {
          if (!confirm("A session with this ID already exists. Overwrite?")) {
            toast.info("Import cancelled.");
            return;
          }
          appStore.updateReferenceBoard(boardData.id, boardData);
        } else {
          appStore.addReferenceBoard(boardData);
        }
        appStore.setActiveReferenceBoard(boardData.id);
        toast.success(`Imported session "${boardData.name}"`);
      } catch (error: any) {
        toast.error(`Failed to import session: ${error.message}`);
        console.error("Error importing session:", error);
      }
    };
    input.click();
  }

  let newBoardName = $state("");

  function createNewSession() {
    if (!newBoardName.trim()) {
      toast.error("Please enter a name for the new session.");
      return;
    }

    appStore.addReferenceBoard({
      name: newBoardName,
      references: [],
    });

    toast.success(`Created new session: "${newBoardName}"`);
    newBoardName = "";
  }
</script>

<div class="h-full flex flex-col bg-base-100">
  <!-- Header -->
  <div
    class="flex items-center justify-between p-6 border-b border-base-300 bg-base-100"
  >
    <div>
      <h2 class="text-2xl font-bold text-base-content">Reference Manager</h2>
      <div class="text-sm text-base-content/70 flex items-center gap-2">
        <span>Current Session:</span>
        <select
          class="select select-xs select-bordered"
          value={appStore.state.activeReferenceBoard || ""}
          onchange={(e) => {
            const value = (e.target as HTMLSelectElement).value;
            if (value) {
              appStore.setActiveReferenceBoard(value);
            }
          }}
        >
          {#each appStore.referenceBoards as board (board.id)}
            <option value={board.id}>{board.name}</option>
          {/each}
        </select>
        <span class="text-xs text-base-content/50">
          ({appStore.references.length} images)
        </span>
      </div>
    </div>

    <div class="flex items-center space-x-3">
      <button
        class="btn btn-primary"
        onclick={() => fileInput.click()}
        type="button"
        aria-label="Add reference images"
        title="Add images to current session"
      >
        <Icon icon="material-symbols:add" class="w-4 h-4" />
        Add Images
      </button>

      <div class="dropdown dropdown-end">
        <button
          tabindex="0"
          class="btn btn-outline"
          aria-label="Session actions"
        >
          <Icon icon="material-symbols:folder-outline" class="w-4 h-4" />
          Sessions
          <Icon icon="material-symbols:arrow-drop-down" class="w-4 h-4" />
        </button>
        <ul
          class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-[1] border border-base-300"
        >
          <li>
            <details class="collapse collapse-arrow p-0 m-0">
              <summary
                class="p-2 cursor-pointer hover:bg-base-200 rounded-lg flex items-center"
              >
                <Icon icon="material-symbols:add-box-outline" class="mr-2" />
                New Session
              </summary>
              <div class="collapse-content !p-0">
                <div class="p-2 bg-base-200 rounded-b-lg">
                  <input
                    type="text"
                    placeholder="Session name"
                    class="input input-sm input-bordered w-full mb-2"
                    bind:value={newBoardName}
                  />
                  <button
                    class="btn btn-sm btn-primary w-full"
                    onclick={createNewSession}
                  >
                    Create
                  </button>
                </div>
              </div>
            </details>
          </li>
          <li><hr class="my-1" /></li>
          <li>
            <button onclick={importReferenceBoard}>
              <Icon icon="material-symbols:file-upload" />
              Import Session
            </button>
          </li>
          <li>
            <button
              onclick={exportReferenceBoard}
              disabled={!appStore.state.activeReferenceBoard}
            >
              <Icon icon="material-symbols:file-download" />
              Export Session
            </button>
          </li>
          {#if appStore.state.activeReferenceBoard && appStore.referenceBoards.length > 1}
            <li><hr class="my-1" /></li>
            <li>
              <button
                class="text-error"
                onclick={() => {
                  if (
                    confirm(
                      "Delete this session? This action cannot be undone.",
                    )
                  ) {
                    appStore.removeReferenceBoard(
                      appStore.state.activeReferenceBoard!,
                    );
                  }
                }}
              >
                <Icon icon="material-symbols:delete-outline" />
                Delete Session
              </button>
            </li>
          {/if}
        </ul>
      </div>

      <button
        class="btn btn-outline btn-error"
        title="Clear All References"
        onclick={clearAllReferences}
        type="button"
        disabled={appStore.references.length === 0}
        aria-label="Clear all reference images"
      >
        <Icon icon="material-symbols:clear-all" class="w-4 h-4" />
      </button>
    </div>
  </div>

  <!-- Upload Progress -->
  {#if Object.keys(uploadProgress).length > 0}
    <div class="bg-base-200 border-b border-base-300 p-3">
      <div class="text-sm text-base-content/70 mb-2">Uploading images...</div>
      {#each Object.entries(uploadProgress) as [id, progress]}
        <div class="mb-1">
          <div class="flex justify-between text-xs text-base-content/60 mb-1">
            <span>{id.split("-")[0]}</span>
            <span>{progress}%</span>
          </div>
          <div class="w-full bg-base-300 rounded-full h-1">
            <div
              class="bg-primary h-1 rounded-full transition-all duration-300"
              style:width="{progress}%"
            ></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Main Content -->
  <div class="flex-1 flex">
    <!-- References List -->
    <div class="w-80 border-r border-base-300 bg-base-100">
      <div class="p-4">
        <h3 class="font-semibold text-base-content mb-3">
          References ({appStore.references.length})
        </h3>

        <!-- Drop Zone -->
        <div
          role="button"
          tabindex="0"
          aria-label="Drop zone for uploading images. Press Enter or Space to browse files."
          class="mb-4 p-6 border-2 border-dashed rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          class:border-primary={isDragOver}
          class:bg-primary-bg={isDragOver}
          class:border-base-300={!isDragOver}
          ondrop={handleDrop}
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          onkeydown={handleDropZoneKeydown}
        >
          <div class="text-center">
            <Icon
              icon="material-symbols:cloud-upload"
              class="h-8 w-8 mx-auto mb-2 transition-colors {isDragOver
                ? 'text-primary'
                : 'text-base-content/40'}"
            />
            <p class="text-sm text-base-content/70">
              Drop images here or
              <button
                class="text-primary hover:text-primary/80 underline focus:outline-none focus:ring-1 focus:ring-primary rounded"
                onclick={() => fileInput.click()}
                type="button"
              >
                browse files
              </button>
            </p>
            <p class="text-xs text-base-content/50 mt-1">
              Max {MAX_FILES_AT_ONCE} files, 50MB each
            </p>
          </div>
        </div>

        <!-- References List -->
        <div class="space-y-2 max-h-96 overflow-y-auto">
          {#each appStore.references as reference (reference.id)}
            <div
              class="reference-item bg-base-100 rounded-lg p-3 border transition-all duration-200"
              class:border-primary={selectedImageId === reference.id}
              class:bg-primary-selected={selectedImageId === reference.id}
              class:border-base-300={selectedImageId !== reference.id}
            >
              <!-- Thumbnail and Info -->
              <div class="flex items-center space-x-3 mb-3">
                <button
                  class="relative group focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  onclick={() =>
                    (selectedImageId =
                      selectedImageId === reference.id ? null : reference.id)}
                  type="button"
                  aria-label="Select reference image {reference.name}"
                >
                  <img
                    src={reference.thumbnailSrc || reference.src}
                    alt={reference.name}
                    class="w-12 h-12 object-cover rounded border transition-all duration-200 group-hover:scale-105"
                    style:opacity={reference.opacity}
                    style:filter={reference.isGrayscale
                      ? "grayscale(100%)"
                      : "none"}
                    loading="lazy"
                  />
                  {#if selectedImageId === reference.id}
                    <div
                      class="absolute inset-0 border-2 border-primary rounded bg-primary/20"
                    ></div>
                  {/if}
                </button>

                <div class="flex-1 min-w-0">
                  <p
                    class="text-sm font-medium text-base-content truncate"
                    title={reference.name}
                  >
                    {reference.name}
                  </p>
                  <p class="text-xs text-base-content/70">
                    Scale: {Math.round(reference.scale * 100)}% | Rotation: {reference.rotation}°
                  </p>
                </div>

                <div class="flex items-center space-x-1">
                  <button
                    class="btn btn-xs btn-ghost"
                    onclick={() => duplicateReference(reference.id)}
                    title="Duplicate reference"
                    type="button"
                    aria-label="Duplicate reference {reference.name}"
                  >
                    <Icon
                      icon="material-symbols:content-copy"
                      class="h-3 w-3"
                    />
                  </button>

                  <button
                    class="btn btn-xs btn-ghost"
                    onclick={() => resetImagePosition(reference.id)}
                    title="Reset position"
                    type="button"
                    aria-label="Reset position for {reference.name}"
                  >
                    <Icon
                      icon="material-symbols:center-focus-weak"
                      class="h-3 w-3"
                    />
                  </button>

                  <button
                    class="btn btn-xs btn-ghost text-error"
                    onclick={() => removeReference(reference.id)}
                    title="Remove reference"
                    type="button"
                    aria-label="Remove reference {reference.name}"
                  >
                    <Icon
                      icon="material-symbols:delete-outline"
                      class="h-3 w-3"
                    />
                  </button>
                </div>
              </div>

              <!-- Controls -->
              <div class="space-y-2 text-xs">
                <!-- Opacity -->
                <div class="flex items-center space-x-2">
                  <label
                    for="opacity-{reference.id}"
                    class="w-12 text-base-content/70 text-xs">Opacity:</label
                  >
                  <input
                    id="opacity-{reference.id}"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={reference.opacity}
                    class="range range-xs range-primary flex-1"
                    oninput={(e) =>
                      updateReferenceProperty(
                        reference.id,
                        "opacity",
                        parseFloat(
                          (e.target as HTMLInputElement)?.value || "1",
                        ),
                      )}
                    aria-label="Adjust opacity for {reference.name}"
                  />
                  <span class="w-8 text-base-content/70 text-xs"
                    >{Math.round(reference.opacity * 100)}%</span
                  >
                </div>

                <!-- Scale -->
                <div class="flex items-center space-x-2">
                  <label
                    for="scale-{reference.id}"
                    class="w-12 text-base-content/70 text-xs">Scale:</label
                  >
                  <input
                    id="scale-{reference.id}"
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.05"
                    value={reference.scale}
                    class="range range-xs range-primary flex-1"
                    oninput={(e) =>
                      updateReferenceProperty(
                        reference.id,
                        "scale",
                        parseFloat(
                          (e.target as HTMLInputElement)?.value || "1",
                        ),
                      )}
                    aria-label="Adjust scale for {reference.name}"
                  />
                  <span class="w-8 text-base-content/70 text-xs"
                    >{Math.round(reference.scale * 100)}%</span
                  >
                </div>

                <!-- Rotation -->
                <div class="flex items-center space-x-2">
                  <label
                    for="rotation-{reference.id}"
                    class="w-12 text-base-content/70 text-xs">Rotate:</label
                  >
                  <input
                    id="rotation-{reference.id}"
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={reference.rotation}
                    class="range range-xs range-primary flex-1"
                    oninput={(e) =>
                      updateReferenceProperty(
                        reference.id,
                        "rotation",
                        parseInt((e.target as HTMLInputElement)?.value || "0"),
                      )}
                    aria-label="Adjust rotation for {reference.name}"
                  />
                  <span class="w-8 text-base-content/70 text-xs"
                    >{reference.rotation}°</span
                  >
                </div>

                <!-- Toggles and Actions -->
                <div class="flex items-center justify-between pt-2">
                  <label class="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reference.isGrayscale}
                      onchange={(e) =>
                        updateReferenceProperty(
                          reference.id,
                          "isGrayscale",
                          (e.target as HTMLInputElement)?.checked || false,
                        )}
                      class="checkbox checkbox-xs"
                      aria-label="Toggle grayscale for {reference.name}"
                    />
                    <span class="text-base-content/70">Grayscale</span>
                  </label>

                  <button
                    class="btn btn-xs btn-ghost"
                    onclick={() => resetImageTransform(reference.id)}
                    title="Reset all transforms"
                    type="button"
                  >
                    <Icon icon="material-symbols:refresh" class="h-3 w-3" />
                    <span class="text-xs">Reset</span>
                  </button>
                </div>
              </div>
            </div>
          {/each}

          {#if appStore.references.length === 0}
            <div class="text-center py-8 text-base-content/70">
              <Icon
                icon="material-symbols:image-outline"
                class="h-12 w-12 mx-auto mb-2 opacity-50"
              />
              <p>No reference images yet</p>
              <p class="text-xs">Add some images to get started</p>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Canvas Area -->
    <div class="flex-1 bg-base-100 relative overflow-hidden">
      {#if appStore.references.length > 0}
        <div
          class="canvas-area h-full relative"
          role="application"
          aria-label="Reference images canvas"
        >
          {#if selectedImageId}
            <div
              class="absolute top-4 left-4 bg-base-100 rounded-lg shadow-lg p-2 border border-base-300 z-10"
            >
              <p class="text-xs text-base-content/70 mb-1">
                Selected: {appStore.references.find(
                  (r) => r.id === selectedImageId,
                )?.name}
              </p>
              <p class="text-xs text-base-content/50">
                Use arrow keys to move (Shift = 10px steps)<br />
                +/- to scale, Delete to remove
              </p>
            </div>
          {/if}

          {#each appStore.references as reference (reference.id)}
            <div
              class="absolute select-none transition-all duration-100"
              class:cursor-move={!draggedImage}
              class:cursor-grabbing={draggedImage?.id === reference.id}
              class:z-20={selectedImageId === reference.id}
              class:z-10={selectedImageId !== reference.id}
              style:transform="translate({reference.position.x}px, {reference
                .position.y}px) scale({reference.scale}) rotate({reference.rotation}deg)"
              style:opacity={reference.opacity}
              role="button"
              tabindex={selectedImageId === reference.id ? 0 : -1}
              aria-label="Reference image: {reference.name}. Use arrow keys to move, +/- to scale."
              onmousedown={(e) => handleImageMouseDown(e, reference.id)}
              onkeydown={(e) => handleImageKeydown(e, reference.id)}
              onclick={() => (selectedImageId = reference.id)}
            >
              <img
                src={reference.src}
                alt={reference.name}
                class="max-w-md max-h-md object-contain rounded-lg shadow-lg border-2 transition-all duration-200"
                class:border-primary={selectedImageId === reference.id}
                class:border-white={selectedImageId !== reference.id}
                style:filter={reference.isGrayscale
                  ? "grayscale(100%)"
                  : "none"}
                draggable="false"
                loading="lazy"
              />

              {#if selectedImageId === reference.id}
                <div
                  class="absolute -inset-2 border-2 border-primary rounded-lg pointer-events-none"
                ></div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="flex items-center justify-center h-full">
          <div class="text-center text-base-content/70">
            <Icon
              icon="material-symbols:photo-library-outline"
              class="h-24 w-24 mx-auto mb-4 opacity-30"
            />
            <h3 class="text-xl font-semibold mb-2">Empty Canvas</h3>
            <p class="mb-4">Add reference images to start your project</p>
            <button
              class="btn btn-primary"
              onclick={() => fileInput.click()}
              type="button"
            >
              Add Your First Reference
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Hidden file input -->
  <input
    bind:this={fileInput}
    type="file"
    multiple
    accept={ALLOWED_TYPES.join(",")}
    class="hidden"
    onchange={handleFileSelect}
  />
</div>

<style>
  .reference-item {
    transition: all 0.2s var(--ease-smooth);
  }

  .reference-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px hsl(var(--b3) / 0.3);
  }

  .bg-primary-selected {
    background-color: hsl(var(--p) / 0.1);
  }

  .bg-primary-bg {
    background-color: hsl(var(--p) / 0.1);
  }

  .canvas-area {
    background-image: linear-gradient(
        45deg,
        hsl(var(--b2)) 25%,
        transparent 25%
      ),
      linear-gradient(-45deg, hsl(var(--b2)) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, hsl(var(--b2)) 75%),
      linear-gradient(-45deg, transparent 75%, hsl(var(--b2)) 75%);
    background-size: 20px 20px;
    background-position:
      0 0,
      0 10px,
      10px -10px,
      -10px 0px;
  }

  /* Custom range slider styles using DaisyUI theme colors */
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: hsl(var(--p));
    cursor: pointer;
    border: 2px solid hsl(var(--b1));
    box-shadow: 0 2px 4px hsl(var(--b3) / 0.3);
  }

  input[type="range"]::-webkit-slider-track {
    height: 4px;
    border-radius: 2px;
    background: hsl(var(--b3));
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: hsl(var(--p));
    cursor: pointer;
    border: 2px solid hsl(var(--b1));
    box-shadow: 0 2px 4px hsl(var(--b3) / 0.3);
  }

  input[type="range"]::-moz-range-track {
    height: 4px;
    border-radius: 2px;
    background: hsl(var(--b3));
  }
</style>
