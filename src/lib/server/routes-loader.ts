import fs from 'node:fs';
import path from 'node:path';

export interface RouteEntry {
	urlPath: string;
	routeFolder: string;
	group?: string; // (app), (auth), (admin), etc.
	hasPage: boolean;
	hasPageServer: boolean;
	hasServerEndpoint: boolean;
	hasLayout: boolean;
	serverMethods: string[]; // GET, POST, PUT, DELETE, PATCH, actions
	files: {
		page?: string;
		pageServer?: string;
		server?: string;
		layout?: string;
	};
}

export interface ComponentEntry {
	name: string;
	filePath: string;
	relativePath: string;
	sizeBytes: number;
}

export interface RouteMatrixData {
	routes: RouteEntry[];
	components: ComponentEntry[];
	totalPages: number;
	totalEndpoints: number;
	totalComponents: number;
}

/**
 * Recursively scans src/routes to construct a live SvelteKit route matrix.
 */
export function getRouteMatrix(): RouteMatrixData {
	const routesDir = path.resolve(process.cwd(), 'src/routes');
	const componentsDir = path.resolve(process.cwd(), 'src/lib/components');

	const routeEntries: RouteEntry[] = [];
	const componentEntries: ComponentEntry[] = [];

	// 1. Scan Routes
	if (fs.existsSync(routesDir)) {
		scanRoutesDirectory(routesDir, '', routeEntries);
	}

	// 2. Scan Components
	if (fs.existsSync(componentsDir)) {
		scanComponentsDirectory(componentsDir, componentEntries);
	}

	const totalPages = routeEntries.filter((r) => r.hasPage).length;
	const totalEndpoints = routeEntries.filter((r) => r.hasServerEndpoint).length;

	return {
		routes: routeEntries.sort((a, b) => a.urlPath.localeCompare(b.urlPath)),
		components: componentEntries.sort((a, b) => a.name.localeCompare(b.name)),
		totalPages,
		totalEndpoints,
		totalComponents: componentEntries.length
	};
}

function scanRoutesDirectory(
	currentDir: string,
	relativePath: string,
	entries: RouteEntry[]
) {
	const items = fs.readdirSync(currentDir);
	const hasPage = items.includes('+page.svelte');
	const hasPageServer = items.includes('+page.server.ts') || items.includes('+page.server.js');
	const hasServerEndpoint = items.includes('+server.ts') || items.includes('+server.js');
	const hasLayout = items.includes('+layout.svelte');

	// Extract group if any, e.g. (app), (auth)
	const segments = relativePath.split(path.sep).filter(Boolean);
	const groups = segments.filter((s) => s.startsWith('(') && s.endsWith(')'));
	const group = groups.length > 0 ? groups.join(' ') : undefined;

	// Calculate clean public URL path
	const urlSegments = segments.filter((s) => !s.startsWith('(') || !s.endsWith(')'));
	const urlPath = '/' + urlSegments.join('/');

	// Inspect server methods / form actions if server file exists
	const serverMethods: string[] = [];
	const files: RouteEntry['files'] = {};

	if (hasPage) {
		files.page = path.join('src/routes', relativePath, '+page.svelte');
	}
	if (hasLayout) {
		files.layout = path.join('src/routes', relativePath, '+layout.svelte');
	}

	if (hasServerEndpoint) {
		const serverFile = items.find((f) => f.startsWith('+server.'))!;
		const serverFilePath = path.join(currentDir, serverFile);
		files.server = path.join('src/routes', relativePath, serverFile);
		const content = fs.readFileSync(serverFilePath, 'utf-8');

		const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
		for (const m of methods) {
			if (new RegExp(`export\\s+(const|function)\\s+${m}\\b`).test(content)) {
				serverMethods.push(m);
			}
		}
	}

	if (hasPageServer) {
		const pageServerFile = items.find((f) => f.startsWith('+page.server.'))!;
		const pageServerFilePath = path.join(currentDir, pageServerFile);
		files.pageServer = path.join('src/routes', relativePath, pageServerFile);
		const content = fs.readFileSync(pageServerFilePath, 'utf-8');

		if (new RegExp(`export\\s+(const|function)\\s+load\\b`).test(content)) {
			serverMethods.push('load');
		}
		if (new RegExp(`export\\s+const\\s+actions\\b`).test(content)) {
			serverMethods.push('actions');
		}
	}

	if (hasPage || hasServerEndpoint || hasPageServer) {
		entries.push({
			urlPath: urlPath === '//' ? '/' : urlPath,
			routeFolder: path.join('src/routes', relativePath),
			group,
			hasPage,
			hasPageServer,
			hasServerEndpoint,
			hasLayout,
			serverMethods,
			files
		});
	}

	// Recurse into subdirectories
	for (const item of items) {
		const itemPath = path.join(currentDir, item);
		if (fs.statSync(itemPath).isDirectory()) {
			scanRoutesDirectory(itemPath, path.join(relativePath, item), entries);
		}
	}
}

function scanComponentsDirectory(currentDir: string, entries: ComponentEntry[]) {
	const items = fs.readdirSync(currentDir);
	for (const item of items) {
		const itemPath = path.join(currentDir, item);
		const stat = fs.statSync(itemPath);
		if (stat.isDirectory()) {
			scanComponentsDirectory(itemPath, entries);
		} else if (item.endsWith('.svelte')) {
			entries.push({
				name: item,
				filePath: path.relative(process.cwd(), itemPath),
				relativePath: path.relative(path.resolve(process.cwd(), 'src/lib/components'), itemPath),
				sizeBytes: stat.size
			});
		}
	}
}
