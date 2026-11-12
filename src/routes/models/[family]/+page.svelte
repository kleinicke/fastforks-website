<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import DocPage from '#lib/components/DocPage.svelte';
	import CopyCommand from '#lib/components/CopyCommand.svelte';
	import CardSpeed from '#lib/components/card/CardSpeed.svelte';
	import CardQuality from '#lib/components/card/CardQuality.svelte';
	import CardDevices from '#lib/components/card/CardDevices.svelte';
	import CardLicence from '#lib/components/card/CardLicence.svelte';
	import CardExample from '#lib/components/card/CardExample.svelte';
	import CardPose from '#lib/components/card/CardPose.svelte';
	import { REFERENCE, TASK_META } from '#lib/site.ts';
	import { METRIC_LABEL, RELEASE, dt, fasterOriginal, fmt, mib, ms } from '#lib/cards.ts';

	let { data } = $props();
	const card = $derived(data.card);
	const meta = $derived(TASK_META[card.task]);

	// The variant switch: `?variant=<id>`, read in the browser (prerendered pages have no query string at build time).
	let picked = $state<string | null>(null);
	// Without a pick: the default checkpoint, but a released one first (upcoming ones are not in the package yet).
	const variant = $derived(
		card.variants.find((v) => v.id === picked) ??
			card.variants.find((v) => v.default_tag && v.released) ??
			card.variants.find((v) => v.released) ??
			card.variants.find((v) => v.default_tag) ??
			card.variants[0]
	);
	const allUpcoming = $derived(card.variants.every((v) => !v.released));
	const upcomingCount = $derived(card.variants.filter((v) => !v.released).length);
	onMount(() => {
		picked = new URLSearchParams(location.search).get('variant');
	});
	function pick(id: string) {
		picked = id;
		const url = new URL(location.href);
		url.searchParams.set('variant', id);
		replaceState(url, {});
	}

	// Papers and the authors' own code where it is not the fork's upstream; entries with `variants` hold for those checkpoints only.
	const forVariant = <T extends { variants: string[] }>(xs: T[]) =>
		xs.filter((x) => !x.variants.length || x.variants.includes(variant.id));
	const papers = $derived(forVariant(card.papers));
	const officials = $derived(forVariant(card.official));
	const shortRepo = (u: string) => u.replace(/^https?:\/\/(www\.)?(github\.com\/)?/, '').replace(/\/$/, '');
	const longDate = (d: string) =>
		new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

	const repoName = $derived(card.upstream.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, ''));

	// Glance tiles: the standard input on the reference GPU, our faster backend vs the faster original run.
	const std = $derived(variant.speed.inputs.find((s) => s.standard) ?? variant.speed.inputs.at(-1));
	const ours = $derived.by(() => {
		if (!std) return null;
		const c = (['kernels', 'portable'] as const).map((key) => ({ key, row: std.modes[key] })).filter((x) => x.row);
		return c.sort((a, b) => a.row!.ms - b.row!.ms)[0] ?? null;
	});
	const orig = $derived(std ? fasterOriginal(std) : null);
	const validated = $derived(card.parity.validated[variant.id] ?? null);
	const quality = $derived.by(() => {
		const d = variant.quality.find((d) => d.modes.original32 && (d.modes.kernels ?? d.modes.portable));
		if (!d) return null;
		const m = d.metrics[0];
		const a = d.modes.original32?.metrics[m.key];
		const b = (d.modes.kernels ?? d.modes.portable)?.metrics[m.key];
		if (a === undefined || b === undefined) return null;
		return { d, m, a, b, who: d.modes.kernels ? 'kernels' : 'portable' };
	});

	const nc = $derived(card.install.noncommercial_weights.includes(variant.id));
	const lean = $derived(
		card.install.extras.length ? `pip install "fastforks-core[${card.install.extras.join(',')}]"` : 'pip install fastforks-core'
	);
	const first = $derived(card.outputs.find((o) => !o.extra)?.name ?? 'backend');
	const others = $derived(card.outputs.filter((o) => o.name !== first).map((o) => o.name));

	const TOL: Record<string, string> = {
		cpu_atol: 'CPU fp32, max |diff|',
		gpu_mean: 'GPU default dtypes, mean |diff|',
		gpu_p99: 'GPU default dtypes, p99 |diff|'
	};
	const unit = $derived(card.parity.relative ? '(relative)' : card.parity.unit);
	const kernelName = (k: string) => k.split('@')[0];

	// Matchers: relative pose from the matches on the GPU (fastforks.matching.estimate_pose).
	const pose = $derived(card.task === 'matching');
	const SECTIONS = $derived([
		['use', 'Use it'],
		['speed', 'Speed and memory'],
		['devices', 'Other devices'],
		['licence', 'Licence and weights'],
		['accuracy', 'Accuracy'],
		...(pose ? [['pose', 'Relative pose on the GPU']] : []),
		['parity', 'Closeness to the original'],
		['details', 'Details'],
		['example', 'Example output']
	]);
