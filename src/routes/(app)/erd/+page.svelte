<script lang="ts">
	import { onMount } from 'svelte';
	import {
		SvelteFlow,
		Background,
		Controls,
		MiniMap,
		type Edge,
		type Node,
		type NodeTypes
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import { erStore, UNGROUPED_KEY } from '$lib/stores/er.svelte';
	import TableNode from '$lib/components/er/TableNode.svelte';
	import GroupNode from '$lib/components/er/GroupNode.svelte';
	import StickyNoteNode from '$lib/components/er/StickyNoteNode.svelte';
	import NoteDrawer, { type NoteTarget } from '$lib/components/er/NoteDrawer.svelte';
	import TableEditorDrawer from '$lib/components/er/TableEditorDrawer.svelte';
	import ImportSqlModal from '$lib/components/er/ImportSqlModal.svelte';
	import NewGroupModal from '$lib/components/er/NewGroupModal.svelte';
	import AddExistingTableModal from '$lib/components/er/AddExistingTableModal.svelte';
	import { exportTablesToSql } from '$lib/utils/sql-er-parser';
	import type { ErTable } from '$lib/types/er';

	const nodeTypes: NodeTypes = {
		erTable: TableNode as any,
		erGroup: GroupNode as any,
		erStickyNote: StickyNoteNode as any
	};

	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	let showNewDiagramForm = $state(false);
	let newDiagramName = $state('');
	let creatingDiagram = $state(false);
	let showDeleteDiagramConfirm = $state(false);
	let deletingDiagram = $state(false);

	let showImportModal = $state(false);
	let importInitialTab = $state<'sql' | 'groups' | 'live'>('sql');
	let showNewTableModal = $state(false);
	let showNewGroupModal = $state(false);
	let showAddExistingModal = $state(false);
	let exportCopied = $state(false);
	let selectedNoteTarget = $state<NoteTarget | null>(null);

	onMount(async () => {
		await erStore.loadDiagrams();
		if (!erStore.activeDiagramId && erStore.diagrams.length > 0) {
			await erStore.selectDiagram(erStore.diagrams[0].id);
		}
	});

	const orderedGroupPills = $derived.by(() => {
		const parents = erStore.groups.filter((g) => !g.parent_id);
		const childrenByParent = new Map<string, typeof erStore.groups>();
		for (const g of erStore.groups) {
			if (g.parent_id) {
				const list = childrenByParent.get(g.parent_id) ?? [];
				list.push(g);
				childrenByParent.set(g.parent_id, list);
			}
		}
		const result: Array<{ group: (typeof erStore.groups)[number]; isChild: boolean }> = [];
		for (const p of parents) {
			result.push({ group: p, isChild: false });
			for (const c of childrenByParent.get(p.id) ?? []) {
				result.push({ group: c, isChild: true });
			}
		}
		return result;
	});

	$effect(() => {
		const rawVisible = erStore.visibleTables;
		const seenIds = new Set<string>();
		const visible: ErTable[] = [];
		for (const t of rawVisible) {
			if (!seenIds.has(t.id)) {
				seenIds.add(t.id);
				visible.push(t);
			}
		}
		const visibleNames = new Map<string, ErTable>();
		for (const t of visible) {
			visibleNames.set(t.name, t);
		}

		const visibleGroups = erStore.isolateMode
			? erStore.groups.filter(
					(g) => g.id === erStore.activeGroupKey || g.parent_id === erStore.activeGroupKey
				)
			: erStore.groups;

		const groupNodes: Node[] = visibleGroups.map((group) => {
			const pos = group.position ?? { x: 0, y: 0, width: 480, height: 360 };
			const noteCount = erStore.notes.filter(
				(n) => n.target_type === 'group' && n.target_id === group.id
			).length;

			return {
				id: group.id,
				type: 'erGroup',
				position: { x: pos.x, y: pos.y },
				width: pos.width,
				height: pos.height,
				zIndex: -1,
				data: {
					group,
					tableCount: erStore.groupCounts[group.id] ?? 0,
					noteCount
				}
			};
		});

		const tableNodes: Node[] = visible.map((table, index) => {
			const externalTargets = new Set<string>();
			for (const rel of table.relations ?? []) {
				if (!visibleNames.has(rel.to_table)) {
					externalTargets.add(rel.to_table);
				}
			}

			const noteCount = erStore.notes.filter(
				(n) => n.target_type === 'table' && n.target_id === table.id
			).length;

			const pos = table.position ?? { x: (index % 4) * 320, y: Math.floor(index / 4) * 240 };

			return {
				id: table.id,
				type: 'erTable',
				position: { x: pos.x, y: pos.y },
				data: {
					table,
					externalTargets: Array.from(externalTargets),
					noteCount
				}
			};
		});

		const nextEdges: Edge[] = [];
		for (const table of visible) {
			for (const rel of table.relations ?? []) {
				const targetTable = visibleNames.get(rel.to_table);
				if (!targetTable) continue;
				nextEdges.push({
					id: `${table.id}:${rel.from_column}->${targetTable.id}:${rel.to_column}`,
					source: table.id,
					target: targetTable.id,
					label: `${rel.from_column} → ${rel.to_column}`,
					type: 'smoothstep'
				});
			}
		}

		const stickyNodes: Node[] = erStore.notes
			.filter((n) => n.target_type === 'canvas')
			.map((note, idx) => ({
				id: note.id,
				type: 'erStickyNote',
				position: note.position ?? { x: 80 + idx * 30, y: 80 + idx * 30 },
				data: { note }
			}));

		nodes = [...groupNodes, ...tableNodes, ...stickyNodes];
		edges = nextEdges;
	});

	async function handleDiagramChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		if (select.value) {
			await erStore.selectDiagram(select.value);
		}
	}

	async function handleCreateDiagram(event: Event) {
		event.preventDefault();
		const name = newDiagramName.trim();
		if (!name || creatingDiagram) return;

		creatingDiagram = true;
		try {
			const created = await erStore.createDiagram({ name, source_type: 'ddl' });
			newDiagramName = '';
			showNewDiagramForm = false;
			await erStore.selectDiagram(created.id);
		} finally {
			creatingDiagram = false;
		}
	}

	async function handleDeleteDiagram() {
		if (!erStore.activeDiagramId || deletingDiagram) return;
		deletingDiagram = true;
		try {
			await erStore.deleteDiagram(erStore.activeDiagramId);
			showDeleteDiagramConfirm = false;
			if (erStore.diagrams.length > 0) {
				await erStore.selectDiagram(erStore.diagrams[0].id);
			}
		} finally {
			deletingDiagram = false;
		}
	}

	async function handleNodeDragStop({ targetNode }: { targetNode: Node | null }) {
		if (!targetNode) return;
		const x = Math.round(targetNode.position.x);
		const y = Math.round(targetNode.position.y);

		if (targetNode.type === 'erGroup') {
			const group = erStore.groups.find((g) => g.id === targetNode.id);
			const width = group?.position?.width ?? 480;
			const height = group?.position?.height ?? 360;
			await erStore.updateGroup(targetNode.id, { position: { x, y, width, height } });
		} else if (targetNode.type === 'erStickyNote') {
			await erStore.updateNote(targetNode.id, { position: { x, y } });
		} else {
			const groupId = erStore.activeGroupKey === UNGROUPED_KEY ? null : erStore.activeGroupKey;
			await erStore.updateTablePositionInGroup(targetNode.id, groupId, { x, y });
		}
	}

	function handleNodeClick({ node }: { node: Node }) {
		if (node.type === 'erTable') {
			const table = (node.data as { table?: ErTable })?.table;
			if (table) {
				showNewTableModal = false;
				selectedNoteTarget = { type: 'table', id: table.id, label: table.name };
			}
		} else if (node.type === 'erGroup') {
			const group = (node.data as { group?: { id: string; name: string } })?.group;
			if (group) {
				showNewTableModal = false;
				erStore.selectGroup(group.id);
				selectedNoteTarget = { type: 'group', id: group.id, label: group.name };
			}
		}
	}

	function openNewTableDrawer() {
		selectedNoteTarget = null;
		showNewTableModal = true;
	}

	async function handleAddStickyNote() {
		if (!erStore.activeDiagramId) return;
		const count = erStore.notes.filter((n) => n.target_type === 'canvas').length;
		await erStore.createNote({
			diagram_id: erStore.activeDiagramId,
			target_type: 'canvas',
			target_id: 'canvas',
			content: 'Double-click to edit study note...',
			position: { x: 100 + count * 30, y: 100 + count * 30 }
		});
	}

	function openImportModal(tab: 'sql' | 'groups' | 'live') {
		importInitialTab = tab;
		showImportModal = true;
	}

	async function handleExportSql() {
		const sql = exportTablesToSql(erStore.visibleTables);
		if (!sql) return;
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			await navigator.clipboard.writeText(sql);
			exportCopied = true;
			setTimeout(() => (exportCopied = false), 2000);
		}
	}
