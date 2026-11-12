<script lang="ts">
	import { MODES, dt, mib, ms, type SpeedInput, type Variant } from '#lib/cards.ts';

	let {
		variant,
		variants,
		reference,
		onpick
	}: { variant: Variant; variants: Variant[]; reference: string; onpick: (id: string) => void } = $props();

	const inputs = $derived(variant.speed.inputs);
	let picked = $state<string | null>(null);
	const current = $derived(
		inputs.find((s) => s.input === picked) ?? inputs.find((s) => s.standard) ?? inputs.at(-1) ?? null
	);

	type Line = {
		key: string;
		label: string;
		dtype: string;
		ms: number | null;
		alloc: number | null | undefined;
		reserved: number | null | undefined;
		load: number | undefined;
		first: number | undefined;
		state: 'ok' | 'oom' | 'missing' | 'fails';
		note: string;
		/** A short qualifier after the memory value (TensorRT: what the number covers). */
		memNote?: string;
		kind: 'original' | 'ours' | 'extra' | 'network';
		see?: { variant: Variant; input: string } | null;
	};

	/** Where torch.compile / TensorRT was run, when not for this variant and input: this variant first, its standard input first. */
	function measuredAt(key: 'compile' | 'tensorrt', s: SpeedInput) {
		for (const v of [variant, ...variants.filter((x) => x !== variant)]) {
			const ins = [...v.speed.inputs].sort((a, b) => Number(b.standard) - Number(a.standard));
			const hit = ins.find((i) => i[key] && !(v === variant && i === s));
			if (hit) return { variant: v, input: hit.input };
		}
		return null;
	}
	function go(to: { variant: Variant; input: string }) {
		picked = to.input;
		if (to.variant !== variant) onpick(to.variant.id);
	}

	function lines(s: SpeedInput): Line[] {
		const out: Line[] = MODES.map((m) => {
			const r = s.modes[m.key];
			return {
				key: m.key,
				label: m.label,
				dtype: r ? dt(r.dtype) : m.key.endsWith('32') ? 'fp32' : m.key === 'original16' ? 'fp16' : '',
				ms: r?.ms ?? null,
				alloc: r?.peak_alloc_mb,
				reserved: r?.peak_reserved_mb,
				load: r?.load_s,
				first: r?.first_call_s,
				state: r ? 'ok' : s.oom.includes(m.key) ? 'oom' : 'missing',
				note: r?.note ?? '',
				kind: m.group
			};
		});
		// The two original rows: the label says fp32 / fp16; an original whose fp16 option is missing ran fp32.
		for (const l of out) if (l.key === 'original16' && l.state === 'ok' && l.dtype !== 'fp16') l.label = 'Original (own default)';
		// The original's network alone, right after the original rows: what the original costs without its crop / decode.
		const net = (['original32', 'original16'] as const).flatMap((k) => {
			const r = s.original_network?.[k];
			if (!r) return [];
			const dtype = dt(r.dtype);
			return [{ key: `${k}-net`, label: `Original ${dtype}, network only`, dtype, ms: r.ms, alloc: r.peak_alloc_mb, reserved: r.peak_reserved_mb, load: undefined, first: r.first_call_s, state: 'ok' as const, note: 'crop and decode not timed', kind: 'network' as const }];
		});
		out.splice(2, 0, ...net);
		// Pose: the original's CPU crop + decode (its call minus its network alone), and where our call spends its time.
		for (const l of out) {
			const n = l.key === 'original32' || l.key === 'original16' ? s.original_network?.[l.key] : undefined;
			if (n && l.ms !== null && l.ms > n.ms) l.note = join(l.note, `≈ ${ms(l.ms - n.ms)} ms of it CPU crop + decode`);
			const p = l.key === 'portable' || l.key === 'kernels' ? s.sections?.[l.key] : undefined;
			if (p && l.state === 'ok') {
				const net = p.network_has_decode ? 'network + decode' : 'network';
				const rest = p.network_has_decode ? 'map back' : 'decode + map back';
				l.note = join(l.note, `GPU crop ${ms(p.crop_ms)} · ${net} ${ms(p.network_ms)} · ${rest} ${ms(p.rest_ms)} ms`);
			}
		}
		for (const [key, label] of [
			['compile', 'Portable + torch.compile'],
			['tensorrt', 'TensorRT']
		] as const) {
			const r = s[key];
			if (!r) {
				out.push({ key, label, dtype: '', ms: null, alloc: undefined, reserved: undefined, load: undefined, first: undefined, state: 'missing', note: '', kind: 'extra', see: measuredAt(key, s) });
			} else if ('fails' in r) {
				out.push({ key, label, dtype: '', ms: null, alloc: undefined, reserved: undefined, load: undefined, first: undefined, state: 'fails', note: r.fails, kind: 'extra' });
			} else {
				out.push({
					key,
					label: key === 'tensorrt' ? `TensorRT ${dt(r.engine_dtype) || 'fp16'}` : label,
					dtype: key === 'tensorrt' ? dt(r.engine_dtype) || 'fp16' : '',
					ms: r.ms,
					alloc: key === 'tensorrt' ? r.device_mb : r.peak_alloc_mb,
					reserved: key === 'tensorrt' ? null : r.peak_reserved_mb,
					load: r.setup_s ?? undefined,
					first: undefined,
					state: 'ok',
					note: r.part ? (r.part.endsWith(' only') ? r.part : `${r.part} only`) : '',
					memNote: key === 'tensorrt' && r.device_mb ? 'engine' : undefined,
					kind: 'extra'
				});
				// The engine is the network on crops only: with our portable crop and decode around it, a whole call.
				const p = s.sections?.portable;
				if (key === 'tensorrt' && p) {
					out.push({
						key: 'tensorrt-full',
						label: 'TensorRT + our crop and decode',
						dtype: dt(r.engine_dtype) || 'fp16',
						ms: r.ms + p.crop_ms + p.rest_ms,
						alloc: undefined,
						reserved: null,
						load: undefined,
						first: undefined,
						state: 'ok',
						note: `estimate: engine ${ms(r.ms)} + portable GPU crop ${ms(p.crop_ms)} + decode ${ms(p.rest_ms)} ms`,
						kind: 'extra'
					});
				}
			}
		}
		return out;
	}
	const join = (a: string, b: string) => (a ? `${a}; ${b}` : b);

	const rows = $derived(current ? lines(current) : []);
	const slowest = $derived(Math.max(...rows.map((r) => r.ms ?? 0), 1));
	const base = $derived(current?.modes.original32 ?? current?.modes.original16 ?? null);
	const baseLabel = $derived(current?.modes.original32 ? 'original fp32' : 'original');
	const when = $derived.by(() => {
		if (!current) return '';
		const r = Object.values(current.modes);
		const dates = r.map((x) => x?.date ?? '').filter(Boolean).sort();
		const torch = [...new Set(r.map((x) => x?.torch).filter(Boolean))].join(', ');
		return `${reference}, torch ${torch}, ${dates[0] === dates.at(-1) ? dates[0] : `${dates[0]} to ${dates.at(-1)}`}`;
	});
	const protocol = $derived(current?.modes.kernels?.protocol ?? current?.modes.portable?.protocol ?? '');
