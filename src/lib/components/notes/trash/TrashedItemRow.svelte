<script lang="ts">
	import type { TrashedItem } from '$lib/types/notes';

	let {
		item,
		onRestore,
		onPurge
	} = $props<{
		item: TrashedItem;
		onRestore: (item: TrashedItem) => void;
		onPurge: (item: TrashedItem) => void;
	}>();

	function formatDate(iso: string) {
		try {
			const d = new Date(iso);
			return d.toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return iso;
		}
	}
</script>

<div class="trashed-item-row" data-testid="trashed-row-{item.id}">
	<div class="item-icon {item.type}">
		{#if item.type === 'folder'}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
				<polyline points="14 2 14 8 20 8" />
				<line x1="16" y1="13" x2="8" y2="13" />
				<line x1="16" y1="17" x2="8" y2="17" />
				<polyline points="10 9 9 9 8 9" />
			</svg>
		{/if}
	</div>

	<div class="item-details">
		<span class="item-name" title={item.name}>{item.name}</span>
		<span class="item-meta">
			<span class="badge {item.type}">{item.type}</span>
			Deleted {formatDate(item.deleted_at)}
		</span>
	</div>

	<div class="item-actions">
		<button
			type="button"
			class="action-btn restore"
			title="Restore item"
			aria-label="Restore {item.name}"
			onclick={() => onRestore(item)}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="1 4 1 10 7 10" />
				<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
			</svg>
			<span>Restore</span>
		</button>

		<button
			type="button"
			class="action-btn purge"
			title="Permanently purge item"
			aria-label="Purge {item.name} permanently"
			onclick={() => onPurge(item)}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="3 6 5 6 21 6" />
				<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
			</svg>
			<span>Purge</span>
		</button>
	</div>
</div>

<style>
	.trashed-item-row {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.625rem;
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}

	.trashed-item-row:hover {
		border-color: var(--border-focus);
	}

	.item-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.item-icon.folder {
		color: var(--primary);
	}

	.item-icon svg {
		width: 15px;
		height: 15px;
	}

	.item-details {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
		gap: 0.125rem;
	}

	.item-name {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-meta {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.badge {
		text-transform: uppercase;
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		padding: 0.0625rem 0.25rem;
		border-radius: var(--radius-sm);
		background: var(--bg-surface);
	}

	.badge.folder {
		color: var(--primary);
	}

	.item-actions {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		color: var(--text-secondary);
		transition: all 0.15s ease;
	}

	.action-btn svg {
		width: 12px;
		height: 12px;
	}

	.action-btn.restore:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.action-btn.purge:hover {
		background: color-mix(in srgb, var(--danger, #ef4444) 12%, transparent);
		color: var(--danger, #ef4444);
		border-color: var(--danger, #ef4444);
	}
</style>
