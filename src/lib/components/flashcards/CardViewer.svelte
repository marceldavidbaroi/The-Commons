<script lang="ts">
	import type { StudyQueueItem } from '$lib/types/flashcards';

	let {
		card,
		isFlipped = false,
		onFlip
	}: {
		card: StudyQueueItem;
		isFlipped: boolean;
		onFlip: () => void;
	} = $props();

	// Resolve front & back field content dynamically based on schema / field conventions
	const content = $derived.by(() => {
		const fields = (card.note?.fields as Record<string, string>) || {};
		const schema = card.card_type_def?.fields_schema || [];
		const isReverse = card.card_type === 1;

		let frontText = '';
		let backText = '';
		const extraFields: Array<{ label: string; value: string }> = [];

		if (schema.length >= 2) {
			const promptKey = schema[0].name;
			const answerKey = schema[1].name;
			frontText = isReverse ? (fields[answerKey] || '') : (fields[promptKey] || '');
			backText = isReverse ? (fields[promptKey] || '') : (fields[answerKey] || '');

			// Any 3rd+ fields treated as contextual / extra fields on the answer side
			for (let i = 2; i < schema.length; i++) {
				const item = schema[i];
				if (fields[item.name]) {
					extraFields.push({
						label: item.label || item.name,
						value: fields[item.name]
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
				<div class="section-label">PROMPT</div>
				<div class="prompt-text">{content.frontText}</div>
			</div>

			<!-- Divider / Answer Section -->
			{#if isFlipped}
				<div class="card-divider" aria-hidden="true"></div>
				<div class="section-answer">
					<div class="section-label">ANSWER</div>
					<div class="answer-text">{content.backText}</div>

					{#if content.extraFields.length > 0}
						<div class="extra-fields-grid">
							{#each content.extraFields as field}
								<div class="extra-field-block">
									<span class="field-title">{field.label}:</span>
									<span class="field-body">{field.value}</span>
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
		font-size: 1.125rem;
		font-weight: 500;
		color: var(--text-primary);
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.extra-fields-grid {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px dashed var(--border-subtle);
	}

	.extra-field-block {
		display: flex;
		gap: 0.375rem;
		font-size: 0.8125rem;
		line-height: 1.4;
	}

	.field-title {
		font-weight: 600;
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
