import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/services/goals-service', () => ({
	fetchGoalsPage: vi.fn(),
	createGoal: vi.fn(),
	fetchGoalDetail: vi.fn(),
	saveGoalArchitecture: vi.fn(),
	createMilestone: vi.fn(),
	deleteMilestone: vi.fn(),
	fetchMilestoneDetail: vi.fn(),
	fetchModuleTasksPage: vi.fn(),
	saveMilestoneExecution: vi.fn(),
	createModule: vi.fn(),
	createGoalTask: vi.fn()
}));

import { goalsStore } from './goals.svelte';
import * as service from '$lib/services/goals-service';

describe('goalsStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		goalsStore.goals = [];
		goalsStore.nextCursor = null;
		goalsStore.hasMore = false;
		goalsStore.initialized = false;
		goalsStore.goalBaseline = null;
		goalsStore.goalDraft = null;
		goalsStore.milestoneBaseline = null;
		goalsStore.milestoneDraft = null;
	});

	it('addGoal prepends created goal in-place', async () => {
		const created = {
			id: 99,
			user_id: 'u1',
			title: 'New Goal',
			north_star: null,
			start_date: null,
			target_end_date: null,
			weekly_hours_budget: null,
			status: 'draft' as const,
			created_at: '2026-11-20T00:00:00Z',
			updated_at: '2026-11-20T00:00:00Z',
			total_milestones: 0,
			passed_milestones: 0
		};
		vi.mocked(service.createGoal).mockResolvedValueOnce(created);

		const res = await goalsStore.addGoal('New Goal', 'u1');
		expect(res).toEqual(created);
		expect(goalsStore.goals[0]).toEqual(created);
	});

	it('detects goal dirty state, clears draft, and commits save in-place', async () => {
		const detail = {
			id: 1,
			user_id: 'u1',
			title: 'Original',
			north_star: 'Why',
			final_outcome: 'Outcome',
			start_date: null,
			target_end_date: null,
			weekly_hours_budget: 5,
			status: 'draft' as const,
			created_at: '2026-11-20T00:00:00Z',
			updated_at: '2026-11-20T00:00:00Z',
			dod_items: [],
			milestones: []
		};
		goalsStore.goals = [
			{
				...detail,
				total_milestones: 0,
				passed_milestones: 0
			}
		];
		vi.mocked(service.fetchGoalDetail).mockResolvedValueOnce(detail);

		await goalsStore.loadGoalDetail(1, true);
		expect(goalsStore.isGoalDirty).toBe(false);

		goalsStore.goalDraft!.title = 'Edited';
		expect(goalsStore.isGoalDirty).toBe(true);

		goalsStore.clearGoalDraft();
		expect(goalsStore.goalDraft!.title).toBe('Original');
		expect(goalsStore.isGoalDirty).toBe(false);

		goalsStore.goalDraft!.title = 'Saved Title';
		vi.mocked(service.saveGoalArchitecture).mockResolvedValueOnce({
			goal: { ...detail, title: 'Saved Title' },
			insertedDod: [],
			updatedDod: [],
			deletedDodIds: []
		});

		await goalsStore.commitGoalSave();
		expect(goalsStore.isGoalDirty).toBe(false);
		expect(goalsStore.goals[0].title).toBe('Saved Title');
	});

	it('loadMoreModuleTasks appends tasks and updates cursor without marking milestone dirty', async () => {
		const milestone = {
			id: 10,
			goal_id: 1,
			goal_title: 'Ship',
			title: 'M1',
			sort_order: 1,
			start_date: null,
			due_date: null,
			status: 'in_progress' as const,
			passed_at: null,
			retrospective_note: null,
			dod_items: [],
			modules: [
				{
					id: 20,
					milestone_id: 10,
					title: 'Mod',
					description: null,
					sort_order: 0,
					status: 'pending' as const,
					tasks: [],
					hasMoreTasks: true,
					tasksCursor: { sort_order: 19, id: 20 }
				}
			]
		};
		vi.mocked(service.fetchMilestoneDetail).mockResolvedValueOnce(milestone);
		vi.mocked(service.fetchModuleTasksPage).mockResolvedValueOnce({
			items: [
				{
					id: 21,
					module_id: 20,
					title: 'Task 21',
					acceptance_note: null,
					estimated_minutes: 60,
					actual_minutes: 0,
					status: 'todo',
					due_date: null,
					completed_at: null,
					sort_order: 20
				}
			],
			nextCursor: null,
			hasMore: false
		});

		await goalsStore.loadMilestoneDetail(10, true);
		expect(goalsStore.isMilestoneDirty).toBe(false);

		await goalsStore.loadMoreModuleTasks(20);
		expect(goalsStore.milestoneDraft!.modules[0].tasks).toHaveLength(1);
		expect(goalsStore.milestoneDraft!.modules[0].hasMoreTasks).toBe(false);
		expect(goalsStore.isMilestoneDirty).toBe(false);
	});

	it('deleteMilestone removes milestone from goal draft, baseline, and summary counts in-place', async () => {
		const detail = {
			id: 1,
			user_id: 'u1',
			title: 'Ship',
			north_star: null,
			final_outcome: null,
			start_date: null,
			target_end_date: null,
			weekly_hours_budget: null,
			status: 'active' as const,
			created_at: '2026-11-20T00:00:00Z',
			updated_at: '2026-11-20T00:00:00Z',
			dod_items: [],
			milestones: [
				{
					id: 10,
					goal_id: 1,
					title: 'M1',
					sort_order: 1,
					start_date: null,
					due_date: null,
					status: 'passed' as const,
					passed_at: null,
					retrospective_note: null,
					dod_count: 2
				},
				{
					id: 11,
					goal_id: 1,
					title: 'M2',
					sort_order: 2,
					start_date: null,
					due_date: null,
					status: 'locked' as const,
					passed_at: null,
					retrospective_note: null,
					dod_count: 0
				}
			]
		};
		goalsStore.goals = [
			{
				...detail,
				total_milestones: 2,
				passed_milestones: 1
			}
		];
		vi.mocked(service.fetchGoalDetail).mockResolvedValueOnce(detail);
		await goalsStore.loadGoalDetail(1, true);

		vi.mocked(service.deleteMilestone).mockResolvedValueOnce(undefined);
		await goalsStore.deleteMilestone(10, 1);

		expect(service.deleteMilestone).toHaveBeenCalledWith(10);
		expect(goalsStore.goalDraft?.milestones.map((m) => m.id)).toEqual([11]);
		expect(goalsStore.goalBaseline?.milestones.map((m) => m.id)).toEqual([11]);
		expect(goalsStore.goals[0].total_milestones).toBe(1);
		expect(goalsStore.goals[0].passed_milestones).toBe(0);
	});
});
