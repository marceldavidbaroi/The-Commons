<script lang="ts">
	import * as erService from '$lib/services/er-service';
	import { erStore, UNGROUPED_KEY } from '$lib/stores/er.svelte';
	import type { CreateErTablePayload, ErColumn, ErRelation, PublicSchemaMetadata } from '$lib/types/er';
	import { parseGroupHierarchyInput, parseSqlDdl } from '$lib/utils/sql-er-parser';

	interface Props {
		open: boolean;
		initialTab?: 'sql' | 'groups' | 'live';
		onClose: () => void;
	}

	let { open, initialTab = 'sql', onClose }: Props = $props();

	let activeTab = $state<'sql' | 'groups' | 'live'>('sql');
	let sqlInput = $state('');
	let groupInput = $state('');
	let targetGroupKey = $state<string>(UNGROUPED_KEY);
	let importing = $state(false);
	let errorMsg = $state<string | null>(null);

	const GROUP_COLORS = ['blue', 'emerald', 'amber', 'rose', 'violet', 'slate'];

	// Live DB introspection state
	let liveMetadata = $state<PublicSchemaMetadata | null>(null);
	let loadingLive = $state(false);
	let liveSearch = $state('');
	let selectedLiveTables = $state<Record<string, boolean>>({});

	$effect(() => {
		if (open) {
			activeTab = initialTab;
			targetGroupKey = UNGROUPED_KEY;
			errorMsg = null;
			if (initialTab === 'live' && !liveMetadata && !loadingLive) {
				loadLiveSchema();
			}
		}
	});

	const parsedPreview = $derived.by(() => {
		if (!sqlInput.trim()) return { tables: [] };
		return parseSqlDdl(sqlInput);
	});

	const parsedGroupsPreview = $derived.by(() => {
		if (!groupInput.trim()) return [];
		return parseGroupHierarchyInput(groupInput);
	});

	const parsedGroupStats = $derived.by(() => {
		let subCount = 0;
		let tableRefs = 0;
		for (const g of parsedGroupsPreview) {
			subCount += g.subgroups.length;
			tableRefs += g.tables.length;
			for (const sg of g.subgroups) {
				tableRefs += sg.tables.length;
			}
		}
		return { parents: parsedGroupsPreview.length, subgroups: subCount, tableRefs };
	});

	const filteredLiveTables = $derived.by(() => {
		if (!liveMetadata) return [];
		const q = liveSearch.trim().toLowerCase();
		if (!q) return liveMetadata.tables;
		return liveMetadata.tables.filter((t) => t.name.toLowerCase().includes(q));
	});

	const selectedLiveCount = $derived(
		Object.values(selectedLiveTables).filter(Boolean).length
	);

	async function loadLiveSchema() {
		loadingLive = true;
		errorMsg = null;
		try {
			liveMetadata = await erService.fetchPublicSchemaMetadata();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to introspect public schema';
		} finally {
			loadingLive = false;
		}
	}

	function switchTab(tab: 'sql' | 'groups' | 'live') {
		activeTab = tab;
		errorMsg = null;
		if (tab === 'live' && !liveMetadata && !loadingLive) {
			loadLiveSchema();
		}
	}

	function toggleAllLive(selectAll: boolean) {
		const next: Record<string, boolean> = { ...selectedLiveTables };
		for (const t of filteredLiveTables) {
			next[t.name] = selectAll;
		}
		selectedLiveTables = next;
	}

	async function handleImportSql() {
		if (!erStore.activeDiagramId || parsedPreview.tables.length === 0 || importing) return;
		importing = true;
		errorMsg = null;

		try {
			const fixedGroupId = targetGroupKey === UNGROUPED_KEY ? null : targetGroupKey;
			const group = fixedGroupId ? erStore.groups.find((g) => g.id === fixedGroupId) : null;
			const origin = group ? { x: group.position?.x ?? 0, y: group.position?.y ?? 0 } : { x: 0, y: 0 };
			const existingCount = (erStore.tablesByGroup[targetGroupKey] ?? []).length;

			const payloads: CreateErTablePayload[] = parsedPreview.tables.map((t, idx) => {
				const posIdx = existingCount + idx;
				return {
					diagram_id: erStore.activeDiagramId!,
					group_id: fixedGroupId,
					name: t.name,
					columns: t.columns,
					relations: t.relations,
					position: {
						x: origin.x + (fixedGroupId ? 24 : 0) + (posIdx % 4) * 320,
						y: origin.y + (fixedGroupId ? 48 : 0) + Math.floor(posIdx / 4) * 260
					}
				};
			});

			await erStore.createTablesBulk(payloads);
			sqlInput = '';
			onClose();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to import SQL tables';
		} finally {
			importing = false;
		}
	}

	async function handleImportGroups() {
		if (!erStore.activeDiagramId || parsedGroupsPreview.length === 0 || importing) return;
		importing = true;
		errorMsg = null;

		try {
			const parentIdByName = new Map<string, string>();
			const groupPosById = new Map<string, { x: number; y: number }>();
			const subIdByKey = new Map<string, string>();

			for (const g of erStore.groups) {
				groupPosById.set(g.id, { x: g.position?.x ?? 0, y: g.position?.y ?? 0 });
				if (!g.parent_id) {
					parentIdByName.set(g.name.toLowerCase(), g.id);
				} else {
					const parentName = erStore.groups.find((p) => p.id === g.parent_id)?.name ?? '';
					subIdByKey.set(`${parentName.toLowerCase()}::${g.name.toLowerCase()}`, g.id);
				}
			}

			let parentIdx = parentIdByName.size;
			let firstGroupId: string | null = null;

			for (const g of parsedGroupsPreview) {
				let parentId = parentIdByName.get(g.name.toLowerCase());
				if (!parentId) {
					const px = (parentIdx % 3) * 1400;
					const py = Math.floor(parentIdx / 3) * 900;
					const createdParent = await erStore.createGroup({
						diagram_id: erStore.activeDiagramId,
						parent_id: null,
						name: g.name,
						color: GROUP_COLORS[parentIdx % GROUP_COLORS.length],
						position: { x: px, y: py, width: 1320, height: 820 }
					});
					parentId = createdParent.id;
					parentIdByName.set(g.name.toLowerCase(), parentId);
					groupPosById.set(parentId, { x: px, y: py });
					if (!firstGroupId) firstGroupId = parentId;
					parentIdx++;
				}

				for (const tableName of g.tables) {
					await erStore.addTableByNameToGroup(tableName, parentId);
				}

				const parentOrigin = groupPosById.get(parentId) ?? { x: 0, y: 0 };
				let subIdx = 0;
				for (const sg of g.subgroups) {
					const subKey = `${g.name.toLowerCase()}::${sg.name.toLowerCase()}`;
					let subId = subIdByKey.get(subKey);
					if (!subId) {
						const cols = Math.min(3, Math.max(1, sg.tables.length));
						const rows = Math.max(1, Math.ceil(sg.tables.length / 3));
						const width = Math.max(480, cols * 310 + 48);
						const height = Math.max(340, rows * 250 + 80);
						const sx = parentOrigin.x + 24 + (subIdx % 2) * 660;
						const sy = parentOrigin.y + 48 + Math.floor(subIdx / 2) * 420;
						const colorIdx = erStore.groups.findIndex((item) => item.id === parentId);
						const createdSub = await erStore.createGroup({
							diagram_id: erStore.activeDiagramId,
							parent_id: parentId,
							name: sg.name,
							color: GROUP_COLORS[(colorIdx >= 0 ? colorIdx : 0) % GROUP_COLORS.length],
							position: { x: sx, y: sy, width, height }
						});
						subId = createdSub.id;
						subIdByKey.set(subKey, subId);
						subIdx++;
					}

					for (const tableName of sg.tables) {
						await erStore.addTableByNameToGroup(tableName, subId);
					}
				}
			}

			if (firstGroupId) {
				await erStore.selectGroup(firstGroupId);
			}
			groupInput = '';
			onClose();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to import groups';
		} finally {
			importing = false;
		}
	}

	async function handleImportLive() {
		if (!erStore.activeDiagramId || !liveMetadata || selectedLiveCount === 0 || importing) return;
		importing = true;
		errorMsg = null;

		const groupId = targetGroupKey === UNGROUPED_KEY ? null : targetGroupKey;
		const existingCount = (erStore.tablesByGroup[targetGroupKey] ?? []).length;

		try {
			const chosenTables = liveMetadata.tables.filter((t) => selectedLiveTables[t.name]);
			const payloads: CreateErTablePayload[] = chosenTables.map((t, idx) => {
				const tableRelations: ErRelation[] = liveMetadata!.relations
					.filter((r) => r.from_table === t.name)
					.map((r) => ({
						from_column: r.from_column,
						to_table: r.to_table,
						to_column: r.to_column
					}));

				const columns: ErColumn[] = t.columns.map((c) => {
					const rel = tableRelations.find((r) => r.from_column === c.name);
					return {
						name: c.name,
						type: c.type,
						nullable: c.nullable,
						is_pk: c.name === 'id',
						fk_target: rel ? { table: rel.to_table, column: rel.to_column } : null
					};
				});

				const posIndex = existingCount + idx;
				return {
					diagram_id: erStore.activeDiagramId!,
					group_id: groupId,
					name: t.name,
					columns,
					relations: tableRelations,
					position: {
						x: (posIndex % 4) * 320,
						y: Math.floor(posIndex / 4) * 260
					}
				};
			});

			await erStore.createTablesBulk(payloads);
			selectedLiveTables = {};
			onClose();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to sync live tables';
		} finally {
			importing = false;
		}
	}
