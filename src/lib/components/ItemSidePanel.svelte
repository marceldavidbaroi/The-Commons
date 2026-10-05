<script lang="ts">
	import { onMount } from 'svelte';
	import { getSupabaseClient } from '$lib/supabase';
	import type { Tag, TagCategory, TagGroup, DynamicFieldDefinition } from '$lib/types/tags';
	import type { UserItem } from '$lib/types/homeops';

	const MIN_PANEL_WIDTH = 380;
	const MAX_PANEL_WIDTH = 860;
	const DEFAULT_PANEL_WIDTH = 480;

	let {
		item = null,
		isOpen = false,
		mode = 'create',
		groups = [],
		categories = [],
		onClose,
		onSave,
		onCreate,
		onDelete,
		onTaxonomyChange
	} = $props<{
		item?: UserItem | null;
		isOpen: boolean;
		mode?: 'create' | 'edit';
		groups?: TagGroup[];
		categories?: TagCategory[];
		onClose: () => void;
		onSave?: (item: UserItem) => Promise<void> | void;
		onCreate?: (newItem: Partial<UserItem>) => Promise<void> | void;
		onDelete?: (id: number) => Promise<void> | void;
		onTaxonomyChange?: () => Promise<void> | void;
	}>();

	const supabase = getSupabaseClient();

	// Form State
	let name = $state('');
	let description = $state('');
	let selectedGroupId = $state<number | null>(null);
	let selectedGroupSlug = $state<string | null>(null);
	let selectedCategoryId = $state<number | null>(null);
	let selectedCategorySlug = $state<string | null>(null);
	let selectedCategoryName = $state<string>('');
	let selectedCategoryColor = $state<string>('#F59E0B');
	let conditionStatus = $state('Good');
	let isLoaned = $state(false);
	let loanedTo = $state('');
	let selectedTag = $state<string | null>(null);
	let metadata = $state<Record<string, any>>({});

	// UI & Panel state
	let panelWidth = $state(DEFAULT_PANEL_WIDTH);
	let isResizing = $state(false);
	let isSaving = $state(false);
	let isConfirmingDelete = $state(false);

	// Derived current category object and its available tags
	let activeCategory = $derived(
		categories.find((c: any) => c.id === selectedCategoryId) || null
	);
	let availableCategoryTags = $derived(
		activeCategory?.tags || []
	);

	let activeGroup = $derived(
		groups.find((g: any) => g.id === selectedGroupId) ||
		activeCategory?.tag_group ||
		groups.find((g: any) => g.id === activeCategory?.group_id) ||
		null
	);

	let availableGroupCategories = $derived(
		selectedGroupId
			? categories.filter((c: any) => c.group_id === selectedGroupId || c.tag_group?.id === selectedGroupId)
			: categories
	);

	// Combined dynamic schema blueprint: Group blueprint + Category blueprint overrides
	let dynamicBlueprint = $derived.by<DynamicFieldDefinition[]>(() => {
		const groupFields: DynamicFieldDefinition[] = activeGroup?.schema_blueprint || [];
		const catFields: DynamicFieldDefinition[] = activeCategory?.schema_blueprint || [];
		
		const combined = [...groupFields];
		for (const cf of catFields) {
			const existingIdx = combined.findIndex((f) => f.key === cf.key);
			if (existingIdx >= 0) {
				combined[existingIdx] = { ...combined[existingIdx], ...cf };
			} else {
				combined.push(cf);
			}
		}
		return combined;
	});

	function handleSelectTagFromDropdown(e: Event) {
		const target = e.target as HTMLSelectElement;
		const val = target.value;
		if (val) {
			handleSetTag(val);
			target.value = '';
		}
	}

	async function handleTaxonomyUpdated() {
		if (onTaxonomyChange) {
			await onTaxonomyChange();
		}
	}

	$effect(() => {
		if (isOpen) {
			isConfirmingDelete = false;
			if (mode === 'edit' && item) {
				name = item.name || '';
				description = item.description || '';
				selectedCategoryId = item.category_id || null;
				selectedCategoryName = item.category_name || '';
				selectedGroupId = item.group_id || (categories.find((c: any) => c.id === item?.category_id)?.group_id || null);
				selectedCategoryColor = item.category_color || '#F59E0B';
				conditionStatus = item.condition_status || 'Good';
				isLoaned = item.is_loaned || false;
				loanedTo = item.loaned_to || '';
				selectedTag = item.tag?.name || (item.tag_slug ? item.tag_slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : null);
				metadata = item.metadata ? JSON.parse(JSON.stringify(item.metadata)) : {};
			} else {
				// Reset for creation
				name = '';
				description = '';
				conditionStatus = 'Good';
				isLoaned = false;
				loanedTo = '';
				selectedTag = null;
				metadata = {};
				selectedGroupId = null;
				selectedCategoryId = null;
				selectedCategoryName = '';
				selectedCategoryColor = '#F59E0B';
			}
		}
	});

	async function handleExecuteDelete() {
		if (item && onDelete) {
			await onDelete(item.id);
			isConfirmingDelete = false;
		}
	}

	// Quick Tag Search State
	let tagSearchQuery = $state('');
	let isTagSearchDropdownOpen = $state(false);

	// All tags across all categories and groups with parent metadata for instant lookup
	interface FlatTagItem {
		tag: Tag;
		category: TagCategory;
		group?: TagGroup | null;
	}

	let allFlatTags = $derived.by<FlatTagItem[]>(() => {
		const list: FlatTagItem[] = [];
		for (const cat of categories) {
			const grp = groups.find((g: any) => g.id === cat.group_id) || (cat as any).tag_group || null;
			if (cat.tags && cat.tags.length > 0) {
				for (const t of cat.tags) {
					list.push({ tag: t, category: cat, group: grp });
				}
			}
		}
		return list;
	});

	let tagSearchResults = $derived.by<FlatTagItem[]>(() => {
		const q = tagSearchQuery.trim().toLowerCase();
		if (!q) return [];
		return allFlatTags
			.filter(
				(item) =>
					item.tag.name.toLowerCase().includes(q) ||
					item.tag.slug.toLowerCase().includes(q) ||
					item.category.name.toLowerCase().includes(q) ||
					(item.group && item.group.name.toLowerCase().includes(q))
			)
			.slice(0, 8);
	});

	function handleSelectSearchTag(item: FlatTagItem) {
		// 1. Set the single tag
		selectedTag = item.tag.name;

		// 2. Auto-select category
		selectedCategoryId = item.category.id;
		selectedCategoryName = item.category.name;
		selectedCategoryColor = item.category.color || '#F59E0B';

		// 3. Auto-select group
		if (item.category.group_id) {
			selectedGroupId = item.category.group_id;
		} else if (item.group?.id) {
			selectedGroupId = item.group.id;
		}

		// Clear search
		tagSearchQuery = '';
		isTagSearchDropdownOpen = false;
	}

	function handleSetTag(rawTag: string) {
		const trimmed = rawTag.trim().replace(/^#/, '');
		if (trimmed) {
			selectedTag = trimmed;
			// Check if tag matches an existing category
			for (const cat of categories) {
				const matched = cat.tags?.find((t: any) => t.name.toLowerCase() === trimmed.toLowerCase() || t.slug === trimmed.toLowerCase());
				if (matched) {
					selectedCategoryId = cat.id;
					selectedCategoryName = cat.name;
					selectedCategoryColor = cat.color || '#F59E0B';
					selectedGroupId = cat.group_id || null;
					break;
				}
			}
		}
		tagSearchQuery = '';
		isTagSearchDropdownOpen = false;
	}

	function handleRemoveTag() {
		selectedTag = null;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		isSaving = true;
		try {
			let matchedTag: any = null;
			let matchedColor = selectedCategoryColor;
			let tagSlug: string | null = null;

			if (selectedTag) {
				for (const cat of categories) {
					const found = cat.tags?.find((t: any) => t.name.toLowerCase() === selectedTag!.toLowerCase() || t.slug === selectedTag!.toLowerCase());
					if (found) {
						matchedTag = found;
						matchedColor = cat.color;
						break;
					}
				}
				tagSlug = matchedTag?.slug || selectedTag.toLowerCase().trim().replace(/[^a-z0-9\s-_]/g, '').replace(/[\s_]+/g, '-');
			}

			const catSlug = activeCategory?.slug || selectedCategorySlug || (selectedCategoryName ? selectedCategoryName.toLowerCase().trim().replace(/[^a-z0-9\s-_]/g, '').replace(/[\s_]+/g, '-') : null);
			const grpSlug = activeGroup?.slug || selectedGroupSlug || (activeGroup?.name ? activeGroup.name.toLowerCase().trim().replace(/[^a-z0-9\s-_]/g, '').replace(/[\s_]+/g, '-') : null);

			const payload: Partial<UserItem> = {
				name: name.trim(),
				description: description.trim() || null,
				category_id: selectedCategoryId,
				category_slug: catSlug,
				category_name: selectedCategoryName,
				category_color: selectedCategoryColor,
				tag_slug: tagSlug,
				tag: selectedTag ? {
					id: matchedTag?.id,
					slug: tagSlug || undefined,
					name: matchedTag?.name || selectedTag,
					color: matchedColor
				} : null,
				condition_status: conditionStatus,
				is_loaned: isLoaned,
				loaned_to: isLoaned ? loanedTo : null,
				group_id: activeGroup?.id || null,
				group_slug: grpSlug,
				group_name: activeGroup?.name || null,
				group_icon: activeGroup?.icon || null,
				metadata: Object.keys(metadata).length > 0 ? metadata : null
			};

			if (mode === 'edit' && item && onSave) {
				await onSave({ ...item, ...payload } as UserItem);
			} else if (onCreate) {
				await onCreate(payload);
			}
			onClose();
		} catch (err) {
			console.error('Error saving item', err);
		} finally {
			isSaving = false;
		}
	}

	// Resizing Handlers
	function startResize(e: MouseEvent) {
		isResizing = true;
		const startX = e.clientX;
		const startWidth = panelWidth;

		function onMouseMove(moveEvent: MouseEvent) {
			const delta = startX - moveEvent.clientX;
			panelWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startWidth + delta));
		}

		function onMouseUp() {
			isResizing = false;
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		}

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}
</script>

