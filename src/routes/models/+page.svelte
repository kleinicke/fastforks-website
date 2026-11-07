<script lang="ts">
	import { onMount } from 'svelte';
	import { data, DEVICES, fmtMs, licenceOf, REFERENCE, TASK_META, TASK_ORDER, timings, type Timing } from '#lib/site.ts';

	type Row = Timing & { task: string; code: string; weights: string };
	type Key = 'id' | 'task' | 'kernels_ms' | 'portable_ms' | 'original_ms' | 'speedup' | 'peak_mib';

	let deviceSlug = $state(REFERENCE.slug);
	const device = $derived(DEVICES.find((d) => d.slug === deviceSlug)!);
	const taskIds = $derived(TASK_ORDER.filter((id) => device.tasks.includes(id)));
	const all: Row[] = $derived(
		data.tasks.flatMap((t) =>
			timings(device, t).map((m) => {
				const lic = licenceOf(m.id);
				return { ...m, task: t.id, code: lic?.code ?? '–', weights: lic?.weights ?? '–' };
			})
		)
	);

	let task = $state('all');
	let query = $state('');
	let commercialOnly = $state(false);
	let sortKey = $state<Key>('kernels_ms');
	let ascending = $state(true);

	onMount(() => {
		const q = new URLSearchParams(location.search);
		const d = q.get('device');
		if (d && DEVICES.some((x) => x.slug === d)) deviceSlug = d;
		const t = q.get('task');
		if (t && TASK_ORDER.includes(t)) task = t;
	});

	function setParam(key: string, value: string | null) {
		const url = new URL(location.href);
		if (value === null) url.searchParams.delete(key);
		else url.searchParams.set(key, value);
		history.replaceState(history.state, '', url);
	}
	function setTask(id: string) {
		task = id;
		setParam('task', id === 'all' ? null : id);
	}
	function setDevice(slug: string) {
		deviceSlug = slug;
		setParam('device', slug === REFERENCE.slug ? null : slug);
		if (task !== 'all' && !DEVICES.find((d) => d.slug === slug)!.tasks.includes(task)) setTask('all');
		if (sortKey === 'original_ms' || sortKey === 'peak_mib') sortKey = 'kernels_ms';
	}

	function sortBy(key: Key) {
		if (sortKey === key) ascending = !ascending;
		else {
			sortKey = key;
			ascending = key === 'id' || key === 'task' || key.endsWith('_ms') || key === 'peak_mib';
		}
	}

	const rows = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const out = all.filter(
			(r) =>
				(task === 'all' || r.task === task) &&
				(!commercialOnly || r.commercial === 'yes') &&
				(!q || r.id.includes(q) || r.code.toLowerCase().includes(q) || r.weights.toLowerCase().includes(q))
		);
		const dir = ascending ? 1 : -1;
		return out.sort((a, b) => {
			const x = a[sortKey];
			const y = b[sortKey];
			if (x === null || x === undefined) return 1;
			if (y === null || y === undefined) return -1;
			return (typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number)) * dir;
		});
	});

	const current = $derived(task === 'all' ? null : data.tasks.find((t) => t.id === task)!);
	const ariaSort = (key: Key) => (sortKey === key ? (ascending ? 'ascending' : 'descending') : 'none');
	const columns: { key: Key; label: string; num?: boolean }[] = $derived(
		device.reference
			? [
					{ key: 'id', label: 'Model' },
					{ key: 'task', label: 'Task' },
					{ key: 'original_ms', label: 'Original', num: true },
					{ key: 'kernels_ms', label: 'Kernels', num: true },
					{ key: 'speedup', label: 'Gain', num: true },
					{ key: 'peak_mib', label: 'Peak MiB', num: true }
				]
			: [
					{ key: 'id', label: 'Model' },
					{ key: 'task', label: 'Task' },
					{ key: 'portable_ms', label: 'Portable', num: true },
					{ key: 'kernels_ms', label: 'Kernels', num: true },
					{ key: 'speedup', label: 'Gain', num: true }
				]
	);
	/** A survey cell: the time, or why there is none. */
	const cell = (v: number | null, note: string | null) => (v === null ? (note ?? '–') : fmtMs(v));
</script>

<svelte:head>
	<title>All {data.totals.models} models · fastforks</title>
	<meta
		name="description"
		content="Every fastforks model with its speed on the reference GPU, speed-up over the authors' code, peak memory and code and weights licences."
	/>
</svelte:head>

