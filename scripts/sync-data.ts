// Regenerates src/lib/data/models.json from a fastforks checkout.
//
//   pnpm sync                      # uses ../fastforks
//   FASTFORKS_REPO=/path pnpm sync
//
// Speed numbers come from docs/overview.md (generated there by tools/gen_docs.py: one standard input per task,
// measured on the reference GPU), the other devices from docs/data/devices.toml and docs/data/speed/. Licences come from `fastforks list --format json`. Nothing here measures anything.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(process.env.FASTFORKS_REPO ?? '../fastforks');
const out = resolve('src/lib/data/models.json');
const DOCS = 'https://github.com/kleinicke/fastforks/blob/main/docs/';

const TASK_ORDER_SYNC = [
	'stereo',
	'depth',
	'multiview',
	'promptable_segmentation',
	'segmentation',
	'detection',
	'classification',
	'features'
];

const TASK_IDS: Record<string, string> = {
	Stereo: 'stereo',
	'Monocular depth': 'depth',
	Classification: 'classification',
	Segmentation: 'segmentation',
	'Promptable segmentation': 'promptable_segmentation',
	Detection: 'detection',
	Features: 'features',
	Multiview: 'multiview'
};

type Row = {
	id: string;
	doc: string;
	commercial: string;
	accuracy: string | null;
	original_ms: number | null;
	original_size: string | null;
	portable_ms: number | null;
	kernels_ms: number | null;
	speedup: number | null;
	speedup_vs: string | null;
	peak_mib: number | null;
};

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
	return { id: m[1], doc: DOCS + m[2] };
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
		task.models.push({
			...link(c[0]),
			commercial: c[1],
			accuracy: task.accuracy_metric ? col((h) => h === task!.accuracy_metric) : null,
			original_ms: num(orig.split('(')[0]),
			original_size: orig.match(/\(([^)]+)\)/)?.[1] ?? null,
			portable_ms: num(col((h) => h.startsWith('portable time'))),
			kernels_ms: num(col((h) => h.startsWith('kernels time'))),
			speedup: spm ? Number(spm[1]) : null,
			speedup_vs: spm ? spm[2] : null,
			peak_mib: num(col((h) => h.includes('peak memory')))
		});
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
}[];

const commit = execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
const ref = readFileSync(resolve(repo, 'docs/overview.md'), 'utf8').match(/Measured on one (.+?) at the size/)?.[1];

// Other devices: docs/data/devices.toml lists them, docs/data/speed/<slug>.jsonl holds their survey rows. The
// reference device's numbers are the overview's (above); a survey device gets, per model and mode, its fastest
// passing row over all dtypes (the rule of the device pages: ok and not a golden fail), else the reason it has none.
type Cell = { ms: number; dtype: string } | { status: string };
type SurveyRow = {
	ref: string;
	task: string;
	mode: string;
	dtype: string;
	ms?: number;
	status: string;
	golden?: string;
	date: string;
};
const DTYPE: Record<string, string> = { float16: 'fp16', bfloat16: 'bf16', float32: 'fp32' };
const toml: Record<string, Record<string, string | boolean>> = {};
let section: Record<string, string | boolean> | null = null;
for (const line of readFileSync(resolve(repo, 'docs/data/devices.toml'), 'utf8').split('\n')) {
	const h = line.match(/^\[([\w-]+)\]\s*$/);
	if (h) toml[h[1]] = section = {};
	const kv = line.match(/^(\w+)\s*=\s*(?:"([^"]*)"|(true|false))\s*$/);
	if (kv && section) section[kv[1]] = kv[2] ?? kv[3] === 'true';
}
const modelIds = new Set(tasks.flatMap((t) => t.models.map((m) => m.id)));
// Survey rows use full timm ids (`alexnet.tv_in1k`), the overview the bare architecture (`alexnet`).
const modelId = (ref: string) => (modelIds.has(ref) ? ref : ref.split('.')[0]);
const devices = Object.entries(toml).map(([slug, d]) => {
	const base = {
		slug,
		name: String(d.name),
		backend: String(d.backend),
		memory: String(d.memory),
		details: String(d.details ?? ''),
		software: String(d.software ?? ''),
		reference: d.reference === true,
		page: DOCS + (d.reference === true ? 'benchmarks.md' : `devices/${slug}.md`)
	};
	if (base.reference) return { ...base, measured: null, tasks: tasks.map((t) => t.id), times: null };
	const rows = readFileSync(resolve(repo, `docs/data/speed/${slug}.jsonl`), 'utf8')
		.split('\n')
		.filter(Boolean)
		.map((l) => JSON.parse(l) as SurveyRow);
	const times: Record<string, { task: string; portable?: Cell; kernels?: Cell }> = {};
	for (const r of rows) {
		if (r.mode !== 'portable' && r.mode !== 'kernels') continue;
		const id = modelId(r.ref);
		if (!modelIds.has(id)) throw new Error(`${slug}: survey row for unknown model ${r.ref}`);
		const entry = (times[id] ??= { task: r.task });
		const prev = entry[r.mode];
		if (r.status === 'ok' && r.golden !== 'fail' && typeof r.ms === 'number') {
			if (!prev || !('ms' in prev) || r.ms < prev.ms) entry[r.mode] = { ms: r.ms, dtype: DTYPE[r.dtype] ?? r.dtype };
		} else if (!prev) entry[r.mode] = { status: r.golden === 'fail' ? 'golden fail' : r.status };
	}
	const dates = rows.map((r) => r.date).sort();
	return {
		...base,
		measured: { from: dates[0], to: dates.at(-1), rows: rows.length },
		tasks: TASK_ORDER_SYNC.filter((t) => Object.values(times).some((e) => e.task === t)),
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
		list.map((m) => [m.id, { task: m.task, tier: m.tier, code: m.code_licence, weights: m.weights_licence }])
	)
};
writeFileSync(out, JSON.stringify(data, null, '\t') + '\n');
console.log(
	`wrote ${out}: ${tasks.length} tasks, ${tasks.reduce((n, t) => n + t.models.length, 0)} timed rows, ` +
		`${list.length} models, ${devices.length} devices, commit ${commit}`
);
