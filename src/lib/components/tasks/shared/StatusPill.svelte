<script lang="ts">
  import type { TaskStatus } from "$lib/types/tasks";

  interface Props {
    status: TaskStatus;
    onChange?: (status: TaskStatus) => void;
    readonly?: boolean;
  }

  let { status, onChange, readonly = false }: Props = $props();

  let isOpen = $state(false);

  const STATUS_CONFIG: Record<
    TaskStatus,
    { label: string; dotColor: string }
  > = {
    todo: {
      label: "To do",
      dotColor: "var(--text-muted)",
    },
    in_progress: {
      label: "In progress",
      dotColor: "#3b82f6",
    },
    done: {
      label: "Done",
      dotColor: "var(--success)",
    },
    cancelled: {
      label: "Cancelled",
      dotColor: "var(--danger)",
    },
  };

  const statuses: TaskStatus[] = ["todo", "in_progress", "done", "cancelled"];

  function selectStatus(s: TaskStatus) {
    if (readonly) return;
    onChange?.(s);
    isOpen = false;
  }
</script>

<div class="tasks-dropdown">
  <button
    type="button"
    disabled={readonly}
    onclick={() => !readonly && (isOpen = !isOpen)}
    class="tasks-status-pill"
    style="background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-subtle);"
  >
    <span
      style="width: 6px; height: 6px; border-radius: 50%; background-color: {STATUS_CONFIG[status].dotColor}; display: inline-block;"
    ></span>
    <span>{STATUS_CONFIG[status].label}</span>
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
      {#each statuses as s}
        <button
          type="button"
          onclick={() => selectStatus(s)}
          class="tasks-dropdown-item"
          style={s === status ? "font-weight: 600; color: var(--primary);" : ""}
        >
          <span
            style="width: 6px; height: 6px; border-radius: 50%; background-color: {STATUS_CONFIG[s].dotColor}; display: inline-block;"
          ></span>
          <span>{STATUS_CONFIG[s].label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
