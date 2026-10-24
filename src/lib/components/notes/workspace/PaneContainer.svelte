<script lang="ts">
	import type { WorkspacePane } from '$lib/types/notes';
	import { notesStore } from '$lib/state/notes.svelte';
	import TabBar from './TabBar.svelte';
	import LivePreviewEditor from '../editor/LivePreviewEditor.svelte';
	import GraphView from '../graph/GraphView.svelte';
	import type { Snippet } from 'svelte';

	let {
		pane,
		children
	} = $props<{
		pane: WorkspacePane;
		children?: Snippet<[{ pane: WorkspacePane }]>;
	}>();

	const isFocused = $derived(notesStore.activePaneId === pane.id);
	const activeTab = $derived(pane.tabs[pane.activeTabIndex] || null);

	function handleFocus() {
		if (notesStore.activePaneId !== pane.id) {
			notesStore.setActivePane(pane.id);
		}
	}
</script>

<div
	class="pane-container"
	class:focused={isFocused}
	tabindex="0"
	role="region"
	aria-label="Workspace Pane"
	onclick={handleFocus}
	onkeydown={(e) => {
		if (e.key === 'Enter') handleFocus();
	}}
>
	<!-- Tab Bar -->
	<TabBar {pane} />

	<!-- Pane Content Canvas -->
	<div class="pane-content">
		{#if children}
			{@render children({ pane })}
		{:else if !activeTab}
			<!-- Empty Pane Zero-State -->
			<div class="pane-empty-state">
				<div class="empty-icon-box">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
						<line x1="12" y1="18" x2="12" y2="12" />
						<line x1="9" y1="15" x2="15" y2="15" />
					</svg>
				</div>
				<h3 class="empty-title">No Note Open</h3>
				<p class="empty-desc">Select a note from the explorer, press <kbd>Cmd</kbd>+<kbd>P</kbd> to quick switch, or create a new note.</p>
				<button
					type="button"
					class="btn-new-note"
					onclick={() => notesStore.createNewNote()}
				>
					+ New Note
				</button>
			</div>
		{:else if activeTab.type === 'graph'}
			<GraphView
				nodes={notesStore.graphData.nodes}
				edges={notesStore.graphData.edges}
			/>
		{:else if activeTab.type === 'note' && activeTab.noteId}
			{@const currentNote = notesStore.activeNotesCache.get(activeTab.noteId)}
			<div class="note-view-wrapper">
				{#if !currentNote}
					<div class="loading-note">
						<span class="loading-spinner"></span>
						<span>Loading note...</span>
					</div>
				{:else}
					<LivePreviewEditor
						note={currentNote}
						onSplitRight={(id) => notesStore.splitPaneRight(id)}
					/>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.pane-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-width: 280px;
		background: var(--bg-secondary);
		position: relative;
		outline: none;
		flex: 1 1 0%;
		border-right: 1px solid var(--border-subtle);
	}

	.pane-container:last-child {
		border-right: none;
	}

	.pane-container.focused {
		box-shadow: inset 0 0 0 1px var(--primary);
	}

	.pane-content {
		flex: 1;
		overflow: auto;
		display: flex;
		flex-direction: column;
		position: relative;
		background: var(--bg-secondary);
	}

	.pane-empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 32px;
		text-align: center;
		color: var(--text-muted);
	}

	.empty-icon-box {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-md);
		background: var(--bg-tertiary);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		margin-bottom: 16px;
	}

	.empty-icon-box svg {
		width: 24px;
		height: 24px;
	}

	.empty-title {
		font-size: 15px;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0 0 6px 0;
	}

	.empty-desc {
		font-size: 13px;
		color: var(--text-secondary);
		max-width: 320px;
		line-height: 1.5;
		margin: 0 0 20px 0;
	}

	kbd {
		display: inline-block;
		padding: 1px 5px;
		font-family: var(--font-mono);
		font-size: 11px;
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: 4px;
		color: var(--text-primary);
	}

	.btn-new-note {
		padding: 7px 16px;
		font-size: 13px;
		font-weight: 500;
		background: var(--primary);
		color: var(--primary-foreground);
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-new-note:hover {
		background: var(--primary-hover);
	}

	.note-view-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.loading-note {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 100%;
		color: var(--text-muted);
		font-size: 13px;
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--border-subtle);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.note-simple-editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 24px 32px;
		max-width: 860px;
		width: 100%;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.editor-header {
		margin-bottom: 16px;
	}

	.note-title-input {
		width: 100%;
		border: none;
		outline: none;
		background: transparent;
		font-size: 26px;
		font-weight: 600;
		color: var(--text-primary);
		font-family: var(--font-serif);
		padding: 0;
	}

	.editor-body {
		flex: 1;
		display: flex;
	}

	.note-textarea {
		width: 100%;
		height: 100%;
		border: none;
		outline: none;
		resize: none;
		background: transparent;
		font-family: var(--font-sans);
		font-size: 15px;
		line-height: 1.6;
		color: var(--text-primary);
	}

	.graph-tab-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--text-muted);
		text-align: center;
	}

	.placeholder-icon {
		width: 40px;
		height: 40px;
		margin-bottom: 12px;
		color: var(--text-muted);
	}
</style>
