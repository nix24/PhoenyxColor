<script lang="ts">
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";

	interface Props {
		imageName: string;
		canUndo: boolean;
		canRedo: boolean;
		isComparing: boolean;
		zoom: number;
		onClose: () => void;
		onUndo: () => void;
		onRedo: () => void;
		onCompareStart: () => void;
		onCompareEnd: () => void;
		onFitToScreen: () => void;
		onZoomIn: () => void;
		onZoomOut: () => void;
		onShowShortcuts: () => void;
	}

	const {
		imageName,
		canUndo,
		canRedo,
		isComparing,
		zoom,
		onClose,
		onUndo,
		onRedo,
		onCompareStart,
		onCompareEnd,
		onFitToScreen,
		onZoomIn,
		onZoomOut,
		onShowShortcuts,
	}: Props = $props();
</script>

<div
	class="h-12 sm:h-14 flex items-center justify-between px-2 sm:px-4 bg-black/60 backdrop-blur-xl border-b border-white/8 z-20 shrink-0"
>
	<!-- Left: Back + Title -->
	<div class="flex items-center gap-2 min-w-0">
		<button
			class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
			onclick={onClose}
			type="button"
			title="Back to gallery"
		>
			<Icon icon="material-symbols:arrow-back" class="w-5 h-5" />
		</button>
		<h2 class="text-white font-semibold text-sm truncate min-w-0">
			{imageName}
		</h2>
	</div>

	<!-- Center: Undo/Redo + Compare -->
	<div class="flex items-center gap-0.5">
		<button
			class="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
			onclick={onUndo}
			disabled={!canUndo}
			title="Undo (Ctrl+Z)"
			type="button"
		>
			<Icon icon="material-symbols:undo" class="w-5 h-5" />
		</button>
		<button
			class="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
			onclick={onRedo}
			disabled={!canRedo}
			title="Redo (Ctrl+Shift+Z)"
			type="button"
		>
			<Icon icon="material-symbols:redo" class="w-5 h-5" />
		</button>
		<div class="h-5 w-px bg-white/8 mx-1 hidden sm:block"></div>
		<button
			class={cn(
				"w-9 h-9 rounded-lg items-center justify-center transition-colors hidden sm:flex",
				isComparing ? "text-phoenix-primary bg-phoenix-primary/10" : "text-white/50 hover:text-white hover:bg-white/10"
			)}
			onmousedown={onCompareStart}
			onmouseup={onCompareEnd}
			onmouseleave={onCompareEnd}
			title="Hold to compare original (Space)"
			aria-label="Compare with original"
			type="button"
		>
			<Icon icon="material-symbols:compare" class="w-5 h-5" />
		</button>
	</div>

	<!-- Right: Zoom Controls + Help -->
	<div class="flex items-center gap-0.5">
		<button
			class="w-9 h-9 rounded-lg items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors hidden sm:flex"
			onclick={onFitToScreen}
			title="Fit to screen (R)"
			aria-label="Fit to screen"
			type="button"
		>
			<Icon icon="material-symbols:fit-screen" class="w-4 h-4" />
		</button>
		<div class="hidden sm:flex items-center gap-0.5 bg-white/5 rounded-lg px-1 py-0.5" role="group" aria-label="Zoom controls">
			<button
				class="w-7 h-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
				onclick={onZoomOut}
				title="Zoom out (Ctrl+-)"
				aria-label="Zoom out"
				type="button"
			>
				<Icon icon="material-symbols:remove" class="w-3.5 h-3.5" />
			</button>
			<span class="text-[11px] font-mono text-white/50 min-w-[40px] text-center select-none" aria-live="polite">
				{Math.round(zoom * 100)}%
			</span>
			<button
				class="w-7 h-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
				onclick={onZoomIn}
				title="Zoom in (Ctrl++)"
				aria-label="Zoom in"
				type="button"
			>
				<Icon icon="material-symbols:add" class="w-3.5 h-3.5" />
			</button>
		</div>
		<button
			class="w-9 h-9 rounded-lg items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors hidden md:flex"
			onclick={onShowShortcuts}
			title="Keyboard shortcuts"
			aria-label="Keyboard shortcuts"
			type="button"
		>
			<Icon icon="material-symbols:keyboard" class="w-4 h-4" />
		</button>
	</div>
</div>
