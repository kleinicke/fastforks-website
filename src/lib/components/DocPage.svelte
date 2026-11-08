<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import type { Doc } from '#lib/docs.ts';
	import { DEVICES, TASK_META, TASK_ORDER } from '#lib/site.ts';

	// `children` replaces doc.html for pages written in Svelte (the legal pages).
	let {
		doc,
		eyebrow,
		intro,
		children
	}: { doc: Pick<Doc, 'title' | 'description'> & Partial<Doc>; eyebrow: Snippet; intro?: Snippet; children?: Snippet } =
		$props();

	const NAV: { title: string; links: [string, string][] }[] = [
		{
			title: 'Guides',
			links: [
				['/usage', 'Usage guide'],
				['/benchmarks', 'Benchmarks'],
				['/export', 'Export'],
				['/docker', 'Docker'],
				['/stereo-geometry', 'Stereo geometry']
			]
		},
		{ title: 'Tasks', links: TASK_ORDER.map((t) => [`/tasks/${t}`, TASK_META[t].name]) },
		{
			title: 'Devices',
			links: [
				['/other-gpus', 'Other GPUs'],
				...DEVICES.filter((d) => !d.reference).map((d): [string, string] => [`/devices/${d.slug}`, d.name])
			]
		}
	];
	const here = $derived(page.url.pathname);
</script>

<svelte:head>
	<title>{doc.title} · fastforks</title>
	{#if doc.description}<meta name="description" content={doc.description} />{/if}
</svelte:head>

<section class="section head">
	<div class="wrap layout">
		<nav class="side" aria-label="Documentation">
			{#each NAV as group (group.title)}
				<p class="eyebrow">{group.title}</p>
				<ul>
					{#each group.links as [href, label] (href)}
						<li><a {href} aria-current={here === href ? 'page' : undefined}>{label}</a></li>
					{/each}
				</ul>
			{/each}
		</nav>
		<article>
			<p class="eyebrow">{@render eyebrow()}</p>
			<h1>{doc.title}</h1>
			{@render intro?.()}
			<div class="prose">
				{#if children}
					{@render children()}
				{:else}
				<!-- Rendered at sync time from the fastforks repo's own Markdown (scripts/docs.ts), not user input. -->
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html doc.html}
				{/if}
			</div>
		</article>
	</div>
</section>

<style>
	.head {
		padding-top: clamp(2.5rem, 6vw, 4.5rem);
	}
	.layout {
		display: grid;
		grid-template-columns: 210px minmax(0, 1fr);
		gap: 3rem;
		align-items: start;
	}
	.side {
		position: sticky;
		top: 5rem;
		max-height: calc(100vh - 6rem);
		overflow-y: auto;
		font-size: 0.86rem;
	}
	.side ul {
		margin: 0.5rem 0 1.6rem;
		padding: 0;
		list-style: none;
	}
	.side a {
		display: block;
		padding: 0.25rem 0;
		color: var(--muted);
		text-decoration: none;
	}
	.side a:hover,
	.side a[aria-current='page'] {
		color: var(--ink);
	}
	.side a[aria-current='page'] {
		font-weight: 650;
	}
	h1 {
		margin: 0.6rem 0 1.2rem;
		font-size: clamp(2rem, 4.5vw, 3.2rem);
		letter-spacing: -0.04em;
		line-height: 1.05;
	}
	@media (max-width: 900px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
			gap: 1.5rem;
		}
		.side {
			position: static;
			max-height: none;
			display: flex;
			flex-wrap: wrap;
			gap: 0 1.2rem;
			order: 2;
			padding-top: 1.5rem;
			border-top: 1px solid var(--line);
		}
		.side ul {
			display: flex;
			flex-wrap: wrap;
			gap: 0 1rem;
			width: 100%;
			margin-bottom: 1rem;
		}
	}

	.prose {
		max-width: 920px;
		font-size: 0.98rem;
	}
	.prose :global(h2) {
		margin: 3rem 0 0.8rem;
		padding-top: 1.2rem;
		border-top: 1px solid var(--line);
		font-size: 1.6rem;
		letter-spacing: -0.02em;
		line-height: 1.15;
	}
	.prose :global(h3) {
		margin: 2rem 0 0.6rem;
		font-size: 1.2rem;
	}
	.prose :global(h4) {
		margin: 1.5rem 0 0.4rem;
		font-size: 1rem;
	}
	.prose :global(:is(h2, h3, h4)) {
		scroll-margin-top: 5rem;
	}
	.prose :global(p),
	.prose :global(ul),
	.prose :global(ol) {
		margin: 0 0 1rem;
	}
	.prose :global(li) {
		margin: 0.2rem 0;
	}
	.prose :global(a) {
		color: var(--blue);
	}
	.prose :global(:not(pre) > code) {
		padding: 0.08em 0.3em;
		border-radius: 3px;
		background: color-mix(in srgb, var(--ink) 7%, transparent);
		font-size: 0.86em;
		overflow-wrap: anywhere;
	}
	.prose :global(pre) {
		margin: 0 0 1.2rem;
		padding: 1rem 1.1rem;
		overflow-x: auto;
		border-radius: 6px;
		background: var(--code-bg);
		color: var(--code-ink);
		font-size: 0.84rem;
		line-height: 1.55;
	}
	.prose :global(.table) {
		margin: 0 0 1.4rem;
		overflow-x: auto;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
	}
	.prose :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
	}
	.prose :global(th) {
		padding: 0.55rem 0.7rem;
		border-bottom: 1px solid var(--strong-line);
		color: var(--muted);
		font: 600 0.68rem/1.3 var(--mono);
		letter-spacing: 0.04em;
		text-align: left;
		text-transform: uppercase;
		vertical-align: bottom;
	}
	.prose :global(td) {
		padding: 0.5rem 0.7rem;
		border-top: 1px solid var(--line);
		vertical-align: top;
	}
	.prose :global(td code) {
		white-space: nowrap;
	}
	/* Stacked backend / time / memory lists of the variant tables read row by row only unwrapped. */
	.prose :global(td:has(br)) {
		white-space: nowrap;
	}
	.prose :global(details) {
		margin: 0 0 1.2rem;
		padding: 0.2rem 1rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
	}
	.prose :global(summary) {
		padding: 0.6rem 0;
		font-weight: 650;
		cursor: pointer;
	}
	.prose :global(details[open] summary) {
		margin-bottom: 0.4rem;
		border-bottom: 1px solid var(--line);
	}
	.prose :global(blockquote) {
		margin: 0 0 1rem;
		padding: 0.2rem 1rem;
		border-left: 3px solid var(--accent);
		color: var(--muted);
	}
	.prose :global(img) {
		max-width: 100%;
	}
</style>
