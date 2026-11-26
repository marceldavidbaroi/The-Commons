<script lang="ts">
	import * as erService from '$lib/services/er-service';
	import { erStore, UNGROUPED_KEY } from '$lib/stores/er.svelte';
	import type { CreateErTablePayload, ErTable } from '$lib/types/er';
	import {
		exportTablesToSql,
		exportTableToShorthand,
		parseTableInput
	} from '$lib/utils/sql-er-parser';

	interface Props {
		open: boolean;
		editTable?: ErTable | null;
		defaultGroupKey?: string;
		onSaved?: () => void;
		onClose: () => void;
	}

	const STARTER_SHORTHAND = `new_table
  id bigint pk
  created_at timestamptz
  updated_at timestamptz
  deleted_at timestamptz?`;

	let { open, editTable = null, defaultGroupKey, onSaved, onClose }: Props = $props();

	let sqlInput = $state('');
	let editorMode = $state<'shorten' | 'sql'>('shorten');
	let targetGroupKey = $state<string>(UNGROUPED_KEY);
	let saving = $state(false);
	let errorMsg = $state<string | null>(null);
	let gutterRef = $state<HTMLDivElement | null>(null);
	let highlightRef = $state<HTMLPreElement | null>(null);
	let editorRef = $state<HTMLTextAreaElement | null>(null);
	let cursorPos = $state(0);
	let diagramTableNames = $state<string[]>([]);
	let selectedSuggestionIdx = $state(0);
	let hideSuggestions = $state(false);

	const TYPE_SUGGESTIONS = [
		'bigint',
		'uuid',
		'text',
		'enum(a, b)',
		'boolean',
		'timestamptz',
		'int4',
		'numeric',
		'jsonb',
		'date',
		'pk',
		'?'
	];

	const SNIPPET_SUGGESTIONS = [
		'id bigint pk',
		'id uuid pk',
		'tenant_id uuid -> tenants',
		'is_active boolean',
		'deleted_at timestamptz?',
		'created_at timestamptz',
		'updated_at timestamptz'
	];

	const lineNumbers = $derived.by(() => {
		const count = Math.max(1, sqlInput.split('\n').length);
		return Array.from({ length: count }, (_, i) => i + 1);
	});

	function escapeHtml(value: string): string {
		return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	const HIGHLIGHT_RE =
		/(--[^\n]*)|('[^']*')|(->|\?)|\b(CREATE|TABLE|NOT|NULL|PRIMARY|KEY|DEFAULT|REFERENCES|ON|DELETE|CASCADE|SET|GENERATED|ALWAYS|AS|IDENTITY|UNIQUE|CHECK|IN|PUBLIC)\b|\b(bigint|uuid|text|boolean|bool|timestamptz|timestamp|int4|int8|integer|numeric|jsonb|json|date|varchar|enum|pk)\b|([a-zA-Z_][a-zA-Z0-9_]*)|([^\S\n]+|\n|.)/gi;

	const highlightedHtml = $derived.by(() => {
		const src = sqlInput;
		if (!src) return '\n';
		let out = '';
		let lineStart = true;
		for (const m of src.matchAll(HIGHLIGHT_RE)) {
			const [full, comment, str, sym, kw, typ, ident] = m;
			if (comment) {
				out += `<span class="tok-comment">${escapeHtml(comment)}</span>`;
			} else if (str) {
				out += `<span class="tok-string">${escapeHtml(str)}</span>`;
			} else if (sym) {
				out += `<span class="tok-sym">${escapeHtml(sym)}</span>`;
			} else if (kw) {
				out += `<span class="tok-kw">${escapeHtml(kw)}</span>`;
			} else if (typ) {
				out += `<span class="tok-type">${escapeHtml(typ)}</span>`;
			} else if (ident) {
				out += lineStart
					? `<span class="tok-table">${escapeHtml(ident)}</span>`
					: `<span class="tok-ident">${escapeHtml(ident)}</span>`;
			} else {
				out += escapeHtml(full);
			}
			lineStart = full === '\n';
		}
		return src.endsWith('\n') ? out + ' ' : out;
	});

	const activeSuggestions = $derived.by(() => {
		if (hideSuggestions) return [] as Array<{ label: string; insert: string; replaceLen: number }>;
		const before = sqlInput.slice(0, cursorPos);
		const lastNewline = before.lastIndexOf('\n');
		const lineBefore = before.slice(lastNewline + 1);

		// 1. After "->" -> suggest table names for FK
		const fkMatch = lineBefore.match(/->\s*([a-zA-Z0-9_]*)$/);
		if (fkMatch) {
			const query = fkMatch[1].toLowerCase();
			return diagramTableNames
				.filter((name) => name.toLowerCase().includes(query))
				.slice(0, 8)
				.map((name) => ({ label: `FK → ${name}`, insert: name, replaceLen: fkMatch[1].length }));
		}

		// 2. Indented line: after column name -> suggest types / pk / ? / ->
		const indentedTypeMatch = lineBefore.match(/^\s+[a-zA-Z_][a-zA-Z0-9_]*\s+([a-zA-Z0-9_?]*)$/);
		if (indentedTypeMatch) {
			const query = indentedTypeMatch[1].toLowerCase();
			return TYPE_SUGGESTIONS.filter((t) => t.startsWith(query))
				.slice(0, 8)
				.map((t) => ({ label: t, insert: t, replaceLen: indentedTypeMatch[1].length }));
		}

		// 3. Indented line start -> suggest common column snippets
		const indentedStartMatch = lineBefore.match(/^\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
		if (indentedStartMatch) {
			const query = indentedStartMatch[1].toLowerCase();
			return SNIPPET_SUGGESTIONS.filter((s) => s.toLowerCase().startsWith(query))
				.slice(0, 6)
				.map((s) => ({
					label: s,
					insert: s,
					replaceLen: indentedStartMatch[1].length
				}));
		}

		return [];
	});

	function updateCursor() {
		if (editorRef) {
			cursorPos = editorRef.selectionStart ?? 0;
			selectedSuggestionIdx = 0;
			hideSuggestions = false;
		}
	}

	function applySuggestion(item: { insert: string; replaceLen: number }) {
		const start = cursorPos - item.replaceLen;
		sqlInput = sqlInput.slice(0, start) + item.insert + sqlInput.slice(cursorPos);
		const nextCursor = start + item.insert.length;
		hideSuggestions = true;
		requestAnimationFrame(() => {
			if (editorRef) {
				editorRef.focus();
				editorRef.selectionStart = editorRef.selectionEnd = nextCursor;
				cursorPos = nextCursor;
			}
		});
	}

	function handleEditorScroll(event: Event) {
		const ta = event.currentTarget as HTMLTextAreaElement;
		if (gutterRef) {
			gutterRef.scrollTop = ta.scrollTop;
		}
		if (highlightRef) {
			highlightRef.scrollTop = ta.scrollTop;
			highlightRef.scrollLeft = ta.scrollLeft;
		}
	}

	function handleEditorKeydown(event: KeyboardEvent) {
		if (activeSuggestions.length > 0) {
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				selectedSuggestionIdx = (selectedSuggestionIdx + 1) % activeSuggestions.length;
				return;
			}
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				selectedSuggestionIdx =
					(selectedSuggestionIdx - 1 + activeSuggestions.length) % activeSuggestions.length;
				return;
			}
			if (event.key === 'Tab' || (event.key === 'Enter' && !event.metaKey && !event.ctrlKey)) {
				event.preventDefault();
				applySuggestion(activeSuggestions[selectedSuggestionIdx]);
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				hideSuggestions = true;
				return;
			}
		}

		if (event.key === 'Tab') {
			event.preventDefault();
			const ta = event.currentTarget as HTMLTextAreaElement;
			const start = ta.selectionStart;
			const end = ta.selectionEnd;
			sqlInput = sqlInput.slice(0, start) + '  ' + sqlInput.slice(end);
			requestAnimationFrame(() => {
				ta.selectionStart = ta.selectionEnd = start + 2;
				cursorPos = start + 2;
			});
		} else if (
			(event.metaKey || event.ctrlKey) &&
			(event.key === 'Enter' || event.key.toLowerCase() === 's')
		) {
			event.preventDefault();
			handleSubmit(event);
		}
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (!open) return;
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
			event.preventDefault();
			handleSubmit(event);
		}
	}

	function handleAddCommonFields() {
		const block =
			editorMode === 'sql'
				? `  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  created_at timestamptz NOT NULL DEFAULT now(),\n  updated_at timestamptz NOT NULL DEFAULT now(),\n  deleted_at timestamptz NULL`
				: `  id bigint pk\n  created_at timestamptz\n  updated_at timestamptz\n  deleted_at timestamptz?`;

		if (!sqlInput.trim()) {
			sqlInput =
				editorMode === 'sql'
					? `CREATE TABLE public.new_table (\n${block}\n);`
					: `new_table\n${block}`;
			return;
		}
		if (editorMode === 'sql') {
			const closeIdx = sqlInput.lastIndexOf(')');
			if (closeIdx !== -1) {
				const before = sqlInput.slice(0, closeIdx).trimEnd();
				const sep = before.endsWith('(') || before.endsWith(',') ? '\n' : ',\n';
				sqlInput = before + sep + block + '\n' + sqlInput.slice(closeIdx);
				return;
			}
		}
		sqlInput = sqlInput.trimEnd() + '\n' + block;
	}

	function toTempErTables(): ErTable[] {
		return parsed.tables.map((t, idx) => ({
			id: String(idx),
			diagram_id: '',
			group_id: null,
			user_id: '',
			name: t.name,
			columns: t.columns,
			relations: t.relations,
			position: { x: 0, y: 0 },
			created_at: '',
			updated_at: ''
		}));
	}

	function setEditorMode(nextMode: 'shorten' | 'sql') {
		if (editorMode === nextMode) return;
		editorMode = nextMode;
		if (parsed.tables.length === 0) return;
		const tables = toTempErTables();
		sqlInput =
			nextMode === 'sql'
				? exportTablesToSql(tables)
				: tables.map((t) => exportTableToShorthand(t)).join('\n\n');
	}

	$effect(() => {
		if (open) {
			if (editTable) {
				sqlInput = exportTableToShorthand(editTable);
				targetGroupKey = editTable.group_id ?? UNGROUPED_KEY;
			} else {
				sqlInput = STARTER_SHORTHAND;
				targetGroupKey = defaultGroupKey ?? erStore.activeGroupKey;
			}
			editorMode = 'shorten';
			errorMsg = null;
			hideSuggestions = true;

			if (erStore.activeDiagramId) {
				const cachedNames = new Set(
					Object.values(erStore.tablesByGroup)
						.flat()
						.map((t) => t.name)
				);
				diagramTableNames = Array.from(cachedNames).sort();
				erService.searchDiagramTables(erStore.activeDiagramId, '').then((list) => {
					const merged = new Set([...cachedNames, ...list.map((t) => t.name)]);
					diagramTableNames = Array.from(merged).sort();
				});
			}
		}
	});

	const parsed = $derived.by(() => {
		if (!sqlInput.trim()) return { tables: [] };
		return parseTableInput(sqlInput);
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!erStore.activeDiagramId || saving) return;

		if (parsed.tables.length === 0) {
			errorMsg = 'Enter a valid CREATE TABLE statement.';
			return;
		}

		saving = true;
		errorMsg = null;

		try {
			const groupId = targetGroupKey === UNGROUPED_KEY ? null : targetGroupKey;

			if (editTable) {
				const t = parsed.tables[0];
				await erStore.updateTable(
					editTable.id,
					{
						name: t.name,
						columns: t.columns,
						relations: t.relations,
						group_id: groupId
					},
					editTable.group_id
				);
			} else if (parsed.tables.length === 1) {
				const t = parsed.tables[0];
				const existingCount = (erStore.tablesByGroup[targetGroupKey] ?? []).length;
				await erStore.createTable({
					diagram_id: erStore.activeDiagramId,
					group_id: groupId,
					name: t.name,
					columns: t.columns,
					relations: t.relations,
					position: {
						x: (existingCount % 4) * 240,
						y: Math.floor(existingCount / 4) * 60
					}
				});
			} else {
				const existingCount = (erStore.tablesByGroup[targetGroupKey] ?? []).length;
				const payloads: CreateErTablePayload[] = parsed.tables.map((t, idx) => ({
					diagram_id: erStore.activeDiagramId!,
					group_id: groupId,
					name: t.name,
					columns: t.columns,
					relations: t.relations,
					position: {
						x: ((existingCount + idx) % 4) * 240,
						y: Math.floor((existingCount + idx) / 4) * 60
					}
				}));
				await erStore.createTablesBulk(payloads);
			}

			onSaved?.();
			onClose();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to save table';
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!editTable || saving) return;
		saving = true;
		try {
			await erStore.deleteTable(editTable.id, editTable.group_id);
			onSaved?.();
			onClose();
		} finally {
			saving = false;
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if open}
	<aside class="er-table-drawer" aria-label={editTable ? 'Edit Table' : 'New Table'}>
		<header class="er-drawer-header">
			<h2 class="er-drawer-title">{editTable ? `Edit: ${editTable.name}` : 'New Table (SQL)'}</h2>
			<button type="button" class="er-close-btn" onclick={onClose} aria-label="Close drawer">
				×
			</button>
		</header>

		<form class="er-drawer-form" onsubmit={handleSubmit}>
			<div class="er-drawer-body">
				{#if errorMsg}
					<div class="er-error-box">{errorMsg}</div>
				{/if}

				<div class="er-field-row">
					<label for="er-sql-group">Group</label>
					<select id="er-sql-group" class="er-select" bind:value={targetGroupKey}>
						<option value={UNGROUPED_KEY}>Ungrouped</option>
						{#each erStore.groups as group (group.id)}
							<option value={group.id}>{group.name}</option>
						{/each}
					</select>
				</div>

				<div class="er-sql-shell">
					<div class="er-sql-toolbar">
						<div class="er-mode-toggle" role="group" aria-label="Editor format">
							<button
								type="button"
								class="er-mode-btn"
								class:active={editorMode === 'shorten'}
								onclick={() => setEditorMode('shorten')}
							>
								Shorten
							</button>
							<button
								type="button"
								class="er-mode-btn"
								class:active={editorMode === 'sql'}
								onclick={() => setEditorMode('sql')}
							>
								SQL
							</button>
						</div>
						<div class="er-sql-tools">
							<button
								type="button"
								class="er-format-btn"
								onclick={handleAddCommonFields}
								title="Append id, created_at, updated_at, deleted_at"
							>
								+ Template
							</button>
							<span class="er-sql-hint">⌘S / ⌘↵ to save</span>
						</div>
					</div>
					<div class="er-sql-body">
						<div class="er-sql-gutter" bind:this={gutterRef} aria-hidden="true">
							{#each lineNumbers as num (num)}
								<div>{num}</div>
							{/each}
						</div>
						<div class="er-sql-editor-wrap">
							<pre
								bind:this={highlightRef}
								class="er-sql-highlight"
								aria-hidden="true">{@html highlightedHtml}</pre>
							<textarea
								bind:this={editorRef}
								class="er-sql-editor"
								spellcheck="false"
								autocomplete="off"
								autocapitalize="off"
								placeholder="CREATE TABLE public.example (...);"
								bind:value={sqlInput}
								oninput={updateCursor}
								onclick={updateCursor}
								onscroll={handleEditorScroll}
								onkeydown={handleEditorKeydown}
							></textarea>
						</div>
					</div>

					{#if activeSuggestions.length > 0}
						<div class="er-suggest-bar" role="listbox" aria-label="Autocomplete suggestions">
							{#each activeSuggestions as item, idx (item.label)}
								<button
									type="button"
									role="option"
									aria-selected={idx === selectedSuggestionIdx}
									class="er-suggest-chip"
									class:active={idx === selectedSuggestionIdx}
									onmousedown={(e) => {
										e.preventDefault();
										applySuggestion(item);
									}}
								>
									{item.label}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<div class="er-preview-bar">
					{#if parsed.tables.length > 0}
						<span>
							Parsed: <strong>{parsed.tables.map((t) => t.name).join(', ')}</strong>
							({parsed.tables[0].columns.length} cols, {parsed.tables[0].relations.length} FKs)
						</span>
					{:else}
						<span>Write or paste a CREATE TABLE statement</span>
					{/if}
				</div>
			</div>

			<footer class="er-drawer-footer">
				{#if editTable}
					<button type="button" class="er-btn-danger" disabled={saving} onclick={handleDelete}>
						Delete
					</button>
				{/if}
				<div class="er-footer-right">
					<button type="button" class="er-btn-ghost" onclick={onClose}>Cancel</button>
					<button
						type="submit"
						class="er-btn-primary"
						disabled={saving || parsed.tables.length === 0}
					>
						{saving ? 'Saving...' : editTable ? 'Save SQL' : 'Create Table'}
					</button>
				</div>
			</footer>
		</form>
	</aside>
{/if}

<style>
	.er-table-drawer {
		width: 480px;
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
		min-height: 0;
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

	.er-field-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.er-select {
		flex: 1;
		height: 30px;
		padding: 0 8px;
		border-radius: 6px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 12px;
	}

	.er-sql-shell {
		flex: 1;
		min-height: 260px;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		overflow: hidden;
		background: #0f172a;
	}

	.er-sql-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 5px 10px;
		background: #1e293b;
		border-bottom: 1px solid rgba(148, 163, 184, 0.2);
		font-size: 11px;
		color: #94a3b8;
	}

	.er-mode-toggle {
		display: inline-flex;
		padding: 2px;
		border-radius: 5px;
		background: #0f172a;
		border: 1px solid rgba(148, 163, 184, 0.2);
	}

	.er-mode-btn {
		height: 20px;
		padding: 0 8px;
		border: none;
		border-radius: 3px;
		background: transparent;
		color: #94a3b8;
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
	}

	.er-mode-btn.active {
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.er-sql-tools {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.er-format-btn {
		height: 20px;
		padding: 0 7px;
		border-radius: 4px;
		background: rgba(148, 163, 184, 0.14);
		border: 1px solid rgba(148, 163, 184, 0.25);
		color: #e2e8f0;
		font-size: 10px;
		cursor: pointer;
	}

	.er-sql-hint {
		font-size: 10px;
		opacity: 0.75;
	}

	.er-sql-body {
		flex: 1;
		min-height: 0;
		display: flex;
	}

	.er-sql-gutter {
		width: 36px;
		padding: 10px 6px;
		background: #0b1220;
		border-right: 1px solid rgba(148, 163, 184, 0.15);
		color: #475569;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 12px;
		line-height: 1.55;
		text-align: right;
		overflow: hidden;
		user-select: none;
		flex-shrink: 0;
	}

	.er-sql-editor-wrap {
		position: relative;
		flex: 1;
		min-width: 0;
		min-height: 0;
	}

	.er-sql-highlight,
	.er-sql-editor {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 10px;
		border: none;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 12px;
		line-height: 1.55;
		letter-spacing: normal;
		tab-size: 2;
		white-space: pre-wrap;
		overflow-wrap: break-word;
		box-sizing: border-box;
	}

	.er-sql-highlight {
		pointer-events: none;
		overflow: hidden;
		color: #e2e8f0;
		background: transparent;
	}

	.er-sql-editor {
		background: transparent;
		color: transparent;
		caret-color: #f8fafc;
		resize: none;
		outline: none;
		overflow: auto;
	}

	.er-sql-editor::selection {
		background: rgba(56, 189, 248, 0.28);
	}

	.er-sql-highlight :global(.tok-kw) {
		color: #c084fc;
		font-weight: 600;
	}

	.er-sql-highlight :global(.tok-type) {
		color: #38bdf8;
	}

	.er-sql-highlight :global(.tok-table) {
		color: #fde047;
		font-weight: 600;
	}

	.er-sql-highlight :global(.tok-ident) {
		color: #e2e8f0;
	}

	.er-sql-highlight :global(.tok-sym) {
		color: #f472b6;
		font-weight: 600;
	}

	.er-sql-highlight :global(.tok-string) {
		color: #34d399;
	}

	.er-sql-highlight :global(.tok-comment) {
		color: #64748b;
		font-style: italic;
	}

	.er-suggest-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		padding: 6px 8px;
		background: #1e293b;
		border-top: 1px solid rgba(148, 163, 184, 0.2);
	}

	.er-suggest-chip {
		height: 22px;
		padding: 0 8px;
		border-radius: 4px;
		border: 1px solid rgba(148, 163, 184, 0.25);
		background: #0f172a;
		color: #cbd5e1;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 11px;
		cursor: pointer;
	}

	.er-suggest-chip.active,
	.er-suggest-chip:hover {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.er-preview-bar {
		font-size: 11px;
		color: var(--text-secondary);
	}

	.er-drawer-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px 12px;
		border-top: 1px solid var(--border-subtle);
		background: var(--bg-tertiary);
	}

	.er-footer-right {
		display: flex;
		gap: 8px;
		margin-left: auto;
	}

	.er-btn-ghost,
	.er-btn-primary,
	.er-btn-danger {
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

	.er-btn-danger {
		background: transparent;
		border-color: rgba(239, 68, 68, 0.35);
		color: #f87171;
	}
</style>
