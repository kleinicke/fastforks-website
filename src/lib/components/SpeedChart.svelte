<script lang="ts">
	import { data, DEVICES, REFERENCE, TASK_META, TASK_ORDER, fmtMs, timings, type Timing } from '#lib/site.ts';

	const LIMIT = 8;
	let deviceSlug = $state(REFERENCE.slug);
	let picked = $state('stereo');

	const device = $derived(DEVICES.find((d) => d.slug === deviceSlug)!);
	const taskIds = $derived(TASK_ORDER.filter((id) => device.tasks.includes(id)));
	// A device without the picked task shows its first one; switching back restores the pick.
	const selected = $derived(taskIds.includes(picked) ? picked : taskIds[0]);
	const task = $derived(data.tasks.find((t) => t.id === selected)!);
	const all = $derived(timings(device, task));
	const best = (m: Timing) => m.kernels_ms ?? m.portable_ms;
	// Checkpoints of one network time the same: show the network once, with the number of further checkpoints.
	const rows = $derived.by(() => {
		const seen = new Map<string, { m: Timing; more: number }>();
		for (const m of all.filter((m) => best(m) !== null).sort((a, b) => (best(a) ?? 0) - (best(b) ?? 0))) {
			const key = `${m.doc}|${m.original_ms}|${m.portable_ms}|${m.kernels_ms}`;
			const hit = seen.get(key);
			if (hit) hit.more++;
			else seen.set(key, { m, more: 0 });
		}
		return [...seen.values()].slice(0, LIMIT);
	});
	const kinds = $derived(device.reference ? (['original', 'portable', 'kernels'] as const) : (['portable', 'kernels'] as const));
	const bars = (m: Timing) => {
		const max = Math.max(m.original_ms ?? 0, m.portable_ms ?? 0, m.kernels_ms ?? 0);
		const w = (v: number | null) => (v === null ? 0 : Math.max(1.5, (v / max) * 100));
		const label = (v: number | null, why: string | null) =>
			v === null ? (why && why !== 'not tested' ? why : 'not timed') : `${fmtMs(v)} ms`;
		const cell = {
			original: { ms: m.original_ms, text: label(m.original_ms, m.original_note) },
			portable: { ms: m.portable_ms, text: label(m.portable_ms, m.portable_note) },
			kernels: { ms: m.kernels_ms, text: label(m.kernels_ms, m.kernels_note) }
		};
		return kinds.map((kind) => ({ kind, text: cell[kind].text, w: w(cell[kind].ms) }));
	};
	const isDtype = (n: string | null) => n === 'fp16' || n === 'fp32' || n === 'bf16';
	/** Survey devices: the dtype of each shown time, once if both modes ran in the same one. */
	const dtypes = (m: Timing) => {
		if (device.reference) return '';
		const p = isDtype(m.portable_note) ? m.portable_note : null;
		const k = isDtype(m.kernels_note) ? m.kernels_note : null;
		if (p && k) return p === k ? p : `portable ${p} · kernels ${k}`;
		return p ? `portable ${p}` : k ? `kernels ${k}` : '';
	};
	const tabId = (id: string) => `speed-tab-${id}`;
</script>

