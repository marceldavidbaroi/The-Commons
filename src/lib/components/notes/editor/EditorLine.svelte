<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';

	let {
		text,
		lineIndex,
		isFocused = false,
		onFocus,
		onUpdateText,
		onKeyDown,
		onToggleTask,
		onWikiClick
	} = $props<{
		text: string;
		lineIndex: number;
		isFocused?: boolean;
		onFocus?: () => void;
		onUpdateText?: (lineIndex: number, newText: string) => void;
		onKeyDown?: (e: KeyboardEvent, lineIndex: number) => void;
		onToggleTask?: (lineIndex: number, newChecked: boolean) => void;
		onWikiClick?: (title: string, event: MouseEvent) => void;
	}>();

	let inputEl = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (isFocused && inputEl) {
			inputEl.focus();
		}
	});

	interface ParsedToken {
		type: 'text' | 'bold' | 'italic' | 'code' | 'wiki';
		content: string;
		raw: string;
		isResolved?: boolean;
		title?: string;
	}

	interface LineParsed {
		type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'task' | 'bullet' | 'quote' | 'hr' | 'paragraph';
		content: string;
		taskChecked?: boolean;
		level?: number;
	}

	// Classify the line structure
	const lineStructure = $derived.by<LineParsed>(() => {
		const raw = text;

		// Horizontal rule
		if (/^(\*\*\*|---|___)\s*$/.test(raw.trim())) {
			return { type: 'hr', content: '' };
		}

		// Task list item: - [ ] or - [x]
		const taskMatch = raw.match(/^(\s*[-*+]\s+\[([ xX])\])\s*(.*)$/);
		if (taskMatch) {
			return {
				type: 'task',
				content: taskMatch[3],
				taskChecked: taskMatch[2].toLowerCase() === 'x'
			};
		}

		// Header 1-6
		const headerMatch = raw.match(/^(#{1,6})\s+(.*)$/);
		if (headerMatch) {
			const level = headerMatch[1].length;
			return {
				type: `h${level}` as any,
				content: headerMatch[2],
				level
			};
		}

		// Blockquote: > text
		const quoteMatch = raw.match(/^>\s*(.*)$/);
		if (quoteMatch) {
			return {
				type: 'quote',
				content: quoteMatch[1]
			};
		}

		// Bullet list: - or *
		const bulletMatch = raw.match(/^(\s*[-*+])\s+(.*)$/);
		if (bulletMatch) {
			return {
				type: 'bullet',
				content: bulletMatch[2]
			};
		}

		return {
			type: 'paragraph',
			content: raw
		};
	});

	// Inline token parsing (bold, italic, code, [[wiki-link]])
	const inlineTokens = $derived.by<ParsedToken[]>(() => {
		const raw = lineStructure.content;
		if (!raw) return [];

		// Match patterns: `code`, [[wiki]], **bold**, *italic*
		const regex = /(`[^`]+`)|(\[\[[^\]]+\]\])|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
		const tokens: ParsedToken[] = [];
		let lastIndex = 0;
		let match;

		while ((match = regex.exec(raw)) !== null) {
			const index = match.index;
			if (index > lastIndex) {
				tokens.push({
					type: 'text',
					content: raw.substring(lastIndex, index),
					raw: raw.substring(lastIndex, index)
				});
			}

			const fullMatch = match[0];
			if (match[1]) {
				// Code
				tokens.push({
					type: 'code',
					content: fullMatch.slice(1, -1),
					raw: fullMatch
				});
			} else if (match[2]) {
				// Wiki Link [[target|alias]]
				const inner = fullMatch.slice(2, -2).trim();
				const parts = inner.split('|');
				const targetTitle = parts[0].trim();
				const displayAlias = parts[1] ? parts[1].trim() : targetTitle;
				const isResolved = notesStore.activeTitles.has(targetTitle.toLowerCase());

				tokens.push({
					type: 'wiki',
					content: displayAlias,
					title: targetTitle,
					raw: fullMatch,
					isResolved
				});
			} else if (match[3]) {
				// Bold **text**
				tokens.push({
					type: 'bold',
					content: fullMatch.slice(2, -2),
					raw: fullMatch
				});
			} else if (match[4]) {
				// Italic *text*
				tokens.push({
					type: 'italic',
					content: fullMatch.slice(1, -1),
					raw: fullMatch
				});
			}

			lastIndex = regex.lastIndex;
		}

		if (lastIndex < raw.length) {
			tokens.push({
				type: 'text',
				content: raw.substring(lastIndex),
				raw: raw.substring(lastIndex)
			});
		}

		return tokens;
	});

	function handleWikiClick(title: string, e: MouseEvent) {
		e.stopPropagation();
		if (onWikiClick) {
			onWikiClick(title, e);
		}
	}

	function handleTaskToggle(e: MouseEvent) {
		e.stopPropagation();
		if (onToggleTask && lineStructure.type === 'task') {
			onToggleTask(lineIndex, !lineStructure.taskChecked);
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="editor-line"
	class:is-empty={text.length === 0}
	class:is-active-line={isFocused}
	class:heading-line={lineStructure.type.startsWith('h')}
	onclick={onFocus}
	role="presentation"
>
	{#if isFocused}
		<div class="active-line-wrapper line-{lineStructure.type}">
			<input
				bind:this={inputEl}
				type="text"
				class="inline-line-input"
				value={text}
				placeholder={lineIndex === 0 ? "Type # for heading, [[ for link..." : ""}
				oninput={(e) => onUpdateText?.(lineIndex, (e.target as HTMLInputElement).value)}
				onkeydown={(e) => onKeyDown?.(e, lineIndex)}
			/>
		</div>
	{:else if lineStructure.type === 'hr'}
		<div class="line-hr"><hr /></div>
	{:else if lineStructure.type === 'h1'}
		<h1 class="line-h1">
			{#each inlineTokens as token}
				{#if token.type === 'wiki'}
					<button
						type="button"
						class="wiki-link-chip"
						class:resolved={token.isResolved}
						class:unresolved={!token.isResolved}
						title={token.isResolved ? `Open note: ${token.title}` : `Create note: ${token.title}`}
						onclick={(e) => handleWikiClick(token.title || token.content, e)}
					>{token.content}</button>
				{:else if token.type === 'bold'}
					<strong>{token.content}</strong>
				{:else if token.type === 'italic'}
					<em>{token.content}</em>
				{:else if token.type === 'code'}
					<code>{token.content}</code>
				{:else}
					<span>{token.content}</span>
				{/if}
			{/each}
		</h1>
	{:else if lineStructure.type === 'h2'}
		<h2 class="line-h2">
			{#each inlineTokens as token}
				{#if token.type === 'wiki'}
					<button
						type="button"
						class="wiki-link-chip"
						class:resolved={token.isResolved}
						class:unresolved={!token.isResolved}
						onclick={(e) => handleWikiClick(token.title || token.content, e)}
					>{token.content}</button>
				{:else if token.type === 'bold'}
					<strong>{token.content}</strong>
				{:else if token.type === 'italic'}
					<em>{token.content}</em>
				{:else if token.type === 'code'}
					<code>{token.content}</code>
				{:else}
					<span>{token.content}</span>
				{/if}
			{/each}
		</h2>
	{:else if lineStructure.type === 'h3'}
		<h3 class="line-h3">
			{#each inlineTokens as token}
				{#if token.type === 'wiki'}
					<button
						type="button"
						class="wiki-link-chip"
						class:resolved={token.isResolved}
						class:unresolved={!token.isResolved}
						onclick={(e) => handleWikiClick(token.title || token.content, e)}
					>{token.content}</button>
				{:else if token.type === 'bold'}
					<strong>{token.content}</strong>
				{:else if token.type === 'italic'}
					<em>{token.content}</em>
				{:else if token.type === 'code'}
					<code>{token.content}</code>
				{:else}
					<span>{token.content}</span>
				{/if}
			{/each}
		</h3>
	{:else if lineStructure.type === 'h4' || lineStructure.type === 'h5' || lineStructure.type === 'h6'}
		<h4 class="line-h4">
			{#each inlineTokens as token}
				{#if token.type === 'wiki'}
					<button
						type="button"
						class="wiki-link-chip"
						class:resolved={token.isResolved}
						class:unresolved={!token.isResolved}
						onclick={(e) => handleWikiClick(token.title || token.content, e)}
					>{token.content}</button>
				{:else if token.type === 'bold'}
					<strong>{token.content}</strong>
				{:else if token.type === 'italic'}
					<em>{token.content}</em>
				{:else if token.type === 'code'}
					<code>{token.content}</code>
				{:else}
					<span>{token.content}</span>
				{/if}
			{/each}
		</h4>
	{:else if lineStructure.type === 'task'}
		<div class="line-task" class:checked={lineStructure.taskChecked}>
			<button
				type="button"
				class="task-checkbox"
				class:checked={lineStructure.taskChecked}
				aria-checked={lineStructure.taskChecked}
				role="checkbox"
				onclick={handleTaskToggle}
			>
				{#if lineStructure.taskChecked}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
						<polyline points="20 6 9 17 4 12" />
					</svg>
				{/if}
			</button>
			<div class="task-text">
				{#each inlineTokens as token}
					{#if token.type === 'wiki'}
						<button
							type="button"
							class="wiki-link-chip"
							class:resolved={token.isResolved}
							class:unresolved={!token.isResolved}
							onclick={(e) => handleWikiClick(token.title || token.content, e)}
						>{token.content}</button>
					{:else if token.type === 'bold'}
						<strong>{token.content}</strong>
					{:else if token.type === 'italic'}
						<em>{token.content}</em>
					{:else if token.type === 'code'}
						<code>{token.content}</code>
					{:else}
						<span>{token.content}</span>
					{/if}
				{/each}
			</div>
		</div>
	{:else if lineStructure.type === 'quote'}
		<div class="line-quote">
			{#each inlineTokens as token}
				{#if token.type === 'wiki'}
					<button
						type="button"
						class="wiki-link-chip"
						class:resolved={token.isResolved}
						class:unresolved={!token.isResolved}
						onclick={(e) => handleWikiClick(token.title || token.content, e)}
					>{token.content}</button>
				{:else if token.type === 'bold'}
					<strong>{token.content}</strong>
				{:else if token.type === 'italic'}
					<em>{token.content}</em>
				{:else if token.type === 'code'}
					<code>{token.content}</code>
				{:else}
					<span>{token.content}</span>
				{/if}
			{/each}
		</div>
	{:else if lineStructure.type === 'bullet'}
		<div class="line-bullet">
			<span class="bullet-dot">•</span>
			<div class="bullet-text">
				{#each inlineTokens as token}
					{#if token.type === 'wiki'}
						<button
							type="button"
							class="wiki-link-chip"
							class:resolved={token.isResolved}
							class:unresolved={!token.isResolved}
							onclick={(e) => handleWikiClick(token.title || token.content, e)}
						>{token.content}</button>
					{:else if token.type === 'bold'}
						<strong>{token.content}</strong>
					{:else if token.type === 'italic'}
						<em>{token.content}</em>
					{:else if token.type === 'code'}
						<code>{token.content}</code>
					{:else}
						<span>{token.content}</span>
					{/if}
				{/each}
			</div>
		</div>
	{:else}
		<div class="line-paragraph">
			{#if text.length === 0}
				<span class="empty-line-spacer">&nbsp;</span>
			{:else}
				{#each inlineTokens as token}
					{#if token.type === 'wiki'}
						<button
							type="button"
							class="wiki-link-chip"
							class:resolved={token.isResolved}
							class:unresolved={!token.isResolved}
							onclick={(e) => handleWikiClick(token.title || token.content, e)}
						>{token.content}</button>
					{:else if token.type === 'bold'}
						<strong>{token.content}</strong>
					{:else if token.type === 'italic'}
						<em>{token.content}</em>
					{:else if token.type === 'code'}
						<code>{token.content}</code>
					{:else}
						<span>{token.content}</span>
					{/if}
				{/each}
			{/if}
		</div>
	{/if}
</div>

<style>
	.editor-line {
		min-height: 24px;
		line-height: 1.6;
		font-family: var(--font-sans);
		color: var(--text-primary);
		word-break: break-word;
		cursor: text;
		position: relative;
	}

	.active-line-wrapper {
		width: 100%;
		display: flex;
		align-items: center;
	}

	.inline-line-input {
		width: 100%;
		border: none;
		outline: none;
		background: transparent;
		color: var(--text-primary);
		font-family: inherit;
		font-size: inherit;
		font-weight: inherit;
		line-height: inherit;
		padding: 0;
		margin: 0;
	}

	/* Dynamic header scaling for active editable line */
	.active-line-wrapper.line-h1 .inline-line-input {
		font-family: var(--font-serif);
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.active-line-wrapper.line-h2 .inline-line-input {
		font-family: var(--font-serif);
		font-size: 1.35rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.active-line-wrapper.line-h3 .inline-line-input {
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.active-line-wrapper.line-h4 .inline-line-input {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.editor-line.is-empty {
		min-height: 24px;
	}

	.empty-line-spacer {
		display: inline-block;
		user-select: none;
	}

	/* Headers */
	.line-h1 {
		font-family: var(--font-serif);
		font-size: 1.75rem;
		font-weight: 700;
		line-height: 1.25;
		margin: 8px 0 4px;
		color: var(--text-primary);
	}

	.line-h2 {
		font-family: var(--font-serif);
		font-size: 1.35rem;
		font-weight: 600;
		line-height: 1.3;
		margin: 6px 0 2px;
		color: var(--text-primary);
	}

	.line-h3 {
		font-size: 1.15rem;
		font-weight: 600;
		line-height: 1.35;
		margin: 4px 0 2px;
		color: var(--text-primary);
	}

	.line-h4 {
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.4;
		margin: 4px 0 2px;
		color: var(--text-secondary);
	}

	/* Task lists */
	.line-task {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin: 2px 0;
	}

	.task-checkbox {
		width: 16px;
		height: 16px;
		border-radius: 4px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-tertiary);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		cursor: pointer;
		margin-top: 3px;
		flex-shrink: 0;
		transition: background 0.15s ease, border-color 0.15s ease;
	}

	.task-checkbox:hover {
		border-color: var(--primary);
	}

	.task-checkbox.checked {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	.task-checkbox svg {
		width: 11px;
		height: 11px;
	}

	.line-task.checked .task-text {
		text-decoration: line-through;
		color: var(--text-muted);
	}

	.task-text {
		flex: 1;
	}

	/* Blockquotes */
	.line-quote {
		padding-left: 12px;
		border-left: 3px solid var(--primary);
		color: var(--text-secondary);
		font-style: italic;
		margin: 2px 0;
	}

	/* Bullets */
	.line-bullet {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		margin: 2px 0;
	}

	.bullet-dot {
		color: var(--primary);
		font-size: 14px;
		user-select: none;
		margin-left: 4px;
	}

	.bullet-text {
		flex: 1;
	}

	/* Horizontal Rule */
	.line-hr hr {
		border: 0;
		border-top: 1px solid var(--border-subtle);
		margin: 8px 0;
	}

	/* Inline styles */
	code {
		font-family: var(--font-mono, monospace);
		font-size: 0.88em;
		background: var(--bg-tertiary);
		padding: 2px 5px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
	}

	/* Wiki Link Chip */
	.wiki-link-chip {
		display: inline-flex;
		align-items: center;
		padding: 0 4px;
		margin: 0 1px;
		font-weight: 500;
		border-radius: var(--radius-sm);
		border: none;
		cursor: pointer;
		text-decoration: none;
		vertical-align: baseline;
		transition: background 0.12s ease, color 0.12s ease;
		background: transparent;
	}

	.wiki-link-chip.resolved {
		color: var(--primary);
		background: rgba(var(--primary-rgb, 120, 100, 220), 0.1);
	}

	.wiki-link-chip.resolved:hover {
		background: rgba(var(--primary-rgb, 120, 100, 220), 0.2);
		text-decoration: underline;
	}

	.wiki-link-chip.unresolved {
		color: var(--text-muted);
		border-bottom: 1px dashed var(--text-muted);
		background: rgba(255, 255, 255, 0.03);
	}

	.wiki-link-chip.unresolved:hover {
		color: var(--text-primary);
		border-bottom-style: solid;
		background: rgba(255, 255, 255, 0.08);
	}
</style>
