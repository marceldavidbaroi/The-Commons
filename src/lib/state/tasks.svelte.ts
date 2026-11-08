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
  let selectedTaskIds = $state<string[]>([]);

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

  async function removeListBundle(id: string) {
    await tasksService.trashListBundle(id);
    lists = lists.filter((l) => l.id !== id);
  }

  async function initList(listId: string, initialStatus?: TaskStatus[], initialPriority?: TaskPriority[]) {
    isLoading = true;
    selectedTaskIds = [];
    statusFilters = initialStatus || [];
    priorityFilters = initialPriority || [];
    try {
      const listData = await tasksService.fetchListById(listId);
      currentList = listData;
      if (!listData) {
        tasks = [];
        nextCursor = null;
        totalLive = 0;
        totalFiltered = 0;
        return;
      }

      const res = await tasksService.fetchTasksPage({
        listId,
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
      totalLive = res.totalLive;
      totalFiltered = res.totalFiltered;
    } finally {
      isLoadingMore = false;
    }
  }

  async function applyFilters(newStatus: TaskStatus[], newPriority: TaskPriority[]) {
    if (!currentList) return;
    statusFilters = newStatus;
    priorityFilters = newPriority;
    selectedTaskIds = [];
    isLoading = true;

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
      totalLive = res.totalLive;
      totalFiltered = res.totalFiltered;
    } finally {
      isLoading = false;
    }
  }

  async function setSortMode(sort_mode: TaskSortMode) {
    if (!currentList) return;
    isLoading = true;
    selectedTaskIds = [];

    try {
      const updatedList = await tasksService.updateListSortMode(currentList.id, sort_mode);
      currentList = updatedList;

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
      totalLive = res.totalLive;
      totalFiltered = res.totalFiltered;
    } finally {
      isLoading = false;
    }
  }

  // Inline status update (optimistic, row stays in place)
  async function patchTaskStatus(taskId: string, status: TaskStatus) {
    // 1. Optimistic update
    tasks = tasks.map((t) => (t.id === taskId ? { ...t, status } : t));
    await tasksService.updateTaskStatus(taskId, status);
  }

  // Inline priority update (optimistic, row stays in place)
  async function patchTaskPriority(taskId: string, priority: TaskPriority) {
    // 1. Optimistic update
    tasks = tasks.map((t) => (t.id === taskId ? { ...t, priority } : t));
    await tasksService.updateTaskPriority(taskId, priority);
  }

  // Soft delete task
  async function removeTask(taskId: string) {
    await tasksService.trashTask(taskId);
    tasks = tasks.filter((t) => t.id !== taskId);
    selectedTaskIds = selectedTaskIds.filter((id) => id !== taskId);
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

  function toggleTaskSelection(taskId: string) {
    if (selectedTaskIds.includes(taskId)) {
      selectedTaskIds = selectedTaskIds.filter((id) => id !== taskId);
    } else {
      selectedTaskIds = [...selectedTaskIds, taskId];
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

