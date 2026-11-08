<script lang="ts">
	import DocPage from '#lib/components/DocPage.svelte';

	let { data } = $props();
</script>

<DocPage doc={data.doc}>
	{#snippet eyebrow()}<a href="/other-gpus">Devices</a>{/snippet}
	{#snippet intro()}
		<p class="lede">
			The same numbers, filterable, in the <a href="/models?device={data.doc.slug}">model table</a>.
		</p>
	{/snippet}
</DocPage>
