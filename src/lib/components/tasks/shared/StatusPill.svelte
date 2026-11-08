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
    { label: string; color: string; bg: string }
  > = {
    todo: {
      label: "To do",
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-100 dark:bg-slate-800",
    },
    in_progress: {
      label: "In progress",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    done: {
      label: "Done",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    cancelled: {
      label: "Cancelled",
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/40",
    },
  };

  const statuses: TaskStatus[] = ["todo", "in_progress", "done", "cancelled"];

  function selectStatus(s: TaskStatus) {
    if (readonly) return;
    onChange?.(s);
    isOpen = false;
  }
</script>

<div class="relative inline-block text-left">
  <button
    type="button"
    disabled={readonly}
    onclick={() => !readonly && (isOpen = !isOpen)}
    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-colors {STATUS_CONFIG[
      status
    ].bg} {STATUS_CONFIG[status].color} hover:opacity-80"
  >
    <span
      class="w-1.5 h-1.5 rounded-full {status === 'done'
        ? 'bg-emerald-500'
        : status === 'in_progress'
          ? 'bg-blue-500'
          : status === 'cancelled'
            ? 'bg-rose-500'
            : 'bg-slate-400'}"
    ></span>
    <span>{STATUS_CONFIG[status].label}</span>
  </button>

  {#if isOpen && !readonly}
    <div
      class="fixed inset-0 z-40"
      onclick={() => (isOpen = false)}
      onkeydown={(e) => e.key === "Escape" && (isOpen = false)}
      role="button"
      tabindex="-1"
    ></div>

    <div
      class="absolute left-0 mt-1 w-32 origin-top-left rounded-md bg-white dark:bg-slate-900 shadow-lg ring-1 ring-black/10 dark:ring-white/10 z-50 py-1 text-xs focus:outline-none"
    >
      {#each statuses as s}
        <button
          type="button"
          onclick={() => selectStatus(s)}
          class="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left {s ===
          status
            ? 'font-semibold text-primary'
            : 'text-slate-700 dark:text-slate-300'}"
        >
          <span
            class="w-1.5 h-1.5 rounded-full {s === 'done'
              ? 'bg-emerald-500'
              : s === 'in_progress'
                ? 'bg-blue-500'
                : s === 'cancelled'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'}"
          ></span>
          <span>{STATUS_CONFIG[s].label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
