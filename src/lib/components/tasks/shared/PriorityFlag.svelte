<script lang="ts">
  import type { TaskPriority } from "$lib/types/tasks";

  interface Props {
    priority: TaskPriority;
    onChange?: (priority: TaskPriority) => void;
    readonly?: boolean;
  }

  let { priority, onChange, readonly = false }: Props = $props();

  let isOpen = $state(false);

  const PRIORITY_CONFIG: Record<
    TaskPriority,
    { label: string; color: string }
  > = {
    urgent: { label: "Urgent", color: "var(--danger)" },
    high: { label: "High", color: "var(--warning)" },
    medium: { label: "Medium", color: "#3b82f6" },
    low: { label: "Low", color: "var(--text-secondary)" },
    none: { label: "None", color: "var(--text-muted)" },
  };

  const priorities: TaskPriority[] = [
    "urgent",
    "high",
    "medium",
    "low",
    "none",
  ];

  function selectPriority(p: TaskPriority) {
    if (readonly) return;
    onChange?.(p);
    isOpen = false;
  }
</script>

<div class="tasks-dropdown">
  <button
    type="button"
    disabled={readonly}
    onclick={() => !readonly && (isOpen = !isOpen)}
    class="tasks-priority-flag"
    style="color: {PRIORITY_CONFIG[priority].color};"
    title="Priority: {PRIORITY_CONFIG[priority].label}"
  >
    <svg
      style="width: 1rem; height: 1rem;"
      fill={priority === "none" ? "none" : "currentColor"}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
      />
    </svg>
  </button>

  {#if isOpen && !readonly}
    <div
      style="position: fixed; inset: 0; z-index: 40;"
      onclick={() => (isOpen = false)}
      onkeydown={(e) => e.key === "Escape" && (isOpen = false)}
      role="button"
      tabindex="-1"
    ></div>

    <div class="tasks-dropdown-menu">
      {#each priorities as p}
        <button
          type="button"
          onclick={() => selectPriority(p)}
          class="tasks-dropdown-item"
          style={p === priority ? "font-weight: 600; color: var(--primary);" : ""}
        >
          <svg
            style="width: 0.875rem; height: 0.875rem; color: {PRIORITY_CONFIG[p].color};"
            fill={p === "none" ? "none" : "currentColor"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
            />
          </svg>
          <span>{PRIORITY_CONFIG[p].label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
