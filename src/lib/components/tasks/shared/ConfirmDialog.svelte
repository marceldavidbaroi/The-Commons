<script lang="ts">
  interface Props {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }

  let {
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    isDestructive = false,
    onConfirm,
    onCancel,
  }: Props = $props();
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
      {title}
    </h3>
    <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>

    <div class="mt-5 flex justify-end gap-2">
      <button
        type="button"
        onclick={onCancel}
        class="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onclick={onConfirm}
        class="px-3 py-1.5 text-xs font-medium text-white rounded transition-colors {isDestructive
          ? 'bg-rose-600 hover:bg-rose-700'
          : 'bg-primary hover:bg-primary/90'}"
      >
        {confirmLabel}
      </button>
    </div>
  </div>
</div>
