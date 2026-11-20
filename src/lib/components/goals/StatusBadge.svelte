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

	const LABELS: Record<AnyStatus, string> = {
		draft: 'Draft',
		active: 'Active',
		completed: 'Completed',
		archived: 'Archived',
		locked: 'Locked',
		in_progress: 'In Progress',
		passed: 'Passed',
		slipped: 'Slipped',
		pending: 'Pending',
		deferred: 'Deferred',
		todo: 'To Do',
		done: 'Done',
		cut: 'Cut'
	};
</script>

<span class="goals-badge goals-badge--{status}">
	{LABELS[status] ?? status}
</span>
