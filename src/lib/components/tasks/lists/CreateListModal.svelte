<script lang="ts">
  interface Props {
    parentListName?: string | null;
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
  }

  let { parentListName = null, onClose, onCreate }: Props = $props();

  let name = $state("");
  let isSubmitting = $state(false);

  function focusOnMount(node: HTMLInputElement) {
    node.focus();
  }

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

<div class="tasks-modal-backdrop">
  <div class="tasks-modal-dialog" role="dialog" aria-modal="true">
    <h3 class="tasks-modal-title">
      {parentListName ? `New sub-list in ${parentListName}` : "Create new list"}
    </h3>

    <form onsubmit={handleSubmit} style="display: flex; flex-direction: column; gap: 1rem;">
      <div class="tasks-form-group">
        <label for="list-name" class="tasks-form-label">
          {parentListName ? "Sub-list name" : "List name"}
        </label>
        <input
          id="list-name"
          type="text"
          use:focusOnMount
          bind:value={name}
          placeholder="e.g. Website Redesign"
          required
          class="tasks-input"
        />
      </div>

      <div class="tasks-modal-actions">
        <button
          type="button"
          onclick={onClose}
          disabled={isSubmitting}
          class="tasks-btn tasks-btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isSubmitting}
          class="tasks-btn tasks-btn-primary"
        >
          {isSubmitting
            ? "Creating..."
            : parentListName
              ? "Create sub-list"
              : "Create list"}
        </button>
      </div>
    </form>
  </div>
</div>
