<script lang="ts">
	interface Props {
		open: boolean;
		saving?: boolean;
		onSaveAndLeave: () => void;
		onDiscard: () => void;
		onCancel: () => void;
	}

	let { open, saving = false, onSaveAndLeave, onDiscard, onCancel }: Props = $props();
</script>

{#if open}
	<div
		class="goals-modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="unsaved-dialog-title"
	>
		<div class="goals-modal">
			<h2 id="unsaved-dialog-title" class="goals-modal-title">Unsaved Changes</h2>
			<p class="goals-modal-body">
				You have unsaved edits on this page. Would you like to save them before leaving?
			</p>
			<div class="goals-modal-actions">
				<button type="button" onclick={onCancel} disabled={saving} class="goals-btn-secondary">
					Cancel
				</button>
				<button
					type="button"
					onclick={onDiscard}
					disabled={saving}
					class="goals-btn-danger-outline"
				>
					Discard
				</button>
				<button type="button" onclick={onSaveAndLeave} disabled={saving} class="goals-btn-primary">
					{saving ? 'Saving...' : 'Save & Leave'}
				</button>
			</div>
		</div>
	</div>
{/if}
