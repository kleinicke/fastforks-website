// Every indexable page with its title and description, for sitemap.xml and llms.txt (build time only).
import type { Doc } from './docs.ts';

const docs = import.meta.glob<Doc>('./data/docs/*/*.json', { import: 'default', eager: true });

export type PageEntry = { path: string; kind: string; title: string; description: string; task?: string };

const PATH: Record<string, (slug: string) => string> = {
	pages: (s) => `/${s}`,
	tasks: (s) => `/tasks/${s}`,
	devices: (s) => `/devices/${s}`,
	models: (s) => `/models/${s}`
};

export const docPages: PageEntry[] = Object.values(docs)
	.map((d) => ({ path: PATH[d.kind](d.slug), kind: d.kind, title: d.title, description: d.description, task: d.task }))
	.sort((a, b) => a.path.localeCompare(b.path));

export const allPaths = ['/', '/models', ...docPages.map((p) => p.path)];
