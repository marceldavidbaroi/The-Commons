<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchUserProfile } from '$lib/services/member-service';
	import {
		fetchHomeOpsTaxonomy,
		fetchUserItems,
		createUserItem,
		updateUserItem,
		deleteUserItem
	} from '$lib/services/homeops-service';
	import ItemCard from '$lib/components/ItemCard.svelte';
	import ItemSidePanel from '$lib/components/ItemSidePanel.svelte';
	import type { UserItem } from '$lib/types/homeops';
	import type { TagGroup, TagCategory } from '$lib/types/tags';


	let items = $state<UserItem[]>([]);
	let isLoading = $state(true);
	let currentUserId = $state<number | null>(null);

	// Filter & Search state
	let searchQuery = $state('');
	let selectedTagFilter = $state<number | string | null>(null);
	let selectedGroupFilter = $state<string | null>(null);
	let groups = $state<TagGroup[]>([]);
	let categories = $state<TagCategory[]>([]);

	// Side Panel state
	let isPanelOpen = $state(false);
	let panelMode = $state<'create' | 'edit'>('create');
	let activeItem = $state<UserItem | null>(null);

	// Derived filtered items
	let filteredItems = $derived(
		items.filter((item) => {
			const query = searchQuery.trim().toLowerCase();
			let matchesSearch = true;
			if (query) {
				const inName = item.name.toLowerCase().includes(query);
				const inDesc = !!item.description && item.description.toLowerCase().includes(query);
				const inCat = !!item.category_name && item.category_name.toLowerCase().includes(query);
				const inGroup = !!item.group_name && item.group_name.toLowerCase().includes(query);
				const inMeta = item.metadata ? JSON.stringify(item.metadata).toLowerCase().includes(query) : false;
				matchesSearch = inName || inDesc || inCat || inGroup || inMeta;
			}

			const matchesGroup = !selectedGroupFilter || item.group_name === selectedGroupFilter;
			const matchesTag =
				!selectedTagFilter ||
				item.tag_slug === selectedTagFilter ||
				(item.tag &&
					(item.tag.slug === selectedTagFilter ||
						item.tag.id === selectedTagFilter ||
						item.tag.name.toLowerCase() === String(selectedTagFilter).toLowerCase()));

			return matchesSearch && matchesGroup && matchesTag;
		})
	);

	async function reloadTaxonomy() {
		try {
			const res = await fetchHomeOpsTaxonomy();
			groups = res.groups;
			categories = res.categories;
		} catch (err) {
			console.error('Error loading taxonomy:', err);
		}
	}

	async function loadUserItems() {
		isLoading = true;
		try {
			const [profile, taxRes] = await Promise.all([
				fetchUserProfile(),
				fetchHomeOpsTaxonomy()
			]);

			if (profile) {
				currentUserId = profile.id;
			}
			groups = taxRes.groups;
			categories = taxRes.categories;

			if (currentUserId) {
				const dbItems = await fetchUserItems(currentUserId);
				if (dbItems.length > 0) {
					// Hydrate tag object from loaded taxonomy
					items = dbItems.map((item) => {
						const cat = categories.find((c) => (item.category_slug && c.slug === item.category_slug) || c.id === item.category_id);
						const allTags = cat?.tags || categories.flatMap((c) => c.tags || []);
						
						let tagObj: { id?: number; slug?: string; name: string; color?: string | null } | null = null;
						if (item.tag_slug) {
							const matchedTag = allTags.find((t) => t.slug === item.tag_slug);
							tagObj = matchedTag || {
								slug: item.tag_slug,
								name: item.tag_slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
								color: cat?.color || '#F59E0B'
							};
						}
						return { ...item, tag: tagObj };
					});
				}
			}
		} catch (err) {
			console.error('Error fetching items', err);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadUserItems();
	});

	function handleOpenCreate() {
		activeItem = null;
		panelMode = 'create';
		isPanelOpen = true;
	}

	function handleOpenEdit(item: UserItem) {
		activeItem = item;
		panelMode = 'edit';
		isPanelOpen = true;
	}

	async function handleCreateItem(newItemData: Partial<UserItem>) {
		const userId = currentUserId || 1;
		const created = await createUserItem(userId, newItemData);
		if (created) {
			// Rule 4: Update state directly using the returned mutation record
			items = [created, ...items];
		}
	}

	async function handleSaveItem(updatedItem: UserItem) {
		const saved = await updateUserItem(updatedItem.id, updatedItem);
		if (saved) {
			// Rule 4: Update client state directly without secondary list refetch
			items = items.map((i) => (i.id === saved.id ? { ...i, ...saved } : i));
		}
	}

	async function handleDeleteItem(id: number) {
		// Rule 4: Mutate and filter locally
		const success = await deleteUserItem(id);
		if (success) {
			items = items.filter((i) => i.id !== id);
		}
		isPanelOpen = false;
	}

	function handleSelectTag(tagIdOrSlug: number | string) {
		selectedTagFilter = selectedTagFilter === tagIdOrSlug ? null : tagIdOrSlug;
	}
</script>

<svelte:head>
	<title>HomeOps - Household Inventory & Asset Ledger</title>
</svelte:head>

