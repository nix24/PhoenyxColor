<script lang="ts">
import { onMount, type Snippet } from "svelte";
import Icon from "@iconify/svelte";

let {
	leftImage,
	rightImage,
	leftLabel = "Before",
	rightLabel = "After",
	position = $bindable(50),
} = $props<{
	leftImage: Snippet;
	rightImage: Snippet;
	leftLabel?: string;
	rightLabel?: string;
	position?: number;
}>();

let container: HTMLDivElement;
let isDragging = $state(false);

function handleMove(clientX: number) {
	if (!container) return;
	const rect = container.getBoundingClientRect();
	const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
	position = (x / rect.width) * 100;
}

function handleMouseDown(e: MouseEvent) {
	isDragging = true;
	handleMove(e.clientX);
}

function handleTouchStart(e: TouchEvent) {
	isDragging = true;
	handleMove(e.touches[0]?.clientX ?? 0);
}

function handleWindowMove(e: MouseEvent | TouchEvent) {
	if (!isDragging) return;
	const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
	handleMove(clientX);
}

function handleWindowUp() {
	isDragging = false;
}
</script>

<svelte:window
	onmousemove={handleWindowMove}
	onmouseup={handleWindowUp}
	ontouchmove={handleWindowMove}
	ontouchend={handleWindowUp}
/>

<div
	bind:this={container}
	class="relative w-full h-full overflow-hidden select-none cursor-ew-resize group"
	onmousedown={handleMouseDown}
	ontouchstart={handleTouchStart}
	role="slider"
	aria-valuenow={position}
	aria-valuemin={0}
	aria-valuemax={100}
	tabindex="0"
>
	<!-- Right Image (After/Background) -->
	<div class="absolute inset-0 w-full h-full">
		{@render rightImage()}
		{#if rightLabel}
			<div
				class="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-bold pointer-events-none backdrop-blur-sm"
			>
				{rightLabel}
			</div>
		{/if}
	</div>

	<!-- Left Image (Before/Foreground) - Clipped -->
	<div
		class="absolute inset-0 w-full h-full overflow-hidden border-r-2 border-white/50 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
		style:width="{position}%"
	>
		<!-- Inner container to counteract the width clipping and keep image centered/sized correctly -->
		<div class="absolute inset-0 w-screen h-full">
			<!-- Note: w-[100vw] is a hack, ideally we want the width of the parent container. 
				 But since we don't know the exact pixel width easily without ResizeObserver, 
				 and the images are likely object-contain centered, we need to be careful.
				 Actually, if the images are absolutely positioned and object-contain, 
				 we just need this inner container to be the full width of the slider container.
			-->
		</div>
		<!-- 
			Wait, the standard way to do this is:
			Outer div (width: position%) -> Inner div (width: 100% of PARENT container, i.e. 100 / (position/100) %)
			OR just render the image again with full width but inside this clipped container.
		-->
		<div class="absolute inset-0 w-full h-full" style:width="{10000 / position}%">
			<!-- This math is tricky for dynamic resizing. 
				 Better approach: Use `clip-path` on the top layer instead of width.
			-->
		</div>
	</div>

	<!-- Re-thinking: Clip-path approach is cleaner and avoids width hacks -->
</div>

<!-- Let's restart the markup with clip-path approach -->
<div
	bind:this={container}
	class="relative w-full h-full overflow-hidden select-none cursor-ew-resize group touch-none"
	onmousedown={handleMouseDown}
	ontouchstart={handleTouchStart}
	role="slider"
	aria-valuenow={position}
	aria-valuemin={0}
	aria-valuemax={100}
	tabindex="0"
>
	<!-- Layer 1: Right Image (Background / After) -->
	<div class="absolute inset-0 w-full h-full">
		{@render rightImage()}
		{#if rightLabel}
			<div
				class="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-bold pointer-events-none backdrop-blur-sm"
			>
				{rightLabel}
			</div>
		{/if}
	</div>

	<!-- Layer 2: Left Image (Foreground / Before) - Clipped -->
	<div
		class="absolute inset-0 w-full h-full will-change-[clip-path]"
		style:clip-path="polygon(0 0, {position}% 0, {position}% 100%, 0 100%)"
	>
		{@render leftImage()}
		{#if leftLabel}
			<div
				class="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-bold pointer-events-none backdrop-blur-sm"
			>
				{leftLabel}
			</div>
		{/if}
	</div>

	<!-- Slider Handle -->
	<div
		class="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
		style:left="{position}%"
	>
		<div
			class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-black"
		>
			<Icon icon="material-symbols:code" class="w-5 h-5 rotate-90" />
		</div>
	</div>
</div>
