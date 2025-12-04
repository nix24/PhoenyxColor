<script lang="ts">
	import SettingsModule from "$lib/components/modules/SettingsModule.svelte";
	import { PAGE_METADATA, SITE_CONFIG, getFullUrl, getOgImageUrl } from "$lib/config/seo";

	const meta = PAGE_METADATA.settings!;
	const canonicalUrl = getFullUrl(meta.path);
	const ogImage = getOgImageUrl();
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<link rel="canonical" href={canonicalUrl} />

	<!-- Settings page should not be indexed -->
	<meta name="robots" content="noindex, nofollow" />

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

<SettingsModule />
