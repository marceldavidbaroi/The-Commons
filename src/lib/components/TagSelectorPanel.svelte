<script lang="ts">
	import { onMount } from 'svelte';
	import { getSupabaseClient } from '$lib/supabase';
	import { fetchUserProfile } from '$lib/services/member-service';
	import type { Tag, TagCategory } from '$lib/types/tags';
	import { DEFAULT_TAXONOMY } from '$lib/components/tag-management/constants';

	let {
		feature = 'tasks',
		isOpen = false,
		selectedTags = $bindable([]),
		title,
		description,
		onClose,
		onSave,
		onTagsChange
	} = $props<{
		feature: string;
		isOpen: boolean;
		selectedTags?: string[];
		title?: string;
		description?: string;
		onClose: () => void;
		onSave?: (selectedTags: string[]) => void | Promise<void>;
		onTagsChange?: (selectedTags: string[]) => void;
	}>();

	const supabase = getSupabaseClient();

	let categories = $state<TagCategory[]>([]);
	let isLoading = $state(true);
	let currentUserId = $state<number | null>(null);
	let isSaving = $state(false);
	let errorMessage = $state<string | null>(null);
	let searchQuery = $state('');

	// Local tracking of selected tags inside the modal
	let localSelectedTags = $state<string[]>([]);

	// Tracking which categories have their tag creation dropdown/input open
	let addingTagCategoryId = $state<number | string | null>(null);
	let newTagName = $state('');
	let isCreatingTag = $state(false);

	// Sync local selected tags whenever modal opens or props change
	$effect(() => {
		if (isOpen) {
			localSelectedTags = [...(selectedTags || [])];
			searchQuery = '';
			errorMessage = null;
			addingTagCategoryId = null;
			newTagName = '';
		}
	});

	async function loadCategoriesAndTags() {
		isLoading = true;
		errorMessage = null;
		try {
			const profile = await fetchUserProfile();
			if (profile) {
				currentUserId = profile.id;

				try {
					await supabase.rpc('provision_feature_tag_categories', {
						p_feature: feature
					});
				} catch (rpcErr) {
					console.warn('RPC provision_feature_tag_categories skipped:', rpcErr);
				}

				const { data, error } = await supabase
					.from('tag_categories')
					.select('*, tags(*)')
					.eq('user_id', profile.id)
					.eq('feature', feature)
					.order('display_order', { ascending: true })
					.order('name', { foreignTable: 'tags', ascending: true });

				if (error) throw error;
				categories = (data as TagCategory[]) || [];
			} else {
				const featureDefaults = DEFAULT_TAXONOMY[feature] || [
					{ name: 'General', color: '#6366F1', tags: ['Default'] }
				];

				categories = featureDefaults.map((cat, idx) => ({
					id: idx + 1,
					feature,
					name: cat.name,
					color: cat.color,
					display_order: idx + 1,
					is_system: true,
					tags: cat.tags.map((tName, tIdx) => ({
						id: (idx + 1) * 100 + tIdx + 1,
						category_id: idx + 1,
						name: tName,
						color: null,
						is_system: true
					}))
				}));
			}
		} catch (err: any) {
			console.error('Error loading tag categories:', err);
			errorMessage = err.message || 'Failed to load tag categories';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadCategoriesAndTags();
	});

	// Select or deselect a tag with 1 tag per category rule
	function selectTag(category: TagCategory, tagName: string) {
		const trimmed = tagName.trim();
		if (!trimmed) return;

		const isCurrentlySelected = localSelectedTags.includes(trimmed);

		// Get all tag names belonging to this specific category
		const categoryTagNames = (category.tags || []).map((t) => t.name.toLowerCase());

		// Remove any existing selection from this category
		const withoutCategoryTags = localSelectedTags.filter(
			(t) => !categoryTagNames.includes(t.toLowerCase())
		);

		if (isCurrentlySelected) {
			// Toggled off
			localSelectedTags = withoutCategoryTags;
		} else {
			// Set as the single selected tag for this category
			localSelectedTags = [...withoutCategoryTags, trimmed];
		}

		if (onTagsChange) {
			onTagsChange(localSelectedTags);
		}
	}

	function removeSelectedTag(tagName: string) {
		localSelectedTags = localSelectedTags.filter((t) => t !== tagName);
		if (onTagsChange) {
			onTagsChange(localSelectedTags);
		}
	}

	function clearAllSelected() {
		localSelectedTags = [];
		if (onTagsChange) {
			onTagsChange([]);
		}
	}

	// Create a new tag under a specific category directly from the selector dropdown
	async function handleCreateTag(categoryId: number | string) {
		const name = newTagName.trim();
		if (!name || isCreatingTag) return;
		isCreatingTag = true;
		errorMessage = null;

		const targetCat = categories.find((c) => c.id === categoryId);
		if (!targetCat) {
			isCreatingTag = false;
			return;
		}

		if (targetCat.tags?.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
			// Auto select it (replacing any prior tag in this category)
			selectTag(targetCat, name);
			newTagName = '';
			addingTagCategoryId = null;
			isCreatingTag = false;
			return;
		}

		try {
			if (currentUserId) {
				const { data, error } = await supabase
					.from('tags')
					.insert({
						category_id: Number(categoryId),
						user_id: currentUserId,
						name,
						color: null
					})
					.select()
					.single();

				if (error) throw error;
				if (data) {
					const newTag: Tag = {
						id: data.id,
						category_id: data.category_id,
						user_id: data.user_id,
						name: data.name,
						color: data.color,
						is_system: data.is_system,
						created_at: data.created_at,
						updated_at: data.updated_at
					};

					categories = categories.map((c) => {
						if (c.id === Number(categoryId)) {
							return {
								...c,
								tags: [...(c.tags || []), newTag]
							};
						}
						return c;
					});
				}
			} else {
				const allTags = categories.flatMap((c) => c.tags || []);
				const nextTagId = allTags.length > 0 ? Math.max(...allTags.map((t) => Number(t.id))) + 1 : 101;
				const newTag: Tag = {
					id: nextTagId,
					category_id: Number(categoryId),
					name,
					color: null,
					is_system: false
				};

				categories = categories.map((c) => {
					if (c.id === Number(categoryId)) {
						return {
							...c,
							tags: [...(c.tags || []), newTag]
						};
					}
					return c;
				});
			}

			// Automatically select newly created tag for this category (replacing prior tag in this category)
			const updatedCat = categories.find((c) => c.id === categoryId) || targetCat;
			selectTag(updatedCat, name);

			newTagName = '';
			addingTagCategoryId = null;
		} catch (err: any) {
			console.error('Error creating tag:', err);
			errorMessage = err.message || 'Failed to create tag';
		} finally {
			isCreatingTag = false;
		}
	}

	// Filtered categories and tags based on search
	const filteredCategories = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return categories;

		return categories
			.map((cat) => {
				const matchesCat = cat.name.toLowerCase().includes(query);
				const matchingTags = (cat.tags || []).filter((tag) =>
					tag.name.toLowerCase().includes(query)
				);

				if (matchesCat || matchingTags.length > 0) {
					return {
						...cat,
						tags: matchesCat ? cat.tags : matchingTags
					};
				}
				return null;
			})
			.filter(Boolean) as TagCategory[];
	});

	// Save action
	async function handleApplyAndSave() {
		isSaving = true;
		errorMessage = null;
		try {
			selectedTags = [...localSelectedTags];
			if (onSave) {
				await onSave(localSelectedTags);
			}
			onClose();
		} catch (err: any) {
			console.error('Error saving tags in selector:', err);
			errorMessage = err.message || 'Failed to save tags';
		} finally {
			isSaving = false;
		}
	}
