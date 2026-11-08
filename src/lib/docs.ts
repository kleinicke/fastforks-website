// Docs pages rendered from the fastforks repo by scripts/docs.ts (`pnpm sync`), one JSON file each. Loaded lazily,
// so a page's bundle carries only its own document.
export type Doc = { kind: string; slug: string; title: string; description: string; task?: string; html: string };

const files = import.meta.glob<Doc>('./data/docs/*/*.json', { import: 'default' });
const key = (kind: string, slug: string) => `./data/docs/${kind}/${slug}.json`;

/** Every slug of a kind, for the prerender entries. */
export const slugs = (kind: string) =>
	Object.keys(files)
		.filter((k) => k.startsWith(`./data/docs/${kind}/`))
		.map((k) => k.slice(`./data/docs/${kind}/`.length, -'.json'.length));

export async function loadDoc(kind: string, slug: string): Promise<Doc | null> {
	const f = files[key(kind, slug)];
	return f ? await f() : null;
}
