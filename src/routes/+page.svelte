<script lang="ts">
	// This page should not render as it redirects server-side
	// This is a fallback loading state in case the redirect is slow
	import Icon from "@iconify/svelte";
	import { PAGE_METADATA, SITE_CONFIG, getFullUrl, getOgImageUrl } from "$lib/config/seo";

	const meta = PAGE_METADATA.home!;
	const canonicalUrl = getFullUrl(meta.path);
	const ogImage = getOgImageUrl();
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<link rel="canonical" href={canonicalUrl} />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:site_name" content={SITE_CONFIG.name} />
	<meta property="og:locale" content={SITE_CONFIG.locale} />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content={SITE_CONFIG.twitter} />
	<meta name="twitter:title" content={meta.title} />
	<meta name="twitter:description" content={meta.description} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>

<!-- Fallback loading state (shouldn't normally be seen due to redirect) -->
<div class="h-full flex items-center justify-center">
	<div class="text-center">
		<!-- Animated logo skeleton -->
		<div class="relative w-20 h-20 mx-auto mb-6">
			<div
				class="absolute inset-0 bg-linear-to-br from-phoenix-primary to-phoenix-violet rounded-2xl animate-pulse opacity-30"
			></div>
			<div class="absolute inset-0 flex items-center justify-center">
				<Icon icon="material-symbols:brush" class="w-10 h-10 text-white/80" />
			</div>
		</div>

		<!-- Text skeleton -->
		<div class="space-y-3">
			<div class="skeleton skeleton-glass h-6 w-40 mx-auto rounded-lg"></div>
			<div class="skeleton skeleton-glass h-3 w-32 mx-auto rounded"></div>
		</div>

		<!-- Loading dots -->
		<div class="flex justify-center gap-1.5 mt-6">
			{#each [0, 1, 2] as i}
				<div
					class="w-2 h-2 rounded-full bg-phoenix-primary/60 animate-bounce"
					style:animation-delay="{i * 150}ms"
				></div>
			{/each}
		</div>
	</div>
</div>
