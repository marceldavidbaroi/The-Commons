<script lang="ts">
  import type { TaskStatus, TaskPriority } from '$lib/types/tasks';
  import TaskMetaFields from './TaskMetaFields.svelte';
  import RichTextEditor from './RichTextEditor.svelte';

  interface Props {
    title: string;
    descriptionHtml: string;
    status: TaskStatus;
    priority: TaskPriority;
    listId: string;
    excludeTaskId?: string;
    isEditing?: boolean;
    onSave: (payload: { title: string; descriptionHtml: string; status: TaskStatus; priority: TaskPriority }) => Promise<void>;
    onCancel: () => void;
  }

  let {
    title = $bindable(),
    descriptionHtml = $bindable(),
    status = $bindable(),
    priority = $bindable(),
    listId,
    excludeTaskId,
    isEditing = false,
    onSave,
    onCancel
  }: Props = $props();

  let isSubmitting = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    isSubmitting = true;
    try {
      await onSave({
        title: title.trim(),
        descriptionHtml,
        status,
        priority
      });
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  <div>
    <input
      type="text"
      placeholder="Task title..."
      bind:value={title}
      required
      autofocus
      class="w-full text-lg font-semibold border-b border-slate-200 dark:border-slate-800 bg-transparent pb-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-primary"
    />
  </div>

  <TaskMetaFields
    {status}
    {priority}
    onStatusChange={(s) => (status = s)}
    onPriorityChange={(p) => (priority = p)}
  />

  <div>
    <label class="block text-xs font-medium text-slate-500 mb-1">Description</label>
    <RichTextEditor
      contentHtml={descriptionHtml}
      {listId}
      {excludeTaskId}
      onChange={(html) => (descriptionHtml = html)}
    />
  </div>

  <div class="flex items-center justify-end gap-2 pt-4">
    <button
      type="button"
      onclick={onCancel}
      disabled={isSubmitting}
      class="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={!title.trim() || isSubmitting}
      class="px-4 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 rounded shadow-sm transition-colors"
    >
      {isSubmitting ? 'Saving...' : isEditing ? 'Save changes' : 'Create task'}
    </button>
  </div>
</form>
