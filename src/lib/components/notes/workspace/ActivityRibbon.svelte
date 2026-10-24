<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let {
		explorerOpen = true,
		onToggleExplorer
	} = $props<{
		explorerOpen?: boolean;
		onToggleExplorer?: () => void;
	}>();

	const isGraphRoute = $derived(page.url.pathname.includes('/notes/graph'));

	function handleExplorerClick() {
		if (onToggleExplorer) {
			onToggleExplorer();
		}
	}

	function handleGraphClick() {
		if (isGraphRoute) {
			goto('/notes');
		} else {
			goto('/notes/graph');
		}
	}

	function handleRecycleBinClick() {
		notesStore.recycleBinOpen = true;
	}

	function handleCommandPaletteClick() {
		notesStore.commandPaletteOpen = true;
	}
</script>

<aside class="activity-ribbon" aria-label="Activity Ribbon">
	<!-- Top tool buttons -->
	<div class="ribbon-top">
		<!-- Toggle Explorer Sidebar -->
		<button
			type="button"
			class="ribbon-btn"
			class:active={explorerOpen}
			title={explorerOpen ? "Hide Explorer (Cmd/Ctrl + B)" : "Show Explorer (Cmd/Ctrl + B)"}
			aria-label="Files & Folders"
			onclick={handleExplorerClick}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ribbon-icon">
				<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
			</svg>
		</button>

		<!-- Command Palette (Quick Switcher) -->
		<button
			type="button"
			class="ribbon-btn"
			title="Quick Switcher (Cmd+P or Cmd+O)"
			aria-label="Quick Switcher"
			onclick={handleCommandPaletteClick}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ribbon-icon">
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
		</button>

		<!-- Graph View Toggle -->
		<button
			type="button"
			class="ribbon-btn"
			class:active={isGraphRoute}
			title="Graph View"
			aria-label="Graph View"
			onclick={handleGraphClick}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ribbon-icon">
				<circle cx="6" cy="6" r="3" />
				<circle cx="18" cy="18" r="3" />
				<circle cx="18" cy="6" r="3" />
				<circle cx="6" cy="18" r="3" />
				<line x1="8.5" y1="7.5" x2="15.5" y2="16.5" />
				<line x1="8.5" y1="16.5" x2="15.5" y2="7.5" />
			</svg>
		</button>
	</div>

	<!-- Bottom tool buttons -->
	<div class="ribbon-bottom">
		<!-- Recycle Bin -->
		<button
			type="button"
			class="ribbon-btn"
			class:active={notesStore.recycleBinOpen}
			title="Recycle Bin (Trash)"
			aria-label="Recycle Bin"
			onclick={handleRecycleBinClick}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ribbon-icon">
				<path d="M3 6h18" />
				<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
				<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
				<line x1="10" y1="11" x2="10" y2="17" />
				<line x1="14" y1="11" x2="14" y2="17" />
			</svg>
		</button>
	</div>
</aside>

<style>
	.activity-ribbon {
		width: 44px;
		flex-shrink: 0;
		background: var(--bg-tertiary);
		border-right: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		padding: 10px 0;
		user-select: none;
		z-index: 10;
	}

	.ribbon-top,
	.ribbon-bottom {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		width: 100%;
	}

	.ribbon-btn {
		width: 32px;
		height: 32px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
		padding: 0;
	}

	.ribbon-btn:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
		border-color: var(--border-subtle);
	}

	.ribbon-btn.active {
		background: var(--bg-secondary);
		color: var(--primary);
		border-color: var(--border-subtle);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.ribbon-icon {
		width: 17px;
		height: 17px;
	}
</style>
