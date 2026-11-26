import type {
	DefinitionOfDoneItem,
	GoalDetail,
	GoalModuleWithTasks,
	GoalSummary,
	MilestoneDetail,
	MilestoneSummary
} from '$lib/types/goals';
import {
	createGoal,
	createGoalTask,
	createMilestone,
	createModule,
	deleteGoalTask as deleteGoalTaskService,
	deleteMilestone as deleteMilestoneService,
	fetchGoalDetail,
	fetchGoalStructure,
	fetchGoalsPage,
	fetchMilestoneDetail,
	fetchModuleTasksPage,
	formatGoalStructureMarkdown,
	reorderMilestones as reorderMilestonesService,
	saveGoalArchitecture,
	saveMilestoneExecution,
	type DodBatchOps,
	type GoalsCursor,
	type ModuleBatchOps,
	type TaskBatchOps
} from '$lib/services/goals-service';

function clone<T>(value: T): T {
	return structuredClone($state.snapshot(value)) as T;
}

function stableEqual(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

class GoalsStore {
	// Directory state
	goals = $state<GoalSummary[]>([]);
	nextCursor = $state<GoalsCursor | null>(null);
	hasMore = $state(false);
	loading = $state(false);
	initialized = $state(false);

	// In-memory caches (cache-first navigation)
	private goalCache = new Map<number, GoalDetail>();
	private milestoneCache = new Map<number, MilestoneDetail>();

	// Goal Detail draft & dirty state
	goalBaseline = $state<GoalDetail | null>(null);
	goalDraft = $state<GoalDetail | null>(null);
	goalLoading = $state(false);
	goalSaving = $state(false);

	isGoalDirty = $derived(
		this.goalBaseline !== null &&
			this.goalDraft !== null &&
			!stableEqual(this.goalBaseline, this.goalDraft)
	);

	// Milestone Detail draft & dirty state
	milestoneBaseline = $state<MilestoneDetail | null>(null);
	milestoneDraft = $state<MilestoneDetail | null>(null);
	milestoneLoading = $state(false);
	milestoneSaving = $state(false);

	isMilestoneDirty = $derived(
		this.milestoneBaseline !== null &&
			this.milestoneDraft !== null &&
			!stableEqual(this.milestoneBaseline, this.milestoneDraft)
	);

	async loadGoals(force = false): Promise<void> {
		if (this.initialized && !force) return;
		this.loading = true;
		try {
			const page = await fetchGoalsPage();
			this.goals = page.items;
			this.nextCursor = page.nextCursor;
			this.hasMore = page.hasMore;
			this.initialized = true;
		} finally {
			this.loading = false;
		}
	}

	async loadMore(): Promise<void> {
		if (this.loading || !this.hasMore || !this.nextCursor) return;
		this.loading = true;
		try {
			const page = await fetchGoalsPage(this.nextCursor);
			this.goals = [...this.goals, ...page.items];
			this.nextCursor = page.nextCursor;
			this.hasMore = page.hasMore;
		} finally {
			this.loading = false;
		}
	}

	async addGoal(title: string, userId: string): Promise<GoalSummary> {
		const created = await createGoal(title, userId);
		this.goals = [created, ...this.goals];
		return created;
	}

	async loadGoalDetail(goalId: number, force = false): Promise<void> {
		const cached = this.goalCache.get(goalId);
		if (cached && !force) {
			this.goalBaseline = clone(cached);
			this.goalDraft = clone(cached);
			return;
		}

		this.goalLoading = true;
		try {
			const detail = await fetchGoalDetail(goalId);
			this.goalCache.set(goalId, clone(detail));
			this.goalBaseline = clone(detail);
			this.goalDraft = clone(detail);
		} finally {
			this.goalLoading = false;
		}
	}

	clearGoalDraft(): void {
		if (!this.goalBaseline) return;
		this.goalDraft = clone(this.goalBaseline);
	}

	async commitGoalSave(): Promise<void> {
		if (!this.goalBaseline || !this.goalDraft || !this.isGoalDirty) return;
		this.goalSaving = true;
		try {
			const base = this.goalBaseline;
			const draft = this.goalDraft;

			const goalPatch: Record<string, unknown> = {};
			if (draft.title !== base.title) goalPatch.title = draft.title;
			if (draft.north_star !== base.north_star) goalPatch.north_star = draft.north_star;
			if (draft.final_outcome !== base.final_outcome) goalPatch.final_outcome = draft.final_outcome;
			if (draft.start_date !== base.start_date) goalPatch.start_date = draft.start_date;
			if (draft.target_end_date !== base.target_end_date) {
				goalPatch.target_end_date = draft.target_end_date;
			}
			if (draft.weekly_hours_budget !== base.weekly_hours_budget) {
				goalPatch.weekly_hours_budget = draft.weekly_hours_budget;
			}
			if (draft.status !== base.status) goalPatch.status = draft.status;

			const dodOps = diffDodItems(base.dod_items, draft.dod_items);
			const milestoneOrderUpdates = diffMilestoneOrder(base.milestones, draft.milestones);
			const [res] = await Promise.all([
				saveGoalArchitecture(base.id, goalPatch, dodOps),
				reorderMilestonesService(milestoneOrderUpdates)
			]);

			for (const upd of milestoneOrderUpdates) {
				const cachedMilestone = this.milestoneCache.get(upd.id);
				if (cachedMilestone) {
					this.milestoneCache.set(upd.id, { ...cachedMilestone, sort_order: upd.sort_order });
				}
			}

			const updatedGoal: GoalDetail = {
				...draft,
				...(res.goal ?? {}),
				dod_items: mergeDodResults(draft.dod_items, res.insertedDod, res.updatedDod)
			};

			this.goalCache.set(updatedGoal.id, clone(updatedGoal));
			this.goalBaseline = clone(updatedGoal);
			this.goalDraft = clone(updatedGoal);

			// Update directory summary in-place
			this.goals = this.goals.map((g) =>
				g.id === updatedGoal.id
					? {
							...g,
							title: updatedGoal.title,
							north_star: updatedGoal.north_star,
							start_date: updatedGoal.start_date,
							target_end_date: updatedGoal.target_end_date,
							weekly_hours_budget: updatedGoal.weekly_hours_budget,
							status: updatedGoal.status,
							updated_at: updatedGoal.updated_at
						}
					: g
			);
		} finally {
			this.goalSaving = false;
		}
	}

	reorderMilestones(fromIndex: number, toIndex: number): void {
		if (!this.goalDraft) return;
		const reordered = reorderList(this.goalDraft.milestones, fromIndex, toIndex, 1);
		if (reordered === this.goalDraft.milestones) return;
		this.goalDraft = {
			...this.goalDraft,
			milestones: reordered
		};
	}

	async addMilestone(goalId: number, title: string): Promise<MilestoneSummary> {
		const currentMilestones = this.goalDraft?.milestones ?? [];
		const nextOrder =
			currentMilestones.length > 0
				? Math.max(...currentMilestones.map((m) => m.sort_order)) + 1
				: 1;
		const created = await createMilestone(goalId, title, nextOrder);

		if (this.goalBaseline && this.goalBaseline.id === goalId) {
			this.goalBaseline = {
				...this.goalBaseline,
				milestones: [...this.goalBaseline.milestones, clone(created)]
			};
		}
		if (this.goalDraft && this.goalDraft.id === goalId) {
			this.goalDraft = {
				...this.goalDraft,
				milestones: [...this.goalDraft.milestones, clone(created)]
			};
			this.goalCache.set(goalId, clone(this.goalBaseline ?? this.goalDraft));
		}

		this.goals = this.goals.map((g) =>
			g.id === goalId ? { ...g, total_milestones: g.total_milestones + 1 } : g
		);

		return created;
	}

	async deleteMilestone(milestoneId: number, goalId?: number): Promise<void> {
		const targetGoalId =
			goalId ??
			this.milestoneBaseline?.goal_id ??
			this.milestoneDraft?.goal_id ??
			this.goalDraft?.id ??
			this.goalBaseline?.id;

		const deletedFromGoal =
			this.goalBaseline?.milestones.find((m) => m.id === milestoneId) ??
			this.goalDraft?.milestones.find((m) => m.id === milestoneId);
		const wasPassed =
			deletedFromGoal?.status === 'passed' ||
			(this.milestoneBaseline?.id === milestoneId && this.milestoneBaseline.status === 'passed');

		await deleteMilestoneService(milestoneId);

		this.milestoneCache.delete(milestoneId);
		if (this.milestoneBaseline?.id === milestoneId) {
			this.milestoneBaseline = null;
		}
		if (this.milestoneDraft?.id === milestoneId) {
			this.milestoneDraft = null;
		}

		if (this.goalBaseline && (!targetGoalId || this.goalBaseline.id === targetGoalId)) {
			this.goalBaseline = {
				...this.goalBaseline,
				milestones: this.goalBaseline.milestones.filter((m) => m.id !== milestoneId)
			};
			this.goalCache.set(this.goalBaseline.id, clone(this.goalBaseline));
		} else if (targetGoalId) {
			const cachedGoal = this.goalCache.get(targetGoalId);
			if (cachedGoal) {
				this.goalCache.set(targetGoalId, {
					...cachedGoal,
					milestones: cachedGoal.milestones.filter((m) => m.id !== milestoneId)
				});
			}
		}

		if (this.goalDraft && (!targetGoalId || this.goalDraft.id === targetGoalId)) {
			this.goalDraft = {
				...this.goalDraft,
				milestones: this.goalDraft.milestones.filter((m) => m.id !== milestoneId)
			};
		}

		if (targetGoalId) {
			this.goals = this.goals.map((g) =>
				g.id === targetGoalId
					? {
							...g,
							total_milestones: Math.max(0, g.total_milestones - 1),
							passed_milestones: wasPassed
								? Math.max(0, g.passed_milestones - 1)
								: g.passed_milestones
						}
					: g
			);
		}
	}

	async exportGoalStructure(goalId: number): Promise<string> {
		const goal =
			this.goalDraft?.id === goalId ? this.goalDraft : await fetchGoalDetail(goalId);
		const milestones = await fetchGoalStructure(goalId);
		return formatGoalStructureMarkdown(goal, milestones);
	}

	async loadMilestoneDetail(milestoneId: number, force = false): Promise<void> {
		const cached = this.milestoneCache.get(milestoneId);
		if (cached && !force) {
			this.milestoneBaseline = clone(cached);
			this.milestoneDraft = clone(cached);
			return;
		}

		this.milestoneLoading = true;
		try {
			const detail = await fetchMilestoneDetail(milestoneId);
			this.milestoneCache.set(milestoneId, clone(detail));
			this.milestoneBaseline = clone(detail);
			this.milestoneDraft = clone(detail);
		} finally {
			this.milestoneLoading = false;
		}
	}

	clearMilestoneDraft(): void {
		if (!this.milestoneBaseline) return;
		this.milestoneDraft = clone(this.milestoneBaseline);
	}

	async loadMoreModuleTasks(moduleId: number): Promise<void> {
		if (!this.milestoneDraft) return;
		const mod = this.milestoneDraft.modules.find((m) => m.id === moduleId);
		if (!mod || !mod.hasMoreTasks || !mod.tasksCursor) return;

		const page = await fetchModuleTasksPage(moduleId, mod.tasksCursor);

		const appendToModules = (modules: GoalModuleWithTasks[]) =>
			modules.map((m) =>
				m.id === moduleId
					? {
							...m,
							tasks: [...m.tasks, ...page.items],
							hasMoreTasks: page.hasMore,
							tasksCursor: page.nextCursor
						}
					: m
			);

		this.milestoneDraft = {
			...this.milestoneDraft,
			modules: appendToModules(this.milestoneDraft.modules)
		};
		if (this.milestoneBaseline) {
			this.milestoneBaseline = {
				...this.milestoneBaseline,
				modules: appendToModules(this.milestoneBaseline.modules)
			};
			this.milestoneCache.set(this.milestoneBaseline.id, clone(this.milestoneBaseline));
		}
	}

	reorderModules(fromIndex: number, toIndex: number): void {
		if (!this.milestoneDraft) return;
		const reordered = reorderList(this.milestoneDraft.modules, fromIndex, toIndex, 0);
		if (reordered === this.milestoneDraft.modules) return;
		this.milestoneDraft = {
			...this.milestoneDraft,
			modules: reordered
		};
	}

	async addModule(milestoneId: number, title: string): Promise<GoalModuleWithTasks> {
		const mods = this.milestoneDraft?.modules ?? [];
		const nextOrder = mods.length > 0 ? Math.max(...mods.map((m) => m.sort_order)) + 1 : 0;
		const created = await createModule(milestoneId, title, nextOrder);

		if (this.milestoneBaseline && this.milestoneBaseline.id === milestoneId) {
			this.milestoneBaseline = {
				...this.milestoneBaseline,
				modules: [...this.milestoneBaseline.modules, clone(created)]
			};
			this.milestoneCache.set(milestoneId, clone(this.milestoneBaseline));
		}
		if (this.milestoneDraft && this.milestoneDraft.id === milestoneId) {
			this.milestoneDraft = {
				...this.milestoneDraft,
				modules: [...this.milestoneDraft.modules, clone(created)]
			};
		}

		return created;
	}

	async addTask(moduleId: number, title: string, estimatedMinutes = 60): Promise<void> {
		if (!this.milestoneDraft) return;
		const mod = this.milestoneDraft.modules.find((m) => m.id === moduleId);
		const nextOrder =
			mod && mod.tasks.length > 0 ? Math.max(...mod.tasks.map((t) => t.sort_order)) + 1 : 0;

		const created = await createGoalTask(moduleId, title, estimatedMinutes, nextOrder);

		const appendTask = (modules: GoalModuleWithTasks[]) =>
			modules.map((m) =>
				m.id === moduleId ? { ...m, tasks: [...m.tasks, clone(created)] } : m
			);

		this.milestoneDraft = {
			...this.milestoneDraft,
			modules: appendTask(this.milestoneDraft.modules)
		};
		if (this.milestoneBaseline) {
			this.milestoneBaseline = {
				...this.milestoneBaseline,
				modules: appendTask(this.milestoneBaseline.modules)
			};
			this.milestoneCache.set(this.milestoneBaseline.id, clone(this.milestoneBaseline));
		}
	}

	async deleteTask(moduleId: number, taskId: number): Promise<void> {
		await deleteGoalTaskService(taskId);

		const removeTask = (modules: GoalModuleWithTasks[]) =>
			modules.map((m) =>
				m.id === moduleId ? { ...m, tasks: m.tasks.filter((t) => t.id !== taskId) } : m
			);

		if (this.milestoneDraft) {
			this.milestoneDraft = {
				...this.milestoneDraft,
				modules: removeTask(this.milestoneDraft.modules)
			};
		}
		if (this.milestoneBaseline) {
			this.milestoneBaseline = {
				...this.milestoneBaseline,
				modules: removeTask(this.milestoneBaseline.modules)
			};
			this.milestoneCache.set(this.milestoneBaseline.id, clone(this.milestoneBaseline));
		}
	}

	async commitMilestoneSave(): Promise<void> {
		if (!this.milestoneBaseline || !this.milestoneDraft || !this.isMilestoneDirty) return;
		this.milestoneSaving = true;
		try {
			const base = this.milestoneBaseline;
			const draft = this.milestoneDraft;

			const milestonePatch: Record<string, unknown> = {};
			if (draft.title !== base.title) milestonePatch.title = draft.title;
			if (draft.status !== base.status) milestonePatch.status = draft.status;
			if (draft.start_date !== base.start_date) milestonePatch.start_date = draft.start_date;
			if (draft.due_date !== base.due_date) milestonePatch.due_date = draft.due_date;
			if (draft.passed_at !== base.passed_at) milestonePatch.passed_at = draft.passed_at;
			if (draft.retrospective_note !== base.retrospective_note) {
				milestonePatch.retrospective_note = draft.retrospective_note;
			}

			const dodOps = diffDodItems(base.dod_items, draft.dod_items);
			const moduleOps = diffModules(base.modules, draft.modules);
			const taskOps = diffTasks(base.modules, draft.modules);

			const res = await saveMilestoneExecution(
				base.id,
				base.goal_id,
				milestonePatch,
				dodOps,
				moduleOps,
				taskOps
			);

			const updatedMilestone: MilestoneDetail = {
				...draft,
				...(res.milestone ?? {}),
				dod_items: mergeDodResults(draft.dod_items, res.dod.insertedDod, res.dod.updatedDod)
			};

			this.milestoneCache.set(updatedMilestone.id, clone(updatedMilestone));
			this.milestoneBaseline = clone(updatedMilestone);
			this.milestoneDraft = clone(updatedMilestone);
		} finally {
			this.milestoneSaving = false;
		}
	}
}

function diffDodItems(
	base: DefinitionOfDoneItem[],
	draft: DefinitionOfDoneItem[]
): DodBatchOps {
	const baseMap = new Map(base.map((item) => [item.id, item]));
	const draftIds = new Set(draft.map((item) => item.id));

	const deletes = base.filter((item) => !draftIds.has(item.id)).map((item) => item.id);
	const inserts = draft
		.filter((item) => item.id < 0)
		.map((item) => ({ criterion: item.criterion, sort_order: item.sort_order }));
	const updates = draft
		.filter((item) => {
			if (item.id < 0) return false;
			const orig = baseMap.get(item.id);
			return orig && (orig.criterion !== item.criterion || orig.sort_order !== item.sort_order);
		})
		.map((item) => ({ id: item.id, criterion: item.criterion, sort_order: item.sort_order }));

	return { inserts, updates, deletes };
}

function mergeDodResults(
	draft: DefinitionOfDoneItem[],
	inserted: DefinitionOfDoneItem[],
	updated: DefinitionOfDoneItem[]
): DefinitionOfDoneItem[] {
	const updatedMap = new Map(updated.map((u) => [u.id, u]));
	let insertIdx = 0;
	return draft.map((item) => {
		if (item.id < 0 && insertIdx < inserted.length) {
			return inserted[insertIdx++];
		}
		return updatedMap.get(item.id) ?? item;
	});
}

function diffModules(
	base: GoalModuleWithTasks[],
	draft: GoalModuleWithTasks[]
): ModuleBatchOps {
	const baseMap = new Map(base.map((m) => [m.id, m]));
	const draftIds = new Set(draft.map((m) => m.id));

	const deletes = base.filter((m) => !draftIds.has(m.id)).map((m) => m.id);
	const updates: NonNullable<ModuleBatchOps['updates']> = [];

	for (const mod of draft) {
		const orig = baseMap.get(mod.id);
		if (!orig) continue;
		const patch: NonNullable<ModuleBatchOps['updates']>[number] = { id: mod.id };
		let changed = false;
		if (mod.title !== orig.title) {
			patch.title = mod.title;
			changed = true;
		}
		if (mod.description !== orig.description) {
			patch.description = mod.description;
			changed = true;
		}
		if (mod.sort_order !== orig.sort_order) {
			patch.sort_order = mod.sort_order;
			changed = true;
		}
		if (mod.status !== orig.status) {
			patch.status = mod.status;
			changed = true;
		}
		if (changed) updates.push(patch);
	}

	return { updates, deletes };
}

function diffTasks(base: GoalModuleWithTasks[], draft: GoalModuleWithTasks[]): TaskBatchOps {
	const baseTasks = new Map(base.flatMap((m) => m.tasks.map((t) => [t.id, t])));
	const draftTasks = draft.flatMap((m) => m.tasks);
	const draftIds = new Set(draftTasks.map((t) => t.id));

	const deletes = Array.from(baseTasks.keys()).filter((id) => !draftIds.has(id));
	const updates: NonNullable<TaskBatchOps['updates']> = [];

	for (const task of draftTasks) {
		const orig = baseTasks.get(task.id);
		if (!orig) continue;
		const patch: NonNullable<TaskBatchOps['updates']>[number] = { id: task.id };
		let changed = false;
		if (task.title !== orig.title) {
			patch.title = task.title;
			changed = true;
		}
		if (task.acceptance_note !== orig.acceptance_note) {
			patch.acceptance_note = task.acceptance_note;
			changed = true;
		}
		if (task.estimated_minutes !== orig.estimated_minutes) {
			patch.estimated_minutes = task.estimated_minutes;
			changed = true;
		}
		if (task.actual_minutes !== orig.actual_minutes) {
			patch.actual_minutes = task.actual_minutes;
			changed = true;
		}
		if (task.status !== orig.status) {
			patch.status = task.status;
			changed = true;
		}
		if (task.due_date !== orig.due_date) {
			patch.due_date = task.due_date;
			changed = true;
		}
		if (task.completed_at !== orig.completed_at) {
			patch.completed_at = task.completed_at;
			changed = true;
		}
		if (task.sort_order !== orig.sort_order) {
			patch.sort_order = task.sort_order;
			changed = true;
		}
		if (changed) updates.push(patch);
	}

	return { updates, deletes };
}

function reorderList<T extends { sort_order: number }>(
	items: T[],
	fromIndex: number,
	toIndex: number,
	startOrder = 0
): T[] {
	if (
		fromIndex === toIndex ||
		fromIndex < 0 ||
		toIndex < 0 ||
		fromIndex >= items.length ||
		toIndex >= items.length
	) {
		return items;
	}
	const copy = [...items];
	const [moved] = copy.splice(fromIndex, 1);
	copy.splice(toIndex, 0, moved);
	return copy.map((item, idx) => ({ ...item, sort_order: startOrder + idx }));
}

function diffMilestoneOrder(
	base: MilestoneSummary[],
	draft: MilestoneSummary[]
): Array<{ id: number; sort_order: number }> {
	const baseMap = new Map(base.map((m) => [m.id, m]));
	const updates: Array<{ id: number; sort_order: number }> = [];
	for (const m of draft) {
		const orig = baseMap.get(m.id);
		if (orig && orig.sort_order !== m.sort_order) {
			updates.push({ id: m.id, sort_order: m.sort_order });
		}
	}
	return updates;
}

export const goalsStore = new GoalsStore();
