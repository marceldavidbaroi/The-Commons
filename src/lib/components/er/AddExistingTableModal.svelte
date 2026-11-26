<script lang="ts">
	import * as erService from '$lib/services/er-service';
	import { erStore, UNGROUPED_KEY } from '$lib/stores/er.svelte';
	import type { ErTableSummary } from '$lib/types/er';

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let { open, onClose }: Props = $props();

	let search = $state('');
	let tables = $state<ErTableSummary[]>([]);
	let loading = $state(false);
	let addingId = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	const activeGroupId = $derived(
		erStore.activeGroupKey === UNGROUPED_KEY ? null : erStore.activeGroupKey
	);

	const activeGroupName = $derived(
		erStore.groups.find((g) => g.id === activeGroupId)?.name ?? 'Group'
	);

	const memberIds = $derived(
		new Set((erStore.tablesByGroup[erStore.activeGroupKey] ?? []).map((t) => t.id))
	);

	$effect(() => {
		if (open && erStore.activeDiagramId) {
			loadTables();
		}
	});

	async function loadTables() {
		if (!erStore.activeDiagramId) return;
		loading = true;
		errorMsg = null;
		try {
			tables = await erService.searchDiagramTables(erStore.activeDiagramId, search);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to search tables';
		} finally {
			loading = false;
		}
	}

	async function handleAdd(tableId: string) {
		if (!activeGroupId || addingId) return;
		addingId = tableId;
		errorMsg = null;
		try {
			await erStore.addTableToGroup(tableId, activeGroupId);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to add table to group';
		} finally {
			addingId = null;
		}
	}
</script>

{#if open}
	<div class="er-modal-backdrop" role="presentation" onclick={onClose}>
		<div
			class="er-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Add Existing Table to Group"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && onClose()}
		>
			<header class="er-modal-header">
				<h2 class="er-modal-title">Add Existing Table to {activeGroupName}</h2>
				<button type="button" class="er-close-btn" onclick={onClose} aria-label="Close">×</button>
			</header>

			<div class="er-modal-body">
				{#if errorMsg}
					<div class="er-error-box">{errorMsg}</div>
				{/if}

				<form
					class="er-search-row"
					onsubmit={(e) => {
						e.preventDefault();
						loadTables();
					}}
				>
					<input
						type="text"
						class="er-search-input"
						placeholder="Search existing tables (e.g. customer, vendor, recipient)..."
						bind:value={search}
						oninput={loadTables}
					/>
				</form>

				<div class="er-table-list">
					{#if loading}
						<div class="er-list-empty">Searching tables...</div>
					{:else if tables.length === 0}
						<div class="er-list-empty">No matching tables found.</div>
					{:else}
						{#each tables as t (t.id)}
							{@const inGroup = memberIds.has(t.id)}
							<div class="er-list-row">
								<span class="er-list-name">{t.name}</span>
								{#if inGroup}
									<span class="er-in-group-badge">Added</span>
								{:else}
									<button
										type="button"
										class="er-btn-add"
										disabled={addingId === t.id || !activeGroupId}
										onclick={() => handleAdd(t.id)}
									>
										{addingId === t.id ? 'Adding...' : '+ Add'}
									</button>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.er-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: rgba(0, 0, 0, 0.58);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.er-modal {
		width: 100%;
		max-width: 460px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
		overflow: hidden;
		color: var(--text-primary);
	}

	.er-modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: var(--bg-tertiary);
		border-bottom: 1px solid var(--border-subtle);
	}

	.er-modal-title {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
	}

	.er-close-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 18px;
		cursor: pointer;
	}

	.er-modal-body {
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.er-error-box {
		padding: 8px 10px;
		border-radius: 6px;
		background: rgba(239, 68, 68, 0.14);
		border: 1px solid rgba(239, 68, 68, 0.35);
		color: #f87171;
		font-size: 12px;
	}

	.er-search-input {
		width: 100%;
		height: 32px;
		padding: 0 10px;
		border-radius: 6px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 12px;
		box-sizing: border-box;
	}

	.er-table-list {
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-primary);
	}

	.er-list-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 7px 10px;
		border-bottom: 1px solid var(--border-subtle);
		font-size: 12px;
	}

	.er-list-row:last-child {
		border-bottom: none;
	}

	.er-list-name {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	.er-in-group-badge {
		font-size: 11px;
		color: var(--text-secondary);
	}

	.er-btn-add {
		height: 24px;
		padding: 0 10px;
		border-radius: 5px;
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
		background: var(--primary);
		border: 1px solid var(--primary);
		color: var(--primary-foreground);
	}

	.er-list-empty {
		padding: 20px;
		text-align: center;
		font-size: 12px;
		color: var(--text-secondary);
	}
</style>
