<script lang="ts">
	import { tick } from 'svelte';
	import mermaid from 'mermaid';
	import { themeStore } from '$lib/theme';

	let {
		code,
		language = '',
		onUpdateCode
	} = $props<{
		code: string;
		language?: string;
		onUpdateCode?: (newCode: string) => void;
	}>();

	let isEditing = $state<boolean>(false);
	let copied = $state<boolean>(false);
	let codeArea = $state<HTMLTextAreaElement | null>(null);
	let mermaidSvg = $state<string>('');
	let mermaidError = $state<string | null>(null);

	const isMermaid = $derived(language?.toLowerCase().trim() === 'mermaid');

	$effect(() => {
		const currentTheme = $themeStore;
		if (isMermaid && !isEditing && code.trim()) {
			const currentCode = code;
			const isDark = currentTheme === 'midnight' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
			
			tick().then(async () => {
				try {
					mermaid.initialize({
						startOnLoad: false,
						theme: 'base',
						securityLevel: 'loose',
						themeVariables: {
							darkMode: isDark,
							background: 'transparent',
							mainBkg: isDark ? '#201f1d' : '#ffffff',
							nodeBorder: isDark ? '#34302b' : '#e3ddd1',
							nodeTextColor: isDark ? '#ede8df' : '#2c2825',
							primaryColor: isDark ? '#201f1d' : '#ffffff',
							primaryBorderColor: isDark ? '#34302b' : '#e3ddd1',
							primaryTextColor: isDark ? '#ede8df' : '#2c2825',
							clusterBkg: isDark ? '#181716' : '#f6f4ee',
							clusterBorder: isDark ? '#34302b' : '#e3ddd1',
							titleColor: isDark ? '#ede8df' : '#2c2825',
							lineColor: isDark ? '#736c61' : '#948b82',
							arrowheadColor: isDark ? '#736c61' : '#948b82',
							defaultLinkColor: isDark ? '#736c61' : '#948b82',
							secondaryColor: isDark ? '#282623' : '#ede8de',
							tertiaryColor: isDark ? '#181716' : '#f6f4ee',
							fontFamily: 'var(--font-mono, monospace)',
							fontSize: '12px'
						}
					});
					const renderId = `m-${Math.random().toString(36).substring(2, 9)}`;
					const { svg } = await mermaid.render(renderId, currentCode);
					mermaidSvg = svg;
					mermaidError = null;
				} catch (err: any) {
					console.error('Mermaid render error in EditorCodeBlock:', err);
					mermaidError = err?.message || 'Failed to render mermaid diagram';
					mermaidSvg = '';
				}
			});
		}
	});

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (e) {
			console.error('Failed to copy code', e);
		}
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		onUpdateCode?.(target.value);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Tab') {
			e.preventDefault();
			const target = e.currentTarget as HTMLTextAreaElement;
			const start = target.selectionStart;
			const end = target.selectionEnd;
			const val = target.value;
			target.value = val.substring(0, start) + '  ' + val.substring(end);
			target.selectionStart = target.selectionEnd = start + 2;
			onUpdateCode?.(target.value);
		}
	}
</script>

