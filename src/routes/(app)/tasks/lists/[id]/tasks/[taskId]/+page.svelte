<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import type {
    TaskRecord,
    TaskBacklink,
    TaskStatus,
    TaskPriority,
  } from "$lib/types/tasks";
  import TaskPreviewHeader from "$lib/components/tasks/preview/TaskPreviewHeader.svelte";
  import TaskDescriptionRender from "$lib/components/tasks/preview/TaskDescriptionRender.svelte";
  import BacklinksPanel from "$lib/components/tasks/preview/BacklinksPanel.svelte";
  import * as tasksService from "$lib/services/tasks-service";

  const listId = $derived(page.params.id as string);
  const taskId = $derived(page.params.taskId as string);

  let task = $state<TaskRecord | null>(null);
  let backlinks = $state<TaskBacklink[]>([]);
  let isLoading = $state(true);

  async function loadData() {
    isLoading = true;
    try {
      const data = await tasksService.fetchTaskById(taskId);
      task = data;
      if (data) {
        backlinks = await tasksService.fetchBacklinks(taskId);
      }
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    loadData();
  });

  async function handleStatusChange(status: TaskStatus) {
    if (!task) return;
    task.status = status;
    await tasksService.updateTaskStatus(taskId, status);
  }

  async function handlePriorityChange(priority: TaskPriority) {
    if (!task) return;
    task.priority = priority;
    await tasksService.updateTaskPriority(taskId, priority);
  }

  async function handleTrash() {
    await tasksService.trashTask(taskId);
    goto(`/tasks/lists/${listId}`);
  }
</script>

<svelte:head>
  <title>{task?.title ?? "Task"} — The Commons</title>
</svelte:head>

<div class="tasks-container" style="max-width: 800px;">
  {#if isLoading}
    <div class="tasks-empty"><p>Loading task...</p></div>
  {:else if task}
    <div
      class="tasks-card"
      style="padding: 1.5rem; gap: 1.25rem;"
    >
      <TaskPreviewHeader
        {task}
        {listId}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        onTrash={handleTrash}
      />

      <TaskDescriptionRender html={task.description_html} />

      <BacklinksPanel {backlinks} />
    </div>
  {:else}
    <div class="tasks-empty"><p>Task not found.</p></div>
  {/if}
</div>
