import { getSupabaseClient } from '$lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';
import type {
	DefinitionOfDoneItem,
	GoalDetail,
	GoalModuleStatus,
	GoalModuleWithTasks,
	GoalStatus,
	GoalSummary,
	GoalTask,
	GoalTaskStatus,
	MilestoneDetail,
	MilestoneStatus,
	MilestoneSummary
} from '$lib/types/goals';

export const GOALS_PAGE_SIZE = 20;

const GOAL_SUMMARY_COLS =
	'id, user_id, title, north_star, start_date, target_end_date, weekly_hours_budget, status, created_at, updated_at, total_milestones, passed_milestones';

const GOAL_DETAIL_COLS =
	'id, user_id, title, north_star, final_outcome, start_date, target_end_date, weekly_hours_budget, status, created_at, updated_at';

const MILESTONE_COLS =
	'id, goal_id, title, sort_order, start_date, due_date, status, passed_at, retrospective_note';

const DOD_COLS = 'id, goal_id, milestone_id, criterion, sort_order';

const MODULE_COLS = 'id, milestone_id, title, description, sort_order, status';

const TASK_COLS =
	'id, module_id, title, acceptance_note, estimated_minutes, actual_minutes, status, due_date, completed_at, sort_order';

function getClient(client?: SupabaseClient<Database>): SupabaseClient<Database> {
	return client || getSupabaseClient();
}

export interface GoalsCursor {
	created_at: string;
	id: number;
}

export interface TasksCursor {
	sort_order: number;
	id: number;
}

export interface DodBatchOps {
	inserts?: Array<{ criterion: string; sort_order: number }>;
	updates?: Array<{ id: number; criterion: string; sort_order: number }>;
	deletes?: number[];
}

export interface ModuleBatchOps {
	inserts?: Array<{ title: string; description?: string | null; sort_order: number; status?: GoalModuleStatus }>;
	updates?: Array<{
		id: number;
		title?: string;
		description?: string | null;
		sort_order?: number;
		status?: GoalModuleStatus;
	}>;
	deletes?: number[];
}

export interface TaskBatchOps {
	inserts?: Array<{
		module_id: number;
		title: string;
		acceptance_note?: string | null;
		estimated_minutes?: number;
		actual_minutes?: number | null;
		status?: GoalTaskStatus;
		due_date?: string | null;
		sort_order: number;
	}>;
	updates?: Array<{
		id: number;
		title?: string;
		acceptance_note?: string | null;
		estimated_minutes?: number;
		actual_minutes?: number | null;
		status?: GoalTaskStatus;
		due_date?: string | null;
		completed_at?: string | null;
		sort_order?: number;
	}>;
	deletes?: number[];
}

/**
 * Fetch a keyset-paginated page of goal summaries (20 per page).
 */
