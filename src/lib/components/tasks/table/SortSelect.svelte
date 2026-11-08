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

<div class="relative inline-block text-left">
  <button
    type="button"
    onclick={() => (isOpen = !isOpen)}
    class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
  >
    <span class="text-slate-400">Sort:</span>
    <span class="font-semibold text-slate-800 dark:text-slate-200"
      >{currentLabel}</span
    >
    <svg
      class="w-3.5 h-3.5 text-slate-400"
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
      class="fixed inset-0 z-40"
      onclick={() => (isOpen = false)}
      onkeydown={(e) => e.key === "Escape" && (isOpen = false)}
      role="button"
      tabindex="-1"
    ></div>

    <div
      class="absolute left-0 mt-1 w-32 origin-top-left rounded-md bg-white dark:bg-slate-900 shadow-lg ring-1 ring-black/10 dark:ring-white/10 z-50 py-1 text-xs focus:outline-none"
    >
      {#each OPTIONS as opt}
        <button
          type="button"
          onclick={() => choose(opt.mode)}
          class="flex w-full items-center px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left {opt.mode ===
          sortMode
            ? 'font-semibold text-primary'
            : 'text-slate-700 dark:text-slate-300'}"
        >
          {opt.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
