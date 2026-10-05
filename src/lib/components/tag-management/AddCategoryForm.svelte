<script lang="ts">
	import { PRESET_COLORS } from './constants';

	let {
		feature,
		newCategoryName = $bindable(''),
		newCategoryColor = $bindable('#6366F1'),
		isSavingCategory,
		onCancel,
		onCreate
	} = $props<{
		feature: string;
		newCategoryName: string;
		newCategoryColor: string;
		isSavingCategory: boolean;
		onCancel: () => void;
		onCreate: () => void;
	}>();
</script>

<div class="category-form-card">
	<div class="form-header">
		<span class="form-title">New Category for {feature}</span>
		<button
			type="button"
			class="icon-btn-subtle"
			onclick={onCancel}
			aria-label="Cancel adding category"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
	</div>

	<div class="form-field">
		<label for="new-category-name" class="field-label">Category Name</label>
		<input
			id="new-category-name"
			type="text"
			class="text-input"
			bind:value={newCategoryName}
			placeholder="e.g. Life Area, Priority, Context..."
			autofocus
			onkeydown={(e) => e.key === 'Enter' && onCreate()}
		/>
	</div>

	<div class="form-field">
		<label class="field-label">Accent Color</label>
		<div class="color-palette-picker">
			{#each PRESET_COLORS as color}
				<button
					type="button"
					class="color-dot"
					class:selected={newCategoryColor === color}
					style="background-color: {color};"
					onclick={() => (newCategoryColor = color)}
					aria-label="Select color {color}"
				>
					{#if newCategoryColor === color}
						<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
							<polyline points="20 6 9 17 4 12" />
						</svg>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<div class="form-actions">
		<button
			type="button"
			class="btn btn-secondary compact"
			onclick={onCancel}
		>
			Cancel
		</button>
		<button
			type="button"
			class="btn btn-primary compact"
			disabled={!newCategoryName.trim() || isSavingCategory}
			onclick={onCreate}
		>
			{isSavingCategory ? 'Creating...' : 'Create Category'}
		</button>
	</div>
</div>

<style>
	.category-form-card {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
		animation: fadeIn 0.15s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.form-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.form-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.text-input {
		padding: 0.4375rem 0.625rem;
		font-size: 0.8125rem;
		background-color: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.15s ease;
	}

	.text-input:focus {
		border-color: var(--primary);
	}

	.color-palette-picker {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.color-dot {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		transition: transform 0.1s ease, border-color 0.1s ease;
	}

	.color-dot:hover {
		transform: scale(1.15);
	}

	.color-dot.selected {
		border-color: var(--text-primary);
	}

	.color-dot svg {
		width: 12px;
		height: 12px;
	}

	.form-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.icon-btn-subtle {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
	}

	.icon-btn-subtle svg {
		width: 14px;
		height: 14px;
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

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn.compact {
		padding: 0.3125rem 0.625rem;
		font-size: 0.75rem;
	}

	.btn-primary {
		background-color: var(--primary);
		color: var(--primary-foreground);
		border-color: var(--primary);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--primary-hover);
		border-color: var(--primary-hover);
	}

	.btn-secondary {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
		border-color: var(--border-subtle);
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: var(--bg-surface);
		border-color: var(--text-muted);
	}
</style>