</script>

<DocPage doc={{ title: card.name, description: card.plain }}>
	{#snippet side()}
		<a class="back" href="/models?task={card.task}">← All models</a>
		<p class="eyebrow">On this page</p>
		<ul class="side-list">
			{#each SECTIONS as [id, label] (id)}<li><a href="#{id}">{label}</a></li>{/each}
		</ul>
		<p class="eyebrow">{meta?.name}</p>
		<ul class="side-list">
			<li><a href="/tasks/{card.task}">Task overview</a></li>
			<li><a href="/models?task={card.task}">All {meta?.name.toLowerCase()} models</a></li>
		</ul>
	{/snippet}
	{#snippet eyebrow()}<a href="/models?task={card.task}">Models</a> · <a href="/tasks/{card.task}">{meta?.name}</a>{/snippet}
	{#snippet intro()}
		{#if allUpcoming}
			<p class="banner">
				<b>Upcoming:</b> not in <code>pip install fastforks</code> yet{RELEASE ? ` (latest release ${RELEASE})` : ''}.
				Everything below is measured on the repository’s current code; it ships with the next release.
			</p>
		{/if}
		<p class="lede">{card.plain}</p>
		<p class="upstream">
			<span class={['tier', card.tier]}>{card.tier}</span>
			Fork of <a href="{card.upstream.replace(/\/$/, '')}/tree/{card.upstream_commit}" rel="noopener"
				>{repoName}@{card.upstream_commit.slice(0, 7)}</a
			>
			· backends: {card.modes.join(', ')}
		</p>
		{#if papers.length || officials.length}
			<ul class="origin">
				{#each papers as x (x.url)}
					<li>
						<span class="k">Paper</span>
						<a href={x.url} rel="noopener">{x.title}</a>
						<span class="m">{x.venue} · first released {longDate(x.date)}</span>
					</li>
				{/each}
				{#each officials as o (o.repo + o.framework)}
					<li>
						<span class="k">Authors’ code</span>
						{#if o.repo}<a href={o.repo} rel="noopener">{shortRepo(o.repo)}</a>{/if}
						<span class="m">({o.framework}), not the code forked here:</span>
						{o.reason}
					</li>
				{/each}
			</ul>
		{/if}

		{#if card.variants.length > 1}
			<div class="variants" role="group" aria-label="Checkpoint">
				<span class="label">Checkpoint</span>
				{#each card.variants as v (v.id)}
					<button
						type="button"
						class:upcoming={!v.released && !allUpcoming}
						aria-pressed={v.id === variant.id}
						title={v.released ? undefined : 'Upcoming: not in the released package yet'}
						onclick={() => pick(v.id)}>{v.name}{#if !v.released && !allUpcoming}<small>upcoming</small>{/if}</button
					>
				{/each}
			</div>
			{#if !variant.released && !allUpcoming}
				<p class="soon-note">
					<code>{variant.id}</code> is upcoming: not in fastforks {RELEASE ?? ''} on PyPI yet, it ships with the next
					release. {card.variants.length - upcomingCount} of {card.variants.length} checkpoints of this family are released.
				</p>
			{/if}
		{:else}
			<p class="single">Checkpoint <code>{variant.id}</code></p>
		{/if}
		{#if variant.setting}<p class="setting">{variant.setting}</p>{/if}

		<div class="glance">
			<div class="tile">
				<span class="k">{ours?.key === 'kernels' ? 'Kernels' : 'Portable'}, {REFERENCE.name}</span>
				<span class="v">{ours ? `${ms(ours.row!.ms)} ms` : '–'}</span>
				<span class="s">{ours && std ? `${std.input}, ${dt(ours.row!.dtype)}` : 'not measured'}</span>
			</div>
			<div class="tile">
				<span class="k">vs the faster original</span>
				<span class="v">{ours && orig ? `${(orig.row.ms / ours.row!.ms).toFixed(1)}×` : '–'}</span>
				<span class="s">{orig ? `original ${dt(orig.row.dtype)}: ${ms(orig.row.ms)} ms` : 'original not timed'}</span>
			</div>
			<div class="tile">
				<span class="k">Peak memory</span>
				<span class="v">{ours?.row!.peak_alloc_mb ? mib(ours.row!.peak_alloc_mb) : '–'}</span>
				<span class="s">{orig?.row.peak_alloc_mb ? `original: ${mib(orig.row.peak_alloc_mb)}` : 'original not measured'}</span>
			</div>
			<div class="tile">
				<span class="k">Accuracy vs original fp32</span>
				{#if quality}
					{@const delta = quality.m.lower ? quality.a - quality.b : quality.b - quality.a}
					<span class="v">{delta > 0 ? '+' : delta < 0 ? '−' : '±'}{fmt(quality.m.format, Math.abs(delta))}</span>
					<span class="s"
						>{quality.who} {METRIC_LABEL[quality.m.key] ?? quality.m.key}, {quality.d.title.split(',')[0]} ({fmt(
							quality.m.format,
							quality.a
						)} original)</span
					>
				{:else}
					<span class="v">–</span>
					<span class="s">{variant.quality.length ? 'original not run on the test set' : 'no test-set run'}</span>
				{/if}
			</div>
		</div>

		<nav class="toc" aria-label="Sections">
			{#each SECTIONS as [id, label] (id)}<a href="#{id}">{label}</a>{/each}
		</nav>
	{/snippet}

	<h2 id="use">Use it</h2>
	<CopyCommand command="pip install fastforks" />
	{#if !variant.released}
		<p class="after soon-note">
			<code>{variant.id}</code> is not in the released package yet{RELEASE ? ` (${RELEASE})` : ''}: the code below works
			from the repository and with the next release.
		</p>
	{/if}
	<p class="after">Lean install with only what this model needs: <code>{lean}</code></p>
	<pre class="code"><code
			><span class="k">from</span> fastforks <span class="k">import</span> {meta?.pkg}

model = {meta?.pkg}.load(<span class="s">"{variant.id}"</span>)  <span class="c"># kernels on a supported GPU, else portable PyTorch</span>
result = {meta?.call.replace(/…/g, '...')}
result.{first}{#if others.length}  <span class="c"># also: {others.join(', ')}</span>{/if}
result.backend  <span class="c"># what ran: mode, device, dtype, kernels</span>{#if pose}

points1, points2 = result.matches(5000)  <span class="c"># matched pixels, sampled where the model is certain</span>
pose = {meta?.pkg}.estimate_pose(points1, points2, K1, K2)  <span class="c"># relative pose on the GPU (RANSAC); K = intrinsics [3, 3]</span>
pose.R, pose.t, pose.inliers  <span class="c"># rotation, unit translation, inlier mask</span>{/if}</code
		></pre>
	{#if nc}
		<p class="after">
			The weights are non-commercial: fastforks downloads them only with <code>FASTFORKS_NONCOMMERCIAL=1</code> set.
		</p>
	{/if}
	<CopyCommand command="fastforks bench {variant.id}" />
	<p class="after">
		Times the model on this machine. <code>load(…, mode="portable")</code> or <code>mode="kernels"</code> picks a backend;
		<a href="/usage">usage guide</a>.
	</p>

	<h2 id="speed">Speed and memory</h2>
	<p>
		Every backend on one GPU ({REFERENCE.name}) and the same input, the authors’ code included.
		{#if card.kernel_libs.length}Kernels runs {dt(card.kernels_dtype)}.{/if}
		Portable runs {dt(card.portable_dtype)} on CUDA.
	</p>
	<CardSpeed {variant} variants={card.variants} reference={REFERENCE.name} onpick={pick} />

	<h2 id="devices">Other devices</h2>
	<CardDevices devices={variant.devices} />

	<h2 id="licence">Licence and weights</h2>
	<CardLicence {card} {variant} />

	<h2 id="accuracy">Accuracy</h2>
	<p>
		The test set through the authors’ code and through ours: same checkpoint, same protocol. The distance between the
		original’s fp32 and fp16 runs is what half precision alone costs; our runs should stay within it.
	</p>
	<CardQuality {card} variantId={variant.id} datasets={variant.quality} />

	{#if pose}
		<h2 id="pose">Relative pose on the GPU</h2>
		<CardPose />
	{/if}

	<h2 id="parity">Closeness to the original</h2>
	<p>
		Beyond the test-set scores: the raw output of ours against the original’s fp32 output on the same input, pixel by
		pixel. {card.parity.text.replace(/`/g, '')}
	</p>
	<div class="table">
		<table>
			<thead>
				<tr><th>Check</th><th class="num">Tolerance</th><th class="num">Measured</th></tr>
			</thead>
			<tbody>
				{#each Object.entries(card.parity.tolerance).filter(([, v]) => typeof v === 'number') as [k, v] (k)}
					<tr>
						<th scope="row">{TOL[k] ?? k}</th>
						<td class="num">≤ {v} {unit}</td>
						<td class="num">
							{#if k === 'gpu_mean' && validated}{validated.mean} {unit}
							{:else if k === 'gpu_p99' && validated}{validated.p99} {unit}
							{:else if k === 'cpu_atol'}<span class="tag">not recorded</span>
							{:else}<span class="tag">not recorded</span>{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if validated}
		<p class="fine">
			Recorded for <code>{variant.id}</code> on {validated.gpu}, torch {validated.torch}{validated.date
				? `, ${validated.date}`
				: ''}, with these kernels:
			{#each validated.kernels as k (k)}<code class="chip" title={k}>{kernelName(k)}</code>{/each}
		</p>
	{:else}
		<p class="fine">No GPU comparison recorded for <code>{variant.id}</code>.</p>
	{/if}

	<h2 id="details">Details</h2>
	<p>{card.summary}</p>
	<dl class="facts">
		<dt>Input / output</dt>
		<dd>{card.task_io}</dd>
		<dt>Input size</dt>
		<dd>
			{variant.input_size}{#if variant.tested_max}; tested up to {variant.tested_max.size} ({mib(variant.tested_max.alloc_mib)}
				allocated){/if}
		</dd>
		{#if card.options.length}
			<dt>Options</dt>
			<dd>
				<ul>
					{#each card.options as o (o.name)}
						<li>
							<code>{o.name}={JSON.stringify(o.default)}</code>{#if o.bounds}
								<small>{o.bounds}</small>{/if}{#if o.effect === 'output'} <small>· changes the output</small>{/if}
						</li>
					{/each}
				</ul>
			</dd>
		{/if}
		<dt>Outputs</dt>
		<dd>
			{#each card.outputs as o, i (o.name)}{i ? ', ' : ''}<code>{o.name}</code>{#if o.extra}
					<small>(on request)</small>{/if}{/each}
		</dd>
		{#if Object.keys(variant.params).length}
			<dt>Checkpoint</dt>
			<dd>{#each Object.entries(variant.params) as [k, v], i (k)}{i ? ', ' : ''}<code>{k}={JSON.stringify(v)}</code>{/each}</dd>
		{/if}
		<dt>CUDA kernels</dt>
		<dd>
			{#if card.kernel_libs.length}{#each card.kernel_libs as k (k)}<code class="chip">{k}</code>{/each}{:else}none{card.no_kernels_reason
					? `: ${card.no_kernels_reason}`
					: ''}{/if}
		</dd>
		{#if card.mps_kernel_libs.length || card.mps_dtypes.length}
			<dt>Apple (MPS)</dt>
			<dd>
				{#each card.mps_kernel_libs as k (k)}<code class="chip">{k}</code>{/each}
				{#if card.mps_dtypes.length}<small>{card.mps_dtypes.map(dt).join(', ')}</small>{/if}
			</dd>
		{/if}
	</dl>
	{#if card.limitations.length}
		<h3>Limitations</h3>
		<ul>
			{#each card.limitations as l (l)}<li>{l}</li>{/each}
		</ul>
	{/if}

	{#if data.doc}
		<details>
			<summary>Full reference, generated from the repository</summary>
			<!-- Rendered at sync time from the fastforks repo's own Markdown, not user input. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html data.doc.html}
		</details>
	{/if}

	<h2 id="example">Example output</h2>
	<CardExample example={variant.example} task={card.task} />
</DocPage>

<style>
	.lede {
		max-width: 760px;
		margin: 0 0 0.6rem;
		font-size: 1.12rem;
	}
	.origin {
		margin: -0.2rem 0 1rem;
		padding: 0;
		list-style: none;
		font-size: 0.9rem;
		line-height: 1.45;
	}
	.origin li + li {
		margin-top: 0.25rem;
	}
	.origin .k {
		display: inline-block;
		min-width: 7.5rem;
		color: var(--muted);
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.origin .m {
		color: var(--muted);
	}
	@media (max-width: 640px) {
		.origin .k {
			display: block;
		}
	}
	.upstream,
	.single,
	.setting {
		margin: 0 0 1rem;
		color: var(--muted);
		font-size: 0.88rem;
	}
	.upstream a {
		color: var(--ink);
	}
	.tier {
		margin-right: 0.5rem;
		padding: 0.05rem 0.45rem;
		border: 1px solid var(--line);
		font: 600 0.7rem/1.4 var(--mono);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.tier.stable {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-ink);
	}
	.variants,
	.glance,
	.toc {
		max-width: 920px;
	}
	.variants {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem;
		margin: 0 0 1rem;
	}
	.variants .label {
		margin-right: 0.4rem;
		color: var(--muted);
		font-size: 0.82rem;
	}
	.variants button {
		padding: 0.35rem 0.65rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface);
		color: var(--ink);
		font: 500 0.8rem/1.2 var(--mono);
		cursor: pointer;
	}
	.variants button[aria-pressed='true'] {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--bg);
	}
	/* Upcoming checkpoints: dashed and grey, still clickable. */
	.variants button.upcoming {
		border-style: dashed;
		background: transparent;
		color: var(--muted);
	}
	.variants button.upcoming[aria-pressed='true'] {
		background: var(--muted);
		border-color: var(--muted);
		color: var(--bg);
	}
	.variants button small {
		margin-left: 0.35rem;
		font: 500 0.64rem/1 var(--sans);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.banner,
	.soon-note {
		max-width: 920px;
		padding: 0.6rem 0.85rem;
		border: 1px dashed var(--strong-line);
		border-radius: 6px;
		font-size: 0.9rem;
	}
	.banner {
		margin: 0 0 1rem;
	}
	.soon-note {
		margin: 0 0 1rem;
		color: var(--muted);
	}
	.glance {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 0.6rem;
		margin: 0 0 1.2rem;
	}
	.tile {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.8rem 0.9rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
	}
	.tile .k {
		color: var(--muted);
		font: 600 0.66rem/1.3 var(--mono);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.tile .v {
		font-size: 1.45rem;
		font-weight: 680;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}
	.tile .s {
		color: var(--muted);
		font-size: 0.78rem;
	}
	.back {
		display: block;
		margin-bottom: 1.4rem;
	}
	.back {
		color: var(--muted);
		text-decoration: none;
	}
	.side-list {
		margin: 0.5rem 0 1.6rem;
		padding: 0;
		list-style: none;
	}
	.side-list a {
		display: block;
		padding: 0.25rem 0;
		color: var(--muted);
		text-decoration: none;
	}
	.back:hover,
	.side-list a:hover {
		color: var(--ink);
	}
	/* The inline section list is for narrow screens, where the sidebar is hidden. */
	.toc {
		display: none;
	}
	@media (max-width: 900px) {
		.toc {
			display: flex;
		}
	}
	.toc {
		flex-wrap: wrap;
		flex-wrap: wrap;
		gap: 0.3rem 1rem;
		padding: 0.6rem 0;
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
		font-size: 0.85rem;
	}
	.toc a {
		color: var(--muted);
		text-decoration: none;
	}
	.toc a:hover {
		color: var(--ink);
	}
	.after {
		margin: 0.5rem 0 1.2rem !important;
		color: var(--muted);
		font-size: 0.86rem;
	}
	/* Shared by the card components (all inside DocPage's .prose). */
	:global(.prose .num) {
		text-align: right !important;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	:global(.prose .table tbody th) {
		color: var(--ink);
		font: 600 0.82rem/1.35 var(--sans);
		letter-spacing: 0;
		text-transform: none;
		border-top: 1px solid var(--line);
		border-bottom: 0;
		vertical-align: top;
	}
	:global(.prose .fine) {
		margin-top: -0.6rem;
		color: var(--muted);
		font-size: 0.8rem;
	}
	:global(.prose .tag) {
		color: var(--muted);
		font-style: italic;
		font-size: 0.78rem;
	}
	:global(.prose code.chip) {
		display: inline-block;
		margin: 0.1rem 0.25rem 0.1rem 0;
	}
	.facts {
		display: grid;
		grid-template-columns: 9rem 1fr;
		gap: 0.5rem 1rem;
		margin: 0 0 1.4rem;
		font-size: 0.92rem;
	}
	.facts dt {
		color: var(--muted);
	}
	.facts dd {
		margin: 0;
	}
	.facts ul {
		margin: 0 !important;
		padding-left: 1rem;
	}
	.facts small {
		color: var(--muted);
	}
	@media (max-width: 560px) {
		.facts {
			grid-template-columns: 1fr;
		}
	}
</style>
