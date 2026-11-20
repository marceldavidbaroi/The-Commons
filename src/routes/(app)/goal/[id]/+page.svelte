<script lang="ts">
	import { page } from '$app/stores';
	import { goalsStore } from '$lib/state/goals.svelte';
	import type { GoalStatus } from '$lib/types/goals';
	import { useUnsavedGuard } from '$lib/components/goals/useUnsavedGuard.svelte';
	import UnsavedChangesDialog from '$lib/components/goals/UnsavedChangesDialog.svelte';
	import StatusBadge from '$lib/components/goals/StatusBadge.svelte';
	import DodCriteriaList from '$lib/components/goals/DodCriteriaList.svelte';

	let errorMsg = $state<string | null>(null);
	let newMilestoneTitle = $state('');
	let addingMilestone = $state(false);

	const goalId = $derived(Number($page.params.id));

	$effect(() => {
		if (!Number.isFinite(goalId)) return;
		errorMsg = null;
		goalsStore.loadGoalDetail(goalId).catch((err) => {
			errorMsg = err instanceof Error ? err.message : 'Failed to load goal';
		});
	});

	const guard = useUnsavedGuard({
		isDirty: () => goalsStore.isGoalDirty,
		onSave: () => goalsStore.commitGoalSave(),
		onDiscard: () => goalsStore.clearGoalDraft()
	});

	async function handleSave() {
		errorMsg = null;
		try {
			await goalsStore.commitGoalSave();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to save goal';
		}
	}

	async function handleAddMilestone(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = newMilestoneTitle.trim();
		if (!trimmed || addingMilestone) return;
		addingMilestone = true;
		errorMsg = null;
		try {
			await goalsStore.addMilestone(goalId, trimmed);
			newMilestoneTitle = '';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to create milestone';
		} finally {
			addingMilestone = false;
		}
	}

	const GOAL_STATUSES: GoalStatus[] = ['draft', 'active', 'completed', 'archived'];
</script>

