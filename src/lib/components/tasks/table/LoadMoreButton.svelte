<script lang="ts">
  interface Props {
    isLoading: boolean;
    onClick: () => void;
  }

  let { isLoading, onClick }: Props = $props();
</script>

<div class="py-4 text-center">
  <button
    type="button"
    disabled={isLoading}
    onclick={onClick}
    class="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
  >
    {#if isLoading}
      <svg
        class="animate-spin h-3.5 w-3.5 text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"
        ></path>
      </svg>
      <span>Loading more...</span>
    {:else}
      <span>Load more</span>
    {/if}
  </button>
</div>
