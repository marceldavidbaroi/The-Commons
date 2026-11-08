<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import type { TaskRecord, TaskStatus, TaskPriority } from "$lib/types/tasks";
  import TaskForm from "$lib/components/tasks/editor/TaskForm.svelte";
  import * as tasksService from "$lib/services/tasks-service";

  const listId = $derived(page.params.id as string);
  const taskId = $derived(page.params.taskId as string);

  let task = $state<TaskRecord | null>(null);
  let title = $state("");
  let descriptionHtml = $state("");
  let status = $state<TaskStatus>("todo");
  let priority = $state<TaskPriority>("none");
  let isLoading = $state(true);

  onMount(async () => {
    isLoading = true;
    try {
      const data = await tasksService.fetchTaskById(taskId);
      if (data) {
        task = data;
        title = data.title;
        descriptionHtml = data.description_html;
        status = data.status;
        priority = data.priority;
      }
    } finally {
      isLoading = false;
    }
  });

  async function handleSave(payload: {
    title: string;
    descriptionHtml: string;
    status: TaskStatus;
    priority: TaskPriority;
  }) {
    await tasksService.updateTask(taskId, {
      title: payload.title,
      description_html: payload.descriptionHtml,
      status: payload.status,
      priority: payload.priority,
    });

    goto(`/tasks/lists/${listId}/tasks/${taskId}`);
  }

  function handleCancel() {
    goto(`/tasks/lists/${listId}/tasks/${taskId}`);
  }
</script>

<div class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
  <div class="mb-6 flex items-center gap-2">
    <a
      href={`/tasks/lists/${listId}/tasks/${taskId}`}
      class="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
    >
      ← Back to preview
    </a>
  </div>

  <div
    class="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
  >
    <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100 mb-6">
      Edit task
    </h2>

    {#if isLoading}
      <div class="py-8 text-center text-xs text-slate-500">Loading task...</div>
    {:else if task}
      <TaskForm
        bind:title
        bind:descriptionHtml
        bind:status
        bind:priority
        {listId}
        excludeTaskId={taskId}
        isEditing={true}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    {:else}
      <div class="py-8 text-center text-xs text-slate-500">Task not found.</div>
    {/if}
  </div>
</div>
