<script lang="ts">
	let {
		tags = $bindable([]),
		tagInput = $bindable(''),
		onAddTag,
		onRemoveTag,
		onOpenTagSelector,
		onOpenTagManagement
	} = $props<{
		tags: string[];
		tagInput: string;
		onAddTag: (tag: string) => void;
		onRemoveTag: (tag: string) => void;
		onOpenTagSelector?: () => void;
		onOpenTagManagement: () => void;
	}>();

	function handleTagKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			onAddTag(tagInput);
		} else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
			onRemoveTag(tags[tags.length - 1]);
		}
	}
</script>

<div class="paper-tags-section">
	<div class="paper-tags-wrapper">
		<span class="tags-prefix-icon">#</span>
		{#each tags as tag}
			<span class="paper-tag-chip">
				{tag}
				<button
					type="button"
					class="tag-remove-btn"
					onclick={() => onRemoveTag(tag)}
					aria-label={`Remove tag ${tag}`}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</span>
		{/each}
		<input
			id="task-tag-input"
			type="text"
			class="paper-tag-input"
			bind:value={tagInput}
			onkeydown={handleTagKeyDown}
			placeholder={tags.length === 0 ? "Add tags (press Enter)..." : "Add tag..."}
		/>
	</div>

	<!-- Action Buttons -->
	<div class="tag-actions-row">
		<div class="tag-actions-group">
			<button
				type="button"
				class="manage-tags-link-btn"
				onclick={onOpenTagSelector}
				title="Open Tag Selector"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
					<line x1="7" y1="7" x2="7.01" y2="7" />
				</svg>
				<span>Select Tags</span>
			</button>

			<button
				type="button"
				class="manage-tags-link-btn subtle"
				onclick={onOpenTagManagement}
				title="Manage task categories and taxonomy"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="3" />
					<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
				</svg>
				<span>Manage</span>
			</button>
		</div>
	</div>
</div>

<style>
	.paper-tags-section {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.paper-tags-wrapper {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}

	.tags-prefix-icon {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-muted);
		margin-right: 0.125rem;
	}

	.paper-tag-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background-color: var(--bg-tertiary);
		color: var(--primary);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.125rem 0.4375rem;
		border-radius: var(--radius-sm);
	}

	.tag-remove-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		width: 10px;
		height: 10px;
		transition: color 0.12s ease;
	}

	.tag-remove-btn:hover {
		color: var(--danger);
	}

	.tag-remove-btn svg {
		width: 10px;
		height: 10px;
	}

	.paper-tag-input {
		border: none;
		outline: none;
		background: transparent;
		font-size: 0.75rem;
		color: var(--text-primary);
		min-width: 140px;
		padding: 0.125rem 0.25rem;
	}

	.paper-tag-input::placeholder {
		color: var(--text-muted);
		font-size: 0.75rem;
	}

	.tag-actions-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		margin-top: 0.25rem;
	}

	.tag-actions-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: auto;
	}

	.manage-tags-link-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: none;
		border: none;
		color: var(--primary);
		font-size: 0.6875rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0.125rem 0.25rem;
		border-radius: var(--radius-sm);
		transition: color 0.12s ease, background-color 0.12s ease;
	}

	.manage-tags-link-btn.subtle {
		color: var(--text-muted);
		font-weight: 500;
	}

	.manage-tags-link-btn:hover {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
		text-decoration: underline;
	}

	.manage-tags-link-btn svg {
		width: 12px;
		height: 12px;
	}
</style>
