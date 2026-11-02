<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';
	import TurndownService from 'turndown';

	const turndownService = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced'
	});

	let {
		text,
		lineIndex,
		isFocused = false,
		onFocus,
		onUpdateText,
		onKeyDown,
		onToggleTask,
		onWikiClick,
		onWikiTrigger
	} = $props<{
		text: string;
		lineIndex: number;
		isFocused?: boolean;
		onFocus?: () => void;
		onUpdateText?: (lineIndex: number, newText: string) => void;
		onKeyDown?: (e: KeyboardEvent, lineIndex: number) => void;
		onToggleTask?: (lineIndex: number, newChecked: boolean) => void;
		onWikiClick?: (title: string, event: MouseEvent) => void;
		onWikiTrigger?: (query: string, triggerPos: { top: number; left: number }, triggerCharIndex: number) => void;
	}>();

	let editableEl = $state<HTMLDivElement | null>(null);

	// Caret calculation utilities for contenteditable
	function getCaretCharacterOffset(element: HTMLElement): number {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return 0;
		const range = sel.getRangeAt(0);
		const preCaretRange = range.cloneRange();
		preCaretRange.selectNodeContents(element);
		preCaretRange.setEnd(range.endContainer, range.endOffset);
		return preCaretRange.toString().length;
	}

	function setCaretCharacterOffset(element: HTMLElement, offset: number) {
		const sel = window.getSelection();
		if (!sel) return;
		let currentOffset = 0;
		const range = document.createRange();
		range.setStart(element, 0);
		range.collapse(true);

		const nodeStack: Node[] = [element];
		let found = false;

		while (nodeStack.length > 0 && !found) {
			const node = nodeStack.pop()!;
			if (node.nodeType === Node.TEXT_NODE) {
				const nextOffset = currentOffset + (node.textContent?.length || 0);
				if (offset <= nextOffset) {
					range.setStart(node, Math.max(0, offset - currentOffset));
					range.collapse(true);
					found = true;
					break;
				}
				currentOffset = nextOffset;
			} else {
				for (let i = node.childNodes.length - 1; i >= 0; i--) {
					nodeStack.push(node.childNodes[i]);
				}
			}
		}

		if (!found) {
			range.selectNodeContents(element);
			range.collapse(false);
		}

		sel.removeAllRanges();
		sel.addRange(range);
	}

	interface InlineToken {
		type: 'text' | 'bold' | 'italic' | 'strike' | 'code' | 'wiki' | 'tag';
		content: string;
		raw: string;
		start: number;
		end: number;
		delimiter: string;
		isResolved?: boolean;
		title?: string;
	}

	function parseInlineTokens(raw: string): InlineToken[] {
		if (!raw) return [];
		// Match: `code`, ~~strike~~, **bold**, *italic*, [[wiki]], #tag
		const regex = /(`[^`]+`)|(~~[^~]+~~)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[\[[^\]]+\]\])|(#[\w\u00C0-\u024F\-/]+)/g;
		const tokens: InlineToken[] = [];
		let lastIdx = 0;
		let match: RegExpExecArray | null;

		while ((match = regex.exec(raw)) !== null) {
			const start = match.index;
			if (start > lastIdx) {
				tokens.push({
					type: 'text',
					content: raw.substring(lastIdx, start),
					raw: raw.substring(lastIdx, start),
					start: lastIdx,
					end: start,
					delimiter: ''
				});
			}

			const full = match[0];
			const end = start + full.length;

			if (match[1]) {
				// Code `code`
				tokens.push({
					type: 'code',
					content: full.slice(1, -1),
					raw: full,
					start,
					end,
					delimiter: '`'
				});
			} else if (match[2]) {
				// Strike ~~strike~~
				tokens.push({
					type: 'strike',
					content: full.slice(2, -2),
					raw: full,
					start,
					end,
					delimiter: '~~'
				});
			} else if (match[3]) {
				// Bold **bold**
				tokens.push({
					type: 'bold',
					content: full.slice(2, -2),
					raw: full,
					start,
					end,
					delimiter: '**'
				});
			} else if (match[4]) {
				// Italic *italic*
				tokens.push({
					type: 'italic',
					content: full.slice(1, -1),
					raw: full,
					start,
					end,
					delimiter: '*'
				});
			} else if (match[5]) {
				// Wiki link [[title|alias]]
				const inner = full.slice(2, -2).trim();
				const parts = inner.split('|');
				const targetTitle = parts[0].trim();
				const displayAlias = parts[1] ? parts[1].trim() : targetTitle;
				const isResolved = notesStore.activeTitles.has(targetTitle.toLowerCase());
				tokens.push({
					type: 'wiki',
					content: displayAlias,
					title: targetTitle,
					raw: full,
					start,
					end,
					delimiter: '[[',
					isResolved
				});
			} else if (match[6]) {
				// Tag #tag-name
				tokens.push({
					type: 'tag',
					content: full.slice(1),
					raw: full,
					start,
					end,
					delimiter: '#'
				});
			}

			lastIdx = regex.lastIndex;
		}

		if (lastIdx < raw.length) {
			tokens.push({
				type: 'text',
				content: raw.substring(lastIdx),
				raw: raw.substring(lastIdx),
				start: lastIdx,
				end: raw.length,
				delimiter: ''
			});
		}

		return tokens;
	}

	function escapeHtml(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	// Build contextual live-preview HTML: syntax delimiters show only when cursor is inside the token
	function renderLivePreviewHtml(rawText: string, caretPos: number | null): string {
		if (!rawText) return '';
		const tokens = parseInlineTokens(rawText);
		let html = '';

		for (const t of tokens) {
			if (t.type === 'text') {
				html += escapeHtml(t.content);
				continue;
			}

			// Cursor is active in token if caret is within [start, end]
			const isCursorInside = caretPos !== null && caretPos >= t.start && caretPos <= t.end;
			const delimClass = isCursorInside ? 'syntax-char' : 'syntax-char syntax-hidden';

			if (t.type === 'bold') {
				html += `<strong class="live-bold"><span class="${delimClass}">**</span>${escapeHtml(t.content)}<span class="${delimClass}">**</span></strong>`;
			} else if (t.type === 'italic') {
				html += `<em class="live-italic"><span class="${delimClass}">*</span>${escapeHtml(t.content)}<span class="${delimClass}">*</span></em>`;
			} else if (t.type === 'strike') {
				html += `<del class="live-strike"><span class="${delimClass}">~~</span>${escapeHtml(t.content)}<span class="${delimClass}">~~</span></del>`;
			} else if (t.type === 'code') {
				html += `<code class="live-code"><span class="${delimClass}">\`</span>${escapeHtml(t.content)}<span class="${delimClass}">\`</span></code>`;
			} else if (t.type === 'wiki') {
				const resolvedClass = t.isResolved ? 'resolved' : 'unresolved';
				html += `<span class="wiki-link-chip ${resolvedClass}"><span class="${delimClass}">[[</span>${escapeHtml(t.content)}<span class="${delimClass}">]]</span></span>`;
			} else if (t.type === 'tag') {
				html += `<span class="tag-pill"><span class="${delimClass}">#</span>${escapeHtml(t.content)}</span>`;
			}
		}

		return html;
	}

	// Svelte action to manage contenteditable syncing, caret stability, contextual syntax hiding, and line events
	function contentEditableLine(node: HTMLDivElement, initialText: string) {
		let currentRaw = initialText;

		function syncDomWithContext(rawVal: string, targetCaret?: number) {
			currentRaw = rawVal;
			const caret = targetCaret ?? getCaretCharacterOffset(node);
			node.innerHTML = renderLivePreviewHtml(rawVal, caret);
			setCaretCharacterOffset(node, Math.min(caret, rawVal.length));
		}

		// Initial render
		syncDomWithContext(initialText, initialText.length);

		function checkWikiTriggerInLine(textVal: string, caretPos: number) {
			const textBefore = textVal.substring(0, caretPos);
			const lastOpen = textBefore.lastIndexOf('[[');
			const lastClose = textBefore.lastIndexOf(']]');

			if (lastOpen !== -1 && lastOpen > lastClose) {
				const query = textBefore.substring(lastOpen + 2);
				if (!query.includes('\n')) {
					const rect = node.getBoundingClientRect();
					onWikiTrigger?.(query, { top: rect.bottom + 4, left: Math.min(rect.left + (lastOpen * 8), rect.right - 200) }, lastOpen);
					return;
				}
			}
			onWikiTrigger?.('', { top: 0, left: 0 }, -1);
		}

		function handleInput() {
			const newText = node.textContent || '';
			currentRaw = newText;
			const caret = getCaretCharacterOffset(node);
			onUpdateText?.(lineIndex, newText);
			node.innerHTML = renderLivePreviewHtml(newText, caret);
			setCaretCharacterOffset(node, caret);
			checkWikiTriggerInLine(newText, caret);
		}

		function handleSelectionOrCaretChange() {
			if (document.activeElement !== node) return;
			const caret = getCaretCharacterOffset(node);
			const expectedHtml = renderLivePreviewHtml(currentRaw, caret);
			if (node.innerHTML !== expectedHtml) {
				node.innerHTML = expectedHtml;
				setCaretCharacterOffset(node, caret);
			}
		}

		function handleKeyDownInternal(e: KeyboardEvent) {
			if (e.key === 'Tab') {
				e.preventDefault();
				const caret = getCaretCharacterOffset(node);
				if (e.shiftKey) {
					// Shift+Tab: Unindent (remove up to 2 leading spaces or a leading tab)
					if (currentRaw.startsWith('  ')) {
						currentRaw = currentRaw.slice(2);
						onUpdateText?.(lineIndex, currentRaw);
						syncDomWithContext(currentRaw, Math.max(0, caret - 2));
					} else if (currentRaw.startsWith('\t') || currentRaw.startsWith(' ')) {
						currentRaw = currentRaw.slice(1);
						onUpdateText?.(lineIndex, currentRaw);
						syncDomWithContext(currentRaw, Math.max(0, caret - 1));
					}
				} else {
					// Tab: Indent (insert 2 spaces at start of line or at caret)
					const prefix = currentRaw.substring(0, caret);
					const suffix = currentRaw.substring(caret);
					currentRaw = prefix + '  ' + suffix;
					onUpdateText?.(lineIndex, currentRaw);
					syncDomWithContext(currentRaw, caret + 2);
				}
				return;
			}

			if (e.key === 'Enter') {
				e.preventDefault();
				onKeyDown?.(e, lineIndex);
				return;
			}

			if (e.key === 'Backspace') {
				const caret = getCaretCharacterOffset(node);
				if (caret === 0) {
					onKeyDown?.(e, lineIndex);
				}
				return;
			}

			onKeyDown?.(e, lineIndex);
		}

		function handlePaste(e: ClipboardEvent) {
			const html = e.clipboardData?.getData('text/html');
			if (html) {
				e.preventDefault();
				const md = turndownService.turndown(html);
				const caret = getCaretCharacterOffset(node);
				const prefix = currentRaw.substring(0, caret);
				const suffix = currentRaw.substring(caret);
				currentRaw = prefix + md + suffix;
				onUpdateText?.(lineIndex, currentRaw);
				syncDomWithContext(currentRaw, caret + md.length);
				return;
			}
			const plainText = e.clipboardData?.getData('text/plain');
			if (plainText) {
				e.preventDefault();
				const caret = getCaretCharacterOffset(node);
				const prefix = currentRaw.substring(0, caret);
				const suffix = currentRaw.substring(caret);
				currentRaw = prefix + plainText + suffix;
				onUpdateText?.(lineIndex, currentRaw);
				syncDomWithContext(currentRaw, caret + plainText.length);
			}
		}

		node.addEventListener('input', handleInput);
		node.addEventListener('paste', handlePaste);
		node.addEventListener('keydown', handleKeyDownInternal);
		node.addEventListener('keyup', handleSelectionOrCaretChange);
		node.addEventListener('mouseup', handleSelectionOrCaretChange);

		return {
			update(newText: string) {
				if (currentRaw !== newText) {
					syncDomWithContext(newText);
				}
			},
			destroy() {
				node.removeEventListener('input', handleInput);
				node.removeEventListener('paste', handlePaste);
				node.removeEventListener('keydown', handleKeyDownInternal);
				node.removeEventListener('keyup', handleSelectionOrCaretChange);
				node.removeEventListener('mouseup', handleSelectionOrCaretChange);
			}
		};
	}

	$effect(() => {
		if (isFocused && editableEl) {
			editableEl.focus();
			// Default caret to end of line when focused
			setCaretCharacterOffset(editableEl, text.length);
		}
	});

	interface ParsedToken {
		type: 'text' | 'bold' | 'italic' | 'strike' | 'code' | 'wiki' | 'tag';
		content: string;
		raw: string;
		isResolved?: boolean;
		title?: string;
	}

	interface LineParsed {
		type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'task' | 'bullet' | 'quote' | 'callout' | 'image' | 'hr' | 'paragraph';
		content: string;
		taskChecked?: boolean;
		level?: number;
		calloutType?: string;
		calloutTitle?: string;
		imageSrc?: string;
		imageAlt?: string;
	}

	// Classify the line structure
	const lineStructure = $derived.by<LineParsed>(() => {
		const raw = text;

		// Horizontal rule
		if (/^(\*\*\*|---|___)\s*$/.test(raw.trim())) {
			return { type: 'hr', content: '' };
		}

		// Embed image: ![[image.png]] or ![alt](url)
		const wikiImageMatch = raw.match(/^\s*!\[\[([^\]]+)\]\]\s*$/);
		if (wikiImageMatch) {
			const inner = wikiImageMatch[1].trim();
			const [src, alt] = inner.split('|');
			return {
				type: 'image',
				content: inner,
				imageSrc: src.trim(),
				imageAlt: alt ? alt.trim() : src.trim()
			};
		}

		const mdImageMatch = raw.match(/^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/);
		if (mdImageMatch) {
			return {
				type: 'image',
				content: raw,
				imageAlt: mdImageMatch[1],
				imageSrc: mdImageMatch[2]
			};
		}

		// Callout / Admonition: > [!info] Optional title
		const calloutMatch = raw.match(/^>\s*\[!(\w+)\]\s*(.*)$/);
		if (calloutMatch) {
			const calloutType = calloutMatch[1].toLowerCase();
			return {
				type: 'callout',
				content: calloutMatch[2] || calloutType.toUpperCase(),
				calloutType,
				calloutTitle: calloutMatch[2] || calloutType.toUpperCase()
			};
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

	// Inline token parsing (bold, italic, strike, code, [[wiki-link]], #tag)
	const inlineTokens = $derived.by<ParsedToken[]>(() => {
		const raw = lineStructure.content;
		if (!raw) return [];

		// Match patterns: `code`, ~~strike~~, [[wiki]], **bold**, *italic*, #tag
		const regex = /(`[^`]+`)|(~~[^~]+~~)|(\[\[[^\]]+\]\])|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(#[\w\u00C0-\u024F\-/]+)/g;
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
				// Strike
				tokens.push({
					type: 'strike',
					content: fullMatch.slice(2, -2),
					raw: fullMatch
				});
			} else if (match[3]) {
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
			} else if (match[4]) {
				// Bold **text**
				tokens.push({
					type: 'bold',
					content: fullMatch.slice(2, -2),
					raw: fullMatch
				});
			} else if (match[5]) {
				// Italic *text*
				tokens.push({
					type: 'italic',
					content: fullMatch.slice(1, -1),
					raw: fullMatch
				});
			} else if (match[6]) {
				// Tag #tag
				tokens.push({
					type: 'tag',
					content: fullMatch.slice(1),
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
			<div
				bind:this={editableEl}
				use:contentEditableLine={text}
				contenteditable="true"
				class="inline-line-input"
				role="textbox"
				tabindex="0"
				aria-multiline="false"
				data-placeholder={lineIndex === 0 ? "Type # for heading, [[ for link..." : ""}
			></div>
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
	{:else if lineStructure.type === 'callout'}
		<div class="line-callout callout-{lineStructure.calloutType || 'info'}">
			<div class="callout-header">
				<span class="callout-icon">
					{#if lineStructure.calloutType === 'warning' || lineStructure.calloutType === 'caution'}
						⚠️
					{:else if lineStructure.calloutType === 'tip' || lineStructure.calloutType === 'hint'}
						💡
					{:else if lineStructure.calloutType === 'danger' || lineStructure.calloutType === 'error'}
						🛑
					{:else}
						ℹ️
					{/if}
				</span>
				<span class="callout-title">{lineStructure.calloutTitle}</span>
			</div>
		</div>
	{:else if lineStructure.type === 'image'}
		<div class="line-embed-image">
			<img src={lineStructure.imageSrc} alt={lineStructure.imageAlt || 'Embedded image'} loading="lazy" />
			{#if lineStructure.imageAlt && lineStructure.imageAlt !== lineStructure.imageSrc}
				<span class="image-caption">{lineStructure.imageAlt}</span>
			{/if}
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
		resize: none;
		overflow: hidden;
		white-space: pre-wrap;
		word-break: break-word;
		box-sizing: border-box;
		display: block;
		min-height: 1.6em;
	}

	.inline-line-input:empty:before {
		content: attr(data-placeholder);
		color: var(--text-muted);
		pointer-events: none;
	}

	/* Dynamic header scaling for active editable line */
	.active-line-wrapper.line-h1 .inline-line-input {
		font-family: var(--font-serif);
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	/* Syntax formatting & contextual hiding */
	.syntax-char {
		color: var(--text-muted);
		font-family: var(--font-mono, monospace);
		font-size: 0.9em;
		opacity: 0.6;
		user-select: none;
		transition: opacity 0.1s ease;
	}

	.syntax-char.syntax-hidden {
		display: none;
	}

	.live-bold {
		font-weight: 700;
		color: var(--text-primary);
	}

	.live-italic {
		font-style: italic;
	}

	.live-strike {
		text-decoration: line-through;
		color: var(--text-muted);
	}

	.live-code {
		font-family: var(--font-mono, monospace);
		font-size: 0.88em;
		background: var(--bg-tertiary);
		padding: 2px 5px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
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

	/* Callouts / Admonitions */
	.line-callout {
		border-left: 4px solid var(--primary);
		background: rgba(var(--primary-rgb, 120, 100, 220), 0.08);
		border-radius: var(--radius-sm, 4px);
		padding: 8px 12px;
		margin: 4px 0;
	}

	.line-callout.callout-warning {
		border-left-color: #f59e0b;
		background: rgba(245, 158, 11, 0.1);
	}

	.line-callout.callout-tip {
		border-left-color: #10b981;
		background: rgba(16, 185, 129, 0.1);
	}

	.line-callout.callout-danger {
		border-left-color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}

	.callout-header {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--text-primary);
	}

	.callout-icon {
		font-size: 1.1rem;
		line-height: 1;
	}

	/* Embedded images */
	.line-embed-image {
		margin: 8px 0;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.line-embed-image img {
		max-width: 100%;
		max-height: 480px;
		border-radius: var(--radius-md, 6px);
		border: 1px solid var(--border-subtle);
		object-fit: contain;
	}

	.image-caption {
		font-size: 0.82rem;
		color: var(--text-muted);
		margin-top: 4px;
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

	/* Tag Badge */
	.tag-pill {
		display: inline-flex;
		align-items: center;
		padding: 1px 6px;
		margin: 0 2px;
		font-size: 0.85em;
		font-weight: 500;
		color: var(--primary);
		background: rgba(var(--primary-rgb, 120, 100, 220), 0.12);
		border-radius: var(--radius-sm, 4px);
		border: 1px solid rgba(var(--primary-rgb, 120, 100, 220), 0.25);
		vertical-align: baseline;
	}
</style>
