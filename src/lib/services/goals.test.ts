import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';
import {
	fetchGoalsPage,
	createGoal,
	fetchGoalDetail,
	saveGoalArchitecture,
	createMilestone,
	deleteMilestone,
	reorderMilestones,
	fetchGoalStructure,
	fetchModuleTasksPage,
	formatGoalStructureMarkdown,
	createModule,
	createGoalTask,
	deleteGoalTask,
	GOALS_PAGE_SIZE
} from './goals-service';

function createQueryChain(result: { data: unknown; error: unknown }) {
	const chain: Record<string, unknown> = {};
	const methods = ['select', 'insert', 'update', 'delete', 'eq', 'is', 'in', 'or', 'order', 'limit', 'single'];
	for (const m of methods) {
		chain[m] = vi.fn(() => {
			if (m === 'single') {
				return Promise.resolve(result);
			}
			return chain;
		});
	}
	// Make chain thenable for queries without .single()
	chain.then = (resolve: (val: unknown) => void) => resolve(result);
	return chain;
}

describe('goals-service', () => {
	it('fetchGoalsPage returns 20 items and nextCursor when 21 rows exist', async () => {
		const rows = Array.from({ length: GOALS_PAGE_SIZE + 1 }, (_, i) => ({
			id: 100 - i,
			user_id: 'u1',
			title: `Goal ${i}`,
			north_star: null,
			start_date: null,
			target_end_date: null,
			weekly_hours_budget: null,
			status: 'draft',
			created_at: `2026-11-20T00:${String(i).padStart(2, '0')}:00Z`,
			updated_at: `2026-11-20T00:${String(i).padStart(2, '0')}:00Z`,
			total_milestones: 0,
			passed_milestones: 0
		}));

		const chain = createQueryChain({ data: rows, error: null });
		const mockClient = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;

		const res = await fetchGoalsPage(undefined, mockClient);
		expect(res.items).toHaveLength(GOALS_PAGE_SIZE);
		expect(res.hasMore).toBe(true);
		expect(res.nextCursor).toEqual({
			created_at: rows[GOALS_PAGE_SIZE - 1].created_at,
			id: rows[GOALS_PAGE_SIZE - 1].id
		});
		expect(chain.or).not.toHaveBeenCalled();
	});

	it('fetchGoalsPage applies keyset cursor filter when cursor is provided', async () => {
		const chain = createQueryChain({ data: [], error: null });
		const mockClient = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;

		const res = await fetchGoalsPage({ created_at: '2026-11-20T00:00:00Z', id: 42 }, mockClient);
		expect(res.hasMore).toBe(false);
		expect(res.nextCursor).toBeNull();
		expect(chain.or).toHaveBeenCalledWith(
			'created_at.lt.2026-11-20T00:00:00Z,and(created_at.eq.2026-11-20T00:00:00Z,id.lt.42)'
		);
	});

	it('createGoal inserts draft goal and returns GoalSummary with 0 milestones', async () => {
		const inserted = {
			id: 1,
			user_id: 'u1',
			title: 'Learn Rust',
			north_star: null,
			start_date: null,
			target_end_date: null,
			weekly_hours_budget: null,
			status: 'draft',
			created_at: '2026-11-20T00:00:00Z',
			updated_at: '2026-11-20T00:00:00Z'
		};
		const chain = createQueryChain({ data: inserted, error: null });
		const mockClient = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;

		const res = await createGoal('Learn Rust', 'u1', mockClient);
		expect(res.id).toBe(1);
		expect(res.status).toBe('draft');
		expect(res.total_milestones).toBe(0);
		expect(res.passed_milestones).toBe(0);
	});

	it('fetchGoalDetail maps milestone dod_count and returns project DoD items', async () => {
		const goalData = {
			id: 10,
			user_id: 'u1',
			title: 'Ship App',
			north_star: 'Launch v1',
			final_outcome: 'Live URL',
			start_date: null,
			target_end_date: null,
			weekly_hours_budget: 7,
			status: 'active',
			created_at: '2026-11-20T00:00:00Z',
			updated_at: '2026-11-20T00:00:00Z'
		};
		const dodData = [{ id: 1, goal_id: 10, milestone_id: null, criterion: 'Deployed', sort_order: 0 }];
		const milestonesData = [
			{
				id: 5,
				goal_id: 10,
				title: 'M1',
				sort_order: 1,
				start_date: null,
				due_date: null,
				status: 'in_progress',
				passed_at: null,
				retrospective_note: null,
				definition_of_done_items: [{ id: 2 }, { id: 3 }]
			}
		];

		const mockClient = {
			from: vi.fn((table: string) => {
				if (table === 'goals') return createQueryChain({ data: goalData, error: null });
				if (table === 'definition_of_done_items') return createQueryChain({ data: dodData, error: null });
				if (table === 'milestones') return createQueryChain({ data: milestonesData, error: null });
				return createQueryChain({ data: null, error: null });
			})
		} as unknown as SupabaseClient<Database>;

		const detail = await fetchGoalDetail(10, mockClient);
		expect(detail.title).toBe('Ship App');
		expect(detail.dod_items).toHaveLength(1);
		expect(detail.milestones).toHaveLength(1);
		expect(detail.milestones[0].dod_count).toBe(2);
	});

	it('saveGoalArchitecture updates goal and applies DoD batch ops', async () => {
		const updatedGoal = { id: 10, title: 'Updated Title' };
		const insertedDod = [{ id: 9, goal_id: 10, milestone_id: null, criterion: 'New DoD', sort_order: 1 }];

		const mockClient = {
			from: vi.fn((table: string) => {
				if (table === 'goals') return createQueryChain({ data: updatedGoal, error: null });
				if (table === 'definition_of_done_items') {
					return createQueryChain({ data: insertedDod, error: null });
				}
				return createQueryChain({ data: null, error: null });
			})
		} as unknown as SupabaseClient<Database>;

		const res = await saveGoalArchitecture(
			10,
			{ title: 'Updated Title' },
			{ inserts: [{ criterion: 'New DoD', sort_order: 1 }], deletes: [4] },
			mockClient
		);
		expect(res.goal).toEqual(updatedGoal);
		expect(res.insertedDod).toEqual(insertedDod);
		expect(res.deletedDodIds).toEqual([4]);
	});

	it('createMilestone, createModule, and createGoalTask return created records', async () => {
		const milestoneRow = {
			id: 2,
			goal_id: 1,
			title: 'M1',
			sort_order: 1,
			start_date: null,
			due_date: null,
			status: 'locked',
			passed_at: null,
			retrospective_note: null
		};
		const moduleRow = {
			id: 3,
			milestone_id: 2,
			title: 'Mod 1',
			description: null,
			sort_order: 0,
			status: 'pending'
		};
		const taskRow = {
			id: 4,
			module_id: 3,
			title: 'Task 1',
			acceptance_note: null,
			estimated_minutes: 60,
			actual_minutes: 0,
			status: 'todo',
			due_date: null,
			completed_at: null,
			sort_order: 0
		};

		const mockClient = {
			from: vi.fn((table: string) => {
				if (table === 'milestones') return createQueryChain({ data: milestoneRow, error: null });
				if (table === 'goal_modules') return createQueryChain({ data: moduleRow, error: null });
				if (table === 'goal_tasks') return createQueryChain({ data: taskRow, error: null });
				return createQueryChain({ data: null, error: null });
			})
		} as unknown as SupabaseClient<Database>;

		const m = await createMilestone(1, 'M1', 1, mockClient);
		expect(m.dod_count).toBe(0);

		const mod = await createModule(2, 'Mod 1', 0, mockClient);
		expect(mod.tasks).toEqual([]);
		expect(mod.hasMoreTasks).toBe(false);

		const task = await createGoalTask(3, 'Task 1', 60, 0, mockClient);
		expect(task.estimated_minutes).toBe(60);
	});

	it('fetchModuleTasksPage applies keyset cursor on sort_order and id', async () => {
		const chain = createQueryChain({ data: [], error: null });
		const mockClient = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;

		await fetchModuleTasksPage(3, { sort_order: 5, id: 12 }, mockClient);
		expect(chain.or).toHaveBeenCalledWith('sort_order.gt.5,and(sort_order.eq.5,id.gt.12)');
	});

	it('deleteMilestone deletes milestone by id', async () => {
		const chain = createQueryChain({ data: null, error: null });
		const mockClient = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;

		await deleteMilestone(42, mockClient);
		expect(mockClient.from).toHaveBeenCalledWith('milestones');
		expect(chain.delete).toHaveBeenCalled();
		expect(chain.eq).toHaveBeenCalledWith('id', 42);
	});

	it('fetchGoalStructure and formatGoalStructureMarkdown build nested Milestone -> Module -> Task output', async () => {
		const mockClient = {
			from: vi.fn((table: string) => {
				if (table === 'milestones') {
					return createQueryChain({
						data: [
							{
								id: 10,
								title: 'Foundation',
								status: 'in_progress',
								start_date: null,
								due_date: '2026-12-01',
								sort_order: 1
							}
						],
						error: null
					});
				}
				if (table === 'goal_modules') {
					return createQueryChain({
						data: [
							{
								id: 20,
								milestone_id: 10,
								title: 'Auth',
								status: 'pending',
								sort_order: 0
							}
						],
						error: null
					});
				}
				if (table === 'goal_tasks') {
					return createQueryChain({
						data: [
							{
								id: 30,
								module_id: 20,
								title: 'Setup RLS',
								status: 'todo',
								estimated_minutes: 45,
								sort_order: 0
							}
						],
						error: null
					});
				}
				return createQueryChain({ data: [], error: null });
			})
		} as unknown as SupabaseClient<Database>;

		const structure = await fetchGoalStructure(1, mockClient);
		const text = formatGoalStructureMarkdown(
			{
				title: 'Launch App',
				status: 'active',
				north_star: 'Ship v1',
				final_outcome: 'Live in prod',
				dod_items: [{ id: 1, goal_id: 1, milestone_id: null, criterion: 'Zero errors', sort_order: 0 }]
			},
			structure
		);

		expect(text).toContain('# Goal: Launch App (active)');
		expect(text).toContain('- Milestone 1: Foundation [in_progress] (? - 2026-12-01)');
		expect(text).toContain('  - Module: Auth [pending]');
		expect(text).toContain('    - Task: Setup RLS (45m, todo)');
	});

	it('reorderMilestones updates sort_order for each milestone', async () => {
		const chain = createQueryChain({ data: null, error: null });
		const mockClient = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;

		await reorderMilestones(
			[
				{ id: 11, sort_order: 1 },
				{ id: 10, sort_order: 2 }
			],
			mockClient
		);

		expect(mockClient.from).toHaveBeenCalledWith('milestones');
		expect(chain.update).toHaveBeenCalledWith({ sort_order: 1 });
		expect(chain.update).toHaveBeenCalledWith({ sort_order: 2 });
		expect(chain.eq).toHaveBeenCalledWith('id', 11);
		expect(chain.eq).toHaveBeenCalledWith('id', 10);
	});

	it('deleteGoalTask deletes from goal_tasks by id', async () => {
		const chain = createQueryChain({ data: null, error: null });
		const mockClient = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;

		await deleteGoalTask(42, mockClient);

		expect(mockClient.from).toHaveBeenCalledWith('goal_tasks');
		expect(chain.delete).toHaveBeenCalled();
		expect(chain.eq).toHaveBeenCalledWith('id', 42);
	});
});
