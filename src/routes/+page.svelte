<script lang="ts">
	import { appStore } from "$lib/stores/app.svelte";
	import ReferencesModule from "$lib/components/modules/ReferencesModule.svelte";
	import PalettesModule from "$lib/components/modules/PalettesModule.svelte";
	import GradientsModule from "$lib/components/modules/GradientsModule.svelte";
	import SettingsModule from "$lib/components/modules/SettingsModule.svelte";
	import TutorialsModule from "$lib/components/modules/TutorialsModule.svelte";
</script>

<div class="h-full">
	{#if appStore.activeModule === "references"}
		<ReferencesModule />
	{:else if appStore.activeModule === "palettes"}
		<PalettesModule />
	{:else if appStore.activeModule === "gradients"}
		<GradientsModule />
	{:else if appStore.activeModule === "settings"}
		<SettingsModule />
	{:else if appStore.activeModule === "tutorials"}
		<TutorialsModule />
	{/if}
</div>
