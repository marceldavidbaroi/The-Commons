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
		fk_target: string;
	}

	const COMMON_TYPES = [
		'uuid',
		'text',
		'varchar',
		'int4',
		'int8',
		'bool',
		'timestamptz',
		'date',
		'numeric',
		'jsonb'
	];

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

	const fkSuggestions = $derived.by(() => {
		const suggestions: string[] = [];
		for (const table of Object.values(erStore.tablesByGroup).flat()) {
			for (const col of table.columns) {
				if (col.is_pk || col.name === 'id') {
					suggestions.push(`${table.name}.${col.name}`);
				}
			}
		}
		return suggestions;
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
			errorMsg = 'Add at least one field.';
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
	<aside class="er-table-drawer" aria-label="New Table">
		<header class="er-drawer-header">
			<h2 class="er-drawer-title">New Table</h2>
			<button type="button" class="er-close-btn" onclick={onClose} aria-label="Close drawer">
				×
			</button>
		</header>

		<form class="er-drawer-form" onsubmit={handleSubmit}>
			<div class="er-drawer-body">
				{#if errorMsg}
					<div class="er-error-box">{errorMsg}</div>
				{/if}

				<div class="er-top-fields">
					<input
						type="text"
						class="er-input"
						placeholder="Table name (e.g. goals)"
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

				<div class="er-table-wrap">
					<table class="er-fields-table">
						<thead>
							<tr>
								<th>Field</th>
								<th>Type</th>
								<th class="col-center">PK</th>
								<th class="col-center">Null</th>
								<th>FK</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each columns as col, i (i)}
								<tr>
									<td>
										<input
											type="text"
											class="er-cell-input"
											placeholder="name"
											bind:value={col.name}
										/>
									</td>
									<td>
										<select class="er-cell-select" bind:value={col.type} aria-label="Column type">
											{#each COMMON_TYPES as t (t)}
												<option value={t}>{t}</option>
											{/each}
										</select>
									</td>
									<td class="col-center">
										<input type="checkbox" bind:checked={col.is_pk} aria-label="Primary key" />
									</td>
									<td class="col-center">
										<input
											type="checkbox"
											bind:checked={col.nullable}
											disabled={col.is_pk}
											aria-label="Nullable"
										/>
									</td>
									<td>
										<input
											type="text"
											class="er-cell-input"
											list="er-fk-targets"
											placeholder="table.col"
											bind:value={col.fk_target}
										/>
									</td>
									<td class="col-center">
										<button
											type="button"
											class="er-del-btn"
											onclick={() => removeColumn(i)}
											aria-label="Remove field"
										>
											×
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<button type="button" class="er-add-row-btn" onclick={addColumn}>
					+ Add Field
				</button>
			</div>

			<footer class="er-drawer-footer">
				<button type="button" class="er-btn-ghost" onclick={onClose}>Cancel</button>
				<button type="submit" class="er-btn-primary" disabled={saving}>
					{saving ? 'Creating...' : 'Create Table'}
				</button>
			</footer>
		</form>

		<datalist id="er-fk-targets">
			{#each fkSuggestions as target (target)}
				<option value={target}></option>
			{/each}
		</datalist>
	</aside>
{/if}

<style>
	.er-table-drawer {
		width: 560px;
		max-width: 100%;
		flex-shrink: 0;
		height: 100%;
		background: var(--bg-secondary);
		border-left: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		color: var(--text-primary);
	}

	.er-drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: var(--bg-tertiary);
		border-bottom: 1px solid var(--border-subtle);
	}

	.er-drawer-title {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
	}

	.er-close-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 18px;
		cursor: pointer;
	}

	.er-drawer-form {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.er-drawer-body {
		flex: 1;
		overflow-y: auto;
		padding: 12px;
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
	.er-select {
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

	.er-table-wrap {
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		overflow-x: auto;
		background: var(--bg-primary);
	}

	.er-fields-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 11px;
	}

	.er-fields-table th {
		text-align: left;
		padding: 6px 6px;
		font-weight: 600;
		color: var(--text-secondary);
		background: var(--bg-tertiary);
		border-bottom: 1px solid var(--border-subtle);
		white-space: nowrap;
	}

	.er-fields-table td {
		padding: 4px 4px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.er-fields-table tbody tr:last-child td {
		border-bottom: none;
	}

	.col-center {
		text-align: center !important;
		width: 34px;
	}

	.er-cell-input,
	.er-cell-select {
		width: 100%;
		min-width: 84px;
		height: 28px;
		padding: 0 6px;
		border-radius: 4px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 11px;
	}

	.er-del-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 14px;
		padding: 0 4px;
	}

	.er-add-row-btn {
		align-self: flex-start;
		height: 28px;
		padding: 0 10px;
		border-radius: 6px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 12px;
		cursor: pointer;
	}

	.er-drawer-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 10px 12px;
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
