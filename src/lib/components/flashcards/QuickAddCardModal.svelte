<script lang="ts">
	import { fade, scale } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import type { DeckRecord, CardTypeRecord } from "$lib/types/flashcards";

	let {
		isOpen = false,
		deck = null,
		decks = [],
		cardTypes = [],
		onClose,
		onSave,
	}: {
		isOpen: boolean;
		deck: DeckRecord | null;
		decks: DeckRecord[];
		cardTypes: CardTypeRecord[];
		onClose: () => void;
		onSave: (payload: {
			deckId: number | string;
			cardTypeId: number | string;
			fields: Record<string, string>;
			tags: string[];
		}) => Promise<void>;
	} = $props();

	let selectedDeckId = $state<number | string>("");
	let selectedCardTypeId = $state<number | string>("");
	let fieldValues = $state<Record<string, string>>({});
	let tagsInput = $state<string>("");
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let successBanner = $state(false);

	function resolveDeckAndType(targetDeckId?: number | string) {
		const targetId = targetDeckId || (deck ? deck.id : decks[0]?.id || "");
		selectedDeckId = targetId;

		const currentDeck = deck || decks.find((d) => String(d.id) === String(targetId));
		if (currentDeck?.config?.card_type_id) {
			selectedCardTypeId = currentDeck.config.card_type_id;
		} else if (cardTypes.length > 0) {
			selectedCardTypeId = cardTypes[0].id;
		} else {
			selectedCardTypeId = "";
		}

		// Pre-initialize empty field values for the target card type synchronously
		const ct = cardTypes.find((item) => String(item.id) === String(selectedCardTypeId)) || cardTypes[0];
		const fields = ct?.fields_schema || [
			{ name: "Front", label: "Front" },
			{ name: "Back", label: "Back" },
		];
		const initVals: Record<string, string> = {};
		for (const f of fields) {
			initVals[f.name] = "";
		}
		fieldValues = initVals;
	}

	// Synchronize on modal open only
	$effect(() => {
		if (isOpen) {
			errorMessage = null;
			successBanner = false;
			tagsInput = "";
			resolveDeckAndType(deck?.id);
		}
	});

	function handleDeckChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		resolveDeckAndType(val);
	}

	const activeCardType = $derived(
		cardTypes.find((ct) => String(ct.id) === String(selectedCardTypeId)) || cardTypes[0]
	);

	const schemaFields = $derived(
		activeCardType?.fields_schema || [
			{ name: "Front", label: "Front" },
			{ name: "Back", label: "Back" },
		]
	);

	function parseTags(input: string): string[] {
		return input
			.split(",")
			.map((t) => t.trim().toLowerCase())
			.filter((t) => t.length > 0);
	}

	async function handleSubmit(keepOpen = true) {
		if (!selectedDeckId) {
			errorMessage = "Please choose a deck.";
			return;
		}
		if (!selectedCardTypeId) {
			errorMessage = "Please choose a card type.";
			return;
		}

		const firstField = schemaFields[0]?.name;
		if (!firstField || !fieldValues[firstField]?.trim()) {
			errorMessage = `"${schemaFields[0]?.label || "Front"}" cannot be empty.`;
			return;
		}

		errorMessage = null;
		isSubmitting = true;

		try {
			await onSave({
				deckId: selectedDeckId,
				cardTypeId: selectedCardTypeId,
				fields: { ...fieldValues },
				tags: parseTags(tagsInput),
			});

			successBanner = true;

			// Reset fields for the next card immediately
			const cleared: Record<string, string> = {};
			for (const f of schemaFields) {
				cleared[f.name] = "";
			}
			fieldValues = cleared;
			tagsInput = "";

			setTimeout(() => {
				successBanner = false;
			}, 2500);

			if (!keepOpen) {
				onClose();
			} else {
				// Refocus the first input
				const firstInput = document.getElementById("quick-card-field-0");
				firstInput?.focus();
			}
		} catch (err: any) {
			errorMessage = err?.message || "Failed to create card.";
		} finally {
			isSubmitting = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			onClose();
		} else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
			e.preventDefault();
			handleSubmit(true);
		}
	}
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		transition:fade={{ duration: 150 }}
		onclick={onClose}
		role="presentation"
	>
		<div
			class="modal-box"
			transition:scale={{ duration: 180, start: 0.96, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={handleKeydown}
			role="dialog"
			aria-labelledby="quick-add-title"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- Header -->
			<div class="modal-header">
				<div class="header-titles">
					<h2 id="quick-add-title" class="title">
						Add Card
						{#if deck}
							<span class="deck-subtitle">to {deck.name}</span>
						{/if}
					</h2>
					<span class="shortcut-hint"
						>Press ⌘+Enter to save & add next</span
					>
				</div>
				<button
					type="button"
					class="close-btn"
					onclick={onClose}
					aria-label="Close modal"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>

			<!-- Success Notification -->
			{#if successBanner}
				<div class="alert-success" transition:fade={{ duration: 120 }}>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="alert-icon"
					>
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
					<span>Card saved! Ready for next card.</span>
				</div>
			{/if}

			<!-- Error message -->
			{#if errorMessage}
				<div class="alert-error" transition:fade={{ duration: 120 }}>
					<span>{errorMessage}</span>
				</div>
			{/if}

			<!-- Form Content -->
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit(false);
				}}
				class="form-body"
			>
				<!-- Deck Selector (if not fixed to a deck) -->
				{#if !deck && decks.length > 1}
					<div class="form-field">
						<label for="quick-deck-select" class="field-label"
							>Deck</label
						>
							<select
								id="quick-deck-select"
								class="select-input"
								value={selectedDeckId}
								onchange={handleDeckChange}
							>
								{#each decks as d}
									<option value={d.id}>{d.name}</option>
								{/each}
							</select>
					</div>
				{/if}

				<!-- Dynamic Schema Fields -->
				<div class="fields-stack">
					{#each schemaFields as field, idx}
						<div class="form-field">
							<label
								for="quick-card-field-{idx}"
								class="field-label"
							>
								{field.label || field.name}
								{#if idx === 0}
									<span class="required-star">*</span>
								{/if}
							</label>
							<textarea
								id="quick-card-field-{idx}"
								class="text-input"
								rows={idx < 2 ? 3 : 2}
								placeholder="Enter {field.label ||
									field.name}..."
								bind:value={fieldValues[field.name]}
								required={idx === 0}></textarea>
						</div>
					{/each}

					<!-- Tags -->
					<div class="form-field">
						<label for="quick-card-tags" class="field-label"
							>Tags (comma-separated)</label
						>
						<input
							type="text"
							id="quick-card-tags"
							class="text-input-line"
							placeholder="e.g. vocabulary, verbs, unit-1"
							bind:value={tagsInput}
						/>
					</div>
				</div>

				<!-- Footer Actions -->
				<div class="modal-footer">
					<button
						type="button"
						class="btn btn-secondary"
						onclick={onClose}
					>
						Done
					</button>

					<div class="action-buttons">
						<button
							type="button"
							class="btn btn-primary-outline"
							disabled={isSubmitting}
							onclick={() => handleSubmit(true)}
						>
							{#if isSubmitting}
								Saving...
							{:else}
								Save & Add Another
							{/if}
						</button>
						<button
							type="submit"
							class="btn btn-primary"
							disabled={isSubmitting}
						>
							Save & Close
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 1000;
	}

	.modal-box {
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16);
		width: 100%;
		max-width: 580px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
	}

	.header-titles {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.title {
		font-size: 1.0625rem;
		font-weight: 600;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.deck-subtitle {
		font-size: 0.875rem;
		font-weight: 400;
		color: var(--text-muted);
	}

	.shortcut-hint {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
	}

	.close-btn:hover {
		color: var(--text-primary);
		background: var(--bg-tertiary);
	}

	.close-btn svg {
		width: 18px;
		height: 18px;
	}

	.alert-success {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(16, 185, 129, 0.12);
		color: #10b981;
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.5rem 1.25rem;
		border-bottom: 1px solid rgba(16, 185, 129, 0.2);
	}

	.alert-icon {
		width: 14px;
		height: 14px;
	}

	.alert-error {
		background: rgba(239, 68, 68, 0.12);
		color: #ef4444;
		font-size: 0.75rem;
		padding: 0.5rem 1.25rem;
		border-bottom: 1px solid rgba(239, 68, 68, 0.2);
	}

	.form-body {
		padding: 1rem 1.25rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.config-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.fields-stack {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.3125rem;
	}

	.field-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.required-star {
		color: #ef4444;
	}

	.select-input,
	.text-input,
	.text-input-line {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0.4375rem 0.625rem;
		font-size: 0.875rem;
		color: var(--text-primary);
		font-family: inherit;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.text-input {
		resize: vertical;
		min-height: 56px;
	}

	.select-input:focus,
	.text-input:focus,
	.text-input-line:focus {
		border-color: var(--primary);
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-subtle);
		margin-top: 0.25rem;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.btn {
		font-size: 0.8125rem;
		font-weight: 500;
		padding: 0.4375rem 0.875rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.btn-secondary:hover {
		color: var(--text-primary);
		background: var(--bg-secondary);
	}

	.btn-primary-outline {
		background: transparent;
		border: 1px solid var(--primary);
		color: var(--primary);
	}

	.btn-primary-outline:hover {
		background: rgba(59, 130, 246, 0.08);
	}

	.btn-primary {
		background: var(--primary);
		border: 1px solid var(--primary);
		color: #ffffff;
	}

	.btn-primary:hover {
		opacity: 0.92;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
