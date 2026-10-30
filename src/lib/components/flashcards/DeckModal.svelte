<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { DeckRecord, CardTypeRecord } from '$lib/types/flashcards';

	let {
		isOpen = false,
		initialDeck = null,
		parentId = null,
		cardTypes = [],
		onClose,
		onSave,
		onDelete
	}: {
		isOpen: boolean;
		decks?: DeckRecord[];
		initialDeck?: DeckRecord | null;
		parentId?: number | string | null;
		cardTypes?: CardTypeRecord[];
		onClose: () => void;
		onSave: (deckData: {
			name: string;
			description: string | null;
			parent_id: number | string | null;
			config: {
				new_cards_per_day: number;
				max_reviews_per_day: number;
				learn_steps_minutes: number[];
				leech_threshold: number;
				card_type_id?: number | string | null;
			};
		}) => Promise<void>;
		onDelete?: (id: number | string) => Promise<void>;
	} = $props();

	let name = $state('');
	let selectedCardTypeId = $state<number | string>('');
	let isSubmitting = $state(false);
	let isDeleting = $state(false);
	let errorMessage = $state<string | null>(null);

	// Type-to-delete confirmation state
	let showDeleteDialog = $state(false);
	let deleteInput = $state('');

	const canConfirmDelete = $derived(deleteInput.trim() === 'DELETE');

	// Synchronize name and card type when modal opens or initialDeck changes
	$effect(() => {
		if (isOpen) {
			errorMessage = null;
			name = initialDeck?.name || '';
			selectedCardTypeId = initialDeck?.config?.card_type_id || (cardTypes?.[0]?.id ?? '');
			showDeleteDialog = false;
			deleteInput = '';
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName) {
			errorMessage = 'Deck name is required.';
			return;
		}

		errorMessage = null;
		isSubmitting = true;
		try {
			await onSave({
				name: trimmedName,
				description: initialDeck?.description ?? null,
				parent_id: initialDeck?.parent_id ?? parentId ?? null,
				config: {
					...(initialDeck?.config ?? {
						new_cards_per_day: 20,
						max_reviews_per_day: 200,
						learn_steps_minutes: [1, 10],
						leech_threshold: 8
					}),
					card_type_id: selectedCardTypeId || null
				}
			});
			onClose();
		} catch (err: any) {
			errorMessage = err?.message || 'Failed to save deck.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleOpenDeleteConfirm() {
		deleteInput = '';
		showDeleteDialog = true;
	}

	function handleCancelDeleteConfirm() {
		showDeleteDialog = false;
		deleteInput = '';
	}

	async function handleConfirmDelete() {
		if (!initialDeck || !onDelete || !canConfirmDelete) return;
		errorMessage = null;
		isDeleting = true;
		try {
			await onDelete(initialDeck.id);
			showDeleteDialog = false;
			onClose();
		} catch (err: any) {
			errorMessage = err?.message || 'Failed to delete deck.';
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
		class="deck-modal"
		role="dialog"
		aria-labelledby="deck-modal-title"
		aria-modal="true"
		transition:scale={{ start: 0.96, duration: 180, opacity: 0, easing: cubicOut }}
	>
		<div class="modal-header">
			<h2 id="deck-modal-title" class="modal-title">
				{initialDeck ? 'Edit Deck' : 'Create Deck'}
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

		<form onsubmit={handleSubmit} class="deck-form">
			<div class="form-field-group">
				<label for="deck-name" class="form-field-label">Deck Name</label>
				<input
					id="deck-name"
					type="text"
					class="form-input"
					bind:value={name}
					placeholder="Deck name"
					required
					autofocus
				/>
			</div>

			<div class="form-field-group">
				<label for="deck-card-type" class="form-field-label">Card Type Schema</label>
				<select
					id="deck-card-type"
					class="form-select"
					bind:value={selectedCardTypeId}
				>
					{#if cardTypes.length === 0}
						<option value="">Default (Basic)</option>
					{:else}
						{#each cardTypes as ct (ct.id)}
							<option value={ct.id}>
								{ct.name} {ct.has_reverse ? '(Bidirectional)' : '(Forward)'}
							</option>
						{/each}
					{/if}
				</select>
				<span class="form-field-hint">All cards added under this deck will follow this schema.</span>
			</div>

			<div class="modal-actions">
				{#if initialDeck && onDelete}
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

				<div class="actions-right">
					<button
						type="button"
						class="btn btn-secondary"
						onclick={onClose}
						disabled={isSubmitting || isDeleting}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn btn-primary"
						disabled={isSubmitting || isDeleting}
					>
						{#if isSubmitting}
							<span>Saving...</span>
						{:else}
							<span>{initialDeck ? 'Save' : 'Create Deck'}</span>
						{/if}
					</button>
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
							<h3 id="confirm-delete-title" class="confirm-title">Delete Deck</h3>
							<p class="confirm-desc">
								Are you sure you want to delete <strong>{initialDeck?.name}</strong>? All cards and subdecks inside will be removed.
							</p>
						</div>
					</div>

					<div class="confirm-input-wrap">
						<label for="delete-confirmation-input" class="confirm-label">
							Type <code>DELETE</code> to confirm:
						</label>
						<input
							id="delete-confirmation-input"
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
								<span>Confirm Delete</span>
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

	.deck-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 100%;
		max-width: 520px;
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
		gap: 0.75rem;
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

	.deck-form {
		display: flex;
		flex-direction: column;
		flex: 1;
		padding: 1.25rem;
		gap: 1.25rem;
	}

	.form-field-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		width: 100%;
	}

	.form-field-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.form-input,
	.form-select {
		width: 100%;
		padding: 0.625rem 0.875rem;
		font-size: 0.875rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background-color: var(--bg-primary);
		color: var(--text-primary);
		outline: none;
		font-family: inherit;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		box-sizing: border-box;
	}

	.form-input:focus,
	.form-select:focus {
		border-color: var(--primary);
		box-shadow: 0 0 0 2px rgba(var(--primary-rgb, 59, 130, 246), 0.12);
	}

	.form-field-hint {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.modal-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding-top: 0.25rem;
	}

	.actions-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: auto;
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
	}

	.btn svg {
		width: 14px;
		height: 14px;
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
		background-color: #ef4444;
		color: #ffffff;
	}

	.btn-danger:hover:not(:disabled) {
		background-color: #dc2626;
	}

	.btn-danger-ghost {
		background: transparent;
		border-color: transparent;
		color: #ef4444;
		padding: 0.375rem 0.5rem;
	}

	.btn-danger-ghost:hover:not(:disabled) {
		background-color: #fef2f2;
		color: #b91c1c;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Type-to-delete confirmation modal overlay */
	.confirm-overlay {
		position: absolute;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.25rem;
		z-index: 10;
	}

	.confirm-card {
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1.25rem;
		width: 100%;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
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
