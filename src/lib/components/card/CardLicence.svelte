<script lang="ts">
	import { bytes, type Card, type Variant } from '#lib/cards.ts';

	let { card, variant }: { card: Card; variant: Variant } = $props();

	const l = $derived(variant.licence);
	const repo = $derived(`${card.upstream.replace(/\/$/, '')}/blob/${card.upstream_commit}`);
	/** The named datasets; the "not stated" placeholder gives way to the prose note. */
	const datasets = $derived(l.training_data.filter((t) => t.url || !t.name.startsWith('not stated')));
	/** The prose note only where no dataset is listed (else it repeats the list). */
	const trainingNote = $derived(datasets.length ? null : l.training_note || (l.training_data.length ? 'not stated by the authors' : null));
	/** "data: x (non-commercial)" notes repeat the licence the list shows per dataset. */
	const notes = $derived(l.notes.filter((n) => !n.startsWith('data: ')));
	const VERDICT ={ yes: 'Commercial use allowed', no: 'Non-commercial only', unclear: 'Commercial use unclear' };

	let copied = $state<string | null>(null);
	async function copy(sha: string) {
		try {
			await navigator.clipboard.writeText(sha);
			copied = sha;
			setTimeout(() => (copied = null), 1600);
		} catch {
			// clipboard blocked: the hash stays selectable
		}
	}
</script>

<div class="grid">
	<div class="box">
		<p class={['verdict', l.commercial]}>{VERDICT[l.commercial]}</p>
		<dl>
			<dt>Code</dt>
			<dd>
				{l.code}
				{#each card.licence_files as f (f)}<a href="{repo}/{f}" rel="noopener">{f}</a>{/each}
			</dd>
			<dt>Weights</dt>
			<dd>
				{l.weights}{#if l.weights_assumed} <small>(not stated by the authors; assumed to follow the code)</small>{/if}
				{#if l.evidence}<a href={l.evidence} rel="noopener">source</a>{/if}
			</dd>
			{#if datasets.length || trainingNote}
				<dt>Training data</dt>
				<dd>
					{#if trainingNote}{trainingNote}{/if}
					<ul>
						{#each datasets as t (t.id)}
							<li>
								{#if t.url}<a href={t.url} rel="noopener">{t.name}</a>{:else}{t.name}{/if}
								{#if t.licence}<small>{t.licence.replace('LicenseRef-', '')}{t.commercial === 'no' ? ', non-commercial' : ''}</small>{/if}
							</li>
						{/each}
					</ul>
				</dd>
			{/if}
		</dl>
		{#if l.reasons.length || notes.length || card.licence_notes.length}
			<ul class="notes">
				{#each l.reasons as r (r)}<li>{r}</li>{/each}
				{#each notes as r (r)}<li>{r}</li>{/each}
				{#each card.licence_notes as r (r)}<li>{r}</li>{/each}
			</ul>
		{/if}
		<p class="fine">Our reading of the licences, not legal advice.</p>
	</div>

	<div class="box">
		<p class="label">Weights</p>
		{#if !variant.weights.length}
			<p class="fine">No weight file: the model builds its weights from its library.</p>
		{/if}
		{#each variant.weights as w (w.name + w.sha256)}
			<div class="file">
				<div class="name">
					<code>{w.name}</code>
					<small>
						{bytes(w.size)}{#if w.member} · inside a {bytes(w.archive_size)} archive{/if}{#if w.host} · hosted on {w.host}{/if}
					</small>
				</div>
				<div class="actions">
					{#if w.url}<a class="button" href={w.url} rel="noopener nofollow">{w.member ? 'Archive' : 'Download'}</a>{/if}
					{#if w.mirror}<a class="button" href={w.mirror} rel="noopener nofollow" title="Our copy of the same file">Mirror</a>{/if}
				</div>
				<button type="button" class="sha" onclick={() => copy(w.sha256)} title="Copy SHA-256">
					<span>sha256 {w.sha256.slice(0, 16)}…</span>
					<span class="hint">{copied === w.sha256 ? 'copied' : 'copy'}</span>
				</button>
			</div>
		{/each}
		<p class="fine">
			fastforks downloads and checks these files on first use (<code>fastforks download {variant.id}</code>).
			{#if l.commercial === 'no'}Non-commercial weights need <code>FASTFORKS_NONCOMMERCIAL=1</code>.{/if}
		</p>
	</div>
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
	}
	.box {
		padding: 1rem 1.1rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
		min-width: 0;
	}
	.verdict,
	.label {
		margin: 0 0 0.8rem;
		font-weight: 650;
	}
	.verdict::before {
		content: '';
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		margin-right: 0.5rem;
		border-radius: 50%;
		background: var(--muted);
	}
	.verdict.yes::before {
		background: #3d9a50;
	}
	.verdict.no::before {
		background: #c2412d;
	}
	.verdict.unclear::before {
		background: #d8a31a;
	}
	dl {
		display: grid;
		grid-template-columns: 7rem 1fr;
		gap: 0.4rem 0.8rem;
		margin: 0;
		font-size: 0.9rem;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
	}
	dd a {
		margin-left: 0.4rem;
		font-size: 0.82rem;
	}
	dd ul {
		margin: 0 !important;
		padding-left: 1.1rem;
		list-style: disc;
	}
	dd li + li {
		margin-top: 0.2rem;
	}
	dd li small {
		display: block;
	}
	dd li a {
		margin: 0;
	}
	small {
		color: var(--muted);
		font-size: 0.78rem;
	}
	.notes {
		margin: 0.9rem 0 0 !important;
		padding-left: 1.1rem;
		font-size: 0.85rem;
		color: var(--muted);
	}
	.file {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.4rem 0.8rem;
		padding: 0.7rem 0;
		border-top: 1px solid var(--line);
	}
	.name {
		min-width: 0;
	}
	.name code {
		overflow-wrap: anywhere;
	}
	.name small {
		display: block;
	}
	.actions {
		display: flex;
		gap: 0.4rem;
		align-items: start;
	}
	.actions .button {
		padding: 0.35rem 0.75rem;
		font-size: 0.82rem;
	}
	.sha {
		grid-column: 1 / -1;
		display: flex;
		justify-content: space-between;
		gap: 0.6rem;
		padding: 0.3rem 0.5rem;
		border: 1px dashed var(--line);
		background: transparent;
		color: var(--muted);
		font: 0.74rem var(--mono);
		cursor: pointer;
		text-align: left;
	}
	.sha:hover {
		color: var(--ink);
	}
	@media (max-width: 560px) {
		dl {
			grid-template-columns: 1fr;
		}
	}
</style>
