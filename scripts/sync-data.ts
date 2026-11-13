// Regenerates src/lib/data/models.json from a fastforks checkout.
//
//   pnpm sync                      # uses ../fastforks
//   FASTFORKS_REPO=/path pnpm sync
//
// Speed numbers come from docs/overview.md (generated there by tools/gen_docs.py: one standard input per task,
// measured on the reference GPU), the other devices from docs/data/devices.toml and docs/data/speed/. Licences come from `fastforks list --format json`. Nothing here measures anything.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderDocs, type ModeRow } from './docs.ts';

const repo = resolve(process.env.FASTFORKS_REPO ?? '../fastforks');
const out = resolve('src/lib/data/models.json');
// Docs pages rendered for the site (src/lib/data/docs/), plus each variant's per-backend time and memory.
const docs = renderDocs(repo, resolve('src/lib/data/docs'));
// Model cards (/models/<family>): structured per-family data from tools/site_data.py (card, licences, weights files,
// every measured speed / quality / device row). The site renders it; nothing is computed here.
const cardsDir = resolve('src/lib/data/cards');
rmSync(cardsDir, { recursive: true, force: true });
execFileSync('uv', ['run', '--project', repo, 'python', 'tools/site_data.py', '--out', cardsDir], {
	cwd: repo,
	stdio: ['ignore', 'inherit', 'inherit']
});

const TASK_ORDER_SYNC = [
	'stereo',
	'depth',
	'multiview',
	'matching',
	'promptable_segmentation',
	'segmentation',
	'detection',
	'pose',
	'classification',
	'features',
	'flow'
];

const TASK_IDS: Record<string, string> = {
	Stereo: 'stereo',
	'Monocular depth': 'depth',
	Classification: 'classification',
	Segmentation: 'segmentation',
	'Promptable segmentation': 'promptable_segmentation',
	Detection: 'detection',
	Features: 'features',
	Multiview: 'multiview',
	Pose: 'pose',
	Flow: 'flow',
	Matching: 'matching'
};

type Row = {
	id: string;
	doc: string;
	commercial: string;
	accuracy: string | null;
	/** What `accuracy` measures (dataset and metric). */
	accuracy_metric: string | null;
	original_ms: number | null;
	original_size: string | null;
	/** 'OOM' where the original ran out of GPU memory at its size (no time), else null. */
	original_note: string | null;
	portable_ms: number | null;
	kernels_ms: number | null;
	speedup: number | null;
	speedup_vs: string | null;
	peak_mib: number | null;
	family: string;
	mem: { original: Mem; portable: Mem; kernels: Mem };
	/** portable + torch.compile and the fp16 TensorRT engine (reference GPU, one variant per family; else null). */
	compile: Extra;
	tensorrt: Extra;
};
/** A time, or why it failed; `part` = the part of the call the engine runs, if not all; `prep_s` = the one-time cost. */
type Extra = { ms: number | null; fails: string | null; part: string | null; prep_s: number | null } | null;
type Mem = { alloc: number; reserved: number | null } | null;

const num = (s: string): number | null => {
	const m = s.replaceAll(',', '').match(/-?\d+(\.\d+)?/);
	return m ? Number(m[0]) : null;
};
const cells = (line: string) =>
	line
		.trim()
		.replace(/^\||\|$/g, '')
		.split('|')
		.map((c) => c.trim());
