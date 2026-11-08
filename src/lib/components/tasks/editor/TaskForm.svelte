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

<form onsubmit={handleSubmit} style="display: flex; flex-direction: column; gap: 1.25rem;">
  <div>
    <input
      type="text"
      placeholder="Task title..."
      bind:value={title}
      required
      autofocus
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

  <div class="tasks-form-group">
    <label class="tasks-form-label">Description</label>
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
