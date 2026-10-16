<script lang="ts">
import Icon from "@iconify/svelte";
import { cn } from "$lib/utils/cn";

/**
 * A reference's actions (open, duplicate, delete). The menu is a native popover: it renders in
 * the top layer (never clipped by the grid), closes on Esc or an outside click, and is placed
 * inside the viewport next to its button, or at the pointer for a right-click.
 */
interface Props {
	referenceName: string;
	menuId: string;
	onOpen: () => void;
	onDuplicate: () => void;
	onDelete: () => void;
	class?: string;
}

const { referenceName, menuId, onOpen, onDuplicate, onDelete, class: className = "" }: Props =
	$props();

let trigger: HTMLButtonElement | null = $state(null);
let menu: HTMLDivElement | null = $state(null);

const MARGIN = 8;

function place(x: number, y: number) {
	if (!menu) return;
	const { width, height } = menu.getBoundingClientRect();
	menu.style.left = `${Math.max(MARGIN, Math.min(x, window.innerWidth - width - MARGIN))}px`;
	menu.style.top = `${Math.max(MARGIN, Math.min(y, window.innerHeight - height - MARGIN))}px`;
}

function handleToggle(e: ToggleEvent) {
	if (e.newState !== "open" || !menu) return;
	menu.querySelector("button")?.focus();
}

function openBelowTrigger() {
	if (!menu || !trigger) return;
	menu.showPopover();
	const rect = trigger.getBoundingClientRect();
	place(rect.right - menu.getBoundingClientRect().width, rect.bottom + 4);
}

/** Opens the menu at the pointer (right-click). */
export function openAt(x: number, y: number) {
	if (!menu) return;
	menu.showPopover();
	place(x, y);
}

function run(action: () => void) {
	menu?.hidePopover();
	action();
}

const item =
	"flex min-h-11 w-full items-center gap-2.5 px-3.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-phoenix-primary";
</script>

<button
	bind:this={trigger}
	class={cn(
		"flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-phoenix-primary",
		className
	)}
	onclick={(e) => {
		e.stopPropagation();
		openBelowTrigger();
	}}
	aria-label={`Actions for ${referenceName}`}
	aria-haspopup="true"
	aria-controls={menuId}
	type="button"
>
	<Icon icon="material-symbols:more-horiz" class="h-5 w-5" />
</button>

<div
	bind:this={menu}
	id={menuId}
	popover="auto"
	ontoggle={handleToggle}
	class="fixed m-0 min-w-44 rounded-xl border border-white/10 bg-void-deep/95 py-1.5 text-white shadow-2xl shadow-black/50 backdrop-blur-xl"
	aria-label={`Actions for ${referenceName}`}
>
	<button class={cn(item, "text-white/90 hover:bg-white/10")} onclick={() => run(onOpen)} type="button">
		<Icon icon="material-symbols:edit" class="h-4 w-4 text-phoenix-primary" />
		Edit
	</button>
	<button class={cn(item, "text-white/90 hover:bg-white/10")} onclick={() => run(onDuplicate)} type="button">
		<Icon icon="material-symbols:content-copy" class="h-4 w-4 text-white/70" />
		Duplicate
	</button>
	<div class="my-1 h-px bg-white/10"></div>
	<button class={cn(item, "text-red-400 hover:bg-red-400/10 hover:text-red-300")} onclick={() => run(onDelete)} type="button">
		<Icon icon="material-symbols:delete-outline" class="h-4 w-4" />
		Delete
	</button>
</div>
