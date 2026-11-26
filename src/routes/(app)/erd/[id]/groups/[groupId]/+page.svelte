<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
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
	let tableDrawerGroupKey = $state<string | undefined>(undefined);
	let showNewGroupModal = $state(false);
	let editingCurrentGroup = $state(false);
	let showAddExistingModal = $state(false);
	let showEdgeLabels = $state(false);
	let autoLayingOut = $state(false);
	let exportCopied = $state(false);
	let selectedNoteTarget = $state<NoteTarget | null>(null);
	let focusedTableId = $state<string | null>(null);
	let tableListSearch = $state('');
	let showLeftPanel = $state(true);
	let showDeleteGroupConfirm = $state(false);
	let deletingGroup = $state(false);

	const currentGroup = $derived(
		isUngrouped ? null : (erStore.groups.find((g) => g.id === groupIdParam) ?? null)
	);

	const parentGroup = $derived(
		currentGroup?.parent_id
			? (erStore.groups.find((g) => g.id === currentGroup.parent_id) ?? null)
			: null
	);

	const descendantSubGroups = $derived.by(() => {
		if (isUngrouped) return [] as Array<{ group: (typeof erStore.groups)[number]; depth: number }>;
		const result: Array<{ group: (typeof erStore.groups)[number]; depth: number }> = [];
		const visit = (parentId: string, depth: number) => {
			for (const g of erStore.groups) {
				if (g.parent_id === parentId) {
					result.push({ group: g, depth });
					visit(g.id, depth + 1);
				}
			}
		};
		visit(groupIdParam, 1);
		return result;
	});

	const childSubGroups = $derived(
		descendantSubGroups.filter((d) => d.depth === 1).map((d) => d.group)
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

	let collapsedSidebarGroups = $state<Record<string, boolean>>({});
	const allSidebarCollapsed = $derived(
		sidebarSections.length > 0 && sidebarSections.every((s) => !!collapsedSidebarGroups[s.key])
	);

	function toggleCollapseAllSidebar() {
		if (allSidebarCollapsed) {
			collapsedSidebarGroups = {};
			return;
		}
		const next: Record<string, boolean> = {};
		for (const s of sidebarSections) {
			next[s.key] = true;
		}
		collapsedSidebarGroups = next;
	}
	let tableMenu = $state<{
		table: ErTable;
		sectionKey: string;
		x: number;
		y: number;
	} | null>(null);
	let groupMenu = $state<{
		groupId: string;
		name: string;
		parentId: string | null;
		isTopParent: boolean;
		x: number;
		y: number;
	} | null>(null);
	let showMoveSubmenu = $state(false);
	let showGroupMoveSubmenu = $state(false);
	let renamingGroupId = $state<string | null>(null);
	let renameGroupDraft = $state('');

	function openTableMenu(event: MouseEvent, table: ErTable, sectionKey: string) {
		event.preventDefault();
		const x = Math.min(event.clientX, window.innerWidth - 210);
		const y = Math.min(event.clientY, window.innerHeight - 240);
		groupMenu = null;
		tableMenu = { table, sectionKey, x, y };
		showMoveSubmenu = false;
	}

	function openGroupMenu(
		event: MouseEvent,
		section: { key: string; name: string; parentId: string | null; isTopParent: boolean }
	) {
		if (isUngrouped && section.key === UNGROUPED_KEY) return;
		event.preventDefault();
		const x = Math.min(event.clientX, window.innerWidth - 210);
		const y = Math.min(event.clientY, window.innerHeight - 240);
		tableMenu = null;
		groupMenu = {
			groupId: section.key,
			name: section.name,
			parentId: section.parentId,
			isTopParent: section.isTopParent,
			x,
			y
		};
		showGroupMoveSubmenu = false;
	}

	function handleEditMenuTable() {
		if (!tableMenu) return;
		editingTable = tableMenu.table;
		showTableDrawer = true;
		tableMenu = null;
		showMoveSubmenu = false;
	}

	function scheduleAutoLayout() {
		requestAnimationFrame(() => {
			handleAutoLayout();
		});
	}

	async function handleMoveTableTo(destKey: string) {
		if (!tableMenu) return;
		const { table, sectionKey } = tableMenu;
		tableMenu = null;
		showMoveSubmenu = false;
		if (destKey === sectionKey) return;
		const nextGroupId = destKey === UNGROUPED_KEY ? null : destKey;
		const prevGroupId = sectionKey === UNGROUPED_KEY ? null : sectionKey;
		if (focusedTableId === table.id) focusedTableId = null;
		await erStore.updateTable(table.id, { group_id: nextGroupId }, prevGroupId);
		scheduleAutoLayout();
	}

	async function handleDeleteMenuTable() {
		if (!tableMenu) return;
		const { table, sectionKey } = tableMenu;
		tableMenu = null;
		showMoveSubmenu = false;
		const prevGroupId = sectionKey === UNGROUPED_KEY ? null : sectionKey;
		if (focusedTableId === table.id) focusedTableId = null;
		await erStore.deleteTable(table.id, prevGroupId);
		scheduleAutoLayout();
	}

	function startGroupRename() {
		if (!groupMenu) return;
		renamingGroupId = groupMenu.groupId;
		renameGroupDraft = groupMenu.name;
		groupMenu = null;
		showGroupMoveSubmenu = false;
	}

	function handleAddTableInGroup() {
		if (!groupMenu) return;
		tableDrawerGroupKey = groupMenu.groupId;
		editingTable = null;
		showTableDrawer = true;
		groupMenu = null;
		showGroupMoveSubmenu = false;
	}

	async function commitGroupRename() {
		if (!renamingGroupId) return;
		const id = renamingGroupId;
		const nextName = renameGroupDraft.trim();
		renamingGroupId = null;
		if (!nextName) return;
		const current = erStore.groups.find((g) => g.id === id);
		if (current && current.name !== nextName) {
			await erStore.updateGroup(id, { name: nextName });
		}
	}

	async function handleMoveGroupTo(destParentId: string) {
		if (!groupMenu) return;
		const { groupId, parentId } = groupMenu;
		groupMenu = null;
		showGroupMoveSubmenu = false;
		if (destParentId === groupId || destParentId === parentId) return;
		await erStore.updateGroup(groupId, { parent_id: destParentId });
		scheduleAutoLayout();
	}

	const openTableMoveTargets = $derived.by(() => {
		if (!tableMenu || isUngrouped || !currentGroup || descendantSubGroups.length === 0) return [];
		return [currentGroup, ...descendantSubGroups.map((d) => d.group)];
	});

	const openGroupMoveTargets = $derived.by(() => {
		if (!groupMenu || groupMenu.isTopParent || !currentGroup) return [];
		const blocked = new Set<string>([groupMenu.groupId]);
		let added = true;
		while (added) {
			added = false;
			for (const d of descendantSubGroups) {
				if (d.group.parent_id && blocked.has(d.group.parent_id) && !blocked.has(d.group.id)) {
					blocked.add(d.group.id);
					added = true;
				}
			}
		}
		return [currentGroup, ...descendantSubGroups.map((d) => d.group)].filter(
			(g) => !blocked.has(g.id)
		);
	});

	const sidebarSections = $derived.by(() => {
		const q = tableListSearch.trim().toLowerCase();
		const filterTables = (list: ErTable[]) => {
			const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
			return q ? sorted.filter((t) => t.name.toLowerCase().includes(q)) : sorted;
		};

		if (isUngrouped) {
			return [
				{
					key: UNGROUPED_KEY,
					name: 'Ungrouped',
					color: '#94a3b8',
					depth: 0,
					parentId: null as string | null,
					isTopParent: true,
					isSubGroup: false,
					tables: filterTables(erStore.tablesByGroup[UNGROUPED_KEY] ?? [])
				}
			];
		}

		const sections: Array<{
			key: string;
			name: string;
			color: string;
			depth: number;
			parentId: string | null;
			isTopParent: boolean;
			isSubGroup: boolean;
			tables: ErTable[];
		}> = [];

		if (currentGroup) {
			sections.push({
				key: currentGroup.id,
				name: currentGroup.name,
				color: COLOR_HEX[currentGroup.color] ?? '#94a3b8',
				depth: 0,
				parentId: currentGroup.parent_id,
				isTopParent: true,
				isSubGroup: false,
				tables: filterTables(erStore.tablesByGroup[currentGroup.id] ?? [])
			});
		}

		for (const { group: sub, depth } of descendantSubGroups) {
			sections.push({
				key: sub.id,
				name: sub.name,
				color: COLOR_HEX[sub.color] ?? '#94a3b8',
				depth,
				parentId: sub.parent_id,
				isTopParent: false,
				isSubGroup: true,
				tables: filterTables(erStore.tablesByGroup[sub.id] ?? [])
			});
		}

		return q ? sections.filter((s) => s.tables.length > 0) : sections;
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

	async function handleDeleteCurrentGroup() {
		if (isUngrouped || !currentGroup || deletingGroup) return;
		deletingGroup = true;
		const returnUrl = parentGroup
			? `/erd/${diagramId}/groups/${parentGroup.id}`
			: `/erd/${diagramId}`;
		try {
			await erStore.deleteGroup(currentGroup.id);
			showDeleteGroupConfirm = false;
			await goto(returnUrl);
		} finally {
			deletingGroup = false;
		}
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
			<div class="erd-topbar-left">
				<button
					type="button"
					class="erd-sidebar-toggle"
					class:active={showLeftPanel}
					title={showLeftPanel ? 'Hide Sidebar' : 'Show Sidebar'}
					aria-label={showLeftPanel ? 'Hide Sidebar' : 'Show Sidebar'}
					onclick={() => (showLeftPanel = !showLeftPanel)}
				>
					<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
						<rect x="2" y="2.5" width="12" height="11" rx="1.5" />
						<path d="M6 2.5v11" />
						{#if showLeftPanel}
							<rect x="2.5" y="3" width="3.5" height="10" fill="currentColor" stroke="none" opacity="0.35" />
						{/if}
					</svg>
				</button>
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
		</div>
	</header>

	<main class="erd-canvas-wrap">
		{#if erStore.error}
			<div class="erd-banner-error">{erStore.error}</div>
		{/if}

		<div class="erd-canvas-split">
			{#if showLeftPanel}
				<aside class="erd-left-panel" aria-label="Group Tables">
					<div class="erd-left-header">
						<div class="erd-left-title-row">
							<span class="erd-left-title">Explorer</span>
							<div class="erd-left-actions">
								<button
									type="button"
									class="erd-left-icon-btn"
									title="New Table"
									aria-label="New Table"
									onclick={() => {
										tableDrawerGroupKey = groupIdParam;
										editingTable = null;
										showTableDrawer = true;
									}}
								>
									<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
										<path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6z" />
										<path d="M9 2v4h4M8 8.5v3M6.5 10h3" />
									</svg>
								</button>
								{#if !isUngrouped}
									<button
										type="button"
										class="erd-left-icon-btn"
										title="New Sub-Group"
										aria-label="New Sub-Group"
										onclick={() => {
											editingCurrentGroup = false;
											showNewGroupModal = true;
										}}
									>
										<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
											<path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H6l1.3 1.5h5.2A1.5 1.5 0 0 1 14 6v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12z" />
											<path d="M8 7.5v3M6.5 9h3" />
										</svg>
									</button>
								{/if}
								<button
									type="button"
									class="erd-left-icon-btn"
									title={allSidebarCollapsed ? 'Expand All' : 'Collapse All'}
									aria-label={allSidebarCollapsed ? 'Expand All' : 'Collapse All'}
									onclick={toggleCollapseAllSidebar}
								>
									{#if allSidebarCollapsed}
										<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
											<path d="M4 5.5 8 9l4-3.5M4 9.5 8 13l4-3.5" />
										</svg>
									{:else}
										<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
											<path d="M4 10.5 8 7l4 3.5M4 6.5 8 3l4 3.5" />
										</svg>
									{/if}
								</button>
								<button
									type="button"
									class="erd-left-icon-btn"
									class:active={erStore.expandAllTables}
									title={erStore.expandAllTables ? 'Collapse All Tables' : 'Expand All Tables'}
									aria-label={erStore.expandAllTables ? 'Collapse All Tables' : 'Expand All Tables'}
									onclick={() => (erStore.expandAllTables = !erStore.expandAllTables)}
								>
									<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
										<rect x="2.5" y="2.5" width="11" height="11" rx="1.2" />
										<path d="M2.5 6h11M6.5 6v7.5" />
									</svg>
								</button>
								<button
									type="button"
									class="erd-left-icon-btn"
									title="Auto Layout"
									aria-label="Auto Layout"
									disabled={autoLayingOut}
									onclick={handleAutoLayout}
								>
									<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
										<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.8" />
										<rect x="9" y="2.5" width="4.5" height="4.5" rx="0.8" />
										<rect x="5.75" y="9" width="4.5" height="4.5" rx="0.8" />
									</svg>
								</button>
								<button
									type="button"
									class="erd-left-icon-btn"
									class:active={exportCopied}
									title={exportCopied ? 'Copied SQL!' : 'Export SQL'}
									aria-label={exportCopied ? 'Copied SQL!' : 'Export SQL'}
									onclick={handleExportSql}
								>
									<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
										<path d="M8 2.5v7.5M5 7l3 3 3-3M3 12.5h10" />
									</svg>
								</button>
							</div>
						</div>
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
					<div class="erd-left-list">
						{#if sidebarSections.every((s) => s.tables.length === 0) && sidebarSections.length <= 1}
							<div class="erd-left-empty">No tables</div>
						{:else}
							{#each sidebarSections as section (section.key)}
								{@const isCollapsed = !!collapsedSidebarGroups[section.key]}
								<div
									class="erd-left-section"
									class:is-nested={section.depth > 0}
									style:margin-left="{section.depth * 14}px"
								>
									<div class="erd-left-group-row">
										{#if renamingGroupId === section.key}
											<input
												type="text"
												class="erd-left-rename-input"
												bind:value={renameGroupDraft}
												onblur={commitGroupRename}
												onkeydown={(e) => {
													if (e.key === 'Enter') commitGroupRename();
													if (e.key === 'Escape') renamingGroupId = null;
												}}
											/>
										{:else}
											<button
												type="button"
												class="erd-left-group-btn"
												onclick={() =>
													(collapsedSidebarGroups = {
														...collapsedSidebarGroups,
														[section.key]: !isCollapsed
													})}
												oncontextmenu={(e) => openGroupMenu(e, section)}
											>
												<span class="erd-left-caret">{isCollapsed ? '▸' : '▾'}</span>
												<span class="erd-left-dot" style:background={section.color}></span>
												<span class="erd-left-group-name">{section.name}</span>
												<span class="erd-left-count">{section.tables.length}</span>
											</button>
											{#if section.isSubGroup}
												<button
													type="button"
													class="erd-left-open-btn"
													title={`Open ${section.name}`}
													onclick={() => goto(`/erd/${diagramId}/groups/${section.key}`)}
												>
													↗
												</button>
											{/if}
										{/if}
									</div>
									{#if !isCollapsed}
										<ul class="erd-left-sublist">
											{#each section.tables as t (`${section.key}:${t.id}`)}
												<li>
													<button
														type="button"
														class="erd-left-item"
														class:active={focusedTableId === t.id}
														onclick={() =>
															(focusedTableId = focusedTableId === t.id ? null : t.id)}
														oncontextmenu={(e) => openTableMenu(e, t, section.key)}
													>
														<span class="erd-left-name">{t.name}</span>
														<span class="erd-left-count">{t.columns.length}</span>
													</button>
												</li>
											{:else}
												<li class="erd-left-subempty">Empty</li>
											{/each}
										</ul>
									{/if}
								</div>
							{/each}
						{/if}
					</div>
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
				defaultGroupKey={tableDrawerGroupKey}
				onSaved={scheduleAutoLayout}
				onClose={() => {
					showTableDrawer = false;
					editingTable = null;
					tableDrawerGroupKey = undefined;
				}}
			/>
		</div>
	</main>

	<NewGroupModal
		open={showNewGroupModal}
		defaultParentId={editingCurrentGroup || isUngrouped ? null : groupIdParam}
		editGroup={editingCurrentGroup ? currentGroup : null}
		onClose={() => {
			showNewGroupModal = false;
			editingCurrentGroup = false;
		}}
	/>

	<AddExistingTableModal
		open={showAddExistingModal}
		onClose={() => (showAddExistingModal = false)}
	/>

	{#if showDeleteGroupConfirm && currentGroup}
		<div
			class="erd-modal-backdrop"
			role="presentation"
			onclick={() => !deletingGroup && (showDeleteGroupConfirm = false)}
		>
			<div
				class="erd-confirm-modal"
				role="dialog"
				aria-modal="true"
				aria-label="Delete Group"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && !deletingGroup && (showDeleteGroupConfirm = false)}
			>
				<h2>Delete {parentGroup ? 'Sub-Group' : 'Group'}</h2>
				<p>
					Delete <strong>{currentGroup.name}</strong>{childSubGroups.length > 0
						? ` and its ${childSubGroups.length} sub-group(s)`
						: ''}? Underlying tables are preserved.
				</p>
				<div class="erd-confirm-actions">
					<button
						type="button"
						class="erd-btn erd-btn-ghost"
						disabled={deletingGroup}
						onclick={() => (showDeleteGroupConfirm = false)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="erd-btn erd-btn-danger"
						disabled={deletingGroup}
						onclick={handleDeleteCurrentGroup}
					>
						{deletingGroup ? 'Deleting...' : 'Delete'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<svelte:window
	onclick={() => {
		tableMenu = null;
		groupMenu = null;
		showMoveSubmenu = false;
		showGroupMoveSubmenu = false;
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			tableMenu = null;
			groupMenu = null;
			showMoveSubmenu = false;
			showGroupMoveSubmenu = false;
		}
	}}
/>

{#if tableMenu}
	<div
		class="erd-context-menu"
		role="menu"
		tabindex="-1"
		style:left="{tableMenu.x}px"
		style:top="{tableMenu.y}px"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Escape' && (tableMenu = null)}
	>
		<div class="erd-context-title">{tableMenu.table.name}</div>
		<button
			type="button"
			class="erd-context-item"
			role="menuitem"
			onclick={handleEditMenuTable}
		>
			Edit
		</button>
		{#if openTableMoveTargets.length > 0}
			<button
				type="button"
				class="erd-context-item"
				role="menuitem"
				onclick={() => (showMoveSubmenu = !showMoveSubmenu)}
			>
				<span>Move</span>
				<span class="erd-context-arrow">{showMoveSubmenu ? '▾' : '▸'}</span>
			</button>
			{#if showMoveSubmenu}
				<div class="erd-context-sub">
					{#each openTableMoveTargets as grp (grp.id)}
						<button
							type="button"
							class="erd-context-subitem"
							disabled={tableMenu.sectionKey === grp.id}
							onclick={() => handleMoveTableTo(grp.id)}
						>
							{grp.name}
						</button>
					{/each}
				</div>
			{/if}
		{/if}
		<button
			type="button"
			class="erd-context-item erd-context-danger"
			role="menuitem"
			onclick={handleDeleteMenuTable}
		>
			Delete
		</button>
	</div>
{/if}

{#if groupMenu}
	<div
		class="erd-context-menu"
		role="menu"
		tabindex="-1"
		style:left="{groupMenu.x}px"
		style:top="{groupMenu.y}px"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Escape' && (groupMenu = null)}
	>
		<div class="erd-context-title">{groupMenu.name}</div>
		<button
			type="button"
			class="erd-context-item"
			role="menuitem"
			onclick={handleAddTableInGroup}
		>
			Add Table
		</button>
		<button
			type="button"
			class="erd-context-item"
			role="menuitem"
			onclick={startGroupRename}
		>
			Rename
		</button>
		{#if !groupMenu.isTopParent}
			<button
				type="button"
				class="erd-context-item"
				role="menuitem"
				onclick={() => (showGroupMoveSubmenu = !showGroupMoveSubmenu)}
			>
				<span>Move</span>
				<span class="erd-context-arrow">{showGroupMoveSubmenu ? '▾' : '▸'}</span>
			</button>
			{#if showGroupMoveSubmenu}
				<div class="erd-context-sub">
					{#each openGroupMoveTargets as target (target.id)}
						<button
							type="button"
							class="erd-context-subitem"
							disabled={groupMenu.parentId === target.id}
							onclick={() => handleMoveGroupTo(target.id)}
						>
							{target.name}
						</button>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
{/if}

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
		padding: 4px 10px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex-shrink: 0;
		box-sizing: border-box;
	}

	.erd-tier-1 {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		min-height: 26px;
		flex-wrap: nowrap;
	}

	.erd-topbar-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.erd-sidebar-toggle {
		width: 26px;
		height: 26px;
		padding: 0;
		border: 1px solid transparent;
		border-radius: 5px;
		background: transparent;
		color: var(--text-secondary);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.erd-sidebar-toggle:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.erd-sidebar-toggle.active {
		color: var(--text-primary);
		border-color: var(--border-subtle);
		background: var(--bg-primary);
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

	.erd-confirm-modal h2 {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
	}

	.erd-confirm-modal p {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.45;
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

	.erd-left-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 4px;
	}

	.erd-left-title {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
		padding-left: 2px;
	}

	.erd-left-actions {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.erd-left-icon-btn {
		width: 22px;
		height: 22px;
		padding: 0;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-secondary);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.erd-left-icon-btn:hover:not(:disabled) {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.erd-left-icon-btn.active {
		background: var(--bg-tertiary);
		color: var(--primary);
	}

	.erd-left-icon-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
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
		padding: 4px;
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.erd-left-section {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.erd-left-section.is-nested {
		padding-left: 6px;
		border-left: 1px solid var(--border-subtle);
	}

	.erd-left-group-row {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.erd-left-rename-input {
		flex: 1;
		min-width: 0;
		height: 24px;
		padding: 0 6px;
		border-radius: 4px;
		border: 1px solid var(--primary);
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 11px;
		font-weight: 600;
		outline: none;
	}

	.erd-left-group-btn {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 4px 6px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-secondary);
		font-size: 11px;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
	}

	.erd-left-group-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.erd-left-caret {
		font-size: 10px;
		width: 10px;
		flex-shrink: 0;
	}

	.erd-left-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.erd-left-group-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.erd-left-open-btn {
		width: 22px;
		height: 22px;
		padding: 0;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-secondary);
		font-size: 11px;
		cursor: pointer;
		flex-shrink: 0;
	}

	.erd-left-open-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.erd-left-sublist {
		list-style: none;
		margin: 0 0 0 11px;
		padding: 0 0 0 8px;
		border-left: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.erd-left-subempty {
		padding: 3px 8px;
		font-size: 11px;
		color: var(--text-secondary);
		opacity: 0.7;
	}

	.erd-context-menu {
		position: fixed;
		z-index: 60;
		width: 196px;
		padding: 4px;
		border-radius: 6px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.erd-context-title {
		padding: 4px 8px;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border-subtle);
		margin-bottom: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.erd-context-item {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 8px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-primary);
		font-size: 12px;
		text-align: left;
		cursor: pointer;
	}

	.erd-context-item:hover {
		background: var(--bg-tertiary);
	}

	.erd-context-danger {
		color: #f87171;
	}

	.erd-context-danger:hover {
		background: rgba(239, 68, 68, 0.14);
	}

	.erd-context-arrow {
		font-size: 10px;
		color: var(--text-secondary);
	}

	.erd-context-sub {
		max-height: 180px;
		overflow-y: auto;
		padding: 2px 0 2px 8px;
		border-left: 1px solid var(--border-subtle);
		margin-left: 6px;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.erd-context-subitem {
		width: 100%;
		padding: 4px 8px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-primary);
		font-size: 11px;
		text-align: left;
		cursor: pointer;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.erd-context-subitem:hover:not(:disabled) {
		background: var(--bg-tertiary);
	}

	.erd-context-subitem:disabled {
		opacity: 0.4;
		cursor: default;
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
