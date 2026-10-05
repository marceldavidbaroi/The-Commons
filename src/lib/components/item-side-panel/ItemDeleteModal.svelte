<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		isOpen = false,
		itemName = '',
		onCancel,
		onConfirm
	} = $props<{
		isOpen: boolean;
		itemName?: string;
		onCancel: () => void;
		onConfirm: () => void;
	}>();
</script>

{#if isOpen}
	<div
		class="confirm-modal-backdrop"
		onclick={onCancel}
		role="presentation"
		aria-hidden="true"
		transition:fade={{ duration: 200, easing: cubicOut }}
	></div>

	<div
		class="confirm-modal-dialog"
		role="dialog"
		aria-labelledby="confirm-delete-title"
		aria-modal="true"
		transition:scale={{ start: 0.94, duration: 250, opacity: 0, easing: cubicOut }}
	>
		<div class="confirm-modal-header">
			<div class="confirm-danger-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="3 6 5 6 21 6" />
					<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
				</svg>
			</div>
			<h3 id="confirm-delete-title" class="confirm-modal-title">Delete Item</h3>
		</div>

		<p class="confirm-modal-message">
			Are you sure you want to delete <strong>"{itemName || 'this item'}"</strong>? This action cannot be undone.
		</p>

		<div class="confirm-modal-actions">
			<button
				type="button"
				class="btn btn-secondary compact"
				onclick={onCancel}
			>
				Cancel
			</button>
			<button
				type="button"
				class="btn btn-danger compact"
				onclick={onConfirm}
			>
				Delete Item
			</button>
		</div>
	</div>
{/if}

<style>
	.confirm-modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(31, 38, 51, 0.45);
		z-index: 120;
	}

	.confirm-modal-dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 90%;
		max-width: 400px;
		background: var(--bg-secondary);
		border-radius: var(--radius-md);
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
		z-index: 121;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		border: 1px solid var(--border-subtle);
		will-change: transform, opacity;
	}

	.confirm-modal-header {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.confirm-danger-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		background-color: color-mix(in srgb, var(--danger, #ef4444) 10%, transparent);
		color: var(--danger, #ef4444);
		flex-shrink: 0;
	}

	.confirm-danger-icon svg {
		width: 16px;
		height: 16px;
	}

	.confirm-modal-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.confirm-modal-message {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.45;
	}

	.confirm-modal-message strong {
		color: var(--text-primary);
		font-weight: 600;
	}

	.confirm-modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.btn {
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn.compact {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
	}

	.btn-secondary {
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		color: var(--text-secondary);
	}

	.btn-secondary:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.btn-danger {
		border: 1px solid transparent;
		background: var(--danger, #ef4444);
		color: #ffffff;
	}

	.btn-danger:hover {
		opacity: 0.9;
	}
</style>
