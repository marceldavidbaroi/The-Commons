<script lang="ts">
	let {
		isSaving = false,
		isValid = true,
		mode = 'create',
		onClose
	} = $props<{
		isSaving?: boolean;
		isValid?: boolean;
		mode?: 'create' | 'edit';
		onClose: () => void;
	}>();
</script>

<div class="panel-footer">
	<button type="button" class="btn btn-secondary" onclick={onClose}>
		Cancel
	</button>
	<button
		type="submit"
		class="btn btn-primary"
		disabled={isSaving || !isValid}
	>
		{isSaving ? 'Saving...' : mode === 'edit' ? 'Update Item' : 'Add Item'}
	</button>
</div>

<style>
	.panel-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
	}

	.btn {
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
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

	.btn-primary {
		border: 1px solid transparent;
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--primary-hover);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 640px) {
		.panel-footer {
			padding: 0.875rem 1rem;
		}
	}
</style>
