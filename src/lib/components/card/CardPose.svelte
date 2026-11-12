<script lang="ts">
	// Relative pose from a matcher's output: fastforks' GPU RANSAC against the usual CPU solvers, same matches, same machine.
	// Numbers: fastforks docs/data/relative_pose_eval.jsonl (protocol in docs/data/README.md), commit f816588a.
	const ROWS = [
		{ solver: 'fastforks estimate_pose, kernels', where: 'GPU, batches of 500 pairs', auc: [68.63, 80.73, 88.86], pps: 18235, ours: true },
		{ solver: 'fastforks estimate_pose, portable', where: 'GPU, batches of 500 pairs', auc: [68.49, 80.61, 88.71], pps: 359, ours: false },
		{ solver: 'PoseLib 2.0.5', where: 'CPU, 16 processes', auc: [68.85, 80.89, 88.97], pps: 222, ours: false },
		{ solver: 'OpenCV RANSAC', where: 'CPU, 16 processes', auc: [62.87, 76.9, 86.42], pps: 327, ours: false }
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
				<th class="num">Pose AUC@5 / @10 / @20</th>
				<th class="num">Pairs per second</th>
			</tr>
		</thead>
		<tbody>
			{#each ROWS as r (r.solver)}
				<tr>
					<th scope="row" class:strong={r.ours}>{r.solver}</th>
					<td>{r.where}</td>
					<td class="num">{r.auc.map((x) => x.toFixed(1)).join(' / ')}</td>
					<td class="num" class:strong={r.ours}>{r.pps.toLocaleString('en-US')}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
<p class="fine">
	MegaDepth-1500, RoMa v2 matches (5000 per pair), 5 samplings, the same matches for every solver, on one machine: RTX
	5060 Ti and a Ryzen 7 5800X (16 threads). Pairs per second is wall-clock throughput over all 7500 poses: the CPU solvers
	run one pair per call in 16 single-threaded processes, the GPU solver takes 500 pairs per call. One pair alone takes
	about 1.7 ms with the kernels, 42 ms with PoseLib and 24 ms with OpenCV. The accuracy table above stays on OpenCV
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
