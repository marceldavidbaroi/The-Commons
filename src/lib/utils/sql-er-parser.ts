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

	return { tables };
}

export function exportTablesToSql(tables: ErTable[]): string {
	return tables
		.map((table) => {
			const pkCols = table.columns.filter((c) => c.is_pk).map((c) => c.name);
			const singlePk = pkCols.length === 1;

			const lines: string[] = table.columns.map((col) => {
				const parts = [`  ${col.name} ${col.type}`];
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
