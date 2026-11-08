<script lang="ts">
	import { data, DEVICES, fmtMs, licenceOf, REFERENCE, shortName, TASK_META, timings, type Timing } from '#lib/site.ts';

	type Key = 'rank' | 'id' | 'task' | 'mem' | `dev:${string}`;
	let {
		task,
		query,
		commercialOnly,
		rank
	}: { task: string; query: string; commercialOnly: boolean; rank: Map<string, number> } = $props();

let relative = $state(false);
	let sortKey = $state<Key>('rank');
	let ascending = $state(true);
	let open = $state(new Set<string>());

	// Every model's timing on every device, keyed `task/id`.
	const BY_DEVICE = new Map(
		DEVICES.map((d) => [
			d.slug,
			new Map<string, Timing>(data.tasks.flatMap((t) => timings(d, t).map((m) => [`${t.id}/${m.id}`, m] as const)))
		])
	);
	/** The kernels time of a model on a device, or portable where it has no kernels (Apple), and which it is. */
	function shown(m: Timing | undefined): { ms: number; mode: 'portable' | 'kernels' } | null {
		if (!m) return null;
		const p = m.portable_ms;
		const k = m.kernels_ms;
		if (k !== null) return { ms: k, mode: 'kernels' };
		// Portable stands in only where the model has no kernels on that backend (Apple), not where kernels failed.
		return p !== null && m.kernels_note === 'portable only' ? { ms: p, mode: 'portable' } : null;
	}
	/** Why a cell is empty: kernels failed, OOM, or not measured. */
	function why(m: Timing | undefined): string {
		const n = m?.kernels_note === 'portable only' ? m.portable_note : m?.kernels_note;
		return n && !['fp16', 'fp32', 'bf16', 'not tested'].includes(n) ? n : '–';
	}
	// Only the models measured on all devices but at most one: the cross-device set of the surveys.
	const MIN_DEVICES = DEVICES.length - 1;
	const MODELS = data.tasks
		.flatMap((t) => t.models.map((m) => ({ ...m, task: t.id, key: `${t.id}/${m.id}` })))
		.filter((m) => {
			const measured = (t: Timing | undefined) => !!t && (t.portable_ms !== null || t.kernels_ms !== null);
			return DEVICES.filter((d) => measured(BY_DEVICE.get(d.slug)!.get(m.key))).length >= MIN_DEVICES;
		});

	const rows = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const out = MODELS.filter((m) => {
			if (task !== 'all' && m.task !== task) return false;
			if (commercialOnly && m.commercial !== 'yes') return false;
			if (!q) return true;
			const lic = licenceOf(m.id);
			return m.id.includes(q) || !!lic?.code.toLowerCase().includes(q) || !!lic?.weights.toLowerCase().includes(q);
		}).map((m) => {
			const cells = DEVICES.map((d) => {
				const t = BY_DEVICE.get(d.slug)!.get(m.key);
				return { slug: d.slug, t, v: shown(t) };
			});
			const ref = cells.find((c) => c.slug === REFERENCE.slug)!.v?.ms ?? null;
			const times = cells.flatMap((c) => (c.v ? [c.v.ms] : []));
			const mem = cells.find((c) => c.slug === REFERENCE.slug)!.t?.mem?.kernels?.alloc ?? null;
			return { ...m, cells, ref, mem, best: times.length > 1 ? Math.min(...times) : null };
		});
		const val = (r: (typeof out)[number]): number | string | null => {
			if (sortKey === 'rank') return rank.get(r.key) ?? Infinity;
			if (sortKey === 'id' || sortKey === 'task' || sortKey === 'mem') return r[sortKey];
			const c = r.cells.find((x) => `dev:${x.slug}` === sortKey)?.v;
			return c ? (relative && r.ref ? c.ms / r.ref : c.ms) : null;
		};
		const dir = ascending ? 1 : -1;
		return out.sort((a, b) => {
			const x = val(a);
			const y = val(b);
			if (x === null) return 1;
			if (y === null) return -1;
			return (typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number)) * dir;
		});
	});

	function sortBy(key: Key) {
		if (sortKey === key) ascending = !ascending;
		else {
			sortKey = key;
			ascending = true;
		}
	}
	function toggle(key: string) {
		const next = new Set(open);
		if (!next.delete(key)) next.add(key);
		open = next;
	}
	const arrow = (key: Key) => (sortKey === key ? (ascending ? ' ↑' : ' ↓') : '');
	const ariaSort = (key: Key) => (sortKey === key ? (ascending ? 'ascending' : 'descending') : 'none');
	/** Relative cells: how many times the reference GPU's time (below 1 = faster than it). */
	const fmtRel = (ms: number, ref: number | null) => (ref ? `${(ms / ref).toFixed(ms / ref >= 10 ? 0 : 2)}×` : fmtMs(ms));
	const cols = 4 + DEVICES.length;

	/** Bars of one model on every device: portable and kernels, on one scale. */
	function bars(cells: { slug: string; t: Timing | undefined }[]) {
		// The M1 (portable and kernels alike) would squash the GPU bars: the scale ends 10 % past the longest GPU bar,
		// and every M1 bar beyond that is cut.
		const times = (apple: boolean) =>
			cells
				.filter((c) => (DEVICES.find((x) => x.slug === c.slug)!.backend !== 'cuda') === apple)
				.flatMap((c) => [c.t?.portable_ms ?? 0, c.t?.kernels_ms ?? 0]);
		const gpu = Math.max(0, ...times(false));
		const all = Math.max(gpu, ...times(true));
		const max = gpu > 0 && all > gpu * 1.1 ? gpu * 1.1 : all;
		const w = (v: number | null | undefined) => (v == null || !max ? 0 : Math.max(1, (Math.min(v, max) / max) * 100));
		const cut = (v: number | null | undefined) => v != null && v > max;
		const ms = (v: number | null) => (v === null ? null : `${fmtMs(v)} ms`);
		return cells.map((c) => {
			const d = DEVICES.find((x) => x.slug === c.slug)!;
			const p = c.t?.portable_ms ?? null;
			const k = c.t?.kernels_ms ?? null;
			// Apple without kernels for the model: only the portable bar (no empty "kernels" bar beside it).
			if (d.backend !== 'cuda' && k === null) {
				return {
					name: shortName(d),
					one: p === null ? undefined : { mode: 'portable', w: w(p), cut: cut(p), text: `${ms(p)}, portable` },
					p: { w: 0, cut: false, text: '' },
					k: { w: 0, cut: false, text: '' },
					gain: null
				};
			}
			return {
				name: shortName(d),
				one: null,
				p: { w: w(p), cut: cut(p), text: ms(p) ?? (c.t ? (c.t.portable_note ?? '–') : 'not measured') },
				k: { w: w(k), cut: cut(k), text: ms(k) ?? (c.t ? (c.t.kernels_note ?? '–') : 'not measured') },
				gain: p !== null && k !== null ? `${(p / k).toFixed(1)}×` : null
			};
		});
	}
