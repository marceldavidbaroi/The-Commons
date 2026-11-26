import * as erService from '$lib/services/er-service';
import type {
	CreateErDiagramPayload,
	CreateErGroupPayload,
	CreateErNotePayload,
	CreateErTablePayload,
	ErCursor,
	ErDiagram,
	ErGroup,
	ErNote,
	ErPosition,
	ErTable,
	UpdateErDiagramPayload,
	UpdateErGroupPayload,
	UpdateErNotePayload,
	UpdateErTablePayload
} from '$lib/types/er';

export const UNGROUPED_KEY = 'ungrouped';

function toGroupKey(groupId: string | null): string {
	return groupId ?? UNGROUPED_KEY;
}

function fromGroupKey(key: string): string | null {
	return key === UNGROUPED_KEY ? null : key;
}

class ErStore {
	diagrams = $state<ErDiagram[]>([]);
	diagramsHasMore = $state(false);
	diagramsCursor = $state<ErCursor | null>(null);
	diagramsLoaded = $state(false);

	activeDiagramId = $state<string | null>(null);
	groups = $state<ErGroup[]>([]);
	groupCounts = $state<Record<string, number>>({});
	tablesByGroup = $state<Record<string, ErTable[]>>({});
	tableHasMoreByGroup = $state<Record<string, boolean>>({});
	tableCursorByGroup = $state<Record<string, ErCursor | null>>({});
	loadedGroupKeys = $state<Record<string, boolean>>({});
	notes = $state<ErNote[]>([]);

	activeGroupKey = $state<string>(UNGROUPED_KEY);
	isolateMode = $state(true);
	expandAllTables = $state(false);
	groupsLoadedForDiagram = $state(false);
	layoutCache = $state<Record<string, ErPosition>>({});
	neighborsByTableId = $state<Record<string, ErTable[]>>({});

	constructor() {
		if (typeof sessionStorage !== 'undefined') {
			try {
				const raw = sessionStorage.getItem('er_canvas_layout_v1');
				if (raw) this.layoutCache = JSON.parse(raw);
			} catch {
				// ignore storage errors
			}
		}
	}

	private persistLayoutCache(): void {
		if (typeof sessionStorage !== 'undefined') {
			try {
				sessionStorage.setItem('er_canvas_layout_v1', JSON.stringify(this.layoutCache));
			} catch {
				// ignore storage errors
			}
		}
	}

	getCachedPosition(viewKey: string, nodeId: string): ErPosition | null {
		return this.layoutCache[`${viewKey}:${nodeId}`] ?? null;
	}

	setCachedPositions(viewKey: string, positions: Array<{ id: string; position: ErPosition }>): void {
		const next = { ...this.layoutCache };
		for (const item of positions) {
			next[`${viewKey}:${item.id}`] = item.position;
		}
		this.layoutCache = next;
		this.persistLayoutCache();
	}

	loadingDiagrams = $state(false);
	loadingGroups = $state(false);
	loadingTables = $state(false);
	error = $state<string | null>(null);

	activeDiagram = $derived(
		this.activeDiagramId
			? (this.diagrams.find((d) => d.id === this.activeDiagramId) ?? null)
			: null
	);

	activeTables = $derived(this.tablesByGroup[this.activeGroupKey] ?? []);

	activeGroupHasMore = $derived(this.tableHasMoreByGroup[this.activeGroupKey] ?? false);

	visibleTables = $derived.by(() => {
		if (this.isolateMode) {
			return this.tablesByGroup[this.activeGroupKey] ?? [];
		}
		return Object.values(this.tablesByGroup).flat();
	});

	private adjustGroupCount(key: string, delta: number): void {
		const next = (this.groupCounts[key] ?? 0) + delta;
		this.groupCounts = {
			...this.groupCounts,
			[key]: Math.max(0, next)
		};
	}

