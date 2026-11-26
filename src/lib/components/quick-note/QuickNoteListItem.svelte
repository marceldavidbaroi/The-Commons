<script lang="ts">
	import type { QuickNote } from '$lib/types/quick-note';

	interface Props {
		note: QuickNote;
		selected: boolean;
		isTrash: boolean;
		onSelect: (note: QuickNote) => void;
		onTogglePin: (note: QuickNote) => void;
		onToggleLock: (note: QuickNote) => void;
		onDuplicate: (note: QuickNote) => void;
		onDelete: (note: QuickNote) => void;
		onRestore: (note: QuickNote) => void;
		onHardDelete: (note: QuickNote) => void;
	}

	let {
		note,
		selected,
		isTrash,
		onSelect,
		onTogglePin,
		onToggleLock,
		onDuplicate,
		onDelete,
		onRestore,
		onHardDelete
	}: Props = $props();

	let menuOpen = $state(false);
	let menuX = $state(0);
	let menuY = $state(0);

	function formatRelativeTime(iso: string): string {
		const date = new Date(iso);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m`;
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h`;
		const diffDays = Math.floor(diffHours / 24);
		if (diffDays < 7) return `${diffDays}d`;
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		menuX = e.clientX;
		menuY = e.clientY;
		menuOpen = true;
	}

	function closeMenu() {
		menuOpen = false;
	}

	function runAction(fn: () => void) {
		menuOpen = false;
		fn();
	}
</script>

<svelte:window onclick={closeMenu} />

<div
	class="qn-item"
	class:selected
	role="button"
	tabindex="0"
	onclick={() => onSelect(note)}
	oncontextmenu={handleContextMenu}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onSelect(note);
		}
	}}
>
	<div class="qn-item-top">
		<span class="qn-item-title">
			{note.title.trim() || 'New Note'}
		</span>
		<div class="qn-item-badges">
			{#if note.is_pinned && !isTrash}
				<span class="qn-badge" title="Pinned">📌</span>
			{/if}
			{#if note.is_locked}
				<span class="qn-badge" title="Locked">🔒</span>
			{/if}
			<span class="qn-time">{formatRelativeTime(note.deleted_at ?? note.updated_at)}</span>
		</div>
	</div>
	<div class="qn-item-preview">
		{#if note.is_locked}
			Locked note
		{:else}
			{note.preview.trim() || 'No additional text'}
		{/if}
	</div>
</div>

{#if menuOpen}
	<div
		class="qn-context-menu"
		style="left: {menuX}px; top: {menuY}px;"
		role="menu"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Escape' && closeMenu()}
	>
		{#if isTrash}
			<button type="button" class="qn-menu-item" onclick={() => runAction(() => onRestore(note))}>
				Restore
			</button>
			<button
				type="button"
				class="qn-menu-item danger"
				onclick={() => runAction(() => onHardDelete(note))}
			>
				Delete Permanently
			</button>
		{:else}
			<button type="button" class="qn-menu-item" onclick={() => runAction(() => onTogglePin(note))}>
				{note.is_pinned ? 'Unpin' : 'Pin'}
			</button>
			<button
				type="button"
				class="qn-menu-item"
				onclick={() => runAction(() => onToggleLock(note))}
			>
				{note.is_locked ? 'Unlock' : 'Lock'}
			</button>
			<button type="button" class="qn-menu-item" onclick={() => runAction(() => onDuplicate(note))}>
				Duplicate
			</button>
			<div class="qn-menu-divider"></div>
			<button
				type="button"
				class="qn-menu-item danger"
				onclick={() => runAction(() => onDelete(note))}
			>
				Delete
			</button>
		{/if}
	</div>
{/if}

<style>
	.qn-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.625rem 0.75rem;
		border-bottom: 1px solid var(--border-color);
		cursor: pointer;
		user-select: none;
		transition: background-color 0.12s ease;
	}

	.qn-item:hover {
		background-color: var(--bg-tertiary);
	}

	.qn-item.selected {
		background-color: color-mix(in srgb, var(--primary, #9E5A3C) 14%, transparent);
	}

	.qn-item-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.qn-item-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.qn-item-badges {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.qn-badge {
		font-size: 0.75rem;
		line-height: 1;
	}

	.qn-time {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.qn-item-preview {
		font-size: 0.8rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.qn-context-menu {
		position: fixed;
		z-index: 1000;
		min-width: 160px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 0.5rem;
		padding: 0.25rem;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
		display: flex;
		flex-direction: column;
	}

	.qn-menu-item {
		text-align: left;
		background: transparent;
		border: none;
		padding: 0.45rem 0.65rem;
		font-size: 0.825rem;
		color: var(--text-primary);
		border-radius: 0.35rem;
		cursor: pointer;
	}

	.qn-menu-item:hover {
		background-color: var(--bg-tertiary);
	}

	.qn-menu-item.danger {
		color: #ef4444;
	}

	.qn-menu-divider {
		height: 1px;
		background-color: var(--border-color);
		margin: 0.25rem 0;
	}
</style>
