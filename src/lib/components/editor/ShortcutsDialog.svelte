<script lang="ts">
import Icon from "@iconify/svelte";
import { SHORTCUT_GROUPS } from "./editor-shortcuts";

/** A native modal: it takes focus, traps it, closes on Esc, and returns focus to the opener. */
let { isOpen, onClose } = $props<{ isOpen: boolean; onClose: () => void }>();

let dialog: HTMLDialogElement | null = $state(null);

$effect(() => {
	if (!dialog) return;
	if (isOpen && !dialog.open) dialog.showModal();
	if (!isOpen && dialog.open) dialog.close();
});

function handleBackdropClick(e: MouseEvent) {
	if (e.target === dialog) onClose();
}
</script>

<dialog
	bind:this={dialog}
	class="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-void-deep p-0 text-white shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
	aria-labelledby="shortcuts-dialog-title"
	onclose={onClose}
	onclick={handleBackdropClick}
>
	<div class="p-6">
		<div class="mb-4 flex items-center justify-between">
			<h3 id="shortcuts-dialog-title" class="flex items-center gap-2 text-lg font-bold">
				<Icon icon="material-symbols:keyboard" class="h-5 w-5 text-phoenix-primary" />
				Keyboard shortcuts
			</h3>
			<button
				class="flex h-11 w-11 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-phoenix-primary"
				onclick={onClose}
				aria-label="Close keyboard shortcuts"
				type="button"
			>
				<Icon icon="material-symbols:close" class="h-5 w-5" />
			</button>
		</div>
		<div class="grid gap-4 text-sm sm:grid-cols-2">
			{#each SHORTCUT_GROUPS as group (group.title)}
				<section>
					<h4 class="mb-2 text-xs font-bold uppercase tracking-wider text-white/60">{group.title}</h4>
					<dl class="grid gap-1">
						{#each group.entries as entry (entry.label)}
							<div class="flex items-center justify-between gap-3 text-white/80">
								<dt>{entry.label}</dt>
								<dd class="shrink-0"><kbd class="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-xs whitespace-nowrap text-white/80">{entry.keys}</kbd></dd>
							</div>
						{/each}
					</dl>
				</section>
			{/each}
		</div>
	</div>
</dialog>
