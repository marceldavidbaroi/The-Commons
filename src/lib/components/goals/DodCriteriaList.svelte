<script lang="ts">
	import type { DefinitionOfDoneItem } from '$lib/types/goals';

	interface Props {
		items: DefinitionOfDoneItem[];
		goalId: number;
		milestoneId?: number | null;
		onChange: (items: DefinitionOfDoneItem[]) => void;
	}

	let { items, goalId, milestoneId = null, onChange }: Props = $props();

	let newCriterion = $state('');

	function addCriterion() {
		const trimmed = newCriterion.trim();
		if (!trimmed) return;
		const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
		const tempId = -Math.floor(Date.now() + Math.random() * 1000);
		onChange([
			...items,
			{
				id: tempId,
				goal_id: goalId,
				milestone_id: milestoneId,
				criterion: trimmed,
				sort_order: nextOrder
			}
		]);
		newCriterion = '';
	}

	function updateCriterion(id: number, value: string) {
		onChange(items.map((item) => (item.id === id ? { ...item, criterion: value } : item)));
	}

	function removeCriterion(id: number) {
		onChange(items.filter((item) => item.id !== id));
	}

	function moveItem(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= items.length) return;
		const copy = [...items];
		const [moved] = copy.splice(index, 1);
		copy.splice(target, 0, moved);
		onChange(copy.map((item, idx) => ({ ...item, sort_order: idx })));
	}
</script>

<div style="display: flex; flex-direction: column; gap: 8px;">
	{#if items.length === 0}
		<p class="goals-muted">No Definition of Done criteria yet.</p>
	{:else}
		<ul class="goals-dod-list">
			{#each items as item, idx (item.id)}
				<li class="goals-dod-item">
					<div class="goals-dod-reorder">
						<button
							type="button"
							onclick={() => moveItem(idx, -1)}
							disabled={idx === 0}
							aria-label="Move up"
							class="goals-dod-arrow"
						>
							▲
						</button>
						<button
							type="button"
							onclick={() => moveItem(idx, 1)}
							disabled={idx === items.length - 1}
							aria-label="Move down"
							class="goals-dod-arrow"
						>
							▼
						</button>
					</div>
					<input
						type="text"
						value={item.criterion}
						oninput={(e) => updateCriterion(item.id, e.currentTarget.value)}
						placeholder="Binary pass/fail condition..."
						class="goals-inline-input"
					/>
					<button
						type="button"
						onclick={() => removeCriterion(item.id)}
						aria-label="Delete criterion"
						class="goals-btn-icon"
					>
						✕
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<form
		onsubmit={(e) => {
			e.preventDefault();
			addCriterion();
		}}
		class="goals-inline-form"
	>
		<input
			type="text"
			bind:value={newCriterion}
			placeholder="+ Add Criterion..."
			class="goals-input"
			style="flex: 1;"
		/>
		<button type="submit" disabled={!newCriterion.trim()} class="goals-btn-secondary">
			Add
		</button>
	</form>
</div>
