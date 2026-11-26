<script lang="ts">
	import { erStore } from '$lib/stores/er.svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	const COLORS = [
		{ id: 'slate', hex: '#94a3b8' },
		{ id: 'blue', hex: '#3b82f6' },
		{ id: 'emerald', hex: '#10b981' },
		{ id: 'amber', hex: '#f59e0b' },
		{ id: 'rose', hex: '#f43f5e' },
		{ id: 'violet', hex: '#8b5cf6' }
	];

	let { open, onClose }: Props = $props();

	let name = $state('');
	let color = $state('blue');
	let saving = $state(false);
	let errorMsg = $state<string | null>(null);

	$effect(() => {
		if (open) {
			name = '';
			color = 'blue';
			errorMsg = null;
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		const cleanName = name.trim();
		if (!cleanName || !erStore.activeDiagramId || saving) return;

		saving = true;
		errorMsg = null;
		try {
			const offset = erStore.groups.length * 40;
			const created = await erStore.createGroup({
				diagram_id: erStore.activeDiagramId,
				name: cleanName,
				color,
				position: { x: offset, y: offset, width: 520, height: 380 }
			});
			await erStore.selectGroup(created.id);
			onClose();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to create group';
		} finally {
			saving = false;
		}
	}
</script>

{#if open}
	<div class="er-modal-backdrop" role="presentation" onclick={onClose}>
		<div
			class="er-modal"
			role="dialog"
			aria-modal="true"
			aria-label="New Group"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && onClose()}
		>
			<header class="er-modal-header">
				<h2 class="er-modal-title">New Group</h2>
				<button type="button" class="er-close-btn" onclick={onClose} aria-label="Close">×</button>
			</header>

			<form onsubmit={handleSubmit}>
				<div class="er-modal-body">
					{#if errorMsg}
						<div class="er-error-box">{errorMsg}</div>
					{/if}

					<label class="er-field">
						<span>Group Name</span>
						<input
							type="text"
							class="er-input"
							placeholder="e.g. Goals, Auth, Billing"
							bind:value={name}
							required
						/>
					</label>

					<div class="er-field">
						<span>Color</span>
						<div class="er-color-row">
							{#each COLORS as c (c.id)}
								<button
									type="button"
									class="er-color-swatch"
									class:selected={color === c.id}
									style:background={c.hex}
									aria-label={c.id}
									onclick={() => (color = c.id)}
								></button>
							{/each}
						</div>
					</div>
				</div>

				<footer class="er-modal-footer">
					<button type="button" class="er-btn-ghost" onclick={onClose}>Cancel</button>
					<button type="submit" class="er-btn-primary" disabled={saving}>
						{saving ? 'Creating...' : 'Create Group'}
					</button>
				</footer>
			</form>
		</div>
	</div>
{/if}

<style>
	.er-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: rgba(0, 0, 0, 0.58);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.er-modal {
		width: 100%;
		max-width: 380px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
		overflow: hidden;
		color: var(--text-primary);
	}

	.er-modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: var(--bg-tertiary);
		border-bottom: 1px solid var(--border-subtle);
	}

	.er-modal-title {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
	}

	.er-close-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 18px;
		cursor: pointer;
	}

	.er-modal-body {
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.er-error-box {
		padding: 8px 10px;
		border-radius: 6px;
		background: rgba(239, 68, 68, 0.14);
		border: 1px solid rgba(239, 68, 68, 0.35);
		color: #f87171;
		font-size: 12px;
	}

	.er-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.er-input {
		height: 32px;
		padding: 0 10px;
		border-radius: 6px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 13px;
	}

	.er-color-row {
		display: flex;
		gap: 8px;
	}

	.er-color-swatch {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid transparent;
		cursor: pointer;
	}

	.er-color-swatch.selected {
		border-color: var(--text-primary);
		transform: scale(1.1);
	}

	.er-modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 10px 14px;
		border-top: 1px solid var(--border-subtle);
		background: var(--bg-tertiary);
	}

	.er-btn-ghost,
	.er-btn-primary {
		height: 30px;
		padding: 0 12px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid var(--border-subtle);
	}

	.er-btn-ghost {
		background: transparent;
		border-color: transparent;
		color: var(--text-secondary);
	}

	.er-btn-primary {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.er-btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
