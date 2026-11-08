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

<div class="tasks-modal-backdrop">
  <div class="tasks-modal-dialog" role="dialog" aria-modal="true">
    <h3 class="tasks-modal-title">{title}</h3>
    <p class="tasks-modal-body" style="margin: 0;">{description}</p>

    <div class="tasks-modal-actions">
      <button
        type="button"
        onclick={onCancel}
        class="tasks-btn tasks-btn-secondary"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onclick={onConfirm}
        class="tasks-btn {isDestructive ? 'tasks-btn-danger' : 'tasks-btn-primary'}"
      >
        {confirmLabel}
      </button>
    </div>
  </div>
</div>
