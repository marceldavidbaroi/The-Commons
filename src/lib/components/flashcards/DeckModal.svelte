<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { DeckRecord } from '$lib/types/flashcards';

	let {
		isOpen = false,
		decks = [],
		initialDeck = null,
		onClose,
		onSave
	}: {
		isOpen: boolean;
		decks: DeckRecord[];
		initialDeck?: DeckRecord | null;
		onClose: () => void;
		onSave: (deckData: {
			name: string;
			description: string | null;
			parent_id: string | null;
			config: {
				new_cards_per_day: number;
				max_reviews_per_day: number;
				learn_steps_minutes: number[];
				leech_threshold: number;
			};
		}) => Promise<void>;
	} = $props();

	let name = $state('');
	let description = $state('');
	let parentId = $state<string | null>(null);
	let newCardsPerDay = $state(20);
	let maxReviewsPerDay = $state(200);
	let leechThreshold = $state(8);
	let learnStepsMinutesStr = $state('1, 10');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	// Synchronize initial state when modal opens or initialDeck changes
	$effect(() => {
		if (isOpen) {
			errorMessage = null;
			if (initialDeck) {
				name = initialDeck.name;
				description = initialDeck.description || '';
				parentId = initialDeck.parent_id || null;
				newCardsPerDay = initialDeck.config?.new_cards_per_day ?? 20;
				maxReviewsPerDay = initialDeck.config?.max_reviews_per_day ?? 200;
				leechThreshold = initialDeck.config?.leech_threshold ?? 8;
				learnStepsMinutesStr = (initialDeck.config?.learn_steps_minutes || [1, 10]).join(', ');
			} else {
				name = '';
				description = '';
				parentId = null;
				newCardsPerDay = 20;
				maxReviewsPerDay = 200;
				leechThreshold = 8;
				learnStepsMinutesStr = '1, 10';
			}
		}
	});

	// Candidate parent decks (exclude self if editing)
	const parentDeckOptions = $derived(
		decks.filter((d) => !initialDeck || d.id !== initialDeck.id)
	);

	function parseSteps(str: string): number[] {
		const steps = str
			.split(',')
			.map((s) => parseInt(s.trim(), 10))
			.filter((n) => !isNaN(n) && n > 0);
		return steps.length > 0 ? steps : [1, 10];
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) {
			errorMessage = 'Deck name is required.';
			return;
		}

		errorMessage = null;
		isSubmitting = true;
		try {
			await onSave({
				name: name.trim(),
				description: description.trim() ? description.trim() : null,
				parent_id: parentId || null,
				config: {
					new_cards_per_day: Math.max(0, Number(newCardsPerDay) || 20),
					max_reviews_per_day: Math.max(0, Number(maxReviewsPerDay) || 200),
					learn_steps_minutes: parseSteps(learnStepsMinutesStr),
					leech_threshold: Math.max(1, Number(leechThreshold) || 8)
				}
			});
			onClose();
		} catch (err: any) {
			errorMessage = err?.message || 'Failed to save deck.';
		} finally {
			isSubmitting = false;
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
			<div class="header-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="4" width="18" height="16" rx="2" />
					<line x1="7" y1="8" x2="17" y2="8" />
					<line x1="7" y1="12" x2="13" y2="12" />
				</svg>
			</div>
			<div class="header-title-box">
				<h2 id="deck-modal-title" class="modal-title">
					{initialDeck ? 'Edit Deck' : 'Create Deck'}
				</h2>
				<p class="modal-subtitle">
					Organize flashcards into hierarchical collections with custom quotas.
				</p>
			</div>
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
			<div class="form-body">
				<!-- Name -->
				<div class="form-group">
					<label for="deck-name" class="form-label">
						Deck Name <span class="required">*</span>
					</label>
					<input
						id="deck-name"
						type="text"
						class="form-input"
						bind:value={name}
						placeholder="e.g. Spanish Vocabulary or Computer Systems"
						required
						autofocus
					/>
				</div>

				<!-- Description -->
				<div class="form-group">
					<label for="deck-desc" class="form-label">Description (Optional)</label>
					<textarea
						id="deck-desc"
						class="form-textarea"
						bind:value={description}
						placeholder="Brief summary of what this deck covers..."
						rows="2"
					></textarea>
				</div>

				<!-- Parent Deck -->
				<div class="form-group">
					<label for="deck-parent" class="form-label">Parent Deck</label>
					<select id="deck-parent" class="form-select" bind:value={parentId}>
						<option value={null}>None (Top Level Root Deck)</option>
						{#each parentDeckOptions as parent (parent.id)}
							<option value={parent.id}>{parent.name}</option>
						{/each}
					</select>
				</div>

				<!-- Configuration Section -->
				<div class="config-section">
					<h3 class="section-title">Daily Study Quotas & Spaced Repetition</h3>
					
					<div class="grid-2col">
						<div class="form-group">
							<label for="new-cards-quota" class="form-label">New Cards / Day</label>
							<input
								id="new-cards-quota"
								type="number"
								min="0"
								max="1000"
								class="form-input"
								bind:value={newCardsPerDay}
							/>
							<span class="field-hint">Max new cards introduced per day.</span>
						</div>

						<div class="form-group">
							<label for="max-reviews-quota" class="form-label">Max Reviews / Day</label>
							<input
								id="max-reviews-quota"
								type="number"
								min="0"
								max="5000"
								class="form-input"
								bind:value={maxReviewsPerDay}
							/>
							<span class="field-hint">Cap on daily retention reviews.</span>
						</div>
					</div>

					<div class="grid-2col">
						<div class="form-group">
							<label for="leech-threshold" class="form-label">Leech Threshold</label>
							<input
								id="leech-threshold"
								type="number"
								min="1"
								max="100"
								class="form-input"
								bind:value={leechThreshold}
							/>
							<span class="field-hint">Lapses before card is auto-suspended.</span>
						</div>

						<div class="form-group">
							<label for="learn-steps" class="form-label">Learn Steps (minutes)</label>
							<input
								id="learn-steps"
								type="text"
								class="form-input"
								bind:value={learnStepsMinutesStr}
								placeholder="1, 10"
							/>
							<span class="field-hint">Comma-separated step delays.</span>
						</div>
					</div>
				</div>
			</div>

			<div class="modal-actions">
				<button
					type="button"
					class="btn btn-secondary"
					onclick={onClose}
					disabled={isSubmitting}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						<span>Saving...</span>
					{:else}
						<span>{initialDeck ? 'Save Changes' : 'Create Deck'}</span>
					{/if}
				</button>
			</div>
		</form>
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
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
		flex-shrink: 0;
	}

	.header-icon svg {
		width: 18px;
		height: 18px;
	}

	.header-title-box {
		flex: 1;
		min-width: 0;
	}

	.modal-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.modal-subtitle {
		font-size: 0.6875rem;
		color: var(--text-secondary);
		margin: 0.125rem 0 0 0;
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

	.required {
		color: #dc2626;
	}

	.form-input,
	.form-select,
	.form-textarea {
		width: 100%;
		padding: 0.4375rem 0.625rem;
		font-size: 0.8125rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background-color: var(--bg-primary);
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		box-sizing: border-box;
	}

	.form-input:focus,
	.form-select:focus,
	.form-textarea:focus {
		border-color: var(--primary);
		box-shadow: 0 0 0 2px rgba(var(--primary-rgb, 59, 130, 246), 0.12);
	}

	.form-textarea {
		resize: vertical;
		min-height: 52px;
	}

	.config-section {
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		margin: 0;
	}

	.grid-2col {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.field-hint {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.modal-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0.875rem 1.25rem;
		background-color: var(--bg-secondary);
		border-top: 1px solid var(--border-subtle);
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

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
