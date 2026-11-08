<script lang="ts">
  import type { ListRecord } from "$lib/types/tasks";
  import ConfirmDialog from "../shared/ConfirmDialog.svelte";

  interface Props {
    list: ListRecord;
    onTrash: (id: number | string) => void;
  }

  let { list, onTrash }: Props = $props();

  let showDeleteConfirm = $state(false);
</script>

<div class="tasks-card">
  <div class="tasks-card-header">
    <a href={`/tasks/lists/${list.id}`} class="tasks-card-title">
      {list.name}
    </a>
    <button
      type="button"
      onclick={() => (showDeleteConfirm = true)}
      class="tasks-icon-btn"
      title="Move to trash"
    >
      <svg
        style="width: 1rem; height: 1rem;"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </button>
  </div>

  <div class="tasks-card-footer">
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <span class="tasks-badge">
        {list.active_tasks_count} active
      </span>
      <span>•</span>
      <span>{list.live_tasks_count} total</span>
    </div>
    <span style="text-transform: capitalize;">{list.sort_mode}</span>
  </div>
</div>

{#if showDeleteConfirm}
  <ConfirmDialog
    title="Move list to trash?"
    description={`Moving "${list.name}" to trash will also move all ${list.live_tasks_count} tasks within it to trash as a bundle.`}
    confirmLabel="Move to trash"
    isDestructive={true}
    onConfirm={() => {
      showDeleteConfirm = false;
      onTrash(list.id);
    }}
    onCancel={() => (showDeleteConfirm = false)}
  />
{/if}