</script>

{#if isOpen}
	<div
		class="dialog-backdrop"
		onclick={onClose}
		role="presentation"
		aria-hidden="true"
	></div>

	<aside
		class="tag-selector-dialog"
		role="dialog"
		aria-labelledby="tag-selector-title"
		aria-modal="true"
	>
		<!-- Header -->
		<div class="dialog-header">
			<div class="header-left">
				<div class="header-icon-box">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
						<line x1="7" y1="7" x2="7.01" y2="7" />
					</svg>
				</div>
				<div>
					<h2 id="tag-selector-title" class="dialog-title">{title || 'Select Tags'}</h2>
					<p class="dialog-subtitle">{description || `Assign categories & tags for ${feature}`}</p>
				</div>
			</div>

			<button
				type="button"
				class="close-btn"
				onclick={onClose}
				aria-label="Close tag selector"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>

		<!-- Search Bar -->
		<div class="search-container">
			<div class="search-input-box">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<input
					type="text"
					class="search-input"
					placeholder="Search tags or categories..."
					bind:value={searchQuery}
				/>
				{#if searchQuery}
					<button
						type="button"
						class="clear-search-btn"
						onclick={() => (searchQuery = '')}
						aria-label="Clear search"
					>
						✕
					</button>
				{/if}
			</div>
		</div>

		<!-- Selected Tags Live Chip Strip -->
		<div class="selected-strip">
			<div class="selected-strip-header">
				<span class="selected-label">
					Selected ({localSelectedTags.length})
				</span>
				{#if localSelectedTags.length > 0}
					<button
						type="button"
						class="clear-all-btn"
						onclick={clearAllSelected}
					>
						Clear all
					</button>
				{/if}
			</div>

			<div class="selected-chips-wrap">
				{#if localSelectedTags.length === 0}
					<span class="no-selection-hint">No tags selected yet. Pick from categories below.</span>
				{:else}
					{#each localSelectedTags as tag}
						<span class="selected-chip">
							<span class="chip-hash">#</span>
							<span class="chip-name">{tag}</span>
							<button
								type="button"
								class="remove-chip-btn"
								onclick={() => removeSelectedTag(tag)}
								aria-label={`Remove tag ${tag}`}
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</span>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Error Banner -->
		{#if errorMessage}
			<div class="error-banner">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
				<span>{errorMessage}</span>
			</div>
		{/if}

		<!-- Category Accordions / Groups -->
		<div class="categories-content">
			{#if isLoading}
				<div class="loading-state">
					<div class="spinner"></div>
					<span>Loading taxonomy...</span>
				</div>
			{:else if filteredCategories.length === 0}
				<div class="empty-state">
					<p>No matching tags or categories found for "{searchQuery}".</p>
				</div>
			{:else}
				{#each filteredCategories as category (category.id)}
					{@const catColor = category.color || '#6366F1'}
					{@const isAddingInThisCat = addingTagCategoryId === category.id}

					<div class="category-group" style="--cat-color: {catColor};">
						<div class="category-group-header">
							<div class="category-title-wrap">
								<span class="category-dot" style="background-color: {catColor};"></span>
								<span class="category-name">{category.name}</span>
								<span class="category-badge">{(category.tags || []).length}</span>
							</div>

							<!-- Quick add tag toggle button inside category -->
							{#if !isAddingInThisCat}
								<button
									type="button"
									class="add-tag-trigger-btn"
									onclick={() => {
										addingTagCategoryId = category.id;
										newTagName = '';
									}}
									title={`Add custom tag to ${category.name}`}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<line x1="12" y1="5" x2="12" y2="19" />
										<line x1="5" y1="12" x2="19" y2="12" />
									</svg>
									<span>New Tag</span>
								</button>
							{/if}
						</div>

						<!-- Inline dropdown input for adding tag to this category -->
						{#if isAddingInThisCat}
							<div class="inline-add-container">
								<div class="inline-add-input-wrap">
									<span class="inline-add-prefix">#</span>
									<input
										type="text"
										class="inline-add-input"
										bind:value={newTagName}
										placeholder={`Add tag to ${category.name}...`}
										autofocus
										onkeydown={(e) => {
											if (e.key === 'Enter') handleCreateTag(category.id);
											if (e.key === 'Escape') {
												addingTagCategoryId = null;
												newTagName = '';
											}
										}}
									/>
								</div>
								<div class="inline-add-actions">
									<button
										type="button"
										class="btn btn-secondary compact"
										onclick={() => {
											addingTagCategoryId = null;
											newTagName = '';
										}}
									>
										Cancel
									</button>
									<button
										type="button"
										class="btn btn-primary compact"
										disabled={!newTagName.trim() || isCreatingTag}
										onclick={() => handleCreateTag(category.id)}
									>
										{isCreatingTag ? 'Adding...' : 'Add'}
									</button>
								</div>
							</div>
						{/if}

						<!-- Tags grid pills -->
						<div class="category-tags-grid">
							{#if (category.tags || []).length === 0 && !isAddingInThisCat}
								<div class="no-tags-in-cat">No tags in this category yet.</div>
							{:else}
								{#each category.tags || [] as tag (tag.id)}
									{@const isSelected = localSelectedTags.includes(tag.name)}
									{@const tagColor = tag.color || catColor}

									<button
										type="button"
										class="tag-select-pill"
										class:selected={isSelected}
										style="--pill-color: {tagColor};"
										onclick={() => selectTag(category, tag.name)}
									>
										<span class="pill-check">
											{#if isSelected}
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
													<polyline points="20 6 9 17 4 12" />
												</svg>
											{:else}
												<span class="pill-hash">#</span>
											{/if}
										</span>
										<span class="pill-title">{tag.name}</span>
									</button>
								{/each}
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Dialog Footer -->
		<div class="dialog-footer">
			<div class="footer-meta">
				<span class="footer-count">{localSelectedTags.length} tags selected</span>
			</div>
			<div class="footer-actions">
				<button
					type="button"
					class="btn btn-secondary"
					onclick={onClose}
					disabled={isSaving}
				>
					Cancel
				</button>
				<button
					type="button"
					class="btn btn-primary"
					onclick={handleApplyAndSave}
					disabled={isSaving}
				>
					{#if isSaving}
						<div class="spinner-sm"></div>
						<span>Saving...</span>
					{:else}
						<span>Apply & Save</span>
					{/if}
				</button>
			</div>
		</div>
	</aside>
{/if}

<style>
	.dialog-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(15, 23, 42, 0.4);
		z-index: 100;
		animation: fadeIn 0.15s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.tag-selector-dialog {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		max-width: 460px;
		background-color: var(--bg-secondary, #ffffff);
		border-left: 1px solid var(--border-subtle, #e2e8f0);
		box-shadow: -8px 0 24px rgba(0, 0, 0, 0.12);
		z-index: 101;
		display: flex;
		flex-direction: column;
		animation: slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes slideInRight {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	/* Header */
	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border-subtle, #e2e8f0);
		background-color: var(--bg-primary, #f8fafc);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.header-icon-box {
		width: 34px;
		height: 34px;
		border-radius: var(--radius-md, 6px);
		background-color: rgba(99, 102, 241, 0.1);
		color: var(--primary, #6366f1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.header-icon-box svg {
		width: 18px;
		height: 18px;
	}

	.dialog-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #0f172a);
		margin: 0;
		line-height: 1.25;
	}

	.dialog-subtitle {
		font-size: 0.75rem;
		color: var(--text-muted, #64748b);
		margin: 0;
		text-transform: capitalize;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--text-muted, #64748b);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm, 4px);
		transition: background-color 0.12s ease, color 0.12s ease;
	}

	.close-btn:hover {
		background-color: var(--bg-tertiary, #f1f5f9);
		color: var(--text-primary, #0f172a);
	}

	.close-btn svg {
		width: 18px;
		height: 18px;
	}

	/* Search */
	.search-container {
		padding: 0.75rem 1.25rem 0.5rem;
		border-bottom: 1px solid var(--border-subtle, #e2e8f0);
	}

	.search-input-box {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background-color: var(--bg-tertiary, #f1f5f9);
		border: 1px solid var(--border-subtle, #e2e8f0);
		border-radius: var(--radius-sm, 4px);
		padding: 0.375rem 0.625rem;
	}

	.search-icon {
		width: 15px;
		height: 15px;
		color: var(--text-muted, #64748b);
		flex-shrink: 0;
	}

	.search-input {
		border: none;
		outline: none;
		background: transparent;
		font-size: 0.8125rem;
		color: var(--text-primary, #0f172a);
		width: 100%;
	}

	.search-input::placeholder {
		color: var(--text-muted, #94a3b8);
	}

	.clear-search-btn {
		background: transparent;
		border: none;
		color: var(--text-muted, #64748b);
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0 0.25rem;
	}

	/* Selected Strip */
	.selected-strip {
		padding: 0.625rem 1.25rem;
		background-color: var(--bg-surface, #f8fafc);
		border-bottom: 1px solid var(--border-subtle, #e2e8f0);
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.selected-strip-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.selected-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary, #475569);
	}

	.clear-all-btn {
		background: none;
		border: none;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--danger, #ef4444);
		cursor: pointer;
		padding: 0;
	}

	.clear-all-btn:hover {
		text-decoration: underline;
	}

	.selected-chips-wrap {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		min-height: 26px;
		align-items: center;
	}

	.no-selection-hint {
		font-size: 0.75rem;
		color: var(--text-muted, #94a3b8);
		font-style: italic;
	}

	.selected-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background-color: var(--primary, #6366f1);
		color: #ffffff;
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm, 4px);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.chip-hash {
		opacity: 0.7;
		font-size: 0.6875rem;
	}

	.remove-chip-btn {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		width: 12px;
		height: 12px;
		margin-left: 0.125rem;
		transition: color 0.12s ease;
	}

	.remove-chip-btn:hover {
		color: #ffffff;
	}

	.remove-chip-btn svg {
		width: 10px;
		height: 10px;
	}

	/* Error Banner */
	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1.25rem;
		background-color: #fef2f2;
		border-bottom: 1px solid #fee2e2;
		color: var(--danger, #ef4444);
		font-size: 0.75rem;
	}

	.error-banner svg {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}

	/* Categories content */
	.categories-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2.5rem 1rem;
		color: var(--text-muted, #64748b);
		font-size: 0.8125rem;
		text-align: center;
		gap: 0.5rem;
	}

	.category-group {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-subtle, #f1f5f9);
	}

	.category-group:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.category-group-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.category-title-wrap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.category-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.category-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary, #0f172a);
	}

	.category-badge {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--text-muted, #64748b);
		background-color: var(--bg-tertiary, #f1f5f9);
		padding: 0.0625rem 0.375rem;
		border-radius: 10px;
	}

	.add-tag-trigger-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: transparent;
		border: 1px dashed var(--border-subtle, #cbd5e1);
		color: var(--text-secondary, #475569);
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm, 4px);
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.add-tag-trigger-btn:hover {
		border-color: var(--primary, #6366f1);
		color: var(--primary, #6366f1);
		background-color: rgba(99, 102, 241, 0.04);
	}

	.add-tag-trigger-btn svg {
		width: 11px;
		height: 11px;
	}

	/* Inline Add Tag Dropdown / Input Box */
	.inline-add-container {
		background-color: var(--bg-surface, #f8fafc);
		border: 1px solid var(--border-subtle, #e2e8f0);
		border-radius: var(--radius-sm, 4px);
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		animation: fadeIn 0.12s ease-out;
	}

	.inline-add-input-wrap {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		background-color: var(--bg-secondary, #ffffff);
		border: 1px solid var(--border-subtle, #cbd5e1);
		border-radius: var(--radius-sm, 4px);
		padding: 0.25rem 0.5rem;
	}

	.inline-add-prefix {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted, #94a3b8);
	}

	.inline-add-input {
		border: none;
		outline: none;
		background: transparent;
		font-size: 0.75rem;
		color: var(--text-primary, #0f172a);
		width: 100%;
	}

	.inline-add-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.375rem;
	}

	/* Tags grid pills */
	.category-tags-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4375rem;
	}

	.no-tags-in-cat {
		font-size: 0.75rem;
		color: var(--text-muted, #94a3b8);
		font-style: italic;
	}

	.tag-select-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		background-color: var(--bg-tertiary, #f8fafc);
		border: 1px solid var(--border-subtle, #e2e8f0);
		color: var(--text-secondary, #334155);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.25rem 0.5625rem;
		border-radius: var(--radius-sm, 4px);
		cursor: pointer;
		user-select: none;
		transition: all 0.12s ease;
	}

	.tag-select-pill:hover {
		border-color: var(--pill-color, #6366f1);
		background-color: rgba(99, 102, 241, 0.05);
		color: var(--text-primary, #0f172a);
	}

	.tag-select-pill.selected {
		background-color: var(--pill-color, #6366f1);
		border-color: var(--pill-color, #6366f1);
		color: #ffffff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.pill-check {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 12px;
		height: 12px;
	}

	.pill-check svg {
		width: 12px;
		height: 12px;
	}

	.pill-hash {
		font-size: 0.75rem;
		color: var(--text-muted, #94a3b8);
	}

	.tag-select-pill.selected .pill-hash {
		color: rgba(255, 255, 255, 0.8);
	}

	.pill-title {
		line-height: 1;
	}

	/* Footer */
	.dialog-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.25rem;
		border-top: 1px solid var(--border-subtle, #e2e8f0);
		background-color: var(--bg-primary, #f8fafc);
	}

	.footer-count {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary, #64748b);
	}

	.footer-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* Buttons & Indicators */
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.4375rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		border-radius: var(--radius-sm, 4px);
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.btn.compact {
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
	}

	.btn-secondary {
		background-color: var(--bg-secondary, #ffffff);
		color: var(--text-primary, #0f172a);
		border-color: var(--border-subtle, #cbd5e1);
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: var(--bg-tertiary, #f1f5f9);
		border-color: var(--text-muted, #94a3b8);
	}

	.btn-primary {
		background-color: var(--primary, #6366f1);
		color: #ffffff;
		border-color: var(--primary, #6366f1);
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.92;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--border-subtle, #e2e8f0);
		border-top-color: var(--primary, #6366f1);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	.spinner-sm {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #ffffff;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
