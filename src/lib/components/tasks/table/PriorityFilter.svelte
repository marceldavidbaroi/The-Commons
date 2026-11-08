<script lang="ts">
  import type { TaskPriority } from "$lib/types/tasks";

  interface Props {
    selected: TaskPriority[];
    onChange: (selected: TaskPriority[]) => void;
  }

  let { selected, onChange }: Props = $props();

  let isOpen = $state(false);

  const OPTIONS: Array<{ id: TaskPriority; label: string }> = [
    { id: "urgent", label: "Urgent" },
    { id: "high", label: "High" },
    { id: "medium", label: "Medium" },
    { id: "low", label: "Low" },
    { id: "none", label: "None" },
  ];

  function toggle(id: TaskPriority) {
    if (selected.includes(id)) {
      onChange(selected.filter((p) => p !== id));
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

<div class="relative inline-block text-left">
  <button
    type="button"
    onclick={() => (isOpen = !isOpen)}
    class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
  >
    <span class="text-slate-400">Priority:</span>
    <span class="font-semibold text-slate-800 dark:text-slate-200"
      >{labelText}</span
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
      class="absolute left-0 mt-1 w-44 origin-top-left rounded-md bg-white dark:bg-slate-900 shadow-lg ring-1 ring-black/10 dark:ring-white/10 z-50 py-1.5 text-xs focus:outline-none"
    >
      {#each OPTIONS as opt}
        <label
          class="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selected.includes(opt.id)}
            onchange={() => toggle(opt.id)}
            class="rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary h-3.5 w-3.5"
          />
          <span class="text-slate-700 dark:text-slate-300">{opt.label}</span>
        </label>
      {/each}
    </div>
  {/if}
</div>
