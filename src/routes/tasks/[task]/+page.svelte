<script lang="ts">
	import DocPage from '#lib/components/DocPage.svelte';

	let { data } = $props();
</script>

<DocPage doc={data.doc}>
	{#snippet eyebrow()}<a href="/models?task={data.doc.slug}">Models</a>{/snippet}
</DocPage>