export async function fetchGoalsPage(
	cursor?: GoalsCursor,
	customClient?: SupabaseClient<Database>
): Promise<{ items: GoalSummary[]; nextCursor: GoalsCursor | null; hasMore: boolean }> {
	const supabase = getClient(customClient);
	let query = supabase
		.from('goal_summaries')
		.select(GOAL_SUMMARY_COLS)
		.order('created_at', { ascending: false })
		.order('id', { ascending: false })
		.limit(GOALS_PAGE_SIZE + 1);

	if (cursor) {
		query = query.or(
			`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
		);
	}

	const { data, error } = await query;
	if (error) throw error;

	const rows = (data ?? []) as GoalSummary[];
	const hasMore = rows.length > GOALS_PAGE_SIZE;
	const items = hasMore ? rows.slice(0, GOALS_PAGE_SIZE) : rows;
	const last = items[items.length - 1];
	const nextCursor = hasMore && last ? { created_at: last.created_at, id: last.id } : null;

	return { items, nextCursor, hasMore };
}

/**
 * Create a new goal in 'draft' status and return its summary record.
 */
export async function createGoal(
	title: string,
	userId: string,
	customClient?: SupabaseClient<Database>
): Promise<GoalSummary> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase
		.from('goals')
		.insert({ user_id: userId, title, status: 'draft' })
		.select(
			'id, user_id, title, north_star, start_date, target_end_date, weekly_hours_budget, status, created_at, updated_at'
		)
		.single();

	if (error) throw error;

	return {
		...(data as Omit<GoalSummary, 'total_milestones' | 'passed_milestones'>),
		total_milestones: 0,
		passed_milestones: 0
	};
}

/**
 * Fetch full goal architecture: goal row, project-level DoD items, and ordered milestones.
 */
export async function fetchGoalDetail(
	goalId: number,
	customClient?: SupabaseClient<Database>
): Promise<GoalDetail> {
	const supabase = getClient(customClient);

	const [goalRes, dodRes, milestonesRes] = await Promise.all([
		supabase.from('goals').select(GOAL_DETAIL_COLS).eq('id', goalId).single(),
		supabase
			.from('definition_of_done_items')
			.select(DOD_COLS)
			.eq('goal_id', goalId)
			.is('milestone_id', null)
			.order('sort_order', { ascending: true })
			.order('id', { ascending: true }),
		supabase
			.from('milestones')
			.select(`${MILESTONE_COLS}, definition_of_done_items(id)`)
			.eq('goal_id', goalId)
			.order('sort_order', { ascending: true })
			.order('id', { ascending: true })
	]);

	if (goalRes.error) throw goalRes.error;
	if (dodRes.error) throw dodRes.error;
	if (milestonesRes.error) throw milestonesRes.error;

	const milestones: MilestoneSummary[] = (milestonesRes.data ?? []).map((m) => {
		const { definition_of_done_items: dods, ...rest } = m as typeof m & {
			definition_of_done_items: Array<{ id: number }>;
		};
		return {
			...(rest as Omit<MilestoneSummary, 'dod_count'>),
			dod_count: dods?.length ?? 0
		};
	});

	return {
		...(goalRes.data as Omit<GoalDetail, 'dod_items' | 'milestones'>),
		dod_items: (dodRes.data ?? []) as DefinitionOfDoneItem[],
		milestones
	};
}

export interface GoalStructureModule {
	id: number;
	milestone_id: number;
	title: string;
	status: string;
	tasks: Array<{
		id: number;
		module_id: number;
		title: string;
		status: string;
		estimated_minutes: number;
	}>;
}

export interface GoalStructureMilestone {
	id: number;
	title: string;
	status: string;
	start_date: string | null;
	due_date: string | null;
	modules: GoalStructureModule[];
}

/**
 * Fetch the full Milestone -> Module -> Task hierarchy for a goal.
 */
export async function fetchGoalStructure(
	goalId: number,
	customClient?: SupabaseClient<Database>
): Promise<GoalStructureMilestone[]> {
	const supabase = getClient(customClient);

	const { data: milestonesData, error: mErr } = await supabase
		.from('milestones')
		.select('id, title, status, start_date, due_date, sort_order')
		.eq('goal_id', goalId)
		.order('sort_order', { ascending: true })
		.order('id', { ascending: true });
	if (mErr) throw mErr;

	const milestones = (milestonesData ?? []) as Array<{
		id: number;
		title: string;
		status: string;
		start_date: string | null;
		due_date: string | null;
		sort_order: number;
	}>;
	if (milestones.length === 0) return [];

	const milestoneIds = milestones.map((m) => m.id);
	const { data: modulesData, error: modErr } = await supabase
		.from('goal_modules')
		.select('id, milestone_id, title, status, sort_order')
		.in('milestone_id', milestoneIds)
		.order('sort_order', { ascending: true })
		.order('id', { ascending: true });
	if (modErr) throw modErr;

	const modules = (modulesData ?? []) as Array<{
		id: number;
		milestone_id: number;
		title: string;
		status: string;
		sort_order: number;
	}>;

	let tasks: Array<{
		id: number;
		module_id: number;
		title: string;
		status: string;
		estimated_minutes: number;
		sort_order: number;
	}> = [];
	if (modules.length > 0) {
		const moduleIds = modules.map((mod) => mod.id);
		const { data: tasksData, error: tErr } = await supabase
			.from('goal_tasks')
			.select('id, module_id, title, status, estimated_minutes, sort_order')
			.in('module_id', moduleIds)
			.order('sort_order', { ascending: true })
			.order('id', { ascending: true });
		if (tErr) throw tErr;
		tasks = (tasksData ?? []) as typeof tasks;
	}

	const tasksByModule = new Map<number, GoalStructureModule['tasks']>();
	for (const t of tasks) {
		const list = tasksByModule.get(t.module_id) ?? [];
		list.push({
			id: t.id,
			module_id: t.module_id,
			title: t.title,
			status: t.status,
			estimated_minutes: t.estimated_minutes
		});
		tasksByModule.set(t.module_id, list);
	}

	const modulesByMilestone = new Map<number, GoalStructureModule[]>();
	for (const mod of modules) {
		const list = modulesByMilestone.get(mod.milestone_id) ?? [];
		list.push({
			id: mod.id,
			milestone_id: mod.milestone_id,
			title: mod.title,
			status: mod.status,
			tasks: tasksByModule.get(mod.id) ?? []
		});
		modulesByMilestone.set(mod.milestone_id, list);
	}

	return milestones.map((m) => ({
		id: m.id,
		title: m.title,
		status: m.status,
		start_date: m.start_date,
		due_date: m.due_date,
		modules: modulesByMilestone.get(m.id) ?? []
	}));
}

/**
 * Format a goal's Milestone -> Module -> Task hierarchy as Markdown for thinking or AI prompting.
 */
export function formatGoalStructureMarkdown(
	goal: Pick<GoalDetail, 'title' | 'status' | 'north_star' | 'final_outcome' | 'dod_items'>,
	milestones: GoalStructureMilestone[]
): string {
	const lines: string[] = [`# Goal: ${goal.title} (${goal.status})`];
	if (goal.north_star) lines.push(`North Star: ${goal.north_star}`);
	if (goal.final_outcome) lines.push(`Final Outcome: ${goal.final_outcome}`);

	if (goal.dod_items.length > 0) {
		lines.push('', '## Definition of Done');
		for (const item of goal.dod_items) {
			lines.push(`- ${item.criterion}`);
		}
	}

	lines.push('', '## Structure');
	if (milestones.length === 0) {
		lines.push('- (no milestones)');
		return lines.join('\n');
	}

	milestones.forEach((m, idx) => {
		const dates =
			m.start_date || m.due_date ? ` (${m.start_date ?? '?'} - ${m.due_date ?? '?'})` : '';
		lines.push(`- Milestone ${idx + 1}: ${m.title} [${m.status}]${dates}`);
		if (m.modules.length === 0) {
			lines.push('  - (no modules)');
			return;
		}
		for (const mod of m.modules) {
			lines.push(`  - Module: ${mod.title} [${mod.status}]`);
			if (mod.tasks.length === 0) {
				lines.push('    - (no tasks)');
				continue;
			}
			for (const task of mod.tasks) {
				lines.push(`    - Task: ${task.title} (${task.estimated_minutes}m, ${task.status})`);
			}
		}
	});

	return lines.join('\n');
}

/**
 * Persist edits to a goal and its project-level Definition of Done items.
 */
export async function saveGoalArchitecture(
	goalId: number,
	goalPatch: Partial<{
		title: string;
		north_star: string | null;
		final_outcome: string | null;
		start_date: string | null;
		target_end_date: string | null;
		weekly_hours_budget: number | null;
		status: GoalStatus;
	}>,
	dodOps: DodBatchOps,
	customClient?: SupabaseClient<Database>
): Promise<{
	goal: Omit<GoalDetail, 'dod_items' | 'milestones'> | null;
	insertedDod: DefinitionOfDoneItem[];
	updatedDod: DefinitionOfDoneItem[];
	deletedDodIds: number[];
}> {
	const supabase = getClient(customClient);

	let goal: Omit<GoalDetail, 'dod_items' | 'milestones'> | null = null;
	if (Object.keys(goalPatch).length > 0) {
		const { data, error } = await supabase
			.from('goals')
			.update(goalPatch)
			.eq('id', goalId)
			.select(GOAL_DETAIL_COLS)
			.single();
		if (error) throw error;
		goal = data as Omit<GoalDetail, 'dod_items' | 'milestones'>;
	}

	const dodResult = await applyDodBatchOps(supabase, goalId, null, dodOps);

	return {
		goal,
		...dodResult
	};
}

/**
 * Create a new milestone for a goal.
 */
export async function createMilestone(
	goalId: number,
	title: string,
	sortOrder: number,
	customClient?: SupabaseClient<Database>
): Promise<MilestoneSummary> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase
		.from('milestones')
		.insert({ goal_id: goalId, title, sort_order: sortOrder, status: 'locked' })
		.select(MILESTONE_COLS)
		.single();

	if (error) throw error;

	return {
		...(data as Omit<MilestoneSummary, 'dod_count'>),
		dod_count: 0
	};
}

/**
 * Delete a milestone by ID. Cascading FKs remove its modules, tasks, and DoD items.
 */
export async function deleteMilestone(
	milestoneId: number,
	customClient?: SupabaseClient<Database>
): Promise<void> {
	const supabase = getClient(customClient);
	const { error } = await supabase.from('milestones').delete().eq('id', milestoneId);
	if (error) throw error;
}

/**
 * Fetch a keyset-paginated page of goal_tasks for a module (20 per page).
 */
export async function fetchModuleTasksPage(
	moduleId: number,
	cursor?: TasksCursor,
	customClient?: SupabaseClient<Database>
): Promise<{ items: GoalTask[]; nextCursor: TasksCursor | null; hasMore: boolean }> {
	const supabase = getClient(customClient);
	let query = supabase
		.from('goal_tasks')
		.select(TASK_COLS)
		.eq('module_id', moduleId)
		.order('sort_order', { ascending: true })
		.order('id', { ascending: true })
		.limit(GOALS_PAGE_SIZE + 1);

	if (cursor) {
		query = query.or(
			`sort_order.gt.${cursor.sort_order},and(sort_order.eq.${cursor.sort_order},id.gt.${cursor.id})`
		);
	}

	const { data, error } = await query;
	if (error) throw error;

	const rows = (data ?? []) as GoalTask[];
	const hasMore = rows.length > GOALS_PAGE_SIZE;
	const items = hasMore ? rows.slice(0, GOALS_PAGE_SIZE) : rows;
	const last = items[items.length - 1];
	const nextCursor = hasMore && last ? { sort_order: last.sort_order, id: last.id } : null;

	return { items, nextCursor, hasMore };
}

/**
 * Fetch milestone execution detail: milestone, its DoD items, modules, and initial tasks page per module.
 */
export async function fetchMilestoneDetail(
	milestoneId: number,
	customClient?: SupabaseClient<Database>
): Promise<MilestoneDetail> {
	const supabase = getClient(customClient);

	const [milestoneRes, dodRes, modulesRes] = await Promise.all([
		supabase
			.from('milestones')
			.select(`${MILESTONE_COLS}, goals!inner(title)`)
			.eq('id', milestoneId)
			.single(),
		supabase
			.from('definition_of_done_items')
			.select(DOD_COLS)
			.eq('milestone_id', milestoneId)
			.order('sort_order', { ascending: true })
			.order('id', { ascending: true }),
		supabase
			.from('goal_modules')
			.select(MODULE_COLS)
			.eq('milestone_id', milestoneId)
			.order('sort_order', { ascending: true })
			.order('id', { ascending: true })
	]);

	if (milestoneRes.error) throw milestoneRes.error;
	if (dodRes.error) throw dodRes.error;
	if (modulesRes.error) throw modulesRes.error;

	const rawMilestone = milestoneRes.data as typeof milestoneRes.data & {
		goals: { title: string };
	};
	const { goals: goalRef, ...milestoneFields } = rawMilestone;

	const rawModules = (modulesRes.data ?? []) as Array<
		Omit<GoalModuleWithTasks, 'tasks' | 'hasMoreTasks' | 'tasksCursor'>
	>;

	const modulesWithTasks: GoalModuleWithTasks[] = await Promise.all(
		rawModules.map(async (mod) => {
			const page = await fetchModuleTasksPage(mod.id, undefined, supabase);
			return {
				...mod,
				tasks: page.items,
				hasMoreTasks: page.hasMore,
				tasksCursor: page.nextCursor
			};
		})
	);

	return {
		...(milestoneFields as Omit<MilestoneDetail, 'goal_title' | 'dod_items' | 'modules'>),
		goal_title: goalRef.title,
		dod_items: (dodRes.data ?? []) as DefinitionOfDoneItem[],
		modules: modulesWithTasks
	};
}

/**
 * Persist batch edits across milestone, DoD items, modules, and tasks.
 */
export async function saveMilestoneExecution(
	milestoneId: number,
	goalId: number,
	milestonePatch: Partial<{
		title: string;
		status: MilestoneStatus;
		start_date: string | null;
		due_date: string | null;
		passed_at: string | null;
		retrospective_note: string | null;
	}>,
	dodOps: DodBatchOps,
	moduleOps: ModuleBatchOps,
	taskOps: TaskBatchOps,
	customClient?: SupabaseClient<Database>
) {
	const supabase = getClient(customClient);

	let milestone: Omit<MilestoneSummary, 'dod_count'> | null = null;
	if (Object.keys(milestonePatch).length > 0) {
		const { data, error } = await supabase
			.from('milestones')
			.update(milestonePatch)
			.eq('id', milestoneId)
			.select(MILESTONE_COLS)
			.single();
		if (error) throw error;
		milestone = data as Omit<MilestoneSummary, 'dod_count'>;
	}

	const dodResult = await applyDodBatchOps(supabase, goalId, milestoneId, dodOps);
	const moduleResult = await applyModuleBatchOps(supabase, milestoneId, moduleOps);
	const taskResult = await applyTaskBatchOps(supabase, taskOps);

	return {
		milestone,
		dod: dodResult,
		modules: moduleResult,
		tasks: taskResult
	};
}

/**
 * Create a new module under a milestone.
 */
export async function createModule(
	milestoneId: number,
	title: string,
	sortOrder: number,
	customClient?: SupabaseClient<Database>
): Promise<GoalModuleWithTasks> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase
		.from('goal_modules')
		.insert({ milestone_id: milestoneId, title, sort_order: sortOrder, status: 'pending' })
		.select(MODULE_COLS)
		.single();

	if (error) throw error;

	return {
		...(data as Omit<GoalModuleWithTasks, 'tasks' | 'hasMoreTasks' | 'tasksCursor'>),
		tasks: [],
		hasMoreTasks: false,
		tasksCursor: null
	};
}

