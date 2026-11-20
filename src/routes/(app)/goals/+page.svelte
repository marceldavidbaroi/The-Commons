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

<div class="goals-page">
	<header class="goals-header">
		<div class="goals-header-title-group">
			<h1 class="goals-header-title">Goals</h1>
			<span class="goals-count-pill">{goalsStore.goals.length}</span>
		</div>
		<button type="button" onclick={() => (createOpen = true)} class="goals-btn-primary">
			+ Create Goal
		</button>
	</header>

	{#if errorMsg}
		<div class="goals-error">{errorMsg}</div>
	{/if}

	{#if goalsStore.loading && !goalsStore.initialized}
		<p class="goals-muted" style="margin-top: 24px;">Loading goals...</p>
	{:else if goalsStore.goals.length === 0}
		<div class="goals-empty">
			<p>No goals yet. Create your first goal to get started.</p>
			<button
				type="button"
				onclick={() => (createOpen = true)}
				class="goals-btn-primary"
				style="margin-top: 12px;"
			>
				+ Create Goal
			</button>
		</div>
	{:else}
		<div class="goals-grid">
			{#each goalsStore.goals as goal (goal.id)}
				<a href={`/goal/${goal.id}`} class="goals-card">
					<div>
						<div class="goals-card-top">
							<StatusBadge status={goal.status} />
							<span class="goals-card-meta">
								{goal.passed_milestones} / {goal.total_milestones} Milestones Passed
							</span>
						</div>
						<h2 class="goals-card-title">{goal.title}</h2>
						{#if goal.north_star}
							<p class="goals-card-desc">{goal.north_star}</p>
						{/if}
					</div>
					<div class="goals-card-footer">
						{formatTimebox(goal.start_date, goal.target_end_date)}
					</div>
				</a>
			{/each}
		</div>

		{#if goalsStore.hasMore}
			<div style="margin-top: 24px; display: flex; justify-content: center;">
				<button
					type="button"
					onclick={() => goalsStore.loadMore()}
					disabled={goalsStore.loading}
					class="goals-btn-secondary"
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
