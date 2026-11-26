<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { goalsStore } from '$lib/state/goals.svelte';
	import type { MilestoneStatus } from '$lib/types/goals';
	import { useUnsavedGuard } from '$lib/components/goals/useUnsavedGuard.svelte';
	import UnsavedChangesDialog from '$lib/components/goals/UnsavedChangesDialog.svelte';
	import DeleteMilestoneDialog from '$lib/components/goals/DeleteMilestoneDialog.svelte';
	import DodCriteriaList from '$lib/components/goals/DodCriteriaList.svelte';
	import GoalModuleCard from '$lib/components/goals/GoalModuleCard.svelte';

	let errorMsg = $state<string | null>(null);
	let newModuleTitle = $state('');
	let addingModule = $state(false);
	let deleteDialogOpen = $state(false);
	let deletingMilestone = $state(false);
	let deleteError = $state<string | null>(null);

	const goalId = $derived(Number($page.params.id));
	const milestoneId = $derived(Number($page.params.milestoneId));

	$effect(() => {
		if (!Number.isFinite(milestoneId)) return;
		errorMsg = null;
		goalsStore.loadMilestoneDetail(milestoneId).catch((err) => {
			errorMsg = err instanceof Error ? err.message : 'Failed to load milestone';
		});
	});

	const guard = useUnsavedGuard({
		isDirty: () => goalsStore.isMilestoneDirty,
		onSave: () => goalsStore.commitMilestoneSave(),
		onDiscard: () => goalsStore.clearMilestoneDraft()
	});

	async function handleSave() {
		errorMsg = null;
		try {
			await goalsStore.commitMilestoneSave();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to save milestone';
		}
	}

	async function handleAddModule(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = newModuleTitle.trim();
		if (!trimmed || addingModule) return;
		addingModule = true;
		errorMsg = null;
		try {
			await goalsStore.addModule(milestoneId, trimmed);
			newModuleTitle = '';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to add module';
		} finally {
			addingModule = false;
		}
	}

	function handleDeleteModule(moduleId: number) {
		if (!goalsStore.milestoneDraft) return;
		goalsStore.milestoneDraft.modules = goalsStore.milestoneDraft.modules.filter(
			(m) => m.id !== moduleId
		);
	}

	const MILESTONE_STATUSES: MilestoneStatus[] = ['locked', 'in_progress', 'passed', 'slipped'];

	async function handleConfirmDeleteMilestone() {
		if (deletingMilestone) return;
		deletingMilestone = true;
		deleteError = null;
		try {
			await goalsStore.deleteMilestone(milestoneId, goalId);
			deleteDialogOpen = false;
			await goto(`/goal/${goalId}`);
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Failed to delete milestone';
		} finally {
			deletingMilestone = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			if (goalsStore.isMilestoneDirty && !goalsStore.milestoneSaving) {
				handleSave();
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="goals-detail-page">
	<div class="goals-sticky-bar">
		<div class="goals-sticky-bar-inner">
			<a href={`/goal/${goalId}`} class="goals-back-link">
				← {goalsStore.milestoneDraft?.goal_title ?? 'Goal'}
			</a>
			<div class="goals-bar-actions">
				{#if goalsStore.isMilestoneDirty}
					<span class="goals-dirty-indicator">Unsaved edits</span>
				{/if}
				{#if goalsStore.milestoneDraft}
					<button
						type="button"
						onclick={() => {
							deleteError = null;
							deleteDialogOpen = true;
						}}
						disabled={goalsStore.milestoneSaving || deletingMilestone}
						class="goals-btn-danger-outline"
					>
						Delete
					</button>
				{/if}
				<button
					type="button"
					onclick={() => goalsStore.clearMilestoneDraft()}
					disabled={!goalsStore.isMilestoneDirty || goalsStore.milestoneSaving}
					class="goals-btn-secondary"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={handleSave}
					disabled={!goalsStore.isMilestoneDirty || goalsStore.milestoneSaving}
					class="goals-btn-primary"
				>
					{goalsStore.milestoneSaving ? 'Saving...' : 'Save'}
				</button>
			</div>
		</div>
	</div>

	<div class="goals-detail-container">
		{#if errorMsg}
			<div class="goals-error" style="margin-bottom: 16px;">{errorMsg}</div>
		{/if}

		{#if goalsStore.milestoneLoading && !goalsStore.milestoneDraft}
			<p class="goals-muted">Loading milestone...</p>
		{:else if goalsStore.milestoneDraft}
			{@const draft = goalsStore.milestoneDraft}
			<div class="goals-sections">
				<section class="goals-section">
					<div class="goals-title-row">
						<input
							type="text"
							bind:value={draft.title}
							placeholder="Milestone Title"
							class="goals-title-input"
						/>
						<select
							bind:value={draft.status}
							aria-label="Milestone status"
							class="goals-select-auto"
						>
							{#each MILESTONE_STATUSES as st}
								<option value={st}>{st.replace('_', ' ')}</option>
							{/each}
						</select>
					</div>

					<div class="goals-grid-2">
						<div>
							<label for="m-start" class="goals-field-label">Start Date</label>
							<input
								id="m-start"
								type="date"
								value={draft.start_date ?? ''}
								oninput={(e) => (draft.start_date = e.currentTarget.value || null)}
								class="goals-input"
							/>
						</div>
						<div>
							<label for="m-due" class="goals-field-label">Due Date</label>
							<input
								id="m-due"
								type="date"
								value={draft.due_date ?? ''}
								oninput={(e) => (draft.due_date = e.currentTarget.value || null)}
								class="goals-input"
							/>
						</div>
					</div>

					<div>
						<label for="retro-note" class="goals-field-label">Retrospective Note</label>
						<textarea
							id="retro-note"
							rows="2"
							value={draft.retrospective_note ?? ''}
							oninput={(e) => (draft.retrospective_note = e.currentTarget.value || null)}
							placeholder="Post-milestone review or scope-cut notes..."
							class="goals-textarea"
						></textarea>
					</div>
				</section>

				<section class="goals-section">
					<h2 class="goals-section-title">Milestone Definition of Done</h2>
					<DodCriteriaList
						items={draft.dod_items}
						goalId={draft.goal_id}
						milestoneId={draft.id}
						onChange={(items) => (draft.dod_items = items)}
					/>
				</section>

				<div style="display: flex; flex-direction: column; gap: 16px;">
					<div class="goals-modules-header">
						<h2 class="goals-section-title">Modules ({draft.modules.length})</h2>
						<form onsubmit={handleAddModule} class="goals-inline-form" style="padding-top: 0; flex: 1; justify-content: flex-end;">
							<input
								type="text"
								bind:value={newModuleTitle}
								placeholder="New module title..."
								class="goals-input"
								style="flex: 1; min-width: 180px; max-width: 320px;"
							/>
							<button
								type="submit"
								disabled={!newModuleTitle.trim() || addingModule}
								class="goals-btn-primary"
							>
								{addingModule ? 'Adding...' : '+ Add Module'}
							</button>
						</form>
					</div>

					{#if draft.modules.length === 0}
						<div class="goals-empty" style="margin-top: 0;">
							No modules yet. Add a module above to break this milestone into tasks.
						</div>
					{:else}
						{#each draft.modules as mod (mod.id)}
							<GoalModuleCard
								module={mod}
								onDeleteModule={handleDeleteModule}
								onAddTask={(modId, title, mins) => goalsStore.addTask(modId, title, mins)}
								onLoadMoreTasks={(modId) => goalsStore.loadMoreModuleTasks(modId)}
							/>
						{/each}
					{/if}
				</div>
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

{#if deleteDialogOpen && goalsStore.milestoneDraft}
	<DeleteMilestoneDialog
		open={true}
		milestoneTitle={goalsStore.milestoneDraft.title}
		deleting={deletingMilestone}
		error={deleteError}
		onConfirm={handleConfirmDeleteMilestone}
		onCancel={() => {
			deleteDialogOpen = false;
			deleteError = null;
		}}
	/>
{/if}