{#if isOpen}
	<div
		class="panel-backdrop"
		onclick={onClose}
		role="presentation"
	></div>

	<aside
		class="item-side-panel"
		style={`width: ${panelWidth}px;`}
		aria-label={mode === 'edit' ? 'Edit Item' : 'New Item'}
	>
		<!-- Resize handle -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="resize-handle"
			onmousedown={startResize}
			class:resizing={isResizing}
			title="Drag to resize"
		></div>

		<!-- Panel Header -->
		<div class="panel-header">
			<div class="header-titles">
				<span class="panel-subtitle">{mode === 'edit' ? 'Edit Item' : 'New Item'}</span>
				<input
					id="item-name-input"
					type="text"
					class="panel-title-input"
					bind:value={name}
					placeholder="Item Name (e.g. Extra Virgin Olive Oil)..."
					autocomplete="off"
					required
				/>
			</div>
			<div class="header-actions">
				{#if mode === 'edit' && item && onDelete}
					<button
						type="button"
						class="btn-icon delete-btn"
						onclick={() => (isConfirmingDelete = true)}
						title="Delete item"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
							<path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						</svg>
					</button>
				{/if}
				<button
					type="button"
					class="btn-icon close-btn"
					onclick={onClose}
					aria-label="Close panel"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Form Body -->
		<form class="panel-form" onsubmit={handleSubmit}>
			<div class="panel-body">
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
							<div class="search-dropdown-menu">
								{#if tagSearchResults.length > 0}
									{#each tagSearchResults as res}
										<button
											type="button"
											class="search-result-item"
											onclick={() => handleSelectSearchTag(res)}
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
												handleSetTag(tagSearchQuery);
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
									onclick={handleRemoveTag}
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
										onclick={() => handleSetTag(catTag.name)}
									>
										+ {catTag.name}
									</button>
								{/if}
							{/each}
						</div>
					{/if}
				</div>





				<!-- Dynamic Attributes Section (Based on Group & Category Schema Blueprint) -->
				{#if dynamicBlueprint.length > 0}
					<div class="dynamic-blueprint-section">
						<div class="section-header-compact">
							<span class="section-title">
								{#if activeGroup?.icon}
									<span class="group-icon-indicator">◈</span>
								{/if}
								{activeGroup?.name || 'Category'} Attributes
							</span>
							<span class="section-hint">Dynamic fields</span>
						</div>

						<div class="dynamic-fields-grid">
							{#each dynamicBlueprint as field (field.key)}
								<div class="field-group" class:full-width={field.type === 'text' || field.type === 'multiselect'}>
									<label class="field-label" for="dyn-{field.key}">
										{field.label}
										{#if field.required}<span class="required">*</span>{/if}
										{#if field.unit}<span class="field-unit">({field.unit})</span>{/if}
									</label>

									{#if field.type === 'select'}
										<div class="select-wrapper">
											<select
												id="dyn-{field.key}"
												class="select-input"
												bind:value={metadata[field.key]}
											>
												<option value="">-- Select {field.label} --</option>
												{#each field.options || [] as opt}
													<option value={opt}>{opt}</option>
												{/each}
											</select>
											<span class="select-arrow">▾</span>
										</div>
									{:else if field.type === 'boolean'}
										<label class="checkbox-label" for="dyn-{field.key}">
											<input
												id="dyn-{field.key}"
												type="checkbox"
												class="checkbox-input"
												bind:checked={metadata[field.key]}
											/>
											<span>{field.description || field.label}</span>
										</label>
									{:else if field.type === 'date'}
										<input
											id="dyn-{field.key}"
											type="date"
											class="text-input"
											bind:value={metadata[field.key]}
										/>
									{:else if field.type === 'datetime'}
										<input
											id="dyn-{field.key}"
											type="datetime-local"
											class="text-input"
											bind:value={metadata[field.key]}
										/>
									{:else if field.type === 'number'}
										<input
											id="dyn-{field.key}"
											type="number"
											step="any"
											class="text-input"
											placeholder={field.placeholder || ''}
											bind:value={metadata[field.key]}
										/>
									{:else}
										<input
											id="dyn-{field.key}"
											type="text"
											class="text-input"
											placeholder={field.placeholder || ''}
											bind:value={metadata[field.key]}
										/>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Description Input -->
				<div class="field-group">
					<label class="field-label" for="item-description">Description & Notes</label>
					<textarea
						id="item-description"
						class="textarea-input"
						rows="3"
						bind:value={description}
						placeholder="Add specific notes, serial numbers, or location details..."
					></textarea>
				</div>
			</div>

			<!-- Panel Footer -->
			<div class="panel-footer">
				<button type="button" class="btn btn-secondary" onclick={onClose}>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={isSaving || !name.trim()}
				>
					{isSaving ? 'Saving...' : mode === 'edit' ? 'Update Item' : 'Add Item'}
				</button>
			</div>
		</form>
	</aside>



	<!-- Delete Confirmation Dialog -->
	{#if isConfirmingDelete}
		<div
			class="confirm-modal-backdrop"
			onclick={() => (isConfirmingDelete = false)}
			role="presentation"
			aria-hidden="true"
		></div>

		<div class="confirm-modal-dialog" role="dialog" aria-labelledby="confirm-delete-title" aria-modal="true">
			<div class="confirm-modal-header">
				<div class="confirm-danger-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="3 6 5 6 21 6" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					</svg>
				</div>
				<h3 id="confirm-delete-title" class="confirm-modal-title">Delete Item</h3>
			</div>

			<p class="confirm-modal-message">
				Are you sure you want to delete <strong>"{name || 'this item'}"</strong>? This action cannot be undone.
			</p>

			<div class="confirm-modal-actions">
				<button
					type="button"
					class="btn btn-secondary compact"
					onclick={() => (isConfirmingDelete = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="btn btn-danger compact"
					onclick={handleExecuteDelete}
				>
					Delete Item
				</button>
			</div>
		</div>
	{/if}
{/if}

<style>
	.panel-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.35);
		z-index: 100;
	}

	.item-side-panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		background: var(--bg-secondary);
		border-left: 1px solid var(--border-subtle);
		z-index: 101;
		display: flex;
		flex-direction: column;
		box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
	}

	.resize-handle {
		position: absolute;
		left: -4px;
		top: 0;
		bottom: 0;
		width: 8px;
		cursor: col-resize;
		z-index: 102;
	}

	.resize-handle:hover,
	.resize-handle.resizing {
		background: var(--primary);
		opacity: 0.5;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.header-titles {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
		margin-right: 1rem;
	}

	.panel-subtitle {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.panel-title-input {
		width: 100%;
		border: none;
		outline: none;
		background: transparent;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.01em;
		padding: 0;
		margin: 0;
		font-family: inherit;
	}

	.panel-title-input:focus {
		outline: none;
	}

	.panel-title-input::placeholder {
		color: var(--text-muted);
		font-weight: 400;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-icon svg {
		width: 16px;
		height: 16px;
	}

	.btn-icon:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.delete-btn:hover {
		background: color-mix(in srgb, var(--danger, #ef4444) 10%, transparent);
		border-color: color-mix(in srgb, var(--danger, #ef4444) 30%, transparent);
		color: var(--danger, #ef4444);
	}

	.panel-form {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
	}

	.panel-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.label-with-action {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.field-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.required {
		color: var(--danger, #ef4444);
	}

	.text-action-btn {
		background: none;
		border: none;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--primary);
		cursor: pointer;
		padding: 0;
	}

	.text-action-btn:hover {
		text-decoration: underline;
	}



	.text-input,
	.select-input,
	.textarea-input {
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

	.text-input:focus,
	.select-input:focus,
	.textarea-input:focus {
		border-color: var(--border-focus);
	}

	.textarea-input {
		resize: vertical;
		font-family: inherit;
	}

	.select-wrapper {
		position: relative;
	}

	.select-input {
		appearance: none;
		padding-right: 2rem;
		cursor: pointer;
	}

	.select-arrow {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	.two-col-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.checkbox-field {
		justify-content: center;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
		cursor: pointer;
		user-select: none;
	}

	.checkbox-input {
		width: 1rem;
		height: 1rem;
		accent-color: var(--primary);
		cursor: pointer;
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

	.panel-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
	}

	.btn {
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary {
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		color: var(--text-secondary);
	}

	.btn-secondary:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.btn-primary {
		border: 1px solid transparent;
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--primary-hover);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-danger {
		border: 1px solid transparent;
		background: var(--danger, #ef4444);
		color: #ffffff;
	}

	.btn-danger:hover {
		opacity: 0.9;
	}

	.btn.compact {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
	}

	/* Delete Confirmation Dialog Styles */
	.confirm-modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(31, 38, 51, 0.45);
		z-index: 120;
	}

	.confirm-modal-dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 90%;
		max-width: 400px;
		background: var(--bg-secondary);
		border-radius: var(--radius-md);
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
		z-index: 121;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		border: 1px solid var(--border-subtle);
	}

	.confirm-modal-header {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.confirm-danger-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
		background-color: color-mix(in srgb, var(--danger, #ef4444) 10%, transparent);
		color: var(--danger, #ef4444);
		flex-shrink: 0;
	}

	.confirm-danger-icon svg {
		width: 16px;
		height: 16px;
	}

	.confirm-modal-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.confirm-modal-message {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.45;
	}

	.confirm-modal-message strong {
		color: var(--text-primary);
		font-weight: 600;
	}

	.confirm-modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	/* Dynamic Blueprint Section Styles */
	.dynamic-blueprint-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.875rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.section-header-compact {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.375rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.section-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.group-icon-indicator {
		font-size: 0.75rem;
		color: var(--primary);
	}

	.section-hint {
		font-size: 0.6875rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.dynamic-fields-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.dynamic-fields-grid .full-width {
		grid-column: span 2;
	}

	/* Smart Tag Search Styles */
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

	.taxonomy-selectors-grid {
		margin-top: 0.25rem;
	}
</style>
