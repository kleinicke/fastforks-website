import data from './data/models.json';

/** Canonical origin. Set VITE_SITE_URL=https://fastforks.dev at build time once the domain moves. */
export const SITE_URL: string = import.meta.env.VITE_SITE_URL || 'https://fastforks.f-kleinicke.de';

export const LINKS = {
	github: 'https://github.com/kleinicke/fastforks',
	usage: '/usage',
	benchmarks: '/benchmarks',
	export: '/export',
	otherGpus: '/other-gpus',
	pypi: 'https://pypi.org/project/fastforks/',
	author: 'https://f-kleinicke.de/',
	impressum: '/impressum',
	datenschutz: '/datenschutz'
};

export type Model = (typeof data.tasks)[number]['models'][number];
export type Task = (typeof data.tasks)[number];

export const TASK_META: Record<string, { name: string; pkg: string; call: string; result: string }> = {
	stereo: { name: 'Stereo matching', pkg: 'stereo', call: 'model(left, right)', result: 'disparity' },
	depth: { name: 'Monocular depth', pkg: 'depth', call: 'model(image)', result: 'depth or inverse depth' },
	multiview: {
		name: 'Multi-view depth',
		pkg: 'multiview',
		call: 'model(images)',
		result: 'depth, points and cameras per view'
	},
	classification: { name: 'Classification', pkg: 'classification', call: 'model(image)', result: 'logits, top(k)' },
	segmentation: { name: 'Semantic segmentation', pkg: 'segmentation', call: 'model(image)', result: 'label map' },
	promptable_segmentation: {
		name: 'Promptable segmentation',
		pkg: 'promptable_segmentation',
		call: 'model(image, input_points=…)',
		result: 'masks + IoU scores (SAM, SAM 2, SAM 3 text prompts)'
	},
	detection: { name: 'Object detection', pkg: 'detection', call: 'model(image)', result: 'boxes, labels, scores' },
	features: {
		name: 'Feature backbones',
		pkg: 'features',
		call: 'model(image)',
		result: 'token features, image embedding'
	}
};

export const TASK_ORDER = [
	'stereo',
	'depth',
	'multiview',
	'promptable_segmentation',
	'segmentation',
	'detection',
	'classification',
	'features'
];

export { data };

export const fmtMs = (ms: number | null) => (ms === null ? '–' : ms.toFixed(ms >= 100 ? 0 : 1));

type Licence = { task: string; tier: string; code: string; weights: string };
const LICENCES = data.licences as Record<string, Licence>;
const bare = (k: string) => k.split('@')[0];

/** Licence entry for a model id. Registry keys carry a version (`id@1`); timm ids also a tag (`alexnet.tv_in1k@1`). */
export const licenceOf = (id: string): Licence | undefined =>
	LICENCES[id] ??
	Object.entries(LICENCES).find(([k]) => bare(k) === id)?.[1] ??
	Object.entries(LICENCES).find(([k]) => bare(k).split('.')[0] === id)?.[1];

type Cell = { ms: number; dtype: string; alloc: number | null; reserved: number | null } | { status: string };
export type Device = {
	slug: string;
	name: string;
	backend: string;
	memory: string;
	details: string;
	software: string;
	reference: boolean;
	page: string;
	measured: { from: string; to: string; rows: number } | null;
	/** `torch-peak` (allocated / reserved by PyTorch) or `process-footprint` (Apple: the whole process). */
	memory_kind: string | null;
	tasks: string[];
	times: Record<string, { task: string; portable?: Cell; kernels?: Cell }> | null;
};
export const DEVICES = data.devices as Device[];
export const REFERENCE = DEVICES.find((d) => d.reference)!;

/** Peak MiB of one run; reserved is null where only a process footprint exists (Apple). */
export type Mem = { alloc: number; reserved: number | null };

/** One model's timings on one device. `*_note` says why a time is missing (unsupported, failed, OOM, not tested). */
export type Timing = Pick<Model, 'id' | 'doc' | 'commercial'> & {
	original_ms: number | null;
	original_note: string | null;
	portable_ms: number | null;
	kernels_ms: number | null;
	portable_note: string | null;
	kernels_note: string | null;
	speedup: number | null;
	speedup_vs: string | null;
	peak_mib: number | null;
	/** Peak MiB per backend: the docs' variant tables on the reference GPU, the fastest survey row elsewhere. */
	mem: Record<'original' | 'portable' | 'kernels', Mem | null> | null;
	/** Reference GPU only (null elsewhere): torch.compile, the TensorRT engine and the golden-check accuracy. */
	compile: Extra;
	tensorrt: Extra;
	accuracy: string | null;
	accuracy_metric: string | null;
};
/** A time, or why it failed; `part` = the part of the call a TensorRT engine runs, if not all; `prep_s` = one-time cost. */
export type Extra = { ms: number | null; fails: string | null; part: string | null; prep_s: number | null } | null;

const ms = (c: Cell | undefined) => (c && 'ms' in c ? c.ms : null);
const mem = (c: Cell | undefined) =>
	c && 'ms' in c && c.alloc !== null ? { alloc: c.alloc, reserved: c.reserved } : null;
// "unsupported" = no kernels path on that backend: kernels were only written where they beat portable there.
const STATUS: Record<string, string> = { oom: 'OOM', unsupported: 'portable only' };
const note = (c: Cell | undefined) => (!c ? 'not tested' : 'status' in c ? (STATUS[c.status] ?? c.status) : c.dtype);

/** The models of a task on a device: the reference device has the overview's numbers, a survey device its own. */
export function timings(device: Device, task: Task): Timing[] {
	if (!device.times) return task.models.map((m) => ({ ...m, portable_note: null, kernels_note: null }) as Timing);
	const times = device.times;
	return task.models
		.filter((m) => times[m.id])
		.map((m) => {
			const t = times[m.id];
			const p = ms(t.portable);
			const k = ms(t.kernels);
			return {
				id: m.id,
				doc: m.doc,
				commercial: m.commercial,
				original_ms: null,
				original_note: null,
				portable_ms: p,
				kernels_ms: k,
				portable_note: note(t.portable),
				kernels_note: note(t.kernels),
				speedup: p !== null && k !== null ? Math.round((p / k) * 10) / 10 : null,
				speedup_vs: p !== null && k !== null ? 'portable' : null,
				peak_mib: null,
				mem: { original: null, portable: mem(t.portable), kernels: mem(t.kernels) },
				compile: null,
				tensorrt: null,
				accuracy: null,
				accuracy_metric: null
			};
		});
}

/** A device's name without the vendor prefix, for narrow column headers. */
export const shortName = (d: Device) => d.name.replace(/^NVIDIA /, '');