	async loadDiagrams(): Promise<void> {
		if (this.diagramsLoaded) return;
		this.loadingDiagrams = true;
		this.error = null;
		try {
			const page = await erService.fetchDiagrams(null);
			this.diagrams = page.items;
			this.diagramsHasMore = page.hasMore;
			this.diagramsCursor = page.nextCursor;
			this.diagramsLoaded = true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load diagrams';
		} finally {
			this.loadingDiagrams = false;
		}
	}

	async loadMoreDiagrams(): Promise<void> {
		if (!this.diagramsHasMore || !this.diagramsCursor || this.loadingDiagrams) return;
		this.loadingDiagrams = true;
		try {
			const page = await erService.fetchDiagrams(this.diagramsCursor);
			this.diagrams = [...this.diagrams, ...page.items];
			this.diagramsHasMore = page.hasMore;
			this.diagramsCursor = page.nextCursor;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load more diagrams';
		} finally {
			this.loadingDiagrams = false;
		}
	}

	async selectDiagram(diagramId: string): Promise<void> {
		if (this.activeDiagramId === diagramId && this.groupsLoadedForDiagram) {
			return;
		}
		this.activeDiagramId = diagramId;
		this.groups = [];
		this.groupCounts = {};
		this.tablesByGroup = {};
		this.tableHasMoreByGroup = {};
		this.tableCursorByGroup = {};
		this.loadedGroupKeys = {};
		this.notes = [];
		this.loadingGroups = true;
		this.error = null;

		try {
			const overview = await erService.fetchDiagramOverview(diagramId);

			if (overview.diagram && !this.diagrams.some((d) => d.id === overview.diagram!.id)) {
				this.diagrams = [overview.diagram, ...this.diagrams];
			}

			this.groups = overview.groups;
			this.notes = overview.notes;

			const countMap: Record<string, number> = {};
			for (const row of overview.counts) {
				countMap[toGroupKey(row.group_id)] = row.table_count;
			}
			this.groupCounts = countMap;
			this.groupsLoadedForDiagram = true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load diagram groups';
		} finally {
			this.loadingGroups = false;
		}
	}

	async loadGroupBundle(diagramId: string, groupIdOrKey: string | null): Promise<void> {
		if (this.activeDiagramId !== diagramId || !this.groupsLoadedForDiagram) {
			await this.selectDiagram(diagramId);
		}

		const key = groupIdOrKey ?? UNGROUPED_KEY;
		this.activeGroupKey = key;

		const childIds =
			key === UNGROUPED_KEY
				? []
				: this.groups.filter((g) => g.parent_id === key).map((g) => g.id);
		const requiredKeys = [key, ...childIds];

		if (requiredKeys.every((k) => this.loadedGroupKeys[k])) {
			return;
		}

		this.loadingTables = true;
		this.error = null;
		try {
			const tables = await erService.fetchGroupBundle(diagramId, fromGroupKey(key));
			const grouped: Record<string, ErTable[]> = {};
			for (const rk of requiredKeys) {
				grouped[rk] = [];
			}
			for (const t of tables) {
				const tKey = toGroupKey(t.group_id);
				if (!grouped[tKey]) grouped[tKey] = [];
				grouped[tKey].push(t);
			}

			const nextTablesByGroup = { ...this.tablesByGroup };
			const nextLoaded = { ...this.loadedGroupKeys };
			for (const rk of requiredKeys) {
				nextTablesByGroup[rk] = grouped[rk] ?? [];
				nextLoaded[rk] = true;
			}
			this.tablesByGroup = nextTablesByGroup;
			this.loadedGroupKeys = nextLoaded;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load group tables';
		} finally {
			this.loadingTables = false;
		}
	}

	async loadTableNeighbors(diagramId: string, tableId: string): Promise<void> {
		if (this.neighborsByTableId[tableId]) return;
		try {
			const neighbors = await erService.fetchTableNeighbors(diagramId, tableId);
			this.neighborsByTableId = {
				...this.neighborsByTableId,
				[tableId]: neighbors
			};
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load connected FK tables';
		}
	}

