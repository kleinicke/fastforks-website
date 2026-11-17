<script lang="ts">
	import DocPage from '#lib/components/DocPage.svelte';

	const doc = {
		title: 'Pipelines',
		description:
			'fastforks is more than single models: structure from motion, calibrated stereo with rectification, two-view and absolute pose with GPU RANSAC, and single-image camera calibration.'
	};
</script>

<DocPage {doc}>
	{#snippet eyebrow()}Docs{/snippet}
	{#snippet intro()}
		<p>
			Besides the model families, fastforks ships a few pipelines that chain models and geometry on the GPU. They
			are not entries in the model table; this page is where to find them.
		</p>
	{/snippet}

	<h2 id="sfm">Structure from motion</h2>
	<p>
		An image folder becomes a COLMAP database, optionally a sparse reconstruction: <a href="/tasks/retrieval"
			>image retrieval</a
		>
		picks the pairs, a <a href="/tasks/matching">matcher</a> finds correspondences, a GPU RANSAC verifies them and
		pycolmap maps the result. Matcher choice, speed and accuracy on Mip-NeRF 360 and ETH3D are in the guide.
	</p>
	<pre><code>fastforks sfm scene/images scene/out --reconstruct</code></pre>
	<p><a href="/sfm">Structure from motion guide →</a></p>

	<h2 id="stereo">Calibrated stereo and rectification</h2>
	<p>
		Raw, possibly distorted pairs and a calibration file (OpenCV, KITTI, OAK-D, ZED, Aria and more) go in; a <a
			href="/tasks/stereo">stereo model</a
		> runs on the rectified pair and the result comes back as depth and a point cloud at the original left pixels. The
		rectification itself (camera models, agreement with OpenCV, speed) is a separate module.
	</p>
	<pre><code>fastforks stereo run left/ right/ --model fast-acvnet-generalization --rig calib.yaml --out depth/</code></pre>
	<p>
		<a href="/stereo-geometry">Stereo geometry and rectification →</a> ·
		<a href="/usage#calibrated-stereo-in-one-call">Calibrated stereo in one call →</a>
	</p>

	<h2 id="pose">Two-view and absolute pose (GPU RANSAC)</h2>
	<p>
		Matches from any <a href="/tasks/matching">matcher</a> become a relative pose (5-point essential matrix), a
		fundamental matrix (7-point) or an absolute pose from 2D-3D matches (P3P), with batched RANSAC following
		OpenCV's protocol. Plain PyTorch or one CUDA kernel library (<code>mode="kernels"</code>). The same RANSAC
		verifies the pairs in the structure-from-motion pipeline.
	</p>
	<pre><code>from fastforks.matching import estimate_pose
pose = estimate_pose(points1, points2, K1, K2)  # pose.R, pose.t, pose.inliers</code></pre>
	<p><a href="/usage">Matching example in the usage guide →</a></p>

	<h2 id="calibration">Camera calibration</h2>
	<p>
		There is no checkerboard calibrator. <a href="/tasks/calibration">Calibration models</a> estimate intrinsics, gravity,
		roll, pitch and field of view from a single image; the stereo geometry guide reads calibration files that come from
		a calibration tool.
	</p>
</DocPage>
