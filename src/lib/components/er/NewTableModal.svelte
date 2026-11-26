<script lang="ts">
	import { erStore, UNGROUPED_KEY } from '$lib/stores/er.svelte';
	import type { ErColumn, ErRelation } from '$lib/types/er';

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	interface DraftColumn {
		name: string;
		type: string;
		is_pk: boolean;
		nullable: boolean;
		fk_target: string; // "table.column" or ""
	}

	let { open, onClose }: Props = $props();

	let tableName = $state('');
	let targetGroupKey = $state<string>(UNGROUPED_KEY);
	let columns = $state<DraftColumn[]>([]);
	let saving = $state(false);
	let errorMsg = $state<string | null>(null);

	$effect(() => {
		if (open) {
			tableName = '';
			targetGroupKey = erStore.activeGroupKey;
			columns = [
				{ name: 'id', type: 'uuid', is_pk: true, nullable: false, fk_target: '' },
				{ name: 'created_at', type: 'timestamptz', is_pk: false, nullable: false, fk_target: '' }
			];
			errorMsg = null;
		}
	});

	function addColumn() {
		columns = [
			...columns,
			{ name: '', type: 'text', is_pk: false, nullable: true, fk_target: '' }
		];
	}

	function removeColumn(index: number) {
		columns = columns.filter((_, i) => i !== index);
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		const cleanName = tableName.trim();
		if (!cleanName || !erStore.activeDiagramId || saving) return;

		const validCols = columns.filter((c) => c.name.trim().length > 0);
		if (validCols.length === 0) {
			errorMsg = 'Add at least one column.';
			return;
		}

		saving = true;
		errorMsg = null;

		try {
			const relations: ErRelation[] = [];
			const mappedCols: ErColumn[] = validCols.map((c) => {
				const fkParts = c.fk_target.trim().split('.');
				const hasFk = fkParts.length === 2 && fkParts[0] && fkParts[1];
				const fkTarget = hasFk ? { table: fkParts[0], column: fkParts[1] } : null;

				if (fkTarget) {
					relations.push({
						from_column: c.name.trim(),
						to_table: fkTarget.table,
						to_column: fkTarget.column
					});
				}

				return {
					name: c.name.trim(),
					type: c.type.trim() || 'text',
					is_pk: c.is_pk,
					nullable: c.is_pk ? false : c.nullable,
					fk_target: fkTarget
				};
			});

			const groupId = targetGroupKey === UNGROUPED_KEY ? null : targetGroupKey;
			const existingCount = (erStore.tablesByGroup[targetGroupKey] ?? []).length;

			await erStore.createTable({
				diagram_id: erStore.activeDiagramId,
				group_id: groupId,
				name: cleanName,
				columns: mappedCols,
				relations,
				position: {
					x: (existingCount % 4) * 320,
					y: Math.floor(existingCount / 4) * 260
				}
			});

			onClose();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to create table';
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
			aria-label="New Table"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && onClose()}
		>
			<header class="er-modal-header">
				<h2 class="er-modal-title">New Table</h2>
				<button type="button" class="er-close-btn" onclick={onClose} aria-label="Close">×</button>
			</header>

			<form onsubmit={handleSubmit}>
				<div class="er-modal-body">
					{#if errorMsg}
						<div class="er-error-box">{errorMsg}</div>
					{/if}

					<div class="er-top-fields">
						<input
							type="text"
							class="er-input"
							placeholder="Table name (e.g. er_tables)"
							bind:value={tableName}
							required
						/>
						<select class="er-select" bind:value={targetGroupKey} aria-label="Target group">
							<option value={UNGROUPED_KEY}>Ungrouped</option>
							{#each erStore.groups as group (group.id)}
								<option value={group.id}>{group.name}</option>
							{/each}
						</select>
					</div>

					<div class="er-cols-header">
						<span>Columns</span>
						<button type="button" class="er-btn-sm" onclick={addColumn}>+ Add Column</button>
					</div>

					<div class="er-cols-list">
						{#each columns as col, i (i)}
							<div class="er-col-editor-row">
								<input
									type="text"
									class="er-input-sm"
									placeholder="name"
									bind:value={col.name}
								/>
								<input
									type="text"
									class="er-input-sm"
									placeholder="type"
									bind:value={col.type}
								/>
								<label class="er-check-label" title="Primary Key">
									<input type="checkbox" bind:checked={col.is_pk} />
									PK
								</label>
								<label class="er-check-label" title="Nullable">
									<input type="checkbox" bind:checked={col.nullable} disabled={col.is_pk} />
									Null
								</label>
								<input
									type="text"
									class="er-input-sm"
									placeholder="FK (table.col)"
									bind:value={col.fk_target}
								/>
								<button
									type="button"
									class="er-del-btn"
									onclick={() => removeColumn(i)}
									aria-label="Remove column"
								>
									×
								</button>
							</div>
						{/each}
					</div>
				</div>

				<footer class="er-modal-footer">
					<button type="button" class="er-btn-ghost" onclick={onClose}>Cancel</button>
					<button type="submit" class="er-btn-primary" disabled={saving}>
						{saving ? 'Creating...' : 'Create Table'}
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
		max-width: 640px;
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
		gap: 10px;
	}

	.er-error-box {
		padding: 8px 10px;
		border-radius: 6px;
		background: rgba(239, 68, 68, 0.14);
		border: 1px solid rgba(239, 68, 68, 0.35);
		color: #f87171;
		font-size: 12px;
	}

	.er-top-fields {
		display: flex;
		gap: 8px;
	}

	.er-input,
	.er-select,
	.er-input-sm {
		height: 30px;
		padding: 0 8px;
		border-radius: 6px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 12px;
	}

	.er-input {
		flex: 1;
	}

	.er-cols-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12px;
		color: var(--text-secondary);
		margin-top: 4px;
	}

	.er-cols-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 260px;
		overflow-y: auto;
	}

	.er-col-editor-row {
		display: grid;
		grid-template-columns: 1.2fr 0.9fr auto auto 1.2fr auto;
		gap: 6px;
		align-items: center;
	}

	.er-check-label {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.er-del-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 15px;
		padding: 0 4px;
	}

	.er-modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 10px 14px;
		border-top: 1px solid var(--border-subtle);
		background: var(--bg-tertiary);
	}

	.er-btn-sm,
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

	.er-btn-sm {
		background: var(--bg-primary);
		color: var(--text-primary);
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