<div class="homeops-page">
	<!-- Tier 1: Header and Primary Action -->
	<div class="page-header">
		<div class="header-left">
			<h1 class="page-title">HomeOps</h1>
			<span class="count-badge">{items.length} items</span>
		</div>
		<div class="header-right">
			<button type="button" class="btn-primary-action" onclick={handleOpenCreate}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				<span>New Item</span>
			</button>
		</div>
	</div>

	<!-- Tier 2: Unified Interactive Toolbar -->
	<div class="toolbar-row">
		<div class="search-box">
			<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
			</svg>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Filter by name, category, or notes..."
				class="search-input"
			/>
			{#if searchQuery}
				<button class="clear-search" onclick={() => (searchQuery = '')}>✕</button>
			{/if}
		</div>



		<!-- Domain Group Filter Selector -->
		<div class="group-select-wrapper">
			<select
				class="group-filter-select"
				value={selectedGroupFilter || ''}
				onchange={(e) => {
					const val = (e.target as HTMLSelectElement).value;
					selectedGroupFilter = val || null;
				}}
			>
				<option value="">All Domain Groups</option>
				{#if groups.length > 0}
					{#each groups as grp}
						<option value={grp.name}>{grp.name}</option>
					{/each}
				{:else}
					{#each Array.from(new Set(items.map((i) => i.group_name).filter(Boolean))) as gName}
						<option value={gName}>{gName}</option>
					{/each}
				{/if}
			</select>
			<span class="select-arrow">▾</span>
		</div>

		{#if selectedGroupFilter}
			<button
				type="button"
				class="active-tag-filter"
				onclick={() => (selectedGroupFilter = null)}
				title="Clear domain filter"
			>
				<span>Group: {selectedGroupFilter}</span>
				<span class="clear-icon">✕</span>
			</button>
		{/if}

		{#if selectedTagFilter}
			<button
				type="button"
				class="active-tag-filter"
				onclick={() => (selectedTagFilter = null)}
				title="Clear tag filter"
			>
				<span>Filtered by Tag</span>
				<span class="clear-icon">✕</span>
			</button>
		{/if}
	</div>

	<!-- Main List / Grid Content -->
	{#if isLoading}
		<div class="loading-state">
			<div class="spinner"></div>
			<span>Loading inventory...</span>
		</div>
	{:else if filteredItems.length === 0}
		<div class="empty-state">
			<div class="empty-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
					<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
				</svg>
			</div>
			<h2>No items found</h2>
			<p>Get started by recording your household consumables or durable assets.</p>
			<button type="button" class="btn-empty-action" onclick={handleOpenCreate}>
				+ Add First Item
			</button>
		</div>
	{:else}
		<div class="items-grid">
			{#each filteredItems as item (item.id)}
				<ItemCard
					{item}
					onclick={handleOpenEdit}
					onSelectTag={handleSelectTag}
				/>
			{/each}
		</div>
	{/if}
</div>

<!-- Slide-out Creation/Edit Panel -->
<ItemSidePanel
	isOpen={isPanelOpen}
	mode={panelMode}
	item={activeItem}
	{groups}
	{categories}
	onClose={() => (isPanelOpen = false)}
	onCreate={handleCreateItem}
	onSave={handleSaveItem}
	onDelete={handleDeleteItem}
	onTaxonomyChange={reloadTaxonomy}
/>

<style>
	.homeops-page {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* Tier 1: Header Row */
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 40px;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.page-title {
		font-size: 1.375rem;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		margin: 0;
	}

	.count-badge {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.15rem 0.5rem;
		border-radius: var(--radius-full);
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
	}

	.btn-primary-action {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.4375rem 0.875rem;
		border-radius: var(--radius-sm);
		background: var(--primary);
		color: var(--primary-foreground);
		font-size: 0.8125rem;
		font-weight: 500;
		border: 1px solid transparent;
		cursor: pointer;
		transition: background-color 0.15s ease, opacity 0.15s ease;
	}

	.btn-primary-action svg {
		width: 14px;
		height: 14px;
	}

	.btn-primary-action:hover {
		background: var(--primary-hover);
	}

	/* Tier 2: Toolbar Row */
	.toolbar-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 36px;
	}

	.search-box {
		position: relative;
		flex: 1;
		max-width: 380px;
		display: flex;
		align-items: center;
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
		height: 34px;
		padding: 0 1.75rem 0 2rem;
		font-size: 0.8125rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.15s ease;
	}

	.search-input:focus {
		border-color: var(--border-focus);
	}

	.clear-search {
		position: absolute;
		right: 0.5rem;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0.25rem;
	}

	.active-tag-filter {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--primary) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
		color: var(--primary);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
	}

	.clear-icon {
		font-size: 0.6875rem;
	}

	/* Grid & Content */
	.items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 0.875rem;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 4rem 0;
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--border-subtle);
		border-top-color: var(--primary);
		border-radius: var(--radius-full);
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 4rem 2rem;
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-md);
		background: var(--bg-secondary);
	}

	.empty-icon {
		width: 44px;
		height: 44px;
		margin-bottom: 0.875rem;
		color: var(--text-muted);
	}

	.empty-icon svg {
		width: 100%;
		height: 100%;
	}

	.empty-state h2 {
		font-size: 1.0625rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 0.375rem 0;
	}

	.empty-state p {
		font-size: 0.8125rem;
		color: var(--text-muted);
		max-width: 360px;
		margin: 0 0 1.25rem 0;
		line-height: 1.4;
	}

	.btn-empty-action {
		padding: 0.4375rem 0.875rem;
		border-radius: var(--radius-sm);
		background: var(--primary);
		color: var(--primary-foreground);
		font-size: 0.8125rem;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.btn-empty-action:hover {
		background: var(--primary-hover);
	}

	.group-select-wrapper {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.group-filter-select {
		appearance: none;
		-webkit-appearance: none;
		height: 32px;
		padding: 0 1.5rem 0 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		cursor: pointer;
		outline: none;
	}

	.group-filter-select:focus {
		border-color: var(--border-focus);
	}

	.select-arrow {
		position: absolute;
		right: 0.5rem;
		font-size: 0.6875rem;
		color: var(--text-muted);
		pointer-events: none;
	}
</style>
