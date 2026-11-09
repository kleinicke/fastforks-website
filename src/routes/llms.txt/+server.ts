// llms.txt (https://llmstxt.org): a plain-markdown index of the site for language models and coding agents.
import { data, LINKS, SITE_URL, TASK_META, TASK_ORDER } from '#lib/site.ts';
import { docPages } from '#lib/pages.ts';

export const prerender = true;

export function GET() {
	const t = data.totals;
	const link = (p: { path: string; title: string; description: string }) =>
		`- [${p.title}](${SITE_URL}${p.path})${p.description ? `: ${p.description}` : ''}`;
	// Task pages share a boilerplate second sentence: keep the model count only.
	const short = (p: { path: string; title: string; description: string }) => ({
		...p,
		description: p.description.split('. ')[0]
	});
	const of = (kind: string) => docPages.filter((p) => p.kind === kind);
	const families = TASK_ORDER.flatMap((task) => {
		const rows = of('models').filter((p) => p.task === task);
		return rows.length ? [`\n### ${TASK_META[task].name}\n`, ...rows.map(link)] : [];
	});
	const body = `# fastforks

> Faster ports of ${t.models} published vision models (stereo matching, monocular and multi-view depth, classification,
> semantic and promptable segmentation (SAM), object detection, feature backbones such as DINOv2/DINOv3) behind one
> Python API. Each model loads the authors' checkpoint and has a plain PyTorch port checked against the authors' code
> ("portable") plus CUDA and Apple Metal kernels ("kernels"): ${t.vs_original.median}x faster than the original code
> in the median over ${t.vs_original.models} models on an ${data.source.reference_gpu}, ${t.vs_original.max}x at best.

Install with \`pip install fastforks\` (all models) or \`pip install fastforks-core\` (only models with permissive code).
It uses the PyTorch already installed.

\`\`\`python
from fastforks import stereo, depth

model = stereo.load("igev-stereo-sceneflow")
result = model("left.png", "right.png")
result.disparity  # [H, W] float32 tensor, pixels

depth.load("depth-anything-v2-s")("room.jpg").inverse_depth
\`\`\`

Source: ${LINKS.github} · PyPI: ${LINKS.pypi} · Model table: ${SITE_URL}/models

## Guides

${of('pages').map(link).join('\n')}

## Tasks

${of('tasks').map(short).map(link).join('\n')}

## Model families
${families.join('\n')}

## Devices

${of('devices')
	.map((p) => `- [${p.title}](${SITE_URL}${p.path}): speed tables`)
	.join('\n')}
`;
	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