</script>

<div class="erd-workspace">
	<!-- 2-Tier Compact Header -->
	<header class="erd-header">
		<div class="erd-tier-1">
			<div class="erd-title-group">
				<h1 class="erd-title">ER Study</h1>
				{#if erStore.diagrams.length > 0}
					<select
						class="erd-diagram-select"
						value={erStore.activeDiagramId ?? ''}
						onchange={handleDiagramChange}
						aria-label="Select ER diagram"
					>
						{#each erStore.diagrams as diagram (diagram.id)}
							<option value={diagram.id}>{diagram.name}</option>
						{/each}
					</select>
				{/if}
				<button
					type="button"
					class="erd-btn erd-btn-ghost"
					onclick={() => (showNewDiagramForm = !showNewDiagramForm)}
				>
					+ Diagram
				</button>
				{#if erStore.activeDiagram}
					<button
						type="button"
						class="erd-btn erd-btn-danger-ghost"
						onclick={() => (showDeleteDiagramConfirm = true)}
						title="Delete current diagram and all its data"
					>
						Delete
					</button>
				{/if}
			</div>

			<div class="erd-actions">
				<button
					type="button"
					class="erd-btn erd-btn-secondary"
					disabled={!erStore.activeDiagramId}
					onclick={() => (showNewGroupModal = true)}
				>
					+ Group
				</button>
				<button
					type="button"
					class="erd-btn erd-btn-secondary"
					disabled={!erStore.activeDiagramId || erStore.activeGroupKey === UNGROUPED_KEY}
					onclick={() => (showAddExistingModal = true)}
					title="Add existing tables from this diagram into the active feature group"
				>
					+ Add Existing
				</button>
				<button
					type="button"
					class="erd-btn erd-btn-secondary"
					disabled={!erStore.activeDiagramId}
					onclick={() => openImportModal('sql')}
				>
					+ Import SQL
				</button>
				<button
					type="button"
					class="erd-btn erd-btn-secondary"
					disabled={!erStore.activeDiagramId}
					onclick={() => openImportModal('groups')}
				>
					+ Import Groups
				</button>
				<button
					type="button"
					class="erd-btn erd-btn-primary"
					disabled={!erStore.activeDiagramId}
					onclick={openNewTableDrawer}
				>
					+ New Table
				</button>
			</div>
		</div>

		{#if showNewDiagramForm}
			<form class="erd-inline-create" onsubmit={handleCreateDiagram}>
				<input
					type="text"
					class="erd-input"
					placeholder="Diagram name (e.g. The Commons Core)..."
					bind:value={newDiagramName}
					required
				/>
				<button type="submit" class="erd-btn erd-btn-primary" disabled={creatingDiagram}>
					{creatingDiagram ? 'Creating...' : 'Create'}
				</button>
				<button
					type="button"
					class="erd-btn erd-btn-ghost"
					onclick={() => (showNewDiagramForm = false)}
				>
					Cancel
				</button>
			</form>
		{:else}
			<div class="erd-tier-2">
				<div class="erd-group-pills" role="tablist" aria-label="Table groups">
					{#each orderedGroupPills as { group, isChild } (group.id)}
						<button
							type="button"
							role="tab"
							aria-selected={erStore.activeGroupKey === group.id}
							class="erd-pill"
							class:active={erStore.activeGroupKey === group.id}
							onclick={() => erStore.selectGroup(group.id)}
						>
							{isChild ? `↳ ${group.name}` : group.name} ({erStore.groupCounts[group.id] ?? 0})
						</button>
					{/each}
					<button
						type="button"
						role="tab"
						aria-selected={erStore.activeGroupKey === UNGROUPED_KEY}
						class="erd-pill"
						class:active={erStore.activeGroupKey === UNGROUPED_KEY}
						onclick={() => erStore.selectGroup(UNGROUPED_KEY)}
					>
						Ungrouped ({erStore.groupCounts[UNGROUPED_KEY] ?? 0})
					</button>
					{#if erStore.activeGroupHasMore}
						<button
							type="button"
							class="erd-btn erd-btn-ghost"
							onclick={() => erStore.loadMoreTablesForActiveGroup()}
							disabled={erStore.loadingTables}
						>
							{erStore.loadingTables ? 'Loading...' : 'Load +20'}
						</button>
					{/if}
				</div>

				<div class="erd-tier-2-right">
					<button
						type="button"
						class="erd-btn erd-btn-ghost"
						disabled={!erStore.activeDiagramId}
						onclick={handleAddStickyNote}
					>
						+ Sticky Note
					</button>
					<button
						type="button"
						class="erd-btn erd-btn-ghost"
						disabled={!erStore.activeDiagramId}
						onclick={() => openImportModal('live')}
					>
						Sync Schema
					</button>
					<button
						type="button"
						class="erd-btn erd-btn-ghost"
						disabled={erStore.visibleTables.length === 0}
						onclick={handleExportSql}
					>
						{exportCopied ? 'Copied SQL!' : 'Export SQL'}
					</button>
					<button
						type="button"
						class="erd-pill"
						class:active={erStore.isolateMode}
						onclick={() => (erStore.isolateMode = !erStore.isolateMode)}
						aria-pressed={erStore.isolateMode}
					>
						Isolate
					</button>
				</div>
			</div>
		{/if}
	</header>

	<!-- Canvas Area -->
	<main class="erd-canvas-wrap">
		{#if erStore.error}
			<div class="erd-banner erd-banner-error">{erStore.error}</div>
		{/if}

		{#if !erStore.loadingDiagrams && erStore.diagrams.length === 0}
			<div class="erd-empty-state">
				<h2>No ER Diagrams Yet</h2>
				<p>Create a diagram to organize tables into study groups and annotate relationships.</p>
				<form class="erd-empty-form" onsubmit={handleCreateDiagram}>
					<input
						type="text"
						class="erd-input"
						placeholder="Diagram name..."
						bind:value={newDiagramName}
						required
					/>
					<button type="submit" class="erd-btn erd-btn-primary" disabled={creatingDiagram}>
						{creatingDiagram ? 'Creating...' : 'Create Diagram'}
					</button>
				</form>
			</div>
		{:else}
			<div class="erd-canvas-split">
				<div class="erd-flow-container">
					<SvelteFlow
						bind:nodes
						bind:edges
						{nodeTypes}
						fitView
						onnodedragstop={handleNodeDragStop}
						onnodeclick={handleNodeClick}
					>
						<Background bgColor="var(--bg-primary)" patternColor="var(--border-subtle)" />
						<Controls />
						<MiniMap />
					</SvelteFlow>
				</div>

				<NoteDrawer
					target={selectedNoteTarget}
					onClose={() => (selectedNoteTarget = null)}
				/>

				<TableEditorDrawer
					open={showNewTableModal}
					onClose={() => (showNewTableModal = false)}
				/>
			</div>
		{/if}
	</main>

	<ImportSqlModal
		open={showImportModal}
		initialTab={importInitialTab}
		onClose={() => (showImportModal = false)}
	/>

	<NewGroupModal
		open={showNewGroupModal}
		onClose={() => (showNewGroupModal = false)}
	/>

	<AddExistingTableModal
		open={showAddExistingModal}
		onClose={() => (showAddExistingModal = false)}
	/>

	{#if showDeleteDiagramConfirm && erStore.activeDiagram}
		<div
			class="erd-modal-backdrop"
			role="presentation"
			onclick={() => !deletingDiagram && (showDeleteDiagramConfirm = false)}
		>
			<div
				class="erd-confirm-modal"
				role="dialog"
				aria-modal="true"
				aria-label="Delete Diagram"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && !deletingDiagram && (showDeleteDiagramConfirm = false)}
			>
				<h2 class="erd-confirm-title">Delete Diagram</h2>
				<p class="erd-confirm-text">
					Delete <strong>{erStore.activeDiagram.name}</strong>? This permanently removes all
					groups, tables, relations, and study notes in this diagram.
				</p>
				<div class="erd-confirm-actions">
					<button
						type="button"
						class="erd-btn erd-btn-ghost"
						disabled={deletingDiagram}
						onclick={() => (showDeleteDiagramConfirm = false)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="erd-btn erd-btn-danger"
						disabled={deletingDiagram}
						onclick={handleDeleteDiagram}
					>
						{deletingDiagram ? 'Deleting...' : 'Delete Diagram'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.erd-workspace {
		width: 100%;
		height: 100dvh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	.erd-header {
		width: 100%;
		min-width: 0;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-subtle);
		padding: 8px 16px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex-shrink: 0;
		box-sizing: border-box;
	}

	.erd-tier-1,
	.erd-tier-2,
	.erd-inline-create {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 34px;
		min-width: 0;
		width: 100%;
	}

	.erd-title-group {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.erd-title {
		font-size: 15px;
		font-weight: 600;
		margin: 0;
		white-space: nowrap;
	}

	.erd-diagram-select,
	.erd-input {
		height: 30px;
		padding: 0 10px;
		border-radius: 6px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 13px;
	}

	.erd-input {
		min-width: 240px;
	}

	.erd-actions,
	.erd-tier-2-right {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.erd-group-pills {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: thin;
	}

	.erd-pill {
		height: 28px;
		padding: 0 10px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		cursor: pointer;
		white-space: nowrap;
	}

	.erd-pill.active {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.erd-btn {
		height: 30px;
		padding: 0 10px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid var(--border-subtle);
		white-space: nowrap;
	}

	.erd-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.erd-btn-primary {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.erd-btn-secondary {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.erd-btn-ghost {
		background: transparent;
		border-color: transparent;
		color: var(--text-secondary);
	}

	.erd-btn-ghost:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.erd-btn-danger-ghost {
		background: transparent;
		border-color: transparent;
		color: #f87171;
	}

	.erd-btn-danger-ghost:hover {
		background: rgba(239, 68, 68, 0.12);
	}

	.erd-btn-danger {
		background: #dc2626;
		border-color: #dc2626;
		color: #ffffff;
	}

	.erd-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: rgba(0, 0, 0, 0.58);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.erd-confirm-modal {
		width: 100%;
		max-width: 400px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		padding: 16px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.erd-confirm-title {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
	}

	.erd-confirm-text {
		margin: 0;
		font-size: 13px;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.erd-confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 4px;
	}

	.erd-canvas-wrap {
		position: relative;
		flex: 1;
		min-height: 0;
	}

	.erd-canvas-split {
		display: flex;
		width: 100%;
		height: 100%;
	}

	.erd-flow-container {
		flex: 1;
		min-width: 0;
		height: 100%;
	}

	.erd-flow-container :global(.svelte-flow) {
		--xy-background-color: var(--bg-primary);
		--xy-edge-stroke-default: var(--text-secondary);
		--xy-edge-label-background-color-default: var(--bg-secondary);
		--xy-edge-label-color-default: var(--text-primary);
		--xy-controls-button-background-color: var(--bg-secondary);
		--xy-controls-button-background-color-hover: var(--bg-tertiary);
		--xy-controls-button-color: var(--text-primary);
		--xy-controls-button-border-color: var(--border-subtle);
		--xy-minimap-background-color: var(--bg-secondary);
		--xy-minimap-mask-background-color: rgba(128, 128, 128, 0.12);
		--xy-minimap-node-background-color: var(--bg-tertiary);
		background: var(--bg-primary);
	}

	.erd-banner-error {
		position: absolute;
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		padding: 6px 12px;
		border-radius: 6px;
		background: #7f1d1d;
		color: #fecaca;
		border: 1px solid #ef4444;
		font-size: 12px;
	}

	.erd-empty-state {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		text-align: center;
		padding: 24px;
	}

	.erd-empty-state h2 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
	}

	.erd-empty-state p {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
		max-width: 380px;
	}

	.erd-empty-form {
		display: flex;
		gap: 8px;
		margin-top: 6px;
	}
</style>
