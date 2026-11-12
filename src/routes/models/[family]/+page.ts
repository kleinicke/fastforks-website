import { error } from '@sveltejs/kit';
import { cardSlugs, loadCard } from '#lib/cards.ts';
import { loadDoc } from '#lib/docs.ts';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => cardSlugs().map((family) => ({ family }));

export const load: PageLoad = async ({ params }) => {
	const [card, doc] = await Promise.all([loadCard(params.family), loadDoc('models', params.family)]);
	if (!card) error(404, 'Not found');
	return { card, doc };
};
