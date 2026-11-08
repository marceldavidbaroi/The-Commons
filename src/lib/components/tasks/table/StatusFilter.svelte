<script lang="ts">
  import type { TaskStatus } from "$lib/types/tasks";

  interface Props {
    selected: TaskStatus[];
    onChange: (selected: TaskStatus[]) => void;
  }

  let { selected, onChange }: Props = $props();

  let isOpen = $state(false);

  const OPTIONS: Array<{ id: TaskStatus; label: string }> = [
    { id: "todo", label: "To do" },
    { id: "in_progress", label: "In progress" },
    { id: "done", label: "Done" },
    { id: "cancelled", label: "Cancelled" },
  ];

  function toggle(id: TaskStatus) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  const labelText = $derived(
    selected.length === 0
      ? "All"
      : selected.length === OPTIONS.length
        ? "All"
        : `${selected.length} selected`,
  );
</script>

<div class="tasks-dropdown">
  <button
    type="button"
    onclick={() => (isOpen = !isOpen)}
    class="tasks-btn tasks-btn-secondary"
  >
    <span style="color: var(--text-muted);">Status:</span>
    <span style="font-weight: 600;">{labelText}</span>
    <svg
      style="width: 0.875rem; height: 0.875rem; color: var(--text-muted);"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  </button>

  {#if isOpen}
    <div
      style="position: fixed; inset: 0; z-index: 40;"
      onclick={() => (isOpen = false)}
      onkeydown={(e) => e.key === "Escape" && (isOpen = false)}
      role="button"
      tabindex="-1"
    ></div>

    <div class="tasks-dropdown-menu" style="min-width: 150px; padding: 0.5rem 0.25rem;">
      {#each OPTIONS as opt}
        <label
          style="display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.75rem; font-size: 0.75rem; cursor: pointer; color: var(--text-primary);"
        >
          <input
            type="checkbox"
            checked={selected.includes(opt.id)}
            onchange={() => toggle(opt.id)}
          />
          <span>{opt.label}</span>
        </label>
      {/each}
    </div>
  {/if}
</div>
