import { getAllDocs, groupDocsByCategory } from '$lib/server/docs-loader';
import { getDatabaseSchemaMetadata } from '$lib/server/schema-loader';
import { getRouteMatrix } from '$lib/server/routes-loader';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const docs = getAllDocs();
	const categoryGroups = groupDocsByCategory(docs);
	const schema = getDatabaseSchemaMetadata();
	const routeMatrix = getRouteMatrix();

	return {
		docs,
		categoryGroups,
		schema,
		routeMatrix
	};
};


