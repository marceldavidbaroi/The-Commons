<script lang="ts">
	import { onMount } from 'svelte';
	import { getSupabaseClient } from '$lib/supabase';
	import TagSelectorPanel from '$lib/components/TagSelectorPanel.svelte';
	import TagManagementSidePanel from '$lib/components/TagManagementSidePanel.svelte';
	import type { Tag, TagCategory, TagGroup, DynamicFieldDefinition } from '$lib/types/tags';
	import type { UserItem, ItemType } from '$lib/types/homeops';

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
	let itemType = $state<ItemType>('consumable');
	let selectedGroupId = $state<number | null>(null);
	let selectedGroupSlug = $state<string | null>(null);
	let selectedCategoryId = $state<number | null>(null);
	let selectedCategorySlug = $state<string | null>(null);
	let selectedCategoryName = $state<string>('');
	let selectedCategoryColor = $state<string>('#F59E0B');
	let quantity = $state<number | string>(1);
	let unitOfMeasure = $state('pcs');
	let reorderThreshold = $state<number | string>(1);
	let expirationDate = $state('');
	let conditionStatus = $state('Good');
	let isLoaned = $state(false);
	let loanedTo = $state('');
	let tags = $state<string[]>([]);
	let tagInput = $state('');
	let metadata = $state<Record<string, any>>({});

	// UI & Panel state
	let panelWidth = $state(DEFAULT_PANEL_WIDTH);
	let isResizing = $state(false);
	let isSaving = $state(false);
	let isTagSelectorOpen = $state(false);
	let isTagManagementOpen = $state(false);
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
			handleAddTag(val);
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
				itemType = item.item_type || 'consumable';
				selectedCategoryId = item.category_id || null;
				selectedCategoryName = item.category_name || '';
				selectedGroupId = item.group_id || (categories.find((c: any) => c.id === item?.category_id)?.group_id || null);
				selectedCategoryColor = item.category_color || '#F59E0B';
				quantity = item.quantity ?? 1;
				unitOfMeasure = item.unit_of_measure || 'pcs';
				reorderThreshold = item.reorder_threshold ?? 1;
				expirationDate = item.expiration_date || '';
				conditionStatus = item.condition_status || 'Good';
				isLoaned = item.is_loaned || false;
				loanedTo = item.loaned_to || '';
				tags = item.tags ? item.tags.map((t: any) => t.name) : [];
				tagInput = '';
				metadata = item.metadata ? JSON.parse(JSON.stringify(item.metadata)) : {};
			} else {
				// Reset for creation
				name = '';
				description = '';
				itemType = 'consumable';
				quantity = 1;
				unitOfMeasure = 'pcs';
				reorderThreshold = 1;
				expirationDate = '';
				conditionStatus = 'Good';
				isLoaned = false;
				loanedTo = '';
				tags = [];
				tagInput = '';
				metadata = {};
				if (groups.length > 0) {
					selectedGroupId = groups[0].id;
					const groupCats = categories.filter((c: any) => c.group_id === groups[0].id || c.tag_group?.id === groups[0].id);
					if (groupCats.length > 0) {
						selectedCategoryId = groupCats[0].id;
						selectedCategoryName = groupCats[0].name;
						selectedCategoryColor = groupCats[0].color || '#F59E0B';
					}
				} else if (categories.length > 0) {
					selectedCategoryId = categories[0].id;
					selectedCategoryName = categories[0].name;
					selectedCategoryColor = categories[0].color || '#F59E0B';
					selectedGroupId = categories[0].group_id || null;
				}
			}
		}
	});

	async function handleExecuteDelete() {
		if (item && onDelete) {
			await onDelete(item.id);
			isConfirmingDelete = false;
		}
	}

	function handleGroupSelect(e: Event) {
		const target = e.target as HTMLSelectElement;
		const grpId = target.value ? Number(target.value) : null;
		selectedGroupId = grpId;

		// When group changes, adjust selected category to first category in this group (or null)
		const groupCats = grpId
			? categories.filter((c: any) => c.group_id === grpId || c.tag_group?.id === grpId)
			: categories;

		if (groupCats.length > 0) {
			const isCurrentInGroup = groupCats.some((c: any) => c.id === selectedCategoryId);
			if (!isCurrentInGroup) {
				selectedCategoryId = groupCats[0].id;
				selectedCategoryName = groupCats[0].name;
				selectedCategoryColor = groupCats[0].color || '#F59E0B';
			}
		} else {
			selectedCategoryId = null;
			selectedCategoryName = '';
		}
	}

	function handleCategorySelect(e: Event) {
		const target = e.target as HTMLSelectElement;
		const catId = target.value ? Number(target.value) : null;
		const found = categories.find((c: any) => c.id === catId);
		if (found) {
			selectedCategoryId = found.id;
			selectedCategoryName = found.name;
			selectedCategoryColor = found.color || '#F59E0B';
			// Keep group synced if category has a group
			if (found.group_id) {
				selectedGroupId = found.group_id;
			}
		} else {
			selectedCategoryId = null;
			selectedCategoryName = '';
		}
	}

	function handleAddTag(rawTag: string) {
		const trimmed = rawTag.trim().replace(/^#/, '');
		if (trimmed && !tags.includes(trimmed)) {
			tags = [...tags, trimmed];
		}
		tagInput = '';
	}

	function handleRemoveTag(tagToRemove: string) {
		tags = tags.filter((t) => t !== tagToRemove);
	}

	function handleTagKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			handleAddTag(tagInput);
		} else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
			handleRemoveTag(tags[tags.length - 1]);
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		isSaving = true;
		try {
			// Find tag objects and tag slugs for selected tags
			const tagObjects: { id?: number; slug?: string; name: string; color?: string | null }[] = [];
			const tagSlugs: string[] = [];

			for (const tName of tags) {
				let matchedTag: any = null;
				let matchedColor = selectedCategoryColor;
				for (const cat of categories) {
					const found = cat.tags?.find((t: any) => t.name.toLowerCase() === tName.toLowerCase() || t.slug === tName.toLowerCase());
					if (found) {
						matchedTag = found;
						matchedColor = cat.color;
						break;
					}
				}

				const tSlug = matchedTag?.slug || tName.toLowerCase().trim().replace(/[^a-z0-9\s-_]/g, '').replace(/[\s_]+/g, '-');
				tagSlugs.push(tSlug);
				tagObjects.push({
					id: matchedTag?.id,
					slug: tSlug,
					name: matchedTag?.name || tName,
					color: matchedColor
				});
			}

			const catSlug = activeCategory?.slug || selectedCategorySlug || (selectedCategoryName ? selectedCategoryName.toLowerCase().trim().replace(/[^a-z0-9\s-_]/g, '').replace(/[\s_]+/g, '-') : null);
			const grpSlug = activeGroup?.slug || selectedGroupSlug || (activeGroup?.name ? activeGroup.name.toLowerCase().trim().replace(/[^a-z0-9\s-_]/g, '').replace(/[\s_]+/g, '-') : null);

			const payload: Partial<UserItem> = {
				name: name.trim(),
				description: description.trim() || null,
				item_type: itemType,
				category_id: selectedCategoryId,
				category_slug: catSlug,
				category_name: selectedCategoryName,
				category_color: selectedCategoryColor,
				tag_ids: tagObjects.filter((t) => typeof t.id === 'number').map((t) => t.id as number),
				tag_slugs: tagSlugs,
				tags: tagObjects,
				quantity: itemType === 'consumable' ? Number(quantity) : 1,
				unit_of_measure: itemType === 'consumable' ? unitOfMeasure : null,
				reorder_threshold: itemType === 'consumable' ? Number(reorderThreshold) : null,
				expiration_date: itemType === 'consumable' && expirationDate ? expirationDate : null,
				condition_status: itemType === 'asset' ? conditionStatus : null,
				is_loaned: itemType === 'asset' ? isLoaned : false,
				loaned_to: itemType === 'asset' && isLoaned ? loanedTo : null,
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
				<!-- Item Type Selector Tabs -->
				<div class="field-group">
					<label class="field-label" for="item-type-segment">Item Type</label>
					<div id="item-type-segment" class="type-segment">
						<button
							type="button"
							class="segment-btn"
							class:active={itemType === 'consumable'}
							onclick={() => (itemType = 'consumable')}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
								<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
								<line x1="3" y1="6" x2="21" y2="6" />
								<path d="M16 10a4 4 0 0 1-8 0" />
							</svg>
							Consumable
						</button>
						<button
							type="button"
							class="segment-btn"
							class:active={itemType === 'asset'}
							onclick={() => (itemType = 'asset')}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
								<rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
								<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
							</svg>
							Durable Asset
						</button>
					</div>
				</div>

				<!-- Step 1: Domain Group Selection -->
				<div class="field-group">
					<div class="label-with-action">
						<label class="field-label" for="item-group">
							<span class="step-num">1</span> Domain Group <span class="required">*</span>
						</label>
						<button
							type="button"
							class="text-action-btn"
							onclick={() => (isTagManagementOpen = true)}
						>
							Manage Taxonomy
						</button>
					</div>
					<div class="select-wrapper">
						<select
							id="item-group"
							class="select-input"
							value={selectedGroupId}
							onchange={handleGroupSelect}
						>
							<option value="">-- Select Domain Group --</option>
							{#each groups as grp}
								<option value={grp.id}>{grp.name}</option>
							{/each}
						</select>
						<span class="select-arrow">▾</span>
					</div>
				</div>

				<!-- Step 2: Category Selection (Filtered by Group) -->
				<div class="field-group">
					<label class="field-label" for="item-category">
						<span class="step-num">2</span> Tag Category <span class="required">*</span>
					</label>
					<div class="select-wrapper">
						<select
							id="item-category"
							class="select-input"
							value={selectedCategoryId}
							onchange={handleCategorySelect}
							disabled={!selectedGroupId || availableGroupCategories.length === 0}
						>
							<option value="">
								{!selectedGroupId
									? '-- Select a Domain Group first --'
									: availableGroupCategories.length > 0
										? `-- Select Category in ${activeGroup?.name || 'group'} --`
										: 'No categories found for this group'}
							</option>
							{#each availableGroupCategories as cat}
								<option value={cat.id}>{cat.name}</option>
							{/each}
						</select>
						<span class="select-arrow">▾</span>
					</div>
				</div>

				<!-- Tags Capsule Section with Category Tag Dropdown -->
				<div class="field-group">
					<div class="label-with-action">
						<label class="field-label" for="category-tag-select">
							<span class="step-num">3</span> Tags ({selectedCategoryName || 'Category'})
						</label>
						<button
							type="button"
							class="text-action-btn"
							onclick={() => (isTagSelectorOpen = true)}
						>
							Browse All Tags
						</button>
					</div>

					<!-- Category-specific Tag Dropdown -->
					<div class="select-wrapper">
						<select
							id="category-tag-select"
							class="select-input"
							onchange={handleSelectTagFromDropdown}
							disabled={!selectedCategoryId || availableCategoryTags.length === 0}
						>
							<option value="">
								{!selectedCategoryId
									? '-- Select a Category first --'
									: availableCategoryTags.length > 0
										? `+ Select a tag from ${selectedCategoryName || 'category'}...`
										: 'No tags available in this category'}
							</option>
							{#each availableCategoryTags as tag}
								<option value={tag.name} disabled={tags.includes(tag.name)}>
									{tags.includes(tag.name) ? `✓ ${tag.name} (Added)` : tag.name}
								</option>
							{/each}
						</select>
						<span class="select-arrow">▾</span>
					</div>

					<!-- Selected Tag Capsules Container -->
					<div class="tags-input-container">
						{#each tags as tag}
							<span class="tag-capsule">
								<span class="tag-hash">#</span>
								<span class="tag-name">{tag}</span>
								<button
									type="button"
									class="tag-remove"
									onclick={() => handleRemoveTag(tag)}
									aria-label={`Remove tag ${tag}`}
								>
									✕
								</button>
							</span>
						{/each}
						<input
							id="item-tag-input"
							type="text"
							class="tag-inline-input"
							bind:value={tagInput}
							onkeydown={handleTagKeyDown}
							placeholder={tags.length === 0 ? 'Or type custom tag and press Enter...' : 'Add another tag...'}
						/>
					</div>

					<!-- Quick Tag Suggestions from Selected Category -->
					{#if availableCategoryTags.length > 0}
						<div class="tag-suggestions-row">
							<span class="suggestions-label">Suggestions:</span>
							{#each availableCategoryTags as catTag}
								{#if !tags.includes(catTag.name)}
									<button
										type="button"
										class="suggestion-pill"
										onclick={() => handleAddTag(catTag.name)}
									>
										+ {catTag.name}
									</button>
								{/if}
							{/each}
						</div>
					{/if}
				</div>

				<!-- Dynamic Fields: Consumable vs Asset -->
				{#if itemType === 'consumable'}
					<div class="two-col-grid">
						<div class="field-group">
							<label class="field-label" for="item-qty">Quantity</label>
							<input
								id="item-qty"
								type="number"
								step="any"
								min="0"
								class="text-input"
								bind:value={quantity}
							/>
						</div>
						<div class="field-group">
							<label class="field-label" for="item-uom">Unit of Measure</label>
							<input
								id="item-uom"
								type="text"
								class="text-input"
								bind:value={unitOfMeasure}
								placeholder="pcs, kg, liters, boxes"
							/>
						</div>
					</div>

					<div class="two-col-grid">
						<div class="field-group">
							<label class="field-label" for="item-reorder">Low Stock Alert</label>
							<input
								id="item-reorder"
								type="number"
								step="any"
								min="0"
								class="text-input"
								bind:value={reorderThreshold}
								placeholder="Threshold"
							/>
						</div>
						<div class="field-group">
							<label class="field-label" for="item-expiry">Expiration Date</label>
							<input
								id="item-expiry"
								type="date"
								class="text-input"
								bind:value={expirationDate}
							/>
						</div>
					</div>
				{:else}
					<!-- Asset Specific Fields -->
					<div class="two-col-grid">
						<div class="field-group">
							<label class="field-label" for="item-condition">Condition</label>
							<select id="item-condition" class="select-input" bind:value={conditionStatus}>
								<option value="New">New / Sealed</option>
								<option value="Excellent">Excellent</option>
								<option value="Good">Good</option>
								<option value="Fair">Fair</option>
								<option value="Needs Maintenance">Needs Maintenance</option>
							</select>
						</div>
						<div class="field-group checkbox-field">
							<label class="checkbox-label" for="item-loaned">
								<input
									id="item-loaned"
									type="checkbox"
									class="checkbox-input"
									bind:checked={isLoaned}
								/>
								<span>Currently Lent Out</span>
							</label>
						</div>
					</div>

					{#if isLoaned}
						<div class="field-group">
							<label class="field-label" for="item-borrower">Borrower Name / Notes</label>
							<input
								id="item-borrower"
								type="text"
								class="text-input"
								bind:value={loanedTo}
								placeholder="Who has this item?"
							/>
						</div>
					{/if}
				{/if}

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

	<!-- Tag Selector Modal -->
	<TagSelectorPanel
		feature="homeops"
		isOpen={isTagSelectorOpen}
		selectedTags={tags}
		onClose={() => (isTagSelectorOpen = false)}
		onSave={(newTags) => {
			tags = newTags;
			isTagSelectorOpen = false;
		}}
	/>

	<!-- Tag Management Drawer -->
	<TagManagementSidePanel
		isOpen={isTagManagementOpen}
		feature="homeops"
		onClose={() => {
			isTagManagementOpen = false;
			handleTaxonomyUpdated();
		}}
	/>

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

	.type-segment {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		background: var(--bg-tertiary);
		padding: 0.25rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
	}

	.segment-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem;
		border: none;
		border-radius: calc(var(--radius-sm) - 2px);
		background: transparent;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.segment-btn svg {
		width: 16px;
		height: 16px;
	}

	.segment-btn.active {
		background: var(--bg-secondary);
		color: var(--text-primary);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
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

	.tag-inline-input {
		border: none;
		outline: none;
		font-size: 0.8125rem;
		flex: 1;
		min-width: 120px;
		padding: 0.25rem;
		background: transparent;
		color: var(--text-primary);
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

	.field-unit {
		font-size: 0.6875rem;
		color: var(--text-muted);
		font-weight: normal;
		margin-left: 0.25rem;
	}

	.step-num {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 17px;
		height: 17px;
		border-radius: var(--radius-full);
		background: color-mix(in srgb, var(--primary) 15%, transparent);
		color: var(--primary);
		font-size: 0.6875rem;
		font-weight: 700;
		line-height: 1;
		margin-right: 0.25rem;
	}
</style>
