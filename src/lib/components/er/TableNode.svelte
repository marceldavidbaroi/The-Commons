<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';
	import { erStore, UNGROUPED_KEY } from '$lib/stores/er.svelte';
	import type { ErTable } from '$lib/types/er';

	interface TableNodeData {
		table: ErTable;
		noteCount?: number;
		isExternal?: boolean;
		onEdit?: (table: ErTable) => void;
		onNote?: (table: ErTable) => void;
		onFocus?: (table: ErTable) => void;
	}

	let { data, selected }: NodeProps & { data: TableNodeData } = $props();

	const table = $derived(data.table);
	const noteCount = $derived(data.noteCount ?? 0);
	const isExternal = $derived(!!data.isExternal);
	const activeGroupId = $derived(
		erStore.activeGroupKey === UNGROUPED_KEY ? null : erStore.activeGroupKey
	);

	let localExpanded = $state<boolean | null>(null);
	let menuOpen = $state(false);
	let menuPos = $state({ x: 0, y: 0 });

	$effect(() => {
		erStore.expandAllTables;
		localExpanded = null;
	});

	const expanded = $derived(localExpanded ?? erStore.expandAllTables);

	function handleContextMenu(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		menuPos = {
			x: Math.max(8, event.clientX - rect.left),
			y: Math.max(8, event.clientY - rect.top)
		};
		menuOpen = true;
	}

	async function handleRemoveFromGroup() {
		menuOpen = false;
		if (!table.group_id) return;
		await erStore.removeTableFromGroup(table.id, table.group_id);
	}

	async function handleAddToActiveGroup() {
		menuOpen = false;
		if (!activeGroupId) return;
		await erStore.addTableToGroup(table.id, activeGroupId);
	}

	async function handleDeleteTable() {
		menuOpen = false;
		await erStore.deleteTable(table.id, table.group_id);
	}
</script>

<svelte:window onclick={() => (menuOpen = false)} />

<div
	class="er-table-node"
	class:selected
	class:external={isExternal}
	role="group"
	oncontextmenu={handleContextMenu}
	ondblclick={(e) => {
		e.stopPropagation();
		data.onFocus?.(table);
	}}
>
	<Handle type="target" position={Position.Left} class="er-handle" />
	<Handle type="source" position={Position.Right} class="er-handle" />

	<header class="er-table-header" class:collapsed={!expanded}>
		<span class="er-table-name" title={table.name}>{table.name}</span>
		{#if isExternal}
			<span class="er-external-badge" title="Not in this group or sub-group">External</span>
		{/if}
		{#if noteCount > 0}
			<span class="er-note-dot" title="{noteCount} study note(s)">{noteCount}</span>
		{/if}
	</header>

	{#if menuOpen}
		<div
			class="er-context-menu nodrag"
			role="menu"
			style:left="{menuPos.x}px"
			style:top="{menuPos.y}px"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)}
			tabindex="-1"
		>
			<button
				type="button"
				class="er-menu-item"
				onclick={() => {
					menuOpen = false;
					localExpanded = !expanded;
				}}
			>
				{expanded ? 'Collapse attributes' : 'Expand attributes'}
			</button>
			<button
				type="button"
				class="er-menu-item"
				onclick={() => {
					menuOpen = false;
					data.onEdit?.(table);
				}}
			>
				Edit table
			</button>
			<button
				type="button"
				class="er-menu-item"
				onclick={() => {
					menuOpen = false;
					data.onNote?.(table);
				}}
			>
				Study notes {noteCount > 0 ? `(${noteCount})` : ''}
			</button>
			{#if isExternal && activeGroupId}
				<div class="er-menu-sep"></div>
				<button type="button" class="er-menu-item" onclick={handleAddToActiveGroup}>
					+ Add to this group
				</button>
			{:else if table.group_id}
				<div class="er-menu-sep"></div>
				<button type="button" class="er-menu-item" onclick={handleRemoveFromGroup}>
					Remove from group
				</button>
			{/if}
			<div class="er-menu-sep"></div>
			<button type="button" class="er-menu-item er-menu-danger" onclick={handleDeleteTable}>
				Delete table
			</button>
		</div>
	{/if}

	{#if expanded}
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
	{/if}
</div>

<style>
	.er-table-node {
		position: relative;
		min-width: 190px;
		max-width: 240px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
		color: var(--text-primary);
		font-size: 12px;
	}

	.er-table-node.selected {
		border-color: var(--primary);
		box-shadow: 0 0 0 1px var(--primary), 0 4px 12px rgba(0, 0, 0, 0.12);
	}

	.er-table-node.external {
		border-style: dashed;
		opacity: 0.92;
	}

	.er-external-badge {
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		padding: 1px 5px;
		border-radius: 4px;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.er-table-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 9px 12px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-subtle);
		border-radius: 8px 8px 0 0;
	}

	.er-table-header.collapsed {
		border-bottom: none;
		border-radius: 8px;
	}

	.er-note-dot {
		font-size: 10px;
		font-weight: 600;
		padding: 0 5px;
		border-radius: 999px;
		background: var(--primary);
		color: var(--primary-foreground);
		flex-shrink: 0;
	}

	.er-context-menu {
		position: absolute;
		z-index: 40;
		min-width: 165px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
		padding: 4px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.er-menu-item {
		width: 100%;
		text-align: left;
		background: transparent;
		border: none;
		border-radius: 4px;
		padding: 5px 8px;
		font-size: 11px;
		color: var(--text-primary);
		cursor: pointer;
	}

	.er-menu-item:hover {
		background: var(--bg-tertiary);
	}

	.er-menu-danger {
		color: #f87171;
	}

	.er-menu-sep {
		height: 1px;
		background: var(--border-subtle);
		margin: 2px 0;
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
