import { getAllDocs, groupDocsByCategory } from '$lib/server/docs-loader';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const docs = getAllDocs();
	const categoryGroups = groupDocsByCategory(docs);

	return {
		docs,
		categoryGroups
	};
};
