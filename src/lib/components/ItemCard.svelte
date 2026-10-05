<script lang="ts">
	import type { UserItem } from '$lib/types/homeops';

	let {
		item,
		onclick,
		onSelectTag
	} = $props<{
		item: UserItem;
		onclick?: (item: UserItem) => void;
		onSelectTag?: (tagIdOrSlug: number | string) => void;
	}>();

	function handleCardClick() {
		if (onclick) {
			onclick(item);
		}
	}

	function handleTagClick(e: MouseEvent, tagIdOrSlug?: number | string) {
		e.stopPropagation();
		if (onSelectTag && tagIdOrSlug !== undefined) {
			onSelectTag(tagIdOrSlug);
		}
	}

	// Dynamic metadata highlights (e.g. expiration date, warranty, serial)
	let metaHighlights = $derived.by(() => {
		const meta = item.metadata;
		if (!meta || typeof meta !== 'object') return [];
		const highlights: Array<{ label: string; value: string; badgeType?: string }> = [];

		if (meta.expiration_date) {
			highlights.push({ label: 'Exp', value: String(meta.expiration_date), badgeType: 'warning' });
		}
		if (meta.warranty_until) {
			highlights.push({ label: 'Warranty', value: String(meta.warranty_until) });
		}
		if (meta.needs_charge) {
			highlights.push({ label: 'Battery', value: 'Needs Charge', badgeType: 'alert' });
		}
		if (meta.storage_temp && meta.storage_temp !== 'Pantry / Ambient') {
			highlights.push({ label: 'Storage', value: String(meta.storage_temp) });
		}
		if (meta.brand_maker) {
			highlights.push({ label: 'Brand', value: String(meta.brand_maker) });
		}
		return highlights.slice(0, 3);
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="item-card" onclick={handleCardClick} class:clickable={!!onclick}>
	<div class="card-header">
		<div class="title-with-group">
			{#if item.group_name}
				<span class="group-pill" title={item.group_name}>
					{item.group_name}
				</span>
			{/if}
			<h3 class="item-name">{item.name}</h3>
		</div>
		{#if item.item_type}
			<span class="type-pill type-{item.item_type}">
				{item.item_type}
			</span>
		{/if}
	</div>

	{#if item.description}
		<p class="item-description">{item.description}</p>
	{/if}

	<!-- Dynamic Metadata Micro-Badges -->
	{#if metaHighlights.length > 0}
		<div class="meta-strip">
			{#each metaHighlights as m}
				<span class="meta-badge" class:meta-badge-warning={m.badgeType === 'warning'} class:meta-badge-alert={m.badgeType === 'alert'}>
					<span class="meta-key">{m.label}:</span>
					<span class="meta-val">{m.value}</span>
				</span>
			{/each}
		</div>
	{/if}

	<div class="capsules-wrapper">
		{#if item.category_name}
			<span
				class="capsule category-capsule"
				style={item.category_color ? `--badge-accent: ${item.category_color};` : ''}
			>
				<span class="capsule-dot"></span>
				<span class="capsule-label">{item.category_name}</span>
			</span>
		{/if}

		{#if item.tags && item.tags.length > 0}
			{#each item.tags as tag (tag.slug || tag.id || tag.name)}
				<button
					type="button"
					class="capsule tag-capsule"
					style={tag.color ? `--badge-accent: ${tag.color};` : ''}
					onclick={(e) => handleTagClick(e, tag.slug || tag.id)}
				>
					<span class="tag-hash">#</span>
					<span class="capsule-label">{tag.name}</span>
				</button>
			{/each}
		{/if}
	</div>
</div>

<style>
	.item-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 0.875rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		position: relative;
	}

	.item-card.clickable {
		cursor: pointer;
	}

	.item-card.clickable:hover {
		border-color: var(--border-focus);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	}

	.card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.title-with-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.group-pill {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.item-name {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
		line-height: 1.3;
		letter-spacing: -0.01em;
	}

	.type-pill {
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: capitalize;
		padding: 0.125rem 0.4375rem;
		border-radius: var(--radius-full);
		letter-spacing: 0.02em;
		flex-shrink: 0;
	}

	.type-consumable {
		background: color-mix(in srgb, var(--success, #22c55e) 12%, transparent);
		color: var(--success, #22c55e);
		border: 1px solid color-mix(in srgb, var(--success, #22c55e) 25%, transparent);
	}

	.type-asset {
		background: color-mix(in srgb, var(--primary) 12%, transparent);
		color: var(--primary);
		border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
	}

	.item-description {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.meta-strip {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}

	.meta-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6875rem;
		padding: 0.1875rem 0.4375rem;
		border-radius: var(--radius-sm);
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.meta-badge-warning {
		background: color-mix(in srgb, var(--warning, #f59e0b) 12%, transparent);
		border-color: color-mix(in srgb, var(--warning, #f59e0b) 30%, transparent);
		color: var(--warning, #f59e0b);
	}

	.meta-badge-alert {
		background: color-mix(in srgb, var(--danger, #c94a4a) 12%, transparent);
		border-color: color-mix(in srgb, var(--danger, #c94a4a) 30%, transparent);
		color: var(--danger, #c94a4a);
	}

	.meta-key {
		font-weight: 500;
		opacity: 0.85;
	}

	.meta-val {
		font-weight: 600;
	}

	.capsules-wrapper {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}

	.capsule {
		display: inline-flex;
		align-items: center;
		gap: 0.3125rem;
		font-size: 0.75rem;
		line-height: 1;
		padding: 0.25rem 0.5625rem;
		border-radius: var(--radius-full);
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border: 1px solid var(--border-subtle);
		font-weight: 500;
		white-space: nowrap;
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}

	.category-capsule {
		background: color-mix(in srgb, var(--badge-accent, var(--primary)) 8%, var(--bg-secondary));
		border-color: color-mix(in srgb, var(--badge-accent, var(--primary)) 30%, transparent);
		color: var(--text-primary);
	}

	.capsule-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--badge-accent, var(--primary));
		flex-shrink: 0;
	}

	.tag-capsule {
		cursor: pointer;
		font-family: inherit;
		border-style: solid;
		background: color-mix(in srgb, var(--badge-accent, var(--text-muted)) 6%, var(--bg-secondary));
		border-color: color-mix(in srgb, var(--badge-accent, var(--text-muted)) 24%, transparent);
	}

	.tag-capsule:hover {
		background: color-mix(in srgb, var(--badge-accent, var(--text-muted)) 14%, var(--bg-secondary));
		border-color: var(--badge-accent, var(--text-muted));
	}

	.tag-hash {
		color: var(--badge-accent, var(--text-muted));
		font-weight: 600;
		font-size: 0.6875rem;
	}

	.capsule-label {
		display: inline-block;
	}
</style>
