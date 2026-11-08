import { error } from '@sveltejs/kit';
import { loadDoc, slugs } from '#lib/docs.ts';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => slugs('models').map((family) => ({ family }));

export const load: PageLoad = async ({ params }) => {
	const doc = await loadDoc('models', params.family);
	if (!doc) error(404, 'Not found');
	return { doc };
};
