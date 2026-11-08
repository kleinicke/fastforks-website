'use strict';

// Self-hosted Plausible (analytics.re4vive.com, site fastforks.dev), counted only on fastforks.dev: the *.pages.dev deploy
// previews and local builds load nothing. A file rather than an inline script, so a future Content
// Security Policy needs no 'unsafe-inline'.
if (location.hostname === 'fastforks.dev' || location.hostname === 'www.fastforks.dev') {
	// Plausible's documented queue/init shim: calls made before the async loader arrives are replayed.
	window.plausible =
		window.plausible ||
		function () {
			(window.plausible.q = window.plausible.q || []).push(arguments);
		};
	window.plausible.init =
		window.plausible.init ||
		function (options) {
			window.plausible.o = options || {};
		};
	window.plausible.init();

	const loader = document.createElement('script');
	loader.async = true;
	loader.src = 'https://analytics.re4vive.com/js/pa-mhMUF2eaU6YsvXsG0Lj4E.js';
	document.head.appendChild(loader);
}
