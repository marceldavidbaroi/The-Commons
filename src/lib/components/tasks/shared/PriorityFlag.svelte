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
    urgent: { label: "Urgent", color: "text-rose-600 dark:text-rose-400" },
    high: { label: "High", color: "text-amber-600 dark:text-amber-400" },
    medium: { label: "Medium", color: "text-blue-600 dark:text-blue-400" },
    low: { label: "Low", color: "text-slate-500 dark:text-slate-400" },
    none: { label: "None", color: "text-slate-300 dark:text-slate-600" },
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

<div class="relative inline-block text-left">
  <button
    type="button"
    disabled={readonly}
    onclick={() => !readonly && (isOpen = !isOpen)}
    class="inline-flex items-center justify-center p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors {PRIORITY_CONFIG[
      priority
    ].color}"
    title="Priority: {PRIORITY_CONFIG[priority].label}"
  >
    <svg
      class="w-4 h-4"
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
      class="fixed inset-0 z-40"
      onclick={() => (isOpen = false)}
      onkeydown={(e) => e.key === "Escape" && (isOpen = false)}
      role="button"
      tabindex="-1"
    ></div>

    <div
      class="absolute left-0 mt-1 w-32 origin-top-left rounded-md bg-white dark:bg-slate-900 shadow-lg ring-1 ring-black/10 dark:ring-white/10 z-50 py-1 text-xs focus:outline-none"
    >
      {#each priorities as p}
        <button
          type="button"
          onclick={() => selectPriority(p)}
          class="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left {p ===
          priority
            ? 'font-semibold text-primary'
            : 'text-slate-700 dark:text-slate-300'}"
        >
          <svg
            class="w-3.5 h-3.5 {PRIORITY_CONFIG[p].color}"
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
