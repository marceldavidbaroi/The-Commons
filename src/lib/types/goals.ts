export type GoalStatus = 'draft' | 'active' | 'completed' | 'archived';
export type MilestoneStatus = 'locked' | 'in_progress' | 'passed' | 'slipped';
export type GoalModuleStatus = 'pending' | 'in_progress' | 'completed' | 'deferred';
export type GoalTaskStatus = 'todo' | 'in_progress' | 'done' | 'cut';

export interface GoalSummary {
	id: number;
	user_id: string;
	title: string;
	north_star: string | null;
	start_date: string | null;
	target_end_date: string | null;
	weekly_hours_budget: number | null;
	status: GoalStatus;
	created_at: string;
	updated_at: string;
	total_milestones: number;
	passed_milestones: number;
}

export interface DefinitionOfDoneItem {
	id: number;
	goal_id: number;
	milestone_id: number | null;
	criterion: string;
	sort_order: number;
}

export interface MilestoneSummary {
	id: number;
	goal_id: number;
	title: string;
	sort_order: number;
	start_date: string | null;
	due_date: string | null;
	status: MilestoneStatus;
	passed_at: string | null;
	retrospective_note: string | null;
	dod_count: number;
}

export interface GoalDetail {
	id: number;
	user_id: string;
	title: string;
	north_star: string | null;
	final_outcome: string | null;
	start_date: string | null;
	target_end_date: string | null;
	weekly_hours_budget: number | null;
	status: GoalStatus;
	created_at: string;
	updated_at: string;
	dod_items: DefinitionOfDoneItem[];
	milestones: MilestoneSummary[];
}

export interface GoalTask {
	id: number;
	module_id: number;
	title: string;
	acceptance_note: string | null;
	estimated_minutes: number;
	actual_minutes: number | null;
	status: GoalTaskStatus;
	due_date: string | null;
	completed_at: string | null;
	sort_order: number;
}

export interface GoalModuleWithTasks {
	id: number;
	milestone_id: number;
	title: string;
	description: string | null;
	sort_order: number;
	status: GoalModuleStatus;
	tasks: GoalTask[];
	hasMoreTasks: boolean;
	tasksCursor: { sort_order: number; id: number } | null;
}

export interface MilestoneDetail {
	id: number;
	goal_id: number;
	goal_title: string;
	title: string;
	sort_order: number;
	start_date: string | null;
	due_date: string | null;
	status: MilestoneStatus;
	passed_at: string | null;
	retrospective_note: string | null;
	dod_items: DefinitionOfDoneItem[];
	modules: GoalModuleWithTasks[];
}
