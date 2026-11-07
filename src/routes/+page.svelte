<script lang="ts">
	import CopyCommand from '#lib/components/CopyCommand.svelte';
	import SpeedChart from '#lib/components/SpeedChart.svelte';
	import { data, LINKS, REFERENCE, TASK_META, TASK_ORDER } from '#lib/site.ts';

	const t = data.totals;
	const title = 'fastforks · published vision models, same output, faster';
	const description = `${t.models} published vision models (stereo, depth, SAM, DINOv3, detection and more) behind one Python API. A plain PyTorch port checked against the authors' code, plus CUDA and Metal kernels: up to ${t.vs_original.max}× faster than the original.`;

	const examples = (id: string) =>
		[...data.tasks.find((x) => x.id === id)!.models]
			.sort((a, b) => (b.speedup ?? 0) - (a.speedup ?? 0))
			.slice(0, 3)
			.map((m) => m.id);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
</svelte:head>

<section class="hero">
	<div class="wrap grid">
		<div class="copy">
			<p class="eyebrow">Open source · Python · PyTorch</p>
			<h1>Published vision models.<br /><span>Same output, faster.</span></h1>
			<p class="intro">
				Load a stereo, depth, segmentation, detection or feature model by its id and get the original
				network's output, faster. Each model is ported to plain PyTorch and checked against the authors'
				code, then sped up with our own CUDA and Metal kernels.
			</p>
			<div class="actions">
				<CopyCommand command="pip install fastforks" />
				<div class="buttons">
					<a class="button primary" href="/models">Browse {t.models} models</a>
					<a class="button" href={LINKS.github}>GitHub ↗</a>
				</div>
			</div>
		</div>
		<pre class="code" aria-label="Python example"><code
				><span class="k">from</span> fastforks <span class="k">import</span> stereo, depth

model = stereo.<span class="k">load</span>(<span class="s">"igev-stereo-sceneflow"</span>)
result = model(<span class="s">"left.png"</span>, <span class="s">"right.png"</span>)
result.disparity  <span class="c"># [H, W] float32 tensor, pixels</span>
result.backend    <span class="c"># kernels on CUDA / Apple silicon, else portable</span>

depth.<span class="k">load</span>(<span class="s">"depth-anything-v2-s"</span>)(<span class="s">"room.jpg"</span>).inverse_depth</code
			></pre>
	</div>
	<div class="wrap">
		<dl class="stats">
			<div><dt>models</dt><dd>{t.models}</dd></div>
			<div><dt>tasks</dt><dd>{t.tasks}</dd></div>
			<div><dt>median vs original</dt><dd>{t.vs_original.median}×</dd></div>
			<div><dt>best vs original</dt><dd>{t.vs_original.max}×</dd></div>
			<div><dt>commercially usable</dt><dd>{t.commercial}</dd></div>
		</dl>
		<p class="stats-note">
			Speed-ups: our kernels against the authors' code with the same checkpoint, at each task's standard input,
			for the {t.vs_original.models} models where the original was timed; {data.source.reference_gpu}.
		</p>
	</div>
</section>

<section class="section" id="how" aria-labelledby="how-title">
	<div class="wrap">
		<p class="eyebrow">How it works</p>
		<h2 id="how-title">One network, two backends.</h2>
		<p class="lede">
			Nothing is retrained or approximated. fastforks runs the authors' checkpoint, and every speed and
			accuracy number is measured against their original code.
		</p>
		<ol class="modes">
			<li>
				<span class="tag">original</span>
				<h3>The authors' code</h3>
				<p>The reference: their repository at a pinned commit with the same checkpoint. Used to check parity and to time the baseline.</p>
			</li>
			<li>
				<span class="tag portable">portable</span>
				<h3>Plain PyTorch</h3>
				<p>A clean port with one API. Validated on CPU, NVIDIA CUDA and Apple MPS, so it runs wherever PyTorch runs.</p>
			</li>
			<li>
				<span class="tag kernels">kernels</span>
				<h3>Our CUDA &amp; Metal kernels</h3>
				<p>The same network with fused kernels: NVIDIA sm_80+ on Linux, and Metal on Apple silicon for most families.</p>
			</li>
		</ol>
		<p class="auto">
			<code>mode="auto"</code> picks kernels where they can run and the measurements prefer them, portable
			everywhere else. <code>mode="kernels"</code> raises with the reason instead of silently falling back.
		</p>
	</div>
</section>

<section class="section" id="speed" aria-labelledby="speed-title">
	<div class="wrap">
		<p class="eyebrow">Speed</p>
		<h2 id="speed-title">Measured, not promised.</h2>
		<p class="lede">
			Every row is a median of warm runs, with the accuracy checked on public benchmarks. The {REFERENCE.name} is
			the reference and times all three modes; the other devices are surveys of portable against kernels, the
			Apple M1 Pro across every task. Run <code>fastforks bench MODEL</code> to time both backends on yours.
		</p>
		<SpeedChart />
	</div>
