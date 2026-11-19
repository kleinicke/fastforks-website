<script lang="ts">
	import { METRIC_LABEL, MODES, dt, fmt, ms, type Card, type Dataset, type EvalMode, type EvalRow } from '#lib/cards.ts';

	let { card, variantId, datasets }: { card: Card; variantId: string; datasets: Dataset[] } = $props();

	const OPTIONAL = [
		{ key: 'originalhalf', label: 'Original .half()' },
		{ key: 'originalcpu', label: 'Original CPU' },
		{ key: 'compile', label: 'Portable + torch.compile' },
		{ key: 'tensorrt', label: 'TensorRT' }
	] as const;
	const SHOWN: { key: EvalMode; label: string }[] = [
		...MODES,
		...OPTIONAL
	];
	const ORIGINAL = ['original32', 'original16', 'originalhalf', 'originalcpu'] as const;

	const label = (k: string) => METRIC_LABEL[k] ?? k;
	function runLabel(mode: (typeof SHOWN)[number], d: Dataset): string {
		const dtype = d.modes[mode.key]?.dtype;
		if (mode.key === 'original16' && dtype) return `Original ${dt(dtype)}`;
		if (mode.key === 'originalhalf' && dtype === 'bfloat16') return `Original ${dt(dtype)}`;
		return mode.label;
	}
	const rowsOf = (d: Dataset) =>
		SHOWN.filter((m) => d.modes[m.key] || MODES.some((common) => common.key === m.key)).map((m) => ({
			key: m.key,
			label: runLabel(m, d),
			row: d.modes[m.key]
		}));
	const metricsOf = (d: Dataset) => d.metrics.filter((m) => !m.optional || Object.values(d.modes).some((r) => r && m.key in r.metrics));

	function notesOf(d: Dataset) {
		const byText = new Map<string, string[]>();
		for (const { label, row } of rowsOf(d)) {
			if (row?.note) byText.set(row.note, [...(byText.get(row.note) ?? []), label]);
		}
		return [...byText];
	}

	/** Difference from the best available original baseline, in the metric's own units. */
	function deviation(d: Dataset) {
		const main = d.metrics[0];
		const key = ORIGINAL.find((k) => {
			const row = d.modes[k];
			return row && !row.error && row.metrics[main.key] !== undefined;
		});
		const baseline = SHOWN.find((m) => m.key === key);
		if (!baseline) return null;
		const ref = d.modes[baseline.key]?.metrics[main.key];
		if (ref === undefined) return null;
		const items = SHOWN.filter((m) => m.key !== baseline.key)
			.map((m) => {
				const r = d.modes[m.key];
				const v = r?.metrics[main.key];
				return v === undefined || r?.error ? null : { key: m.key, delta: main.lower ? ref - v : v - ref };
			})
			.filter((x) => x !== null);
		return { main, key: baseline.key, label: runLabel(baseline, d).toLowerCase(), items };
	}

	const where = (r: EvalRow) => `${r.gpu}, torch ${r.torch}${r.commit ? `, fastforks ${r.commit}` : ''}, ${r.date}`;
	function wheres(d: Dataset) {
		const by = new Map<string, string[]>();
		for (const m of SHOWN) {
			const r = d.modes[m.key];
			if (!r) continue;
			const w = m.key.startsWith('original') ? `${r.gpu}, torch ${r.torch}, ${r.date}` : where(r);
			by.set(w, [...(by.get(w) ?? []), runLabel(m, d).toLowerCase()]);
		}
		return [...by].map(([w, modes]) => (by.size > 1 ? `${modes.join(', ')}: ${w}` : w));
	}
	const signed = (x: number, f: string) => `${x > 0 ? '+' : x < 0 ? '−' : '±'}${fmt(f, Math.abs(x))}`;
</script>