	async selectGroup(groupIdOrKey: string | null): Promise<void> {
		const key = groupIdOrKey ?? UNGROUPED_KEY;
		this.activeGroupKey = key;
		await this.ensureGroupLoaded(key);
	}

	async ensureGroupLoaded(groupIdOrKey: string | null): Promise<void> {
		const key = groupIdOrKey ?? UNGROUPED_KEY;
		if (!this.activeDiagramId || this.loadedGroupKeys[key]) {
			return;
		}

		this.loadingTables = true;
		this.error = null;
		try {
			const page = await erService.fetchTablesByGroup(
				this.activeDiagramId,
				fromGroupKey(key),
				null
			);
			this.tablesByGroup = { ...this.tablesByGroup, [key]: page.items };
			this.tableHasMoreByGroup = { ...this.tableHasMoreByGroup, [key]: page.hasMore };
			this.tableCursorByGroup = { ...this.tableCursorByGroup, [key]: page.nextCursor };
			this.loadedGroupKeys = { ...this.loadedGroupKeys, [key]: true };
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load tables';
		} finally {
			this.loadingTables = false;
		}
	}

	async loadMoreTablesForActiveGroup(): Promise<void> {
		const key = this.activeGroupKey;
		const cursor = this.tableCursorByGroup[key];
		if (!this.activeDiagramId || !this.tableHasMoreByGroup[key] || !cursor || this.loadingTables) {
			return;
		}

		this.loadingTables = true;
		try {
			const page = await erService.fetchTablesByGroup(
				this.activeDiagramId,
				fromGroupKey(key),
				cursor
			);
			const existing = this.tablesByGroup[key] ?? [];
			this.tablesByGroup = { ...this.tablesByGroup, [key]: [...existing, ...page.items] };
			this.tableHasMoreByGroup = { ...this.tableHasMoreByGroup, [key]: page.hasMore };
			this.tableCursorByGroup = { ...this.tableCursorByGroup, [key]: page.nextCursor };
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load more tables';
		} finally {
			this.loadingTables = false;
		}
	}

	// --- Diagram CUD (Zero-Refetch) ---

	async createDiagram(payload: CreateErDiagramPayload): Promise<ErDiagram> {
		const created = await erService.createDiagram(payload);
		this.diagrams = [created, ...this.diagrams];
		return created;
	}

	async updateDiagram(id: string, payload: UpdateErDiagramPayload): Promise<ErDiagram> {
		const updated = await erService.updateDiagram(id, payload);
		this.diagrams = this.diagrams.map((d) => (d.id === id ? updated : d));
		return updated;
	}

	async deleteDiagram(id: string): Promise<void> {
		await erService.deleteDiagram(id);
		this.diagrams = this.diagrams.filter((d) => d.id !== id);
		if (this.activeDiagramId === id) {
			this.activeDiagramId = null;
			this.activeGroupKey = UNGROUPED_KEY;
			this.groupsLoadedForDiagram = false;
			this.groups = [];
			this.groupCounts = {};
			this.tablesByGroup = {};
			this.tableHasMoreByGroup = {};
			this.tableCursorByGroup = {};
			this.loadedGroupKeys = {};
			this.notes = [];
		}
	}

	// --- Group CUD (Zero-Refetch) ---

	async createGroup(payload: CreateErGroupPayload): Promise<ErGroup> {
		const created = await erService.createGroup(payload);
		this.groups = [created, ...this.groups];
		this.groupCounts = { ...this.groupCounts, [created.id]: 0 };
		this.loadedGroupKeys = { ...this.loadedGroupKeys, [created.id]: true };
		this.tablesByGroup = { ...this.tablesByGroup, [created.id]: [] };
		return created;
	}

	async updateGroup(id: string, payload: UpdateErGroupPayload): Promise<ErGroup> {
		const updated = await erService.updateGroup(id, payload);
		this.groups = this.groups.map((g) => (g.id === id ? updated : g));
		return updated;
	}

