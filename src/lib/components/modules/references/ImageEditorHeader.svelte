<script lang="ts">
import Icon from "@iconify/svelte";
import { cn } from "$lib/utils/cn";
import { shortcutHint } from "$lib/components/editor/editor-shortcuts";
import type { SaveState } from "$lib/types/image-editor";

interface Props {
	imageName: string;
	canUndo: boolean;
	canRedo: boolean;
	isComparing: boolean;
	zoom: number;
	isFitted: boolean;
	saveState: SaveState;
	/** The GPU could not hold the full image, so it is edited (and exported) smaller. */
	isSourceDownscaled: boolean;
	onClose: () => void;
	onUndo: () => void;
	onRedo: () => void;
	onCompareChange: (isComparing: boolean) => void;
	onFitToScreen: () => void;
	onActualSize: () => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onShowShortcuts: () => void;
	onRetrySave: () => void;
}

const {
	imageName,
	canUndo,
	canRedo,
	isComparing,
	zoom,
	isFitted,
	saveState,
	isSourceDownscaled,
	onClose,
	onUndo,
	onRedo,
	onCompareChange,
	onFitToScreen,
	onActualSize,
	onZoomIn,
	onZoomOut,
	onShowShortcuts,
	onRetrySave,
}: Props = $props();

/** A press longer than this is a "hold to peek"; shorter is a toggle. */
const HOLD_MS = 300;
let pressStartedAt = 0;
let wasComparing = false;

function handleComparePointerDown(e: PointerEvent) {
	// SAFETY: bound to the compare `<button>`, so `currentTarget` is that element.
	(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	pressStartedAt = performance.now();
	wasComparing = isComparing;
	onCompareChange(true);
}

function handleComparePointerUp() {
	if (pressStartedAt === 0) return;
	const isHold = performance.now() - pressStartedAt > HOLD_MS;
	pressStartedAt = 0;
	onCompareChange(isHold ? false : !wasComparing);
}

// Enter/Space arrive as a click with no pointer press; they toggle.
function handleCompareClick(e: MouseEvent) {
	if (e.detail === 0) onCompareChange(!isComparing);
}

const iconButton =
	"w-11 h-11 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-phoenix-primary";
</script>

<header
	class="flex h-14 shrink-0 items-center justify-between gap-1 border-b border-white/8 bg-black/60 px-1 backdrop-blur-xl sm:px-3"
>
	<div class="flex min-w-0 items-center gap-1">
		<button class={iconButton} onclick={onClose} type="button" aria-label="Back to References">
			<Icon icon="material-symbols:arrow-back" class="w-5 h-5" />
		</button>
		<h2 class="min-w-0 truncate text-sm font-semibold text-white" title={imageName}>{imageName}</h2>
		<div class="flex shrink-0 items-center gap-1.5 pl-1.5" role="status" aria-live="polite">
			{#if saveState === "error"}
				<Icon icon="material-symbols:cloud-off" class="h-4 w-4 text-red-400" />
				<span class="text-xs text-red-200">Not saved</span>
				<button class="btn btn-ghost btn-sm min-h-11 text-white" type="button" onclick={onRetrySave}>
					Retry
				</button>
			{:else if saveState === "saving"}
				<Icon icon="material-symbols:cloud-sync-outline" class="h-4 w-4 text-white/60" />
				<span class="hidden text-xs text-white/60 sm:inline">Saving…</span>
				<span class="sr-only sm:hidden">Saving</span>
			{:else}
				<Icon icon="material-symbols:cloud-done-outline" class="h-4 w-4 text-white/60" />
				<span class="hidden text-xs text-white/60 sm:inline">Saved</span>
				<span class="sr-only sm:hidden">Saved</span>
			{/if}
		</div>
	</div>

	<div class="flex shrink-0 items-center">
		<button class={iconButton} onclick={onUndo} disabled={!canUndo} type="button" aria-label={shortcutHint("undo")} title={shortcutHint("undo")}>
			<Icon icon="material-symbols:undo" class="w-5 h-5" />
		</button>
		<button class={iconButton} onclick={onRedo} disabled={!canRedo} type="button" aria-label={shortcutHint("redo")} title={shortcutHint("redo")}>
			<Icon icon="material-symbols:redo" class="w-5 h-5" />
		</button>
		<button
			class={cn(iconButton, "touch-none", isComparing && "text-phoenix-primary bg-phoenix-primary/10")}
			onpointerdown={handleComparePointerDown}
			onpointerup={handleComparePointerUp}
			onpointercancel={handleComparePointerUp}
			onclick={handleCompareClick}
			aria-pressed={isComparing}
			aria-label="Compare with original"
			title="Compare with original: tap to toggle, hold to peek (Space)"
			type="button"
		>
			<Icon icon="material-symbols:compare" class="w-5 h-5" />
		</button>

		<div class="ml-1 hidden h-5 w-px bg-white/8 sm:block"></div>

		{#if isSourceDownscaled}
			<span class="hidden items-center gap-1 px-2 text-xs text-white/60 lg:flex">
				<Icon icon="material-symbols:info-outline" class="h-4 w-4" />
				Edited at reduced size
			</span>
		{/if}
		<button class={cn(iconButton, "hidden sm:flex")} onclick={onFitToScreen} type="button" aria-label={shortcutHint("fit")} title={shortcutHint("fit")}>
			<Icon icon="material-symbols:fit-screen" class="w-5 h-5" />
		</button>
		<div class="flex items-center" role="group" aria-label="Zoom">
			<button class={cn(iconButton, "hidden sm:flex")} onclick={onZoomOut} type="button" aria-label={shortcutHint("zoomOut")} title={shortcutHint("zoomOut")}>
				<Icon icon="material-symbols:remove" class="w-4 h-4" />
			</button>
			<button
				class="h-11 min-w-12 rounded-lg px-1 text-center font-mono text-xs text-white/70 tabular-nums hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-phoenix-primary"
				onclick={isFitted ? onActualSize : onFitToScreen}
				type="button"
				aria-label={`Zoom ${Math.round(zoom * 100)}%. ${isFitted ? "Show at 100%" : "Fit to screen"}`}
			>
				{Math.round(zoom * 100)}%
			</button>
			<button class={cn(iconButton, "hidden sm:flex")} onclick={onZoomIn} type="button" aria-label={shortcutHint("zoomIn")} title={shortcutHint("zoomIn")}>
				<Icon icon="material-symbols:add" class="w-4 h-4" />
			</button>
		</div>
		<button class={cn(iconButton, "hidden md:flex")} onclick={onShowShortcuts} type="button" aria-label="Keyboard shortcuts" title="Keyboard shortcuts">
			<Icon icon="material-symbols:keyboard" class="w-5 h-5" />
		</button>
	</div>
</header>
