<script lang="ts">
	import type { StudyQueueItem } from '$lib/types/flashcards';
	import { marked } from 'marked';

	let {
		card,
		isFlipped = false,
		onFlip
	}: {
		card: StudyQueueItem;
		isFlipped: boolean;
		onFlip: () => void;
	} = $props();

	function renderMarkdown(raw: string): string {
		if (!raw) return '';
		try {
			return marked.parse(raw, { async: false }) as string;
		} catch {
			return raw;
		}
	}

	let isSpeaking = $state(false);

	function speak(text: string, e?: MouseEvent) {
		if (e) {
			e.stopPropagation();
		}
		if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

		window.speechSynthesis.cancel();

		const utterance = new SpeechSynthesisUtterance(text);
		isSpeaking = true;
		utterance.onend = () => {
			isSpeaking = false;
		};
		utterance.onerror = () => {
			isSpeaking = false;
		};

		window.speechSynthesis.speak(utterance);
	}

	function openGoogleTranslate(text: string, e: MouseEvent) {
		e.stopPropagation();
		const url = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(text)}&op=translate`;
		window.open(url, '_blank', 'noopener,noreferrer');
	}

	// Resolve front & back field content dynamically based on schema / field conventions
	const content = $derived.by(() => {
		const fields = (card.note?.fields as Record<string, string>) || {};
		const schema = card.card_type_def?.fields_schema || [];
		const isReverse = card.card_type === 1;

		let frontText = '';
		let backText = '';
		const extraFields: Array<{ label: string; value: string }> = [];

		if (schema.length >= 2) {
			const promptKey = schema[0].label || schema[0].name || 'Front';
			const answerKey = schema[1].label || schema[1].name || 'Back';
			frontText = isReverse ? (fields[answerKey] || '') : (fields[promptKey] || '');
			backText = isReverse ? (fields[promptKey] || '') : (fields[answerKey] || '');

			// Any 3rd+ fields treated as contextual / extra fields on the answer side
			for (let i = 2; i < schema.length; i++) {
				const item = schema[i];
				const key = item.label || item.name || `Field ${i + 1}`;
				if (fields[key]) {
					extraFields.push({
						label: key,
						value: fields[key]
					});
				}
			}
		} else {
			// Fallback heuristics: common field names or values
			const fieldKeys = Object.keys(fields);
			const promptKey = fieldKeys.find(k => /^(prompt|question|front)$/i.test(k)) || fieldKeys[0];
			const answerKey = fieldKeys.find(k => /^(answer|back|solution)$/i.test(k)) || fieldKeys[1];

			const frontVal = promptKey ? fields[promptKey] : '';
			const backVal = answerKey ? fields[answerKey] : '';

			frontText = isReverse ? backVal : frontVal;
			backText = isReverse ? frontVal : backVal;

			fieldKeys.forEach(k => {
				if (k !== promptKey && k !== answerKey && fields[k]) {
					extraFields.push({ label: k, value: fields[k] });
				}
			});
		}

		return {
			frontText: frontText || 'Empty Prompt',
			backText: backText || 'Empty Answer',
			extraFields,
			tags: card.note?.tags || []
		};
	});

	function getQueueBadge(queueState: number): { text: string; class: string } {
		switch (queueState) {
			case 0:
				return { text: 'New', class: 'badge-new' };
			case 1:
				return { text: 'Learning', class: 'badge-learn' };
			case 2:
				return { text: 'Review', class: 'badge-review' };
			case 3:
				return { text: 'Relearning', class: 'badge-relearn' };
			default:
				return { text: 'Card', class: '' };
		}
	}

	const badge = $derived(getQueueBadge(card.queue_state));
</script>

<div
	class="card-viewer-container"
	role="region"
	aria-label="Flashcard Display"
>
	<!-- Fixed height container to prevent layout shifting between flip states -->
	<div class="card-canvas" onclick={onFlip} role="button" tabindex="0" onkeydown={(e) => {
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			onFlip();
		}
	}}>
		<!-- Header Meta Tier -->
		<div class="card-header">
			<div class="header-left">
				<span class="queue-badge {badge.class}">{badge.text}</span>
				{#if card.card_type === 1}
					<span class="reverse-badge" title="Reverse Card (Answer to Prompt)">Reverse</span>
				{/if}
				{#if card.card_type_def?.name}
					<span class="type-name">{card.card_type_def.name}</span>
				{/if}
			</div>

			<div class="header-right">
				{#if content.tags.length > 0}
					<div class="tag-list">
						{#each content.tags.slice(0, 3) as tag}
							<span class="tag-chip">#{tag}</span>
						{/each}
					</div>
				{/if}
				<span class="ease-info" title="Current Ease Factor">
					EF: {Number(card.ease_factor).toFixed(2)}
				</span>
			</div>
		</div>

		<!-- Card Content Body -->
		<div class="card-body">
			<!-- Question / Front Section -->
			<div class="section-prompt">
				<div class="section-heading">
					<div class="section-label">PROMPT</div>
					<button
						type="button"
						class="audio-btn"
						class:speaking={isSpeaking}
						onclick={(e) => speak(content.frontText, e)}
						title="Listen to pronunciation"
						aria-label="Pronounce prompt"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-speaker">
							<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
							<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
							<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
						</svg>
						<span>Listen</span>
					</button>
				</div>
				<div class="prompt-text">{content.frontText}</div>
			</div>

			<!-- Divider / Answer Section -->
			{#if isFlipped}
				<div class="card-divider" aria-hidden="true"></div>
				<div class="section-answer">
					<div class="section-heading">
						<div class="section-label">ANSWER</div>
						<div class="answer-actions">
							<button
								type="button"
								class="audio-btn"
								onclick={(e) => speak(content.backText, e)}
								title="Pronounce answer"
								aria-label="Pronounce answer"
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-speaker">
									<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
									<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
									<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
								</svg>
								<span>Listen</span>
							</button>

							<button
								type="button"
								class="translate-btn"
								onclick={(e) => openGoogleTranslate(content.frontText, e)}
								title="Look up in Google Translate"
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-translate">
									<path d="M5 8l6 6"></path>
									<path d="M4 14h8"></path>
									<path d="M2 5h12"></path>
									<path d="M7 2h1"></path>
									<path d="M22 22l-5-10-5 10"></path>
									<path d="M14 18h6"></path>
								</svg>
								<span>Google Translate</span>
							</button>
						</div>
					</div>
					<div class="answer-text markdown-content">
						{@html renderMarkdown(content.backText)}
					</div>

					{#if content.extraFields.length > 0}
						<div class="extra-fields-grid">
							{#each content.extraFields as field}
								<div class="extra-field-block">
									<span class="field-title">{field.label}:</span>
									<div class="field-body markdown-content">
										{@html renderMarkdown(field.value)}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else}
				<div class="flip-hint" aria-hidden="true">
					<span class="hint-key">Space</span> or <span class="hint-click">click</span> to reveal answer
				</div>
			{/if}
		</div>

		<!-- Footer Stats Sub-Tier -->
		<div class="card-footer">
			<span class="stat-pill">Interval: {card.interval_days}d</span>
			<span class="stat-pill">Reps: {card.reps}</span>
			{#if card.lapses > 0}
				<span class="stat-pill lapse-pill">Lapses: {card.lapses}</span>
			{/if}
		</div>
	</div>
</div>

<style>
	.card-viewer-container {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	/* Fixed minimum height container (min-h-[380px]) to eliminate layout shifts */
	.card-canvas {
		width: 100%;
		min-height: 380px;
		display: flex;
		flex-direction: column;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
		padding: 1.25rem 1.5rem;
		cursor: pointer;
		position: relative;
		user-select: text;
		outline: none;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.card-canvas:hover {
		border-color: var(--border-focus);
	}

	.card-canvas:focus-visible {
		border-color: var(--primary);
		box-shadow: 0 0 0 2px var(--primary);
	}

	/* Card Meta Header */
	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.6875rem;
		color: var(--text-muted);
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-subtle);
		gap: 0.5rem;
	}

	.header-left,
	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.queue-badge {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
	}

	.badge-new {
		background-color: #3b82f6;
		color: #ffffff;
	}

	.badge-learn,
	.badge-relearn {
		background-color: #f59e0b;
		color: #ffffff;
	}

	.badge-review {
		background-color: #10b981;
		color: #ffffff;
	}

	.reverse-badge {
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
	}

	.type-name {
		color: var(--text-secondary);
		font-weight: 500;
	}

	.tag-list {
		display: flex;
		gap: 0.25rem;
	}

	.tag-chip {
		background-color: var(--bg-tertiary);
		color: var(--text-muted);
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-sm);
		font-size: 0.625rem;
	}

	.ease-info {
		font-family: var(--font-mono);
		color: var(--text-muted);
	}

	/* Body & Content Elements */
	.card-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 1.5rem 0;
		gap: 1.25rem;
	}

	.section-prompt,
	.section-answer {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.answer-actions {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.audio-btn,
	.translate-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3125rem;
		background-color: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		border-radius: var(--radius-sm);
		padding: 0.1875rem 0.4375rem;
		font-size: 0.6875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.audio-btn:hover,
	.translate-btn:hover {
		background-color: var(--bg-primary);
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.audio-btn.speaking {
		color: var(--primary);
		border-color: var(--primary);
		background-color: var(--bg-primary);
	}

	.icon-speaker,
	.icon-translate {
		width: 12px;
		height: 12px;
	}

	.section-label {
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--text-muted);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.prompt-text {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.45;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.card-divider {
		height: 1px;
		background-color: var(--border-subtle);
		width: 100%;
		margin: 0.5rem 0;
	}

	.answer-text {
		font-size: 1rem;
		font-weight: 400;
		color: var(--text-primary);
		line-height: 1.5;
		word-break: break-word;
	}

	:global(.markdown-content p) {
		margin: 0 0 0.5rem 0;
	}

	:global(.markdown-content p:last-child) {
		margin-bottom: 0;
	}

	:global(.markdown-content h1, .markdown-content h2, .markdown-content h3, .markdown-content h4) {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0.5rem 0 0.25rem 0;
	}

	:global(.markdown-content h1:first-child, .markdown-content h2:first-child, .markdown-content h3:first-child) {
		margin-top: 0;
	}

	:global(.markdown-content ul, .markdown-content ol) {
		margin: 0.25rem 0 0.5rem 1.25rem;
		padding: 0;
	}

	:global(.markdown-content li) {
		margin-bottom: 0.25rem;
	}

	:global(.markdown-content code) {
		background: var(--bg-tertiary);
		padding: 0.125rem 0.25rem;
		border-radius: var(--radius-xs);
		font-family: var(--font-mono);
		font-size: 0.85em;
	}

	.extra-fields-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px dashed var(--border-subtle);
	}

	.extra-field-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.field-title {
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.field-body {
		color: var(--text-primary);
	}

	.flip-hint {
		margin-top: 1.5rem;
		font-size: 0.75rem;
		color: var(--text-muted);
		text-align: center;
		padding: 0.5rem;
		background-color: var(--bg-primary);
		border-radius: var(--radius-sm);
		border: 1px dashed var(--border-subtle);
	}

	.hint-key {
		display: inline-block;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		font-weight: 600;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		padding: 0.0625rem 0.375rem;
		border-radius: var(--radius-sm);
		color: var(--text-primary);
	}

	/* Footer Stats */
	.card-footer {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.6875rem;
		color: var(--text-muted);
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-subtle);
	}

	.stat-pill {
		font-family: var(--font-mono);
		background-color: var(--bg-tertiary);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
	}

	.lapse-pill {
		color: #ef4444;
		background-color: rgba(239, 68, 68, 0.1);
	}
</style>