const link = (cell: string) => {
	const m = cell.match(/\[`([^`]+)`\]\(([^)]+)\)/);
	if (!m) throw new Error(`no model link in ${cell}`);
	return { id: m[1], doc: docs.rewrite(m[2], 'overview.md') };
};

const md = readFileSync(resolve(repo, 'docs/overview.md'), 'utf8').split('\n');
const tasks: {
	id: string;
	title: string;
	input: string;
	accuracy_metric: string | null;
	picks: { label: string; id: string; doc: string; note: string }[];
	models: Row[];
}[] = [];

let task: (typeof tasks)[number] | null = null;
let header: string[] = [];
for (const line of md) {
	const h = line.match(/^## (.+)$/);
	if (h) {
		const id = TASK_IDS[h[1]];
		if (!id) throw new Error(`unknown task section "${h[1]}" in overview.md: add it to TASK_IDS`);
		task = { id, title: h[1], input: 'own input per model', accuracy_metric: null, picks: [], models: [] };
		tasks.push(task);
		header = [];
		continue;
	}
	if (!task) continue;
	const size = line.match(/^\d+ models; (.+)\.$/);
	if (size) task.input = size[1].startsWith('size ') ? size[1].slice(5) : 'own input per model';
	const pick = line.match(/^- ([^:]+): (\[`[^`]+`\]\([^)]+\)) \((.+)\)\.$/);
	if (pick) task.picks.push({ label: pick[1], ...link(pick[2]), note: pick[3] });
	if (line.startsWith('| model |')) {
		header = cells(line);
		const acc = header.find((c) => !/^(model|commercial use)$/.test(c) && !/time|speed-up|memory/.test(c));
		task.accuracy_metric = acc ?? null;
		continue;
	}
	if (header.length && line.startsWith('| [`')) {
		const c = cells(line);
		const col = (pred: (h: string) => boolean) => {
			const i = header.findIndex(pred);
			return i < 0 ? '–' : c[i];
		};
		const orig = col((h) => h.startsWith('original time'));
		const sp = col((h) => h.includes('speed-up'));
		const spm = sp.match(/^([\d.]+)x vs (\w+)/);
		const l = link(c[0]);
		const family = l.doc.replace(/^\/models\//, '');
		// Variants that share an architecture (other fine-tunes) get no row of their own in the family table: take
		// the listed variant whose kernels time matches.
		const kms = num(col((h) => h.startsWith('kernels time')));
		const twin = docs.families.get(family)?.variants.find((v) => {
			const k = docs.modes[v]?.find((r) => r.mode === 'kernels')?.ms;
			return k != null && kms != null && Math.abs(k - kms) <= 0.03 * kms;
		});
		// timm variants are listed with their weights tag (`resnet18.a1_in1k`), the overview by the architecture.
		const tagged = Object.keys(docs.modes).find((v) => v.startsWith(`${l.id}.`));
		const modes = docs.modes[l.id] ?? docs.modes[tagged ?? ''] ?? (twin ? docs.modes[twin] : []);
		const memOf = (pred: (r: ModeRow) => boolean): Mem => {
			const r = modes.find(pred);
			return r?.alloc_mib != null ? { alloc: r.alloc_mib, reserved: r.reserved_mib } : null;
		};
		const origMs = num(orig.split('(')[0]);
		task.models.push({
			...l,
			family,
			// The overview's original time is the faster of fp32 and the authors' half precision: its memory goes with it.
			mem: {
				original: memOf((r) => r.mode.startsWith('original') && r.ms === origMs) ?? memOf((r) => r.mode === 'original'),
				portable: memOf((r) => r.mode === 'portable'),
				kernels: memOf((r) => r.mode === 'kernels')
			},
			commercial: c[1],
			accuracy: task.accuracy_metric ? col((h) => h === task!.accuracy_metric) : null,
			accuracy_metric: null,
			original_ms: origMs,
			original_size: orig.match(/\(([^)]+)\)/)?.[1] ?? null,
			original_note: orig.startsWith('OOM') ? 'OOM' : null,
			portable_ms: num(col((h) => h.startsWith('portable time'))),
			kernels_ms: num(col((h) => h.startsWith('kernels time'))),
			speedup: spm ? Number(spm[1]) : null,
			speedup_vs: spm ? spm[2] : null,
			peak_mib: num(col((h) => h.includes('peak memory'))),
			compile: null,
			tensorrt: null
		});
	}
}

