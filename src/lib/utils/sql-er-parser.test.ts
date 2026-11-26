import { describe, expect, it } from 'vitest';
import { exportTablesToSql, parseSqlDdl } from './sql-er-parser';
import type { ErTable } from '$lib/types/er';

describe('sql-er-parser', () => {
	it('parses CREATE TABLE with inline PK, NOT NULL, and REFERENCES', () => {
		const sql = `
			-- Users table
			CREATE TABLE public.er_diagrams (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
				name text NOT NULL,
				created_at timestamptz DEFAULT now()
			);
		`;
		const res = parseSqlDdl(sql);
		expect(res.tables).toHaveLength(1);
		const t = res.tables[0];
		expect(t.name).toBe('er_diagrams');
		expect(t.columns).toHaveLength(4);
		expect(t.columns[0]).toMatchObject({ name: 'id', type: 'uuid', is_pk: true, nullable: false });
		expect(t.columns[1]).toMatchObject({
			name: 'user_id',
			type: 'uuid',
			nullable: false,
			fk_target: { table: 'users', column: 'id' }
		});
		expect(t.relations).toEqual([{ from_column: 'user_id', to_table: 'users', to_column: 'id' }]);
	});

	it('parses table-level PRIMARY KEY and FOREIGN KEY constraints', () => {
		const sql = `
			CREATE TABLE public.order_items (
				order_id uuid NOT NULL,
				product_id uuid NOT NULL,
				qty int4 DEFAULT 1,
				PRIMARY KEY (order_id, product_id),
				CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES public.orders(id)
			);
		`;
		const res = parseSqlDdl(sql);
		expect(res.tables).toHaveLength(1);
		const t = res.tables[0];
		expect(t.columns[0]).toMatchObject({
			name: 'order_id',
			is_pk: true,
			fk_target: { table: 'orders', column: 'id' }
		});
		expect(t.columns[1]).toMatchObject({ name: 'product_id', is_pk: true });
		expect(t.relations).toEqual([{ from_column: 'order_id', to_table: 'orders', to_column: 'id' }]);
	});

	it('exports ErTable[] back to CREATE TABLE SQL', () => {
		const tables: ErTable[] = [
			{
				id: '1',
				diagram_id: 'd1',
				group_id: null,
				user_id: 'u1',
				name: 'goals',
				columns: [
					{ name: 'id', type: 'uuid', is_pk: true, nullable: false },
					{ name: 'user_id', type: 'uuid', nullable: false, fk_target: { table: 'users', column: 'id' } }
				],
				relations: [{ from_column: 'user_id', to_table: 'users', to_column: 'id' }],
				position: { x: 0, y: 0 },
				created_at: '',
				updated_at: ''
			}
		];
		const sql = exportTablesToSql(tables);
		expect(sql).toContain('CREATE TABLE public.goals');
		expect(sql).toContain('id uuid PRIMARY KEY');
		expect(sql).toContain('user_id uuid NOT NULL REFERENCES public.users(id)');
	});
});
