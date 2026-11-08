<script lang="ts">
	import DocPage from '#lib/components/DocPage.svelte';
	import { TASK_META } from '#lib/site.ts';

	let { data } = $props();
	const task = $derived(data.doc.task ?? '');
</script>

<DocPage doc={data.doc}>
	{#snippet eyebrow()}<a href="/models?task={task}">Models</a> · <a href="/tasks/{task}">{TASK_META[task]?.name}</a>{/snippet}
</DocPage>
