<script lang="ts">
	import type { WorkspacePane } from '$lib/types/notes';
	import { notesStore } from '$lib/state/notes.svelte';

	let {
		pane
	} = $props<{
		pane: WorkspacePane;
	}>();

	function selectTab(index: number) {
		notesStore.setActivePane(pane.id);
		notesStore.setActiveTab(pane.id, index);
	}

	function closeTab(e: MouseEvent, index: number) {
		e.stopPropagation();
		notesStore.closeTab(pane.id, index);
	}

	function handleSplitRight(e: MouseEvent) {
		e.stopPropagation();
		notesStore.setActivePane(pane.id);
		const currentTab = pane.tabs[pane.activeTabIndex];
		notesStore.splitPaneRight(currentTab?.noteId);
	}

	function togglePin(e: MouseEvent, index: number) {
		e.stopPropagation();
		notesStore.togglePinTab(pane.id, index);
	}
</script>

<div class="tab-bar" role="tablist">
	<div class="tabs-scroll-area">
		{#if pane.tabs.length === 0}
			<div class="tab-empty-hint">No tabs open</div>
		{:else}
			{#each pane.tabs as tab, idx (tab.id)}
				{@const isActive = idx === pane.activeTabIndex}
				<div
					class="tab-item"
					class:active={isActive}
					class:pinned={tab.pinned}
					role="tab"
					aria-selected={isActive}
					tabindex="0"
					onclick={() => selectTab(idx)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							selectTab(idx);
						}
					}}
				>
					<!-- Tab icon -->
					{#if tab.type === 'graph'}
						<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="6" cy="6" r="3" />
							<circle cx="18" cy="18" r="3" />
							<line x1="8.5" y1="7.5" x2="15.5" y2="16.5" />
						</svg>
					{:else}
						<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
						</svg>
					{/if}

					<!-- Tab title -->
					<span class="tab-title" title={tab.title}>{tab.title || 'Untitled'}</span>

					<!-- Tab actions -->
					<div class="tab-actions">
						<!-- Pin toggle button -->
						<button
							type="button"
							class="tab-btn pin-btn"
							class:pinned={tab.pinned}
							title={tab.pinned ? 'Unpin tab' : 'Pin tab'}
							aria-label="Pin tab"
							onclick={(e) => togglePin(e, idx)}
						>
							<svg viewBox="0 0 24 24" fill={tab.pinned ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
								<line x1="12" y1="17" x2="12" y2="22" />
								<path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z" />
							</svg>
						</button>

						<!-- Close button (if not pinned) -->
						{#if !tab.pinned}
							<button
								type="button"
								class="tab-btn close-btn"
								title="Close tab"
								aria-label="Close tab"
								onclick={(e) => closeTab(e, idx)}
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Pane action buttons (Split Right) -->
	<div class="pane-controls">
		<button
			type="button"
			class="pane-ctrl-btn"
			title="Split Right (◫)"
			aria-label="Split Right"
			onclick={handleSplitRight}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="3" y="3" width="18" height="18" rx="2" />
				<line x1="12" y1="3" x2="12" y2="21" />
			</svg>
		</button>
	</div>
</div>

<style>
	.tab-bar {
		height: 36px;
		min-height: 36px;
		background: var(--bg-tertiary);
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		user-select: none;
		overflow: hidden;
	}

	.tabs-scroll-area {
		display: flex;
		align-items: stretch;
		overflow-x: auto;
		scrollbar-width: none;
		flex: 1;
	}

	.tabs-scroll-area::-webkit-scrollbar {
		display: none;
	}

	.tab-empty-hint {
		display: inline-flex;
		align-items: center;
		padding: 0 12px;
		font-size: 12px;
		color: var(--text-muted);
		font-style: italic;
	}

	.tab-item {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 0 12px;
		font-size: 12px;
		font-weight: 400;
		color: var(--text-secondary);
		background: transparent;
		border-right: 1px solid var(--border-subtle);
		cursor: pointer;
		max-width: 180px;
		min-width: 90px;
		transition: background 0.12s ease, color 0.12s ease;
		position: relative;
	}

	.tab-item:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.tab-item.active {
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-weight: 500;
	}

	.tab-item.active::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--primary);
	}

	.tab-icon {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
		opacity: 0.7;
	}

	.tab-title {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tab-actions {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		margin-left: 4px;
	}

	.tab-btn {
		width: 16px;
		height: 16px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: var(--text-muted);
		border-radius: var(--radius-sm);
		cursor: pointer;
		padding: 0;
		opacity: 0;
		transition: all 0.12s ease;
	}

	.tab-item:hover .tab-btn,
	.tab-btn.pinned {
		opacity: 1;
	}

	.tab-btn:hover {
		color: var(--text-primary);
		background: var(--bg-tertiary);
	}

	.pin-btn.pinned {
		color: var(--primary);
	}

	.pane-controls {
		display: flex;
		align-items: center;
		padding: 0 6px;
		border-left: 1px solid var(--border-subtle);
		background: var(--bg-tertiary);
	}

	.pane-ctrl-btn {
		width: 24px;
		height: 24px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		border-radius: var(--radius-sm);
		cursor: pointer;
		padding: 0;
		transition: all 0.12s ease;
	}

	.pane-ctrl-btn:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.pane-ctrl-btn svg {
		width: 15px;
		height: 15px;
	}
</style>
