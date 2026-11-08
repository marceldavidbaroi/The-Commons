<script lang="ts">
  interface Props {
    isLoading: boolean;
    onClick: () => void;
  }

  let { isLoading, onClick }: Props = $props();
</script>

<div style="padding: 1rem 0; text-align: center; border-top: 1px solid var(--border-subtle);">
  <button
    type="button"
    disabled={isLoading}
    onclick={onClick}
    class="tasks-btn tasks-btn-secondary"
  >
    {#if isLoading}
      <span>Loading more...</span>
    {:else}
      <span>Load more</span>
    {/if}
  </button>
</div>