</script>

<div class="opts">
<label class="toggle">
		<input type="checkbox" bind:checked={relative} />
		Relative to the {shortName(REFERENCE)}
	</label>
<span class="count" aria-live="polite">{rows.length} models measured on at least {MIN_DEVICES} of {DEVICES.length} devices</span>
</div>

<div class="table">
	<table>
<thead>
			<tr class="groups">
				<th scope="colgroup" colspan="4"></th>
				<th scope="colgroup" colspan={DEVICES.length} class="grp">
					{relative ? `Time as a multiple of the ${shortName(REFERENCE)} (below 1× = faster)` : 'Time per call (ms), kernels (portable where none)'}
				</th>
			</tr>
			<tr>
				{#snippet sortable(key: Key, text: string, num: boolean, first = false)}
					<th scope="col" class:num class:first aria-sort={ariaSort(key)}>
						<button type="button" onclick={() => sortBy(key)}>
							{text}<span aria-hidden="true">{arrow(key)}</span>
						</button>
					</th>
				{/snippet}
				<th scope="col" class="exp"><span class="sr-only">Details</span></th>
				{@render sortable('id', 'Model', false)}
{@render sortable('task', 'Task', false)}
				{@render sortable('mem', 'Memory (MiB)', true)}
				{#each DEVICES as d, i (d.slug)}{@render sortable(`dev:${d.slug}`, shortName(d), true, i === 0)}{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as r (r.key)}
				{@const isOpen = open.has(r.key)}
				<tr class:open={isOpen}>
					<td class="exp">
						<button
							type="button"
							aria-expanded={isOpen}
							aria-label={`${isOpen ? 'Hide' : 'Show'} ${r.id} on every device`}
							onclick={() => toggle(r.key)}>{isOpen ? '−' : '+'}</button
						>
					</td>
					<th scope="row"><a href={r.doc}><code>{r.id}</code></a></th>
<td class="task">{TASK_META[r.task].name}</td>
					<td class="num">{r.mem ?? '–'}</td>
					{#each r.cells as c, i (c.slug)}
						<td class="num" class:first={i === 0} class:best={c.v !== null && c.v.ms === r.best} class:muted={!c.v}>
							{#if c.v}
{relative ? fmtRel(c.v.ms, r.ref) : fmtMs(c.v.ms)}
							{:else}
								{why(c.t)}
							{/if}
						</td>
					{/each}
				</tr>
				{#if isOpen}
					<tr class="detail">
						<td colspan={cols}>
							<div class="bars">
								<p class="legend">
									<span class="sw p"></span>portable <span class="sw k"></span>kernels · ms per call at {data.tasks.find(
										(t) => t.id === r.task
									)!.input}, one scale for all devices
								</p>
								{#each bars(r.cells) as b (b.name)}
									<div class="dev">
										<span class="name">{b.name}</span>
<div class="pair">
										{#if b.one !== null}
											<div class="bar">
												<i class={b.one ? (b.one.mode === 'kernels' ? 'k' : 'p') : ''} style:--w={b.one?.w ?? 0}></i>{#if b.one?.cut}<b class={b.one.mode === 'kernels' ? 'dots' : 'dots light'} aria-hidden="true"></b>{/if}<span
													>{b.one?.text ?? 'not measured'}</span
												>
											</div>
										{:else}
											<div class="bar"><i class="p" style:--w={b.p.w}></i>{#if b.p.cut}<b class="dots light" aria-hidden="true"></b>{/if}<span>{b.p.text}</span></div>
											<div class="bar"><i class="k" style:--w={b.k.w}></i>{#if b.k.cut}<b class="dots" aria-hidden="true"></b>{/if}<span>{b.k.text}</span></div>
										{/if}
									</div>
										<span class="gain">{b.gain ?? ''}</span>
									</div>
								{/each}
							</div>
						</td>
					</tr>
				{/if}
			{:else}
				<tr><td colspan={cols} class="empty">No model matches.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
<p class="note">
	One row per model, one column per device: kernels, or portable where a device has no kernels for the model (only the M1; where kernels failed the cell says so), in milliseconds per call at the task's
	standard input, with the fastest passing dtype. The fastest device of each row is highlighted; + opens the model's
	portable and kernels bars on every device, with the kernels speed-up (on the M1 only portable where it has no kernels for the model). Memory is
	the kernels peak allocated by PyTorch on the {shortName(REFERENCE)}; it is close on the other CUDA GPUs. The extra
	columns (authors' code, torch.compile, TensorRT, accuracy) are in the one-device view of the {shortName(REFERENCE)}.
</p>

<style>
	.opts {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.5rem;
		margin: 0 0 1rem;
	}
	td.best {
		background: color-mix(in srgb, var(--accent) 28%, var(--surface));
		font-weight: 700;
	}
	td.exp,
	th.exp {
		width: 2.2rem;
		padding: 0.35rem 0 0.35rem 0.5rem;
	}
	td.exp button {
		width: 1.6rem;
		height: 1.6rem;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: var(--surface);
		color: var(--ink);
		font: 600 0.9rem/1 var(--mono);
		cursor: pointer;
	}
	td.exp button:hover {
		border-color: var(--strong-line);
	}
	tr.detail td {
		padding: 0.4rem 1rem 1rem 2.7rem;
		border-top: 0;
		background: var(--bg);
	}
	tr.detail:hover {
		background: none;
	}
	/* The detail row spans the whole (scrollable) table: keep the bars in view at its left edge. */
	.bars {
		position: sticky;
		left: 2.7rem;
		max-width: min(46rem, calc(100vw - 6rem));
	}
	.legend {
		margin: 0.3rem 0 0.6rem;
		color: var(--muted);
		font: 500 0.72rem/1.4 var(--mono);
	}
	.sw {
		display: inline-block;
		width: 0.7rem;
		height: 0.7rem;
		margin: 0 0.3rem -0.08rem 0.4rem;
		border-radius: 2px;
	}
	.sw:first-child {
		margin-left: 0;
	}
	.dev {
		display: grid;
		grid-template-columns: 9.5rem 1fr 3rem;
		align-items: center;
		gap: 0.75rem;
		padding: 0.2rem 0;
	}
	.name {
		font-size: 0.8rem;
		white-space: nowrap;
	}
	.pair {
		display: grid;
		gap: 2px;
	}
	.bar {
		position: relative;
		display: flex;
		align-items: center;
		height: 1rem;
	}
	.bar i {
		/* Leave room for the label after the longest bar. */
		width: calc((100% - 7rem) * var(--w) / 100);
		height: 100%;
		border-radius: 0 2px 2px 0;
	}
	/* A cut bar: a gap, then three dots in the bar's colour. */
	.dots {
		width: 1.1rem;
		height: 0.3rem;
		margin-left: 0.2rem;
		background: radial-gradient(circle, var(--ink) 40%, transparent 45%) 0 50% / 0.37rem 0.3rem repeat-x;
	}
	.dots.light {
		background-image: radial-gradient(
			circle,
			color-mix(in srgb, var(--ink) 28%, var(--surface)) 40%,
			transparent 45%
		);
	}
	.bar span {
		margin-left: 0.4rem;
		color: var(--muted);
		font: 500 0.68rem/1 var(--mono);
		white-space: nowrap;
	}
	.p,
	.sw.p {
		background: color-mix(in srgb, var(--ink) 28%, var(--surface));
	}
	.k,
	.sw.k {
		background: var(--ink);
	}
	.gain {
		font: 700 0.75rem/1 var(--mono);
		text-align: right;
	}
	@media (max-width: 640px) {
		.dev {
			grid-template-columns: 6.5rem 1fr 2.6rem;
		}
	}
</style>
