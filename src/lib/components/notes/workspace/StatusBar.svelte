<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';

	// Compute word count and character count of active note
	const wordCount = $derived.by(() => {
		const content = notesStore.activeNote?.content || '';
		const trimmed = content.trim();
		if (!trimmed) return 0;
		return trimmed.split(/\s+/).length;
	});

	const charCount = $derived.by(() => {
		return (notesStore.activeNote?.content || '').length;
	});

	const activeNoteTitle = $derived(
		notesStore.activeNote?.title || 'No note selected'
	);

	const paneCount = $derived(notesStore.panes.length);
	const activeBacklinkCount = $derived(notesStore.activeBacklinks.length);
	const isCurrentUnsaved = $derived(
		notesStore.activeNote?.id ? notesStore.unsavedNotes.has(notesStore.activeNote.id) : false
	);
</script>

<footer class="status-bar" aria-label="Editor Status Bar">
	<div class="status-left">
		<span class="status-item note-name" title={activeNoteTitle}>
			{activeNoteTitle}
		</span>

		<span class="status-divider">|</span>

		<span class="status-item words-counter">
			{wordCount} {wordCount === 1 ? 'word' : 'words'}
		</span>

		<span class="status-divider">·</span>

		<span class="status-item chars-counter">
			{charCount} {charCount === 1 ? 'char' : 'chars'}
		</span>

		{#if activeBacklinkCount > 0}
			<span class="status-divider">·</span>
			<span class="status-item backlinks-counter" title="{activeBacklinkCount} backlinks to this note">
				{activeBacklinkCount} {activeBacklinkCount === 1 ? 'link' : 'links'}
			</span>
		{/if}
	</div>

	<div class="status-right">
		<!-- Sync status indicator -->
		<div class="status-item sync-indicator">
			{#if notesStore.isSaving}
				<span class="sync-dot saving"></span>
				<span class="sync-text">Saving...</span>
			{:else if isCurrentUnsaved}
				<span class="sync-dot unsaved"></span>
				<span class="sync-text">Unsaved</span>
			{:else}
				<span class="sync-dot saved"></span>
				<span class="sync-text">Saved</span>
			{/if}
		</div>

		<span class="status-divider">|</span>

		<!-- Pane tally -->
		<span class="status-item pane-tally" title="Active panes">
			{paneCount} {paneCount === 1 ? 'pane' : 'panes'}
		</span>

		<span class="status-divider">|</span>

		<!-- Context Dock Toggle -->
		<button
			type="button"
			class="dock-toggle-btn"
			class:active={notesStore.contextDockOpen}
			onclick={() => (notesStore.contextDockOpen = !notesStore.contextDockOpen)}
			title={notesStore.contextDockOpen ? "Hide Inspector Dock" : "Show Inspector Dock"}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="status-btn-icon">
				<rect width="18" height="18" x="3" y="3" rx="2" />
				<path d="M15 3v18" />
			</svg>
			<span>Inspector</span>
		</button>
	</div>
</footer>

<style>
	.status-bar {
		height: 24px;
		min-height: 24px;
		background: var(--bg-tertiary);
		border-top: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 12px;
		font-family: var(--font-sans);
		font-size: 11px;
		color: var(--text-muted);
		user-select: none;
		z-index: 10;
		flex-shrink: 0;
	}

	.status-left,
	.status-right {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.status-item {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.note-name {
		font-weight: 500;
		color: var(--text-secondary);
		max-width: 220px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.status-divider {
		color: var(--border-subtle);
		opacity: 0.8;
	}

	.sync-indicator {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.sync-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}

	.sync-dot.saving {
		background: var(--warning, #eab308);
		animation: pulse 1s infinite alternate;
	}

	.sync-dot.unsaved {
		background: var(--warning, #f59e0b);
	}

	.sync-dot.saved {
		background: var(--success, #10b981);
	}

	@keyframes pulse {
		from { opacity: 0.4; }
		to { opacity: 1; }
	}

	.dock-toggle-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: transparent;
		border: none;
		color: var(--text-muted);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 11px;
		transition: background 0.1s ease, color 0.1s ease;
	}

	.dock-toggle-btn:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.dock-toggle-btn.active {
		color: var(--primary);
	}

	.status-btn-icon {
		width: 12px;
		height: 12px;
	}
</style>
