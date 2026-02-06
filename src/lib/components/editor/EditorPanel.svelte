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
		children: import("svelte").Snippet;
		class?: string;
		size?: "sm" | "md" | "lg";
	}>();

	const sizeClasses = {
		sm: "md:w-80",
		md: "md:w-[22rem]",
		lg: "md:w-[28rem]",
	};

	// Detect mobile for transition direction
	let isMobile = $state(false);

	$effect(() => {
		const mq = window.matchMedia("(max-width: 767px)");
		isMobile = mq.matches;
		const handler = (e: MediaQueryListEvent) => (isMobile = e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	});
</script>

{#if isOpen}
	<!-- Mobile backdrop - tappable to close -->
	{#if isMobile}
		<button
			class="fixed inset-0 z-40 md:hidden bg-black/30 backdrop-blur-[2px]"
			transition:fade={{ duration: 150 }}
			onclick={onClose}
			aria-label="Close panel"
			type="button"
		></button>
	{/if}

	<!-- Panel - Bottom sheet on mobile, right sidebar on desktop -->
	{#key isMobile}
		<div
			class={cn(
				"fixed z-50 bg-void-deep/97 backdrop-blur-2xl shadow-2xl shadow-black/60",
				// Mobile: bottom sheet with generous height
				"bottom-0 left-0 right-0 max-h-[65vh] rounded-t-2xl border-t border-white/8",
				// Desktop: right sidebar
				"md:bottom-14 md:top-12 md:left-auto md:right-0 md:max-h-none md:rounded-t-none md:rounded-l-xl md:border-t-0 md:border-l md:border-white/8",
				sizeClasses[size as keyof typeof sizeClasses],
				className
			)}
			transition:fly={{
				y: isMobile ? 300 : 0,
				x: isMobile ? 0 : 100,
				duration: 250,
				easing: cubicOut,
			}}
		>
			<!-- Handle Bar - mobile only -->
			<div class="flex justify-center pt-2 pb-0.5 md:hidden">
				<div class="w-8 h-1 bg-white/15 rounded-full"></div>
			</div>

			<!-- Header -->
			<div class="flex items-center justify-between px-4 py-2.5 border-b border-white/5 shrink-0">
				<div class="flex items-center gap-2.5">
					{#if icon}
						<div class="w-7 h-7 rounded-lg bg-phoenix-primary/15 flex items-center justify-center">
							<Icon {icon} class="w-4 h-4 text-phoenix-primary" />
						</div>
					{/if}
					<h3 class="text-sm font-bold text-white tracking-wide">{title}</h3>
				</div>
				<button
					class="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
					onclick={onClose}
					title="Close (Esc)"
					type="button"
				>
					<Icon icon="material-symbols:close" class="w-4 h-4" />
				</button>
			</div>

			<!-- Content -->
			<div
				class="overflow-y-auto custom-scrollbar max-h-[calc(65vh-72px)] md:max-h-[calc(100vh-10.5rem)]"
			>
				<div class="p-4 pb-6">
					{@render children()}
				</div>
			</div>
		</div>
	{/key}
{/if}