// torch.compile and TensorRT (docs/benchmarks.md, generated from docs/data/speed_compile.jsonl): one variant per
// family at the task's standard size on the reference GPU. Its portable and kernels columns are the overview's.
{
	const bench = readFileSync(resolve(repo, 'docs/benchmarks.md'), 'utf8');
	const block = bench.match(/<!-- compile:begin[^\n]*\n([\s\S]*?)<!-- compile:end -->/)?.[1];
	if (!block) throw new Error('no compile block in docs/benchmarks.md');
	const lines = block.split('\n').filter((l) => l.startsWith('|'));
	const head = cells(lines[0]);
	const at = (name: string) => {
		const i = head.findIndex((h) => h.startsWith(name));
		if (i < 0) throw new Error(`compile table has no "${name}" column`);
		return i;
	};
	const [iC, iT, iCs, iTs] = [at('compile'), at('TensorRT'), at('preparation'), at('ONNX + engine')];
	const byId = new Map(tasks.flatMap((t) => t.models.map((m) => [m.id, m] as const)));
	const extra = (cell: string, prep: string): Extra => {
		if (cell === '–') return null;
		if (cell.startsWith('fails: ')) return { ms: null, fails: cell.slice(7), part: null, prep_s: null };
		return { ms: num(cell), fails: null, part: cell.match(/\(([^)]+) only\)/)?.[1] ?? null, prep_s: num(prep) };
	};
	for (const line of lines.slice(2)) {
		const c = cells(line);
		const m = byId.get(c[0]) ?? byId.get(c[0].split('.')[0]);
		if (!m) continue; // a variant the overview does not list
		m.compile = extra(c[iC], c[iCs]);
		m.tensorrt = extra(c[iT], c[iTs]);
	}
}

