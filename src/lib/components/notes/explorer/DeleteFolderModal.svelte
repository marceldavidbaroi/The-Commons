<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		isOpen = false,
		folderName = '',
		onCancel,
		onConfirm
	} = $props<{
		isOpen: boolean;
		folderName?: string;
		onCancel: () => void;
		onConfirm: (cascadeChildren: boolean) => void;
	}>();

	let selectedStrategy = $state<'cascade' | 'orphan'>('cascade');
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		onclick={onCancel}
		role="presentation"
		transition:fade={{ duration: 180, easing: cubicOut }}
	></div>

	<div
		class="delete-folder-modal"
		role="dialog"
		aria-labelledby="delete-folder-title"
		aria-modal="true"
		transition:scale={{ start: 0.95, duration: 220, opacity: 0, easing: cubicOut }}
	>
		<div class="modal-header">
			<div class="danger-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="3 6 5 6 21 6" />
					<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
				</svg>
			</div>
			<div class="header-text">
				<h3 id="delete-folder-title" class="modal-title">Delete Folder</h3>
				<span class="folder-name-tag">"{folderName || 'Selected Folder'}"</span>
			</div>
		</div>

		<p class="modal-instruction">
			Choose how you want to handle existing notes and subfolders located inside this folder:
		</p>

		<div class="strategy-selector">
			<!-- Option A: Cascade -->
			<label class="strategy-option {selectedStrategy === 'cascade' ? 'selected' : ''}">
				<input
					type="radio"
					name="delete-strategy"
					value="cascade"
					checked={selectedStrategy === 'cascade'}
					onchange={() => (selectedStrategy = 'cascade')}
				/>
				<div class="option-content">
					<div class="option-header">
						<span class="option-title">Cascade Delete (Move All to Trash)</span>
						<span class="badge danger">Subtree</span>
					</div>
					<p class="option-description">
						Delete this folder and all enclosed notes and subfolders. All items can be restored from the Recycle Bin.
					</p>
				</div>
			</label>

			<!-- Option B: Orphan -->
			<label class="strategy-option {selectedStrategy === 'orphan' ? 'selected' : ''}">
				<input
					type="radio"
					name="delete-strategy"
					value="orphan"
					checked={selectedStrategy === 'orphan'}
					onchange={() => (selectedStrategy = 'orphan')}
				/>
				<div class="option-content">
					<div class="option-header">
						<span class="option-title">Orphan Contents (Move to Root)</span>
						<span class="badge neutral">Preserve Notes</span>
					</div>
					<p class="option-description">
						Delete only this folder. Move all nested notes and subfolders to the root level.
					</p>
				</div>
			</label>
		</div>

		<div class="modal-actions">
			<button
				type="button"
				class="btn btn-secondary"
				onclick={onCancel}
			>
				Cancel
			</button>
			<button
				type="button"
				class="btn btn-danger"
				onclick={() => onConfirm(selectedStrategy === 'cascade')}
			>
				Delete Folder
			</button>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(31, 28, 25, 0.45);
		z-index: 120;
	}

	.delete-folder-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 92%;
		max-width: 480px;
		background: var(--bg-secondary);
		border-radius: var(--radius-md);
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
		z-index: 121;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		border: 1px solid var(--border-subtle);
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.danger-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-sm);
		background-color: color-mix(in srgb, var(--danger, #ef4444) 12%, transparent);
		color: var(--danger, #ef4444);
		flex-shrink: 0;
	}

	.danger-icon svg {
		width: 18px;
		height: 18px;
	}

	.header-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.modal-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.folder-name-tag {
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.modal-instruction {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.4;
	}

	.strategy-selector {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.strategy-option {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.75rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background: var(--bg-primary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.strategy-option:hover {
		border-color: var(--border-focus);
	}

	.strategy-option.selected {
		border-color: var(--primary);
		background: var(--bg-tertiary);
	}

	.strategy-option input[type="radio"] {
		margin-top: 0.1875rem;
		accent-color: var(--primary);
		cursor: pointer;
	}

	.option-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.option-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.option-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.option-description {
		font-size: 0.75rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.35;
	}

	.badge {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-sm);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.badge.danger {
		background: color-mix(in srgb, var(--danger, #ef4444) 15%, transparent);
		color: var(--danger, #ef4444);
	}

	.badge.neutral {
		background: var(--bg-surface);
		color: var(--text-secondary);
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.btn {
		padding: 0.4375rem 0.875rem;
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
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

	.btn-danger {
		border: 1px solid transparent;
		background: var(--danger, #ef4444);
		color: #ffffff;
	}

	.btn-danger:hover {
		opacity: 0.9;
	}
</style>
