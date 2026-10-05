import fs from 'node:fs';
import path from 'node:path';

export interface SchemaColumn {
	name: string;
	type: string;
	isNullable: boolean;
	isOptionalInsert: boolean;
	isPrimaryKey?: boolean;
}

export interface SchemaRelationship {
	foreignKeyName: string;
	columns: string[];
	isOneToOne: boolean;
	referencedRelation: string;
	referencedColumns: string[];
}

export interface SchemaTable {
	name: string;
	columns: SchemaColumn[];
	relationships: SchemaRelationship[];
}

export interface SchemaEnum {
	name: string;
	values: string[];
}

export interface SchemaMetadata {
	tables: SchemaTable[];
	enums: SchemaEnum[];
	lastUpdated: string;
}

export function formatConcisePostgresType(colName: string, rawType: string): string {
	const clean = rawType.replace(/\s*\|\s*null/g, '').trim();
	if (colName === 'id' || colName.endsWith('_id') || colName === 'user_id' || colName === 'added_by') {
		if (clean === 'number') return 'int8';
		if (clean.includes('string') && colName.includes('uuid')) return 'uuid';
	}
	if (colName === 'auth_user_id') return 'uuid';
	if (colName.includes('date') || colName.endsWith('_at')) {
		if (clean === 'string') return 'timestamptz';
	}
	if (clean === 'number') {
		if (colName.includes('count') || colName.includes('order') || colName.includes('minutes') || colName.includes('level')) {
			return 'int4';
		}
		return 'int8';
	}
	if (clean === 'boolean') return 'bool';
	if (clean === 'string[]') return '_text';
	if (clean === 'string') return 'text';
	if (clean === 'Json' || clean.includes('Json') || clean.includes('{')) return 'jsonb';
	return clean.toLowerCase();
}

/**
 * Robustly parses src/lib/types/database.types.ts into structured metadata.
 */
export function getDatabaseSchemaMetadata(): SchemaMetadata {
	const filePath = path.resolve(process.cwd(), 'src/lib/types/database.types.ts');
	if (!fs.existsSync(filePath)) {
		return { tables: [], enums: [], lastUpdated: new Date().toISOString() };
	}

	const content = fs.readFileSync(filePath, 'utf-8');
	const stat = fs.statSync(filePath);

	const tables: SchemaTable[] = [];
	const enums: SchemaEnum[] = [];

	// 1. Locate public: { Tables: { ... } Views: {
	const publicIdx = content.indexOf('  public: {\n    Tables: {');
	const viewsIdx = content.indexOf('    Views: {', publicIdx);

	if (publicIdx !== -1 && viewsIdx !== -1) {
		const tablesContent = content.substring(publicIdx + 25, viewsIdx);
		const lines = tablesContent.split('\n');

		let currentTable: Partial<SchemaTable> | null = null;
		let currentSection: 'none' | 'row' | 'insert' | 'update' | 'relationships' = 'none';
		let currentRelBlock: string[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			// Detect table name at 6 spaces indentation (e.g. "      tasks: {")
			const tableMatch = line.match(/^ {6}([a-z0-9_]+):\s*\{/);
			if (tableMatch) {
				if (currentTable && currentTable.name) {
					tables.push({
						name: currentTable.name,
						columns: currentTable.columns || [],
						relationships: currentTable.relationships || []
					});
				}
				currentTable = {
					name: tableMatch[1],
					columns: [],
					relationships: []
				};
				currentSection = 'none';
				continue;
			}

			if (!currentTable) continue;

			if (trimmed.startsWith('Row: {')) {
				currentSection = 'row';
				continue;
			} else if (trimmed.startsWith('Insert: {')) {
				currentSection = 'insert';
				continue;
			} else if (trimmed.startsWith('Update: {')) {
				currentSection = 'update';
				continue;
			} else if (trimmed.startsWith('Relationships: [')) {
				currentSection = 'relationships';
				currentRelBlock = [];
				continue;
			}

			// End of a section
			if (trimmed === '}' || trimmed === '},' || trimmed === ']') {
				if (currentSection === 'relationships') {
					if (currentRelBlock.length > 0) {
						parseRelBlock(currentRelBlock.join(' '), currentTable);
						currentRelBlock = [];
					}
				}
				currentSection = 'none';
				continue;
			}

			// Parse row columns
			if (currentSection === 'row') {
				const colMatch = trimmed.match(/^([a-z0-9_]+):\s*(.+)$/);
				if (colMatch) {
					const colName = colMatch[1];
					let colType = colMatch[2].replace(/;$/, '').trim();
					colType = colType.replace(/Database\["public"\]\["Enums"\]\["([^"]+)"\]/g, '$1');
					const isNullable = colType.includes('null');

					currentTable.columns = currentTable.columns || [];
					const isPrimaryKey = colName === 'id';
					currentTable.columns.push({
						name: colName,
						type: formatConcisePostgresType(colName, colType),
						isNullable,
						isOptionalInsert: false,
						isPrimaryKey
					});
				}
			}

			// Collect relationship lines
			if (currentSection === 'relationships') {
				currentRelBlock.push(trimmed);
				if (trimmed === '},' || trimmed === '}') {
					parseRelBlock(currentRelBlock.join(' '), currentTable);
					currentRelBlock = [];
				}
			}
		}

		if (currentTable && currentTable.name) {
			tables.push({
				name: currentTable.name,
				columns: currentTable.columns || [],
				relationships: currentTable.relationships || []
			});
		}
	}

	function parseRelBlock(blockStr: string, targetTable: Partial<SchemaTable>) {
		const fkMatch = blockStr.match(/foreignKeyName:\s*"([^"]+)"/);
		const colsMatch = blockStr.match(/columns:\s*\[([^\]]+)\]/);
		const oneToOneMatch = blockStr.match(/isOneToOne:\s*(true|false)/);
		const refRelMatch = blockStr.match(/referencedRelation:\s*"([^"]+)"/);
		const refColsMatch = blockStr.match(/referencedColumns:\s*\[([^\]]+)\]/);

		if (fkMatch && refRelMatch) {
			targetTable.relationships = targetTable.relationships || [];
			targetTable.relationships.push({
				foreignKeyName: fkMatch[1],
				columns: colsMatch ? colsMatch[1].replace(/["'\s]/g, '').split(',') : [],
				isOneToOne: oneToOneMatch ? oneToOneMatch[1] === 'true' : false,
				referencedRelation: refRelMatch[1],
				referencedColumns: refColsMatch ? refColsMatch[1].replace(/["'\s]/g, '').split(',') : []
			});
		}
	}

	// 2. Parse Enums from Constants object
	const constantsIdx = content.indexOf('export const Constants = {');
	if (constantsIdx !== -1) {
		const constantsContent = content.substring(constantsIdx);
		const enumLineRegex = /([a-z0-9_]+):\s*\[([^\]]+)\]/g;
		let match;
		while ((match = enumLineRegex.exec(constantsContent)) !== null) {
			const enumName = match[1];
			const values = match[2]
				.split(',')
				.map((v) => v.replace(/["'\s]/g, ''))
				.filter(Boolean);
			if (values.length > 0) {
				enums.push({ name: enumName, values });
			}
		}
	}

	return {
		tables: tables.sort((a, b) => a.name.localeCompare(b.name)),
		enums: enums.sort((a, b) => a.name.localeCompare(b.name)),
		lastUpdated: stat.mtime.toISOString()
	};
}
