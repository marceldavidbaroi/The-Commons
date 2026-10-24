<script lang="ts">
	import { goto } from '$app/navigation';
	import { flashcardsStore } from '$lib/state/flashcards.svelte';
	import type { FieldSchemaItem } from '$lib/types/flashcards';

	let name = $state('');
	let hasReverse = $state(false);
	let fields = $state<FieldSchemaItem[]>([
		{ name: 'Front', label: 'Front (Prompt)' },
		{ name: 'Back', label: 'Back (Answer)' }
	]);
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	// Drag & Drop tracking
	let draggedIndex = $state<number | null>(null);

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
			errorMessage = 'At least one field is required in the schema.';
			return;
		}
		errorMessage = null;
		fields = fields.filter((_, i) => i !== index);
	}

	function moveField(fromIndex: number, toIndex: number) {
		if (toIndex < 0 || toIndex >= fields.length || fromIndex === toIndex) return;
		const updated = [...fields];
		const [moved] = updated.splice(fromIndex, 1);
		updated.splice(toIndex, 0, moved);
		fields = updated;
	}

	function handleDragStart(index: number) {
		draggedIndex = index;
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
	}

	function handleDrop(e: DragEvent, targetIndex: number) {
		e.preventDefault();
		if (draggedIndex !== null && draggedIndex !== targetIndex) {
			moveField(draggedIndex, targetIndex);
		}
		draggedIndex = null;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) {
			errorMessage = 'Card Type Name is required.';
			return;
		}

		if (fields.length === 0) {
			errorMessage = 'At least one field is required.';
			return;
		}

		// Ensure field names are valid and unique
		const names = new Set<string>();
		for (const f of fields) {
			const cleanName = f.name.trim();
			if (!cleanName) {
				errorMessage = 'All fields must have a non-empty key identifier.';
				return;
			}
			if (names.has(cleanName.toLowerCase())) {
				errorMessage = `Duplicate field key "${cleanName}". Field keys must be unique.`;
				return;
			}
			names.add(cleanName.toLowerCase());
		}

		errorMessage = null;
		isSubmitting = true;

		try {
			const cleanedFields = fields.map((f) => ({
				name: f.name.trim(),
				label: f.label.trim() || f.name.trim()
			}));

			await flashcardsStore.createCardType({
				name: name.trim(),
				fields_schema: cleanedFields,
				has_reverse: hasReverse
			});

			goto('/flashcards');
		} catch (err: any) {
			errorMessage = err?.message || 'Failed to create card type.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>New Card Type — The Commons</title>
</svelte:head>

<div class="schema-builder-page">
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
				<h1 class="page-title">New Card Type</h1>
				<span class="subtitle">Custom schema builder with bidirectional generation</span>
			</div>
		</div>
	</header>

	<div class="builder-content">
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

		<form onsubmit={handleSubmit} class="builder-form">
			<!-- Section 1: Basic Settings -->
			<div class="form-card">
				<div class="form-group">
					<label for="type-name" class="form-label">
						Card Type Name <span class="required">*</span>
					</label>
					<input
						id="type-name"
						type="text"
						class="form-input"
						bind:value={name}
						placeholder="e.g. Basic, Vocabulary Pair, Cloze Passage, Anatomy"
						required
						autofocus
					/>
				</div>

				<!-- Bidirectional toggle switch -->
				<div class="toggle-card">
					<div class="toggle-info">
						<span class="toggle-title">Bidirectional Card Generation (`has_reverse`)</span>
						<p class="toggle-desc">
							When enabled, creating a note will automatically generate two complementary cards: Forward (Card 1) and Reverse (Card 2).
						</p>
					</div>
					<label class="switch">
						<input type="checkbox" bind:checked={hasReverse} />
						<span class="slider"></span>
					</label>
				</div>
			</div>

			<!-- Section 2: Dynamic Schema Fields -->
			<div class="form-card">
				<div class="section-header">
					<div>
						<h2 class="section-heading">Schema Fields ({fields.length})</h2>
						<p class="section-subheading">
							Define the structured data slots. Drag items or use arrows to rearrange presentation order.
						</p>
					</div>
					<button
						type="button"
						class="btn btn-secondary btn-sm"
						onclick={addField}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						<span>Add Field</span>
					</button>
				</div>

				<div class="fields-list" role="list">
					{#each fields as field, index (index)}
						<div
							class="field-row"
							class:is-dragging={draggedIndex === index}
							draggable="true"
							ondragstart={() => handleDragStart(index)}
							ondragover={(e) => handleDragOver(e, index)}
							ondrop={(e) => handleDrop(e, index)}
							role="listitem"
						>
							<!-- Drag Handle -->
							<div class="drag-handle" title="Drag to reorder" aria-hidden="true">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="9" cy="5" r="1" />
									<circle cx="9" cy="12" r="1" />
									<circle cx="9" cy="19" r="1" />
									<circle cx="15" cy="5" r="1" />
									<circle cx="15" cy="12" r="1" />
									<circle cx="15" cy="19" r="1" />
								</svg>
							</div>

							<!-- Index Indicator -->
							<span class="field-index">#{index + 1}</span>

							<!-- Field Key (Storage identifier) -->
							<div class="field-input-group">
								<label for={`field-key-${index}`} class="field-sublabel">Key</label>
								<input
									id={`field-key-${index}`}
									type="text"
									class="form-input form-input-mono"
									bind:value={field.name}
									placeholder="e.g. front"
									required
								/>
							</div>

							<!-- Field Label (Display name) -->
							<div class="field-input-group flex-2">
								<label for={`field-label-${index}`} class="field-sublabel">Display Label</label>
								<input
									id={`field-label-${index}`}
									type="text"
									class="form-input"
									bind:value={field.label}
									placeholder="e.g. Front (Prompt)"
								/>
							</div>

							<!-- Ordering & Removal Actions -->
							<div class="field-actions">
								<button
									type="button"
									class="btn-icon-subtle"
									title="Move up"
									disabled={index === 0}
									onclick={() => moveField(index, index - 1)}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polyline points="18 15 12 9 6 15" />
									</svg>
								</button>
								<button
									type="button"
									class="btn-icon-subtle"
									title="Move down"
									disabled={index === fields.length - 1}
									onclick={() => moveField(index, index + 1)}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polyline points="6 9 12 15 18 9" />
									</svg>
								</button>
								<button
									type="button"
									class="btn-icon-danger"
									title="Remove field"
									disabled={fields.length <= 1}
									onclick={() => removeField(index)}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polyline points="3 6 5 6 21 6" />
										<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
									</svg>
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Form Submission Toolbar -->
			<div class="form-actions-bar">
				<a href="/flashcards" class="btn btn-secondary">Cancel</a>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						<span>Saving Schema...</span>
					{:else}
						<span>Save Card Type</span>
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>

<style>
	.schema-builder-page {
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

	.builder-content {
		max-width: 680px;
		width: 100%;
		margin: 1.25rem auto;
		padding: 0 1rem;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.875rem;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: var(--radius-sm);
		color: #b91c1c;
		font-size: 0.75rem;
	}

	.error-banner svg {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}

	.builder-form {
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

	.form-input {
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

	.form-input-mono {
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
	}

	.form-input:focus {
		border-color: var(--primary);
		box-shadow: 0 0 0 2px rgba(var(--primary-rgb, 59, 130, 246), 0.12);
	}

	.toggle-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.875rem;
		background-color: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.toggle-info {
		flex: 1;
		min-width: 0;
	}

	.toggle-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		display: block;
	}

	.toggle-desc {
		font-size: 0.6875rem;
		color: var(--text-secondary);
		margin: 0.1875rem 0 0 0;
		line-height: 1.35;
	}

	/* Toggle Switch CSS */
	.switch {
		position: relative;
		display: inline-block;
		width: 38px;
		height: 20px;
		flex-shrink: 0;
	}

	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		inset: 0;
		background-color: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		transition: 0.2s;
		border-radius: 20px;
	}

	.slider:before {
		position: absolute;
		content: "";
		height: 14px;
		width: 14px;
		left: 2px;
		bottom: 2px;
		background-color: var(--text-muted);
		transition: 0.2s;
		border-radius: 50%;
	}

	input:checked + .slider {
		background-color: var(--primary);
		border-color: var(--primary);
	}

	input:checked + .slider:before {
		transform: translateX(18px);
		background-color: #ffffff;
	}

	/* Dynamic fields */
	.section-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid var(--border-subtle);
		padding-bottom: 0.75rem;
	}

	.section-heading {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.section-subheading {
		font-size: 0.6875rem;
		color: var(--text-secondary);
		margin: 0.125rem 0 0 0;
	}

	.fields-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.625rem;
		background-color: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		transition: border-color 0.15s ease, background-color 0.15s ease;
	}

	.field-row:hover {
		border-color: var(--border-focus);
	}

	.field-row.is-dragging {
		opacity: 0.5;
		border-style: dashed;
	}

	.drag-handle {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		cursor: grab;
		flex-shrink: 0;
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.drag-handle svg {
		width: 14px;
		height: 14px;
	}

	.field-index {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--text-muted);
		min-width: 18px;
		flex-shrink: 0;
	}

	.field-input-group {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		flex: 1;
	}

	.field-input-group.flex-2 {
		flex: 1.5;
	}

	.field-sublabel {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.field-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.btn-icon-subtle,
	.btn-icon-danger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-xs, 3px);
		background-color: var(--bg-secondary);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-icon-subtle:hover:not(:disabled) {
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.btn-icon-danger:hover:not(:disabled) {
		color: #dc2626;
		border-color: #fca5a5;
		background-color: #fef2f2;
	}

	.btn-icon-subtle:disabled,
	.btn-icon-danger:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.btn-icon-subtle svg,
	.btn-icon-danger svg {
		width: 13px;
		height: 13px;
	}

	.form-actions-bar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0.75rem 0;
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
