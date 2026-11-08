<script lang="ts">
  interface Props {
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
  }

  let { onClose, onCreate }: Props = $props();

  let name = $state("");
  let isSubmitting = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    isSubmitting = true;
    try {
      await onCreate(name.trim());
      onClose();
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
>
  <div
    class="w-full max-w-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xl transition-all"
    role="dialog"
    aria-modal="true"
  >
    <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
      Create new list
    </h3>

    <form onsubmit={handleSubmit} class="mt-4">
      <label
        for="list-name"
        class="block text-xs font-medium text-slate-700 dark:text-slate-300"
        >List name</label
      >
      <input
        id="list-name"
        type="text"
        bind:value={name}
        placeholder="e.g. Website Redesign"
        autofocus
        required
        class="mt-1 block w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onclick={onClose}
          disabled={isSubmitting}
          class="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isSubmitting}
          class="px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 rounded transition-colors"
        >
          {isSubmitting ? "Creating..." : "Create list"}
        </button>
      </div>
    </form>
  </div>
</div>
