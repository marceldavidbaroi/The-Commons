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
	isolateMode = $state(false);

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
		if (this.activeDiagramId === diagramId && Object.keys(this.loadedGroupKeys).length > 0) {
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
			const [groupsPage, counts, notesPage] = await Promise.all([
				erService.fetchGroups(diagramId),
				erService.fetchGroupTableCounts(diagramId),
				erService.fetchNotes(diagramId)
			]);

			this.groups = groupsPage.items;
			this.notes = notesPage.items;

			const countMap: Record<string, number> = {};
			for (const row of counts) {
				countMap[toGroupKey(row.group_id)] = row.table_count;
			}
			this.groupCounts = countMap;

			const initialKey = this.groups[0]?.id ?? UNGROUPED_KEY;
			await this.selectGroup(initialKey);
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load diagram groups';
		} finally {
			this.loadingGroups = false;
		}
	}

	async selectGroup(groupIdOrKey: string | null): Promise<void> {
		const key = groupIdOrKey ?? UNGROUPED_KEY;
		this.activeGroupKey = key;

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
			this.groups = [];
			this.groupCounts = {};
			this.tablesByGroup = {};
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
		this.groups = this.groups.filter((g) => g.id !== id);

		const orphaned = this.tablesByGroup[id] ?? [];
		const orphanedCount = this.groupCounts[id] ?? orphaned.length;
		if (orphaned.length > 0) {
			const moved = orphaned.map((t) => ({ ...t, group_id: null }));
			this.tablesByGroup = {
				...this.tablesByGroup,
				[UNGROUPED_KEY]: [...moved, ...(this.tablesByGroup[UNGROUPED_KEY] ?? [])]
			};
		}

		const { [id]: _removedTables, ...restTables } = this.tablesByGroup;
		const { [id]: _removedCounts, ...restCounts } = this.groupCounts;
		const { [id]: _removedLoaded, ...restLoaded } = this.loadedGroupKeys;
		this.tablesByGroup = restTables;
		this.groupCounts = {
			...restCounts,
			[UNGROUPED_KEY]: (restCounts[UNGROUPED_KEY] ?? 0) + orphanedCount
		};
		this.loadedGroupKeys = restLoaded;

		if (this.activeGroupKey === id) {
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
		const updated = await erService.updateTable(id, payload);
		const oldKey =
			previousGroupId !== undefined
				? toGroupKey(previousGroupId)
				: (Object.keys(this.tablesByGroup).find((k) =>
						this.tablesByGroup[k]?.some((t) => t.id === id)
					) ?? toGroupKey(updated.group_id));
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
