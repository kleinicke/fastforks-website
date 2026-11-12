<script lang="ts">
	// Every model of one task on its benchmarks, with the kernels time and memory on the reference GPU.
	import benchmarks from '#lib/data/benchmarks.json';
	import { fmt, METRIC_LABEL, UPCOMING } from '#lib/cards.ts';
	import EmptyRows from '#lib/components/EmptyRows.svelte';
	import { data, fmtMs, licenceOf, REFERENCE, shortName, timings } from '#lib/site.ts';

	type Metric = { key: string; format: string; optional: boolean; lower: boolean };
	type Dataset = { id: string; title: string; noun: string; overlap: string | null; metrics: Metric[]; count: number };
	type Result = { mode: 'kernels' | 'portable'; metrics: Record<string, number> };
	type Bench = { datasets: Dataset[]; results: Record<string, Record<string, Result>> };

	let {
		task,
		query,
		commercialOnly,
		upcoming,
		onupcoming
	}: { task: string; query: string; commercialOnly: boolean; upcoming: boolean; onupcoming: () => void } = $props();

	const bench = $derived((benchmarks as Record<string, Bench>)[task] ?? { datasets: [], results: {} });
	const datasets = $derived(bench.datasets);
	/** "COCO val2017, every 10th image, box mAP / mask mAP" → "COCO val2017, every 10th image": the metric is in the row below. */
	const short = (title: string) => title.split(', ').slice(0, -1).join(', ') || title;
	const colKey = (d: Dataset, m: Metric) => `${d.id}:${m.key}`;

	const all = $derived.by(() => {
		const t = data.tasks.find((x) => x.id === task);
		if (!t) return [];
		return timings(REFERENCE, t).map((m) => {
			const lic = licenceOf(m.id);
			const portable = m.kernels_ms === null;
			return {
				id: m.id,
				doc: m.doc,
				commercial: m.commercial,
				code: lic?.code ?? '',
				weights: lic?.weights ?? '',
				portable,
				ms: m.kernels_ms ?? m.portable_ms,
				mem: (portable ? m.mem?.portable?.alloc : m.mem?.kernels?.alloc) ?? null,
				results: bench.results[m.id] ?? {}
			};
		});
	});
	type Row = (typeof all)[number];

	const matching = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return all.filter(
			(r) =>
				(!commercialOnly || r.commercial === 'yes') &&
				(!q || r.id.includes(q) || r.code.toLowerCase().includes(q) || r.weights.toLowerCase().includes(q))
		);
	});
	const hiddenUpcoming = $derived(upcoming ? 0 : matching.filter((r) => UPCOMING.has(r.id)).length);

	// Sorting: by default the first benchmark's main metric, best first. A click sorts by that column, for this task only.
	let picked = $state<{ task: string; key: string; ascending: boolean } | null>(null);
	const first = $derived(datasets[0] ? { d: datasets[0], m: datasets[0].metrics[0] } : null);
	const sort = $derived(
		picked?.task === task
			? picked
			: first
				? { task, key: colKey(first.d, first.m), ascending: first.m.lower }
				: { task, key: 'ms', ascending: true }
	);
	const lowerIsBetter = (key: string) => {
		if (key === 'ms' || key === 'mem') return true;
		const [d, m] = key.split(':');
		return datasets.find((x) => x.id === d)?.metrics.find((x) => x.key === m)?.lower ?? false;
	};
	function sortBy(key: string) {
		picked =
			sort.key === key ? { task, key, ascending: !sort.ascending } : { task, key, ascending: lowerIsBetter(key) };
	}
	function value(r: Row, key: string): number | string | null {
		if (key === 'id') return r.id;
		if (key === 'ms') return r.ms;
		if (key === 'mem') return r.mem;
		const [d, m] = key.split(':');
		return r.results[d]?.metrics[m] ?? null;
	}
	const rows = $derived.by(() => {
		const dir = sort.ascending ? 1 : -1;
		return matching
			.filter((r) => upcoming || !UPCOMING.has(r.id))
			.sort((a, b) => {
				const x = value(a, sort.key);
				const y = value(b, sort.key);
				if (x === null) return y === null ? a.id.localeCompare(b.id) : 1;
				if (y === null) return -1;
				return (typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number)) * dir;
			});
	});
	/** The best value of each metric column among the rows shown, set in bold. */
	const best = $derived.by(() => {
		const out = new Map<string, number>();
		for (const d of datasets)
			for (const m of d.metrics) {
				const xs = rows.map((r) => r.results[d.id]?.metrics[m.key]).filter((x) => x !== undefined);
				if (xs.length > 1) out.set(colKey(d, m), m.lower ? Math.min(...xs) : Math.max(...xs));
			}
		return out;
	});
	const arrow = (key: string) => (sort.key === key ? (sort.ascending ? ' ↑' : ' ↓') : '');
	const ariaSort = (key: string) => (sort.key === key ? (sort.ascending ? 'ascending' : 'descending') : 'none');
	const columns = $derived(3 + datasets.reduce((n, d) => n + d.metrics.length, 0));
