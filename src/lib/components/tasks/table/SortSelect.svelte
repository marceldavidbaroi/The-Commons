<script lang="ts">
  import type { TaskSortMode } from "$lib/types/tasks";

  interface Props {
    sortMode: TaskSortMode;
    onSelect: (mode: TaskSortMode) => void;
  }

  let { sortMode, onSelect }: Props = $props();

  let isOpen = $state(false);

  const OPTIONS: Array<{ mode: TaskSortMode; label: string }> = [
    { mode: "created", label: "Created" },
    { mode: "priority", label: "Priority" },
    { mode: "manual", label: "Manual" },
  ];

  const currentLabel = $derived(
    OPTIONS.find((o) => o.mode === sortMode)?.label || "Created",
  );

  function choose(mode: TaskSortMode) {
    onSelect(mode);
    isOpen = false;
  }
</script>

<div class="tasks-dropdown">
  <button
    type="button"
    onclick={() => (isOpen = !isOpen)}
    class="tasks-btn tasks-btn-secondary"
  >
    <span style="color: var(--text-muted);">Sort:</span>
    <span style="font-weight: 600;">{currentLabel}</span>
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

    <div class="tasks-dropdown-menu">
      {#each OPTIONS as opt}
        <button
          type="button"
          onclick={() => choose(opt.mode)}
          class="tasks-dropdown-item"
          style={opt.mode === sortMode ? "font-weight: 600; color: var(--primary);" : ""}
        >
          {opt.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
