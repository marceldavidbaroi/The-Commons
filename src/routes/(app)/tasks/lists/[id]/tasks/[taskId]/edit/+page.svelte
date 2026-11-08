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

<svelte:head>
  <title>Edit {title || "Task"} — The Commons</title>
</svelte:head>

<div class="tasks-container" style="max-width: 800px;">
  <div style="margin-bottom: 0.5rem;">
    <a
      href={`/tasks/lists/${listId}/tasks/${taskId}`}
      class="tasks-btn tasks-btn-ghost"
      style="padding: 0; font-size: 0.75rem;"
    >
      ← Back to preview
    </a>
  </div>

  <div class="tasks-card" style="padding: 1.5rem;">
    <h2 class="tasks-title" style="font-size: 1.25rem; margin-bottom: 1.5rem;">
      Edit task
    </h2>

    {#if isLoading}
      <div class="tasks-empty"><p>Loading task...</p></div>
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
      <div class="tasks-empty"><p>Task not found.</p></div>
    {/if}
  </div>
</div>
