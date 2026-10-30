<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { CardTypeRecord, FieldSchemaItem } from '$lib/types/flashcards';

	let {
		isOpen = false,
		initialCardType = null,
		onClose,
		onSave,
		onDelete
	}: {
		isOpen: boolean;
		initialCardType?: CardTypeRecord | null;
		onClose: () => void;
		onSave: (data: {
			name: string;
			fields_schema: FieldSchemaItem[];
			has_reverse: boolean;
		}) => Promise<void>;
		onDelete?: (id: number | string) => Promise<void>;
	} = $props();

	let name = $state('');
	let hasReverse = $state(false);
	let fields = $state<FieldSchemaItem[]>([
		{ name: 'Front', label: 'Front (Prompt)' },
		{ name: 'Back', label: 'Back (Answer)' }
	]);
	let isSubmitting = $state(false);
	let isDeleting = $state(false);
	let showDeleteDialog = $state(false);
	let deleteInput = $state('');
	let errorMessage = $state<string | null>(null);

	const isDefaultType = $derived(Boolean(initialCardType?.is_default));
	const canConfirmDelete = $derived(deleteInput.trim() === 'DELETE');

	$effect(() => {
		if (isOpen) {
			errorMessage = null;
			showDeleteDialog = false;
			deleteInput = '';
			if (initialCardType) {
				name = initialCardType.name;
				hasReverse = initialCardType.has_reverse;
				fields = (initialCardType.fields_schema || []).map((f) => ({ ...f }));
			} else {
				name = '';
				hasReverse = false;
				fields = [
					{ name: 'Front', label: 'Front (Prompt)' },
					{ name: 'Back', label: 'Back (Answer)' }
				];
			}
		}
	});

	function addField() {
		const count = fields.length + 1;
		fields = [
			...fields,
			{
				name: `Field_${count}`,
				label: `Field ${count}`
			}
		];
	}

	function removeField(index: number) {
		if (fields.length <= 1) {
			errorMessage = 'At least one field is required.';
			return;
		}
		errorMessage = null;
		fields = fields.filter((_, i) => i !== index);
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName) {
			errorMessage = 'Type name is required.';
			return;
		}

		if (fields.length === 0) {
			errorMessage = 'At least one field is required.';
			return;
		}

		const names = new Set<string>();
		for (const f of fields) {
			const cleanName = f.name.trim();
			if (!cleanName) {
				errorMessage = 'All fields must have a non-empty name identifier.';
				return;
			}
			if (names.has(cleanName.toLowerCase())) {
				errorMessage = `Duplicate field "${cleanName}". Field names must be unique.`;
				return;
			}
			names.add(cleanName.toLowerCase());
		}

		if (isDefaultType) {
			errorMessage = 'Default card type cannot be edited or modified.';
			return;
		}

		errorMessage = null;
		isSubmitting = true;
		try {
			await onSave({
				name: trimmedName,
				fields_schema: fields.map((f) => ({
					name: f.name.trim(),
					label: f.label.trim() || f.name.trim()
				})),
				has_reverse: hasReverse
			});
			onClose();
		} catch (err: any) {
			errorMessage = err?.message || 'Failed to save type.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleOpenDeleteConfirm() {
		if (isDefaultType) return;
		deleteInput = '';
		showDeleteDialog = true;
	}

	function handleCancelDeleteConfirm() {
		showDeleteDialog = false;
		deleteInput = '';
	}

	async function handleConfirmDelete() {
		if (!initialCardType || !onDelete || !canConfirmDelete || isDefaultType) return;
		errorMessage = null;
		isDeleting = true;
		try {
			await onDelete(initialCardType.id);
			showDeleteDialog = false;
			onClose();
		} catch (err: any) {
			errorMessage = err?.message || 'Failed to delete type.';
			showDeleteDialog = false;
		} finally {
			isDeleting = false;
		}
	}
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		onclick={onClose}
		role="presentation"
		transition:fade={{ duration: 150, easing: cubicOut }}
	></div>

	<div
		class="card-type-modal"
		role="dialog"
		aria-labelledby="type-modal-title"
		aria-modal="true"
		transition:scale={{ start: 0.96, duration: 180, opacity: 0, easing: cubicOut }}
	>
		<div class="modal-header">
			<h2 id="type-modal-title" class="modal-title">
				{initialCardType ? 'Edit Card Type' : 'Create Card Type'}
			</h2>
			<button
				type="button"
				class="btn-close"
				onclick={onClose}
				aria-label="Close modal"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>

		{#if errorMessage}
			<div class="error-banner" role="alert">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
				<span>{errorMessage}</span>
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="type-form">
			<div class="form-body">
				{#if isDefaultType}
					<div class="default-badge-banner">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
						<span>This is the system default card type. It cannot be edited or deleted.</span>
					</div>
				{/if}

				<!-- Name -->
				<div class="form-group">
					<label for="type-name" class="form-label">Type Name</label>
					<input
						id="type-name"
						type="text"
						class="form-input"
						bind:value={name}
						placeholder="e.g. Vocabulary, Concept, Question"
						required
						disabled={isDefaultType}
						autofocus
					/>
				</div>

				<!-- Direction Option -->
				<div class="form-group">
					<label class="checkbox-label" class:disabled-label={isDefaultType}>
						<input type="checkbox" bind:checked={hasReverse} disabled={isDefaultType} />
						<span class="checkbox-text">
							<strong>Bidirectional (Reverse Cards)</strong>
							<span class="hint-inline">Generates both forward & reverse study cards</span>
						</span>
					</label>
				</div>

				<!-- Fields Schema List -->
				<div class="fields-section">
					<div class="fields-header">
						<span class="fields-title">Fields ({fields.length})</span>
						{#if !isDefaultType}
							<button
								type="button"
								class="btn-text-action"
								onclick={addField}
							>
								+ Add Field
							</button>
						{/if}
					</div>

					<div class="fields-list">
						{#each fields as field, index (index)}
							<div class="field-row">
								<input
									type="text"
									class="form-input field-key-input"
									bind:value={field.name}
									placeholder="Key identifier"
									required
									disabled={isDefaultType}
								/>
								<input
									type="text"
									class="form-input field-label-input"
									bind:value={field.label}
									placeholder="Display label"
									disabled={isDefaultType}
								/>
								{#if !isDefaultType}
									<button
										type="button"
										class="btn-remove-field"
										onclick={() => removeField(index)}
										title="Remove field"
										disabled={fields.length <= 1}
									>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<line x1="18" y1="6" x2="6" y2="18" />
											<line x1="6" y1="6" x2="18" y2="18" />
										</svg>
									</button>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>

			<div class="modal-actions">
				{#if initialCardType && onDelete && !isDefaultType}
					<button
						type="button"
						class="btn btn-danger-ghost"
						onclick={handleOpenDeleteConfirm}
						disabled={isSubmitting || isDeleting}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="3 6 5 6 21 6" />
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						</svg>
						<span>Delete</span>
					</button>
				{/if}

				<div class="action-buttons-right">
					<button
						type="button"
						class="btn btn-secondary"
						onclick={onClose}
						disabled={isSubmitting || isDeleting}
					>
						{isDefaultType ? 'Close' : 'Cancel'}
					</button>
					{#if !isDefaultType}
						<button
							type="submit"
							class="btn btn-primary"
							disabled={isSubmitting || isDeleting}
						>
							{#if isSubmitting}
								<span>Saving...</span>
							{:else}
								<span>{initialCardType ? 'Save Changes' : 'Create Type'}</span>
							{/if}
						</button>
					{/if}
				</div>
			</div>
		</form>

		{#if showDeleteDialog}
			<div
				class="confirm-overlay"
				role="dialog"
				aria-labelledby="confirm-delete-title"
				transition:fade={{ duration: 120 }}
			>
				<div class="confirm-card">
					<div class="confirm-header">
						<div class="confirm-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="3 6 5 6 21 6" />
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
								<line x1="10" y1="11" x2="10" y2="17" />
								<line x1="14" y1="11" x2="14" y2="17" />
							</svg>
						</div>
						<div class="confirm-text-wrap">
							<h3 id="confirm-delete-title" class="confirm-title">Delete Card Type</h3>
							<p class="confirm-desc">
								Are you sure you want to delete <strong>{initialCardType?.name}</strong>? All notes and related study cards will be permanently removed.
							</p>
						</div>
					</div>

					<div class="confirm-input-wrap">
						<label for="delete-card-type-confirmation" class="confirm-label">
							Type <code>DELETE</code> to confirm:
						</label>
						<input
							id="delete-card-type-confirmation"
							type="text"
							class="form-input confirm-input"
							placeholder="DELETE"
							bind:value={deleteInput}
							autocomplete="off"
							autofocus
						/>
					</div>

					<div class="confirm-actions">
						<button
							type="button"
							class="btn btn-secondary"
							onclick={handleCancelDeleteConfirm}
							disabled={isDeleting}
						>
							Cancel
						</button>
						<button
							type="button"
							class="btn btn-danger"
							onclick={handleConfirmDelete}
							disabled={!canConfirmDelete || isDeleting}
						>
							{#if isDeleting}
								<span>Deleting...</span>
							{:else}
								<span>Delete Forever</span>
							{/if}
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		z-index: 1000;
	}

	.card-type-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 100%;
		max-width: 480px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16);
		z-index: 1001;
		display: flex;
		flex-direction: column;
		max-height: 90vh;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
	}

	.modal-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.btn-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.btn-close:hover {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.btn-close svg {
		width: 16px;
		height: 16px;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background-color: #fef2f2;
		border-bottom: 1px solid #fecaca;
		color: #b91c1c;
		font-size: 0.75rem;
	}

	.error-banner svg {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}

	.type-form {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		flex: 1;
	}

	.form-body {
		padding: 1.25rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.form-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background-color: var(--bg-primary);
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		box-sizing: border-box;
	}

	.form-input:focus {
		border-color: var(--primary);
		box-shadow: 0 0 0 2px rgba(var(--primary-rgb, 59, 130, 246), 0.12);
	}

	.checkbox-label {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.75rem;
		color: var(--text-primary);
	}

	.checkbox-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.hint-inline {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.fields-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-subtle);
	}

	.fields-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.fields-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.btn-text-action {
		background: none;
		border: none;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--primary);
		cursor: pointer;
		padding: 0.125rem 0.25rem;
	}

	.btn-text-action:hover {
		text-decoration: underline;
	}

	.fields-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.field-key-input {
		flex: 1;
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	.field-label-input {
		flex: 1.2;
	}

	.btn-remove-field {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		color: var(--text-muted);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: color 0.15s ease, background-color 0.15s ease;
		flex-shrink: 0;
	}

	.btn-remove-field:hover:not(:disabled) {
		color: #ef4444;
		background-color: #fee2e2;
	}

	.btn-remove-field:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.btn-remove-field svg {
		width: 14px;
		height: 14px;
	}

	.modal-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.875rem 1.25rem;
		background-color: var(--bg-secondary);
		border-top: 1px solid var(--border-subtle);
	}

	.action-buttons-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: auto;
	}

	.delete-confirm-box {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.delete-warn-text {
		font-size: 0.6875rem;
		font-weight: 600;
		color: #dc2626;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.375rem 0.875rem;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.btn.compact {
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
	}

	.btn-secondary {
		background-color: var(--bg-primary);
		border-color: var(--border-subtle);
		color: var(--text-secondary);
	}

	.btn-secondary:hover:not(:disabled) {
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.btn-primary {
		background-color: var(--primary);
		color: var(--primary-foreground);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--primary-hover);
	}

	.btn-danger {
		background-color: #dc2626;
		color: #ffffff;
	}

	.btn-danger:hover:not(:disabled) {
		background-color: #b91c1c;
	}

	.btn-danger-ghost {
		background: transparent;
		border-color: transparent;
		color: #dc2626;
	}

	.btn-danger-ghost:hover:not(:disabled) {
		background-color: #fee2e2;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Default card type banner */
	.default-badge-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
		background-color: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.default-badge-banner svg {
		width: 15px;
		height: 15px;
		color: var(--primary);
		flex-shrink: 0;
	}

	.disabled-label {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Type-to-DELETE confirmation overlay */
	.confirm-overlay {
		position: absolute;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.25rem;
		z-index: 100;
		border-radius: var(--radius-lg);
	}

	.confirm-card {
		background-color: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1.25rem;
		max-width: 420px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
	}

	.confirm-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.confirm-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full, 9999px);
		background-color: #fef2f2;
		color: #ef4444;
		flex-shrink: 0;
	}

	.confirm-icon svg {
		width: 16px;
		height: 16px;
	}

	.confirm-text-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.confirm-title {
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.confirm-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		line-height: 1.4;
		margin: 0;
	}

	.confirm-desc strong {
		color: var(--text-primary);
	}

	.confirm-input-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		background-color: var(--bg-secondary);
		padding: 0.75rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
	}

	.confirm-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.confirm-label code {
		font-family: var(--font-mono);
		background-color: var(--bg-tertiary);
		color: #ef4444;
		padding: 0.1rem 0.3rem;
		border-radius: var(--radius-xs, 3px);
		font-weight: 700;
	}

	.confirm-input {
		background-color: var(--bg-primary);
	}

	.confirm-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
	}
</style>
