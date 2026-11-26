<script lang="ts">
	import { page } from '$app/stores';
	import { goalsStore } from '$lib/state/goals.svelte';
	import type { GoalStatus } from '$lib/types/goals';
	import { useUnsavedGuard } from '$lib/components/goals/useUnsavedGuard.svelte';
	import UnsavedChangesDialog from '$lib/components/goals/UnsavedChangesDialog.svelte';
	import StatusBadge from '$lib/components/goals/StatusBadge.svelte';
	import DodCriteriaList from '$lib/components/goals/DodCriteriaList.svelte';
	import DeleteMilestoneDialog from '$lib/components/goals/DeleteMilestoneDialog.svelte';

	let errorMsg = $state<string | null>(null);
	let newMilestoneTitle = $state('');
	let addingMilestone = $state(false);
	let deleteTarget = $state<{ id: number; title: string } | null>(null);
	let deletingMilestone = $state(false);
	let deleteError = $state<string | null>(null);
	let copyingStructure = $state(false);
	let copiedStructure = $state(false);

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

	async function handleConfirmDeleteMilestone() {
		if (!deleteTarget || deletingMilestone) return;
		deletingMilestone = true;
		deleteError = null;
		try {
			await goalsStore.deleteMilestone(deleteTarget.id, goalId);
			deleteTarget = null;
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Failed to delete milestone';
		} finally {
			deletingMilestone = false;
		}
	}

	async function handleCopyStructure() {
		if (copyingStructure || !Number.isFinite(goalId)) return;
		copyingStructure = true;
		errorMsg = null;
		try {
			const markdown = await goalsStore.exportGoalStructure(goalId);
			await navigator.clipboard.writeText(markdown);
			copiedStructure = true;
			setTimeout(() => {
				copiedStructure = false;
			}, 2000);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to copy structure';
		} finally {
			copyingStructure = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			if (goalsStore.isGoalDirty && !goalsStore.goalSaving) {
				handleSave();
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="goals-detail-page">
	<div class="goals-sticky-bar">
		<div class="goals-sticky-bar-inner">
			<a href="/goals" class="goals-back-link">← Goals</a>
			<div class="goals-bar-actions">
				{#if goalsStore.isGoalDirty}
					<span class="goals-dirty-indicator">Unsaved edits</span>
				{/if}
				<button
					type="button"
					onclick={handleCopyStructure}
					disabled={copyingStructure || !goalsStore.goalDraft}
					class="goals-btn-secondary"
				>
					{copiedStructure ? 'Copied!' : copyingStructure ? 'Copying...' : 'Copy Structure'}
				</button>
				<button
					type="button"
					onclick={() => goalsStore.clearGoalDraft()}
					disabled={!goalsStore.isGoalDirty || goalsStore.goalSaving}
					class="goals-btn-secondary"
				>
					Clear
				</button>
				<button
					type="button"
					onclick={handleSave}
					disabled={!goalsStore.isGoalDirty || goalsStore.goalSaving}
					class="goals-btn-primary"
				>
					{goalsStore.goalSaving ? 'Saving...' : 'Save'}
				</button>
			</div>
		</div>
	</div>

	<div class="goals-detail-container">
		{#if errorMsg}
			<div class="goals-error" style="margin-bottom: 16px;">{errorMsg}</div>
		{/if}

		{#if goalsStore.goalLoading && !goalsStore.goalDraft}
			<p class="goals-muted">Loading goal...</p>
		{:else if goalsStore.goalDraft}
			{@const draft = goalsStore.goalDraft}
			<div class="goals-sections">
				<section class="goals-section">
					<div class="goals-title-row">
						<input
							type="text"
							bind:value={draft.title}
							placeholder="Goal Title"
							class="goals-title-input"
						/>
						<select
							bind:value={draft.status}
							aria-label="Goal status"
							class="goals-select-auto"
						>
							{#each GOAL_STATUSES as st}
								<option value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="north-star" class="goals-field-label">North Star (Objective / Why)</label>
						<textarea
							id="north-star"
							rows="2"
							value={draft.north_star ?? ''}
							oninput={(e) => (draft.north_star = e.currentTarget.value || null)}
							placeholder="Qualitative direction and purpose..."
							class="goals-textarea"
						></textarea>
					</div>

					<div>
						<label for="final-outcome" class="goals-field-label">Final Outcome</label>
						<textarea
							id="final-outcome"
							rows="2"
							value={draft.final_outcome ?? ''}
							oninput={(e) => (draft.final_outcome = e.currentTarget.value || null)}
							placeholder="Concrete capstone deliverable or proof..."
							class="goals-textarea"
						></textarea>
					</div>

					<div class="goals-grid-3">
						<div>
							<label for="start-date" class="goals-field-label">Start Date</label>
							<input
								id="start-date"
								type="date"
								value={draft.start_date ?? ''}
								oninput={(e) => (draft.start_date = e.currentTarget.value || null)}
								class="goals-input"
							/>
						</div>
						<div>
							<label for="end-date" class="goals-field-label">Target End Date</label>
							<input
								id="end-date"
								type="date"
								value={draft.target_end_date ?? ''}
								oninput={(e) => (draft.target_end_date = e.currentTarget.value || null)}
								class="goals-input"
							/>
						</div>
						<div>
							<label for="weekly-hours" class="goals-field-label">Weekly Hours Budget</label>
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
								class="goals-input"
							/>
						</div>
					</div>
				</section>

				<section class="goals-section">
					<h2 class="goals-section-title">Final Outcome Definition of Done</h2>
					<DodCriteriaList
						items={draft.dod_items}
						goalId={draft.id}
						milestoneId={null}
						onChange={(items) => (draft.dod_items = items)}
					/>
				</section>

				<section class="goals-section">
					<h2 class="goals-section-title">Milestones ({draft.milestones.length})</h2>

					{#if draft.milestones.length === 0}
						<p class="goals-muted">No milestones yet.</p>
					{:else}
						<div class="goals-milestone-list">
							{#each draft.milestones as milestone, idx (milestone.id)}
								<div class="goals-milestone-row">
									<a
										href={`/goal/${draft.id}/milestone/${milestone.id}`}
										class="goals-milestone-link"
									>
										<div class="goals-milestone-left">
											<span class="goals-milestone-idx">M{idx + 1}</span>
											<span class="goals-milestone-title">{milestone.title}</span>
											<StatusBadge status={milestone.status} />
										</div>
										<div class="goals-milestone-right">
											{#if milestone.start_date || milestone.due_date}
												<span>{milestone.start_date ?? '?'} – {milestone.due_date ?? '?'}</span>
											{/if}
											<span>{milestone.dod_count} DoD criteria</span>
										</div>
									</a>
									<button
										type="button"
										onclick={() => {
											deleteError = null;
											deleteTarget = { id: milestone.id, title: milestone.title };
										}}
										aria-label={`Delete milestone ${milestone.title}`}
										class="goals-btn-icon"
									>
										Delete
									</button>
								</div>
							{/each}
						</div>
					{/if}

					<form onsubmit={handleAddMilestone} class="goals-inline-form">
						<input
							type="text"
							bind:value={newMilestoneTitle}
							placeholder="+ Add Milestone title..."
							class="goals-input"
							style="flex: 1;"
						/>
						<button
							type="submit"
							disabled={!newMilestoneTitle.trim() || addingMilestone}
							class="goals-btn-primary"
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

{#if deleteTarget}
	<DeleteMilestoneDialog
		open={true}
		milestoneTitle={deleteTarget.title}
		deleting={deletingMilestone}
		error={deleteError}
		onConfirm={handleConfirmDeleteMilestone}
		onCancel={() => {
			deleteTarget = null;
			deleteError = null;
		}}
	/>
{/if}
