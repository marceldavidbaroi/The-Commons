<script lang="ts">
	import { page } from '$app/stores';
	import { goalsStore } from '$lib/state/goals.svelte';
	import type { MilestoneStatus } from '$lib/types/goals';
	import { useUnsavedGuard } from '$lib/components/goals/useUnsavedGuard.svelte';
	import UnsavedChangesDialog from '$lib/components/goals/UnsavedChangesDialog.svelte';
	import DodCriteriaList from '$lib/components/goals/DodCriteriaList.svelte';
	import GoalModuleCard from '$lib/components/goals/GoalModuleCard.svelte';

	let errorMsg = $state<string | null>(null);
	let newModuleTitle = $state('');
	let addingModule = $state(false);

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
</script>

<div class="min-h-screen pb-16">
	<!-- Sticky Action Bar (solid background, no blur) -->
	<div class="sticky top-0 z-30 border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
		<div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-2.5">
			<a
				href={`/goal/${goalId}`}
				class="truncate text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
			>
				← {goalsStore.milestoneDraft?.goal_title ?? 'Goal'}
			</a>
			<div class="flex shrink-0 items-center gap-2">
				{#if goalsStore.isMilestoneDirty}
					<span class="text-xs font-medium text-amber-600 dark:text-amber-400">Unsaved edits</span>
				{/if}
				<button
					type="button"
					onclick={() => goalsStore.clearMilestoneDraft()}
					disabled={!goalsStore.isMilestoneDirty || goalsStore.milestoneSaving}
					class="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={handleSave}
					disabled={!goalsStore.isMilestoneDirty || goalsStore.milestoneSaving}
					class="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
				>
					{goalsStore.milestoneSaving ? 'Saving...' : 'Save'}
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

		{#if goalsStore.milestoneLoading && !goalsStore.milestoneDraft}
			<p class="text-sm text-stone-500 dark:text-stone-400">Loading milestone...</p>
		{:else if goalsStore.milestoneDraft}
			{@const draft = goalsStore.milestoneDraft}
			<div class="space-y-8">
				<!-- Section 1: Milestone Header & Details -->
				<section class="space-y-4 rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
					<div class="flex flex-wrap items-center gap-3">
						<input
							type="text"
							bind:value={draft.title}
							placeholder="Milestone Title"
							class="min-w-0 flex-1 border-b border-transparent bg-transparent text-xl font-semibold text-stone-900 focus:border-stone-400 focus:outline-none dark:text-stone-100"
						/>
						<select
							bind:value={draft.status}
							aria-label="Milestone status"
							class="rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm font-medium text-stone-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200"
						>
							{#each MILESTONE_STATUSES as st}
								<option value={st}>{st.replace('_', ' ')}</option>
							{/each}
						</select>
					</div>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div>
							<label for="m-start" class="block text-xs font-medium text-stone-500 dark:text-stone-400">
								Start Date
							</label>
							<input
								id="m-start"
								type="date"
								value={draft.start_date ?? ''}
								oninput={(e) => (draft.start_date = e.currentTarget.value || null)}
								class="mt-1 w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
							/>
						</div>
						<div>
							<label for="m-due" class="block text-xs font-medium text-stone-500 dark:text-stone-400">
								Due Date
							</label>
							<input
								id="m-due"
								type="date"
								value={draft.due_date ?? ''}
								oninput={(e) => (draft.due_date = e.currentTarget.value || null)}
								class="mt-1 w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
							/>
						</div>
					</div>

					<div>
						<label for="retro-note" class="block text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
							Retrospective Note
						</label>
						<textarea
							id="retro-note"
							rows="2"
							value={draft.retrospective_note ?? ''}
							oninput={(e) => (draft.retrospective_note = e.currentTarget.value || null)}
							placeholder="Post-milestone review or scope-cut notes..."
							class="mt-1 w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-stone-400 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
						></textarea>
					</div>
				</section>

				<!-- Section 2: Milestone Definition of Done -->
				<section class="space-y-3 rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
					<h2 class="text-sm font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-300">
						Milestone Definition of Done
					</h2>
					<DodCriteriaList
						items={draft.dod_items}
						goalId={draft.goal_id}
						milestoneId={draft.id}
						onChange={(items) => (draft.dod_items = items)}
					/>
				</section>

				<!-- Section 3: Goal Modules & Tasks -->
				<section class="space-y-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="text-sm font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-300">
							Modules ({draft.modules.length})
						</h2>
						<form onsubmit={handleAddModule} class="flex items-center gap-2">
							<input
								type="text"
								bind:value={newModuleTitle}
								placeholder="New module title..."
								class="rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
							/>
							<button
								type="submit"
								disabled={!newModuleTitle.trim() || addingModule}
								class="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
							>
								{addingModule ? 'Adding...' : '+ Add Module'}
							</button>
						</form>
					</div>

					{#if draft.modules.length === 0}
						<div class="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
							No modules yet. Add a module above to break this milestone into tasks.
						</div>
					{:else}
						<div class="space-y-4">
							{#each draft.modules as mod (mod.id)}
								<GoalModuleCard
									module={mod}
									onDeleteModule={handleDeleteModule}
									onAddTask={(modId, title, mins) => goalsStore.addTask(modId, title, mins)}
									onLoadMoreTasks={(modId) => goalsStore.loadMoreModuleTasks(modId)}
								/>
							{/each}
						</div>
					{/if}
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
