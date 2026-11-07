<script lang="ts">
	let { command }: { command: string } = $props();
	let copied = $state(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(command);
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			// clipboard blocked: the text stays selectable
		}
	}
</script>

<div class="cmd">
	<code><span aria-hidden="true">$</span>{command}</code>
	<button type="button" onclick={copy} aria-label="Copy command">{copied ? 'Copied' : 'Copy'}</button>
	<span class="sr-only" aria-live="polite">{copied ? 'Copied to clipboard' : ''}</span>
</div>

<style>
	.cmd {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 48px;
		padding: 0.35rem 0.35rem 0.35rem 1rem;
		background: var(--code-bg);
		color: var(--code-ink);
		border-radius: 6px;
		font-size: 0.9rem;
	}
	code {
		overflow-x: auto;
		white-space: nowrap;
	}
	code span {
		margin-right: 0.6ch;
		color: var(--code-muted);
	}
	button {
		flex: none;
		min-width: 72px;
		min-height: 38px;
		border: 1px solid #39413c;
		border-radius: 4px;
		background: transparent;
		color: var(--code-ink);
		font: 600 0.78rem/1 var(--sans);
		cursor: pointer;
	}
	button:hover {
		border-color: var(--code-accent);
		color: var(--code-accent);
	}
</style>
