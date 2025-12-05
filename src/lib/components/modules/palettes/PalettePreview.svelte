<script lang="ts">
	import { app } from "$lib/stores/root.svelte";
	import Icon from "@iconify/svelte";
	import GlassPanel from "$lib/components/ui/GlassPanel.svelte";
	import { cn } from "$lib/utils/cn";
	import { toast } from "svelte-sonner";
	import {
		formatAsTailwindConfig,
		formatAsCssVariables,
		formatAsScss,
		assignColorsSmartly,
		getContrastRatio,
	} from "./palette-utils";

	type PreviewType = "dashboard" | "landing" | "mobile" | "cards";

	let activePreview = $state<PreviewType>("dashboard");

	let colors = $derived(app.palettes.activePalette?.colors ?? []);
	let paletteName = $derived(app.palettes.activePalette?.name ?? "Palette");

	// Smart color assignment based on palette analysis
	let assigned = $derived(assignColorsSmartly(colors));

	// Helper to get best text color for a background
	function getTextColor(bgColor: string): string {
		// Check contrast with assigned text color first
		const textRatio = getContrastRatio(bgColor, assigned.text);
		if (textRatio >= 4.5) return assigned.text;

		// Fall back to white or black
		const whiteRatio = getContrastRatio(bgColor, "#ffffff");
		const blackRatio = getContrastRatio(bgColor, "#000000");

		return whiteRatio > blackRatio ? "#ffffff" : "#000000";
	}

	// Muted text for secondary content
	function getMutedTextColor(bgColor: string): string {
		const base = getTextColor(bgColor);
		return base === "#ffffff" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)";
	}

	async function copyToClipboard(text: string, label: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(`${label} copied to clipboard!`);
		} catch {
			toast.error("Failed to copy");
		}
	}

	function exportAsTailwind() {
		const config = formatAsTailwindConfig(colors, paletteName);
		copyToClipboard(config, "Tailwind config");
	}

	function exportAsCss() {
		const css = formatAsCssVariables(colors, paletteName);
		copyToClipboard(css, "CSS variables");
	}

	function exportAsScss() {
		const scss = formatAsScss(colors, paletteName);
		copyToClipboard(scss, "SCSS variables");
	}
</script>

