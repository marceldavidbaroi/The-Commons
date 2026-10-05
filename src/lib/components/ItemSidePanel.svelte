<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { cubicOut, cubicIn } from 'svelte/easing';
	import type { Tag, TagCategory, TagGroup, DynamicFieldDefinition } from '$lib/types/tags';
	import type { UserItem } from '$lib/types/homeops';
	import ItemPanelHeader from './item-side-panel/ItemPanelHeader.svelte';
	import ItemTagSearchSection, { type FlatTagItem } from './item-side-panel/ItemTagSearchSection.svelte';
	import ItemDynamicAttributesSection from './item-side-panel/ItemDynamicAttributesSection.svelte';
	import ItemPanelFooter from './item-side-panel/ItemPanelFooter.svelte';
	import ItemDeleteModal from './item-side-panel/ItemDeleteModal.svelte';
	import { MIN_PANEL_WIDTH, MAX_PANEL_WIDTH, DEFAULT_PANEL_WIDTH } from './item-side-panel/constants';

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

	// Quick Tag Search State
	let tagSearchQuery = $state('');
	let isTagSearchDropdownOpen = $state(false);

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

	// All tags across all categories and groups with parent metadata for instant lookup
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
				(tItem) =>
					tItem.tag.name.toLowerCase().includes(q) ||
					tItem.tag.slug.toLowerCase().includes(q) ||
					tItem.category.name.toLowerCase().includes(q) ||
					(tItem.group && tItem.group.name.toLowerCase().includes(q))
			)
			.slice(0, 8);
	});

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
				selectedTag = item.tag?.name || (item.tag_slug ? item.tag_slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : null);
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

	function handleSelectSearchTag(sItem: FlatTagItem) {
		selectedTag = sItem.tag.name;
		selectedCategoryId = sItem.category.id;
		selectedCategoryName = sItem.category.name;
		selectedCategoryColor = sItem.category.color || '#F59E0B';

		if (sItem.category.group_id) {
			selectedGroupId = sItem.category.group_id;
		} else if (sItem.group?.id) {
			selectedGroupId = sItem.group.id;
		}

		tagSearchQuery = '';
		isTagSearchDropdownOpen = false;
	}

	function handleSetTag(rawTag: string) {
		const trimmed = rawTag.trim().replace(/^#/, '');
		if (trimmed) {
			selectedTag = trimmed;
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

	async function handleExecuteDelete() {
		if (item && onDelete) {
			await onDelete(item.id);
			isConfirmingDelete = false;
		}
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
		transition:fade={{ duration: 250, easing: cubicOut }}
	></div>

	<aside
		class="item-side-panel"
		style={`--custom-panel-width: ${panelWidth}px;`}
		aria-label={mode === 'edit' ? 'Edit Item' : 'New Item'}
		transition:fly={{ x: panelWidth || 480, duration: 320, opacity: 0.8, easing: cubicOut }}
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
		<ItemPanelHeader
			{mode}
			bind:name
			showDelete={mode === 'edit' && !!item && !!onDelete}
			onDelete={() => (isConfirmingDelete = true)}
			{onClose}
		/>

		<!-- Form Body -->
		<form class="panel-form" onsubmit={handleSubmit}>
			<div class="panel-body">
				<!-- Tag Search & Selection -->
				<ItemTagSearchSection
					bind:tagSearchQuery
					bind:isTagSearchDropdownOpen
					bind:selectedTag
					{selectedCategoryName}
					{selectedCategoryColor}
					{activeGroup}
					{availableCategoryTags}
					{tagSearchResults}
					onSelectSearchTag={handleSelectSearchTag}
					onSetTag={handleSetTag}
					onRemoveTag={handleRemoveTag}
				/>

				<!-- Dynamic Attributes Section (Group & Category Blueprint) -->
				<ItemDynamicAttributesSection
					{activeGroup}
					{dynamicBlueprint}
					bind:metadata
				/>

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
			<ItemPanelFooter
				{isSaving}
				isValid={!!name.trim()}
				{mode}
				{onClose}
			/>
		</form>
	</aside>

	<!-- Delete Confirmation Dialog Modal -->
	<ItemDeleteModal
		isOpen={isConfirmingDelete}
		itemName={name}
		onCancel={() => (isConfirmingDelete = false)}
		onConfirm={handleExecuteDelete}
	/>
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
		width: var(--custom-panel-width, 560px);
		max-width: 100vw;
		background: var(--bg-secondary);
		border-left: 1px solid var(--border-subtle);
		z-index: 101;
		display: flex;
		flex-direction: column;
		box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
		transition: width 0.15s cubic-bezier(0.2, 0, 0, 1), background-color 0.3s ease, border-color 0.3s ease;
		will-change: transform, width, opacity;
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
		-webkit-overflow-scrolling: touch;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

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
		resize: vertical;
		font-family: inherit;
	}

	.textarea-input:focus {
		border-color: var(--border-focus);
	}

	@media (max-width: 640px) {
		.item-side-panel {
			width: 100vw !important;
			max-width: 100vw !important;
			border-left: none;
		}

		.resize-handle {
			display: none;
		}

		.panel-body {
			padding: 1rem;
			gap: 1rem;
		}
	}
</style>