	async deleteGroup(id: string): Promise<void> {
		await erService.deleteGroup(id);
		const removedIds = new Set<string>([id]);
		for (const g of this.groups) {
			if (g.parent_id === id) removedIds.add(g.id);
		}
		this.groups = this.groups.filter((g) => !removedIds.has(g.id));

		const nextTablesByGroup = { ...this.tablesByGroup };
		const nextCounts = { ...this.groupCounts };
		const nextLoaded = { ...this.loadedGroupKeys };

		for (const rid of removedIds) {
			delete nextTablesByGroup[rid];
			delete nextCounts[rid];
			delete nextLoaded[rid];
		}
		delete nextLoaded[UNGROUPED_KEY];

		this.tablesByGroup = nextTablesByGroup;
		this.groupCounts = nextCounts;
		this.loadedGroupKeys = nextLoaded;

		if (removedIds.has(this.activeGroupKey)) {
			this.activeGroupKey = UNGROUPED_KEY;
		}
	}

	// --- Table CUD (Zero-Refetch) ---

	async createTable(payload: CreateErTablePayload): Promise<ErTable> {
		const created = await erService.createTable(payload);
		const key = toGroupKey(created.group_id);
		this.tablesByGroup = {
			...this.tablesByGroup,
			[key]: [created, ...(this.tablesByGroup[key] ?? [])]
		};
		this.adjustGroupCount(key, 1);
		return created;
	}

	async createTablesBulk(payloads: CreateErTablePayload[]): Promise<ErTable[]> {
		const createdList = await erService.createTablesBulk(payloads);
		if (createdList.length === 0) return [];

		const nextTablesByGroup = { ...this.tablesByGroup };
		const nextCounts = { ...this.groupCounts };

		for (const table of createdList) {
			const key = toGroupKey(table.group_id);
			nextTablesByGroup[key] = [table, ...(nextTablesByGroup[key] ?? [])];
			nextCounts[key] = (nextCounts[key] ?? 0) + 1;
		}

		this.tablesByGroup = nextTablesByGroup;
		this.groupCounts = nextCounts;
		return createdList;
	}

	async updateTable(
		id: string,
		payload: UpdateErTablePayload,
		previousGroupId?: string | null
	): Promise<ErTable> {
		const resolvedOldKey =
			previousGroupId !== undefined
				? toGroupKey(previousGroupId)
				: (Object.keys(this.tablesByGroup).find((k) =>
						this.tablesByGroup[k]?.some((t) => t.id === id)
					) ?? UNGROUPED_KEY);
		const resolvedPrevId = resolvedOldKey === UNGROUPED_KEY ? null : resolvedOldKey;
		const updated = await erService.updateTable(id, payload, resolvedPrevId);
		const oldKey = resolvedOldKey;
		const newKey = toGroupKey(updated.group_id);

		if (oldKey === newKey) {
			this.tablesByGroup = {
				...this.tablesByGroup,
				[newKey]: (this.tablesByGroup[newKey] ?? []).map((t) => (t.id === id ? updated : t))
			};
		} else {
			this.tablesByGroup = {
				...this.tablesByGroup,
				[oldKey]: (this.tablesByGroup[oldKey] ?? []).filter((t) => t.id !== id),
				[newKey]: [updated, ...(this.tablesByGroup[newKey] ?? [])]
			};
			this.adjustGroupCount(oldKey, -1);
			this.adjustGroupCount(newKey, 1);
		}

		return updated;
	}

