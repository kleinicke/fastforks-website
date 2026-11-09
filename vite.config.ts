import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite-plus';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter({ fallback: '404.html' }),
			// sitemap.xml and llms.txt are linked from nowhere, so the crawler needs them named.
			prerender: { handleHttpError: 'fail', entries: ['*', '/sitemap.xml', '/llms.txt'] }
		})
	],
	fmt: {
		ignorePatterns: ['build/**', '.svelte-kit/**', 'src/lib/data/**', 'pnpm-lock.yaml'],
		useTabs: true,
		singleQuote: true,
		trailingComma: 'none',
		printWidth: 120
	},
	lint: {
		ignorePatterns: ['build/**', '.svelte-kit/**'],
		options: { typeAware: true, typeCheck: true }
	}
});
