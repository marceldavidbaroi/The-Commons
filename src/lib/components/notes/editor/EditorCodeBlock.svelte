<script lang="ts">
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
		<span class="code-lang-tag">{language || 'plaintext'}</span>
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
		background: var(--bg-tertiary, #1e1e24);
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
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
		background: rgba(0, 0, 0, 0.2);
		border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
		user-select: none;
	}

	.code-lang-tag {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-muted);
		font-weight: 600;
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
		background: rgba(255, 255, 255, 0.08);
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

