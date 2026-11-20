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

<div class="space-y-2">
	{#if items.length === 0}
		<p class="text-sm text-stone-500 dark:text-stone-400">No Definition of Done criteria yet.</p>
	{:else}
		<ul class="space-y-1.5">
			{#each items as item, idx (item.id)}
				<li class="flex items-center gap-2 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 dark:border-stone-700 dark:bg-stone-900">
					<div class="flex flex-col">
						<button
							type="button"
							onclick={() => moveItem(idx, -1)}
							disabled={idx === 0}
							aria-label="Move up"
							class="text-[10px] leading-none text-stone-400 hover:text-stone-700 disabled:opacity-30 dark:hover:text-stone-200"
						>
							▲
						</button>
						<button
							type="button"
							onclick={() => moveItem(idx, 1)}
							disabled={idx === items.length - 1}
							aria-label="Move down"
							class="text-[10px] leading-none text-stone-400 hover:text-stone-700 disabled:opacity-30 dark:hover:text-stone-200"
						>
							▼
						</button>
					</div>
					<input
						type="text"
						value={item.criterion}
						oninput={(e) => updateCriterion(item.id, e.currentTarget.value)}
						placeholder="Binary pass/fail condition..."
						class="min-w-0 flex-1 bg-transparent text-sm text-stone-900 focus:outline-none dark:text-stone-100"
					/>
					<button
						type="button"
						onclick={() => removeCriterion(item.id)}
						aria-label="Delete criterion"
						class="rounded px-1.5 py-0.5 text-xs text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
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
		class="flex items-center gap-2 pt-1"
	>
		<input
			type="text"
			bind:value={newCriterion}
			placeholder="+ Add Criterion..."
			class="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
		/>
		<button
			type="submit"
			disabled={!newCriterion.trim()}
			class="rounded-md border border-stone-300 bg-stone-50 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
		>
			Add
		</button>
	</form>
</div>