<div class="chart">
	<div class="devices" role="radiogroup" aria-label="Device">
		{#each DEVICES as d (d.slug)}
			<button type="button" role="radio" aria-checked={deviceSlug === d.slug} onclick={() => (deviceSlug = d.slug)}>
				{d.name}{#if d.reference}<small> reference</small>{:else if d.tasks.length < TASK_ORDER.length}<small>
						{d.tasks.length === 1 ? TASK_META[d.tasks[0]].name.toLowerCase() : `${d.tasks.length} tasks`}</small
					>{/if}
			</button>
		{/each}
	</div>
	<div class="tabs" role="tablist" aria-label="Task">
		{#each taskIds as id (id)}
			<button
				id={tabId(id)}
				role="tab"
				aria-selected={selected === id}
				aria-controls="speed-panel"
				tabindex={selected === id ? 0 : -1}
				onclick={() => (picked = id)}
				onkeydown={(e) => {
					const i = taskIds.indexOf(selected);
					if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
						const next = taskIds[(i + (e.key === 'ArrowRight' ? 1 : -1) + taskIds.length) % taskIds.length];
						picked = next;
						document.getElementById(tabId(next))?.focus();
					}
				}}>{TASK_META[id].name}</button
			>
		{/each}
	</div>

	<div id="speed-panel" role="tabpanel" aria-labelledby={tabId(selected)} class="panel">
		<div class="meta">
			<span
				>{all.length} models{device.reference ? '' : ' measured'} · input {task.input} · fastest {rows.length}</span
			>
			<span class="legend" aria-hidden="true">
				{#each kinds as k (k)}<i class={k}></i>{k} {/each}
			</span>
		</div>
		<ol class="rows">
			{#each rows as { m, more } (m.id)}
				<li>
					<div class="name">
						<a href={m.doc}><code>{m.id}</code></a>
						{#if m.speedup !== null}
							<span class="gain" title="kernels against {m.speedup_vs === 'original' ? 'the original code' : 'portable'}"
								>{m.speedup.toFixed(1)}× <small>vs {m.speedup_vs}</small></span
							>
						{/if}
						{#if more}<small class="dt">+{more} checkpoint{more > 1 ? 's' : ''}, same time</small>{/if}
						{#if dtypes(m)}<small class="dt">{dtypes(m)}</small>{/if}
					</div>
					<dl class="bars">
						{#each bars(m) as b (b.kind)}
							<dt class="sr-only">{b.kind}</dt>
							<dd class={b.kind}>
								<span class="bar" style:width="{b.w}%"></span>
								<span class="v">{b.text}</span>
							</dd>
						{/each}
					</dl>
				</li>
			{/each}
		</ol>
		<p class="foot">
			{device.name}{device.details ? ` (${device.details})` : ''} · median of warm runs
			{#if device.reference}
				· every release is checked against these times
			{:else}
				· a survey on {device.measured?.to}, fastest passing dtype per mode, no original timed here ·
				<a href={device.page}>device page</a>
			{/if}
		</p>
		<a class="button more" href="/models?task={selected}{device.reference ? '' : `&device=${device.slug}`}"
			>All {all.length} {TASK_META[selected].name.toLowerCase()} models in the table →</a
		>
	</div>
</div>

<style>
	.chart {
		border: 1px solid var(--line);
		background: var(--surface);
		border-radius: 8px;
		overflow: hidden;
	}
	.devices {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		padding: 0.9rem clamp(1rem, 3vw, 1.75rem);
		border-bottom: 1px solid var(--line);
	}
	.devices button {
		min-height: 34px;
		padding: 0 0.8rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface);
		color: var(--muted);
		font: 600 0.78rem/1 var(--sans);
		cursor: pointer;
		white-space: nowrap;
	}
	.devices button:hover {
		color: var(--ink);
		border-color: var(--strong-line);
	}
	.devices button[aria-checked='true'] {
		background: var(--ink);
		border-color: var(--ink);
		color: var(--bg);
	}
	.devices small {
		margin-left: 0.4em;
		font-weight: 500;
		opacity: 0.7;
	}
	.dt {
		color: var(--muted);
		font: 500 0.66rem/1 var(--mono);
	}
	.tabs {
		display: flex;
		overflow-x: auto;
		border-bottom: 1px solid var(--line);
		scrollbar-width: thin;
	}
	.tabs button {
		flex: none;
		padding: 0.9rem 1rem;
		border: 0;
		border-bottom: 2px solid transparent;
		background: none;
		color: var(--muted);
		font: 600 0.82rem/1 var(--sans);
		cursor: pointer;
		white-space: nowrap;
	}
	.tabs button[aria-selected='true'] {
		color: var(--ink);
		border-bottom-color: var(--ink);
	}
	.tabs button:hover {
		color: var(--ink);
	}
	.panel {
		padding: clamp(1rem, 3vw, 1.75rem);
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem 1.5rem;
		margin-bottom: 1rem;
		color: var(--muted);
		font: 500 0.72rem/1.4 var(--mono);
	}
	.legend i {
		display: inline-block;
		width: 12px;
		height: 8px;
		margin: 0 0.35rem 0 0.9rem;
		vertical-align: 0;
	}
	.legend i:first-child {
		margin-left: 0;
	}
	.rows {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.rows li {
		display: grid;
		grid-template-columns: minmax(180px, 1fr) minmax(0, 2.2fr);
		gap: 0.5rem 1.5rem;
		align-items: center;
		padding: 0.85rem 0;
		border-top: 1px solid var(--line);
	}
	.name {
		display: grid;
		gap: 0.2rem;
		min-width: 0;
	}
	.name a {
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.name a:hover code {
		text-decoration: underline;
	}
	.name code {
		font-size: 0.86rem;
		font-weight: 600;
	}
	.gain {
		font: 700 0.95rem/1 var(--mono);
	}
	.gain small {
		color: var(--muted);
		font-weight: 500;
		font-size: 0.7rem;
	}
	.bars {
		display: grid;
		gap: 3px;
		margin: 0;
	}
	.bars dd {
		display: grid;
		grid-template-columns: 1fr 82px;
		align-items: center;
		gap: 0.75rem;
		margin: 0;
	}
	.bar {
		display: block;
		height: 8px;
		border-radius: 1px;
		transition: width 260ms ease;
	}
	.v {
		color: var(--muted);
		font: 500 0.72rem/1 var(--mono);
		text-align: right;
		white-space: nowrap;
	}
	.kernels .v {
		color: var(--ink);
		font-weight: 700;
	}
	.original .bar,
	i.original {
		background: var(--bar-original);
	}
	.portable .bar,
	i.portable {
		background: var(--bar-portable);
	}
	.kernels .bar,
	i.kernels {
		background: var(--bar-kernels);
	}
	.more {
		margin-top: 1.2rem;
	}
	.foot {
		margin: 0;
		padding-top: 1rem;
		border-top: 1px solid var(--line);
		color: var(--muted);
		font: 500 0.72rem/1.5 var(--mono);
	}
	@media (max-width: 680px) {
		.rows li {
			grid-template-columns: 1fr;
		}
		.name {
			grid-template-columns: 1fr auto;
			align-items: baseline;
		}
	}
</style>
