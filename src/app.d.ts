// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {}
}

interface ImportMetaEnv {
	readonly VITE_SITE_URL?: string;
}

export {};
