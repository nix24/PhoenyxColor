<script lang="ts">
	import { fly, fade } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import Icon from "@iconify/svelte";
	import { cn } from "$lib/utils/cn";

	let {
		title,
		icon,
		isOpen = false,
		onClose,
		children,
		class: className = "",
		size = "md",
	} = $props<{
		title: string;
		icon?: string;
		isOpen: boolean;
		onClose: () => void;
		children: any;
		class?: string;
		size?: "sm" | "md" | "lg";
	}>();

	const sizeClasses = {
		sm: "md:w-80",
		md: "md:w-96",
		lg: "md:w-[480px]",
	};
</script>

{#if isOpen}
	<!-- No backdrop on desktop - user needs to interact with canvas -->
	<!-- On mobile only: subtle backdrop that doesn't block interaction -->
	<div class="fixed inset-0 z-40 pointer-events-none md:hidden" transition:fade={{ duration: 150 }}>
		<!-- Mobile backdrop - only covers top portion, not the bottom where panel is -->
		<div class="absolute inset-0 bottom-[50vh] bg-black/20"></div>
	</div>

	<!-- Panel - Bottom on mobile, Right sidebar on desktop -->
	<div
		class={cn(
			// Mobile: bottom sheet
			"fixed z-50 bg-void-deep/98 backdrop-blur-xl border-white/10 shadow-2xl shadow-black/50",
			"bottom-0 left-0 right-0 max-h-[50vh] rounded-t-2xl border-t",
			// Desktop: right sidebar
			"md:bottom-auto md:top-14 md:left-auto md:right-0 md:max-h-[calc(100vh-7rem)] md:rounded-t-none md:rounded-l-2xl md:border-t-0 md:border-l",
			sizeClasses[size as keyof typeof sizeClasses],
			className
		)}
		transition:fly={{ y: 300, x: 0, duration: 250, easing: cubicOut }}
	>
		<!-- Handle Bar - mobile only -->
		<div class="flex justify-center pt-2 pb-1 md:hidden">
			<div class="w-10 h-1 bg-white/20 rounded-full"></div>
		</div>

		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-2 border-b border-white/5">
			<div class="flex items-center gap-2">
				{#if icon}
					<div class="w-6 h-6 rounded-md bg-phoenix-primary/20 flex items-center justify-center">
						<Icon {icon} class="w-4 h-4 text-phoenix-primary" />
					</div>
				{/if}
				<h3 class="text-sm font-bold text-white tracking-wide">{title}</h3>
			</div>
			<button
				class="btn btn-xs btn-circle btn-ghost text-white/60 hover:text-white hover:bg-white/10"
				onclick={onClose}
			>
				<Icon icon="material-symbols:close" class="w-4 h-4" />
			</button>
		</div>

		<!-- Content -->
		<div
			class="overflow-y-auto custom-scrollbar max-h-[calc(50vh-60px)] md:max-h-[calc(100vh-10rem)]"
		>
			<div class="p-4">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