</section>

<section class="section" id="tasks" aria-labelledby="tasks-title">
	<div class="wrap">
		<p class="eyebrow">Tasks</p>
		<h2 id="tasks-title">Eight tasks, one calling convention.</h2>
		<p class="lede">
			Load by id, call on an image path, array or tensor, get a typed result. Licences, accuracy and memory are
			on every model page.
		</p>
		<ul class="tasks">
			{#each TASK_ORDER as id (id)}
				{@const m = TASK_META[id]}
				{@const task = data.tasks.find((x) => x.id === id)!}
				<li>
					<a href="/models?task={id}">
						<span class="count">{task.models.length}</span>
						<h3>{m.name}</h3>
						<code class="call">{m.pkg}.load(…) → {m.call}</code>
						<p>{m.result}</p>
						<p class="ex">{examples(id).join(' · ')}</p>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>

<section class="section" id="licences" aria-labelledby="licences-title">
	<div class="wrap split">
		<div>
			<p class="eyebrow">Licences</p>
			<h2 id="licences-title">Know what you can ship.</h2>
			<p class="lede">
				Many vision models are non-commercial. Each fastforks model lists its code licence, weights licence and
				training data, and is flagged commercial <em>yes</em> only if both licences allow it. Non-commercial
				weights are never downloaded unless you opt in.
			</p>
			<p class="small">
				<code>pip install fastforks-core</code> installs only models with permissive code. None of this is
				legal advice.
			</p>
		</div>
		<pre class="code" aria-label="Python example: filter models by licence"><code
				><span class="k">import</span> fastforks
<span class="k">from</span> fastforks <span class="k">import</span> stereo

<span class="c"># stereo models whose code and weights allow commercial use</span>
stereo.list_models(commercial=<span class="s">"yes"</span>)

<span class="c"># licences, and what blocks a "yes"</span>
print(fastforks.describe_models(stereo.list_models(<span class="s">"igev*"</span>)))</code
			></pre>
	</div>
</section>

<section class="section" id="install" aria-labelledby="install-title">
	<div class="wrap split">
		<div>
			<p class="eyebrow">Install</p>
			<h2 id="install-title">Uses the PyTorch you have.</h2>
			<p class="lede">
				Install PyTorch for your platform first; fastforks uses that build, CUDA or CPU-only. Weights and kernels
				download on first use and are checked against a recorded SHA-256.
			</p>
			<ul class="reqs">
				<li><span>Python</span> 3.11+ · PyTorch 2.8+</li>
				<li><span>CUDA kernels</span> Linux x86-64 · NVIDIA compute capability 8.0+ (RTX 30, A100 and newer) · driver 570+</li>
				<li><span>Metal kernels</span> Apple silicon</li>
				<li><span>Portable</span> anywhere PyTorch runs: CPU, CUDA, MPS</li>
			</ul>
		</div>
		<div class="install">
			<CopyCommand command="pip install fastforks" />
			<p class="small">Everything: all models plus timm, torchvision, transformers and ONNX.</p>
			<CopyCommand command="pip install fastforks-core" />
			<p class="small">Lean: models with permissive code, no extra libraries.</p>
			<pre class="code"><code
					><span class="c"># offline machines: fetch ahead of time</span>
fastforks download depth-anything-v2-s --kernels
<span class="c"># which models can run here, and why not</span>
fastforks doctor</code
				></pre>
			<div class="buttons">
				<a class="button primary" href={LINKS.usage}>Read the usage guide ↗</a>
				<a class="button" href={LINKS.pypi}>PyPI ↗</a>
			</div>
		</div>
	</div>
</section>

<style>
	.hero {
		padding: clamp(3.5rem, 8vw, 6.5rem) 0 clamp(3rem, 6vw, 4.5rem);
	}
	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
		gap: clamp(2rem, 5vw, 4.5rem);
		align-items: center;
	}
	h1 {
		margin: 1rem 0 1.4rem;
		font-size: clamp(2.6rem, 6.2vw, 5.1rem);
		font-weight: 700;
		letter-spacing: -0.045em;
		line-height: 0.98;
	}
	h1 span {
		color: var(--muted);
	}
	h1 span::after {
		content: '';
		display: inline-block;
		width: 0.42em;
		height: 0.42em;
		margin-left: 0.12em;
		background: var(--accent);
		vertical-align: 0.04em;
	}
	.intro {
		max-width: 600px;
		margin: 0 0 2rem;
		font-size: clamp(1.05rem, 1.5vw, 1.22rem);
		color: var(--muted);
	}
	.actions {
		display: grid;
		gap: 1rem;
		max-width: 520px;
	}
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		margin: clamp(3rem, 6vw, 4.5rem) 0 0;
		border-top: 1px solid var(--strong-line);
		border-bottom: 1px solid var(--line);
	}
	.stats div {
		padding: 1.1rem 1rem 1.1rem 0;
	}
	.stats div + div {
		padding-left: 1rem;
		border-left: 1px solid var(--line);
	}
	.stats dt {
		color: var(--muted);
		font: 600 0.66rem/1.3 var(--mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.stats dd {
		margin: 0.35rem 0 0;
		font-size: clamp(1.7rem, 3vw, 2.4rem);
		font-weight: 700;
		letter-spacing: -0.04em;
		line-height: 1;
	}
	.stats-note {
		margin: 0.75rem 0 0;
		color: var(--muted);
		font: 500 0.7rem/1.5 var(--mono);
	}

	.modes {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1px;
		margin: 0;
		padding: 0;
		list-style: none;
		background: var(--line);
		border: 1px solid var(--line);
	}
	.modes li {
		padding: 1.5rem;
		background: var(--surface);
	}
	.modes h3 {
		margin: 1rem 0 0.5rem;
		font-size: 1.15rem;
	}
	.modes p {
		margin: 0;
		color: var(--muted);
		font-size: 0.93rem;
	}
	.tag {
		display: inline-block;
		padding: 0.3rem 0.5rem;
		background: var(--bar-original);
		color: var(--ink);
		font: 600 0.72rem/1 var(--mono);
	}
	.tag.portable {
		background: var(--bar-portable);
		color: #fff;
	}
	.tag.kernels {
		background: var(--accent);
		color: var(--accent-ink);
	}
	.auto {
		max-width: 760px;
		margin: 1.5rem 0 0;
		color: var(--muted);
		font-size: 0.93rem;
	}
	.auto code,
	.lede code {
		color: var(--ink);
		font-size: 0.88em;
	}

	.tasks {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		margin: 0;
		padding: 0;
		list-style: none;
		background: var(--line);
		border: 1px solid var(--line);
	}
	.tasks a {
		display: grid;
		align-content: start;
		gap: 0.4rem;
		height: 100%;
		padding: 1.4rem;
		background: var(--surface);
		text-decoration: none;
		transition: background 120ms ease;
	}
	.tasks a:hover {
		background: color-mix(in srgb, var(--accent) 18%, var(--surface));
	}
	.count {
		font: 700 0.75rem/1 var(--mono);
		color: var(--muted);
	}
	.tasks h3 {
		margin: 0.3rem 0 0.2rem;
		font-size: 1.08rem;
		letter-spacing: -0.01em;
	}
	.call {
		font-size: 0.74rem;
		color: var(--blue);
		overflow-wrap: anywhere;
	}
	.tasks p {
		margin: 0;
		font-size: 0.88rem;
		color: var(--muted);
	}
	.tasks .ex {
		margin-top: 0.6rem;
		font: 500 0.7rem/1.5 var(--mono);
		overflow-wrap: anywhere;
	}

	.split {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: clamp(2rem, 5vw, 4.5rem);
		align-items: center;
	}
	.small {
		color: var(--muted);
		font-size: 0.86rem;
	}
	.reqs {
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--line);
	}
	.reqs li {
		display: grid;
		grid-template-columns: 120px 1fr;
		gap: 1rem;
		padding: 0.7rem 0;
		border-bottom: 1px solid var(--line);
		font-size: 0.9rem;
	}
	.reqs span {
		color: var(--muted);
		font: 600 0.68rem/1.6 var(--mono);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.install {
		display: grid;
		gap: 0.6rem;
	}
	.install .small {
		margin: 0 0 0.8rem;
	}
	.install .code {
		margin-bottom: 0.8rem;
	}

	@media (max-width: 980px) {
		.grid,
		.split {
			grid-template-columns: 1fr;
		}
		.tasks {
			grid-template-columns: repeat(2, 1fr);
		}
		.stats {
			grid-template-columns: repeat(3, 1fr);
		}
		.stats div:nth-child(4) {
			padding-left: 0;
			border-left: 0;
		}
		.stats div:nth-child(n + 4) {
			border-top: 1px solid var(--line);
		}
	}
	@media (max-width: 680px) {
		.modes,
		.tasks {
			grid-template-columns: 1fr;
		}
		.stats {
			grid-template-columns: repeat(2, 1fr);
		}
		.stats div:nth-child(n) {
			padding-left: 0;
			border-left: 0;
		}
		.stats div:nth-child(even) {
			padding-left: 1rem;
			border-left: 1px solid var(--line);
		}
		.stats div:nth-child(n + 3) {
			border-top: 1px solid var(--line);
		}
		.reqs li {
			grid-template-columns: 1fr;
			gap: 0.2rem;
		}
	}
</style>
