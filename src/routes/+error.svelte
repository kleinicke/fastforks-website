<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} · fastforks</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="section">
	<div class="wrap">
		<p class="eyebrow">{page.status}</p>
		<h1>{page.status === 404 ? 'This page is not here.' : 'Something went wrong.'}</h1>
		<p class="lede">Try the <a href="/">start page</a> or the <a href="/models">model list</a>.</p>
	</div>
</section>

<style>
	h1 {
		margin: 0 0 1rem;
		font-size: clamp(2rem, 4.5vw, 3.4rem);
		letter-spacing: -0.04em;
	}
</style>
