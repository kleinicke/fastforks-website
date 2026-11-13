import data from './data/models.json';

/** Canonical origin; VITE_SITE_URL overrides it (e.g. for a staging copy). */
export const SITE_URL: string = import.meta.env.VITE_SITE_URL || 'https://fastforks.dev';

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
	matching: {
		name: 'Dense matching',
		pkg: 'matching',
		call: 'model(image_a, image_b)',
		result: 'warp + certainty per pixel, sampled matches, relative pose'
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
	pose: {
		name: 'Pose estimation',
		pkg: 'pose',
		call: 'model(image, boxes=…)',
		result: 'keypoints + scores per person'
	},
	flow: { name: 'Optical flow', pkg: 'flow', call: 'model(frame1, frame2)', result: 'flow (dx, dy per pixel)' },
	features: {
		name: 'Feature backbones',
		pkg: 'features',
		call: 'model(image)',
		result: 'token features, image embedding'
	},
	matting: { name: 'Matting', pkg: 'matting', call: 'model(image)', result: 'foreground alpha per pixel' },
	retrieval: { name: 'Image retrieval', pkg: 'retrieval', call: 'model(image)', result: 'global descriptor' },
	calibration: {
		name: 'Camera calibration',
		pkg: 'calibration',
		call: 'model(image)',
		result: 'intrinsics, gravity, roll, pitch'
	},
	tracking: {
		name: 'Point tracking',
		pkg: 'tracking',
		call: 'model(video, queries)',
		result: 'tracks + visibility per frame'
	},
	interpolation: {
		name: 'Frame interpolation',
		pkg: 'interpolation',
		call: 'model(frame1, frame2)',
		result: 'the frame in between'
	},
	restoration: {
		name: 'Image restoration',
		pkg: 'restoration',
		call: 'model(image)',
		result: 'restored / upscaled image'
	}
};

export const TASK_ORDER = [
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
	'retrieval',
	'calibration',
	'matting',
	'flow',
	'tracking',
	'interpolation',
	'restoration'
];

export { data };

export const fmtMs = (ms: number | null) => (ms === null ? '–' : ms.toFixed(ms >= 100 ? 0 : 1));

/** `training`: the card's training dataset ids (`fastforks list`'s training_data). */
type Licence = { task: string; tier: string; code: string; weights: string; training?: string[] };
const LICENCES = data.licences as Record<string, Licence>;
const bare = (k: string) => k.split('@')[0];

/** Licence entry for a model id. Registry keys carry a version (`id@1`); timm ids also a tag (`alexnet.tv_in1k@1`). */
export const licenceOf = (id: string): Licence | undefined =>
	LICENCES[id] ??
	Object.entries(LICENCES).find(([k]) => bare(k) === id)?.[1] ??
	Object.entries(LICENCES).find(([k]) => bare(k).split('.')[0] === id)?.[1];

type Cell =
	| { ms: number; dtype: string; alloc: number | null; reserved: number | null }
	| { status: string; why?: string };
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
	/** The same chip's CPU cores, where they were surveyed too (Apple silicon): their portable time is `times[id].cpu`. */
	cpu: { name: string; details: string } | null;
	times: Record<string, { task: string; original?: Cell; portable?: Cell; kernels?: Cell; cpu?: Cell }> | null;
};
export const DEVICES = data.devices as Device[];
export const REFERENCE = DEVICES.find((d) => d.reference)!;

/** Peak MiB of one run; reserved is null where only a process footprint exists (Apple). */
export type Mem = { alloc: number; reserved: number | null };

/** One model's timings on one device. `*_note` says why a time is missing (unsupported, failed, OOM, not tested). */
export type Timing = Pick<Model, 'id' | 'doc' | 'commercial'> & {
	original_ms: number | null;
	original_note: string | null;
	/** Why the authors' code did not run here, e.g. a CUDA-only extension. */
	original_why: string | null;
	portable_ms: number | null;
	/** Portable on the same chip's CPU cores (only where `device.cpu`); `cpu_note` its dtype or why it is missing. */
	cpu_ms: number | null;
	cpu_note: string | null;
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
// For the authors' code "unsupported" means it cannot run on this device at all (CUDA-only extensions, MPS limits).
const originalNote = (c: Cell) => ('status' in c && c.status === 'unsupported' ? 'incompatible' : note(c));

/** The models of a task on a device: the reference device has the overview's numbers, a survey device its own. */
export function timings(device: Device, task: Task): Timing[] {
	if (!device.times)
		return task.models.map(
			(m) =>
				({ ...m, original_why: null, cpu_ms: null, cpu_note: null, portable_note: null, kernels_note: null }) as Timing
		);
	const times = device.times;
	const ranOriginal = Object.values(times).some((t) => t.original);
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
				// The authors' code where it was run on this device (Apple silicon); 'not run' where it was run for other models.
				original_ms: ms(t.original),
				original_note: t.original ? originalNote(t.original) : ranOriginal ? 'not run' : null,
				original_why: t.original && 'why' in t.original ? (t.original.why ?? null) : null,
				portable_ms: p,
				cpu_ms: ms(t.cpu),
				cpu_note: device.cpu ? (t.cpu ? note(t.cpu) : 'not run') : null,
				kernels_ms: k,
				portable_note: note(t.portable),
				kernels_note: note(t.kernels),
				speedup: p !== null && k !== null ? Math.round((p / k) * 10) / 10 : null,
				speedup_vs: p !== null && k !== null ? 'portable' : null,
				peak_mib: null,
				mem: { original: mem(t.original), portable: mem(t.portable), kernels: mem(t.kernels) },
				compile: null,
				tensorrt: null,
				accuracy: null,
				accuracy_metric: null
			};
		});
}

/** A device's name without the vendor prefix, for narrow column headers. */
export const shortName = (d: Device) => d.name.replace(/^NVIDIA /, '');
