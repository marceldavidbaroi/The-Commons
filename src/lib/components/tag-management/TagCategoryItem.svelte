<script lang="ts">
	import type { Tag, TagCategory } from '$lib/types/tags';
	import { PRESET_COLORS } from './constants';

	let {
		category,
		editingCategoryId,
		editCategoryName = $bindable(''),
		editCategoryColor = $bindable('#6366F1'),
		editingTagId,
		editTagName = $bindable(''),
		isAddingTag,
		newTagName = $bindable(''),
		isSavingTag,
		onStartEditCategory,
		onCancelEditCategory,
		onSaveCategory,
		onDeleteCategory,
		onStartAddTag,
		onCancelAddTag,
		onCreateTag,
		onStartEditTag,
		onCancelEditTag,
		onSaveTag,
		onDeleteTag
	} = $props<{
		category: TagCategory;
		editingCategoryId: number | string | null;
		editCategoryName: string;
		editCategoryColor: string;
		editingTagId: number | string | null;
		editTagName: string;
		isAddingTag: boolean;
		newTagName: string;
		isSavingTag: boolean;
		onStartEditCategory: (category: TagCategory) => void;
		onCancelEditCategory: () => void;
		onSaveCategory: (catId: number | string) => void;
		onDeleteCategory: (catId: number | string) => void;
		onStartAddTag: (catId: number | string) => void;
		onCancelAddTag: () => void;
		onCreateTag: (catId: number | string) => void;
		onStartEditTag: (tag: Tag) => void;
		onCancelEditTag: () => void;
		onSaveTag: (tagId: number | string, catId: number | string) => void;
		onDeleteTag: (tagId: number | string, catId: number | string) => void;
	}>();

	const isEditingCat = $derived(editingCategoryId === category.id);
	const catColor = $derived(category.color || '#6366F1');
</script>

