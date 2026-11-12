// Model cards (/models/<family>): one JSON file per family, written by the fastforks repo's tools/site_data.py
// (`pnpm sync`). Loaded lazily so a page's bundle carries only its own family. Nothing here computes a measurement;
// the helpers below only pick, label and format rows.
import cardIndex from './data/cards/index.json';

export type Mode = 'original32' | 'original16' | 'portable32' | 'portable' | 'kernels';

export type SpeedRow = {
	ms: number;
	ms_min?: number;
	noise?: number;
	runs?: number;
	peak_alloc_mb?: number;
	peak_reserved_mb?: number | null;
	load_s?: number;
	first_call_s?: number;
	import_s?: number;
	scene?: string;
	date?: string;
	torch?: string;
	protocol?: string;
	dtype: string;
	note?: string;
	commit?: string;
};
export type ExtraRow =
	| { fails: string }
	| {
			ms: number;
			peak_alloc_mb: number | null;
			peak_reserved_mb: number | null;
			device_mb: number | null;
			engine_dtype: string | null;
			part: string;
			setup_s: number | null;
			date: string | null;
	  };
export type SpeedInput = {
	input: string;
	scene: string;
	standard: boolean;
	modes: Partial<Record<Mode, SpeedRow>>;
	oom: Mode[];
	compile?: ExtraRow;
	tensorrt?: ExtraRow;
	/** The original's network alone (pose: crops made untimed): fp32 / fp16. */
	original_network?: Partial<Record<'original32' | 'original16', SpeedRow & { timed: string }>>;
	/** Where our pose call spends its time (ms, a separate run): the GPU crop, the network (kernels: with the decode in
	 * one CUDA graph), the rest (decode, mapping back, input conversion). */
	sections?: Partial<
		Record<
			'portable' | 'kernels',
			{ ms: number; crop_ms: number; network_ms: number; rest_ms: number; network_has_decode: boolean }
		>
	>;
};
export type DeviceRow = {
	mode: string;
	dtype: string;
	status: string;
	golden: string | null;
	input: string | null;
	ms: number | null;
	memory_kind: string;
	alloc?: number | null;
	reserved?: number | null;
	footprint?: number | null;
	error: string | null;
};
export type DeviceRows = {
	slug: string;
	name: string;
	backend: string;
	torch: string;
	date: string;
	rows: DeviceRow[];
};
export type Metric = { key: string; format: string; optional: boolean; lower: boolean };
export type EvalRow = {
	dtype: string | null;
	tier: string | null;
	metrics: Record<string, number>;
	n: number | null;
	error: string | null;
	ms_per_img: number | null;
	peak_alloc_mb: number | null;
	peak_reserved_mb: number | null;
	gpu: string;
	torch: string | null;
	commit: string;
	date: string;
	how: string | null;
	note: string | null;
	/** The fastforks release this result first shipped in (results measured since the last release: the coming one). */
	version: string;
};
export type Dataset = {
	id: string;
	title: string;
	noun: string;
	metrics: Metric[];
	protocol: string;
	overlap: 'train' | 'unknown' | null;
	bad_thr: number | null;
	modes: Partial<Record<Mode | 'originalhalf' | 'originalcpu', EvalRow>>;
};
export type TrainingData = { id: string; name: string; licence?: string; commercial?: string; url?: string };
export type Licence = {
	code: string;
	code_class: string;
	weights: string;
	weights_assumed: boolean;
	evidence: string | null;
	training_data: TrainingData[];
	training_note: string | null;
	commercial: 'yes' | 'no' | 'unclear';
	reasons: string[];
	notes: string[];
};
export type WeightFile = {
	name: string;
	sha256: string;
	size: number | null;
	url: string | null;
	host: string | null;
	member: string | null;
	archive_size: number | null;
	mirror: string | null;
};
export type Variant = {
	id: string;
	/** The release whose package has this variant (the latest tag), or null: upcoming, only in the repository. */
	released: string | null;
	/** The fastforks release that added this variant (not released yet: the coming one). */
	added_in: string;
	ref: string;
	name: string;
	setting: string;
	default_tag: boolean;
	params: Record<string, unknown>;
	licence: Licence;
	weights: WeightFile[];
	input_size: string;
	tested_max: { size: string; alloc_mib: number; reserved_mib: number } | null;
	speed: { standard: string; inputs: SpeedInput[] };
	devices: DeviceRows[];
	quality: Dataset[];
	/** One rendered example output (tools/examples.py), or null when none is rendered yet. */
	example: Example | null;
};
export type Example = {
	/** The rendered output, or null where the output is text (classification). */
	image: string | null;
	input: { name: string; title: string; credit: string; licence: string; source: string };
	inputs: string[];
	top?: [string, number][];
	classes?: [string, number, [number, number, number]][];
	objects?: [string, number][];
	/** Matching: share of the first view's pixels with certainty above 0.5. */
	certain?: number;
	prompt?: string;
	mode?: string;
	dtype?: string;
	device?: string;
	date?: string;
};
export type Parity = {
	text: string;
	tolerance: Record<string, number | boolean>;
	relative: boolean;
	unit: string;
	validated: Record<
		string,
		{ mean: number; p99: number; gpu: string; torch: string; date: string | null; kernels: string[] } | null
	>;
};
export type Card = {
	family: string;
	task: string;
	name: string;
	plain: string;
	summary: string;
	tier: string;
	upstream: string;
	upstream_commit: string;
	original_is: string | null;
	papers: { title: string; url: string; date: string; venue: string; variants: string[] }[];
	official: { repo: string; framework: string; reason: string; variants: string[] }[];
	modes: string[];
	portable_dtype: string;
	kernels_dtype: string;
	kernel_libs: string[];
	mps_kernel_libs: string[];
	mps_dtypes: string[];
	no_kernels_reason: string;
	options: { name: string; default: unknown; bounds: string; effect: string }[];
	outputs: { name: string; extra: boolean }[];
	output_info: Record<string, unknown>;
	licence_files: string[];
	licence_notes: string[];
	limitations: string[];
	task_io: string;
	install: { extras: string[]; noncommercial_weights: string[] };
	variants: Variant[];
	parity: Parity;
};
export type CardIndex = {
	reference: { slug: string; name: string; software: string };
	/** The latest release tag, without the v. */
	release: string | null;
	families: {
		family: string;
		task: string;
		name: string;
		variants: { id: string; name: string; released: string | null; added_in: string }[];
	}[];
};

