<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { LINKS, SITE_URL } from '#lib/site.ts';

	let { children } = $props();
	const canonical = $derived(SITE_URL + (page.url.pathname === '/' ? '/' : page.url.pathname));
</script>

<svelte:head>
	<link rel="canonical" href={canonical} />
	<meta property="og:url" content={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="fastforks" />
</svelte:head>

<a class="skip" href="#main">Skip to content</a>

<header class="site-header">
	<div class="wrap bar">
		<a class="logo" href="/" aria-label="fastforks home">
			<svg viewBox="0 0 32 32" aria-hidden="true"
				><rect width="32" height="32" rx="7" /><path
					d="M10 7v8a6 6 0 0 0 12 0V7M16 21v5M16 7v8"
				/></svg
			>
			<span>fastforks</span>
		</a>
		<nav aria-label="Main">
			<a href="/models" aria-current={page.url.pathname === '/models' ? 'page' : undefined}>Models</a>
			<a class="hide-sm" href="/#speed">Speed</a>
			<a href="/#install">Install</a>
			<a class="hide-sm" href={LINKS.usage}>Docs ↗</a>
			<a href={LINKS.github}>GitHub ↗</a>
		</nav>
	</div>
</header>

<main id="main">
	{@render children()}
</main>

<footer class="site-footer">
	<div class="wrap foot">
		<div>
			<p class="eyebrow">fastforks</p>
			<p>
				Faster versions of published vision models behind one API. Apache-2.0; vendored model code keeps
				its original licence.
			</p>
		</div>
		<div class="links">
			<a href={LINKS.github}>GitHub ↗</a>
			<a href={LINKS.pypi}>PyPI ↗</a>
			<a href={LINKS.usage}>Usage guide ↗</a>
			<a href={LINKS.benchmarks}>Benchmark method ↗</a>
		</div>
		<div class="links">
			<a href={LINKS.author}>Made by Florian Nick ↗</a>
			<a href={LINKS.impressum}>Impressum</a>
			<a href={LINKS.datenschutz}>Datenschutz</a>
		</div>
	</div>
</footer>

<style>
	.skip {
		position: fixed;
		top: 0;
		left: 1rem;
		z-index: 50;
		padding: 0.6rem 1rem;
		background: var(--ink);
		color: var(--bg);
		transform: translateY(-110%);
	}
	.skip:focus {
		transform: none;
	}
	.site-header {
		position: sticky;
		top: 0;
		z-index: 20;
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--line);
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		min-height: 64px;
	}
	.logo {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		font: 700 1.02rem/1 var(--mono);
		letter-spacing: -0.02em;
		text-decoration: none;
	}
	.logo svg {
		width: 28px;
		height: 28px;
	}
	.logo rect {
		fill: var(--ink);
	}
	.logo path {
		fill: none;
		stroke: var(--accent);
		stroke-width: 2.6;
		stroke-linecap: round;
	}
	@media (prefers-color-scheme: dark) {
		.logo rect {
			fill: #222a25;
		}
	}
	nav {
		display: flex;
		gap: clamp(0.9rem, 2.5vw, 2rem);
		font-size: 0.88rem;
	}
	nav a {
		white-space: nowrap;
		text-decoration: none;
		color: var(--muted);
	}
	nav a:hover,
	nav a[aria-current='page'] {
		color: var(--ink);
		text-decoration: underline;
	}
	.site-footer {
		margin-top: 0;
		padding: clamp(3rem, 6vw, 4.5rem) 0;
		border-top: 1px solid var(--line);
		font-size: 0.9rem;
	}
	.foot {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr;
		gap: 2rem;
	}
	.foot p:not(.eyebrow) {
		max-width: 420px;
		color: var(--muted);
	}
	.links {
		display: grid;
		align-content: start;
		gap: 0.5rem;
	}
	.links a {
		text-decoration: none;
		color: var(--muted);
	}
	.links a:hover {
		color: var(--ink);
		text-decoration: underline;
	}
	@media (max-width: 680px) {
		.hide-sm {
			display: none;
		}
		nav {
			font-size: 0.8rem;
			gap: 0.75rem;
		}
		.foot {
			grid-template-columns: 1fr;
		}
	}
</style>
