import type { ErColumn, ErRelation, ErTable } from '$lib/types/er';

export interface ParsedErTable {
	name: string;
	columns: ErColumn[];
	relations: ErRelation[];
}

export interface ParsedSqlSchema {
	tables: ParsedErTable[];
}

function stripSqlComments(sql: string): string {
	return sql
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/--[^\n\r]*/g, ' ');
}

function cleanIdentifier(raw: string): string {
	const trimmed = raw.trim().replace(/["`[\]]/g, '');
	const parts = trimmed.split('.');
	return parts[parts.length - 1] ?? trimmed;
}

function splitTopLevelCommas(body: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let inSingleQuote = false;
	let current = '';

	for (let i = 0; i < body.length; i++) {
		const ch = body[i];
		if (ch === "'" && body[i - 1] !== '\\') {
			inSingleQuote = !inSingleQuote;
			current += ch;
			continue;
		}
		if (!inSingleQuote) {
			if (ch === '(') depth++;
			else if (ch === ')') depth = Math.max(0, depth - 1);
			else if (ch === ',' && depth === 0) {
				if (current.trim()) parts.push(current.trim());
				current = '';
				continue;
			}
		}
		current += ch;
	}
	if (current.trim()) parts.push(current.trim());
	return parts;
}

function extractBalancedParens(sql: string, openIndex: number): { content: string; endIndex: number } | null {
	let depth = 0;
	let inSingleQuote = false;
	for (let i = openIndex; i < sql.length; i++) {
		const ch = sql[i];
		if (ch === "'" && sql[i - 1] !== '\\') {
			inSingleQuote = !inSingleQuote;
			continue;
		}
		if (inSingleQuote) continue;
		if (ch === '(') depth++;
		else if (ch === ')') {
			depth--;
			if (depth === 0) {
				return {
					content: sql.slice(openIndex + 1, i),
					endIndex: i
				};
			}
		}
	}
	return null;
}

export function parseSqlDdl(sql: string): ParsedSqlSchema {
	const cleaned = stripSqlComments(sql);
	const tables: ParsedErTable[] = [];

	const createTableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_."`]+)\s*\(/gi;
	let match: RegExpExecArray | null;

	while ((match = createTableRegex.exec(cleaned)) !== null) {
		const tableName = cleanIdentifier(match[1]);
		const openParenIdx = match.index + match[0].length - 1;
		const extracted = extractBalancedParens(cleaned, openParenIdx);
		if (!extracted) continue;

		createTableRegex.lastIndex = extracted.endIndex + 1;

		const items = splitTopLevelCommas(extracted.content);
		const columns: ErColumn[] = [];
		const relations: ErRelation[] = [];
		const pkColumns = new Set<string>();

		for (const item of items) {
			const trimmed = item.trim();
			if (!trimmed) continue;

			// Table-level PRIMARY KEY
			const tablePkMatch = trimmed.match(/^(?:constraint\s+\S+\s+)?primary\s+key\s*\(([^)]+)\)/i);
			if (tablePkMatch) {
				for (const col of tablePkMatch[1].split(',')) {
					pkColumns.add(cleanIdentifier(col));
				}
				continue;
			}

			// Table-level FOREIGN KEY
			const tableFkMatch = trimmed.match(
				/^(?:constraint\s+\S+\s+)?foreign\s+key\s*\(([^)]+)\)\s+references\s+([a-zA-Z0-9_."`]+)\s*\(([^)]+)\)/i
			);
			if (tableFkMatch) {
				const fromCol = cleanIdentifier(tableFkMatch[1].split(',')[0]);
				const toTable = cleanIdentifier(tableFkMatch[2]);
				const toCol = cleanIdentifier(tableFkMatch[3].split(',')[0]);
				relations.push({ from_column: fromCol, to_table: toTable, to_column: toCol });
				continue;
			}

			// Skip other table-level constraints (UNIQUE, CHECK, EXCLUDE)
			if (/^(?:constraint\s+\S+\s+)?(?:unique|check|exclude)\b/i.test(trimmed)) {
				continue;
			}

			// Column definition: <name> <type...> [constraints...]
			const colMatch = trimmed.match(/^("[^"]+"|`[^`]+`|[a-zA-Z_][a-zA-Z0-9_$]*)\s+(.+)$/s);
			if (!colMatch) continue;

			const colName = cleanIdentifier(colMatch[1]);
			const rest = colMatch[2].trim();

			// Extract type (up to first constraint keyword)
			const typeMatch = rest.match(
				/^([a-zA-Z_][a-zA-Z0-9_\s]*?(?:\([^)]*\))?(?:\[\])?)(?=\s+(?:not\s+null|null|primary\s+key|unique|default|references|check|generated|collate)\b|$)/i
			);
			const colType = (typeMatch ? typeMatch[1] : rest.split(/\s+/)[0] ?? 'text')
				.trim()
				.replace(/\s+/g, ' ');

			const isPk = /\bprimary\s+key\b/i.test(rest);
			if (isPk) pkColumns.add(colName);

			const isNotNull = /\bnot\s+null\b/i.test(rest) || isPk;

			let fkTarget: { table: string; column: string } | null = null;
			const refMatch = rest.match(/\breferences\s+([a-zA-Z0-9_."`]+)\s*(?:\(([^)]+)\))?/i);
			if (refMatch) {
				const toTable = cleanIdentifier(refMatch[1]);
				const toCol = refMatch[2] ? cleanIdentifier(refMatch[2]) : 'id';
				fkTarget = { table: toTable, column: toCol };
				relations.push({ from_column: colName, to_table: toTable, to_column: toCol });
			}

			columns.push({
				name: colName,
				type: colType,
				nullable: !isNotNull,
				is_pk: isPk,
				fk_target: fkTarget
			});
		}

		// Apply table-level PK & FK metadata back onto columns
		for (const col of columns) {
			if (pkColumns.has(col.name)) {
				col.is_pk = true;
				col.nullable = false;
			}
			if (!col.fk_target) {
				const rel = relations.find((r) => r.from_column === col.name);
				if (rel) {
					col.fk_target = { table: rel.to_table, column: rel.to_column };
				}
			}
		}

		tables.push({ name: tableName, columns, relations });
	}

	// Parse pg_dump style ALTER TABLE [ONLY] [schema.]table ADD CONSTRAINT ... PRIMARY KEY / FOREIGN KEY
	const tableMap = new Map<string, ParsedErTable>();
	for (const t of tables) {
		tableMap.set(t.name, t);
	}

	const alterPkRegex =
		/alter\s+table\s+(?:only\s+)?([a-zA-Z0-9_."`]+)\s+add\s+constraint\s+\S+\s+primary\s+key\s*\(([^)]+)\)/gi;
	while ((match = alterPkRegex.exec(cleaned)) !== null) {
		const tableName = cleanIdentifier(match[1]);
		const table = tableMap.get(tableName);
		if (!table) continue;
		const pkCols = new Set(match[2].split(',').map((c) => cleanIdentifier(c)));
		for (const col of table.columns) {
			if (pkCols.has(col.name)) {
				col.is_pk = true;
				col.nullable = false;
			}
		}
	}

	const alterFkRegex =
		/alter\s+table\s+(?:only\s+)?([a-zA-Z0-9_."`]+)\s+add\s+constraint\s+\S+\s+foreign\s+key\s*\(([^)]+)\)\s+references\s+([a-zA-Z0-9_."`]+)\s*\(([^)]+)\)/gi;
	while ((match = alterFkRegex.exec(cleaned)) !== null) {
		const tableName = cleanIdentifier(match[1]);
		const table = tableMap.get(tableName);
		if (!table) continue;
		const fromCol = cleanIdentifier(match[2].split(',')[0]);
		const toTable = cleanIdentifier(match[3]);
		const toCol = cleanIdentifier(match[4].split(',')[0]);

		if (!table.relations.some((r) => r.from_column === fromCol && r.to_table === toTable)) {
			table.relations.push({ from_column: fromCol, to_table: toTable, to_column: toCol });
		}
		const col = table.columns.find((c) => c.name === fromCol);
		if (col) {
			col.fk_target = { table: toTable, column: toCol };
		}
	}

	return { tables };
}

export interface FeatureGroupPath {
	parent: string;
	sub: string;
}

export function inferFeatureGroupHierarchy(tableName: string): FeatureGroupPath {
	const name = tableName.toLowerCase();

	// Thrift
	if (name.startsWith('thrift_')) {
		if (/^thrift_(customers|invoice|sales|return|accounting)/.test(name)) {
			return { parent: 'Thrift', sub: 'Thrift Sales & Ledger' };
		}
		return { parent: 'Thrift', sub: 'Thrift Inventory & Pricing' };
	}

	// Koba
	if (name.startsWith('koba_')) {
		if (/^koba_(carts?|cart_|orders?|order_)/.test(name)) {
			return { parent: 'Koba', sub: 'Koba Carts & Orders' };
		}
		return { parent: 'Koba', sub: 'Koba Catalog' };
	}

	// People, Tenants & Access
	if (/^(tenants?|tenant_|system_role)/.test(name)) {
		return { parent: 'People & Access', sub: 'Tenants & RBAC' };
	}
	if (/^(memberships?|membership_|profiles$|recipient_profiles$|user_)/.test(name)) {
		return { parent: 'People & Access', sub: 'Members & Profiles' };
	}
	if (/^(vendors$|investors$|customer_group|markets$)/.test(name)) {
		return { parent: 'People & Access', sub: 'Vendors & Customers' };
	}

	// Catalog & Products
	if (/^(tags$|tag_categories$|entity_tags$)/.test(name)) {
		return { parent: 'Catalog & Products', sub: 'Tags' };
	}
	if (/^(products$|product_brands$|product_categories$|units_of_measure$|catalog_)/.test(name)) {
		return { parent: 'Catalog & Products', sub: 'Products & Brands' };
	}

	// Shop & Storefront
	if (/^(shop_carts?|shop_cart_|shop_auto_gift|shop_stock_reservations|preorder_demand)/.test(name)) {
		return { parent: 'Shop & Storefront', sub: 'Carts & Demand' };
	}
	if (/^(shops$|shop_categories$|shop_product_|shop_pricing_|shop_listing_|shop_customer_)/.test(name)) {
		return { parent: 'Shop & Storefront', sub: 'Listings & Pricing' };
	}

	// Orders & Invoices
	if (/^(shop_orders?|shop_order_|customer_demand_|customer_order_)/.test(name)) {
		return { parent: 'Orders & Invoices', sub: 'Orders & Backlog' };
	}
	if (/^(sales_|invoice_|dropship_)/.test(name)) {
		return { parent: 'Orders & Invoices', sub: 'Invoices & Dropship' };
	}

	// Shipments & Logistics
	if (/^(global_shipment|cargo_|batch_code_)/.test(name)) {
		return { parent: 'Shipments & Logistics', sub: 'Global Shipments' };
	}
	if (/^(shipments$|shipment_|courier_|pickup_)/.test(name)) {
		return { parent: 'Shipments & Logistics', sub: 'Local Shipments & Couriers' };
	}

	// Inventory & Stock
	if (/^global_stock/.test(name)) {
		return { parent: 'Inventory & Stock', sub: 'Global Stock' };
	}
	if (/^stock_/.test(name)) {
		return { parent: 'Inventory & Stock', sub: 'Locations & Movements' };
	}

	// Costing
	if (/^product_based_costing_/.test(name)) {
		return { parent: 'Costing', sub: 'Product Costing' };
	}
	if (/^costing_/.test(name)) {
		return { parent: 'Costing', sub: 'Costing Files' };
	}

	// Finance & Cashbook
	if (/^(pays$|pay_|payment_|bill_settlements$|money_purposes$)/.test(name)) {
		return { parent: 'Finance & Cashbook', sub: 'Payments & Bills' };
	}
	if (/^(cashbook_|bd_banks$|global_currencies$|books_exchange_rates$)/.test(name)) {
		return { parent: 'Finance & Cashbook', sub: 'Cashbook & Currencies' };
	}

	// System & Goals
	if (/^(goals$|goal_|milestones$|definition_of_done)/.test(name)) {
		return { parent: 'System & Goals', sub: 'Goals & Milestones' };
	}
	if (/^notification/.test(name)) {
		return { parent: 'System & Goals', sub: 'Notifications' };
	}
	if (/^(modules$|module_|comments$|document_number_|app_release_)/.test(name)) {
		return { parent: 'System & Goals', sub: 'System & Docs' };
	}

	const idx = name.indexOf('_');
	const raw = idx > 0 ? name.slice(0, idx) : 'core';
	const label = raw.charAt(0).toUpperCase() + raw.slice(1);
	return { parent: label, sub: label };
}

export function inferFeatureGroup(tableName: string): string {
	return inferFeatureGroupHierarchy(tableName).parent;
}

export interface ParsedGroupHierarchy {
	name: string;
	tables: string[];
	subgroups: Array<{
		name: string;
		tables: string[];
	}>;
}

function extractTableNames(line: string): string[] {
	return line
		.replace(/`/g, '')
		.split(/[\s,]+/)
		.map((s) => s.trim().replace(/^[•*-]+/, '').trim())
		.filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s));
}

export function parseGroupHierarchyInput(input: string): ParsedGroupHierarchy[] {
	const trimmed = input.trim();
	if (!trimmed) return [];

	if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
		try {
			const parsed = JSON.parse(trimmed);
			const arr = Array.isArray(parsed) ? parsed : [parsed];
			return arr
				.filter((g) => g && typeof g.name === 'string')
				.map((g) => ({
					name: g.name.trim(),
					tables: Array.isArray(g.tables) ? g.tables.map(String) : [],
					subgroups: Array.isArray(g.subgroups)
						? g.subgroups
								.filter((sg: any) => sg && typeof sg.name === 'string')
								.map((sg: any) => ({
									name: sg.name.trim(),
									tables: Array.isArray(sg.tables) ? sg.tables.map(String) : []
								}))
						: []
				}));
		} catch {
			return [];
		}
	}

	const groups: ParsedGroupHierarchy[] = [];
	let currentGroup: ParsedGroupHierarchy | null = null;
	let currentSub: { name: string; tables: string[] } | null = null;

	for (const rawLine of trimmed.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;

		// Top-level heading: "# Name" or "1. Name"
		const h1Match = line.match(/^(?:#\s+|\d+\.\s+\*{0,2})([^(*\n]+?)(?:\s*\(\d+\))?\*{0,2}$/);
		if (h1Match) {
			currentGroup = { name: h1Match[1].trim(), tables: [], subgroups: [] };
			groups.push(currentGroup);
			currentSub = null;
			continue;
		}

		// Sub-group heading: "## Name" or "- ↳ Name: t1, t2" or "- Name: t1, t2"
		const h2Match = line.match(/^(?:##\s+|[-*]\s+(?:\*{0,2}↳\s*)?)([^:(\n]+?)(?:\s*\(\d+\))?\*{0,2}(?::\s*(.*))?$/);
		if (h2Match && currentGroup && (line.startsWith('##') || line.includes(':'))) {
			const subName = h2Match[1].replace(/\*\*/g, '').trim();
			const inlineTables = h2Match[2] ? extractTableNames(h2Match[2]) : [];
			currentSub = { name: subName, tables: inlineTables };
			currentGroup.subgroups.push(currentSub);
			continue;
		}

		const tables = extractTableNames(line);
		if (tables.length > 0 && currentGroup) {
			if (currentSub) {
				currentSub.tables.push(...tables);
			} else {
				currentGroup.tables.push(...tables);
			}
		}
	}

	return groups;
}

export function exportTableToShorthand(table: ErTable): string {
	const lines = [table.name];
	for (const col of table.columns) {
		const parts = [`  ${col.name}`, col.type || 'text'];
		if (col.is_pk) parts.push('pk');
		if (col.nullable) parts.push('?');
		if (col.fk_target) {
			parts.push(
				col.fk_target.column === 'id'
					? `-> ${col.fk_target.table}`
					: `-> ${col.fk_target.table}.${col.fk_target.column}`
			);
		}
		lines.push(parts.join(' '));
	}
	return lines.join('\n');
}

export function parseTableInput(input: string): ParsedSqlSchema {
	if (/\bcreate\s+table\b/i.test(input)) {
		return parseSqlDdl(input);
	}

	const tables: ParsedErTable[] = [];
	let current: ParsedErTable | null = null;

	for (const rawLine of input.split(/\r?\n/)) {
		const trimmed = rawLine.trim();
		if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('#')) continue;

		const isIndented = /^\s+/.test(rawLine);
		// Table header line: non-indented single identifier or "table <name>"
		const tableHeaderMatch = trimmed.match(/^(?:table\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*:?$/i);
		if (!isIndented && tableHeaderMatch && !trimmed.includes('->')) {
			current = { name: tableHeaderMatch[1], columns: [], relations: [] };
			tables.push(current);
			continue;
		}

		if (!current) continue;

		// Column shorthand: name [type] [pk] [?|null] [-> target[.col]]
		let line = trimmed.replace(/,$/, '');
		let fkTarget: { table: string; column: string } | null = null;
		const fkMatch = line.match(/->\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?/);
		if (fkMatch) {
			fkTarget = { table: fkMatch[1], column: fkMatch[2] ?? 'id' };
			line = line.slice(0, fkMatch.index).trim();
		}

		const tokens = line.match(/[^\s(]+(?:\([^)]*\))?|\([^)]*\)/g) ?? [];
		if (tokens.length === 0) continue;

		const colName = tokens[0];
		let colType = 'text';
		let isPk = false;
		let nullable = false;

		for (let i = 1; i < tokens.length; i++) {
			const tok = tokens[i];
			const lower = tok.toLowerCase();
			if (lower === 'pk') {
				isPk = true;
			} else if (lower === '?' || lower === 'null' || lower === 'nullable') {
				nullable = true;
			} else if (tok.endsWith('?')) {
				colType = tok.slice(0, -1) || 'text';
				nullable = true;
			} else if (i === 1) {
				colType = tok;
			}
		}

		if (isPk) nullable = false;
		if (fkTarget) {
			current.relations.push({
				from_column: colName,
				to_table: fkTarget.table,
				to_column: fkTarget.column
			});
		}

		current.columns.push({
			name: colName,
			type: colType,
			nullable,
			is_pk: isPk,
			fk_target: fkTarget
		});
	}

	return { tables };
}

export function exportTablesToSql(tables: ErTable[]): string {
	return tables
		.map((table) => {
			const pkCols = table.columns.filter((c) => c.is_pk).map((c) => c.name);
			const singlePk = pkCols.length === 1;

			const lines: string[] = table.columns.map((col) => {
				const enumMatch = col.type.match(/^enum\(([^)]+)\)$/i);
				const sqlType = enumMatch
					? `text CHECK (${col.name} IN (${enumMatch[1]
							.split(',')
							.map((v) => `'${v.trim().replace(/^['"]|['"]$/g, '')}'`)
							.join(', ')}))`
					: col.type;
				const parts = [`  ${col.name} ${sqlType}`];
				if (singlePk && col.is_pk) {
					parts.push('PRIMARY KEY');
				} else if (col.nullable === false) {
					parts.push('NOT NULL');
				}
				if (col.fk_target) {
					parts.push(`REFERENCES public.${col.fk_target.table}(${col.fk_target.column})`);
				}
				return parts.join(' ');
			});

			if (pkCols.length > 1) {
				lines.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
			}

			return `CREATE TABLE public.${table.name} (\n${lines.join(',\n')}\n);`;
		})
		.join('\n\n');
}
