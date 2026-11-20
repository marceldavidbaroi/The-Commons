<script lang="ts">
	interface Props {
		open: boolean;
		creating?: boolean;
		onCreate: (title: string) => void;
		onClose: () => void;
	}

	let { open, creating = false, onCreate, onClose }: Props = $props();
	let title = $state('');

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = title.trim();
		if (!trimmed || creating) return;
		onCreate(trimmed);
		title = '';
	}

	function handleClose() {
		if (creating) return;
		title = '';
		onClose();
	}
</script>

{#if open}
	<div
		class="goals-modal-backdrop"
		role="dialog"
		aria-modal="true"
		aria-labelledby="create-goal-title"
	>
		<form onsubmit={handleSubmit} class="goals-modal">
			<h2 id="create-goal-title" class="goals-modal-title">Create Goal</h2>
			<div style="margin-top: 12px;">
				<label for="goal-title-input" class="goals-field-label">Goal Title</label>
				<input
					id="goal-title-input"
					type="text"
					bind:value={title}
					required
					placeholder="e.g., Ship The Commons v1"
					class="goals-input"
				/>
			</div>
			<div class="goals-modal-actions">
				<button type="button" onclick={handleClose} disabled={creating} class="goals-btn-secondary">
					Cancel
				</button>
				<button
					type="submit"
					disabled={!title.trim() || creating}
					class="goals-btn-primary"
				>
					{creating ? 'Creating...' : 'Create'}
				</button>
			</div>
		</form>
	</div>
{/if}
