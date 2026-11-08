// Renders the fastforks docs (generated model pages, device pages, benchmarks, usage, export) into JSON pages
// for the site, and rewrites every link between docs pages to the site's own routes, so nothing points at GitHub
// except source files and external sites.
//
//   docs/models/<task>.md  -> /tasks/<task> (intro, all-models table, training data) and one /models/<family>
//                             page per `<a id="family">` section
//   docs/devices/<slug>.md -> /devices/<slug>
//   docs/{usage,benchmarks,export,...}.md -> /usage, /benchmarks, ... (PAGES)
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { Marked, type Tokens } from 'marked';

const BLOB = 'https://github.com/kleinicke/fastforks/blob/main/';
/** Hand-written docs pages: file under docs/ -> site route. The api/ pages are mkdocstrings stubs and stay on GitHub. */
export const PAGES: Record<string, string> = {
	'usage.md': 'usage',
	'benchmarks.md': 'benchmarks',
	'export.md': 'export',
	'docker.md': 'docker',
	'stereo_geometry.md': 'stereo-geometry',
	'OTHER_GPUS.md': 'other-gpus'
};

export type Doc = { kind: string; slug: string; title: string; description: string; task?: string; html: string };
export type ModeRow = { mode: string; ms: number | null; alloc_mib: number | null; reserved_mib: number | null };
export type Family = { id: string; task: string; title: string; variants: string[] };

/** GitHub's heading slug (what tools/gen_docs.py links to): lowercase, punctuation dropped, every space a dash. */
const slugify = (s: string) =>
	s
		.trim()
		.toLowerCase()
		.replace(/[^\w\- ]/g, '')
		.replace(/ /g, '-');

const stripTags = (html: string) =>
	html
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

const num = (s: string | undefined) => {
	const m = s?.replaceAll(',', '').match(/^\s*(\d+(\.\d+)?)/);
	return m ? Number(m[1]) : null;
};

/** Variant tables of the model pages: per variant, every backend row with its time and peak memory. */
function variantModes(md: string): Record<string, ModeRow[]> {
	const out: Record<string, ModeRow[]> = {};
	let inTable = false;
	for (const line of md.split('\n')) {
		if (line.startsWith('| variant | input | backend | time (ms) | peak memory')) {
			inTable = true;
			continue;
		}
		if (!line.startsWith('|')) inTable = false;
		if (!inTable || !line.startsWith('| `')) continue;
		const c = line
			.trim()
			.replace(/^\||\|$/g, '')
			.split('|')
			.map((x) => x.trim());
		const id = c[0].replaceAll('`', '');
		if (out[id]) continue; // a second input of the same variant: the first row is the task's standard input
		const modes = c[2].split('<br>');
		const times = c[3].split('<br>');
		const mems = c[4].split('<br>');
		out[id] = modes.map((mode, i) => {
			const [a, r] = (mems[i] ?? '').split('/');
			return { mode, ms: num(times[i]), alloc_mib: num(a), reserved_mib: num(r) };
		});
	}
	return out;
}