<section class="section head">
	<div class="wrap">
		<p class="eyebrow">Models</p>
		<h1>{data.totals.models} models, {data.totals.commercial} commercially usable.</h1>
		<p class="lede">
			{#if device.reference}
				Times are medians of warm runs on the {device.name} at each task's standard input. Gain is kernels against
				the authors' code where it was timed, otherwise against portable. Generated from
				<a href={data.source.repo + '/blob/main/docs/overview.md'}>docs/overview.md</a> at
				<code>{data.source.commit}</code>.
			{:else}
				A survey on the {device.name} ({device.memory}, {device.details}; {device.software}), measured
				{device.measured?.to}: {all.length} models. Each time is the fastest passing dtype of that mode; gain is
				kernels against portable, since the authors' code was not run here. Details on the
				<a href={device.page}>device page</a>.
			{/if}
		</p>

		<div class="controls">
			<div class="chips" role="group" aria-label="Device">
				{#each DEVICES as d (d.slug)}
					<button type="button" aria-pressed={deviceSlug === d.slug} onclick={() => setDevice(d.slug)}
						>{d.name}{#if d.reference}<small> reference</small>{/if}</button
					>
				{/each}
			</div>
			<div class="chips" role="group" aria-label="Filter by task">
				<button type="button" aria-pressed={task === 'all'} onclick={() => setTask('all')}>All</button>
				{#each taskIds as id (id)}
					<button type="button" aria-pressed={task === id} onclick={() => setTask(id)}>{TASK_META[id].name}</button>
				{/each}
			</div>
			<div class="row">
				<label class="search">
					<span class="sr-only">Search models or licences</span>
					<input type="search" placeholder="Search id or licence…" bind:value={query} />
				</label>
				<label class="toggle">
					<input type="checkbox" bind:checked={commercialOnly} />
					Commercially usable only
				</label>
				<span class="count" aria-live="polite">{rows.length} shown</span>
			</div>
		</div>

		{#if current}
			<p class="taskinfo">
				<code>{TASK_META[task].pkg}.load(…) → {TASK_META[task].call}</code> · input {current.input}
				{#if current.picks.length && device.reference}
					<br />
					{#each current.picks as p, i (p.label)}
						{i ? ' · ' : ''}{p.label}: <a href={p.doc}>{p.id}</a> <span class="muted">({p.note})</span>
					{/each}
				{/if}
			</p>
		{/if}

		<div class="table">
			<table>
				<thead>
					<tr>
						{#each columns as c (c.key)}
							<th scope="col" class:num={c.num} aria-sort={ariaSort(c.key)}>
								<button type="button" onclick={() => sortBy(c.key)}>
									{c.label}<span aria-hidden="true">{sortKey === c.key ? (ascending ? ' ↑' : ' ↓') : ''}</span>
								</button>
							</th>
						{/each}
						<th scope="col">Licence (code / weights)</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as r (r.task + r.id)}
						<tr>
							<th scope="row"><a href={r.doc}><code>{r.id}</code></a></th>
							<td class="task">{TASK_META[r.task].name}</td>
							{#if device.reference}
								<td class="num">{fmtMs(r.original_ms)}</td>
								<td class="num strong">{fmtMs(r.kernels_ms)}</td>
							{:else}
								<td class="num" class:muted={r.portable_ms === null}>
									{cell(r.portable_ms, r.portable_note)}{#if r.portable_ms !== null}<small>{r.portable_note}</small>{/if}
								</td>
								<td class="num strong" class:muted={r.kernels_ms === null}>
									{cell(r.kernels_ms, r.kernels_note)}{#if r.kernels_ms !== null}<small>{r.kernels_note}</small>{/if}
								</td>
							{/if}
							<td class="num">
								{#if r.speedup !== null}{r.speedup.toFixed(1)}×{#if r.speedup_vs !== 'original'}<small> vs portable</small>{/if}{:else}–{/if}
							</td>
							{#if device.reference}<td class="num">{r.peak_mib ?? '–'}</td>{/if}
							<td class="lic">
								<span class="badge" class:yes={r.commercial === 'yes'}
									>{r.commercial === 'yes' ? 'commercial' : 'non-commercial'}</span
								>
								{r.code} / {r.weights}
							</td>
						</tr>
					{:else}
						<tr><td colspan={columns.length + 1} class="empty">No model matches.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="note">
			Times in ms; – means not timed or not available{device.reference
				? ''
				: '; unsupported = the mode does not exist on this backend, failed = it raised, OOM = out of memory'}. Licence data comes from the model registry and is not legal
			advice.
		</p>
	</div>
</section>

<style>
	.head h1 {
		margin: 0 0 1rem;
		font-size: clamp(2rem, 4.5vw, 3.4rem);
		letter-spacing: -0.04em;
		line-height: 1.02;
	}
	.lede code {
		font-size: 0.88em;
	}
	.controls {
		display: grid;
		gap: 1rem;
		margin: 2rem 0 1rem;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.chips button {
		min-height: 36px;
		padding: 0 0.85rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface);
		color: var(--muted);
		font: 600 0.8rem/1 var(--sans);
		cursor: pointer;
	}
	.chips button:hover {
		color: var(--ink);
		border-color: var(--strong-line);
	}
	.chips small {
		margin-left: 0.4em;
		font-weight: 500;
		opacity: 0.7;
	}
	td.muted {
		color: var(--muted);
		font-weight: 400;
	}
	.chips button[aria-pressed='true'] {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--bg);
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.5rem;
	}
	.search input {
		width: min(320px, 100%);
		min-height: 40px;
		padding: 0 0.8rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
		color: var(--ink);
		font: 500 0.88rem/1 var(--sans);
	}
	.search {
		flex: 1 1 240px;
		max-width: 320px;
	}
	.search input:focus {
		outline: 2px solid var(--blue);
		outline-offset: 1px;
	}
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.88rem;
		cursor: pointer;
	}
	.toggle input {
		width: 18px;
		height: 18px;
		accent-color: var(--ink);
	}
	.count {
		color: var(--muted);
		font: 500 0.75rem/1 var(--mono);
	}
	.taskinfo {
		margin: 0 0 1rem;
		color: var(--ink);
		font-size: 0.86rem;
		line-height: 1.8;
	}
	.taskinfo code {
		color: var(--blue);
	}
	.muted {
		color: var(--muted);
	}
	.table {
		overflow-x: auto;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface);
	}
	table {
		width: 100%;
		min-width: 860px;
		border-collapse: collapse;
		font-size: 0.86rem;
	}
	thead th {
		position: sticky;
		top: 0;
		background: var(--surface);
		border-bottom: 1px solid var(--strong-line);
		color: var(--muted);
		font: 600 0.68rem/1.2 var(--mono);
		letter-spacing: 0.06em;
		text-align: left;
		text-transform: uppercase;
		white-space: nowrap;
	}
	thead th {
		padding: 0.7rem 0.8rem;
	}
	thead th:has(button) {
		padding: 0;
	}
	thead button {
		width: 100%;
		padding: 0.7rem 0.8rem;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		letter-spacing: inherit;
		text-align: inherit;
		text-transform: inherit;
		cursor: pointer;
	}
	thead button:hover {
		color: var(--ink);
	}
	th.num,
	td.num {
		text-align: right;
	}
	tbody th,
	tbody td {
		padding: 0.6rem 0.8rem;
		border-top: 1px solid var(--line);
		text-align: left;
		font-weight: 400;
		vertical-align: top;
	}
	tbody tr:hover {
		background: color-mix(in srgb, var(--accent) 10%, var(--surface));
	}
	tbody th a {
		text-decoration: none;
	}
	tbody th a:hover {
		text-decoration: underline;
	}
	tbody th code {
		white-space: nowrap;
		font-size: 0.82rem;
		font-weight: 600;
	}
	td.num {
		font-family: var(--mono);
		font-size: 0.8rem;
		white-space: nowrap;
	}
	td.strong {
		font-weight: 700;
	}
	td small {
		margin-left: 0.25em;
		color: var(--muted);
		font-size: 0.68rem;
	}
	td.task {
		color: var(--muted);
		white-space: nowrap;
	}
	td.lic {
		color: var(--muted);
		font-size: 0.78rem;
		min-width: 260px;
	}
	.badge {
		display: inline-block;
		margin-right: 0.4rem;
		padding: 0.15rem 0.4rem;
		border: 1px solid var(--line);
		border-radius: 3px;
		color: var(--muted);
		font: 600 0.64rem/1.3 var(--mono);
	}
	.badge.yes {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-ink);
	}
	.empty {
		padding: 2rem;
		color: var(--muted);
		text-align: center;
	}
	.note {
		margin: 0.8rem 0 0;
		color: var(--muted);
		font: 500 0.72rem/1.5 var(--mono);
	}
</style>
