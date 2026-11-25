import type {
  ListRecord,
  TaskRecord,
  TaskSortMode,
  TaskStatus,
  TaskPriority,
  TaskScopeFilter
} from '$lib/types/tasks';
import * as tasksService from '$lib/services/tasks-service';

export function createTasksStore() {
  let lists = $state<ListRecord[]>([]);
  let currentList = $state<ListRecord | null>(null);
  let tasks = $state<TaskRecord[]>([]);
  let nextCursor = $state<string | null>(null);
  let totalLive = $state<number>(0);
  let totalFiltered = $state<number>(0);
  let isLoading = $state<boolean>(false);
  let isLoadingMore = $state<boolean>(false);

  // Filters
  let statusFilters = $state<TaskStatus[]>([]);
  let priorityFilters = $state<TaskPriority[]>([]);
  let dueTab = $state<tasksService.DueTab>('all');
  let scopeFilter = $state<TaskScopeFilter>('all');

  // Selection for bulk actions
  let selectedTaskIds = $state<number[]>([]);

  interface ListCacheEntry {
    tasks: TaskRecord[];
    nextCursor: string | null;
    totalLive: number;
    totalFiltered: number;
    statusFilters: TaskStatus[];
    priorityFilters: TaskPriority[];
    dueTab: tasksService.DueTab;
    scopeFilter: TaskScopeFilter;
  }
  const listCache = new Map<number, ListCacheEntry>();

  function getDescendantListIds(rootId: number): number[] {
    const byParent = new Map<number, number[]>();
    for (const l of lists) {
      if (l.parent_list_id !== null) {
        const children = byParent.get(l.parent_list_id) ?? [];
        children.push(l.id);
        byParent.set(l.parent_list_id, children);
      }
    }
    const result: number[] = [];
    const queue: number[] = [rootId];
    for (let i = 0; i < queue.length; i++) {
      const children = byParent.get(queue[i]);
      if (children) {
        for (const childId of children) {
          result.push(childId);
          queue.push(childId);
        }
      }
    }
    return result;
  }

  function invalidateAncestorCaches(listId: number) {
    let cur = lists.find((l) => l.id === listId);
    while (cur && cur.parent_list_id !== null) {
      listCache.delete(cur.parent_list_id);
      cur = lists.find((l) => l.id === cur!.parent_list_id);
    }
  }

  function syncCacheForCurrent() {
    if (!currentList) return;
    listCache.set(currentList.id, {
      tasks,
      nextCursor,
      totalLive,
      totalFiltered,
      statusFilters: [...statusFilters],
      priorityFilters: [...priorityFilters],
      dueTab,
      scopeFilter
    });
  }

  function sameFilterValues(
    aStatus: TaskStatus[],
    aPriority: TaskPriority[],
    aDue: tasksService.DueTab,
    aScope: TaskScopeFilter,
    bStatus: TaskStatus[],
    bPriority: TaskPriority[],
    bDue: tasksService.DueTab,
    bScope: TaskScopeFilter
  ): boolean {
    return (
      aDue === bDue &&
      aScope === bScope &&
      aStatus.length === bStatus.length &&
      aPriority.length === bPriority.length &&
      aStatus.every((s, i) => s === bStatus[i]) &&
      aPriority.every((p, i) => p === bPriority[i])
    );
  }

  // Actions
  async function loadLists() {
    isLoading = true;
    try {
      lists = await tasksService.fetchLists();
    } finally {
      isLoading = false;
    }
  }

  async function addList(name: string, parentListId: number | null = null): Promise<ListRecord> {
    const newList = await tasksService.createList(name, parentListId);
    lists = [newList, ...lists];
    return newList;
  }

  async function renameList(id: number | string, name: string): Promise<ListRecord> {
    const numId = Number(id);
    const updated = await tasksService.renameList(numId, name);
    lists = lists.map((l) => (l.id === numId ? updated : l));
    if (currentList?.id === numId) {
      currentList = updated;
    }
    return updated;
  }

  async function removeListBundle(id: number | string) {
    const numId = Number(id);
    await tasksService.trashListBundle(numId);
    const toRemove = new Set<number>([numId]);
    let added = true;
    while (added) {
      added = false;
      for (const l of lists) {
        if (l.parent_list_id !== null && toRemove.has(l.parent_list_id) && !toRemove.has(l.id)) {
          toRemove.add(l.id);
          added = true;
        }
      }
    }
    lists = lists.filter((l) => !toRemove.has(l.id));
    for (const removedId of toRemove) {
      listCache.delete(removedId);
    }
    if (currentList && toRemove.has(currentList.id)) {
      currentList = null;
    }
  }

  async function initList(listId: number | string, initialStatus?: TaskStatus[], initialPriority?: TaskPriority[]) {
    const numListId = Number(listId);
    const nextStatus = initialStatus || [];
    const nextPriority = initialPriority || [];

    if (
      currentList?.id === numListId &&
      sameFilterValues(
        statusFilters,
        priorityFilters,
        dueTab,
        scopeFilter,
        nextStatus,
        nextPriority,
        dueTab,
        scopeFilter
      )
    ) {
      selectedTaskIds = [];
      return;
    }

    selectedTaskIds = [];
    statusFilters = nextStatus;
    priorityFilters = nextPriority;
    scopeFilter = 'all';

    const cachedList = lists.find((l) => l.id === numListId) ?? null;
    if (cachedList) {
      currentList = cachedList;
    }

    const cached = listCache.get(numListId);
    if (
      cached &&
      sameFilterValues(
        cached.statusFilters,
        cached.priorityFilters,
        cached.dueTab,
        cached.scopeFilter,
        nextStatus,
        nextPriority,
        dueTab,
        scopeFilter
      )
    ) {
      tasks = cached.tasks;
      nextCursor = cached.nextCursor;
      totalLive = cached.totalLive;
      totalFiltered = cached.totalFiltered;
      isLoading = false;
      return;
    }

    isLoading = true;
    tasks = [];
    nextCursor = null;
    try {
      if (lists.length === 0) {
        lists = await tasksService.fetchLists();
      }
      const listData = lists.find((l) => l.id === numListId) ?? await tasksService.fetchListById(numListId);
      currentList = listData;
      if (!listData) {
        tasks = [];
        nextCursor = null;
        totalLive = 0;
        totalFiltered = 0;
        return;
      }

      const res = await tasksService.fetchTasksPage({
        listId: numListId,
        sortMode: listData.sort_mode,
        statusFilters,
        priorityFilters,
        scope: scopeFilter,
        subListIds: getDescendantListIds(numListId),
        cursor: null,
        limit: 10
      });

      tasks = res.tasks;
      nextCursor = res.nextCursor;
      totalLive = res.totalLive;
      totalFiltered = res.totalFiltered;
      syncCacheForCurrent();
    } finally {
      isLoading = false;
    }
  }

  async function loadMore() {
    if (!currentList || !nextCursor || isLoadingMore) return;
    isLoadingMore = true;
    try {
      const res = await tasksService.fetchTasksPage({
        listId: currentList.id,
        sortMode: currentList.sort_mode,
        statusFilters,
        priorityFilters,
        scope: scopeFilter,
        subListIds: getDescendantListIds(currentList.id),
        cursor: nextCursor,
        limit: 10
      });

      tasks = [...tasks, ...res.tasks];
      nextCursor = res.nextCursor;
      syncCacheForCurrent();
    } finally {
      isLoadingMore = false;
    }
  }

  async function setDueTab(tab: tasksService.DueTab) {
    dueTab = tab;
    await applyFilters(statusFilters, priorityFilters);
  }

  async function setScopeFilter(scope: TaskScopeFilter) {
    if (scopeFilter === scope) return;
    scopeFilter = scope;
    await applyFilters(statusFilters, priorityFilters);
  }

  async function applyFilters(newStatusFilters: TaskStatus[], newPriorityFilters: TaskPriority[]) {
    if (!currentList) return;
    isLoading = true;
    selectedTaskIds = [];
    statusFilters = newStatusFilters;
    priorityFilters = newPriorityFilters;
    try {
      const res = await tasksService.fetchTasksPage({
        listId: currentList.id,
        sortMode: currentList.sort_mode,
        statusFilters,
        priorityFilters,
        scope: scopeFilter,
        subListIds: getDescendantListIds(currentList.id),
        dueTab,
        cursor: null,
        limit: 10
      } as Parameters<typeof tasksService.fetchTasksPage>[0]);

      tasks = res.tasks;
      nextCursor = res.nextCursor;
      totalLive = res.totalLive;
      totalFiltered = res.totalFiltered;
      syncCacheForCurrent();
    } finally {
      isLoading = false;
    }
  }

  async function setSortMode(mode: TaskSortMode) {
    if (!currentList || currentList.sort_mode === mode) return;
    isLoading = true;
    selectedTaskIds = [];
    currentList.sort_mode = mode;
    await tasksService.updateListSortMode(currentList.id, mode);

    try {
      const res = await tasksService.fetchTasksPage({
        listId: currentList.id,
        sortMode: mode,
        statusFilters,
        priorityFilters,
        scope: scopeFilter,
        subListIds: getDescendantListIds(currentList.id),
        cursor: null,
        limit: 10
      });

      tasks = res.tasks;
      nextCursor = res.nextCursor;
      totalLive = res.totalLive;
      totalFiltered = res.totalFiltered;
      syncCacheForCurrent();
    } finally {
      isLoading = false;
    }
  }

  async function addTask(payload: {
    list_id: number | string;
    title: string;
    description_html?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    due_date?: string | null;
  }): Promise<TaskRecord> {
    const numListId = Number(payload.list_id);
    const isCurrentList = currentList?.id === numListId;
    const nextPos = isCurrentList
      ? tasks.reduce((max, t) => Math.max(max, t.position || 0), 0) + 1
      : undefined;

    const created = await tasksService.createTask({
      ...payload,
      position: nextPos
    });

    if (isCurrentList) {
      tasks = [...tasks, created];
      totalLive += 1;
      totalFiltered += 1;
      syncCacheForCurrent();
    } else {
      listCache.delete(numListId);
    }
    invalidateAncestorCaches(numListId);

    return created;
  }

  // Inline status update (optimistic, row stays in place)
  async function patchTaskStatus(taskId: number | string, status: TaskStatus) {
    const numTaskId = Number(taskId);
    tasks = tasks.map((t) => (t.id === numTaskId ? { ...t, status } : t));
    syncCacheForCurrent();
    await tasksService.updateTaskStatus(numTaskId, status);
  }

  // Inline priority update (optimistic, row stays in place)
  async function patchTaskPriority(taskId: number | string, priority: TaskPriority) {
    const numTaskId = Number(taskId);
    tasks = tasks.map((t) => (t.id === numTaskId ? { ...t, priority } : t));
    syncCacheForCurrent();
    await tasksService.updateTaskPriority(numTaskId, priority);
  }

  // Inline due date update (optimistic)
  async function patchTaskDueDate(taskId: number | string, dueDate: string | null) {
    const numTaskId = Number(taskId);
    tasks = tasks.map((t) => (t.id === numTaskId ? { ...t, due_date: dueDate } : t));
    syncCacheForCurrent();
    await tasksService.updateTaskDueDate(numTaskId, dueDate);
  }

  // Soft delete task
  async function removeTask(taskId: number | string) {
    const numTaskId = Number(taskId);
    await tasksService.trashTask(numTaskId);
    tasks = tasks.filter((t) => t.id !== numTaskId);
    selectedTaskIds = selectedTaskIds.filter((id) => id !== numTaskId);
    totalLive = Math.max(0, totalLive - 1);
    totalFiltered = Math.max(0, totalFiltered - 1);
    syncCacheForCurrent();
  }

  // Bulk soft delete
  async function bulkTrashSelected() {
    if (selectedTaskIds.length === 0) return;
    const toTrash = [...selectedTaskIds];
    await tasksService.bulkTrashTasks(toTrash);
    tasks = tasks.filter((t) => !toTrash.includes(t.id));
    selectedTaskIds = [];
    totalLive = Math.max(0, totalLive - toTrash.length);
    totalFiltered = Math.max(0, totalFiltered - toTrash.length);
    syncCacheForCurrent();
  }

  function toggleTaskSelection(taskId: number | string) {
    const numTaskId = Number(taskId);
    if (selectedTaskIds.includes(numTaskId)) {
      selectedTaskIds = selectedTaskIds.filter((id) => id !== numTaskId);
    } else {
      selectedTaskIds = [...selectedTaskIds, numTaskId];
    }
  }

  function toggleSelectAllLoaded() {
    if (selectedTaskIds.length === tasks.length) {
      selectedTaskIds = [];
    } else {
      selectedTaskIds = tasks.map((t) => t.id);
    }
  }

  function clearSelection() {
    selectedTaskIds = [];
  }

  function reorderTasksLocally(reordered: TaskRecord[]) {
    tasks = reordered;
    syncCacheForCurrent();
  }

  return {
    get lists() { return lists; },
    get currentList() { return currentList; },
    get tasks() { return tasks; },
    get nextCursor() { return nextCursor; },
    get totalLive() { return totalLive; },
    get totalFiltered() { return totalFiltered; },
    get isLoading() { return isLoading; },
    get isLoadingMore() { return isLoadingMore; },
    get statusFilters() { return statusFilters; },
    get priorityFilters() { return priorityFilters; },
    get dueTab() { return dueTab; },
    get scopeFilter() { return scopeFilter; },
    get selectedTaskIds() { return selectedTaskIds; },
    loadLists,
    addList,
    renameList,
    removeListBundle,
    initList,
    addTask,
    loadMore,
    applyFilters,
    setDueTab,
    setScopeFilter,
    setSortMode,
    patchTaskStatus,
    patchTaskPriority,
    patchTaskDueDate,
    removeTask,
    bulkTrashSelected,
    toggleTaskSelection,
    toggleSelectAllLoaded,
    clearSelection,
    reorderTasksLocally
  };
}

export const tasksStore = createTasksStore();
