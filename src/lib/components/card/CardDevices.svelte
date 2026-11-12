<script lang="ts">
	import { dt, mib, ms, type DeviceRows } from '#lib/cards.ts';

	let { devices }: { devices: DeviceRows[] } = $props();

	const MODE: Record<string, string> = { portable: 'Portable', kernels: 'Kernels', upstream: 'Original', 'upstream-default': 'Original fp32' };
	const golden = (g: string | null) => (g === 'pass' ? 'matches' : g === 'fail' ? 'differs' : g ? g : '–');
</script>

{#if !devices.length}
	<p class="missing">Not measured on other devices yet.</p>
{:else}
	<div class="table">
		<table>
			<thead>
				<tr>
					<th>Device</th>
					<th>Backend</th>
					<th>dtype</th>
					<th class="num">ms / call</th>
					<th class="num">Peak memory</th>
					<th>Output vs reference</th>
					<th>Input</th>
				</tr>
			</thead>
			<tbody>
				{#each devices as d (d.slug)}
					{#each d.rows as r, i (r.mode + r.dtype)}
						<tr class:first={i === 0}>
							{#if i === 0}
								<th scope="rowgroup" rowspan={d.rows.length}>
									<a href="/devices/{d.slug}">{d.name}</a>
									<small>{d.backend.toUpperCase()}, torch {d.torch}, {d.date}</small>
								</th>
							{/if}
							<td>{MODE[r.mode] ?? r.mode}</td>
							<td>{dt(r.dtype)}</td>
							{#if r.status !== 'ok'}
								<td class="num" colspan="2"><span class="tag">{r.status === 'oom' ? 'out of memory' : r.error ? `fails: ${r.error.slice(0, 80)}` : r.status}</span></td>
							{:else}
								<td class="num">{ms(r.ms)}</td>
								<td class="num">
									{#if r.memory_kind === 'process-footprint'}{mib(r.footprint)} <small>process</small>{:else}{mib(r.alloc)}{#if r.reserved}<span class="sep"> / </span>{mib(r.reserved)}{/if}{/if}
								</td>
							{/if}
							<td><span class={['golden', r.golden]}>{golden(r.golden)}</span></td>
							<td>{r.input ?? '–'}</td>
						</tr>
					{/each}
				{/each}
			</tbody>
		</table>
	</div>
	<p class="fine">
		CUDA memory is torch’s peak allocated / reserved; Apple has no such counter, so the Mac rows show the process
		footprint (weights, Python and torch included). “Output vs reference” compares the device’s output with the
		stored golden output under the card’s tolerance; – = not checked on that device.
	</p>
{/if}

<style>
	th[scope='rowgroup'] {
		color: var(--ink);
		font: 600 0.84rem/1.3 var(--sans);
		letter-spacing: 0;
		text-transform: none;
		vertical-align: top;
		border-top: 1px solid var(--line);
	}
	th small {
		display: block;
		margin-top: 0.15rem;
		color: var(--muted);
		font-weight: 400;
		font-size: 0.72rem;
	}
	.golden.pass {
		font-weight: 600;
	}
	.golden.fail {
		color: #c2412d;
		font-weight: 600;
	}
	.tag,
	small,
	.sep {
		color: var(--muted);
	}
	.tag {
		font-style: italic;
		font-size: 0.78rem;
	}
	.missing {
		color: var(--muted);
	}
</style>
