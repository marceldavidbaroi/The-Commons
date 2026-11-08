import type {
  ListRecord,
  TaskRecord,
  TaskSortMode,
  TaskStatus,
  TaskPriority
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

  // Selection for bulk actions
  let selectedTaskIds = $state<number[]>([]);

  // Actions
  async function loadLists() {
    isLoading = true;
    try {
      lists = await tasksService.fetchLists();
    } finally {
      isLoading = false;
    }
  }

  async function addList(name: string): Promise<ListRecord> {
    const newList = await tasksService.createList(name);
    lists = [newList, ...lists];
    return newList;
  }

  async function removeListBundle(id: number | string) {
    const numId = Number(id);
    await tasksService.trashListBundle(numId);
    lists = lists.filter((l) => l.id !== numId);
  }

  async function initList(listId: number | string, initialStatus?: TaskStatus[], initialPriority?: TaskPriority[]) {
    isLoading = true;
    selectedTaskIds = [];
    statusFilters = initialStatus || [];
    priorityFilters = initialPriority || [];
    const numListId = Number(listId);
    try {
      const listData = await tasksService.fetchListById(numListId);
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
        cursor: null,
        limit: 10
      });

      tasks = res.tasks;
      nextCursor = res.nextCursor;
      totalLive = res.totalLive;
      totalFiltered = res.totalFiltered;
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
        cursor: nextCursor,
        limit: 10
      });

      tasks = [...tasks, ...res.tasks];
      nextCursor = res.nextCursor;
    } finally {
      isLoadingMore = false;
    }
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
        cursor: null,
        limit: 10
      });

      tasks = res.tasks;
      nextCursor = res.nextCursor;
      totalFiltered = res.totalFiltered;
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
        cursor: null,
        limit: 10
      });

      tasks = res.tasks;
      nextCursor = res.nextCursor;
      totalLive = res.totalLive;
      totalFiltered = res.totalFiltered;
    } finally {
      isLoading = false;
    }
  }

  // Inline status update (optimistic, row stays in place)
  async function patchTaskStatus(taskId: number | string, status: TaskStatus) {
    const numTaskId = Number(taskId);
    tasks = tasks.map((t) => (t.id === numTaskId ? { ...t, status } : t));
    await tasksService.updateTaskStatus(numTaskId, status);
  }

  // Inline priority update (optimistic, row stays in place)
  async function patchTaskPriority(taskId: number | string, priority: TaskPriority) {
    const numTaskId = Number(taskId);
    tasks = tasks.map((t) => (t.id === numTaskId ? { ...t, priority } : t));
    await tasksService.updateTaskPriority(numTaskId, priority);
  }

  // Soft delete task
  async function removeTask(taskId: number | string) {
    const numTaskId = Number(taskId);
    await tasksService.trashTask(numTaskId);
    tasks = tasks.filter((t) => t.id !== numTaskId);
    selectedTaskIds = selectedTaskIds.filter((id) => id !== numTaskId);
    totalLive = Math.max(0, totalLive - 1);
    totalFiltered = Math.max(0, totalFiltered - 1);
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
    get selectedTaskIds() { return selectedTaskIds; },
    loadLists,
    addList,
    removeListBundle,
    initList,
    loadMore,
    applyFilters,
    setSortMode,
    patchTaskStatus,
    patchTaskPriority,
    removeTask,
    bulkTrashSelected,
    toggleTaskSelection,
    toggleSelectAllLoaded,
    clearSelection,
    reorderTasksLocally
  };
}

export const tasksStore = createTasksStore();