export function renderDocs(repo: string, outDir: string) {
	const docs = resolve(repo, 'docs');
	const taskFiles = readdirSync(join(docs, 'models')).filter((f) => f.endsWith('.md'));
	const deviceFiles = readdirSync(join(docs, 'devices')).filter((f) => f.endsWith('.md'));

	// Families by their `<a id>` (links inside a task page) and by their heading's slug (links from the overview).
	const families = new Map<string, Family>();
	const alias = new Map<string, string>();
	const modes: Record<string, ModeRow[]> = {};
	for (const f of taskFiles) {
		const md = readFileSync(join(docs, 'models', f), 'utf8');
		const task = f.replace(/\.md$/, '');
		for (const part of md.split(/(?=<a id="[^"]+"><\/a>)/).slice(1)) {
			const m = part.match(/^<a id="([^"]+)"><\/a>\s*\n\s*## (.+)/);
			if (!m) continue;
			const vm = variantModes(part);
			families.set(m[1], { id: m[1], task, title: m[2].trim(), variants: Object.keys(vm) });
			alias.set(m[1], m[1]);
			alias.set(slugify(m[2]), m[1]);
			Object.assign(modes, vm);
		}
	}
	const family = (hash: string) => alias.get(hash);

	const unresolved = new Set<string>();
	/** A docs link (relative to `from`, a path under docs/) as a site route; source files go to GitHub. */
	const rewrite = (href: string, from: string): string => {
		if (/^[a-z]+:/i.test(href)) return href;
		const [path, hash = ''] = href.split('#');
		if (!path) return family(hash) ? `/models/${family(hash)}` : `#${hash}`;
		const p = normalize(join(dirname(from), path)).replaceAll('\\', '/');
		const anchor = hash ? `#${hash}` : '';
		let m: RegExpMatchArray | null;
		if ((m = p.match(/^models\/(\w+)\.md$/)))
			return family(hash) ? `/models/${family(hash)}` : `/tasks/${m[1]}${anchor}`;
		if ((m = p.match(/^devices\/([\w-]+)\.md$/))) return `/devices/${m[1]}${anchor}`;
		if (PAGES[p]) return `/${PAGES[p]}${anchor}`;
		if (p === 'overview.md') return '/models';
		if (p.endsWith('.md')) unresolved.add(p);
		return BLOB + (p.startsWith('../') ? p.slice(3) : `docs/${p}`) + anchor;
	};

	const render = (md: string, from: string) => {
		const seen = new Map<string, number>();
		const marked = new Marked({
			gfm: true,
			walkTokens(t) {
				if (t.type === 'link') (t as Tokens.Link).href = rewrite((t as Tokens.Link).href, from);
			},
			renderer: {
				heading({ tokens, depth }) {
					const inner = this.parser.parseInline(tokens);
					const base = slugify(stripTags(inner));
					const n = seen.get(base) ?? 0;
					seen.set(base, n + 1);
					const id = n ? `${base}_${n}` : base;
					return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
				},
				table(token) {
					const head = token.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join('');
					const body = token.rows
						.map((r) => `<tr>${r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`)
						.join('\n');
					return `<div class="table"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`;
				}
			}
		});
		return (marked.parse(md) as string).replace(/<a href="(https?:[^"]+)"/g, '<a href="$1" rel="noopener"');
	};

	const describe = (md: string) => {
		const para = md
			.replace(/```[\s\S]*?```/g, '')
			.split(/\n\s*\n/)
			.map((p) => p.trim())
			.find((p) => p && !/^(#|<|\||-|`)/.test(p));
		const text = stripTags(new Marked().parseInline(para ?? '') as string).replace(/\s+/g, ' ');
		return text.length > 180 ? text.slice(0, 177).replace(/\s+\S*$/, '') + '…' : text;
	};
	// Drop the H1 and the "generated, do not edit" comments: the site page has its own heading.
	const body = (md: string) =>
		md
			.replace(/^# .+\n/m, '')
			.replace(/<!--[\s\S]*?-->\n?/g, '')
			.trim();
	const title = (md: string) => md.match(/^# (.+)$/m)?.[1].trim() ?? '';

	rmSync(outDir, { recursive: true, force: true });
	const write = (doc: Doc) => {
		const file = join(outDir, doc.kind, `${doc.slug}.json`);
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, JSON.stringify(doc) + '\n');
	};

	for (const f of taskFiles) {
		const task = f.replace(/\.md$/, '');
		const from = `models/${f}`;
		const md = readFileSync(join(docs, from), 'utf8');
		const parts = md.split(/(?=<a id="[^"]+"><\/a>)/);
		const tailAt = parts.at(-1)!.indexOf('\n## All models');
		const tail = tailAt >= 0 ? parts.at(-1)!.slice(tailAt) : '';
		if (tailAt >= 0) parts[parts.length - 1] = parts.at(-1)!.slice(0, tailAt);
		const intro = body(parts[0]);
		write({
			kind: 'tasks',
			slug: task,
			title: title(md),
			description: describe(intro),
			html: render(`${intro}\n\n${tail}`, from)
		});
		for (const part of parts.slice(1)) {
			const id = part.match(/<a id="([^"]+)">/)![1];
			const fam = families.get(id)!;
			const sec = part.replace(/<a id="[^"]+"><\/a>\s*/, '').replace(/^## .+\n/, '');
			write({ kind: 'models', slug: id, task, title: fam.title, description: describe(sec), html: render(sec, from) });
		}
	}
	for (const f of deviceFiles) {
		const md = readFileSync(join(docs, 'devices', f), 'utf8');
		const b = body(md);
		write({
			kind: 'devices',
			slug: f.replace(/\.md$/, ''),
			title: title(md),
			description: describe(b),
			html: render(b, `devices/${f}`)
		});
	}
	for (const [file, slug] of Object.entries(PAGES)) {
		const md = readFileSync(join(docs, file), 'utf8');
		const b = body(md);
		write({ kind: 'pages', slug, title: title(md), description: describe(b), html: render(b, file) });
	}
	if (unresolved.size) console.warn(`docs links left on GitHub: ${[...unresolved].sort().join(', ')}`);
	return { families, modes, rewrite };
}
