<script lang="ts">
	import { scale } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import Icon from "@iconify/svelte";

	interface Props {
		open: boolean;
		onClose: () => void;
		onCreate: (data: { name: string; type: "linear" | "radial" | "conic"; angle: number }) => void;
	}

	let { open, onClose, onCreate } = $props();

	let name = $state("");
	let gradientType = $state<"linear" | "radial" | "conic">("linear");
	let angle = $state(45);

	function handleCreate() {
		if (!name.trim()) return;
		onCreate({ name: name.trim(), type: gradientType, angle });
		name = "";
		gradientType = "linear";
		angle = 45;
	}
</script>

{#if open}
	<div
		class="fixed inset-0 modal-backdrop-blur flex items-center justify-center z-50 p-4"
		onclick={(e) => e.target === e.currentTarget && onClose()}
		onkeydown={(e) => e.key === "Escape" && onClose()}
		role="dialog"
		tabindex="-1"
	>
		<div
			in:scale={{ duration: 200, start: 0.95, easing: cubicOut }}
			class="bg-base-100/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10 modal-enter"
		>
			<h3 class="font-bold text-lg mb-4">Create New Gradient</h3>
			<div class="space-y-4">
				<div>
					<label class="label" for="gradient-name-input">
						<span class="label-text">Gradient Name</span>
					</label>
					<input
						id="gradient-name-input"
						bind:value={name}
						type="text"
						placeholder="Enter gradient name..."
						class="input input-bordered w-full"
						onkeydown={(e) => e.key === "Enter" && handleCreate()}
					/>
				</div>
				<div>
					<label class="label" for="gradient-type-select">
						<span class="label-text">Gradient Type</span>
					</label>
					<div class="join w-full">
						{#each ["linear", "radial", "conic"] as type}
							<button
								class="btn join-item flex-1"
								class:btn-primary={gradientType === type}
								class:btn-outline={gradientType !== type}
								onclick={() => (gradientType = type as "linear" | "radial" | "conic")}
							>
								{type}
							</button>
						{/each}
					</div>
				</div>
				{#if gradientType === "linear"}
					<div>
						<label class="label" for="gradient-angle">
							<span class="label-text">Initial Angle: {angle}°</span>
						</label>
						<input
							id="gradient-angle"
							type="range"
							min="0"
							max="360"
							bind:value={angle}
							class="range range-primary"
						/>
					</div>
				{/if}
			</div>
			<div class="flex items-center justify-end gap-3 mt-6">
				<button class="btn btn-ghost" onclick={onClose}>Cancel</button>
				<button class="btn btn-primary" onclick={handleCreate} disabled={!name.trim()}>
					Create Gradient
				</button>
			</div>
		</div>
	</div>
{/if}
