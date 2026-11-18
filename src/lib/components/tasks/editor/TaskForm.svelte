<script lang="ts">
  import type { TaskStatus, TaskPriority } from '$lib/types/tasks';
  import TaskMetaFields from './TaskMetaFields.svelte';
  import RichTextEditor from './RichTextEditor.svelte';
  import DatePicker from '$lib/components/DatePicker.svelte';

  interface Props {
    title: string;
    descriptionHtml: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string | null;
    listId: number | string;
    excludeTaskId?: number | string;
    isEditing?: boolean;
    onSave: (payload: { title: string; descriptionHtml: string; status: TaskStatus; priority: TaskPriority; dueDate: string | null }) => Promise<void>;
    onCancel: () => void;
  }

  let {
    title = $bindable(),
    descriptionHtml = $bindable(),
    status = $bindable(),
    priority = $bindable(),
    dueDate = $bindable(null),
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
        priority,
        dueDate: dueDate || null
      });
    } finally {
      isSubmitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit} style="display: flex; flex-direction: column; gap: 1.25rem;">
  <div>
    <input
      type="text"
      placeholder="Task title..."
      bind:value={title}
      required
      class="tasks-input"
      style="width: 100%; font-size: 1.15rem; font-weight: 600; padding: 0.6rem 0.75rem;"
    />
  </div>

  <TaskMetaFields
    {status}
    {priority}
    onStatusChange={(s) => (status = s)}
    onPriorityChange={(p) => (priority = p)}
  />

  <div>
    <DatePicker
      value={dueDate ?? ""}
      label="Due date"
      placeholder="Select due date..."
      onchange={(val) => (dueDate = val || null)}
    />
  </div>

  <div class="tasks-form-group">
    <span class="tasks-form-label">Description</span>
    <RichTextEditor
      contentHtml={descriptionHtml}
      {listId}
      {excludeTaskId}
      onChange={(html) => (descriptionHtml = html)}
    />
  </div>

  <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle);">
    <button
      type="button"
      onclick={onCancel}
      disabled={isSubmitting}
      class="tasks-btn tasks-btn-secondary"
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={!title.trim() || isSubmitting}
      class="tasks-btn tasks-btn-primary"
    >
      {isSubmitting ? 'Saving...' : isEditing ? 'Save changes' : 'Create task'}
    </button>
  </div>
</form>