</script>

{#if !current}
	<p class="missing">Speed and memory not measured for <code>{variant.id}</code>.</p>
{:else}
	{#if inputs.length > 1}
		<div class="inputs" role="group" aria-label="Input size">
			{#each inputs as s (s.input)}
				<button type="button" aria-pressed={s === current} onclick={() => (picked = s.input)}>
					{s.scene ? `${s.scene} · ` : ''}{s.input}{#if s.standard}<small>standard</small>{/if}
				</button>
			{/each}
		</div>
	{:else}
		<p class="input">Input: {current.scene ? `${current.scene}, ` : ''}{current.input}{current.standard ? ' (the task’s standard size)' : ''}</p>
	{/if}

	<div class="table">
		<table>
			<thead>
				<tr>
					<th>Backend</th>
					<th>dtype</th>
					<th class="bar-col">Time per call (ms)</th>
					<th class="num">vs {baseLabel}</th>
					<th class="num">Peak memory<br /><small>allocated / reserved</small></th>
					<th class="num">Load (s)</th>
					<th class="num">First call (s)</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as r (r.key)}
					<tr class={[r.kind, r.state !== 'ok' && 'dim']}>
						<th scope="row">{r.label}{#if r.note}<small class="note">{r.note}</small>{/if}</th>
						<td>{r.dtype}</td>
						<td class="bar-col">
							{#if r.state === 'ok' && r.ms !== null}
								<span class="bar"><span class={['fill', r.kind, r.key]} style:width="{(100 * r.ms) / slowest}%"></span></span>
								<span class="v">{ms(r.ms)}</span>
							{:else if r.state === 'oom'}
								<span class="tag">out of memory</span>
							{:else if r.state === 'fails'}
								<span class="tag">fails</span>
							{:else}
								<span class="tag">not measured{r.see ? ' here' : ''}</span>
								{#if r.see}
									<button type="button" class="see" onclick={() => go(r.see!)}
										>see {r.see.variant === variant ? '' : `${r.see.variant.name}, `}{r.see.input} →</button
									>
								{/if}
							{/if}
						</td>
						<td class="num">
							{#if base && r.ms !== null && r.key !== 'original32'}
								{@const x = base.ms / r.ms}
								<span class:fast={x > 1.05} class:slow={x < 0.95}>{x >= 10 ? x.toFixed(0) : x.toFixed(x >= 1 ? 1 : 2)}×</span>
							{:else}–{/if}
						</td>
						<td class="num">{#if r.state === 'ok'}{mib(r.alloc)}{#if r.reserved !== null && r.reserved !== undefined}<span class="sep"> / </span>{mib(r.reserved)}{/if}{#if r.memNote}<small
									class="memnote"
									title="The GPU memory the TensorRT engine took, measured from the driver outside PyTorch: measured differently from the PyTorch peaks of the other rows, so not comparable to them"
									><span class="engine">{r.memNote}</span><span class="apart">not comparable</span></small
								>{/if}{:else}–{/if}</td>
						<td class="num">{r.load !== undefined ? (r.kind === 'extra' ? `${r.load.toFixed(0)} (build)` : r.load.toFixed(1)) : '–'}</td>
						<td class="num">{r.first !== undefined ? r.first.toFixed(2) : '–'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="fine">
		Measured on {when}. {protocol ? `${protocol[0].toUpperCase()}${protocol.slice(1)}.` : ''} Ratios divide two
		times of this table (same GPU, same input). Original fp16 is the authors’ own precision option, else
		<code>torch.autocast</code>.
		{#if current.original_network}“Network only” times the original’s network on the same crops, batched as one call; the
			original rows above also include its own crop pipeline and decode, as ours do.{/if}
		{#if current.sections}The splits under Portable and Kernels come from a separate run that times each step on its own
			(synchronised in between); the TensorRT engine covers the network only, so its full call is an estimate with
			our crop and decode added.{/if} torch.compile and TensorRT: build time instead of load time. TensorRT memory (<small>engine, not comparable</small>) is the GPU memory the engine took, read from the driver because TensorRT allocates outside PyTorch, so it can't be compared with the PyTorch peaks of the other rows.
	</p>
{/if}

<style>
	.inputs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0 0 1rem;
	}
	.inputs button {
		padding: 0.4rem 0.7rem;
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--ink);
		font: 500 0.82rem/1.2 var(--mono);
		cursor: pointer;
	}
	.inputs button[aria-pressed='true'] {
		border-color: var(--strong-line);
		box-shadow: inset 0 -2px 0 var(--strong-line);
	}
	.inputs small,
	.input {
		color: var(--muted);
	}
	.inputs small {
		margin-left: 0.4rem;
	}
	.input {
		margin: 0 0 0.8rem;
		font-size: 0.9rem;
	}
	.bar-col {
		min-width: 220px;
	}
	td.bar-col {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.bar {
		flex: 1;
		height: 10px;
		background: color-mix(in srgb, var(--line) 45%, transparent);
	}
	.fill {
		display: block;
		height: 100%;
	}
	.fill.original {
		background: var(--bar-original);
	}
	.fill.network {
		background: var(--bar-original);
		opacity: 0.5;
	}
	tr.network th {
		font-weight: 500;
	}
	.fill.ours {
		background: var(--bar-portable);
	}
	.fill.kernels,
	.fill.extra {
		background: var(--bar-kernels);
	}
	.fill.extra {
		opacity: 0.55;
	}
	.v {
		min-width: 4.5ch;
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-family: var(--mono);
		font-size: 0.86rem;
	}
	tr.dim th,
	tr.dim td {
		color: var(--muted);
	}
	tr.extra th {
		font-weight: 500;
	}
	.tag {
		font-size: 0.78rem;
		color: var(--muted);
		font-style: italic;
	}
	td.bar-col .tag {
		white-space: nowrap;
	}
	.fast {
		font-weight: 650;
	}
	.slow {
		color: var(--muted);
	}
	.sep {
		color: var(--muted);
	}
	.note {
		display: block;
		color: var(--muted);
		font-weight: 400;
		font-size: 0.74rem;
	}
	.memnote {
		color: var(--muted);
		font-size: 0.72rem;
	}
	.memnote .engine {
		margin-left: 0.3rem;
	}
	.memnote .apart {
		display: block;
		line-height: 1.2;
	}
	.missing {
		color: var(--muted);
	}
	.see {
		padding: 0;
		border: 0;
		background: none;
		color: var(--blue);
		font: inherit;
		font-size: 0.8rem;
		cursor: pointer;
		white-space: nowrap;
	}
	.see:hover {
		text-decoration: underline;
	}
</style>
