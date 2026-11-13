<script lang="ts">
	import type { Example } from '#lib/cards.ts';

	let { example, task }: { example: Example | null; task: string } = $props();

	const VIEWS: Record<string, string[]> = {
		stereo: ['Left view', 'Right view'],
		flow: ['Frame 1', 'Frame 2'],
		multiview: ['View 1', 'View 2'],
		matching: ['View A', 'View B'],
		interpolation: ['Frame 1', 'Frame 2']
	};
	const views = $derived(VIEWS[task] ?? ['Input']);
	const pct = (x: number) => (x < 0.001 ? '<0.1%' : `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`);
	const run = $derived(
		example ? [example.mode, example.dtype, example.device].filter(Boolean).join(' · ') : ''
	);

	// Every picture of the example, in order: the input view(s), then the output. Clicking one opens it at full size.
	const shots = $derived.by(() => {
		if (!example) return [];
		const ex = example;
		const xs = ex.inputs.map((src, i) => {
			const caption = views[i] ?? 'Input';
			return { src, caption, alt: `${ex.input.title}, ${caption.toLowerCase()}` };
		});
		if (ex.image) xs.push({ src: ex.image, caption: 'Output', alt: `Output of this checkpoint on ${ex.input.title}` });
		return xs;
	});
	let dialog = $state<HTMLDialogElement>();
	let open = $state(0);
	const show = (i: number) => {
		open = i;
		dialog?.showModal();
	};
	const step = (d: number) => (open = (open + d + shots.length) % shots.length);
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') step(1);
		else if (e.key === 'ArrowLeft') step(-1);
	}
</script>

{#if !example}
	<p class="none">No example rendered for this checkpoint yet.</p>
{:else}
	<p>
		One fixed input through this checkpoint, the same for every model of the task{run ? ` (${run})` : ''}.
		{#if example.prompt}Prompt: {example.prompt}.{/if}
	</p>
	<div class="grid">
		{#each shots as shot, i (shot.src)}
			<figure class="box">
				<button type="button" class="zoom" onclick={() => show(i)} aria-label="{shot.caption} at full size">
					<img src={shot.src} alt={shot.alt} loading="lazy" />
				</button>
				<figcaption>{shot.caption}</figcaption>
			</figure>
		{/each}
		{#if example.top}
			<div class="box">
				<p class="label">Top 5</p>
				<ol class="bars">
					{#each example.top as [name, p] (name)}
						<li>
							<span class="name">{name}</span>
							<span class="bar"><span style:width={pct(p)}></span></span>
							<span class="num">{pct(p)}</span>
						</li>
					{/each}
				</ol>
			</div>
		{/if}
	</div>

	{#if example.classes?.length}
		<ul class="chips">
			{#each example.classes as [name, share, colour] (name)}
				<li><span class="swatch" style:background="rgb({colour.join(' ')})"></span>{name} <small>{pct(share)}</small></li>
			{/each}
		</ul>
	{/if}
	{#if example.certain !== undefined}
		<p class="credit">
			{pct(example.certain)} of view A's pixels are found in view B with a certainty above 0.5; the lines are
			100 matches sampled by certainty.
		</p>
	{/if}
	{#if example.objects?.length}
		<ul class="chips">
			{#each example.objects as [name, score], i (i)}
				<li>{name} <small>{score.toFixed(2)}</small></li>
			{/each}
		</ul>
	{/if}

	<dialog bind:this={dialog} {onkeydown} onclick={(e) => e.target === dialog && dialog?.close()}>
		{#if shots[open]}
			<figure>
				<img class="full" src={shots[open].src} alt={shots[open].alt} />
				<figcaption>
					{shots[open].caption} · 100%
					{#if shots.length > 1}
						<button type="button" onclick={() => step(-1)} aria-label="Previous picture">←</button>
						<button type="button" onclick={() => step(1)} aria-label="Next picture">→</button>
					{/if}
					<button type="button" onclick={() => dialog?.close()}>Close</button>
				</figcaption>
			</figure>
		{/if}
	</dialog>

	<p class="credit">
		Input: <a href={example.input.source} rel="noopener">{example.input.title}</a>, {example.input.credit}
		({example.input.licence}).
	</p>
{/if}

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1rem;
	}
	.box {
		margin: 0;
		padding: 0.6rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
		min-width: 0;
	}
	img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 3px;
	}
	.zoom {
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		background: none;
		cursor: zoom-in;
	}
	dialog {
		max-width: calc(100vw - 32px);
		max-height: calc(100vh - 32px);
		padding: 0.6rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
		color: var(--ink);
		overflow: auto;
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 0.6);
	}
	dialog figure {
		margin: 0;
	}
	/* Native resolution: the file's own pixels, never scaled up; scrolls when the window is smaller. */
	/* The class outweighs DocPage's `.prose img { max-width: 100% }`. */
	dialog img.full {
		width: auto;
		max-width: none;
		border-radius: 0;
	}
	dialog figcaption {
		display: flex;
		gap: 0.8rem;
		align-items: center;
	}
	dialog figcaption button {
		padding: 0.1rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: var(--bg);
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}
	dialog figcaption button:first-of-type {
		margin-left: auto;
	}
	figcaption,
	.credit,
	.none,
	small {
		color: var(--muted);
		font-size: 0.85rem;
	}
	figcaption {
		margin-top: 0.4rem;
	}
	.label {
		margin: 0.2rem 0 0.8rem;
		font-weight: 650;
	}
	.bars {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.5rem;
	}
	.bars li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 5rem 3rem;
		gap: 0.6rem;
		align-items: center;
	}
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.bar {
		height: 0.5rem;
		border-radius: 3px;
		background: var(--line);
	}
	.bar span {
		display: block;
		height: 100%;
		border-radius: 3px;
		background: var(--bar-portable);
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 0.9rem;
		margin: 0.8rem 0 0;
		padding: 0;
		list-style: none;
	}
	.swatch {
		display: inline-block;
		width: 0.7rem;
		height: 0.7rem;
		margin-right: 0.35rem;
		border-radius: 2px;
		vertical-align: -0.05rem;
	}
	.credit {
		margin-top: 0.8rem;
	}
</style>
