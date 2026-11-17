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

export const TASK_META: Record<string, { name: string; pkg: string; call: string; result: string; about: string }> = {
	stereo: {
		name: 'Stereo matching',
		pkg: 'stereo',
		call: 'model(left, right)',
		result: 'disparity',
		about:
			'Finds, for every pixel of the left image, how far it shifts in the right image of a calibrated pair; that shift (the disparity) gives depth.'
	},
	depth: {
		name: 'Monocular depth',
		pkg: 'depth',
		call: 'model(image)',
		result: 'depth or inverse depth',
		about: 'Estimates how far away every pixel is from a single image, either as relative depth or in metres.'
	},
	multiview: {
		name: 'Multi-view depth',
		pkg: 'multiview',
		call: 'model(images)',
		result: 'depth, points and cameras per view',
		about: 'Reconstructs depth, 3D points and camera poses from several images of the same scene at once.'
	},
	matching: {
		name: 'Dense matching',
		pkg: 'matching',
		call: 'model(image_a, image_b)',
		result: 'warp + certainty per pixel, sampled matches, relative pose',
		about:
			'Finds which pixel in image B belongs to each pixel in image A, with a certainty, across large changes of view; enough for relative camera pose.'
	},
	classification: {
		name: 'Classification',
		pkg: 'classification',
		call: 'model(image)',
		result: 'logits, top(k)',
		about: 'Names what is in an image: one score per class from a fixed label set such as ImageNet.'
	},
	segmentation: {
		name: 'Semantic segmentation',
		pkg: 'segmentation',
		call: 'model(image)',
		result: 'label map',
		about: 'Labels every pixel with a class (road, person, sky, …) so the image splits into regions.'
	},
	promptable_segmentation: {
		name: 'Promptable segmentation',
		pkg: 'promptable_segmentation',
		call: 'model(image, input_points=…)',
		result: 'masks + IoU scores (SAM, SAM 2, SAM 3 text prompts)',
		about: 'Cuts out the object you point at: click, box or text prompt in, a mask out.'
	},
	detection: {
		name: 'Object detection',
		pkg: 'detection',
		call: 'model(image)',
		result: 'boxes, labels, scores',
		about: 'Finds objects in an image and returns a box, a label and a score for each.'
	},
	pose: {
		name: 'Pose estimation',
		pkg: 'pose',
		call: 'model(image, boxes=…)',
		result: 'keypoints + scores per person',
		about: 'Finds people (or faces) in an image and returns their body or face keypoints.'
	},
	flow: {
		name: 'Optical flow',
		pkg: 'flow',
		call: 'model(frame1, frame2)',
		result: 'flow (dx, dy per pixel)',
		about: 'Estimates how every pixel moved between two video frames, as a motion vector per pixel.'
	},
	features: {
		name: 'Feature backbones',
		pkg: 'features',
		call: 'model(image)',
		result: 'token features, image embedding',
		about:
			'Turns an image into reusable feature vectors (per patch and per image) for retrieval, matching, segmentation or any downstream head.'
	},
	ocr: {
		name: 'Text recognition (OCR)',
		pkg: 'ocr',
		call: 'model(image)',
		result: 'the text in the image',
		about: 'Reads text from images: recognises a cropped word or finds and reads every line of text in a scene.'
	},
	matting: {
		name: 'Matting',
		pkg: 'matting',
		call: 'model(image)',
		result: 'foreground alpha per pixel',
		about:
			'Separates a foreground (person, object) from its background with a soft alpha value per pixel, hair included.'
	},
	retrieval: {
		name: 'Image retrieval',
		pkg: 'retrieval',
		call: 'model(image)',
		result: 'global descriptor',
		about:
			'Turns an image into one compact descriptor so that pictures of the same place or object can be found in a large collection.'
	},
	calibration: {
		name: 'Camera calibration',
		pkg: 'calibration',
		call: 'model(image)',
		result: 'intrinsics, gravity, roll, pitch',
		about:
			'Recovers camera intrinsics (focal length, distortion) and orientation (gravity, roll, pitch) from a single image.'
	},
	tracking: {
		name: 'Point tracking',
		pkg: 'tracking',
		call: 'model(video, queries)',
		result: 'tracks + visibility per frame',
		about:
			'Follows chosen points through a video and says where each one is, and whether it is visible, in every frame.'
	},
	interpolation: {
		name: 'Frame interpolation',
		pkg: 'interpolation',
		call: 'model(frame1, frame2)',
		result: 'the frame in between',
		about: 'Creates the frame that lies between two video frames, for slow motion and higher frame rates.'
	},
	restoration: {
		name: 'Image restoration',
		pkg: 'restoration',
		call: 'model(image)',
		result: 'restored / upscaled image',
		about: 'Repairs or upscales an image: super-resolution, face restoration, inpainting.'
	},
	edges: {
		name: 'Edges and lines',
		pkg: 'edges',
		call: 'model(image)',
		result: 'edge map, or line segments for M-LSD',
		about:
			'Draws the lines of an image: edge maps, line art and straight line segments, the preprocessors ControlNet takes as input.'
	},
	volume: {
		name: '3D volume segmentation',
		pkg: 'volume',
		call: 'model(volume, spacing)',
		result: 'a label per voxel',
		about: 'Labels organs and structures in 3D medical scans (CT, MR) voxel by voxel.'
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
	'ocr',
	'pose',
	'classification',
	'features',
	'retrieval',
	'calibration',
	'matting',
	'flow',
	'tracking',
	'interpolation',
	'restoration',
	'edges',
	'volume'
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
	year: number | null;
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
				year: null,
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

// What each CUDA / Metal kernel library is, in plain words (shown on the model page; the names are internal).
export const KERNEL_LIBS: Record<string, string> = {
	fastbb:
		'fast backbone kernels: flash attention, window attention, instance norm and rotary embeddings for ViT and similar backbones',
	dpt_fused: 'fused fp16 matrix multiplies and convolutions for DINOv2 backbones and DPT depth heads',
	cudnn_hacc: 'convolutions with fp16 accumulation (cuDNN)',
	cutlass_conv: 'CUTLASS convolutions with the recurrent update (GRU) fused in',
	deform_conv: 'deformable convolution fused into one kernel',
	fvm_conv: 'fused convolutions for image classifiers',
	fvm_extra: 'fused transformer row operations (rotary split, SwiGLU with LayerNorm)',
	fvm_mb: 'fused MBConv blocks (MobileNet and EfficientNet families)',
	fvm_r3: 'further fused classifier blocks',
	fvm_seg: 'fused kernels for Mask2Former and OneFormer',
	seg_conv: 'fused convolutions for segmentation CNNs',
	seg_up: 'fused resize and argmax of segmentation scores',
	stereo_ops: 'stereo building blocks: cost volume, soft-argmax, upsampling',
	igev: 'IGEV stereo: convolution epilogues, correlation lookups, GRU gates',
	igevpp: 'IGEV++ and GREAT-IGEV: correlation volume, lookups, attention',
	raft: 'RAFT-Stereo: normalisation, GRU gates, correlation, upsampling',
	raft_flow: 'RAFT optical flow kernels',
	fs: 'FoundationStereo: fused epilogues, geometry lookups, GRU gates',
	fs_cutlass: 'FoundationStereo: CUTLASS convolutions with fused epilogues',
	ffs_cutlass: 'Fast-FoundationStereo: fused CUTLASS convolutions',
	cfs: 'C-FoundationStereo-S transformer kernels',
	crestereo: 'CREStereo: fused adaptive group correlation',
	hitnet: 'HITNet: cost initialisation, tile and warp matching',
	hitnet_conv: 'HITNet: fused convolutions',
	mocha: 'MoCha-Stereo: fused LSTM gate update',
	mvsanywhere: 'MVSAnywhere: fused cost-volume MLP',
	patchmatchnet: 'PatchmatchNet: fused cost, weights and aggregation',
	s2m2: 'S2M2: attention and optimal-transport kernels',
	s2m2_cutlass: 'S2M2: CUTLASS convolutions',
	romav2: 'RoMa v2: local correlation without the sampled window tensor',
	sparse_conv: 'MoGe-3: sparse 3D convolution',
	vggt_omega: 'VGGT-Omega: fused LayerNorm, residual and rotary kernels',
	vol_norm: 'instance norm and LeakyReLU on 3D volumes',
	gsraster: '3D Gaussian splatting rasteriser',
	ransac: 'RANSAC for matching and pose estimation',
	flow_metal: 'Metal: RAFT correlation lookup without a volume',
	pose_metal: 'Metal: top-down pose decoders and crops',
	sparse_metal: 'Metal: sparse 3D convolution',
	stereo_metal: 'Metal: stereo kernels',
	vggt_metal: 'Metal: VGGT rotary embeddings',
	vit_metal: 'Metal: vision transformer rotary embeddings'
};

/** Link to a model's page with the checkpoint preselected; the query goes before a `#section` anchor. */
export const modelHref = (doc: string, id: string) => {
	const [path, hash] = doc.split('#');
	return `${path}?variant=${encodeURIComponent(id)}${hash ? `#${hash}` : ''}`;
};