</script>

{#if open}
	<div class="er-modal-backdrop" role="presentation" onclick={onClose}>
		<div
			class="er-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Import Tables"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && onClose()}
		>
			<header class="er-modal-header">
				<div class="er-modal-tabs">
					<button
						type="button"
						class="er-tab"
						class:active={activeTab === 'sql'}
						onclick={() => switchTab('sql')}
					>
						Paste SQL
					</button>
					<button
						type="button"
						class="er-tab"
						class:active={activeTab === 'groups'}
						onclick={() => switchTab('groups')}
					>
						Import Groups
					</button>
					<button
						type="button"
						class="er-tab"
						class:active={activeTab === 'live'}
						onclick={() => switchTab('live')}
					>
						Sync from Live DB
					</button>
				</div>
				<button type="button" class="er-close-btn" onclick={onClose} aria-label="Close">×</button>
			</header>

			<div class="er-modal-body">
				{#if errorMsg}
					<div class="er-error-box">{errorMsg}</div>
				{/if}

				{#if activeTab !== 'groups'}
					<div class="er-field-row">
						<label for="er-import-group">Target Group</label>
						<select
							id="er-import-group"
							class="er-select"
							bind:value={targetGroupKey}
						>
							<option value={UNGROUPED_KEY}>Ungrouped</option>
							{#each erStore.groups as group (group.id)}
								<option value={group.id}>{group.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				{#if activeTab === 'sql'}
					<textarea
						class="er-sql-textarea"
						rows="12"
						placeholder="Paste CREATE TABLE statements here (imports tables only)..."
						bind:value={sqlInput}
					></textarea>
					<div class="er-preview-bar">
						<span>
							Detected <strong>{parsedPreview.tables.length}</strong> table(s)
						</span>
					</div>
				{:else if activeTab === 'groups'}
					<textarea
						class="er-sql-textarea"
						rows="12"
						placeholder={"Paste group hierarchy (Markdown or JSON):\n\n# People & Access\n## Tenants & RBAC\ntenants, tenant_roles, tenant_role_grants\n## Vendors & Customers\nvendors, customer_groups"}
						bind:value={groupInput}
					></textarea>
					<div class="er-preview-bar">
						<span>
							Detected <strong>{parsedGroupStats.parents}</strong> group(s),
							<strong>{parsedGroupStats.subgroups}</strong> sub-group(s),
							<strong>{parsedGroupStats.tableRefs}</strong> table link(s)
						</span>
					</div>
				{:else}
					<div class="er-live-toolbar">
						<input
							type="text"
							class="er-search-input"
							placeholder="Filter public tables..."
							bind:value={liveSearch}
						/>
						<button type="button" class="er-btn-sm" onclick={() => toggleAllLive(true)}>
							Select All
						</button>
						<button type="button" class="er-btn-sm" onclick={() => toggleAllLive(false)}>
							Clear
						</button>
					</div>

					<div class="er-live-list">
						{#if loadingLive}
							<div class="er-live-empty">Introspecting public schema...</div>
						{:else if filteredLiveTables.length === 0}
							<div class="er-live-empty">No tables found.</div>
						{:else}
							{#each filteredLiveTables as table (table.name)}
								<label class="er-live-item">
									<input
										type="checkbox"
										checked={!!selectedLiveTables[table.name]}
										onchange={(e) => {
											selectedLiveTables = {
												...selectedLiveTables,
												[table.name]: e.currentTarget.checked
											};
										}}
									/>
									<span class="er-live-name">{table.name}</span>
									<span class="er-live-cols">{table.columns.length} cols</span>
								</label>
							{/each}
						{/if}
					</div>
				{/if}
			</div>

			<footer class="er-modal-footer">
				<button type="button" class="er-btn-ghost" onclick={onClose}>Cancel</button>
				{#if activeTab === 'sql'}
					<button
						type="button"
						class="er-btn-primary"
						disabled={parsedPreview.tables.length === 0 || importing}
						onclick={handleImportSql}
					>
						{importing ? 'Importing...' : `Import ${parsedPreview.tables.length} Table(s)`}
					</button>
				{:else if activeTab === 'groups'}
					<button
						type="button"
						class="er-btn-primary"
						disabled={parsedGroupStats.parents === 0 || importing}
						onclick={handleImportGroups}
					>
						{importing ? 'Applying...' : `Create ${parsedGroupStats.parents} Group(s) & Link Tables`}
					</button>
				{:else}
					<button
						type="button"
						class="er-btn-primary"
						disabled={selectedLiveCount === 0 || importing}
						onclick={handleImportLive}
					>
						{importing ? 'Syncing...' : `Sync ${selectedLiveCount} Table(s)`}
					</button>
				{/if}
			</footer>
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
		max-width: 620px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
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

	.er-modal-tabs {
		display: flex;
		gap: 6px;
	}

	.er-tab {
		height: 28px;
		padding: 0 12px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		background: transparent;
		border: 1px solid transparent;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.er-tab.active {
		background: var(--bg-secondary);
		border-color: var(--border-subtle);
		color: var(--text-primary);
	}

	.er-close-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 18px;
		cursor: pointer;
		line-height: 1;
		padding: 2px 6px;
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

	.er-field-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.er-select,
	.er-search-input {
		height: 30px;
		padding: 0 10px;
		border-radius: 6px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 12px;
	}

	.er-search-input {
		flex: 1;
	}

	.er-autogroup-check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.er-sql-textarea {
		width: 100%;
		padding: 10px;
		border-radius: 6px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 12px;
		resize: vertical;
	}

	.er-preview-bar {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.er-live-toolbar {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.er-live-list {
		max-height: 280px;
		overflow-y: auto;
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-primary);
	}

	.er-live-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 10px;
		border-bottom: 1px solid var(--border-subtle);
		cursor: pointer;
		font-size: 12px;
	}

	.er-live-item:last-child {
		border-bottom: none;
	}

	.er-live-name {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		flex: 1;
	}

	.er-live-cols {
		font-size: 11px;
		color: var(--text-secondary);
	}

	.er-live-empty {
		padding: 20px;
		text-align: center;
		color: var(--text-secondary);
		font-size: 12px;
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
