<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import type { TaskStatus, TaskPriority } from "$lib/types/tasks";
  import TaskForm from "$lib/components/tasks/editor/TaskForm.svelte";
  import * as tasksService from "$lib/services/tasks-service";

  const listId = $derived(page.params.id as string);

  let title = $state("");
  let descriptionHtml = $state("");
  let status = $state<TaskStatus>("todo");
  let priority = $state<TaskPriority>("none");

  async function handleSave(payload: {
    title: string;
    descriptionHtml: string;
    status: TaskStatus;
    priority: TaskPriority;
  }) {
    const created = await tasksService.createTask({
      list_id: listId,
      title: payload.title,
      description_html: payload.descriptionHtml,
      status: payload.status,
      priority: payload.priority,
    });

    goto(`/tasks/lists/${listId}/tasks/${created.id}`);
  }

  function handleCancel() {
    goto(`/tasks/lists/${listId}`);
  }
</script>

<svelte:head>
  <title>New Task — The Commons</title>
</svelte:head>

<div class="tasks-container" style="max-width: 800px;">
  <div style="margin-bottom: 0.5rem;">
    <a
      href={`/tasks/lists/${listId}`}
      class="tasks-btn tasks-btn-ghost"
      style="padding: 0; font-size: 0.75rem;"
    >
      ← Back to list
    </a>
  </div>

  <div class="tasks-card" style="padding: 1.5rem;">
    <h2 class="tasks-title" style="font-size: 1.25rem; margin-bottom: 1.5rem;">
      Create new task
    </h2>

    <TaskForm
      bind:title
      bind:descriptionHtml
      bind:status
      bind:priority
      {listId}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  </div>
</div>