<div class="min-h-screen pb-16">
	<!-- Sticky Action Bar (solid background, no blur) -->
	<div class="sticky top-0 z-30 border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
		<div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-2.5">
			<a
				href="/goals"
				class="text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
			>
				← Goals
			</a>
			<div class="flex items-center gap-2">
				{#if goalsStore.isGoalDirty}
					<span class="text-xs font-medium text-amber-600 dark:text-amber-400">Unsaved edits</span>
				{/if}
				<button
					type="button"
					onclick={() => goalsStore.clearGoalDraft()}
					disabled={!goalsStore.isGoalDirty || goalsStore.goalSaving}
					class="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
				>
					Clear
				</button>
				<button
					type="button"
					onclick={handleSave}
					disabled={!goalsStore.isGoalDirty || goalsStore.goalSaving}
					class="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					{goalsStore.goalSaving ? 'Saving...' : 'Save'}
				</button>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-4xl px-4 pt-6">
		{#if errorMsg}
			<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
				{errorMsg}
			</div>
		{/if}

		{#if goalsStore.goalLoading && !goalsStore.goalDraft}
			<p class="text-sm text-stone-500 dark:text-stone-400">Loading goal...</p>
		{:else if goalsStore.goalDraft}
			{@const draft = goalsStore.goalDraft}
			<div class="space-y-8">
				<!-- Section 1: North Star Layer -->
				<section class="space-y-4 rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
					<div class="flex flex-wrap items-center gap-3">
						<input
							type="text"
							bind:value={draft.title}
							placeholder="Goal Title"
							class="min-w-0 flex-1 border-b border-transparent bg-transparent text-xl font-semibold text-stone-900 focus:border-stone-400 focus:outline-none dark:text-stone-100"
						/>
						<select
							bind:value={draft.status}
							aria-label="Goal status"
							class="rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm font-medium text-stone-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200"
						>
							{#each GOAL_STATUSES as st}
								<option value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="north-star" class="block text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
							North Star (Objective / Why)
						</label>
						<textarea
							id="north-star"
							rows="2"
							value={draft.north_star ?? ''}
							oninput={(e) => (draft.north_star = e.currentTarget.value || null)}
							placeholder="Qualitative direction and purpose..."
							class="mt-1 w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-stone-400 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
						></textarea>
					</div>

					<div>
						<label for="final-outcome" class="block text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
							Final Outcome
						</label>
						<textarea
							id="final-outcome"
							rows="2"
							value={draft.final_outcome ?? ''}
							oninput={(e) => (draft.final_outcome = e.currentTarget.value || null)}
							placeholder="Concrete capstone deliverable or proof..."
							class="mt-1 w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-stone-400 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
						></textarea>
					</div>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
						<div>
							<label for="start-date" class="block text-xs font-medium text-stone-500 dark:text-stone-400">
								Start Date
							</label>
							<input
								id="start-date"
								type="date"
								value={draft.start_date ?? ''}
								oninput={(e) => (draft.start_date = e.currentTarget.value || null)}
								class="mt-1 w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
							/>
						</div>
						<div>
							<label for="end-date" class="block text-xs font-medium text-stone-500 dark:text-stone-400">
								Target End Date
							</label>
							<input
								id="end-date"
								type="date"
								value={draft.target_end_date ?? ''}
								oninput={(e) => (draft.target_end_date = e.currentTarget.value || null)}
								class="mt-1 w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
							/>
						</div>
						<div>
							<label for="weekly-hours" class="block text-xs font-medium text-stone-500 dark:text-stone-400">
								Weekly Hours Budget
							</label>
							<input
								id="weekly-hours"
								type="number"
								step="0.5"
								min="0"
								value={draft.weekly_hours_budget ?? ''}
								oninput={(e) => {
									const v = e.currentTarget.value;
									draft.weekly_hours_budget = v === '' ? null : Number(v);
								}}
								placeholder="e.g. 7.0"
								class="mt-1 w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
							/>
						</div>
					</div>
				</section>

				<!-- Section 2: Final Outcome DoD -->
				<section class="space-y-3 rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
					<h2 class="text-sm font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-300">
						Final Outcome Definition of Done
					</h2>
					<DodCriteriaList
						items={draft.dod_items}
						goalId={draft.id}
						milestoneId={null}
						onChange={(items) => (draft.dod_items = items)}
					/>
				</section>

				<!-- Section 3: Milestones List -->
				<section class="space-y-3 rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
					<div class="flex items-center justify-between">
						<h2 class="text-sm font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-300">
							Milestones ({draft.milestones.length})
						</h2>
					</div>

					{#if draft.milestones.length === 0}
						<p class="text-sm text-stone-500 dark:text-stone-400">No milestones yet.</p>
					{:else}
						<div class="divide-y divide-stone-200 rounded-md border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
							{#each draft.milestones as milestone, idx (milestone.id)}
								<a
									href={`/goal/${draft.id}/milestone/${milestone.id}`}
									class="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/60"
								>
									<div class="flex min-w-0 items-center gap-3">
										<span class="text-xs font-mono font-semibold text-stone-400">M{idx + 1}</span>
										<span class="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
											{milestone.title}
										</span>
										<StatusBadge status={milestone.status} />
									</div>
									<div class="flex shrink-0 items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
										{#if milestone.start_date || milestone.due_date}
											<span>{milestone.start_date ?? '?'} – {milestone.due_date ?? '?'}</span>
										{/if}
										<span>{milestone.dod_count} DoD criteria</span>
									</div>
								</a>
							{/each}
						</div>
					{/if}

					<form onsubmit={handleAddMilestone} class="flex items-center gap-2 pt-2">
						<input
							type="text"
							bind:value={newMilestoneTitle}
							placeholder="+ Add Milestone title..."
							class="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
						/>
						<button
							type="submit"
							disabled={!newMilestoneTitle.trim() || addingMilestone}
							class="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
						>
							{addingMilestone ? 'Adding...' : '+ Add Milestone'}
						</button>
					</form>
				</section>
			</div>
		{/if}
	</div>
</div>

<UnsavedChangesDialog
	open={guard.open}
	saving={guard.saving}
	onSaveAndLeave={guard.saveAndLeave}
	onDiscard={guard.discardAndLeave}
	onCancel={guard.cancelLeave}
/>
