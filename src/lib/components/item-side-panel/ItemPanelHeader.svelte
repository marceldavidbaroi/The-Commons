<script lang="ts">
	let {
		mode = 'create',
		name = $bindable(''),
		showDelete = false,
		onDelete,
		onClose
	} = $props<{
		mode?: 'create' | 'edit';
		name: string;
		showDelete?: boolean;
		onDelete?: () => void;
		onClose: () => void;
	}>();
</script>

<div class="panel-header">
	<div class="header-titles">
		<span class="panel-subtitle">{mode === 'edit' ? 'Edit Item' : 'New Item'}</span>
		<input
			id="item-name-input"
			type="text"
			class="panel-title-input"
			bind:value={name}
			placeholder="Item Name (e.g. Extra Virgin Olive Oil)..."
			autocomplete="off"
			required
		/>
	</div>
	<div class="header-actions">
		{#if showDelete && onDelete}
			<button
				type="button"
				class="btn-icon delete-btn"
				onclick={onDelete}
				title="Delete item"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
					<path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
				</svg>
			</button>
		{/if}
		<button
			type="button"
			class="btn-icon close-btn"
			onclick={onClose}
			aria-label="Close panel"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
	</div>
</div>

<style>
	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.header-titles {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
		margin-right: 1rem;
	}

	.panel-subtitle {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.panel-title-input {
		width: 100%;
		border: none;
		outline: none;
		background: transparent;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.01em;
		padding: 0;
		margin: 0;
		font-family: inherit;
	}

	.panel-title-input:focus {
		outline: none;
	}

	.panel-title-input::placeholder {
		color: var(--text-muted);
		font-weight: 400;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-icon svg {
		width: 16px;
		height: 16px;
	}

	.btn-icon:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.delete-btn:hover {
		background: color-mix(in srgb, var(--danger, #ef4444) 10%, transparent);
		border-color: color-mix(in srgb, var(--danger, #ef4444) 30%, transparent);
		color: var(--danger, #ef4444);
	}

	@media (max-width: 640px) {
		.panel-header {
			padding: 1rem;
		}

		.panel-title-input {
			font-size: 1.125rem;
		}
	}
</style>
