<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';
	import { erStore, UNGROUPED_KEY } from '$lib/stores/er.svelte';
	import type { ErTable } from '$lib/types/er';

	interface TableNodeData {
		table: ErTable;
		externalTargets?: string[];
		noteCount?: number;
	}

	let { data, selected }: NodeProps & { data: TableNodeData } = $props();

	const table = $derived(data.table);
	const externalTargets = $derived(data.externalTargets ?? []);
	const noteCount = $derived(data.noteCount ?? 0);
	const activeGroupId = $derived(
		erStore.activeGroupKey === UNGROUPED_KEY ? null : erStore.activeGroupKey
	);

	async function handlePullFkTarget(targetTableName: string) {
		if (!activeGroupId) return;
		await erStore.addTableByNameToGroup(targetTableName, activeGroupId);
	}

	async function handleRemoveFromGroup() {
		if (!table.group_id) return;
		await erStore.removeTableFromGroup(table.id, table.group_id);
	}
</script>

<div class="er-table-node" class:selected>
	<Handle type="target" position={Position.Left} class="er-handle" />
	<Handle type="source" position={Position.Right} class="er-handle" />

	<header class="er-table-header">
		<span class="er-table-name" title={table.name}>{table.name}</span>
		<div class="er-table-meta">
			{#if noteCount > 0}
				<span class="er-note-badge" title="{noteCount} study note(s)">{noteCount}</span>
			{/if}
			<span class="er-col-count">{table.columns.length}</span>
		</div>
	</header>

	<ul class="er-col-list">
		{#each table.columns as col (col.name)}
			<li class="er-col-row">
				<div class="er-col-left">
					{#if col.is_pk}
						<span class="er-badge er-badge-pk">PK</span>
					{:else if col.fk_target}
						<span class="er-badge er-badge-fk">FK</span>
					{:else}
						<span class="er-col-dot"></span>
					{/if}
					<span class="er-col-name">{col.name}</span>
				</div>
				<span class="er-col-type">
					{col.type}{col.nullable === false ? '' : '?'}
				</span>
			</li>
		{:else}
			<li class="er-col-empty">No columns</li>
		{/each}
	</ul>

	{#if externalTargets.length > 0}
		<footer class="er-external-fks nodrag">
			{#each externalTargets as target (target)}
				{#if activeGroupId}
					<button
						type="button"
						class="er-ext-chip er-ext-btn"
						title="Click to pull {target} into this feature group"
						onclick={(e) => {
							e.stopPropagation();
							handlePullFkTarget(target);
						}}
					>
						+ {target}
					</button>
				{:else}
					<span class="er-ext-chip" title="External reference: {target}">→ {target}</span>
				{/if}
			{/each}
		</footer>
	{/if}

	{#if table.group_id}
		<div class="er-table-group-bar nodrag">
			<button
				type="button"
				class="er-remove-group-btn"
				onclick={(e) => {
					e.stopPropagation();
					handleRemoveFromGroup();
				}}
			>
				Remove from group
			</button>
		</div>
	{/if}
</div>

<style>
	.er-table-node {
		min-width: 220px;
		max-width: 290px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
		color: var(--text-primary);
		font-size: 12px;
		overflow: hidden;
	}

	.er-table-node.selected {
		border-color: var(--primary);
		box-shadow: 0 0 0 1px var(--primary), 0 4px 12px rgba(0, 0, 0, 0.18);
	}

	.er-table-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 7px 10px;
		background: var(--bg-tertiary);
		border-bottom: 1px solid var(--border-subtle);
	}

	.er-table-name {
		font-weight: 600;
		font-size: 12px;
		letter-spacing: 0.01em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.er-table-meta {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}

	.er-col-count,
	.er-note-badge {
		font-size: 10px;
		font-weight: 600;
		padding: 1px 5px;
		border-radius: 4px;
		background: var(--bg-secondary);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
	}

	.er-note-badge {
		background: var(--primary);
		color: var(--primary-foreground);
		border-color: var(--primary);
	}

	.er-col-list {
		list-style: none;
		margin: 0;
		padding: 4px 0;
	}

	.er-col-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 3px 10px;
	}

	.er-col-left {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}

	.er-col-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--border-subtle);
		flex-shrink: 0;
		margin: 0 5px;
	}

	.er-badge {
		font-size: 9px;
		font-weight: 700;
		padding: 0 4px;
		border-radius: 3px;
		line-height: 14px;
		flex-shrink: 0;
	}

	.er-badge-pk {
		background: rgba(234, 179, 8, 0.16);
		color: #ca8a04;
		border: 1px solid rgba(234, 179, 8, 0.35);
	}

	.er-badge-fk {
		background: rgba(59, 130, 246, 0.14);
		color: #3b82f6;
		border: 1px solid rgba(59, 130, 246, 0.3);
	}

	.er-col-name {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 11px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.er-col-type {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 10px;
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.er-col-empty {
		padding: 6px 10px;
		color: var(--text-secondary);
		font-style: italic;
		font-size: 11px;
	}

	.er-external-fks {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		padding: 5px 10px;
		border-top: 1px solid var(--border-subtle);
		background: var(--bg-primary);
	}

	.er-ext-chip {
		font-size: 10px;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		padding: 1px 5px;
		border-radius: 4px;
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
	}

	:global(.er-handle) {
		width: 8px !important;
		height: 8px !important;
		background: var(--primary) !important;
		border: 1.5px solid var(--bg-secondary) !important;
	}

	.er-table-group-bar {
		padding: 4px 8px;
		border-top: 1px solid var(--border-subtle);
		background: var(--bg-primary);
		display: flex;
		justify-content: flex-end;
	}

	.er-ext-btn {
		cursor: pointer;
	}

	.er-ext-btn:hover {
		border-color: var(--primary);
		color: var(--text-primary);
	}

	.er-remove-group-btn {
		background: transparent;
		border: none;
		padding: 1px 4px;
		font-size: 10px;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.er-remove-group-btn:hover {
		color: #f87171;
	}
</style>