/**
 * Create a new task under a goal module.
 */
export async function createGoalTask(
	moduleId: number,
	title: string,
	estimatedMinutes: number,
	sortOrder: number,
	customClient?: SupabaseClient<Database>
): Promise<GoalTask> {
	const supabase = getClient(customClient);
	const { data, error } = await supabase
		.from('goal_tasks')
		.insert({
			module_id: moduleId,
			title,
			estimated_minutes: estimatedMinutes,
			sort_order: sortOrder,
			status: 'todo'
		})
		.select(TASK_COLS)
		.single();

	if (error) throw error;
	return data as GoalTask;
}

async function applyDodBatchOps(
	supabase: SupabaseClient<Database>,
	goalId: number,
	milestoneId: number | null,
	ops: DodBatchOps
): Promise<{
	insertedDod: DefinitionOfDoneItem[];
	updatedDod: DefinitionOfDoneItem[];
	deletedDodIds: number[];
}> {
	const deletedDodIds = ops.deletes ?? [];
	if (deletedDodIds.length > 0) {
		const { error } = await supabase
			.from('definition_of_done_items')
			.delete()
			.in('id', deletedDodIds);
		if (error) throw error;
	}

	let insertedDod: DefinitionOfDoneItem[] = [];
	if (ops.inserts && ops.inserts.length > 0) {
		const payload = ops.inserts.map((item) => ({
			goal_id: goalId,
			milestone_id: milestoneId,
			criterion: item.criterion,
			sort_order: item.sort_order
		}));
		const { data, error } = await supabase
			.from('definition_of_done_items')
			.insert(payload)
			.select(DOD_COLS);
		if (error) throw error;
		insertedDod = (data ?? []) as DefinitionOfDoneItem[];
	}

	const updatedDod: DefinitionOfDoneItem[] = [];
	if (ops.updates && ops.updates.length > 0) {
		for (const item of ops.updates) {
			const { data, error } = await supabase
				.from('definition_of_done_items')
				.update({ criterion: item.criterion, sort_order: item.sort_order })
				.eq('id', item.id)
				.select(DOD_COLS)
				.single();
			if (error) throw error;
			updatedDod.push(data as DefinitionOfDoneItem);
		}
	}

	return { insertedDod, updatedDod, deletedDodIds };
}