{#if !datasets.length}
	<p class="missing">Accuracy not measured for <code>{variantId}</code>.</p>
{/if}

{#each datasets as d (d.id)}
	{@const ms_ = metricsOf(d)}
	{@const dev = deviation(d)}
	<div class="dataset">
		<h3>{d.title.split(',')[0]}</h3>
		<p class="sub">
			{d.title.split(',').slice(1).join(',').trim()}{#if d.overlap === 'train'}<span class="flag">trained on this dataset’s public images: not zero-shot</span>{:else if d.overlap === 'unknown'}<span class="flag">training data not stated: possibly seen</span>{/if}
		</p>

		<div class="table">
			<table>
				<thead>
					<tr>
						<th>Run</th>
						<th>dtype</th>
						{#each ms_ as m (m.key)}<th class="num">{label(m.key)} <small>{m.lower ? '↓' : '↑'}</small></th>{/each}
						{#if dev}<th class="num">Δ {label(dev.main.key)} vs {dev.label}</th>{/if}
						<th class="num">{d.noun}</th>
						<th class="num">ms / {d.noun.replace(/s$/, '')}</th>
					</tr>
				</thead>
				<tbody>
					{#each rowsOf(d) as m (m.key)}
						{@const r = m.row}
						<tr class={[m.key.startsWith('original') ? 'original' : 'ours', !r && 'dim']}>
							<th scope="row">{m.label}</th>
							<td>{r ? dt(r.dtype) : ''}</td>
							{#if !r}
								<td colspan={ms_.length + (dev ? 1 : 0) + 2}><span class="tag">not measured</span></td>
							{:else if r.error && !r.error.startsWith('non-finite')}
								<td colspan={ms_.length + (dev ? 1 : 0) + 2}><span class="tag">{r.error.startsWith('OOM') ? 'out of memory' : `fails: ${r.error.split(': ').slice(1, 3).join(': ')}`}</span></td>
							{:else}
								{#each ms_ as mt (mt.key)}<td class="num">{fmt(mt.format, r.metrics[mt.key])}</td>{/each}
								{#if dev}
									{@const it = dev.items.find((i) => i.key === m.key)}
									<td class="num delta">{m.key === dev.key ? 'reference' : it ? signed(it.delta, dev.main.format) : '–'}</td>
								{/if}
								<td class="num">{r.n ?? '–'}{#if r.error}<small class="note">NaN / inf output</small>{/if}</td>
								<td class="num">{ms(r.ms_per_img)}</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#each notesOf(d) as [note, modes] (note)}
			<p class="fine run-note"><strong>{modes.join(' and ')}</strong> {note}</p>
		{/each}
		<p class="fine">
			{#if d.protocol}{d.protocol}{/if}
			{#if ORIGINAL.some((key) => d.modes[key])}Original = <a href={card.upstream} rel="noopener">the authors’ code</a
				>{#if card.original_is}{' '}({card.original_is}){/if}, same checkpoint and protocol.{/if}
			Measured on {wheres(d).join('; ')}.
		</p>
	</div>
{/each}

<style>
	.dataset + .dataset {
		margin-top: 2.2rem;
	}
	h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 650;
	}
	.sub {
		margin: 0.15rem 0 0.8rem;
		color: var(--muted);
		font-size: 0.88rem;
	}
	.flag {
		display: inline-block;
		margin-left: 0.5rem;
		padding: 0 0.4rem;
		border: 1px solid var(--line);
		font-size: 0.75rem;
		color: var(--ink);
	}
	.run-note {
		margin-block: 0.35rem;
	}
	tr.dim th,
	tr.dim td {
		color: var(--muted);
	}
	tr.original th {
		font-weight: 500;
	}
	.tag {
		font-size: 0.78rem;
		color: var(--muted);
		font-style: italic;
	}
	.delta {
		white-space: nowrap;
	}
	.note {
		display: block;
		color: #c2412d;
		font-size: 0.72rem;
	}
	.missing {
		color: var(--muted);
	}
</style>
