<script lang="ts">
  import { tick } from "svelte";
  import type { ListRecord } from "$lib/types/tasks";

  interface Props {
    list: ListRecord;
    totalFiltered: number;
    totalLive: number;
    hasActiveFilters: boolean;
    onRename: (name: string) => Promise<unknown> | unknown;
    onDelete: () => Promise<void> | void;
  }

  let {
    list,
    totalFiltered,
    totalLive,
    hasActiveFilters,
    onRename,
    onDelete,
  }: Props = $props();

  let isEditingName = $state(false);
  let draftName = $state("");
  let nameInputEl: HTMLInputElement | null = $state(null);

  let showDeleteDialog = $state(false);
  let deleteConfirmText = $state("");
  let isDeleting = $state(false);

  async function startEditing() {
    draftName = list.name;
    isEditingName = true;
    await tick();
    nameInputEl?.focus();
    nameInputEl?.select();
  }

  async function commitRename() {
    if (!isEditingName) return;
    isEditingName = false;
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== list.name) {
      await onRename(trimmed);
    }
  }

  function handleNameKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      isEditingName = false;
    }
  }

  function openDeleteDialog() {
    deleteConfirmText = "";
    showDeleteDialog = true;
  }

  async function confirmDelete() {
    if (deleteConfirmText !== list.name || isDeleting) return;
    isDeleting = true;
    try {
      await onDelete();
      showDeleteDialog = false;
    } finally {
      isDeleting = false;
    }
  }
</script>

<header class="tasks-header">
  <div class="tasks-header-left">
    <a
      href="/tasks"
      class="tasks-icon-btn"
      title="Back to lists"
    >
      <svg
        style="width: 1.25rem; height: 1.25rem;"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
    </a>

    <div style="display: flex; align-items: center; gap: 0.5rem;">
      {#if isEditingName}
        <input
          bind:this={nameInputEl}
          bind:value={draftName}
          onblur={commitRename}
          onkeydown={handleNameKeydown}
          class="tasks-input tasks-title"
          style="padding: 0.125rem 0.5rem; height: auto; min-width: 12rem;"
          aria-label="List name"
        />
      {:else}
        <button
          type="button"
          onclick={startEditing}
          class="tasks-title"
          style="background: none; border: none; padding: 0; cursor: pointer; text-align: left;"
          title="Click to rename list"
        >
          {list.name}
        </button>
      {/if}
      <span class="tasks-badge">
        {#if hasActiveFilters}
          {totalFiltered} of {totalLive} tasks
        {:else}
          {totalLive} tasks
        {/if}
      </span>
    </div>
  </div>

  <div class="tasks-header-actions" style="display: flex; align-items: center; gap: 0.5rem;">
    <button
      type="button"
      onclick={openDeleteDialog}
      class="tasks-icon-btn"
      title="Delete list"
      aria-label="Delete list"
    >
      <svg
        style="width: 1.125rem; height: 1.125rem;"
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
    <a
      href={`/tasks/lists/${list.id}/tasks/new`}
      class="tasks-btn tasks-btn-primary"
    >
      <svg
        style="width: 0.875rem; height: 0.875rem;"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 4v16m8-8H4"
        />
      </svg>
      <span>New task</span>
    </a>
  </div>
</header>

{#if showDeleteDialog}
  <div class="tasks-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-list-title">
    <div
      class="tasks-modal-card"
      style="background: var(--color-surface, #ffffff); border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.75rem; padding: 1.25rem; width: 100%; max-width: 26rem; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);"
    >
      <h3 id="delete-list-title" style="font-size: 1rem; font-weight: 600; color: var(--color-ink); margin: 0;">
        Delete list?
      </h3>
      <p style="font-size: 0.875rem; color: var(--color-ink-muted); margin-top: 0.5rem; margin-bottom: 0.75rem;">
        This will move <strong>{list.name}</strong> and its {totalLive} {totalLive === 1 ? "task" : "tasks"} to trash. Type <strong>{list.name}</strong> to confirm.
      </p>
      <input
        type="text"
        bind:value={deleteConfirmText}
        placeholder={list.name}
        class="tasks-input"
        style="width: 100%; margin-bottom: 1rem;"
        onkeydown={(e) => {
          if (e.key === "Enter" && deleteConfirmText === list.name) {
            confirmDelete();
          } else if (e.key === "Escape") {
            showDeleteDialog = false;
          }
        }}
      />
      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem;">
        <button
          type="button"
          onclick={() => (showDeleteDialog = false)}
          class="tasks-btn tasks-btn-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={confirmDelete}
          disabled={deleteConfirmText !== list.name || isDeleting}
          class="tasks-btn tasks-btn-danger"
        >
          {isDeleting ? "Deleting..." : "Delete list"}
        </button>
      </div>
    </div>
  </div>
{/if}
