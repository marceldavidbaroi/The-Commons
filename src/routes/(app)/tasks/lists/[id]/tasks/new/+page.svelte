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

<div class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
  <div class="mb-6 flex items-center gap-2">
    <a
      href={`/tasks/lists/${listId}`}
      class="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
    >
      ← Back to list
    </a>
  </div>

  <div
    class="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
  >
    <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100 mb-6">
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
