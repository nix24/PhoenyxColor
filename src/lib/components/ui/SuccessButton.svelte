<script lang="ts">
	import { cn } from "$lib/utils/cn";
	import Icon from "@iconify/svelte";

	type ButtonState = "idle" | "loading" | "success" | "error";

	interface Props {
		onclick?: (e: MouseEvent) => Promise<void> | void;
		class?: string;
		disabled?: boolean;
		successDuration?: number;
		children?: import("svelte").Snippet;
		loadingText?: string;
		successText?: string;
	}

	let {
		onclick,
		class: className = "",
		disabled = false,
		successDuration = 1500,
		children,
		loadingText = "Processing...",
		successText = "Done!",
	}: Props = $props();

	let buttonState = $state<ButtonState>("idle");
	let buttonEl: HTMLButtonElement;

	async function handleClick(e: MouseEvent) {
		if (buttonState !== "idle" || disabled) return;

		buttonState = "loading";

		try {
			await onclick?.(e);
			buttonState = "success";

			// Trigger success pulse animation
			buttonEl?.classList.add("btn-success-state");

			setTimeout(() => {
				buttonState = "idle";
				buttonEl?.classList.remove("btn-success-state");
			}, successDuration);
		} catch (error) {
			buttonState = "error";
			setTimeout(() => {
				buttonState = "idle";
			}, 2000);
		}
	}
</script>

<button
	bind:this={buttonEl}
	class={cn(
		"btn relative overflow-hidden transition-all duration-300",
		buttonState === "success" && "btn-success scale-105",
		buttonState === "error" && "btn-error",
		buttonState === "loading" && "opacity-80 cursor-wait",
		className
	)}
	onclick={handleClick}
	disabled={disabled || buttonState === "loading"}
>
	{#if buttonState === "loading"}
		<span class="loading loading-spinner loading-sm"></span>
		<span class="ml-2">{loadingText}</span>
	{:else if buttonState === "success"}
		<span class="flex items-center gap-2">
			<Icon icon="material-symbols:check-circle" class="w-5 h-5 animate-bounce" />
			{successText}
		</span>
	{:else if buttonState === "error"}
		<span class="flex items-center gap-2">
			<Icon icon="material-symbols:error" class="w-5 h-5" />
			Error
		</span>
	{:else if children}
		{@render children()}
	{/if}
</button>