/** Variants (by id and by name, the overview's key) that are not in the latest release yet. */
export const RELEASE = (cardIndex as CardIndex).release;
export const UPCOMING = new Set(
	(cardIndex as CardIndex).families.flatMap((f) => f.variants.filter((v) => !v.released).flatMap((v) => [v.id, v.name]))
);

const files = import.meta.glob<Card>(['./data/cards/*.json', '!./data/cards/index.json'], { import: 'default' });
const PREFIX = './data/cards/';

export const cardSlugs = () => Object.keys(files).map((k) => k.slice(PREFIX.length, -'.json'.length));

export async function loadCard(family: string): Promise<Card | null> {
	const f = files[`${PREFIX}${family}.json`];
	return f ? await f() : null;
}

/** The modes of the speed and quality tables, in their fixed order. */
export const MODES: { key: Mode; label: string; group: 'original' | 'ours' }[] = [
	{ key: 'original32', label: 'Original fp32', group: 'original' },
	{ key: 'original16', label: 'Original fp16', group: 'original' },
	{ key: 'portable32', label: 'Portable fp32', group: 'ours' },
	{ key: 'portable', label: 'Portable', group: 'ours' },
	{ key: 'kernels', label: 'Kernels', group: 'ours' }
];

export const DTYPE: Record<string, string> = { float32: 'fp32', float16: 'fp16', bfloat16: 'bf16', default: '' };
export const dt = (d: string | null | undefined) => (d ? (DTYPE[d] ?? d) : '');

/** A time to 3 significant digits (whole ms from 1000), like the docs. */
export function ms(x: number | null | undefined): string {
	if (x === null || x === undefined || !Number.isFinite(x)) return '–';
	if (x === 0) return '0';
	const digits = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x))));
	return x.toFixed(digits);
}

export const mib = (x: number | null | undefined) =>
	x === null || x === undefined ? '–' : x >= 10240 ? `${(x / 1024).toFixed(1)} GiB` : `${x.toLocaleString('en')} MiB`;

export function bytes(n: number | null): string {
	if (n === null) return 'size not recorded';
	const units = ['B', 'KB', 'MB', 'GB'];
	let i = 0;
	let x = n;
	while (x >= 1000 && i < units.length - 1) {
		x /= 1000;
		i++;
	}
	return `${x.toFixed(x >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** A metric value in the docs' Python format (`{:.2f}`). */
export function fmt(format: string, x: number | undefined): string {
	if (x === undefined) return '–';
	const d = format.match(/\.(\d+)f/);
	return d ? x.toFixed(Number(d[1])) : String(x);
}

/** Readable metric names; the keys are the eval rows' own. */
export const METRIC_LABEL: Record<string, string> = {
	bad: 'bad px %',
	epe: 'EPE',
	rel_absrel: 'AbsRel',
	rel_d1: 'δ1',
	absrel: 'AbsRel',
	d125: 'δ1.25 %',
	mae_mm: 'MAE mm',
	miou: 'mIoU %',
	aacc: 'aAcc %',
	person_iou: 'person IoU %',
	box_map: 'box mAP',
	mask_map: 'mask mAP',
	person_ap: 'person AP',
	miou_best: 'mIoU best of 3 %',
	miou_single: 'mIoU single %',
	top1: 'top-1 %',
	top5: 'top-5 %',
	keypoint_ap: 'keypoint AP',
	fl_all: 'Fl-all %',
	auc5: 'AUC@5°',
	auc10: 'AUC@10°',
	auc20: 'AUC@20°'
};

/** The faster original run (fp16 or fp32): what the docs' speed-ups use, a conservative headline. */
export function fasterOriginal(s: SpeedInput): { key: Mode; row: SpeedRow } | null {
	let best: { key: Mode; row: SpeedRow } | null = null;
	for (const key of ['original16', 'original32'] as const) {
		const row = s.modes[key];
		if (row && (!best || row.ms < best.row.ms)) best = { key, row };
	}
	return best;
}

/** The newest of some versions ("0.1.1" > "0.1.0"), or null for none. */
export function newestVersion(versions: string[]): string | null {
	const key = (v: string) => v.split('.').map(Number);
	return versions.reduce<string | null>((best, v) => {
		if (best === null) return v;
		const [a, b] = [key(v), key(best)];
		const i = a.findIndex((x, j) => x !== b[j]);
		return i >= 0 && a[i] > b[i] ? v : best;
	}, null);
}