</script>

<div class="table">
	<table>
		<thead>
			<tr class="groups">
				<th scope="colgroup"></th>
				<th scope="colgroup" colspan="2" class="grp">Kernels on the {shortName(REFERENCE)}</th>
				{#each datasets as d (d.id)}
					<th scope="colgroup" colspan={d.metrics.length} class="grp" title={d.title}
						>{short(d.title)}{#if d.overlap === 'train'}<sup title="Trained on this dataset's public images: not zero-shot">†</sup
							>{:else if d.overlap === 'unknown'}<sup title="Training data not stated: possibly seen">?</sup>{/if}</th
					>
				{/each}
			</tr>
			<tr>
				{#snippet sortable(key: string, text: string, num: boolean, first = false, hint = '')}
					<th scope="col" class:num class:first aria-sort={ariaSort(key)}>
						<button type="button" onclick={() => sortBy(key)} title={hint || undefined}>
							{text}<span aria-hidden="true">{arrow(key)}</span>
						</button>
					</th>
				{/snippet}
				{@render sortable('id', 'Model', false)}
				{@render sortable('ms', 'Time (ms)', true, true)}
				{@render sortable('mem', 'Memory (MiB)', true)}
				{#each datasets as d (d.id)}
					{#each d.metrics as m, i (m.key)}
						{@render sortable(
							colKey(d, m),
							METRIC_LABEL[m.key] ?? m.key,
							true,
							i === 0,
							m.lower ? 'Lower is better' : 'Higher is better'
						)}
					{/each}
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as r (r.id)}
				<tr class:upcoming={UPCOMING.has(r.id)}>
					<th scope="row"
						><a href={r.doc}><code>{r.id}</code></a>{#if UPCOMING.has(r.id)}<span class="soon">upcoming</span>{/if}</th
					>
					<td class="num first strong">{fmtMs(r.ms)}{#if r.portable && r.ms !== null}<small>portable</small>{/if}</td>
					<td class="num">{r.mem ?? '–'}</td>
					{#each datasets as d (d.id)}
						{@const res = r.results[d.id]}
						{#each d.metrics as m, i (m.key)}
							{@const v = res?.metrics[m.key]}
							<td class="num" class:first={i === 0} class:muted={v === undefined} class:strong={v !== undefined && v === best.get(colKey(d, m))}
								>{fmt(m.format, v)}{#if v !== undefined && res.mode === 'portable' && i === 0}<small>portable</small>{/if}</td
							>
						{/each}
					{/each}
				</tr>
			{:else}
				<tr><td colspan={columns} class="empty"><EmptyRows hidden={hiddenUpcoming} onshow={onupcoming} /></td></tr>
			{/each}
		</tbody>
	</table>
</div>
<p class="note">
	Each model's own benchmark results, as the golden checks measured them with the kernels (<small>portable</small> where
	the model has no kernels), next to its kernels time and peak memory allocated by PyTorch on the {REFERENCE.name} at the
	task's standard input. Rows start sorted best first by the first benchmark, and a click on a metric sorts best first (hover it for whether lower or higher is better); the best of the shown rows is bold; – means not evaluated on that
	benchmark. † trained on the dataset's public images, ? training data not stated. Hover a benchmark for its full
	description; the method is on the <a href="/benchmarks">benchmarks page</a>.
</p>
