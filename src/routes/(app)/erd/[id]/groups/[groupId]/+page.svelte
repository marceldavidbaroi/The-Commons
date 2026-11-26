<script lang="ts">
	import { page } from '$app/state';
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
	import NewGroupModal from '$lib/components/er/NewGroupModal.svelte';
	import AddExistingTableModal from '$lib/components/er/AddExistingTableModal.svelte';
	import { exportTablesToSql } from '$lib/utils/sql-er-parser';
	import type { ErTable } from '$lib/types/er';

	const COLOR_HEX: Record<string, string> = {
		slate: '#94a3b8',
		blue: '#3b82f6',
		emerald: '#10b981',
		amber: '#f59e0b',
		rose: '#f43f5e',
		violet: '#8b5cf6'
	};

	const nodeTypes: NodeTypes = {
		erTable: TableNode as any,
		erGroup: GroupNode as any,
		erStickyNote: StickyNoteNode as any
	};

	const diagramId = $derived(page.params.id ?? '');
	const groupIdParam = $derived(page.params.groupId ?? UNGROUPED_KEY);
	const isUngrouped = $derived(groupIdParam === UNGROUPED_KEY);

	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	let showTableDrawer = $state(false);
	let editingTable = $state<ErTable | null>(null);
	let showNewGroupModal = $state(false);
	let showAddExistingModal = $state(false);
	let showEdgeLabels = $state(false);
	let autoLayingOut = $state(false);
	let exportCopied = $state(false);
	let selectedNoteTarget = $state<NoteTarget | null>(null);
	let focusedTableId = $state<string | null>(null);
	let tableListSearch = $state('');
	let showLeftPanel = $state(true);

	const currentGroup = $derived(
		isUngrouped ? null : (erStore.groups.find((g) => g.id === groupIdParam) ?? null)
	);

	const parentGroup = $derived(
		currentGroup?.parent_id
			? (erStore.groups.find((g) => g.id === currentGroup.parent_id) ?? null)
			: null
	);

	const childSubGroups = $derived(
		isUngrouped ? [] : erStore.groups.filter((g) => g.parent_id === groupIdParam)
	);

	$effect(() => {
		if (!diagramId || !groupIdParam) return;
		focusedTableId = null;
		erStore.loadGroupBundle(diagramId, groupIdParam);
	});

	const groupAllTables = $derived.by(() => {
		const activeKeys = isUngrouped
			? [UNGROUPED_KEY]
			: [groupIdParam, ...childSubGroups.map((c) => c.id)];

		const seenIds = new Set<string>();
		const list: ErTable[] = [];
		for (const key of activeKeys) {
			for (const t of erStore.tablesByGroup[key] ?? []) {
				if (!seenIds.has(t.id)) {
					seenIds.add(t.id);
					list.push(t);
				}
			}
		}
		return list.sort((a, b) => a.name.localeCompare(b.name));
	});

	const filteredSidebarTables = $derived.by(() => {
		const q = tableListSearch.trim().toLowerCase();
		if (!q) return groupAllTables;
		return groupAllTables.filter((t) => t.name.toLowerCase().includes(q));
	});

	const viewCacheKey = $derived(`${diagramId}:${groupIdParam}:${focusedTableId ?? 'all'}`);

	$effect(() => {
		if (diagramId && focusedTableId) {
			erStore.loadTableNeighbors(diagramId, focusedTableId);
		}
	});

	$effect(() => {
		const inGroupIds = new Set(groupAllTables.map((t) => t.id));
		let visible = groupAllTables;

		if (focusedTableId) {
			const focused = groupAllTables.find((t) => t.id === focusedTableId);
			if (focused) {
				const neighbors = erStore.neighborsByTableId[focusedTableId] ?? [];
				const combined = new Map<string, ErTable>();
				for (const t of groupAllTables) combined.set(t.id, t);
				for (const n of neighbors) {
					if (!combined.has(n.id)) combined.set(n.id, n);
				}

				const allPool = Array.from(combined.values());
				const connectedNames = new Set<string>([focused.name]);
				for (const rel of focused.relations ?? []) {
					connectedNames.add(rel.to_table);
				}
				for (const t of allPool) {
					if ((t.relations ?? []).some((r) => r.to_table === focused.name)) {
						connectedNames.add(t.name);
					}
				}
				visible = allPool.filter((t) => connectedNames.has(t.name));
			}
		}

		const visibleNames = new Map<string, ErTable>();
		for (const t of visible) {
			visibleNames.set(t.name, t);
		}

		// When focused on a single table, hide group boxes for a clean focused view.
		const canvasGroups =
			isUngrouped || focusedTableId
				? []
				: childSubGroups.length > 0
					? childSubGroups
					: currentGroup
						? [currentGroup]
						: [];

		// Compute compact tree fallback positions (no DB reads/writes needed)
		const defaultTree = computeTreePositions(visible, 16, 42);
		const groupBoxPos = new Map<string, { x: number; y: number; width: number; height: number }>();
		const tableTreePos = new Map<string, { x: number; y: number }>();

		if (canvasGroups.length > 0) {
			let cx = 0;
			for (const grp of canvasGroups) {
				const grpTables = visible.filter((t) => t.group_id === grp.id);
				const tree = computeTreePositions(grpTables, cx + 14, 42);
				groupBoxPos.set(grp.id, { x: cx, y: 0, width: tree.width, height: tree.height });
				for (const [tid, pos] of tree.positions.entries()) {
					tableTreePos.set(tid, pos);
				}
				cx += tree.width + 16;
			}
		} else {
			for (const [tid, pos] of defaultTree.positions.entries()) {
				tableTreePos.set(tid, pos);
			}
		}

		const groupNodes: Node[] = canvasGroups.map((group) => {
			const pos = groupBoxPos.get(group.id) ?? { x: 0, y: 0, width: 320, height: 180 };
			const noteCount = erStore.notes.filter(
				(n) => n.target_type === 'group' && n.target_id === group.id
			).length;

			return {
				id: group.id,
				type: 'erGroup',
				position: { x: pos.x, y: pos.y },
				width: pos.width,
				height: pos.height,
				draggable: false,
				zIndex: -1,
				data: {
					group,
					tableCount: erStore.groupCounts[group.id] ?? 0,
					noteCount
				}
			};
		});

		const tableNodes: Node[] = visible.map((table) => {
			const noteCount = erStore.notes.filter(
				(n) => n.target_type === 'table' && n.target_id === table.id
			).length;

			const cached = erStore.getCachedPosition(viewCacheKey, table.id);
			const pos = cached ?? tableTreePos.get(table.id) ?? { x: 0, y: 0 };

			return {
				id: table.id,
				type: 'erTable',
				position: { x: pos.x, y: pos.y },
				data: {
					table,
					noteCount,
					isExternal: !inGroupIds.has(table.id),
					onEdit: (t: ErTable) => {
						selectedNoteTarget = null;
						editingTable = t;
						showTableDrawer = true;
					},
					onNote: (t: ErTable) => {
						showTableDrawer = false;
						editingTable = null;
						selectedNoteTarget = { type: 'table', id: t.id, label: t.name };
					},
					onFocus: (t: ErTable) => {
						if (groupAllTables.some((item) => item.id === t.id)) {
							focusedTableId = t.id;
						}
					}
				}
			};
		});

		const nextEdges: Edge[] = [];
		for (const table of visible) {
			for (const rel of table.relations ?? []) {
				const targetTable = visibleNames.get(rel.to_table);
				if (!targetTable || targetTable.id === table.id) continue;
				nextEdges.push({
					id: `${table.id}:${rel.from_column}->${targetTable.id}:${rel.to_column}`,
					source: targetTable.id,
					target: table.id,
					label: showEdgeLabels ? `${rel.from_column} → ${rel.to_column}` : undefined,
					type: 'default',
					style: 'stroke-width: 1.5px; opacity: 0.55;'
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

	async function handleNodeDragStop({ targetNode }: { targetNode: Node | null }) {
		if (!targetNode) return;
		const x = Math.round(targetNode.position.x);
		const y = Math.round(targetNode.position.y);

		if (targetNode.type === 'erStickyNote') {
			await erStore.updateNote(targetNode.id, { position: { x, y } });
		} else if (targetNode.type === 'erTable') {
			erStore.setCachedPositions(viewCacheKey, [{ id: targetNode.id, position: { x, y } }]);
		}
	}

	function handleNodeClick({ node }: { node: Node }) {
		if (node.type === 'erGroup') {
			const group = (node.data as { group?: { id: string; name: string } })?.group;
			if (group) {
				showTableDrawer = false;
				editingTable = null;
				selectedNoteTarget = { type: 'group', id: group.id, label: group.name };
			}
		}
	}

	function openNewTableDrawer() {
		selectedNoteTarget = null;
		editingTable = null;
		showTableDrawer = true;
	}

	async function handleAddStickyNote() {
		if (!diagramId) return;
		const count = erStore.notes.filter((n) => n.target_type === 'canvas').length;
		await erStore.createNote({
			diagram_id: diagramId,
			target_type: 'canvas',
			target_id: 'canvas',
			content: 'Double-click to edit study note...',
			position: { x: 100 + count * 30, y: 100 + count * 30 }
		});
	}

	function computeTreePositions(
		tables: ErTable[],
		originX: number,
		originY: number
	): { positions: Map<string, { x: number; y: number }>; width: number; height: number } {
		const byName = new Map<string, ErTable>();
		for (const t of tables) byName.set(t.name, t);

		// Parents = tables referenced by t; Children = tables referencing t
		const parentsOf = new Map<string, string[]>();
		for (const t of tables) {
			const ps: string[] = [];
			for (const rel of t.relations ?? []) {
				const p = byName.get(rel.to_table);
				if (p && p.id !== t.id && !ps.includes(p.id)) {
					ps.push(p.id);
				}
			}
			parentsOf.set(t.id, ps);
		}

		const levelOf = new Map<string, number>();
		const visiting = new Set<string>();

		function getLevel(id: string): number {
			if (levelOf.has(id)) return levelOf.get(id)!;
			if (visiting.has(id)) return 0;
			visiting.add(id);
			const ps = parentsOf.get(id) ?? [];
			let lvl = 0;
			for (const pid of ps) {
				lvl = Math.max(lvl, getLevel(pid) + 1);
			}
			visiting.delete(id);
			levelOf.set(id, lvl);
			return lvl;
		}

		for (const t of tables) getLevel(t.id);

		const columns = new Map<number, ErTable[]>();
		let maxLevel = 0;
		for (const t of tables) {
			const lvl = levelOf.get(t.id) ?? 0;
			maxLevel = Math.max(maxLevel, lvl);
			const col = columns.get(lvl) ?? [];
			col.push(t);
			columns.set(lvl, col);
		}

		const colGap = 240;
		const rowGap = 52;
		let maxRows = 1;
		const positions = new Map<string, { x: number; y: number }>();

		for (let lvl = 0; lvl <= maxLevel; lvl++) {
			const col = columns.get(lvl) ?? [];
			maxRows = Math.max(maxRows, col.length);
			col.forEach((t, rowIdx) => {
				positions.set(t.id, {
					x: originX + lvl * colGap,
					y: originY + rowIdx * rowGap
				});
			});
		}

		const width = Math.max(240, (maxLevel + 1) * colGap - 20 + 28);
		const height = Math.max(100, maxRows * rowGap + 50);
		return { positions, width, height };
	}

	function handleAutoLayout() {
		const groupsToLayout =
			isUngrouped || focusedTableId
				? []
				: childSubGroups.length > 0
					? childSubGroups
					: currentGroup
						? [currentGroup]
						: [];

		if (groupsToLayout.length === 0) {
			const visible = nodes.filter((n) => n.type === 'erTable').map((n) => (n.data as { table: ErTable }).table);
			const { positions } = computeTreePositions(visible, 16, 16);
			erStore.setCachedPositions(
				viewCacheKey,
				Array.from(positions.entries()).map(([id, position]) => ({ id, position }))
			);
			return;
		}

		let cursorX = 0;
		const toCache: Array<{ id: string; position: { x: number; y: number } }> = [];
		for (const grp of groupsToLayout) {
			const grpTables = groupAllTables.filter((t) => t.group_id === grp.id);
			const { positions, width } = computeTreePositions(grpTables, cursorX + 14, 42);
			for (const [id, position] of positions.entries()) {
				toCache.push({ id, position });
			}
			cursorX += width + 16;
		}
		erStore.setCachedPositions(viewCacheKey, toCache);
	}

	async function handleExportSql() {
		const activeKeys = isUngrouped
			? [UNGROUPED_KEY]
			: [groupIdParam, ...childSubGroups.map((c) => c.id)];
		const seen = new Set<string>();
		const tables: ErTable[] = [];
		for (const k of activeKeys) {
			for (const t of erStore.tablesByGroup[k] ?? []) {
				if (!seen.has(t.id)) {
					seen.add(t.id);
					tables.push(t);
				}
			}
		}
		const sql = exportTablesToSql(tables);
		if (!sql) return;
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			await navigator.clipboard.writeText(sql);
			exportCopied = true;
			setTimeout(() => (exportCopied = false), 2000);
		}
	}
</script>

<div class="erd-workspace">
	<header class="erd-header">
		<div class="erd-tier-1">
			<nav class="erd-breadcrumb" aria-label="Breadcrumb">
				<a href="/erd" class="erd-crumb-link">ER Study</a>
				<span class="erd-crumb-sep">/</span>
				<a href="/erd/{diagramId}" class="erd-crumb-link">
					{erStore.activeDiagram?.name ?? 'Diagram'}
				</a>
				{#if parentGroup}
					<span class="erd-crumb-sep">/</span>
					<a href="/erd/{diagramId}/groups/{parentGroup.id}" class="erd-crumb-link">
						{parentGroup.name}
					</a>
				{/if}
				<span class="erd-crumb-sep">/</span>
				<h1 class="erd-crumb-current">
					{isUngrouped ? 'Ungrouped' : (currentGroup?.name ?? 'Group')}
				</h1>
			</nav>

			<div class="erd-actions">
				<button
					type="button"
					class="erd-btn erd-btn-ghost"
					onclick={() => (showLeftPanel = !showLeftPanel)}
				>
					{showLeftPanel ? 'Hide List' : `Tables (${groupAllTables.length})`}
				</button>
				{#if !isUngrouped && !parentGroup}
					<button
						type="button"
						class="erd-btn erd-btn-secondary"
						onclick={() => (showNewGroupModal = true)}
					>
						+ Sub-Group
					</button>
				{/if}
				{#if !isUngrouped}
					<button
						type="button"
						class="erd-btn erd-btn-secondary"
						onclick={() => (showAddExistingModal = true)}
					>
						+ Add Existing
					</button>
				{/if}
				<button type="button" class="erd-btn erd-btn-primary" onclick={openNewTableDrawer}>
					+ New Table
				</button>
				<button type="button" class="erd-btn erd-btn-ghost" onclick={handleAddStickyNote}>
					+ Sticky Note
				</button>
				<button
					type="button"
					class="erd-btn erd-btn-ghost"
					onclick={() => (erStore.expandAllTables = !erStore.expandAllTables)}
				>
					{erStore.expandAllTables ? 'Collapse All' : 'Expand All'}
				</button>
				<button
					type="button"
					class="erd-btn erd-btn-ghost"
					onclick={() => (showEdgeLabels = !showEdgeLabels)}
				>
					{showEdgeLabels ? 'Hide FK Labels' : 'FK Labels'}
				</button>
				<button
					type="button"
					class="erd-btn erd-btn-ghost"
					disabled={autoLayingOut}
					onclick={handleAutoLayout}
				>
					{autoLayingOut ? 'Arranging...' : 'Auto Layout'}
				</button>
				<button type="button" class="erd-btn erd-btn-ghost" onclick={handleExportSql}>
					{exportCopied ? 'Copied SQL!' : 'Export SQL'}
				</button>
			</div>
		</div>

		{#if childSubGroups.length > 0}
			<div class="erd-subgroups-strip">
				{#each childSubGroups as sub (sub.id)}
					<a href="/erd/{diagramId}/groups/{sub.id}" class="erd-sub-card">
						<span
							class="erd-sub-dot"
							style:background={COLOR_HEX[sub.color] ?? COLOR_HEX.slate}
						></span>
						<span class="erd-sub-name">{sub.name}</span>
						<span class="erd-sub-count">{erStore.groupCounts[sub.id] ?? 0}</span>
					</a>
				{/each}
			</div>
		{/if}
	</header>

	<main class="erd-canvas-wrap">
		{#if erStore.error}
			<div class="erd-banner-error">{erStore.error}</div>
		{/if}

		<div class="erd-canvas-split">
			{#if showLeftPanel}
				<aside class="erd-left-panel" aria-label="Group Tables">
					<div class="erd-left-header">
						<input
							type="search"
							class="erd-left-search"
							placeholder="Filter tables..."
							bind:value={tableListSearch}
						/>
						{#if focusedTableId}
							<button
								type="button"
								class="erd-show-all-btn"
								onclick={() => (focusedTableId = null)}
							>
								Show All ({groupAllTables.length})
							</button>
						{/if}
					</div>
					<ul class="erd-left-list">
						{#each filteredSidebarTables as t (t.id)}
							<li>
								<button
									type="button"
									class="erd-left-item"
									class:active={focusedTableId === t.id}
									onclick={() =>
										(focusedTableId = focusedTableId === t.id ? null : t.id)}
								>
									<span class="erd-left-name">{t.name}</span>
									<span class="erd-left-count">{t.columns.length}</span>
								</button>
							</li>
						{:else}
							<li class="erd-left-empty">No tables</li>
						{/each}
					</ul>
				</aside>
			{/if}

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
				open={showTableDrawer}
				editTable={editingTable}
				onClose={() => {
					showTableDrawer = false;
					editingTable = null;
				}}
			/>
		</div>
	</main>

	<NewGroupModal
		open={showNewGroupModal}
		onClose={() => (showNewGroupModal = false)}
	/>

	<AddExistingTableModal
		open={showAddExistingModal}
		onClose={() => (showAddExistingModal = false)}
	/>
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
		gap: 8px;
		flex-shrink: 0;
		box-sizing: border-box;
	}

	.erd-tier-1 {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 32px;
		flex-wrap: wrap;
	}

	.erd-breadcrumb {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		flex-wrap: wrap;
	}

	.erd-crumb-link {
		font-size: 13px;
		color: var(--text-secondary);
		text-decoration: none;
	}

	.erd-crumb-link:hover {
		color: var(--text-primary);
	}

	.erd-crumb-sep {
		color: var(--text-secondary);
		font-size: 13px;
	}

	.erd-crumb-current {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
	}

	.erd-actions {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.erd-subgroups-strip {
		display: flex;
		align-items: center;
		gap: 8px;
		overflow-x: auto;
		padding-bottom: 2px;
	}

	.erd-sub-card {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 10px;
		border-radius: 6px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		text-decoration: none;
		color: var(--text-primary);
		font-size: 12px;
		white-space: nowrap;
	}

	.erd-sub-card:hover {
		border-color: var(--primary);
	}

	.erd-sub-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.erd-sub-name {
		font-weight: 500;
	}

	.erd-sub-count {
		font-size: 10px;
		font-weight: 600;
		padding: 0 5px;
		border-radius: 4px;
		background: var(--bg-tertiary);
		color: var(--text-secondary);
	}

	.erd-btn {
		height: 28px;
		padding: 0 10px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid var(--border-subtle);
		white-space: nowrap;
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

	.erd-left-panel {
		width: 230px;
		flex-shrink: 0;
		height: 100%;
		background: var(--bg-secondary);
		border-right: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.erd-left-header {
		padding: 8px;
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.erd-left-search {
		width: 100%;
		height: 28px;
		padding: 0 8px;
		border-radius: 5px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 12px;
		box-sizing: border-box;
	}

	.erd-show-all-btn {
		height: 26px;
		padding: 0 8px;
		border-radius: 5px;
		background: var(--primary);
		border: 1px solid var(--primary);
		color: var(--primary-foreground);
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
	}

	.erd-left-list {
		list-style: none;
		margin: 0;
		padding: 4px;
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.erd-left-item {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		padding: 6px 8px;
		border-radius: 5px;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font-size: 12px;
		text-align: left;
		cursor: pointer;
	}

	.erd-left-item:hover {
		background: var(--bg-tertiary);
	}

	.erd-left-item.active {
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.erd-left-name {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 11px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.erd-left-count {
		font-size: 10px;
		opacity: 0.75;
		flex-shrink: 0;
	}

	.erd-left-empty {
		padding: 16px 8px;
		text-align: center;
		font-size: 12px;
		color: var(--text-secondary);
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
</style>
