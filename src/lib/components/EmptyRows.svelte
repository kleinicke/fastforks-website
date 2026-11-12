<script lang="ts">
	// The text of an empty model table; offers the upcoming models the "Show upcoming" toggle hides.
	let { hidden, onshow }: { hidden: number; onshow: () => void } = $props();
</script>

{#if hidden}
	No released model matches.
	<button type="button" onclick={onshow}>Show upcoming ({hidden})</button>
{:else}
	No model matches.
{/if}

<style>
	button {
		margin-left: 0.5rem;
		padding: 0.2rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: 4px;
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}
	button:hover {
		border-color: var(--ink);
	}
</style>
