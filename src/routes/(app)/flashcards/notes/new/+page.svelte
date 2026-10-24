<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { flashcardsStore } from '$lib/state/flashcards.svelte';
	import type { CardTypeRecord, DeckRecord } from '$lib/types/flashcards';

	let selectedDeckId = $state<string>('');
	let selectedCardTypeId = $state<string>('');
	let fieldValues = $state<Record<string, string>>({});
	let tagsInput = $state<string>('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	onMount(async () => {
		if (flashcardsStore.decks.length === 0 || flashcardsStore.cardTypes.length === 0) {
			await flashcardsStore.loadHubData();
		}
		if (flashcardsStore.decks.length > 0 && !selectedDeckId) {
			selectedDeckId = flashcardsStore.decks[0].id;
		}
		if (flashcardsStore.cardTypes.length > 0 && !selectedCardTypeId) {
			selectedCardTypeId = flashcardsStore.cardTypes[0].id;
		}
	});

	// Currently active Card Type entity
	const selectedCardType = $derived<CardTypeRecord | undefined>(
		flashcardsStore.cardTypes.find((ct) => ct.id === selectedCardTypeId)
	);

	// Reset or populate field inputs whenever card type changes
	$effect(() => {
		const ct = selectedCardType;
		if (ct && ct.fields_schema) {
			const initial: Record<string, string> = {};
			for (const f of ct.fields_schema) {
				initial[f.name] = fieldValues[f.name] || '';
			}
			fieldValues = initial;
		}
	});

	// Live preview derivations
	const willGenerateCardsCount = $derived(
		selectedCardType?.has_reverse ? 2 : 1
	);

	const previewFront = $derived.by(() => {
		const ct = selectedCardType;
		if (!ct || !ct.fields_schema || ct.fields_schema.length === 0) return '';
		const firstKey = ct.fields_schema[0].name;
		return fieldValues[firstKey] || '';
	});

	const previewBack = $derived.by(() => {
		const ct = selectedCardType;
		if (!ct || !ct.fields_schema || ct.fields_schema.length < 2) return '';
		const secondKey = ct.fields_schema[1].name;
		return fieldValues[secondKey] || '';
	});

	function parseTags(input: string): string[] {
		return input
			.split(',')
			.map((t) => t.trim().toLowerCase())
			.filter((t) => t.length > 0);
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!selectedDeckId) {
			errorMessage = 'Please select a deck.';
			return;
		}
		if (!selectedCardTypeId) {
			errorMessage = 'Please select a card type.';
			return;
		}

		// Validate non-empty content in at least the first field
		const ct = selectedCardType;
		if (!ct || !ct.fields_schema || ct.fields_schema.length === 0) {
			errorMessage = 'Invalid card type schema.';
			return;
		}

		const firstFieldName = ct.fields_schema[0].name;
		if (!fieldValues[firstFieldName]?.trim()) {
			errorMessage = `The primary field "${ct.fields_schema[0].label || firstFieldName}" cannot be blank.`;
			return;
		}

		errorMessage = null;
		successMessage = null;
		isSubmitting = true;

		try {
			const tags = parseTags(tagsInput);
			await flashcardsStore.createFlashcardNote(
				selectedDeckId,
				selectedCardTypeId,
				fieldValues,
				tags
			);

			successMessage = `Successfully created note and provisioned ${willGenerateCardsCount} card(s)!`;
			
			// Reset fields for convenient rapid entry
			const resetValues: Record<string, string> = {};
			for (const f of ct.fields_schema) {
				resetValues[f.name] = '';
			}
			fieldValues = resetValues;
			tagsInput = '';
		} catch (err: any) {
			errorMessage = err?.message || 'Failed to create flashcard note.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Add Flashcard Note — The Commons</title>
</svelte:head>

<div class="note-creator-page">
	<!-- Compact Tier 1 Header -->
	<header class="tier-header">
		<div class="header-left">
			<a href="/flashcards" class="back-link" title="Return to Flashcards">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="19" y1="12" x2="5" y2="12" />
					<polyline points="12 19 5 12 12 5" />
				</svg>
			</a>
			<div class="header-titles">
				<h1 class="page-title">Add Flashcard Note</h1>
				<span class="subtitle">Dynamic schema note ingestion with instant card generation</span>
			</div>
		</div>
		<div class="header-right">
			<a href="/flashcards/card-types/new" class="btn btn-secondary btn-sm">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				<span>New Card Type</span>
			</a>
		</div>
	</header>

	<div class="creator-container">
		{#if errorMessage}
			<div class="banner error-banner" role="alert">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
				<span>{errorMessage}</span>
			</div>
		{/if}

		{#if successMessage}
			<div class="banner success-banner" role="status">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
				<span>{successMessage}</span>
			</div>
		{/if}

		<div class="creator-grid">
			<!-- Form Column -->
			<form onsubmit={handleSubmit} class="creator-form">
				<!-- Deck & Schema Selectors -->
				<div class="form-card">
					<div class="selectors-row">
						<div class="form-group flex-1">
							<label for="select-deck" class="form-label">Destination Deck <span class="required">*</span></label>
							<select
								id="select-deck"
								class="form-select"
								bind:value={selectedDeckId}
								required
							>
								{#each flashcardsStore.decks as deck (deck.id)}
									<option value={deck.id}>{deck.name}</option>
								{/each}
							</select>
						</div>

						<div class="form-group flex-1">
							<label for="select-type" class="form-label">Card Type Schema <span class="required">*</span></label>
							<select
								id="select-type"
								class="form-select"
								bind:value={selectedCardTypeId}
								required
							>
								{#each flashcardsStore.cardTypes as cardType (cardType.id)}
									<option value={cardType.id}>
										{cardType.name} {cardType.has_reverse ? '(Bidirectional)' : '(Forward)'}
									</option>
								{/each}
							</select>
						</div>
					</div>
				</div>

				<!-- Dynamic Fields based on selectedCardType.fields_schema -->
				<div class="form-card">
					<div class="card-heading-row">
						<h2 class="card-title">Fields ({selectedCardType?.fields_schema?.length || 0})</h2>
						{#if selectedCardType?.has_reverse}
							<span class="badge badge-reverse">
								Bidirectional (2 cards generated)
							</span>
						{:else}
							<span class="badge badge-forward">
								Forward (1 card generated)
							</span>
						{/if}
					</div>

					<div class="dynamic-fields-container">
						{#if selectedCardType && selectedCardType.fields_schema}
							{#each selectedCardType.fields_schema as field, index (field.name)}
								<div class="form-group">
									<label for={`input-${field.name}`} class="form-label">
										{field.label || field.name}
										{#if index === 0}
											<span class="required">*</span>
										{/if}
									</label>
									<textarea
										id={`input-${field.name}`}
										class="form-textarea"
										rows="3"
										bind:value={fieldValues[field.name]}
										placeholder={`Enter ${field.label || field.name}...`}
										required={index === 0}
									></textarea>
								</div>
							{/each}
						{/if}
					</div>

					<!-- Optional Tags -->
					<div class="form-group tags-group">
						<label for="tags-input" class="form-label">Tags (Optional)</label>
						<input
							id="tags-input"
							type="text"
							class="form-input"
							bind:value={tagsInput}
							placeholder="e.g. grammar, chapter-1, high-priority (comma-separated)"
						/>
					</div>
				</div>

				<!-- Actions -->
				<div class="form-actions">
					<a href="/flashcards" class="btn btn-secondary">Done</a>
					<button
						type="submit"
						class="btn btn-primary"
						disabled={isSubmitting}
					>
						{#if isSubmitting}
							<span>Adding Note...</span>
						{:else}
							<span>Save & Add Another</span>
						{/if}
					</button>
				</div>
			</form>

			<!-- Live Preview Column -->
			<div class="preview-panel">
				<h3 class="preview-header">Live Card Preview</h3>
				<p class="preview-desc">
					Shows how cards will be generated based on this note's fields.
				</p>

				<!-- Forward Card Preview -->
				<div class="card-preview">
					<div class="preview-card-tag">Card 1: Forward</div>
					<div class="preview-side">
						<div class="side-label">Front</div>
						<div class="side-content">
							{previewFront || 'Empty front...'}
						</div>
					</div>
					<div class="preview-divider"></div>
					<div class="preview-side">
						<div class="side-label">Back</div>
						<div class="side-content">
							{previewBack || 'Empty back...'}
						</div>
					</div>
				</div>

				<!-- Reverse Card Preview if applicable -->
				{#if selectedCardType?.has_reverse}
					<div class="card-preview reverse-preview">
						<div class="preview-card-tag reverse-tag">Card 2: Reverse</div>
						<div class="preview-side">
							<div class="side-label">Front</div>
							<div class="side-content">
								{previewBack || 'Empty front (reversed)...'}
							</div>
						</div>
						<div class="preview-divider"></div>
						<div class="preview-side">
							<div class="side-label">Back</div>
							<div class="side-content">
								{previewFront || 'Empty back (reversed)...'}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.note-creator-page {
		display: flex;
		flex-direction: column;
		min-height: 100%;
		background-color: var(--bg-primary);
	}

	.tier-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.25rem;
		border-bottom: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
		height: 44px;
		box-sizing: border-box;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.back-link {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-primary);
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.back-link:hover {
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.back-link svg {
		width: 15px;
		height: 15px;
	}

	.header-titles {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.page-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.subtitle {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.creator-container {
		max-width: 960px;
		width: 100%;
		margin: 1.25rem auto;
		padding: 0 1rem;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.875rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
	}

	.banner svg {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}

	.error-banner {
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		color: #b91c1c;
	}

	.success-banner {
		background-color: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: #166534;
	}

	.creator-grid {
		display: grid;
		grid-template-columns: 1fr 340px;
		gap: 1.25rem;
		align-items: start;
	}

	@media (max-width: 768px) {
		.creator-grid {
			grid-template-columns: 1fr;
		}
	}

	.creator-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.selectors-row {
		display: flex;
		gap: 0.75rem;
	}

	.flex-1 {
		flex: 1;
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
		min-height: 64px;
	}

	.card-heading-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--border-subtle);
		padding-bottom: 0.625rem;
	}

	.card-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.badge {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.125rem 0.4375rem;
		border-radius: var(--radius-sm);
	}

	.badge-reverse {
		background-color: #ede9fe;
		color: #6d28d9;
	}

	.badge-forward {
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
	}

	.dynamic-fields-container {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.tags-group {
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-subtle);
	}

	.form-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.preview-panel {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.preview-header {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.preview-desc {
		font-size: 0.6875rem;
		color: var(--text-muted);
		margin: 0;
	}

	.card-preview {
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.reverse-preview {
		border-color: #ddd6fe;
	}

	.preview-card-tag {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--primary);
	}

	.reverse-tag {
		color: #7c3aed;
	}

	.preview-side {
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
	}

	.side-label {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.side-content {
		font-size: 0.8125rem;
		color: var(--text-primary);
		white-space: pre-wrap;
		word-break: break-word;
		min-height: 1.25rem;
	}

	.preview-divider {
		height: 1px;
		background: var(--border-subtle);
		margin: 0.125rem 0;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.4375rem 0.875rem;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 0.15s ease;
		text-decoration: none;
	}

	.btn-sm {
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

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn svg {
		width: 13px;
		height: 13px;
	}
</style>