<div class="category-block">
	<!-- Category Header Card -->
	<div class="category-header">
		{#if isEditingCat}
			<!-- Inline Category Edit Form -->
			<div class="inline-edit-category">
				<input
					type="text"
					class="text-input compact"
					bind:value={editCategoryName}
					placeholder="Category name"
					autofocus
					onkeydown={(e) => e.key === 'Enter' && onSaveCategory(category.id)}
				/>
				<div class="color-palette-picker mini">
					{#each PRESET_COLORS as color}
						<button
							type="button"
							class="color-dot mini"
							class:selected={editCategoryColor === color}
							style="background-color: {color};"
							onclick={() => (editCategoryColor = color)}
							aria-label="Select color {color}"
						></button>
					{/each}
				</div>
				<div class="inline-edit-actions">
					<button
						type="button"
						class="btn btn-secondary compact mini-btn"
						onclick={onCancelEditCategory}
					>
						Cancel
					</button>
					<button
						type="button"
						class="btn btn-primary compact mini-btn"
						onclick={() => onSaveCategory(category.id)}
						disabled={!editCategoryName.trim()}
					>
						Save
					</button>
				</div>
			</div>
		{:else}
			<div class="category-info">
				<span class="category-color-bar" style="background-color: {catColor};"></span>
				<div class="category-name-group">
					<span class="category-name">{category.name}</span>
					{#if category.is_system}
						<span class="system-badge" title="Default System Category">System</span>
					{/if}
					<span class="category-count">
						{(category.tags || []).length} {(category.tags || []).length === 1 ? 'tag' : 'tags'}
					</span>
				</div>
			</div>

			<div class="category-actions">
				<button
					type="button"
					class="cat-action-btn"
					onclick={() => onStartAddTag(category.id)}
					title="Add tag to {category.name}"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					<span>Tag</span>
				</button>

				{#if !category.is_system}
					<button
						type="button"
						class="icon-action-btn"
						onclick={() => onStartEditCategory(category)}
						title="Edit category"
						aria-label="Edit category {category.name}"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
					</button>

					<button
						type="button"
						class="icon-action-btn delete-btn"
						onclick={() => onDeleteCategory(category.id)}
						title="Delete category"
						aria-label="Delete category {category.name}"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="3 6 5 6 21 6" />
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						</svg>
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Tags Pool for this Category -->
	<div class="tags-pool">
		{#if (category.tags || []).length === 0 && !isAddingTag}
			<div class="no-tags-hint">
				<span>No tags in this category.</span>
				<button
					type="button"
					class="link-btn"
					onclick={() => onStartAddTag(category.id)}
				>
					+ Add a tag
				</button>
			</div>
		{:else}
			<div class="tags-chip-list">
				{#each category.tags || [] as tag (tag.id)}
					{@const isEditingThisTag = editingTagId === tag.id}
					{@const tagPillColor = tag.color || catColor}
					{@const isSystemTag = Boolean(tag.is_system)}

					{#if isEditingThisTag}
						<div class="tag-edit-inline">
							<input
								type="text"
								class="tag-inline-input"
								bind:value={editTagName}
								autofocus
								onkeydown={(e) => {
									if (e.key === 'Enter') onSaveTag(tag.id, category.id);
									if (e.key === 'Escape') onCancelEditTag();
								}}
							/>
							<button
								type="button"
								class="tag-pill-action"
								onclick={() => onSaveTag(tag.id, category.id)}
								title="Save tag"
							>
								✓
							</button>
							<button
								type="button"
								class="tag-pill-action"
								onclick={onCancelEditTag}
								title="Cancel"
							>
								✕
							</button>
						</div>
					{:else}
						<div
							class="tag-chip"
							class:system-tag-chip={isSystemTag}
							style="--tag-accent: {tagPillColor};"
						>
							<span class="tag-hash">#</span>
							<span class="tag-title">{tag.name}</span>

							{#if !isSystemTag}
								<div class="tag-chip-actions">
									<button
										type="button"
										class="chip-mini-btn"
										onclick={() => onStartEditTag(tag)}
										title="Edit tag"
										aria-label="Edit {tag.name}"
									>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M12 20h9" />
											<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
										</svg>
									</button>
									<button
										type="button"
										class="chip-mini-btn delete"
										onclick={() => onDeleteTag(tag.id, category.id)}
										title="Delete tag"
										aria-label="Delete {tag.name}"
									>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<line x1="18" y1="6" x2="6" y2="18" />
											<line x1="6" y1="6" x2="18" y2="18" />
										</svg>
									</button>
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		{/if}

		<!-- Inline Add Tag Form for this category -->
		{#if isAddingTag}
			<div class="add-tag-box">
				<div class="add-tag-input-row">
					<span class="add-tag-prefix">#</span>
					<input
						type="text"
						class="add-tag-input"
						bind:value={newTagName}
						placeholder="Tag name (e.g. Deep Focus, Urgent)..."
						autofocus
						onkeydown={(e) => {
							if (e.key === 'Enter') onCreateTag(category.id);
							if (e.key === 'Escape') onCancelAddTag();
						}}
					/>
				</div>

				<div class="add-tag-actions">
					<button
						type="button"
						class="btn btn-secondary compact mini-btn"
						onclick={onCancelAddTag}
					>
						Cancel
					</button>
					<button
						type="button"
						class="btn btn-primary compact mini-btn"
						disabled={!newTagName.trim() || isSavingTag}
						onclick={() => onCreateTag(category.id)}
					>
						{isSavingTag ? 'Adding...' : 'Add Tag'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.category-block {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		overflow: hidden;
		transition: border-color 0.15s ease;
	}

	.category-block:hover {
		border-color: var(--border-focus);
	}

	.category-header {
		padding: 0.625rem 0.875rem;
		background-color: var(--bg-tertiary);
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.category-info {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-width: 0;
	}

	.category-color-bar {
		width: 4px;
		height: 16px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.category-name-group {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
	}

	.category-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.system-badge {
		font-size: 0.625rem;
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.04em;
		background-color: var(--bg-surface);
		color: var(--text-secondary);
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-sm);
		line-height: 1.2;
		border: 1px solid var(--border-subtle);
	}

	.category-count {
		font-size: 0.6875rem;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.category-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.cat-action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--primary);
		background-color: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		padding: 0.1875rem 0.4375rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}

	.cat-action-btn:hover {
		background-color: var(--bg-surface);
		border-color: var(--primary);
	}

	.cat-action-btn svg {
		width: 11px;
		height: 11px;
	}

	.icon-action-btn {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease;
		padding: 0;
	}

	.icon-action-btn:hover {
		background-color: var(--bg-primary);
		color: var(--text-primary);
	}

	.icon-action-btn.delete-btn:hover {
		color: var(--danger);
		background-color: #fee2e2;
	}

	.icon-action-btn svg {
		width: 13px;
		height: 13px;
	}

	.inline-edit-category {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
	}

	.inline-edit-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: auto;
	}

	.tags-pool {
		padding: 0.75rem 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.no-tags-hint {
		font-size: 0.75rem;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--primary);
		font-weight: 500;
		cursor: pointer;
		padding: 0;
	}

	.link-btn:hover {
		text-decoration: underline;
	}

	.tags-chip-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.tag-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background-color: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-left: 3px solid var(--tag-accent, var(--primary));
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		color: var(--text-primary);
		transition: border-color 0.15s ease, background-color 0.15s ease;
	}

	.tag-chip:hover {
		border-color: var(--tag-accent, var(--primary));
		background-color: var(--bg-surface);
	}

	.tag-hash {
		font-size: 0.6875rem;
		color: var(--tag-accent, var(--text-muted));
		font-weight: 600;
	}

	.tag-title {
		font-weight: 500;
	}

	.tag-chip-actions {
		display: inline-flex;
		align-items: center;
		gap: 0.125rem;
		margin-left: 0.25rem;
		opacity: 0.7;
	}

	.tag-chip:hover .tag-chip-actions {
		opacity: 1;
	}

	.chip-mini-btn {
		width: 16px;
		height: 16px;
		border-radius: 3px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		transition: background-color 0.1s ease, color 0.1s ease;
	}

	.chip-mini-btn:hover {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.chip-mini-btn.delete:hover {
		color: var(--danger);
		background-color: #fee2e2;
	}

	.chip-mini-btn svg {
		width: 10px;
		height: 10px;
	}

	.tag-edit-inline {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--primary);
		border-radius: var(--radius-sm);
		padding: 0.125rem 0.25rem;
	}

	.tag-inline-input {
		border: none;
		background: transparent;
		font-size: 0.75rem;
		color: var(--text-primary);
		outline: none;
		width: 80px;
	}

	.tag-pill-action {
		background: none;
		border: none;
		font-size: 0.75rem;
		cursor: pointer;
		color: var(--text-secondary);
		padding: 0 0.125rem;
	}

	.tag-pill-action:hover {
		color: var(--primary);
	}

	.add-tag-box {
		background-color: var(--bg-primary);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		animation: fadeIn 0.12s ease-out;
	}

	.add-tag-input-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
	}

	.add-tag-prefix {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.add-tag-input {
		width: 100%;
		border: none;
		background: transparent;
		font-size: 0.8125rem;
		color: var(--text-primary);
		outline: none;
	}

	.add-tag-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
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

	.text-input.compact {
		padding: 0.25rem 0.5rem;
		font-size: 0.8125rem;
	}

	.color-palette-picker.mini {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.color-dot.mini {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		padding: 0;
		transition: transform 0.1s ease, border-color 0.1s ease;
	}

	.color-dot.mini:hover {
		transform: scale(1.15);
	}

	.color-dot.mini.selected {
		border-color: var(--text-primary);
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

	.btn.mini-btn {
		padding: 0.1875rem 0.4375rem;
		font-size: 0.6875rem;
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
</style>
