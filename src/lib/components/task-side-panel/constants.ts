import type { Task, TaskStatus, TaskPriority } from '$lib/types/tasks';

export { type Task, type TaskStatus, type TaskPriority };

export const DEFAULT_SUGGESTIONS = [
	'Projects',
	'Chores',
	'Market & Shopping',
	'Personal Care',
	'Finance & Bills',
	'Quick (<15m)',
	'Deep Focus',
	'Routine / Habit',
	'Home',
	'Work & Desk',
	'Out & Errands'
];

export const MIN_PANEL_WIDTH = 380;
export const MAX_PANEL_WIDTH = 860;
export const DEFAULT_PANEL_WIDTH = 480;
