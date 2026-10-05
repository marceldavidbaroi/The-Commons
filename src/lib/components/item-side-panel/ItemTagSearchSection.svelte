<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Tag, TagCategory, TagGroup } from '$lib/types/tags';

	export interface FlatTagItem {
		tag: Tag;
		category: TagCategory;
		group?: TagGroup | null;
	}

	let {
		tagSearchQuery = $bindable(''),
		isTagSearchDropdownOpen = $bindable(false),
		selectedTag = $bindable<string | null>(null),
		selectedCategoryName = '',
		selectedCategoryColor = '#F59E0B',
		activeGroup = null,
		availableCategoryTags = [],
		tagSearchResults = [],
		onSelectSearchTag,
		onSetTag,
		onRemoveTag
	} = $props<{
		tagSearchQuery: string;
		isTagSearchDropdownOpen: boolean;
		selectedTag: string | null;
		selectedCategoryName?: string;
		selectedCategoryColor?: string;
		activeGroup?: TagGroup | null;
		availableCategoryTags?: Tag[];
		tagSearchResults?: FlatTagItem[];
		onSelectSearchTag: (item: FlatTagItem) => void;
		onSetTag: (rawTag: string) => void;
		onRemoveTag: () => void;
	}>();
</script>

<!-- Smart Tag & Taxonomy Search Input -->
<div class="field-group tag-search-group">
	<label class="field-label" for="item-smart-tag-search">
		<span>Quick Tag & Taxonomy Search</span>
	</label>
	<div class="smart-search-wrapper">
		<div class="search-input-box">
			<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
			</svg>
			<input
				id="item-smart-tag-search"
				type="text"
				class="text-input search-input"
				placeholder="Search any tag (e.g. Olive Oil, Tools, Medicine)..."
				bind:value={tagSearchQuery}
				onfocus={() => (isTagSearchDropdownOpen = true)}
			/>
			{#if tagSearchQuery}
				<button
					type="button"
					class="clear-search-btn"
					onclick={() => {
						tagSearchQuery = '';
						isTagSearchDropdownOpen = false;
					}}
				>
					✕
				</button>
			{/if}
		</div>

		<!-- Autocomplete Results Dropdown -->
		{#if isTagSearchDropdownOpen && tagSearchQuery.trim()}
			<div class="search-dropdown-menu" transition:fly={{ y: -6, duration: 180, easing: cubicOut }}>
				{#if tagSearchResults.length > 0}
					{#each tagSearchResults as res}
						<button
							type="button"
							class="search-result-item"
							onclick={() => onSelectSearchTag(res)}
						>
							<div class="res-tag-info">
								<span class="res-tag-name">#{res.tag.name}</span>
								{#if selectedTag === res.tag.name}
									<span class="res-badge-added">Selected</span>
								{/if}
							</div>
							<div class="res-tag-meta">
								<span class="res-tag-cat" style="color: {res.category.color || 'var(--text-secondary)'}">
									{res.category.name}
								</span>
								{#if res.group}
									<span class="res-tag-sep">•</span>
									<span class="res-tag-group">{res.group.name}</span>
								{/if}
							</div>
						</button>
					{/each}
				{:else}
					<div class="search-no-results">
						<span>No existing tags found for "{tagSearchQuery}".</span>
						<button
							type="button"
							class="add-custom-tag-btn"
							onclick={() => {
								onSetTag(tagSearchQuery);
							}}
						>
							+ Set as custom tag "#{tagSearchQuery.trim().replace(/^#/, '')}"
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Selected Tag Chip Container -->
<div class="field-group">
	<label class="field-label" for="item-selected-tag">
		<span>Tag</span>
		{#if selectedCategoryName}
			<span class="category-indicator-badge" style="border-color: {selectedCategoryColor}; color: {selectedCategoryColor}">
				{activeGroup?.name ? `${activeGroup.name} › ` : ''}{selectedCategoryName}
			</span>
		{/if}
	</label>
	<div class="tags-input-container" id="item-selected-tag">
		{#if selectedTag}
			<span class="tag-capsule">
				<span class="tag-hash">#</span>
				<span class="tag-name">{selectedTag}</span>
				<button
					type="button"
					class="tag-remove"
					onclick={onRemoveTag}
					aria-label={`Remove tag ${selectedTag}`}
					title="Remove tag"
				>
					✕
				</button>
			</span>
		{:else}
			<span class="tag-empty-hint">No tag selected. Use search above to select a tag.</span>
		{/if}
	</div>

	<!-- Quick Tag Suggestions from Selected Category -->
	{#if availableCategoryTags.length > 0}
		<div class="tag-suggestions-row">
			<span class="suggestions-label">{selectedCategoryName || 'Category'} suggestions:</span>
			{#each availableCategoryTags as catTag}
				{#if selectedTag !== catTag.name}
					<button
						type="button"
						class="suggestion-pill"
						onclick={() => onSetTag(catTag.name)}
					>
						+ {catTag.name}
					</button>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.tag-search-group {
		margin-bottom: 0.25rem;
	}

	.smart-search-wrapper {
		position: relative;
		width: 100%;
	}

	.search-input-box {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		width: 15px;
		height: 15px;
		color: var(--text-muted);
		pointer-events: none;
	}

	.text-input,
	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.15s ease;
		box-sizing: border-box;
	}

	.search-input {
		padding-left: 2.125rem;
		padding-right: 2rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		font-size: 0.8125rem;
		transition: all 0.15s ease;
	}

	.search-input:focus {
		background: var(--bg-secondary);
		border-color: var(--primary);
	}

	.clear-search-btn {
		position: absolute;
		right: 0.625rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.75rem;
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
		border-radius: var(--radius-full);
	}

	.clear-search-btn:hover {
		color: var(--text-primary);
	}

	.search-dropdown-menu {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
		z-index: 50;
		max-height: 240px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.search-result-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--border-subtle);
		text-align: left;
		cursor: pointer;
		transition: background 0.1s ease;
		width: 100%;
	}

	.search-result-item:last-child {
		border-bottom: none;
	}

	.search-result-item:hover {
		background: var(--bg-tertiary);
	}

	.res-tag-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.res-tag-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.res-badge-added {
		font-size: 0.625rem;
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-full);
		background: color-mix(in srgb, var(--primary) 15%, transparent);
		color: var(--primary);
		font-weight: 600;
		text-transform: uppercase;
	}

	.res-tag-meta {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.6875rem;
	}

	.res-tag-cat {
		font-weight: 600;
	}

	.res-tag-sep {
		color: var(--text-muted);
	}

	.res-tag-group {
		color: var(--text-secondary);
	}

	.search-no-results {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.add-custom-tag-btn {
		background: var(--bg-tertiary);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0.375rem 0.5rem;
		color: var(--primary);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		text-align: left;
	}

	.add-custom-tag-btn:hover {
		background: color-mix(in srgb, var(--primary) 10%, transparent);
		border-color: var(--primary);
	}

	.category-indicator-badge {
		margin-left: auto;
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.0625rem 0.4375rem;
		border-radius: var(--radius-full);
		border: 1px solid currentColor;
		background: var(--bg-tertiary);
	}

	.tags-input-container {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		min-height: 38px;
	}

	.tag-capsule {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		padding: 0.1875rem 0.5rem;
		border-radius: var(--radius-full);
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.tag-hash {
		color: var(--text-muted);
		font-weight: 600;
	}

	.tag-remove {
		border: none;
		background: none;
		padding: 0;
		margin-left: 0.125rem;
		cursor: pointer;
		color: var(--text-muted);
		font-size: 0.6875rem;
		line-height: 1;
	}

	.tag-remove:hover {
		color: var(--danger, #ef4444);
	}

	.tag-empty-hint {
		font-size: 0.8125rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.tag-suggestions-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.25rem;
	}

	.suggestions-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.suggestion-pill {
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.125rem 0.4375rem;
		border-radius: var(--radius-full);
		background: var(--bg-tertiary);
		border: 1px dashed var(--border-subtle);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.suggestion-pill:hover {
		background: var(--bg-secondary);
		border-color: var(--border-focus);
		color: var(--primary);
	}
</style>