	async addTableToGroup(tableId: string, groupId: string, position?: ErPosition): Promise<void> {
		if (!this.activeDiagramId) return;
		const existing = this.tablesByGroup[groupId] ?? [];
		if (existing.some((t) => t.id === tableId)) return;

		const group = this.groups.find((g) => g.id === groupId);
		const pos = position ?? {
			x: (group?.position?.x ?? 0) + 24 + (existing.length % 3) * 320,
			y: (group?.position?.y ?? 0) + 48 + Math.floor(existing.length / 3) * 260
		};

		const linked = await erService.addTableToGroup(this.activeDiagramId, tableId, groupId, pos);
		this.tablesByGroup = {
			...this.tablesByGroup,
			[groupId]: [linked, ...existing]
		};
		this.adjustGroupCount(groupId, 1);

		// If it was in ungrouped, remove it from ungrouped cache & count
		const ungrouped = this.tablesByGroup[UNGROUPED_KEY] ?? [];
		if (ungrouped.some((t) => t.id === tableId)) {
			this.tablesByGroup = {
				...this.tablesByGroup,
				[UNGROUPED_KEY]: ungrouped.filter((t) => t.id !== tableId)
			};
			this.adjustGroupCount(UNGROUPED_KEY, -1);
		}
	}

	async addTableByNameToGroup(tableName: string, groupId: string): Promise<ErTable | null> {
		if (!this.activeDiagramId) return null;
		const existing = this.tablesByGroup[groupId] ?? [];
		const already = existing.find((t) => t.name === tableName);
		if (already) return already;

		const group = this.groups.find((g) => g.id === groupId);
		const pos: ErPosition = {
			x: (group?.position?.x ?? 0) + 24 + (existing.length % 3) * 320,
			y: (group?.position?.y ?? 0) + 48 + Math.floor(existing.length / 3) * 260
		};

		const linked = await erService.addTableByNameToGroup(
			this.activeDiagramId,
			tableName,
			groupId,
			pos
		);
		if (!linked) return null;

		this.tablesByGroup = {
			...this.tablesByGroup,
			[groupId]: [linked, ...existing]
		};
		this.adjustGroupCount(groupId, 1);

		const ungrouped = this.tablesByGroup[UNGROUPED_KEY] ?? [];
		if (ungrouped.some((t) => t.id === linked.id)) {
			this.tablesByGroup = {
				...this.tablesByGroup,
				[UNGROUPED_KEY]: ungrouped.filter((t) => t.id !== linked.id)
			};
			this.adjustGroupCount(UNGROUPED_KEY, -1);
		}
		return linked;
	}

	async removeTableFromGroup(tableId: string, groupId: string): Promise<void> {
		await erService.removeTableFromGroup(tableId, groupId);
		this.tablesByGroup = {
			...this.tablesByGroup,
			[groupId]: (this.tablesByGroup[groupId] ?? []).filter((t) => t.id !== tableId)
		};
		this.adjustGroupCount(groupId, -1);
	}

	async updateTablePositionInGroup(
		tableId: string,
		groupId: string | null,
		position: ErPosition
	): Promise<void> {
		if (groupId === null) {
			await this.updateTable(tableId, { position }, null);
			return;
		}
		await erService.updateTablePositionInGroup(tableId, groupId, position);
		this.tablesByGroup = {
			...this.tablesByGroup,
			[groupId]: (this.tablesByGroup[groupId] ?? []).map((t) =>
				t.id === tableId ? { ...t, position } : t
			)
		};
	}

	async deleteTable(id: string, groupId: string | null): Promise<void> {
		await erService.deleteTable(id);
		const key = toGroupKey(groupId);
		this.tablesByGroup = {
			...this.tablesByGroup,
			[key]: (this.tablesByGroup[key] ?? []).filter((t) => t.id !== id)
		};
		this.adjustGroupCount(key, -1);
	}

	// --- Notes CUD (Zero-Refetch) ---

	async createNote(payload: CreateErNotePayload): Promise<ErNote> {
		const created = await erService.createNote(payload);
		this.notes = [created, ...this.notes];
		return created;
	}

	async updateNote(id: string, payload: UpdateErNotePayload): Promise<ErNote> {
		const updated = await erService.updateNote(id, payload);
		this.notes = this.notes.map((n) => (n.id === id ? updated : n));
		return updated;
	}

	async deleteNote(id: string): Promise<void> {
		await erService.deleteNote(id);
		this.notes = this.notes.filter((n) => n.id !== id);
	}
}

export const erStore = new ErStore();
