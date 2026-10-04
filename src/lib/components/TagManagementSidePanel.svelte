<script lang="ts">
	import { onMount } from 'svelte';
	import { getSupabaseClient } from '$lib/supabase';
	import { fetchUserProfile } from '$lib/services/member-service';
	import type { Tag, TagCategory } from '$lib/types/tags';

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
	let deleteConfirmation = $state<{
		isOpen: boolean;
		title: string;
		message: string;
		confirmLabel: string;
		type: 'category' | 'tag';
		targetId: number | string;
		categoryId?: number | string;
	} | null>(null);

	const PRESET_COLORS = [
		'#6366F1', // Indigo
		'#10B981', // Emerald
		'#0EA5E9', // Sky
		'#F59E0B', // Amber
		'#8B5CF6', // Violet
		'#EC4899', // Pink
		'#EF4444', // Red
		'#6B7280', // Slate/Gray
		'#14B8A6'  // Teal
	];

	// Default fallback taxonomy per feature when offline or mock mode
	const DEFAULT_TAXONOMY: Record<string, { name: string; color: string; tags: string[] }[]> = {
		tasks: [
			{
				name: 'Life Area',
				color: '#6366F1',
				tags: ['Projects', 'Chores', 'Market & Shopping', 'Personal Care', 'Finance & Bills']
			},
			{
				name: 'Effort & Pace',
				color: '#10B981',
				tags: ['Quick (<15m)', 'Deep Focus', 'Routine / Habit']
			},
			{
				name: 'Context / Location',
				color: '#0EA5E9',
				tags: ['Home', 'Work & Desk', 'Out & Errands', 'Online / Calls']
			}
		],
		goals: [
			{
				name: 'Domain',
				color: '#6366F1',
				tags: ['Civic & Guild', 'Knowledge & Craft', 'Health & Vitality', 'Finance & Capital', 'Home & Hearth', 'Creative & Venture']
			},
			{
				name: 'Energy & Bandwidth',
				color: '#10B981',
				tags: ['Deep Focus', 'Quick Win', 'Administrative', 'Collaborative']
			},
			{
				name: 'Impact & Leverage',
				color: '#F59E0B',
				tags: ['High Leverage', 'Foundational / Enabler', 'Maintenance']
			},
			{
				name: 'Horizon & Cycle',
				color: '#0EA5E9',
				tags: ['Immediate Focus', 'Quarterly Milestone', 'Long-term Horizon']
			},
			{
				name: 'Execution Archetype',
				color: '#8B5CF6',
				tags: ['Project Deliverable', 'Ritual & Habit', 'Research & Discovery']
			}
		],
		diary: [
			{
				name: 'Context',
				color: '#3B82F6',
				tags: ['Deep Work', 'Reflections', 'Planning']
			},
			{
				name: 'Energy Level',
				color: '#10B981',
				tags: ['High Vitality', 'Medium Vitality', 'Rest & Recovery']
			}
		],
		document: [
			{
				name: 'Department',
				color: '#8B5CF6',
				tags: ['Engineering', 'Research', 'Governance']
			},
			{
				name: 'Document Type',
				color: '#F59E0B',
				tags: ['Report', 'Charter', 'Dispatch']
			}
		]
	};

	async function loadCategoriesAndTags() {
		isLoading = true;
		categoryError = null;
		try {
			const profile = await fetchUserProfile();
			if (profile) {
				currentUserId = profile.id;

				// Provision default categories if not already provisioned
				try {
					await supabase.rpc('provision_feature_tag_categories', {
						p_feature: feature
					});
				} catch (rpcErr) {
					console.warn('RPC provision_feature_tag_categories skipped:', rpcErr);
				}

				// Direct query fetching categories and their tags for this feature
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
				// Local / Mock initialization with defaults
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

			if (currentUserId) {
				const { data, error } = await supabase
					.from('tag_categories')
					.insert({
						user_id: currentUserId,
						feature,
						name,
						color: newCategoryColor,
						display_order: displayOrder,
						is_system: false
					})
					.select('*, tags(*)')
					.single();

				if (error) throw error;
				if (data) {
					categories = [...categories, { ...(data as TagCategory), tags: [] }];
				}
			} else {
				// Mock Insert
				const nextId = categories.length > 0 ? Math.max(...categories.map((c) => Number(c.id))) + 1 : 1;
				const newCat: TagCategory = {
					id: nextId,
					feature,
					name,
					color: newCategoryColor,
					display_order: displayOrder,
					is_system: false,
					tags: []
				};
				categories = [...categories, newCat];
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
					.eq('id', catId);

				if (error) throw error;
			}

			categories = categories.map((c) =>
				c.id === catId ? { ...c, name, color: editCategoryColor } : c
			);

			editingCategoryId = null;
			if (onTagsChange) onTagsChange(categories);
		} catch (err: any) {
			console.error('Error updating category:', err);
			categoryError = err.message || 'Failed to update category';
		}
	}

	function requestDeleteCategory(catId: number | string) {
		const catToDelete = categories.find((c) => c.id === catId);
		if (!catToDelete) return;

		const tagCount = catToDelete.tags?.length || 0;
		deleteConfirmation = {
			isOpen: true,
			type: 'category',
			targetId: catId,
			title: `Delete category "${catToDelete.name}"?`,
			message: tagCount > 0
				? `This category contains ${tagCount} ${tagCount === 1 ? 'tag' : 'tags'}. Deleting it will permanently remove all associated tags.`
				: `Are you sure you want to delete the "${catToDelete.name}" category?`,
			confirmLabel: 'Delete Category'
		};
	}

	function requestDeleteTag(tagId: number | string, categoryId: number | string) {
		const targetCat = categories.find((c) => c.id === categoryId);
		const targetTag = targetCat?.tags?.find((t) => t.id === tagId);
		if (!targetTag) return;

		deleteConfirmation = {
			isOpen: true,
			type: 'tag',
			targetId: tagId,
			categoryId: categoryId,
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
						.eq('id', targetId);

					if (error) throw error;
				}

				categories = categories.filter((c) => c.id !== targetId);
			} else if (type === 'tag' && categoryId !== undefined) {
				if (currentUserId) {
					const { error } = await supabase
						.from('tags')
						.delete()
						.eq('id', targetId);

					if (error) throw error;
				}

				categories = categories.map((c) => {
					if (c.id === categoryId) {
						return {
							...c,
							tags: (c.tags || []).filter((t) => t.id !== targetId)
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
				const { data, error } = await supabase
					.from('tags')
					.insert({
						category_id: categoryId,
						user_id: currentUserId,
						name,
						color: newTagColor || null
					})
					.select()
					.single();

				if (error) throw error;
				if (data) {
					categories = categories.map((c) => {
						if (c.id === categoryId) {
							return {
								...c,
								tags: [...(c.tags || []), { ...(data as Tag), is_system: false }]
							};
						}
						return c;
					});
				}
			} else {
				// Mock Tag Insert
				const allTags = categories.flatMap((c) => c.tags || []);
				const nextTagId = allTags.length > 0 ? Math.max(...allTags.map((t) => Number(t.id))) + 1 : 101;

				const newTag: Tag = {
					id: nextTagId,
					category_id: categoryId,
					name,
					color: newTagColor || null,
					is_system: false
				};

				categories = categories.map((c) => {
					if (c.id === categoryId) {
						return {
							...c,
							tags: [...(c.tags || []), newTag]
						};
					}
					return c;
				});
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
					.eq('id', tagId);

				if (error) throw error;
			}

			categories = categories.map((c) => {
				if (c.id === categoryId) {
					return {
						...c,
						tags: (c.tags || []).map((t) =>
							t.id === tagId ? { ...t, name, color: editTagColor || null } : t
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

			<!-- Add Category Card / Drawer Form -->
			{#if isAddingCategory}
				<div class="category-form-card">
					<div class="form-header">
						<span class="form-title">New Category for {feature}</span>
						<button
							type="button"
							class="icon-btn-subtle"
							onclick={() => (isAddingCategory = false)}
							aria-label="Cancel adding category"
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>

					<div class="form-field">
						<label for="new-category-name" class="field-label">Category Name</label>
						<input
							id="new-category-name"
							type="text"
							class="text-input"
							bind:value={newCategoryName}
							placeholder="e.g. Life Area, Priority, Context..."
							autofocus
							onkeydown={(e) => e.key === 'Enter' && handleCreateCategory()}
						/>
					</div>

					<div class="form-field">
						<label class="field-label">Accent Color</label>
						<div class="color-palette-picker">
							{#each PRESET_COLORS as color}
								<button
									type="button"
									class="color-dot"
									class:selected={newCategoryColor === color}
									style="background-color: {color};"
									onclick={() => (newCategoryColor = color)}
									aria-label="Select color {color}"
								>
									{#if newCategoryColor === color}
										<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
											<polyline points="20 6 9 17 4 12" />
										</svg>
									{/if}
								</button>
							{/each}
						</div>
					</div>

					<div class="form-actions">
						<button
							type="button"
							class="btn btn-secondary compact"
							onclick={() => (isAddingCategory = false)}
						>
							Cancel
						</button>
						<button
							type="button"
							class="btn btn-primary compact"
							disabled={!newCategoryName.trim() || isSavingCategory}
							onclick={handleCreateCategory}
						>
							{isSavingCategory ? 'Creating...' : 'Create Category'}
						</button>
					</div>
				</div>
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
				<!-- Categories List Accordion / Sections -->
				<div class="categories-container">
					{#each filteredCategories as category (category.id)}
						{@const isEditingCat = editingCategoryId === category.id}
						{@const isAddingTag = activeAddTagCategoryId === category.id}
						{@const catColor = category.color || '#6366F1'}

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
											onkeydown={(e) => e.key === 'Enter' && handleUpdateCategory(category.id)}
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
												onclick={() => (editingCategoryId = null)}
											>
												Cancel
											</button>
											<button
												type="button"
												class="btn btn-primary compact mini-btn"
												onclick={() => handleUpdateCategory(category.id)}
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
											onclick={() => {
												activeAddTagCategoryId = category.id;
												newTagName = '';
												newTagColor = '';
											}}
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
												onclick={() => {
													editingCategoryId = category.id;
													editCategoryName = category.name;
													editCategoryColor = category.color || '#6366F1';
												}}
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
												onclick={() => requestDeleteCategory(category.id)}
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
											onclick={() => {
												activeAddTagCategoryId = category.id;
												newTagName = '';
											}}
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
															if (e.key === 'Enter') handleUpdateTag(tag.id, category.id);
															if (e.key === 'Escape') editingTagId = null;
														}}
													/>
													<button
														type="button"
														class="tag-pill-action"
														onclick={() => handleUpdateTag(tag.id, category.id)}
														title="Save tag"
													>
														✓
													</button>
													<button
														type="button"
														class="tag-pill-action"
														onclick={() => (editingTagId = null)}
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

													<!-- Only user-created tags have edit and delete actions -->
													{#if !isSystemTag}
														<div class="tag-chip-actions">
															<button
																type="button"
																class="chip-mini-btn"
																onclick={() => {
																	editingTagId = tag.id;
																	editTagName = tag.name;
																	editTagColor = tag.color || '';
																}}
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
																onclick={() => requestDeleteTag(tag.id, category.id)}
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
													if (e.key === 'Enter') handleCreateTag(category.id);
													if (e.key === 'Escape') activeAddTagCategoryId = null;
												}}
											/>
										</div>

										<div class="add-tag-actions">
											<button
												type="button"
												class="btn btn-secondary compact mini-btn"
												onclick={() => (activeAddTagCategoryId = null)}
											>
												Cancel
											</button>
											<button
												type="button"
												class="btn btn-primary compact mini-btn"
												disabled={!newTagName.trim() || isSavingTag}
												onclick={() => handleCreateTag(category.id)}
											>
												{isSavingTag ? 'Adding...' : 'Add Tag'}
											</button>
										</div>
									</div>
								{/if}
							</div>
						</div>
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
			<div
				class="modal-backdrop"
				onclick={() => (deleteConfirmation = null)}
				role="presentation"
				aria-hidden="true"
			></div>

			<div class="modal-dialog" role="dialog" aria-labelledby="modal-title" aria-modal="true">
				<div class="modal-header">
					<div class="modal-danger-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="3 6 5 6 21 6" />
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						</svg>
					</div>
					<h3 id="modal-title" class="modal-title">{deleteConfirmation.title}</h3>
				</div>

				<p class="modal-message">{deleteConfirmation.message}</p>

				<div class="modal-actions">
					<button
						type="button"
						class="btn btn-secondary compact"
						onclick={() => (deleteConfirmation = null)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="btn btn-danger compact"
						onclick={executeConfirmDelete}
					>
						{deleteConfirmation.confirmLabel}
					</button>
				</div>
			</div>
		{/if}
	</aside>
{/if}

<style>
	/* Solid backdrop without blur */
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

	/* Resize Handle */
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

	/* Sticky Header */
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

	/* Search Bar */
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

	/* Scrollable Body */
	.panel-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.125rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Alerts */
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

	/* Category Form Card */
	.category-form-card {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
		animation: fadeIn 0.15s ease-out;
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

	.form-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.form-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
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

	.color-palette-picker {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.color-palette-picker.mini {
		gap: 0.25rem;
	}

	.color-dot {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		transition: transform 0.1s ease, border-color 0.1s ease;
	}

	.color-dot:hover {
		transform: scale(1.15);
	}

	.color-dot.selected {
		border-color: var(--text-primary);
	}

	.color-dot.mini {
		width: 16px;
		height: 16px;
	}

	.color-dot svg {
		width: 12px;
		height: 12px;
	}

	.form-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	/* Category Block */
	.categories-container {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

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

	/* Inline Category Edit */
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

	/* Tags Pool */
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

	/* Tag Chip */
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

	/* Inline Tag Edit / Add Box */
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

	/* Footer */
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

	/* Shared UI Components */
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

	.btn-icon {
		width: 14px;
		height: 14px;
	}

	.icon-btn-subtle {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
	}

	.icon-btn-subtle svg {
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

	.btn-danger {
		background-color: var(--danger);
		color: #ffffff;
		border-color: var(--danger);
	}

	.btn-danger:hover:not(:disabled) {
		background-color: #b91c1c;
		border-color: #b91c1c;
	}

	/* Custom Confirmation Modal Dialog */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(31, 38, 51, 0.45);
		z-index: 120;
		animation: backdropFadeIn 0.12s ease-out;
	}

	.modal-dialog {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: calc(100% - 2.5rem);
		max-width: 380px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.08);
		padding: 1.25rem;
		z-index: 130;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		animation: modalZoomIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes modalZoomIn {
		from {
			opacity: 0;
			transform: translate(-50%, -46%) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.modal-danger-icon {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background-color: #fee2e2;
		color: var(--danger);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.modal-danger-icon svg {
		width: 16px;
		height: 16px;
	}

	.modal-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.3;
	}

	.modal-message {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.modal-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.375rem;
	}
</style>