<GlassPanel class="flex-1 overflow-hidden" intensity="medium">
	<div class="flex flex-col h-full">
		<div class="p-4 border-b border-white/5 bg-black/20">
			<div class="flex items-center justify-between">
				<h3 class="font-semibold text-white flex items-center gap-2">
					<Icon icon="material-symbols:preview" class="w-5 h-5" />
					Preview Playground
				</h3>

				<!-- Export Buttons -->
				<div class="flex gap-2">
					<button
						class="btn btn-xs btn-ghost text-text-muted hover:text-white"
						onclick={exportAsTailwind}
						title="Copy as Tailwind Config"
						disabled={colors.length === 0}
					>
						<Icon icon="simple-icons:tailwindcss" class="w-4 h-4" />
					</button>
					<button
						class="btn btn-xs btn-ghost text-text-muted hover:text-white"
						onclick={exportAsCss}
						title="Copy as CSS Variables"
						disabled={colors.length === 0}
					>
						<Icon icon="simple-icons:css3" class="w-4 h-4" />
					</button>
					<button
						class="btn btn-xs btn-ghost text-text-muted hover:text-white"
						onclick={exportAsScss}
						title="Copy as SCSS"
						disabled={colors.length === 0}
					>
						<Icon icon="simple-icons:sass" class="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>

		{#if colors.length === 0}
			<div class="flex-1 flex items-center justify-center text-text-muted/50">
				<div class="text-center">
					<Icon icon="material-symbols:preview" class="w-12 h-12 mx-auto mb-2 opacity-30" />
					<p>Select a palette with colors to preview</p>
				</div>
			</div>
		{:else}
			<div class="flex-1 overflow-y-auto custom-scrollbar">
				<!-- Preview Type Selector -->
				<div class="p-4 border-b border-white/5">
					<div class="flex flex-wrap gap-2">
						{#each [{ id: "dashboard", label: "Dashboard", icon: "material-symbols:dashboard" }, { id: "landing", label: "Landing", icon: "material-symbols:web" }, { id: "mobile", label: "Mobile", icon: "material-symbols:smartphone" }, { id: "cards", label: "Cards", icon: "material-symbols:credit-card" }] as preview}
							<button
								class={cn(
									"btn btn-sm gap-2",
									activePreview === preview.id ? "btn-primary" : "btn-ghost text-text-muted"
								)}
								onclick={() => (activePreview = preview.id as PreviewType)}
							>
								<Icon icon={preview.icon} class="w-4 h-4" />
								{preview.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Preview Area -->
				<div class="p-4">
					{#if activePreview === "dashboard"}
						<!-- Dashboard Preview -->
						<div
							class="rounded-xl overflow-hidden border border-white/10 shadow-2xl"
							style:background-color={assigned.background}
						>
							<!-- Top Nav -->
							<div
								class="h-12 flex items-center justify-between px-4 border-b"
								style:background-color={assigned.surface}
								style:border-color="{assigned.primary}20"
							>
								<div class="flex items-center gap-3">
									<div
										class="w-7 h-7 rounded-lg flex items-center justify-center"
										style:background-color={assigned.primary}
									>
										<span style:color={getTextColor(assigned.primary)}>
											<Icon icon="material-symbols:dashboard" class="w-4 h-4" />
										</span>
									</div>
									<span class="font-semibold text-sm" style:color={getTextColor(assigned.surface)}>
										Dashboard
									</span>
								</div>
								<div class="flex items-center gap-3">
									<div
										class="w-8 h-8 rounded-full flex items-center justify-center"
										style:background-color={assigned.primary}
									>
										<span style:color={getTextColor(assigned.primary)}>
											<Icon icon="material-symbols:person" class="w-4 h-4" />
										</span>
									</div>
								</div>
							</div>

							<div class="flex">
								<!-- Sidebar -->
								<div
									class="w-40 p-3 space-y-1 border-r shrink-0"
									style:background-color={assigned.surface}
									style:border-color="{assigned.primary}15"
								>
									{#each [{ icon: "home", label: "Home", active: true }, { icon: "analytics", label: "Analytics" }, { icon: "folder", label: "Projects" }, { icon: "settings", label: "Settings" }] as item}
										<div
											class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
											style:background-color={item.active ? `${assigned.primary}15` : "transparent"}
											style:color={item.active
												? assigned.primary
												: getMutedTextColor(assigned.surface)}
										>
											<Icon icon="material-symbols:{item.icon}" class="w-4 h-4" />
											{item.label}
										</div>
									{/each}
								</div>

								<!-- Main Content -->
								<div class="flex-1 p-4 space-y-4">
									<!-- Stats Row -->
									<div class="grid grid-cols-3 gap-3">
										{#each [{ label: "Total Users", value: "12,345", icon: "group", color: assigned.primary }, { label: "Revenue", value: "$54,321", icon: "payments", color: assigned.accent }, { label: "Active Now", value: "234", icon: "trending-up", color: assigned.secondary }] as stat}
											<div class="p-4 rounded-xl" style:background-color={assigned.surface}>
												<div class="flex items-center justify-between mb-2">
													<span
														class="text-xs font-medium"
														style:color={getMutedTextColor(assigned.surface)}
													>
														{stat.label}
													</span>
													<div
														class="w-8 h-8 rounded-lg flex items-center justify-center"
														style:background-color="{stat.color}15"
														style:color={stat.color}
													>
														<Icon icon="material-symbols:{stat.icon}" class="w-4 h-4" />
													</div>
												</div>
												<div class="text-xl font-bold" style:color={getTextColor(assigned.surface)}>
													{stat.value}
												</div>
											</div>
										{/each}
									</div>

									<!-- Chart Area -->
									<div class="p-4 rounded-xl" style:background-color={assigned.surface}>
										<div
											class="text-sm font-medium mb-3"
											style:color={getTextColor(assigned.surface)}
										>
											Weekly Overview
										</div>
										<div class="flex items-end justify-between h-24 gap-2">
											{#each [40, 65, 45, 80, 55, 70, 90] as height, i}
												<div
													class="flex-1 rounded-t transition-all hover:opacity-80"
													style:height="{height}%"
													style:background-color={i === 6
														? assigned.primary
														: `${assigned.primary}40`}
												></div>
											{/each}
										</div>
										<div
											class="flex justify-between mt-2 text-[10px]"
											style:color={getMutedTextColor(assigned.surface)}
										>
											{#each ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as day}
												<span>{day}</span>
											{/each}
										</div>
									</div>
								</div>
							</div>
						</div>
					{:else if activePreview === "landing"}
						<!-- Landing Page Preview -->
						<div
							class="rounded-xl overflow-hidden border border-white/10 shadow-2xl"
							style:background-color={assigned.background}
						>
							<!-- Nav -->
							<div
								class="flex items-center justify-between px-6 py-4"
								style:background-color={assigned.surface}
							>
								<div class="flex items-center gap-2">
									<div class="w-8 h-8 rounded-lg" style:background-color={assigned.primary}></div>
									<span class="font-bold" style:color={getTextColor(assigned.surface)}>
										Brand
									</span>
								</div>
								<div class="flex items-center gap-4">
									{#each ["Features", "Pricing", "About"] as link}
										<span
											class="text-sm cursor-pointer hover:opacity-80"
											style:color={getMutedTextColor(assigned.surface)}
										>
											{link}
										</span>
									{/each}
									<button
										class="px-4 py-1.5 rounded-lg text-sm font-medium"
										style:background-color={assigned.primary}
										style:color={getTextColor(assigned.primary)}
									>
										Get Started
									</button>
								</div>
							</div>

							<!-- Hero -->
							<div
								class="px-6 py-12 text-center"
								style:background="linear-gradient(135deg, {assigned.primary}15, {assigned.accent}15)"
							>
								<h1 class="text-3xl font-bold mb-3" style:color={getTextColor(assigned.background)}>
									Build Something
									<span style:color={assigned.primary}>Amazing</span>
								</h1>
								<p
									class="mb-6 max-w-md mx-auto"
									style:color={getMutedTextColor(assigned.background)}
								>
									The modern platform for teams who want to ship faster and build better products.
								</p>
								<div class="flex justify-center gap-3">
									<button
										class="px-6 py-2.5 rounded-lg font-semibold shadow-lg"
										style:background-color={assigned.primary}
										style:color={getTextColor(assigned.primary)}
									>
										Start Free Trial
									</button>
									<button
										class="px-6 py-2.5 rounded-lg font-semibold border-2"
										style:border-color={assigned.primary}
										style:color={assigned.primary}
									>
										Watch Demo
									</button>
								</div>
							</div>

							<!-- Features -->
							<div class="px-6 py-8 grid grid-cols-3 gap-6">
								{#each [{ icon: "rocket-launch", title: "Fast Setup", desc: "Get started in minutes" }, { icon: "shield-check", title: "Secure", desc: "Enterprise-grade security" }, { icon: "auto-awesome", title: "AI Powered", desc: "Smart automation built-in" }] as feature, i}
									{@const featureColor =
										i === 0 ? assigned.primary : i === 1 ? assigned.secondary : assigned.accent}
									<div class="text-center p-4">
										<div
											class="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
											style:background-color="{featureColor}15"
											style:color={featureColor}
										>
											<Icon icon="material-symbols:{feature.icon}" class="w-7 h-7" />
										</div>
										<h3 class="font-semibold mb-1" style:color={getTextColor(assigned.background)}>
											{feature.title}
										</h3>
										<p class="text-sm" style:color={getMutedTextColor(assigned.background)}>
											{feature.desc}
										</p>
									</div>
								{/each}
							</div>
						</div>
					{:else if activePreview === "mobile"}
						<!-- Mobile App Preview -->
						<div class="flex justify-center">
							<div
								class="w-64 rounded-[2.5rem] overflow-hidden border-[6px] shadow-2xl"
								style:background-color={assigned.background}
								style:border-color={assigned.surface}
							>
								<!-- Status Bar -->
								<div
									class="h-7 flex items-center justify-between px-5 text-xs font-medium"
									style:background-color={assigned.surface}
									style:color={getTextColor(assigned.surface)}
								>
									<span>9:41</span>
									<div class="flex gap-1.5">
										<Icon icon="material-symbols:signal-cellular-alt" class="w-3.5 h-3.5" />
										<Icon icon="material-symbols:wifi" class="w-3.5 h-3.5" />
										<Icon icon="material-symbols:battery-full" class="w-3.5 h-3.5" />
									</div>
								</div>

								<!-- App Header -->
								<div
									class="p-4 flex items-center justify-between"
									style:background-color={assigned.primary}
								>
									<div>
										<h2 class="font-bold text-lg" style:color={getTextColor(assigned.primary)}>
											Good Morning
										</h2>
										<p class="text-sm opacity-80" style:color={getTextColor(assigned.primary)}>
											Here's your summary
										</p>
									</div>
									<div
										class="w-10 h-10 rounded-full border-2"
										style:background-color="{getTextColor(assigned.primary)}20"
										style:border-color="{getTextColor(assigned.primary)}40"
									></div>
								</div>

								<!-- Content -->
								<div class="p-4 space-y-3">
									<!-- Quick Stats -->
									<div class="grid grid-cols-2 gap-2">
										<div class="p-3 rounded-xl" style:background-color={assigned.surface}>
											<div class="text-xs mb-1" style:color={getMutedTextColor(assigned.surface)}>
												Balance
											</div>
											<div class="font-bold" style:color={getTextColor(assigned.surface)}>
												$2,450
											</div>
										</div>
										<div class="p-3 rounded-xl" style:background-color="{assigned.accent}15">
											<div class="text-xs mb-1" style:color={assigned.accent}>Savings</div>
											<div class="font-bold" style:color={assigned.accent}>+$350</div>
										</div>
									</div>

									<!-- List Items -->
									{#each [{ title: "Coffee Shop", amount: "-$4.50", icon: "local-cafe" }, { title: "Salary", amount: "+$3,200", icon: "payments" }, { title: "Groceries", amount: "-$85.00", icon: "shopping-cart" }] as item, i}
										<div
											class="flex items-center gap-3 p-3 rounded-xl"
											style:background-color={assigned.surface}
										>
											<div
												class="w-10 h-10 rounded-xl flex items-center justify-center"
												style:background-color="{assigned.primary}15"
												style:color={assigned.primary}
											>
												<Icon icon="material-symbols:{item.icon}" class="w-5 h-5" />
											</div>
											<div class="flex-1">
												<div
													class="text-sm font-medium"
													style:color={getTextColor(assigned.surface)}
												>
													{item.title}
												</div>
												<div class="text-xs" style:color={getMutedTextColor(assigned.surface)}>
													Today
												</div>
											</div>
											<div
												class="font-semibold text-sm"
												style:color={item.amount.startsWith("+")
													? assigned.accent
													: getTextColor(assigned.surface)}
											>
												{item.amount}
											</div>
										</div>
									{/each}
								</div>

								<!-- Bottom Nav -->
								<div
									class="flex justify-around py-3 border-t"
									style:background-color={assigned.surface}
									style:border-color="{assigned.primary}15"
								>
									{#each ["home", "credit-card", "bar-chart", "person"] as icon, i}
										<div
											class="p-2 rounded-xl"
											style:background-color={i === 0 ? `${assigned.primary}15` : "transparent"}
											style:color={i === 0 ? assigned.primary : getMutedTextColor(assigned.surface)}
										>
											<Icon icon="material-symbols:{icon}" class="w-6 h-6" />
										</div>
									{/each}
								</div>
							</div>
						</div>
					{:else if activePreview === "cards"}
						<!-- Card Components Preview -->
						<div class="grid grid-cols-2 gap-4">
							<!-- Product Card -->
							<div
								class="rounded-xl overflow-hidden shadow-lg"
								style:background-color={assigned.surface}
							>
								<div
									class="h-28 relative"
									style:background="linear-gradient(135deg, {assigned.primary}, {assigned.accent})"
								>
									<div
										class="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium"
										style:background-color={assigned.surface}
										style:color={assigned.accent}
									>
										New
									</div>
								</div>
								<div class="p-4">
									<h3 class="font-bold mb-1" style:color={getTextColor(assigned.surface)}>
										Premium Plan
									</h3>
									<p class="text-sm mb-4" style:color={getMutedTextColor(assigned.surface)}>
										Everything you need to grow
									</p>
									<div class="flex justify-between items-center">
										<div>
											<span class="text-2xl font-bold" style:color={assigned.primary}> $29 </span>
											<span class="text-sm" style:color={getMutedTextColor(assigned.surface)}>
												/mo
											</span>
										</div>
										<button
											class="px-4 py-2 rounded-lg text-sm font-semibold"
											style:background-color={assigned.primary}
											style:color={getTextColor(assigned.primary)}
										>
											Subscribe
										</button>
									</div>
								</div>
							</div>

							<!-- User Card -->
							<div
								class="rounded-xl p-5 text-center shadow-lg"
								style:background-color={assigned.surface}
							>
								<div
									class="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
									style:background-color="{assigned.secondary}20"
									style:color={assigned.secondary}
								>
									<Icon icon="material-symbols:person" class="w-8 h-8" />
								</div>
								<h3 class="font-bold" style:color={getTextColor(assigned.surface)}>Sarah Chen</h3>
								<p class="text-sm mb-4" style:color={getMutedTextColor(assigned.surface)}>
									Product Designer
								</p>
								<div class="flex justify-center gap-2">
									<button
										class="px-4 py-2 rounded-lg text-sm font-medium"
										style:background-color={assigned.primary}
										style:color={getTextColor(assigned.primary)}
									>
										Follow
									</button>
									<button
										class="px-4 py-2 rounded-lg text-sm font-medium border"
										style:border-color={assigned.primary}
										style:color={assigned.primary}
									>
										Message
									</button>
								</div>
							</div>

							<!-- Metric Card -->
							<div class="rounded-xl p-5 shadow-lg" style:background-color={assigned.primary}>
								<div class="flex items-center justify-between mb-3">
									<span
										class="text-sm font-medium opacity-90"
										style:color={getTextColor(assigned.primary)}
									>
										Monthly Revenue
									</span>
									<span style:color={getTextColor(assigned.primary)}>
										<Icon icon="material-symbols:trending-up" class="w-5 h-5" />
									</span>
								</div>
								<div class="text-3xl font-bold mb-1" style:color={getTextColor(assigned.primary)}>
									$48,352
								</div>
								<div class="text-sm opacity-80" style:color={getTextColor(assigned.primary)}>
									+12.5% from last month
								</div>
							</div>

							<!-- Alert Card -->
							<div
								class="rounded-xl p-4 border-l-4 shadow-lg"
								style:background-color="{assigned.accent}10"
								style:border-color={assigned.accent}
							>
								<div class="flex items-start gap-3">
									<span style:color={assigned.accent}>
										<Icon icon="material-symbols:info" class="w-5 h-5 shrink-0 mt-0.5" />
									</span>
									<div>
										<h3 class="font-semibold text-sm mb-1" style:color={assigned.accent}>
											Update Available
										</h3>
										<p class="text-xs" style:color={getMutedTextColor(assigned.background)}>
											A new version is ready to install with bug fixes and improvements.
										</p>
										<button class="mt-2 text-xs font-medium" style:color={assigned.accent}>
											Update Now →
										</button>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Color Legend -->
				<div class="p-4 border-t border-white/5">
					<h4 class="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
						Smart Color Assignment
					</h4>
					<div class="grid grid-cols-4 gap-3 text-xs">
						<div class="flex items-center gap-2">
							<div class="w-5 h-5 rounded" style:background-color={assigned.primary}></div>
							<span class="text-text-muted">Primary</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="w-5 h-5 rounded" style:background-color={assigned.secondary}></div>
							<span class="text-text-muted">Secondary</span>
						</div>
						<div class="flex items-center gap-2">
							<div class="w-5 h-5 rounded" style:background-color={assigned.accent}></div>
							<span class="text-text-muted">Accent</span>
						</div>
						<div class="flex items-center gap-2">
							<div
								class="w-5 h-5 rounded border border-white/20"
								style:background-color={assigned.surface}
							></div>
							<span class="text-text-muted">Surface</span>
						</div>
						<div class="flex items-center gap-2">
							<div
								class="w-5 h-5 rounded border border-white/20"
								style:background-color={assigned.background}
							></div>
							<span class="text-text-muted">Background</span>
						</div>
						<div class="flex items-center gap-2">
							<div
								class="w-5 h-5 rounded border border-white/20"
								style:background-color={assigned.text}
							></div>
							<span class="text-text-muted">Text</span>
						</div>
						<div class="flex items-center gap-2">
							<div
								class="w-5 h-5 rounded border border-white/20"
								style:background-color={assigned.muted}
							></div>
							<span class="text-text-muted">Muted</span>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</GlassPanel>
