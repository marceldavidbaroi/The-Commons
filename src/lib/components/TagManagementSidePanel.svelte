<script lang="ts">
	import { onMount } from 'svelte';
	import { getSupabaseClient } from '$lib/supabase';
	import { fetchUserProfile } from '$lib/services/member-service';
	import { appState } from '$lib/state/app.svelte';
	import { slugifyTag, type Tag, type TagCategory } from '$lib/types/tags';
	import { PRESET_COLORS, DEFAULT_TAXONOMY, type DeleteConfirmation } from './tag-management/constants';
	import TagCategoryItem from './tag-management/TagCategoryItem.svelte';
	import AddCategoryForm from './tag-management/AddCategoryForm.svelte';
	import TagDeleteModal from './tag-management/TagDeleteModal.svelte';

	let {
		feature = 'tasks',
		isOpen = false,
		onClose,
		onTagsChange
	} = $props<{
		feature: string;
		isOpen: boolean;
		onClose: () => void;
		onTagsChange?: (categories: TagCategory[]) => void;
	}>();

	const supabase = getSupabaseClient();

	let categories = $state<TagCategory[]>([]);
	let isLoading = $state(true);
	let currentUserId = $state<number | null>(null);

	// Resizing state
	const MIN_WIDTH = 380;
	const MAX_WIDTH = 720;
	const DEFAULT_WIDTH = 480;

	let panelWidth = $state(DEFAULT_WIDTH);
	let isResizing = $state(false);

	// UI State for Adding / Editing Category
	let isAddingCategory = $state(false);
	let newCategoryName = $state('');
	let newCategoryColor = $state('#6366F1');
	let isSavingCategory = $state(false);
	let categoryError = $state<string | null>(null);

	// UI State for Editing an existing Category
	let editingCategoryId = $state<number | string | null>(null);
	let editCategoryName = $state('');
	let editCategoryColor = $state('#6366F1');

	// UI State for Adding Tag to a specific Category
	let activeAddTagCategoryId = $state<number | string | null>(null);
	let newTagName = $state('');
	let newTagColor = $state<string>('');
	let isSavingTag = $state(false);
	let tagError = $state<string | null>(null);

	// UI State for Editing a Tag
	let editingTagId = $state<number | string | null>(null);
	let editTagName = $state('');
	let editTagColor = $state<string>('');

	// Search / Filter inside Tag Management
	let tagSearchQuery = $state('');

	// Custom confirmation dialog state
	let deleteConfirmation = $state<DeleteConfirmation | null>(null);

	async function loadCategoriesAndTags(forceRefresh = false) {
		isLoading = true;
		categoryError = null;
		try {
			const profile = await fetchUserProfile();
			if (profile) {
				currentUserId = profile.id;
			}
			categories = await appState.getFeatureTaxonomy(feature, forceRefresh);

			if (onTagsChange) {
				onTagsChange(categories);
			}
		} catch (err) {
			console.error('Failed to load tag categories:', err);
			categoryError = 'Failed to load tags. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (isOpen) {
			loadCategoriesAndTags();
		}
	});

	// Filtered categories based on search query
	const filteredCategories = $derived.by(() => {
		const query = tagSearchQuery.trim().toLowerCase();
		if (!query) return categories;

		return categories
			.map((cat) => {
				const categoryMatches = cat.name.toLowerCase().includes(query);
				const matchingTags = (cat.tags || []).filter((t) =>
					t.name.toLowerCase().includes(query)
				);

				if (categoryMatches || matchingTags.length > 0) {
					return {
						...cat,
						tags: categoryMatches ? cat.tags : matchingTags
					};
				}
				return null;
			})
			.filter(Boolean) as TagCategory[];
	});

	const totalTagsCount = $derived(
		categories.reduce((acc, cat) => acc + (cat.tags?.length || 0), 0)
	);

	// Category Management Actions
	async function handleCreateCategory() {
		const name = newCategoryName.trim();
		if (!name || isSavingCategory) return;
		isSavingCategory = true;
		categoryError = null;

		try {
			if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
				categoryError = `Category "${name}" already exists for ${feature}.`;
				isSavingCategory = false;
				return;
			}

			const displayOrder = categories.length + 1;
			const slug = slugifyTag(name);

			if (currentUserId) {
				const { data, error } = await supabase
					.from('tag_categories')
					.insert({
						user_id: currentUserId,
						feature,
						name,
						slug,
						color: newCategoryColor,
						display_order: displayOrder,
						is_system: false
					})
					.select('*, tags(*)')
					.single();

				if (error) throw error;
				if (data) {
					categories = [...categories, { ...(data as TagCategory), tags: [] }];
					appState.setFeatureCategories(feature, categories);
				}
			} else {
				const nextId = categories.length > 0 ? Math.max(...categories.map((c) => Number(c.id))) + 1 : 1;
				const newCat: TagCategory = {
					id: nextId,
					slug,
					feature,
					name,
					color: newCategoryColor,
					display_order: displayOrder,
					is_system: false,
					tags: []
				};
				categories = [...categories, newCat];
				appState.setFeatureCategories(feature, categories);
			}

			newCategoryName = '';
			isAddingCategory = false;
			if (onTagsChange) onTagsChange(categories);
		} catch (err: any) {
			console.error('Error creating category:', err);
			categoryError = err.message || 'Failed to create category';
		} finally {
			isSavingCategory = false;
		}
	}

	async function handleUpdateCategory(catId: number | string) {
		const name = editCategoryName.trim();
		if (!name) return;

		try {
			if (currentUserId) {
				const { error } = await supabase
					.from('tag_categories')
					.update({
						name,
						color: editCategoryColor
					})
					.eq('id', Number(catId));

				if (error) throw error;
			}

			categories = categories.map((c) =>
				c.id === Number(catId) ? { ...c, name, color: editCategoryColor } : c
			);

			editingCategoryId = null;
			if (onTagsChange) onTagsChange(categories);
		} catch (err: any) {
			console.error('Error updating category:', err);
			categoryError = err.message || 'Failed to update category';
		}
	}

	function requestDeleteCategory(catId: number | string) {
		const catToDelete = categories.find((c) => c.id === Number(catId));
		if (!catToDelete) return;

		const tagCount = catToDelete.tags?.length || 0;
		deleteConfirmation = {
			isOpen: true,
			type: 'category',
			targetId: Number(catId),
			title: `Delete category "${catToDelete.name}"?`,
			message: tagCount > 0
				? `This category contains ${tagCount} ${tagCount === 1 ? 'tag' : 'tags'}. Deleting it will permanently remove all associated tags.`
				: `Are you sure you want to delete the "${catToDelete.name}" category?`,
			confirmLabel: 'Delete Category'
		};
	}

	function requestDeleteTag(tagId: number | string, categoryId: number | string) {
		const targetCat = categories.find((c) => c.id === Number(categoryId));
		const targetTag = targetCat?.tags?.find((t) => t.id === Number(tagId));
		if (!targetTag) return;

		deleteConfirmation = {
			isOpen: true,
			type: 'tag',
			targetId: Number(tagId),
			categoryId: Number(categoryId),
			title: `Delete tag "#${targetTag.name}"?`,
			message: `Are you sure you want to remove the tag "#${targetTag.name}" from ${targetCat?.name || 'this category'}?`,
			confirmLabel: 'Delete Tag'
		};
	}

	async function executeConfirmDelete() {
		if (!deleteConfirmation) return;
		const { type, targetId, categoryId } = deleteConfirmation;

		try {
			if (type === 'category') {
				if (currentUserId) {
					const { error } = await supabase
						.from('tag_categories')
						.delete()
						.eq('id', Number(targetId));

					if (error) throw error;
				}

				categories = categories.filter((c) => c.id !== Number(targetId));
			} else if (type === 'tag' && categoryId !== undefined) {
				if (currentUserId) {
					const { error } = await supabase
						.from('tags')
						.delete()
						.eq('id', Number(targetId));

					if (error) throw error;
				}

				categories = categories.map((c) => {
					if (c.id === Number(categoryId)) {
						return {
							...c,
							tags: (c.tags || []).filter((t) => t.id !== Number(targetId))
						};
					}
					return c;
				});
			}

			if (onTagsChange) onTagsChange(categories);
			deleteConfirmation = null;
		} catch (err: any) {
			console.error(`Error deleting ${type}:`, err);
			if (type === 'category') {
				categoryError = err.message || 'Failed to delete category';
			} else {
				tagError = err.message || 'Failed to delete tag';
			}
		}
	}

	// Tag Management Actions
	async function handleCreateTag(categoryId: number | string) {
		const name = newTagName.trim();
		if (!name || isSavingTag) return;
		isSavingTag = true;
		tagError = null;

		const targetCat = categories.find((c) => c.id === categoryId);
		if (!targetCat) return;

		if (targetCat.tags?.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
			tagError = `Tag "${name}" already exists in ${targetCat.name}.`;
			isSavingTag = false;
			return;
		}

		try {
			if (currentUserId) {
				const slug = slugifyTag(name);
				const { data, error } = await supabase
					.from('tags')
					.insert({
						category_id: Number(categoryId),
						user_id: currentUserId,
						name,
						slug,
						color: newTagColor || null
					})
					.select()
					.single();

				if (error) throw error;
				if (data) {
					categories = categories.map((c) => {
						if (c.id === Number(categoryId)) {
							const newTag: Tag = {
								id: data.id,
								category_id: data.category_id,
								user_id: data.user_id,
								name: data.name,
								slug: data.slug,
								color: data.color,
								is_system: data.is_system,
								created_at: data.created_at,
								updated_at: data.updated_at
							};
							return {
								...c,
								tags: [...(c.tags || []), newTag]
							};
						}
						return c;
					});
					appState.setFeatureCategories(feature, categories);
				}
			} else {
				const allTags = categories.flatMap((c) => c.tags || []);
				const nextTagId = allTags.length > 0 ? Math.max(...allTags.map((t) => Number(t.id))) + 1 : 101;

				const newTag: Tag = {
					id: nextTagId,
					category_id: Number(categoryId),
					name,
					slug: slugifyTag(name),
					color: newTagColor || null,
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
				appState.setFeatureCategories(feature, categories);
			}

			newTagName = '';
			newTagColor = '';
			activeAddTagCategoryId = null;
			if (onTagsChange) onTagsChange(categories);
		} catch (err: any) {
			console.error('Error creating tag:', err);
			tagError = err.message || 'Failed to create tag';
		} finally {
			isSavingTag = false;
		}
	}

	async function handleUpdateTag(tagId: number | string, categoryId: number | string) {
		const name = editTagName.trim();
		if (!name) return;

		try {
			if (currentUserId) {
				const { error } = await supabase
					.from('tags')
					.update({
						name,
						color: editTagColor || null
					})
					.eq('id', Number(tagId));

				if (error) throw error;
			}

			categories = categories.map((c) => {
				if (c.id === Number(categoryId)) {
					return {
						...c,
						tags: (c.tags || []).map((t) =>
							t.id === Number(tagId) ? { ...t, name, color: editTagColor || null } : t
						)
					};
				}
				return c;
			});

			editingTagId = null;
			if (onTagsChange) onTagsChange(categories);
		} catch (err: any) {
			console.error('Error updating tag:', err);
			tagError = err.message || 'Failed to update tag';
		}
	}

	// Panel resize drag logic
	function startResize(e: MouseEvent) {
		e.preventDefault();
		isResizing = true;
		document.body.style.cursor = 'ew-resize';
		document.body.style.userSelect = 'none';

		function onMouseMove(moveEvent: MouseEvent) {
			const newWidth = window.innerWidth - moveEvent.clientX;
			const clampedWidth = Math.min(
				Math.max(newWidth, MIN_WIDTH),
				Math.min(MAX_WIDTH, window.innerWidth - 40)
			);
			panelWidth = clampedWidth;
		}

		function onMouseUp() {
			isResizing = false;
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);

			try {
				localStorage.setItem('commons_tag_panel_width', String(panelWidth));
			} catch (err) {
				// Ignore storage error
			}
		}

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			if (editingTagId !== null) {
				editingTagId = null;
			} else if (activeAddTagCategoryId !== null) {
				activeAddTagCategoryId = null;
			} else if (editingCategoryId !== null) {
				editingCategoryId = null;
			} else if (isAddingCategory) {
				isAddingCategory = false;
			} else {
				onClose();
			}
		}
	}

	onMount(() => {
		try {
			const savedWidth = localStorage.getItem('commons_tag_panel_width');
			if (savedWidth) {
				const parsed = parseInt(savedWidth, 10);
				if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
					panelWidth = parsed;
				}
			}
		} catch (err) {
			// Ignore storage error
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

{#if isOpen}
	<!-- Backdrop overlay -->
	<div
		class="panel-backdrop"
		onclick={onClose}
		role="presentation"
		aria-hidden="true"
	></div>

	<!-- Tag Management Drawer -->
	<aside
		class="tag-side-panel"
		class:resizing={isResizing}
		style="width: {panelWidth}px;"
		aria-label="Tag Management"
	>
		<!-- Left Border Resize Handle -->
		<div
			class="resize-handle"
			onmousedown={startResize}
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize panel width"
			title="Drag left/right to resize panel"
		>
			<div class="resize-indicator"></div>
		</div>

		<!-- Panel Header (Sticky Top) -->
		<div class="panel-header">
			<div class="header-title-group">
				<div class="title-row">
					<h2 class="panel-title">Tag Management</h2>
					<span class="feature-badge">{feature}</span>
				</div>
				<p class="panel-subtitle">
					{categories.length} {categories.length === 1 ? 'category' : 'categories'} • {totalTagsCount} tags
				</p>
			</div>

			<div class="header-actions">
				<button
					type="button"
					class="btn btn-primary compact"
					onclick={() => {
						isAddingCategory = true;
						newCategoryName = '';
						newCategoryColor = PRESET_COLORS[categories.length % PRESET_COLORS.length];
					}}
				>
					<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					<span>Add Category</span>
				</button>

				<button
					type="button"
					class="panel-icon-btn close-btn"
					onclick={onClose}
					aria-label="Close tag panel"
					title="Close (Esc)"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Inline Quick Search Bar -->
		<div class="panel-search-bar">
			<div class="search-input-wrapper">
				<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<input
					type="text"
					bind:value={tagSearchQuery}
					placeholder="Search categories or tags..."
					class="search-input"
				/>
				{#if tagSearchQuery}
					<button
						type="button"
						class="clear-btn"
						onclick={() => (tagSearchQuery = '')}
						aria-label="Clear search"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				{/if}
			</div>
		</div>

		<!-- Panel Scrollable Body -->
		<div class="panel-body">
			{#if categoryError}
				<div class="alert alert-error">
					<span>{categoryError}</span>
					<button type="button" class="alert-close-btn" onclick={() => (categoryError = null)}>×</button>
				</div>
			{/if}

			{#if tagError}
				<div class="alert alert-error">
					<span>{tagError}</span>
					<button type="button" class="alert-close-btn" onclick={() => (tagError = null)}>×</button>
				</div>
			{/if}

			<!-- Add Category Card Form -->
			{#if isAddingCategory}
				<AddCategoryForm
					{feature}
					bind:newCategoryName
					bind:newCategoryColor
					{isSavingCategory}
					onCancel={() => (isAddingCategory = false)}
					onCreate={handleCreateCategory}
				/>
			{/if}

			{#if isLoading}
				<div class="loading-container">
					<div class="spinner"></div>
					<span>Loading taxonomy...</span>
				</div>
			{:else if filteredCategories.length === 0}
				<div class="empty-state">
					<div class="empty-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
							<line x1="7" y1="7" x2="7.01" y2="7" />
						</svg>
					</div>
					<h3 class="empty-title">
						{tagSearchQuery ? 'No matching tags or categories' : `No tag categories for ${feature}`}
					</h3>
					<p class="empty-desc">
						{tagSearchQuery
							? 'Try searching for a different keyword.'
							: 'Create your first category to group and structure tags for this feature.'}
					</p>
					{#if !tagSearchQuery}
						<button
							type="button"
							class="btn btn-primary compact"
							onclick={() => {
								isAddingCategory = true;
								newCategoryName = '';
							}}
						>
							+ Add First Category
						</button>
					{/if}
				</div>
			{:else}
				<div class="categories-container">
					{#each filteredCategories as category (category.id)}
						<TagCategoryItem
							{category}
							{editingCategoryId}
							bind:editCategoryName
							bind:editCategoryColor
							{editingTagId}
							bind:editTagName
							isAddingTag={activeAddTagCategoryId === category.id}
							bind:newTagName
							{isSavingTag}
							onStartEditCategory={(cat) => {
								editingCategoryId = cat.id;
								editCategoryName = cat.name;
								editCategoryColor = cat.color || '#6366F1';
							}}
							onCancelEditCategory={() => (editingCategoryId = null)}
							onSaveCategory={handleUpdateCategory}
							onDeleteCategory={requestDeleteCategory}
							onStartAddTag={(catId) => {
								activeAddTagCategoryId = catId;
								newTagName = '';
								newTagColor = '';
							}}
							onCancelAddTag={() => (activeAddTagCategoryId = null)}
							onCreateTag={handleCreateTag}
							onStartEditTag={(tag) => {
								editingTagId = tag.id;
								editTagName = tag.name;
								editTagColor = tag.color || '';
							}}
							onCancelEditTag={() => (editingTagId = null)}
							onSaveTag={handleUpdateTag}
							onDeleteTag={requestDeleteTag}
						/>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Panel Sticky Footer -->
		<div class="panel-footer">
			<button
				type="button"
				class="btn btn-secondary"
				onclick={onClose}
			>
				Done
			</button>

			<button
				type="button"
				class="btn btn-primary"
				onclick={() => {
					isAddingCategory = true;
					newCategoryName = '';
					newCategoryColor = PRESET_COLORS[categories.length % PRESET_COLORS.length];
				}}
			>
				<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				<span>New Category</span>
			</button>
		</div>

		<!-- Custom Delete Confirmation Dialog Modal -->
		{#if deleteConfirmation && deleteConfirmation.isOpen}
			<TagDeleteModal
				confirmation={deleteConfirmation}
				onCancel={() => (deleteConfirmation = null)}
				onConfirm={executeConfirmDelete}
			/>
		{/if}
	</aside>
{/if}

<style>
	.panel-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(31, 38, 51, 0.38);
		z-index: 95;
		animation: backdropFadeIn 0.15s ease-out;
	}

	@keyframes backdropFadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.tag-side-panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		background-color: var(--bg-primary);
		border-left: 1px solid var(--border-subtle);
		box-shadow: -8px 0 28px rgba(0, 0, 0, 0.12), -2px 0 6px rgba(0, 0, 0, 0.04);
		z-index: 100;
		display: flex;
		flex-direction: column;
		animation: panelSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
		transition: width 0.05s ease-out;
	}

	.tag-side-panel.resizing {
		transition: none;
	}

	@keyframes panelSlideIn {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	.resize-handle {
		position: absolute;
		left: -4px;
		top: 0;
		bottom: 0;
		width: 9px;
		cursor: ew-resize;
		z-index: 110;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.resize-indicator {
		width: 3px;
		height: 36px;
		border-radius: 4px;
		background-color: var(--border-subtle);
		opacity: 0;
		transition: opacity 0.15s ease, background-color 0.15s ease;
	}

	.resize-handle:hover .resize-indicator,
	.tag-side-panel.resizing .resize-indicator {
		opacity: 1;
		background-color: var(--primary);
	}

	.panel-header {
		padding: 1rem 1.25rem 0.875rem;
		background-color: var(--bg-secondary);
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.header-title-group {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.panel-title {
		font-size: 1.0625rem;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.015em;
		line-height: 1.2;
	}

	.feature-badge {
		font-size: 0.6875rem;
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.04em;
		background-color: var(--bg-surface);
		color: var(--primary);
		padding: 0.125rem 0.4375rem;
		border-radius: var(--radius-sm);
	}

	.panel-subtitle {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.panel-icon-btn {
		width: 30px;
		height: 30px;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
	}

	.panel-icon-btn:hover {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
		border-color: var(--border-subtle);
	}

	.panel-icon-btn svg {
		width: 16px;
		height: 16px;
	}

	.panel-search-bar {
		padding: 0.625rem 1.25rem;
		background-color: var(--bg-secondary);
		border-bottom: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
	}

	.search-icon {
		position: absolute;
		left: 0.625rem;
		width: 14px;
		height: 14px;
		color: var(--text-muted);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.375rem 1.75rem 0.375rem 2rem;
		font-size: 0.8125rem;
		background-color: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.15s ease;
	}

	.search-input:focus {
		border-color: var(--primary);
	}

	.clear-btn {
		position: absolute;
		right: 0.5rem;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
	}

	.clear-btn svg {
		width: 12px;
		height: 12px;
	}

	.panel-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.125rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.alert {
		padding: 0.625rem 0.875rem;
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.alert-error {
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		color: #b91c1c;
	}

	.alert-close-btn {
		background: none;
		border: none;
		font-size: 1rem;
		color: inherit;
		cursor: pointer;
	}

	.categories-container {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.panel-footer {
		padding: 0.875rem 1.25rem;
		background-color: var(--bg-secondary);
		border-top: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-shrink: 0;
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
		transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
		user-select: none;
		white-space: nowrap;
	}

	.btn.compact {
		padding: 0.3125rem 0.625rem;
		font-size: 0.75rem;
	}

	.btn-primary {
		background-color: var(--primary);
		color: var(--primary-foreground);
		border-color: var(--primary);
	}

	.btn-primary:hover {
		background-color: var(--primary-hover);
		border-color: var(--primary-hover);
	}

	.btn-secondary {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
		border-color: var(--border-subtle);
	}

	.btn-secondary:hover {
		background-color: var(--bg-surface);
		border-color: var(--text-muted);
	}

	.btn-icon {
		width: 14px;
		height: 14px;
	}

	.loading-container,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 2.5rem 1rem;
		gap: 0.5rem;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--border-subtle);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty-icon svg {
		width: 36px;
		height: 36px;
		color: var(--text-muted);
		opacity: 0.6;
	}

	.empty-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.empty-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		max-width: 260px;
		margin-bottom: 0.5rem;
	}
</style>