async function applyModuleBatchOps(
	supabase: SupabaseClient<Database>,
	milestoneId: number,
	ops: ModuleBatchOps
) {
	const deletedIds = ops.deletes ?? [];
	if (deletedIds.length > 0) {
		const { error } = await supabase.from('goal_modules').delete().in('id', deletedIds);
		if (error) throw error;
	}

	let inserted: Array<Omit<GoalModuleWithTasks, 'tasks' | 'hasMoreTasks' | 'tasksCursor'>> = [];
	if (ops.inserts && ops.inserts.length > 0) {
		const payload = ops.inserts.map((m) => ({
			milestone_id: milestoneId,
			title: m.title,
			description: m.description ?? null,
			sort_order: m.sort_order,
			status: m.status ?? 'pending'
		}));
		const { data, error } = await supabase.from('goal_modules').insert(payload).select(MODULE_COLS);
		if (error) throw error;
		inserted = (data ?? []) as typeof inserted;
	}

	const updated: typeof inserted = [];
	if (ops.updates && ops.updates.length > 0) {
		for (const mod of ops.updates) {
			const { id, ...fields } = mod;
			const { data, error } = await supabase
				.from('goal_modules')
				.update(fields)
				.eq('id', id)
				.select(MODULE_COLS)
				.single();
			if (error) throw error;
			updated.push(data as (typeof inserted)[number]);
		}
	}

	return { inserted, updated, deletedIds };
}

async function applyTaskBatchOps(supabase: SupabaseClient<Database>, ops: TaskBatchOps) {
	const deletedIds = ops.deletes ?? [];
	if (deletedIds.length > 0) {
		const { error } = await supabase.from('goal_tasks').delete().in('id', deletedIds);
		if (error) throw error;
	}

	let inserted: GoalTask[] = [];
	if (ops.inserts && ops.inserts.length > 0) {
		const { data, error } = await supabase
			.from('goal_tasks')
			.insert(ops.inserts)
			.select(TASK_COLS);
		if (error) throw error;
		inserted = (data ?? []) as GoalTask[];
	}

	const updated: GoalTask[] = [];
	if (ops.updates && ops.updates.length > 0) {
		for (const task of ops.updates) {
			const { id, ...fields } = task;
			const { data, error } = await supabase
				.from('goal_tasks')
				.update(fields)
				.eq('id', id)
				.select(TASK_COLS)
				.single();
			if (error) throw error;
			updated.push(data as GoalTask);
		}
	}

	return { inserted, updated, deletedIds };
}
