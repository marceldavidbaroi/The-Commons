<script lang="ts">
	import type { DeleteConfirmation } from './constants';

	let {
		confirmation,
		onCancel,
		onConfirm
	} = $props<{
		confirmation: DeleteConfirmation;
		onCancel: () => void;
		onConfirm: () => void;
	}>();
</script>

<div
	class="modal-backdrop"
	onclick={onCancel}
	role="presentation"
	aria-hidden="true"
></div>

<div class="modal-dialog" role="dialog" aria-labelledby="modal-title" aria-modal="true">
	<div class="modal-header">
		<div class="modal-danger-icon">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="3 6 5 6 21 6" />
				<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
			</svg>
		</div>
		<h3 id="modal-title" class="modal-title">{confirmation.title}</h3>
	</div>

	<p class="modal-message">{confirmation.message}</p>

	<div class="modal-actions">
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
			{confirmation.confirmLabel}
		</button>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(31, 38, 51, 0.45);
		z-index: 120;
		animation: backdropFadeIn 0.12s ease-out;
	}

	@keyframes backdropFadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal-dialog {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: calc(100% - 2.5rem);
		max-width: 380px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.08);
		padding: 1.25rem;
		z-index: 130;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		animation: modalZoomIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes modalZoomIn {
		from {
			opacity: 0;
			transform: translate(-50%, -46%) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.modal-danger-icon {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background-color: #fee2e2;
		color: var(--danger);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.modal-danger-icon svg {
		width: 16px;
		height: 16px;
	}

	.modal-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.3;
	}

	.modal-message {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.modal-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.375rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.4375rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		cursor: pointer;
		transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
		user-select: none;
		white-space: nowrap;
	}

	.btn.compact {
		padding: 0.3125rem 0.625rem;
		font-size: 0.75rem;
	}

	.btn-secondary {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
		border-color: var(--border-subtle);
	}

	.btn-secondary:hover {
		background-color: var(--bg-surface);
		border-color: var(--text-muted);
	}

	.btn-danger {
		background-color: var(--danger);
		color: #ffffff;
		border-color: var(--danger);
	}

	.btn-danger:hover {
		background-color: #b91c1c;
		border-color: #b91c1c;
	}
</style>
