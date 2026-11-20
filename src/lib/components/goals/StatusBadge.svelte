<script lang="ts">
	import type {
		GoalModuleStatus,
		GoalStatus,
		GoalTaskStatus,
		MilestoneStatus
	} from '$lib/types/goals';

	type AnyStatus = GoalStatus | MilestoneStatus | GoalModuleStatus | GoalTaskStatus;

	interface Props {
		status: AnyStatus;
	}

	let { status }: Props = $props();

	const STATUS_STYLES: Record<AnyStatus, { label: string; classes: string }> = {
		draft: {
			label: 'Draft',
			classes: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
		},
		active: {
			label: 'Active',
			classes: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
		},
		completed: {
			label: 'Completed',
			classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
		},
		archived: {
			label: 'Archived',
			classes: 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'
		},
		locked: {
			label: 'Locked',
			classes: 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'
		},
		in_progress: {
			label: 'In Progress',
			classes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
		},
		passed: {
			label: 'Passed',
			classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
		},
		slipped: {
			label: 'Slipped',
			classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
		},
		pending: {
			label: 'Pending',
			classes: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
		},
		deferred: {
			label: 'Deferred',
			classes: 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'
		},
		todo: {
			label: 'To Do',
			classes: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
		},
		done: {
			label: 'Done',
			classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
		},
		cut: {
			label: 'Cut',
			classes: 'bg-stone-100 text-stone-500 border-stone-200 line-through dark:bg-stone-800 dark:text-stone-500 dark:border-stone-700'
		}
	};

	const config = $derived(
		STATUS_STYLES[status] ?? {
			label: status,
			classes: 'bg-stone-100 text-stone-700 border-stone-200'
		}
	);
</script>

<span class="inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium {config.classes}">
	{config.label}
</span>
