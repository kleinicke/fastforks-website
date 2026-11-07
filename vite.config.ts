import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite-plus';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter({ fallback: '404.html' }),
			prerender: { handleHttpError: 'fail' }
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
