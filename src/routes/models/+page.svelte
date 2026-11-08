<script lang="ts">
	import { onMount } from 'svelte';
	import DeviceCompare from '#lib/components/DeviceCompare.svelte';
	import {
		data,
		DEVICES,
		fmtMs,
		licenceOf,
		REFERENCE,
		shortName,
		TASK_META,
		TASK_ORDER,
		timings,
		type Extra,
		type Timing
	} from '#lib/site.ts';

	type Mode = 'original' | 'portable' | 'compile' | 'tensorrt' | 'kernels';
	type MemMode = 'original' | 'portable' | 'kernels';
	type MemKey = `mem_${MemMode}`;
	type GainKey = 'gain_original' | 'gain_portable';
	type Row = Timing & { task: string; code: string; weights: string; rank: number; acc: number | null } & Record<
			MemKey | GainKey | 'compile_ms' | 'tensorrt_ms',
			number | null
		>;
	type Key = 'rank' | 'id' | 'task' | 'acc' | `${Mode}_ms` | GainKey | MemKey;

	// Default order on every device: the reference GPU's kernels time, so a model keeps its row when you switch.
	const RANK = new Map(
		data.tasks
			.flatMap((t) => t.models.map((m) => ({ key: `${t.id}/${m.id}`, ms: m.kernels_ms ?? Infinity })))
			.sort((a, b) => a.ms - b.ms)
			.map((m, i) => [m.key, i])
	);

	let deviceSlug = $state(REFERENCE.slug);
	const device = $derived(DEVICES.find((d) => d.slug === deviceSlug)!);
	const taskIds = $derived(TASK_ORDER.filter((id) => device.tasks.includes(id)));
	const all: Row[] = $derived(
		data.tasks.flatMap((t) =>
			timings(device, t).map((m) => {
				const lic = licenceOf(m.id);
				return {
					...m,
					task: t.id,
					rank: RANK.get(`${t.id}/${m.id}`) ?? Infinity,
					code: lic?.code ?? '–',
					weights: lic?.weights ?? '–',
					// Kernels against the authors' code (only where it was timed) and against portable, the same weights in fastforks.
					gain_original: m.speedup_vs === 'original' ? m.speedup : null,
					gain_portable:
						m.portable_ms !== null && m.kernels_ms !== null ? Math.round((m.portable_ms / m.kernels_ms) * 10) / 10 : null,
					mem_original: m.mem?.original?.alloc ?? null,
					mem_portable: m.mem?.portable?.alloc ?? null,
					mem_kernels: m.mem?.kernels?.alloc ?? null,
					compile_ms: m.compile?.ms ?? null,
					tensorrt_ms: m.tensorrt?.ms ?? null,
					acc: Number.isFinite(Number.parseFloat(m.accuracy ?? '')) ? Number.parseFloat(m.accuracy!) : null
				};
			})
		)
	);

	let task = $state('all');
	let query = $state('');
	let commercialOnly = $state(false);
	let sortKey = $state<Key>('rank');
	let ascending = $state(true);
	let view = $state<'device' | 'compare'>('device');
	// The reference GPU also has the authors' code, torch.compile, TensorRT and accuracy: off by default, so every
	// device's table has the same columns.
	let extra = $state(false);
	const more = $derived(device.reference && extra);

	onMount(() => {
		const q = new URLSearchParams(location.search);
		const d = q.get('device');
		if (d && DEVICES.some((x) => x.slug === d)) deviceSlug = d;
		const t = q.get('task');
		if (t && TASK_ORDER.includes(t)) task = t;
		if (q.get('view') === 'compare') view = 'compare';
		if (q.get('more') === '1') extra = true;
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
		if (!DEVICES.find((d) => d.slug === slug)!.reference && !COMMON.has(sortKey)) sortKey = 'rank';
	}
	const COMMON = new Set<Key>(['rank', 'id', 'task', 'portable_ms', 'kernels_ms', 'gain_portable', 'mem_portable', 'mem_kernels']);
	function setView(v: 'device' | 'compare') {
		view = v;
		setParam('view', v === 'compare' ? 'compare' : null);
	}
	function showExtra() {
		setView('device');
		setDevice(REFERENCE.slug);
		setExtra(true);
	}
	function setExtra(on: boolean) {
		extra = on;
		setParam('more', on ? '1' : null);
		if (!on && !COMMON.has(sortKey)) sortKey = 'rank';
	}

	function sortBy(key: Key) {
		if (sortKey === key) ascending = !ascending;
		else {
			sortKey = key;
			ascending = !key.startsWith('gain_');
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
	const arrow = (key: Key) => (sortKey === key ? (ascending ? ' ↑' : ' ↓') : '');
	const ariaSort = (key: Key) => (sortKey === key ? (ascending ? 'ascending' : 'descending') : 'none');
	const modes: Mode[] = $derived(more ? ['original', 'portable', 'compile', 'tensorrt', 'kernels'] : ['portable', 'kernels']);
	const memModes: MemMode[] = $derived(more ? ['original', 'portable', 'kernels'] : ['portable', 'kernels']);
	/** The speed-up columns of kernels. */
	const gains = $derived((more ? ['original', 'portable'] : ['portable']) as ('original' | 'portable')[]);
	const LABEL: Record<Mode, string> = {
		original: 'Original',
		portable: 'Portable',
		compile: 'Compile',
		tensorrt: 'TensorRT',
		kernels: 'Kernels'
	};
	const label = (m: Mode) => LABEL[m];
	/** "ImageNet-1k val, 5000 random images, top-1 / top-5 %" → "ImageNet-1k val · top-1 / top-5 %". */
	const metric = (m: string) => {
		const parts = m.split(', ');
		return parts.length > 1 ? `${parts[0]} · ${parts.at(-1)}` : m;
	};
	/** One-time cost of torch.compile or a TensorRT engine build, in s or min. */
	const prep = (s: number | null) => (s === null ? '?' : s >= 90 ? `${(s / 60).toFixed(1)} min` : `${Math.round(s)} s`);
	const footprint = $derived(device.memory_kind === 'process-footprint');
	const memTitle = $derived(footprint ? 'Peak memory (MiB, whole process)' : 'Peak memory (MiB)');
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
			{#if view === 'compare'}
				Every model on every device, side by side: pick a task, then sort by a device or open a model for its bars.
				All devices ran the same models at the same inputs; the authors' code, torch.compile and TensorRT only on the
				{REFERENCE.name} (<button type="button" class="link" onclick={showExtra}>its extra columns</button>).
			{:else if device.reference}
				Times are medians of warm runs on the {device.name}, the reference GPU, at each task's standard input:
				portable is the model in plain PyTorch, kernels the same weights with the custom kernels. This GPU also has
				the authors' original code, torch.compile and TensorRT: switch on the extra columns. Click a model for its
				variants, accuracy and limitations; the method is on the <a href="/benchmarks">benchmarks page</a>. Data
				from fastforks <code>{data.source.commit}</code>.
			{:else}
				A survey on the {device.name} ({device.memory}, {device.details}; {device.software}), measured
				{device.measured?.to}: {all.length} models. Each time is the fastest passing dtype of that mode. Details on
				the <a href={device.page}>device page</a>.
			{/if}
		</p>

		<div class="controls">
			<div class="views" role="tablist" aria-label="View">
				<button type="button" role="tab" aria-selected={view === 'device'} onclick={() => setView('device')}
					>One device</button
				>
				<button type="button" role="tab" aria-selected={view === 'compare'} onclick={() => setView('compare')}
					>Compare devices</button
				>
			</div>
			{#if view === 'device'}
				<div class="filter">
					<span class="lab" id="lab-device">Device</span>
					<div class="devices" role="group" aria-labelledby="lab-device">
						{#each DEVICES as d (d.slug)}
							<button type="button" aria-pressed={deviceSlug === d.slug} onclick={() => setDevice(d.slug)}>
								<b>{shortName(d)}</b>
								<span>{d.memory}{d.reference ? ' · reference' : ''}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
			<div class="filter">
				<span class="lab" id="lab-task">Task</span>
				<div class="chips" role="group" aria-labelledby="lab-task">
					<button type="button" aria-pressed={task === 'all'} onclick={() => setTask('all')}>All</button>
					{#each view === 'device' ? taskIds : TASK_ORDER as id (id)}
						<button type="button" aria-pressed={task === id} onclick={() => setTask(id)}>{TASK_META[id].name}</button>
					{/each}
				</div>
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
				{#if view === 'device'}
					{#if device.reference}
						<label class="toggle">
							<input type="checkbox" checked={extra} onchange={(e) => setExtra(e.currentTarget.checked)} />
							Extra columns: original code, torch.compile, TensorRT, accuracy
						</label>
					{/if}
					<span class="count" aria-live="polite">{rows.length} shown</span>
				{/if}
			</div>
		</div>

		{#if current}
			<p class="taskinfo">
				<code>{TASK_META[task].pkg}.load(…) → {TASK_META[task].call}</code> · input {current.input}
				{#if current.picks.length}
					<br />
					{#each current.picks as p, i (p.label)}
						{i ? ' · ' : ''}{p.label}: <a href={p.doc}>{p.id}</a> <span class="muted">({p.note})</span>
					{/each}
				{/if}
			</p>
		{/if}

		{#if view === 'compare'}
			<DeviceCompare {task} {query} {commercialOnly} rank={RANK} />
		{:else}
			<div class="table">
				<table class:wide={more}>
					<thead>
						<tr class="groups">
							<th scope="colgroup" colspan="2"></th>
							<th scope="colgroup" colspan={modes.length} class="grp">Time (ms)</th>
							<th scope="colgroup" colspan={gains.length} class="grp">Kernels speed-up vs</th>
							<th scope="colgroup" colspan={memModes.length} class="grp">{memTitle}</th>
							{#if more}<th scope="col" rowspan="2" class="first acc">Accuracy (kernels)</th>{/if}
							<th scope="col" rowspan="2">Licence (code / weights)</th>
						</tr>
						<tr>
							{#snippet sortable(key: Key, text: string, num: boolean, first = false)}
								<th scope="col" class:num class:first aria-sort={ariaSort(key)}>
									<button type="button" onclick={() => sortBy(key)}>
										{text}<span aria-hidden="true">{arrow(key)}</span>
									</button>
								</th>
							{/snippet}
							{@render sortable('id', 'Model', false)}
							{@render sortable('task', 'Task', false)}
							{#each modes as m, i (m)}{@render sortable(`${m}_ms`, label(m), true, i === 0)}{/each}
							{#each gains as m, i (m)}{@render sortable(`gain_${m}`, label(m), true, i === 0)}{/each}
							{#each memModes as m, i (m)}{@render sortable(`mem_${m}`, label(m), true, i === 0)}{/each}
						</tr>
					</thead>
					<tbody>
						{#snippet ext(x: Extra, what: string)}
							{#if !x}–{:else if x.ms === null}fails<span class="sub why">{x.fails}</span>{:else}{fmtMs(
									x.ms
								)}<span class="sub">+ {prep(x.prep_s)} {what}</span>{#if x.part}<span class="sub">{x.part} only</span>{/if}{/if}
						{/snippet}
						{#each rows as r (r.task + r.id)}
							<tr>
								<th scope="row"><a href={r.doc}><code>{r.id}</code></a></th>
								<td class="task">{TASK_META[r.task].name}</td>
								{#if more}
									<td class="num first" class:muted={r.original_ms === null}>{cell(r.original_ms, r.original_note)}</td>
									<td class="num">{fmtMs(r.portable_ms)}</td>
									<td class="num ext" class:muted={r.compile_ms === null}>{@render ext(r.compile, 'compile')}</td>
									<td class="num ext" class:muted={r.tensorrt_ms === null}>{@render ext(r.tensorrt, 'build')}</td>
									<td class="num strong">{fmtMs(r.kernels_ms)}</td>
								{:else if device.reference}
									<td class="num first">{fmtMs(r.portable_ms)}</td>
									<td class="num strong">{fmtMs(r.kernels_ms)}</td>
								{:else}
									<td class="num first" class:muted={r.portable_ms === null}>
										{cell(r.portable_ms, r.portable_note)}{#if r.portable_ms !== null}<small>{r.portable_note}</small>{/if}
									</td>
									<td class="num strong" class:muted={r.kernels_ms === null}>
										{cell(r.kernels_ms, r.kernels_note)}{#if r.kernels_ms !== null}<small>{r.kernels_note}</small>{/if}
									</td>
								{/if}
								{#each gains as m, i (m)}
									{@const g = r[`gain_${m}`]}
									<td class="num" class:first={i === 0} class:strong={g !== null && g >= 1.5}
										>{g === null ? '–' : `${g.toFixed(1)}×`}</td
									>
								{/each}
								{#each memModes as m, i (m)}
									<td class="num" class:first={i === 0} class:strong={m === 'kernels'}>
										{r[`mem_${m}`] ?? '–'}
									</td>
								{/each}
								{#if more}
									<td class="num first acc">
										{r.accuracy ?? '–'}{#if r.accuracy_metric}<span class="sub">{metric(r.accuracy_metric)}</span>{/if}
									</td>
								{/if}
								<td class="lic">
									<span class="badge" class:yes={r.commercial === 'yes'}
										>{r.commercial === 'yes' ? 'commercial' : 'non-commercial'}</span
									>
									{r.code} / {r.weights}
								</td>
							</tr>
						{:else}
							<tr><td colspan={3 + modes.length + gains.length + memModes.length + (more ? 1 : 0)} class="empty">No model matches.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="note">
				Rows keep the reference GPU's kernels-time order on every device; click a header to sort by it. Times are
				milliseconds per call; – means not timed or not available{more
					? ". Original is the faster of the authors' code in fp32 and in its own half precision. Compile is portable with model.compile() and TensorRT the fp16 engine of portable, both run for one variant per family; under each time is its one-time cost (compile or engine build), and where it fails, why. Accuracy is the kernels result of the model's golden check, with its dataset and metric below. Memory is the peak allocated by PyTorch"
					: device.reference
						? '. Memory is the peak allocated by PyTorch'
						: `; the small text is the dtype; portable only = no kernels for this model on this backend (they were written only where they beat portable), failed = it raised, OOM = out of memory. Memory is that of the fastest dtype's run, ${footprint ? 'the peak footprint of the whole process (Apple has no PyTorch allocator peak), so it includes PyTorch itself' : 'the peak allocated by PyTorch'}; compare it within a device, not across devices`}. Licence data comes from the model registry and is not legal advice.
			</p>
		{/if}
	</div>
</section>

<style>
	.head h1 {
		margin: 0 0 1rem;
		font-size: clamp(2rem, 4.5vw, 3.4rem);
		letter-spacing: -0.04em;
		line-height: 1.02;
	}
	.head :global(.lede code) {
		font-size: 0.88em;
	}
	.head :global(.controls) {
		display: grid;
		gap: 1rem;
		margin: 2rem 0 1rem;
	}
	.head :global(button.link) {
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
	.head :global(.views) {
		display: inline-flex;
		justify-self: start;
		padding: 3px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface);
	}
	.head :global(.views button) {
		min-height: 34px;
		padding: 0 1rem;
		border: 0;
		border-radius: 6px;
		background: none;
		color: var(--muted);
		font: 600 0.84rem/1 var(--sans);
		cursor: pointer;
	}
	.head :global(.views button[aria-selected='true']) {
		background: var(--ink);
		color: var(--bg);
	}
	.head :global(table.wide) {
		min-width: 1380px;
	}
	.head :global(th.acc) {
		vertical-align: bottom;
		border-bottom: 1px solid var(--strong-line);
	}
	.head :global(.filter) {
		display: grid;
		grid-template-columns: 4.5rem 1fr;
		align-items: start;
		gap: 0.5rem;
	}
	.head :global(.lab) {
		padding-top: 0.6rem;
		color: var(--muted);
		font: 600 0.68rem/1 var(--mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.head :global(.devices) {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
		gap: 0.4rem;
	}
	.head :global(.devices button) {
		display: grid;
		gap: 0.25rem;
		padding: 0.55rem 0.75rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
		color: var(--ink);
		text-align: left;
		cursor: pointer;
	}
	.head :global(.devices b) {
		font: 700 0.86rem/1.15 var(--sans);
	}
	.head :global(.devices span) {
		color: var(--muted);
		font: 500 0.68rem/1.2 var(--mono);
	}
	.head :global(.devices button:hover) {
		border-color: var(--strong-line);
	}
	.head :global(.devices button[aria-pressed='true']) {
		border-color: var(--ink);
		box-shadow: inset 0 0 0 1px var(--ink);
		background: color-mix(in srgb, var(--accent) 22%, var(--surface));
	}
	.head :global(.ext .sub),
	.head :global(.acc .sub) {
		display: block;
		max-width: 12rem;
		margin-left: auto;
		margin-top: 0.15rem;
		color: var(--muted);
		font: 500 0.64rem/1.25 var(--mono);
		white-space: normal;
	}
	.head :global(.acc .sub) {
		max-width: 16rem;
	}
	.head :global(.ext .sub:not(.why)) {
		white-space: nowrap;
	}
	@media (max-width: 640px) {
		.head :global(.filter) {
			grid-template-columns: 1fr;
		}
		.head :global(.lab) {
			padding-top: 0;
		}
	}
	.head :global(.chips) {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.head :global(.chips button) {
		min-height: 36px;
		padding: 0 0.85rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface);
		color: var(--muted);
		font: 600 0.8rem/1 var(--sans);
		cursor: pointer;
	}
	.head :global(.chips button:hover) {
		color: var(--ink);
		border-color: var(--strong-line);
	}
	.head :global(.chips small) {
		margin-left: 0.4em;
		font-weight: 500;
		opacity: 0.7;
	}
	.head :global(td.muted) {
		color: var(--muted);
		font-weight: 400;
	}
	.head :global(.chips button[aria-pressed='true']) {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--bg);
	}
	.head :global(.row) {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.5rem;
	}
	.head :global(.search input) {
		width: min(320px, 100%);
		min-height: 40px;
		padding: 0 0.8rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
		color: var(--ink);
		font: 500 0.88rem/1 var(--sans);
	}
	.head :global(.search) {
		flex: 1 1 240px;
		max-width: 320px;
	}
	.head :global(.search input:focus) {
		outline: 2px solid var(--blue);
		outline-offset: 1px;
	}
	.head :global(.toggle) {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.88rem;
		cursor: pointer;
	}
	.head :global(.toggle input) {
		width: 18px;
		height: 18px;
		accent-color: var(--ink);
	}
	.head :global(.count) {
		color: var(--muted);
		font: 500 0.75rem/1 var(--mono);
	}
	.head :global(.taskinfo) {
		margin: 0 0 1rem;
		color: var(--ink);
		font-size: 0.86rem;
		line-height: 1.8;
	}
	.head :global(.taskinfo code) {
		color: var(--blue);
	}
	.head :global(.muted) {
		color: var(--muted);
	}
	.head :global(.table) {
		overflow-x: auto;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--surface);
	}
	.head :global(table) {
		width: 100%;
		min-width: 1080px;
		border-collapse: collapse;
		font-size: 0.86rem;
	}
	.head :global(thead th) {
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
	.head :global(thead th) {
		padding: 0.7rem 0.8rem;
	}
	.head :global(thead th:has(button)) {
		padding: 0;
	}
	.head :global(thead button) {
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
	.head :global(.groups th) {
		padding: 0.55rem 0.8rem 0.2rem;
		border-bottom: 0;
	}
	.head :global(.groups th.grp) {
		border-left: 1px solid var(--line);
		color: var(--ink);
		text-align: center;
	}
	.head :global(.groups th[rowspan]) {
		vertical-align: bottom;
		border-bottom: 1px solid var(--strong-line);
	}
	.head :global(thead tr:not(.groups) th) {
		top: 1.9rem;
	}
	.head :global(th.first),
	.head :global(td.first) {
		border-left: 1px solid var(--line);
	}
	.head :global(thead button:hover) {
		color: var(--ink);
	}
	.head :global(th.num),
	.head :global(td.num) {
		text-align: right;
	}
	.head :global(tbody th),
	.head :global(tbody td) {
		padding: 0.6rem 0.8rem;
		border-top: 1px solid var(--line);
		text-align: left;
		font-weight: 400;
		vertical-align: top;
	}
	.head :global(tbody tr:hover) {
		background: color-mix(in srgb, var(--accent) 10%, var(--surface));
	}
	.head :global(tbody th a) {
		text-decoration: none;
	}
	.head :global(tbody th a:hover) {
		text-decoration: underline;
	}
	.head :global(tbody th code) {
		white-space: nowrap;
		font-size: 0.82rem;
		font-weight: 600;
	}
	.head :global(td.num) {
		font-family: var(--mono);
		font-size: 0.8rem;
		white-space: nowrap;
	}
	.head :global(td.strong) {
		font-weight: 700;
	}
	.head :global(td.strong.muted) {
		font-weight: 400;
	}
	.head :global(td small) {
		margin-left: 0.25em;
		color: var(--muted);
		font-size: 0.68rem;
	}
	.head :global(td.task) {
		color: var(--muted);
		white-space: nowrap;
	}
	.head :global(td.lic) {
		color: var(--muted);
		font-size: 0.78rem;
		min-width: 260px;
	}
	.head :global(.badge) {
		display: inline-block;
		margin-right: 0.4rem;
		padding: 0.15rem 0.4rem;
		border: 1px solid var(--line);
		border-radius: 3px;
		color: var(--muted);
		font: 600 0.64rem/1.3 var(--mono);
	}
	.head :global(.badge.yes) {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-ink);
	}
	.head :global(.empty) {
		padding: 2rem;
		color: var(--muted);
		text-align: center;
	}
	.head :global(.note) {
		margin: 0.8rem 0 0;
		color: var(--muted);
		font: 500 0.72rem/1.5 var(--mono);
	}
</style>
