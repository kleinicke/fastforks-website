<script lang="ts">
	// Relative pose from a matcher's output: fastforks' GPU RANSAC against the usual CPU solvers, same matches, same machine.
	// Numbers: fastforks docs/data/relative_pose_eval.jsonl (protocol in docs/data/README.md), commit 1ca41bd9. Each
	// solver at its best inlier threshold: 1.0 px for ours and PoseLib, 0.5 px for OpenCV and USAC.
	const ROWS = [
		{ solver: 'fastforks estimate_pose, kernels', where: 'GPU, batches of 500 pairs', px: 1, auc: [69.87, 81.48, 89.33], pps: 18446, ours: true },
		{ solver: 'fastforks estimate_pose, portable', where: 'GPU, batches of 500 pairs', px: 1, auc: [69.61, 81.17, 89.14], pps: 418, ours: false },
		{ solver: 'PoseLib 2.0.5', where: 'CPU, 16 processes', px: 1, auc: [69.96, 81.58, 89.47], pps: 325, ours: false },
		{ solver: 'OpenCV USAC (MAGSAC++)', where: 'CPU, 16 processes', px: 0.5, auc: [65.7, 78.64, 87.34], pps: 271, ours: false },
		{ solver: 'OpenCV RANSAC', where: 'CPU, 16 processes', px: 0.5, auc: [62.87, 76.9, 86.42], pps: 323, ours: false }
	];
</script>

<p>
	A dense matcher is usually followed by RANSAC on its matches to get the camera motion. fastforks does that step on the
	GPU too: <code>result.matches(n)</code> samples matched points where the model is certain, and
	<code>matching.estimate_pose</code> runs essential-matrix RANSAC on them, many image pairs per call, with no copy to
	the CPU. Like the models it has a <code>portable</code> (plain PyTorch) and a <code>kernels</code> (CUDA) backend.
</p>
<div class="table">
	<table>
		<thead>
			<tr>
				<th>Solver</th>
				<th>Runs on</th>
				<th class="num">Threshold (px)</th>
				<th class="num">Pose AUC@5 / @10 / @20</th>
				<th class="num">Pairs per second</th>
			</tr>
		</thead>
		<tbody>
			{#each ROWS as r (r.solver)}
				<tr>
					<th scope="row" class:strong={r.ours}>{r.solver}</th>
					<td>{r.where}</td>
					<td class="num">{r.px.toFixed(1)}</td>
					<td class="num">{r.auc.map((x) => x.toFixed(1)).join(' / ')}</td>
					<td class="num" class:strong={r.ours}>{r.pps.toLocaleString('en-US')}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
<p class="fine">
	MegaDepth-1500, RoMa v2 matches (5000 per pair), 5 samplings, the same matches for every solver, on one machine: RTX
	5060 Ti and a Ryzen 7 5800X (16 threads). Each solver runs at the inlier threshold where it is most accurate. Pairs per second is wall-clock throughput over all 7500 poses: the CPU solvers
	run one pair per call in 16 single-threaded processes, the GPU solver takes 500 pairs per call. One pair alone takes
	about 1.7 ms with the kernels, 29 ms with PoseLib and 24 ms with OpenCV RANSAC on one core. The accuracy table above stays on OpenCV
	RANSAC, as in the papers, so it is comparable with published numbers; this table is the only place the GPU solver is
	used.
</p>

<style>
	.strong {
		font-weight: 700;
	}
	.fine {
		color: var(--muted);
		font-size: 0.85rem;
	}
</style>