// Accuracy of the other tasks: the overview has a column only for depth and stereo, the model pages have every
// variant's golden check ("| variant | dataset | original fp32 | original fp16 | portable | kernels | note |").
{
	const byId = new Map(tasks.flatMap((t) => t.models.map((m) => [m.id, m] as const)));
	for (const t of tasks)
		for (const m of t.models) if (m.accuracy && m.accuracy !== '–') m.accuracy_metric = t.accuracy_metric;
	for (const f of readdirSync(resolve(repo, 'docs/models')).filter((f) => f.endsWith('.md'))) {
		let head: string[] = [];
		for (const line of readFileSync(resolve(repo, 'docs/models', f), 'utf8').split('\n')) {
			if (!line.startsWith('|')) {
				head = [];
				continue;
			}
			const c = cells(line);
			if (c[0] === 'variant' && c[1] === 'dataset') {
				head = c;
				continue;
			}
			if (!head.length || /^-+$/.test(c[0])) continue;
			const k = head.indexOf('kernels');
			const v = c[0].replace(/`/g, '');
			const m = byId.get(v) ?? byId.get(v.split('.')[0]);
			if (!m || m.accuracy_metric || !c[k] || c[k] === '–') continue;
			m.accuracy = c[k];
			m.accuracy_metric = c[1].replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
		}
	}
}

// Licences for every model (also the ones the overview leaves out).
const list = JSON.parse(
	execFileSync('uv', ['run', '--project', repo, 'fastforks', 'list', '--format', 'json'], {
		cwd: repo,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'inherit']
	})
) as {
	id: string;
	task: string;
	tier: string;
	commercial: string;
	code_licence: string;
	weights_licence: string;
	training_data: string[];
}[];

const commit = execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
const ref = readFileSync(resolve(repo, 'docs/overview.md'), 'utf8').match(/Measured on one (.+?) at the size/)?.[1];

// Other devices: docs/data/devices.toml lists them, docs/data/speed/<slug>.jsonl holds their survey rows. The
// reference device's numbers are the overview's (above); a survey device gets, per model and mode, its fastest
// passing row over all dtypes (the rule of the device pages: ok and not a golden fail), else the reason it has none.
// The authors' original code (`upstream` rows) only where it was run on that device, so far Apple silicon.
// Memory of the fastest row: torch peak allocated / reserved on CUDA, the process footprint on Apple (no reserved).
type Cell =
	| { ms: number; dtype: string; alloc: number | null; reserved: number | null }
	| { status: string; why?: string };
type SurveyRow = {
	note?: string;
	ref: string;
	task: string;
	mode: string;
	dtype: string;
	ms?: number;
	status: string;
	golden?: string;
	date: string;
	peak_alloc_mb?: number;
	peak_reserved_mb?: number;
	peak_footprint_mb?: number;
	memory_kind?: string;
};
const DTYPE: Record<string, string> = { float16: 'fp16', bfloat16: 'bf16', float32: 'fp32' };
const toml: Record<string, Record<string, string | boolean>> = {};
let section: Record<string, string | boolean> | null = null;
for (const line of readFileSync(resolve(repo, 'docs/data/devices.toml'), 'utf8').split('\n')) {
	const h = line.match(/^\[([\w-]+)\]\s*$/);
	if (h) toml[h[1]] = section = {};
	const kv = line.match(/^(\w+)\s*=\s*(?:"([^"]*)"|(true|false))\s*(#.*)?$/);
	if (kv && section) section[kv[1]] = kv[2] ?? kv[3] === 'true';
}
const modelIds = new Set(tasks.flatMap((t) => t.models.map((m) => m.id)));
// Survey rows use full timm ids (`alexnet.tv_in1k`), the overview the bare architecture (`alexnet`).
const modelId = (ref: string) => (modelIds.has(ref) ? ref : ref.split('.')[0]);
type Times = Record<string, { task: string; original?: Cell; portable?: Cell; kernels?: Cell; cpu?: Cell }>;
/** A survey device's rows and, per model and mode, its fastest passing row (else the reason it has none). */
function survey(slug: string): { rows: SurveyRow[]; times: Times } {
	const rows = readFileSync(resolve(repo, `docs/data/speed/${slug}.jsonl`), 'utf8')
		.split('\n')
		.filter(Boolean)
		.map((l) => JSON.parse(l) as SurveyRow);
	const times: Times = {};
	const KEY: Record<string, 'original' | 'portable' | 'kernels'> = {
		upstream: 'original',
		portable: 'portable',
		kernels: 'kernels'
	};
	for (const r of rows) {
		const key = KEY[r.mode];
		if (!key) continue;
		const id = modelId(r.ref);
		if (!modelIds.has(id)) throw new Error(`${slug}: survey row for unknown model ${r.ref}`);
		const entry = (times[id] ??= { task: r.task });
		const prev = entry[key];
		if (r.status === 'ok' && r.golden !== 'fail' && typeof r.ms === 'number') {
			if (!prev || !('ms' in prev) || r.ms < prev.ms)
				entry[key] = {
					ms: r.ms,
					dtype: DTYPE[r.dtype] ?? r.dtype,
					alloc: r.peak_alloc_mb ?? r.peak_footprint_mb ?? null,
					reserved: r.peak_reserved_mb ?? null
				};
		} else if (!prev)
			entry[key] = {
				status: r.golden === 'fail' ? 'golden fail' : r.status,
				...(r.note ? { why: r.note } : {})
			};
	}
	return { rows, times };
}

// `hidden = true`: measured and kept in the repo, but not published (the docs give it no page either).
const devices = Object.entries(toml)
	.filter(([, d]) => d.hidden !== true)
	.map(([slug, d]) => {
		const base = {
			slug,
			name: String(d.name),
			backend: String(d.backend),
			memory: String(d.memory),
			details: String(d.details ?? ''),
			software: String(d.software ?? ''),
			reference: d.reference === true,
			page: d.reference === true ? '/benchmarks' : `/devices/${slug}`
		};
		if (base.reference)
			return {
				...base,
				measured: null,
				memory_kind: 'torch-peak',
				tasks: tasks.map((t) => t.id),
				cpu: null,
				times: null
			};
		const { rows, times } = survey(slug);
		// The same chip's CPU cores (a hidden device of the same `match`): its portable time next to the GPU's.
		const cpu = Object.entries(toml).find(
			([s, x]) => s !== slug && x.backend === 'cpu' && x.match === d.match && d.backend !== 'cpu'
		);
		if (cpu)
			for (const [id, t] of Object.entries(survey(cpu[0]).times))
				if (times[id] && t.portable) times[id].cpu = t.portable;
		const dates = rows.map((r) => r.date).sort();
		return {
			...base,
			measured: { from: dates[0], to: dates.at(-1), rows: rows.length },
			memory_kind: rows.find((r) => r.memory_kind)?.memory_kind ?? null,
			tasks: TASK_ORDER_SYNC.filter((t) => Object.values(times).some((e) => e.task === t)),
			cpu: cpu ? { name: String(cpu[1].name), details: String(cpu[1].details ?? '') } : null,
			times
		};
	});

// Headline numbers only against the original authors' code (the overview falls back to portable where it has none).
const speedups = tasks.flatMap((t) =>
	t.models.filter((m) => m.speedup_vs === 'original').map((m) => m.speedup as number)
);
speedups.sort((a, b) => a - b);

const data = {
	source: { repo: 'https://github.com/kleinicke/fastforks', commit, reference_gpu: ref ?? 'RTX 5060 Ti 16 GB' },
	totals: {
		models: list.length,
		tasks: new Set(list.map((m) => m.task)).size,
		commercial: list.filter((m) => m.commercial === 'yes').length,
		vs_original: {
			models: speedups.length,
			median: speedups[Math.floor(speedups.length / 2)],
			max: speedups.at(-1)
		}
	},
	tasks,
	devices,
	licences: Object.fromEntries(
		list.map((m) => [
			m.id,
			{
				task: m.task,
				tier: m.tier,
				code: m.code_licence,
				weights: m.weights_licence,
				training: m.training_data ?? []
			}
		])
	)
};
writeFileSync(out, JSON.stringify(data, null, '\t') + '\n');
console.log(
	`wrote ${out}: ${tasks.length} tasks, ${tasks.reduce((n, t) => n + t.models.length, 0)} timed rows, ` +
		`${list.length} models, ${devices.length} devices, commit ${commit}`
);

// The "Compare models" view of /models: every benchmark of a task with each model's result, taken from the cards
// (kernels; portable where a model has no kernels). Small enough for the list page, which loads no card.
{
	type Metric = { key: string; format: string; optional: boolean; lower: boolean };
	type Run = { dtype: string | null; metrics: Record<string, number>; error: string | null } | null;
	type Quality = {
		id: string;
		title: string;
		noun: string;
		overlap: string | null;
		metrics: Metric[];
		modes: Record<string, Run>;
	};
	type CardFile = { task: string; variants: { id: string; quality: Quality[] }[] };
	const byTask: Record<
		string,
		{
			datasets: (Omit<Quality, 'modes'> & { count: number })[];
			results: Record<string, Record<string, { mode: 'kernels' | 'portable'; metrics: Record<string, number> }>>;
		}
	> = {};
	for (const f of readdirSync(cardsDir).filter((f) => f.endsWith('.json') && f !== 'index.json')) {
		const card = JSON.parse(readFileSync(resolve(cardsDir, f), 'utf8')) as CardFile;
		const t = (byTask[card.task] ??= { datasets: [], results: {} });
		for (const v of card.variants)
			for (const q of v.quality) {
				const mode =
					q.modes.kernels && !q.modes.kernels.error
						? 'kernels'
						: q.modes.portable && !q.modes.portable.error
							? 'portable'
							: null;
				if (!mode) continue;
				let d = t.datasets.find((x) => x.id === q.id);
				if (!d)
					t.datasets.push((d = { id: q.id, title: q.title, noun: q.noun, overlap: q.overlap, metrics: [], count: 0 }));
				d.count += 1;
				const run = q.modes[mode]!;
				// Optional metrics only where some model reports them.
				for (const m of q.metrics)
					if (!d.metrics.some((x) => x.key === m.key) && (!m.optional || m.key in run.metrics)) d.metrics.push(m);
				(t.results[v.id] ??= {})[q.id] = { mode, metrics: run.metrics };
			}
	}
	// Most widely measured benchmark first.
	for (const t of Object.values(byTask)) t.datasets.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
	const benchOut = resolve('src/lib/data/benchmarks.json');
	writeFileSync(benchOut, JSON.stringify(byTask) + '\n');
	console.log(`wrote ${benchOut}: ${Object.values(byTask).reduce((n, t) => n + t.datasets.length, 0)} benchmarks`);
}
