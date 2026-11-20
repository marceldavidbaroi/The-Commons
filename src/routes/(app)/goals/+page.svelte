<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getSupabaseClient } from '$lib/supabase';
	import { goalsStore } from '$lib/state/goals.svelte';
	import StatusBadge from '$lib/components/goals/StatusBadge.svelte';
	import CreateGoalDialog from '$lib/components/goals/CreateGoalDialog.svelte';

	let createOpen = $state(false);
	let creating = $state(false);
	let errorMsg = $state<string | null>(null);

	onMount(() => {
		goalsStore.loadGoals().catch((err) => {
			errorMsg = err instanceof Error ? err.message : 'Failed to load goals';
		});
	});

	async function handleCreateGoal(title: string) {
		creating = true;
		errorMsg = null;
		try {
			const supabase = getSupabaseClient();
			const { data: userData, error: userError } = await supabase.auth.getUser();
			if (userError || !userData.user) {
				throw new Error('You must be signed in to create a goal.');
			}
			const created = await goalsStore.addGoal(title, userData.user.id);
			createOpen = false;
			await goto(`/goal/${created.id}`);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to create goal';
		} finally {
			creating = false;
		}
	}

	function formatTimebox(start: string | null, end: string | null): string {
		if (!start && !end) return 'No dates set';
		if (start && end) return `${start} – ${end}`;
		return start ? `From ${start}` : `Until ${end}`;
	}
</script>

<div class="mx-auto max-w-5xl px-4 py-6">
	<header class="flex items-center justify-between border-b border-stone-200 pb-3 dark:border-stone-800">
		<div class="flex items-center gap-2.5">
			<h1 class="text-xl font-semibold text-stone-900 dark:text-stone-100">Goals</h1>
			<span class="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
				{goalsStore.goals.length}
			</span>
		</div>
		<button
			type="button"
			onclick={() => (createOpen = true)}
			class="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
		>
			+ Create Goal
		</button>
	</header>

	{#if errorMsg}
		<div class="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
			{errorMsg}
		</div>
	{/if}

	{#if goalsStore.loading && !goalsStore.initialized}
		<div class="mt-8 text-sm text-stone-500 dark:text-stone-400">Loading goals...</div>
	{:else if goalsStore.goals.length === 0}
		<div class="mt-8 rounded-lg border border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
			<p class="text-sm text-stone-600 dark:text-stone-400">No goals yet. Create your first goal to get started.</p>
			<button
				type="button"
				onclick={() => (createOpen = true)}
				class="mt-3 rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900"
			>
				+ Create Goal
			</button>
		</div>
	{:else}
		<div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each goalsStore.goals as goal (goal.id)}
				<a
					href={`/goal/${goal.id}`}
					class="group flex flex-col justify-between rounded-lg border border-stone-200 bg-white p-4 transition-colors hover:border-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-600"
				>
					<div>
						<div class="flex items-center justify-between gap-2">
							<StatusBadge status={goal.status} />
							<span class="text-xs text-stone-500 dark:text-stone-400">
								{goal.passed_milestones} / {goal.total_milestones} Milestones Passed
							</span>
						</div>
						<h2 class="mt-2.5 text-base font-semibold text-stone-900 group-hover:underline dark:text-stone-100">
							{goal.title}
						</h2>
						{#if goal.north_star}
							<p class="mt-1.5 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">
								{goal.north_star}
							</p>
						{/if}
					</div>
					<div class="mt-4 border-t border-stone-100 pt-2.5 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
						{formatTimebox(goal.start_date, goal.target_end_date)}
					</div>
				</a>
			{/each}
		</div>

		{#if goalsStore.hasMore}
			<div class="mt-6 flex justify-center">
				<button
					type="button"
					onclick={() => goalsStore.loadMore()}
					disabled={goalsStore.loading}
					class="rounded-md border border-stone-300 bg-white px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
				>
					{goalsStore.loading ? 'Loading...' : 'Load More'}
				</button>
			</div>
		{/if}
	{/if}
</div>

<CreateGoalDialog
	open={createOpen}
	{creating}
	onCreate={handleCreateGoal}
	onClose={() => (createOpen = false)}
/>
