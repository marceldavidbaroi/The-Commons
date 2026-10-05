export interface Task {
	id: number | string;
	user_id: number | string;
	parent_id?: number | string | null;
	title: string;
	description: string | null;
	status: TaskStatus;
	priority: TaskPriority;
	tags?: string[];
	scheduled_date: string | null;
	due_date: string | null;
	completed_at: string | null;
	created_at: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TreeTaskItem {
	task: Task;
	depth: number;
	hasChildren: boolean;
	childCount: number;
	isCollapsed: boolean;
}
