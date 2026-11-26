<script lang="ts">
	interface Props {
		open: boolean;
		milestoneTitle: string;
		deleting?: boolean;
		error?: string | null;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let {
		open,
		milestoneTitle,
		deleting = false,
		error = null,
		onConfirm,
		onCancel
	}: Props = $props();

	let confirmInput = $state('');

	const isMatch = $derived(
		milestoneTitle.trim().length > 0 && confirmInput.trim() === milestoneTitle.trim()
	);

	function handleCancel() {
		confirmInput = '';
		onCancel();
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!isMatch || deleting) return;
		onConfirm();
	}
</script>

{#if open}
	<div
		class="goals-modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="delete-milestone-dialog-title"
	>
		<form onsubmit={handleSubmit} class="goals-modal">
			<h2 id="delete-milestone-dialog-title" class="goals-modal-title">Delete Milestone</h2>
			<p class="goals-modal-body">
				This will permanently delete <strong>{milestoneTitle}</strong> along with all of its
				modules, tasks, and milestone Definition of Done criteria. This action cannot be undone.
			</p>

			<div style="margin-top: 14px;">
				<label for="confirm-milestone-name" class="goals-field-label">
					Type <strong>{milestoneTitle}</strong> to confirm
				</label>
				<input
					id="confirm-milestone-name"
					type="text"
					bind:value={confirmInput}
					placeholder={milestoneTitle}
					disabled={deleting}
					autocomplete="off"
					class="goals-input"
				/>
			</div>

			{#if error}
				<div class="goals-error" style="margin-top: 12px;">{error}</div>
			{/if}

			<div class="goals-modal-actions">
				<button
					type="button"
					onclick={handleCancel}
					disabled={deleting}
					class="goals-btn-secondary"
				>
					Cancel
				</button>
				<button type="submit" disabled={!isMatch || deleting} class="goals-btn-danger">
					{deleting ? 'Deleting...' : 'Delete Milestone'}
				</button>
			</div>
		</form>
	</div>
{/if}