<div class="code-block-container" role="region" aria-label="Code block">
	<div class="code-block-header">
		<div class="header-left">
			<span class="code-lang-tag">{language || 'plaintext'}</span>
			{#if isMermaid}
				<button
					type="button"
					class="view-toggle-btn"
					onclick={() => {
						isEditing = !isEditing;
						if (isEditing) {
							setTimeout(() => codeArea?.focus(), 0);
						}
					}}
					aria-label={isEditing ? 'Preview diagram' : 'Edit mermaid code'}
				>
					{isEditing ? 'Preview' : 'Edit'}
				</button>
			{/if}
		</div>
		<button
			type="button"
			class="copy-btn"
			onclick={handleCopy}
			aria-label="Copy code to clipboard"
		>
			{#if copied}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="20 6 9 17 4 12" />
				</svg>
				<span>Copied!</span>
			{:else}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
				</svg>
				<span>Copy</span>
			{/if}
		</button>
	</div>

	{#if isEditing}
		<textarea
			bind:this={codeArea}
			class="code-editor-textarea"
			value={code}
			oninput={handleInput}
			onkeydown={handleKeyDown}
			onblur={() => (isEditing = false)}
			rows={Math.max(2, code.split('\n').length)}
			spellcheck="false"
		></textarea>
	{:else if isMermaid}
		{#if mermaidError}
			<div class="mermaid-error">
				<div class="mermaid-error-title">Diagram syntax error</div>
				<pre class="code-block-content" onclick={() => {
					isEditing = true;
					setTimeout(() => codeArea?.focus(), 0);
				}}><code>{code}</code></pre>
			</div>
		{:else if mermaidSvg}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="mermaid-preview"
				role="button"
				tabindex="0"
				title="Click to edit diagram source"
				onclick={() => {
					isEditing = true;
					setTimeout(() => codeArea?.focus(), 0);
				}}
			>
				{@html mermaidSvg}
			</div>
		{:else}
			<!-- Loading or empty state -->
			<pre
				class="code-block-content"
				onclick={() => {
					isEditing = true;
					setTimeout(() => codeArea?.focus(), 0);
				}}
				tabindex="0"
				role="button"
				aria-label="Click to edit code block"
			><code>{code}</code></pre>
		{/if}
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<pre
			class="code-block-content"
			onclick={() => {
				isEditing = true;
				setTimeout(() => codeArea?.focus(), 0);
			}}
			tabindex="0"
			role="button"
			aria-label="Click to edit code block"
		><code>{code}</code></pre>
	{/if}
</div>

<style>
	.code-block-container {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md, 6px);
		margin: 8px 0;
		overflow: hidden;
		font-family: var(--font-mono, monospace);
		font-size: 0.88rem;
	}

	.code-block-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 12px;
		background: color-mix(in srgb, var(--bg-surface) 60%, transparent);
		border-bottom: 1px solid var(--border-subtle);
		user-select: none;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.code-lang-tag {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-muted);
		font-weight: 600;
	}

	.view-toggle-btn {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		padding: 1px 6px;
		border-radius: var(--radius-sm, 4px);
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.view-toggle-btn:hover {
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	.copy-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		color: var(--text-muted);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: var(--radius-sm, 4px);
		transition: color 0.15s ease, background 0.15s ease;
	}

	.copy-btn svg {
		width: 12px;
		height: 12px;
	}

	.copy-btn:hover {
		color: var(--text-primary);
		background: color-mix(in srgb, var(--text-primary) 8%, transparent);
	}

	.code-block-content {
		margin: 0;
		padding: 12px 14px;
		overflow-x: auto;
		cursor: text;
		line-height: 1.5;
		color: var(--text-primary);
		white-space: pre;
	}

	.code-block-content:focus {
		outline: 1px solid var(--primary);
	}

	.mermaid-preview {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 1.5rem 1rem;
		background: var(--bg-primary);
		overflow-x: auto;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.mermaid-preview:hover {
		background: color-mix(in srgb, var(--bg-primary) 95%, var(--bg-secondary));
	}

	.mermaid-preview:focus {
		outline: 1px solid var(--primary);
	}

	.mermaid-preview :global(svg) {
		max-width: 100%;
		height: auto;
	}

	/* Labels & text elements */
	.mermaid-preview :global(text),
	.mermaid-preview :global(.node text),
	.mermaid-preview :global(.node .label),
	.mermaid-preview :global(.node span),
	.mermaid-preview :global(.node p),
	.mermaid-preview :global(.messageText),
	.mermaid-preview :global(.actor text),
	.mermaid-preview :global(.entity text),
	.mermaid-preview :global(.labelText) {
		fill: var(--text-primary) !important;
		color: var(--text-primary) !important;
		font-family: var(--font-mono, monospace) !important;
		font-size: 12px;
	}

	/* Subgraph / cluster styling */
	.mermaid-preview :global(.cluster rect),
	.mermaid-preview :global(.cluster polygon) {
		fill: var(--bg-tertiary) !important;
		stroke: var(--border-subtle) !important;
		stroke-width: 1px !important;
		rx: 6px;
		ry: 6px;
	}

	.mermaid-preview :global(.cluster text),
	.mermaid-preview :global(.cluster span),
	.mermaid-preview :global(.cluster p) {
		fill: var(--text-secondary) !important;
		color: var(--text-secondary) !important;
		font-weight: 600;
	}

	/* Node boxes inside diagrams */
	.mermaid-preview :global(.node rect),
	.mermaid-preview :global(.node circle),
	.mermaid-preview :global(.node polygon),
	.mermaid-preview :global(.node ellipse),
	.mermaid-preview :global(.actor),
	.mermaid-preview :global(.entityBox) {
		fill: var(--bg-secondary) !important;
		stroke: var(--border-subtle) !important;
		stroke-width: 1px !important;
		rx: 6px;
		ry: 6px;
	}

	/* Edges, arrows & connectors */
	.mermaid-preview :global(.relationshipLine),
	.mermaid-preview :global(.flowchart-link),
	.mermaid-preview :global(.edgePaths .path) {
		stroke: var(--text-muted) !important;
		stroke-width: 1.25px !important;
	}

	.mermaid-preview :global(.marker),
	.mermaid-preview :global(.arrowheadPath) {
		fill: var(--text-muted) !important;
		stroke: var(--text-muted) !important;
	}

	.mermaid-preview :global(.edgeLabel) {
		background-color: var(--bg-primary) !important;
		color: var(--text-secondary) !important;
	}

	.mermaid-error {
		padding: 8px 12px;
		background: color-mix(in srgb, var(--danger, #ef4444) 10%, transparent);
	}

	.mermaid-error-title {
		font-size: 11px;
		color: var(--danger, #ef4444);
		font-weight: 600;
		margin-bottom: 4px;
	}

	.code-editor-textarea {
		width: 100%;
		box-sizing: border-box;
		background: transparent;
		color: var(--text-primary);
		font-family: inherit;
		font-size: inherit;
		line-height: 1.5;
		padding: 12px 14px;
		border: none;
		outline: none;
		resize: none;
		white-space: pre;
		overflow-x: auto;
	}
</style>

