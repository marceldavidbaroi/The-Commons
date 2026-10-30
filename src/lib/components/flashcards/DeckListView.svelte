<script lang="ts">
	import type { DeckWithStats } from "$lib/types/flashcards";

	let {
		decks,
		variant = "list",
		onStudy,
		onSelectDeck,
		onEditDeck,
		onDeleteDeck,
		onPreviewDeck,
		onAddSubdeck,
		onAddCard,
		onUploadCsv,
	}: {
		decks: DeckWithStats[];
		variant?: "list" | "grid";
		onStudy: (deck: DeckWithStats) => void;
		onSelectDeck?: (deck: DeckWithStats) => void;
		onEditDeck?: (deck: DeckWithStats) => void;
		onDeleteDeck?: (deck: DeckWithStats) => void;
		onPreviewDeck?: (deck: DeckWithStats) => void;
		onAddSubdeck?: (deck: DeckWithStats) => void;
		onAddCard?: (deck: DeckWithStats) => void;
		onUploadCsv?: (deck: DeckWithStats) => void;
	} = $props();

	let activeMenuDeckId = $state<number | string | null>(null);

	function toggleMenu(deckId: number | string, e: MouseEvent) {
		e.stopPropagation();
		if (activeMenuDeckId === deckId) {
			activeMenuDeckId = null;
		} else {
			activeMenuDeckId = deckId;
		}
	}

	function closeMenu() {
		activeMenuDeckId = null;
	}
</script>

<svelte:window onclick={closeMenu} />

<div
	class="deck-list-container"
	class:grid-mode={variant === "grid"}
	role="list"
>
	{#each decks as deck (deck.id)}
		{#if variant === "grid"}
			<div class="deck-card-wrap">
				<button
					type="button"
					class="deck-card"
					role="listitem"
					onclick={() =>
						onSelectDeck ? onSelectDeck(deck) : onStudy(deck)}
				>
					<span class="deck-folder-icon" aria-hidden="true">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
							/>
						</svg>
					</span>
					<span class="deck-name">{deck.name}</span>
				</button>

				<button
					type="button"
					class="btn-deck-trigger"
					aria-label={`Open menu for ${deck.name}`}
					aria-haspopup="menu"
					aria-expanded={activeMenuDeckId === deck.id}
					onclick={(e) => toggleMenu(deck.id, e)}
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="12" cy="12" r="1.25" />
						<circle cx="19" cy="12" r="1.25" />
						<circle cx="5" cy="12" r="1.25" />
					</svg>
				</button>

				{#if activeMenuDeckId === deck.id}
					<div
						class="deck-menu-dropdown"
						role="menu"
						onclick={(e) => e.stopPropagation()}
					>
						{#if onEditDeck}
							<button
								type="button"
								class="deck-menu-item"
								role="menuitem"
								onclick={() => {
									closeMenu();
									onEditDeck?.(deck);
								}}
							>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
									/>
									<path
										d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
									/>
								</svg>
								<span>Edit</span>
							</button>
						{/if}

						<button
							type="button"
							class="deck-menu-item"
							role="menuitem"
							onclick={() => {
								closeMenu();
								if (onPreviewDeck) {
									onPreviewDeck(deck);
								} else if (onSelectDeck) {
									onSelectDeck(deck);
								} else {
									onStudy(deck);
								}
							}}
						>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
								/>
								<circle cx="12" cy="12" r="3" />
							</svg>
							<span>Preview</span>
						</button>

						{#if onAddCard || onAddSubdeck}
							<div class="deck-menu-divider"></div>
							{#if onAddCard}
								<button
									type="button"
									class="deck-menu-item"
									role="menuitem"
									onclick={() => {
										closeMenu();
										onAddCard?.(deck);
									}}
								>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<rect
											x="3"
											y="5"
											width="18"
											height="14"
											rx="2"
										/>
										<line x1="12" y1="9" x2="12" y2="15" />
										<line x1="9" y1="12" x2="15" y2="12" />
									</svg>
									<span>Add Card</span>
								</button>
							{/if}
							{#if onAddSubdeck}
								<button
									type="button"
									class="deck-menu-item"
									role="menuitem"
									onclick={() => {
										closeMenu();
										onAddSubdeck?.(deck);
									}}
								>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
										/>
										<line x1="12" y1="11" x2="12" y2="17" />
										<line x1="9" y1="14" x2="15" y2="14" />
									</svg>
									<span>Add Subdeck</span>
								</button>
							{/if}
							{#if onUploadCsv}
								<button
									type="button"
									class="deck-menu-item"
									role="menuitem"
									onclick={() => {
										closeMenu();
										onUploadCsv?.(deck);
									}}
								>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
										/>
										<polyline points="17 8 12 3 7 8" />
										<line x1="12" y1="3" x2="12" y2="15" />
									</svg>
									<span>Upload CSV</span>
								</button>
							{/if}
						{/if}

						{#if onDeleteDeck}
							<div class="deck-menu-divider"></div>
							<button
								type="button"
								class="deck-menu-item danger"
								role="menuitem"
								onclick={() => {
									closeMenu();
									if (onEditDeck) {
										onEditDeck(deck);
									} else {
										onDeleteDeck?.(deck);
									}
								}}
							>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<polyline points="3 6 5 6 21 6" />
									<path
										d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
									/>
								</svg>
								<span>Delete</span>
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{:else}
			<div
				class="deck-row"
				style:padding-left={`${Math.max(0.75, (deck.depth || 0) * 1.5 + 0.75)}rem`}
				role="listitem"
			>
				{#if (deck.depth || 0) > 0}
					<div class="tree-branch-indicator" aria-hidden="true">
						<svg
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
						>
							<path d="M4 0v9a3 3 0 0 0 3 3h6" />
						</svg>
					</div>
				{/if}

				<div class="deck-icon" aria-hidden="true">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
					>
						<rect x="3" y="4" width="18" height="16" rx="2" />
						<line x1="7" y1="8" x2="17" y2="8" />
						<line x1="7" y1="12" x2="13" y2="12" />
					</svg>
				</div>

				<div class="deck-info">
					<div class="deck-title-row">
						<span class="deck-name">{deck.name}</span>
						{#if deck.description}
							<span class="deck-desc">{deck.description}</span>
						{/if}
					</div>
					<div class="deck-meta">
						<span class="meta-item">
							<span class="meta-label">Total:</span>
							{deck.totalCards}
						</span>
						<span class="meta-separator">•</span>
						<span class="meta-item">
							<span class="meta-label">New:</span>
							<span class="badge-new">{deck.newCards}</span>
						</span>
						<span class="meta-separator">•</span>
						<span class="meta-item">
							<span class="meta-label">Due:</span>
							<span
								class="badge-due"
								class:has-due={deck.dueCards > 0}
								>{deck.dueCards}</span
							>
						</span>
						{#if deck.config?.new_cards_per_day}
							<span class="meta-separator">•</span>
							<span class="meta-limit">
								Limit: {deck.config.new_cards_per_day} new / {deck
									.config.max_reviews_per_day || 200} rev
							</span>
						{/if}
					</div>
				</div>

				<div class="deck-actions">
					{#if onUploadCsv}
						<button
							type="button"
							class="btn-edit"
							title="Upload CSV to Deck"
							onclick={() => onUploadCsv?.(deck)}
						>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
								/>
								<polyline points="17 8 12 3 7 8" />
								<line x1="12" y1="3" x2="12" y2="15" />
							</svg>
						</button>
					{/if}
					{#if onEditDeck}
						<button
							type="button"
							class="btn-edit"
							title="Edit Deck Configuration"
							onclick={() => onEditDeck?.(deck)}
						>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
								/>
								<path
									d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
								/>
							</svg>
						</button>
					{/if}
					<a
						href={`/flashcards/${deck.id}/study`}
						class="btn-study"
						class:highlight={deck.dueCards > 0 || deck.newCards > 0}
						onclick={(e) => {
							onStudy(deck);
						}}
					>
						<svg
							class="btn-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<polygon points="5 3 19 12 5 21 5 3" />
						</svg>
						<span>Study Now</span>
					</a>
				</div>
			</div>
		{/if}
	{/each}
</div>

<style>
	.deck-list-container {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		width: 100%;
	}

	.deck-row {
		display: flex;
		align-items: center;
		padding: 0.5rem 0.75rem;
		min-height: 44px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		gap: 0.75rem;
		transition:
			border-color 0.15s ease,
			background-color 0.15s ease;
	}

	.deck-row:hover {
		border-color: var(--border-focus);
	}

	.tree-branch-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		color: var(--text-muted);
		flex-shrink: 0;
		opacity: 0.7;
	}

	.tree-branch-indicator svg {
		width: 14px;
		height: 14px;
	}

	.deck-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.deck-icon svg {
		width: 16px;
		height: 16px;
	}

	.deck-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.deck-title-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
	}

	.deck-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.deck-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 300px;
	}

	.deck-meta {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.6875rem;
		color: var(--text-secondary);
	}

	.meta-item {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.meta-label {
		color: var(--text-muted);
	}

	.meta-separator {
		color: var(--border-subtle);
		font-size: 0.5rem;
	}

	.meta-limit {
		color: var(--text-muted);
		font-size: 0.6875rem;
	}

	.badge-new {
		font-weight: 600;
		color: var(--primary);
	}

	.badge-due {
		font-weight: 600;
		color: var(--text-secondary);
	}

	.badge-due.has-due {
		color: #d97706;
	}

	.deck-actions {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.btn-edit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-primary);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-edit:hover {
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.btn-edit svg {
		width: 13px;
		height: 13px;
	}

	.btn-study {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.3125rem 0.625rem;
		font-size: 0.6875rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-primary);
		color: var(--text-secondary);
		text-decoration: none;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.btn-study:hover {
		border-color: var(--primary);
		color: var(--text-primary);
	}

	.btn-study.highlight {
		background-color: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.btn-study.highlight:hover {
		background-color: var(--primary-hover);
	}

	.btn-icon {
		width: 11px;
		height: 11px;
	}

	/* Small Cards Grid Mode */
	.deck-list-container.grid-mode {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.625rem;
	}

	.deck-card-wrap {
		position: relative;
		display: flex;
		align-items: stretch;
		width: 100%;
	}

	.deck-card {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
		padding: 0.75rem 4.5rem 0.75rem 0.875rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: var(--text-primary);
		font-family: inherit;
		text-align: left;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.deck-card:hover {
		border-color: var(--primary);
		background-color: var(--bg-primary);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
	}

	.deck-folder-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.deck-card:hover .deck-folder-icon {
		color: var(--primary);
	}

	.deck-folder-icon svg {
		width: 100%;
		height: 100%;
	}

	.deck-card .deck-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.deck-card-actions {
		position: absolute;
		right: 6px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.btn-card-action {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: var(--radius-xs, 3px);
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
		opacity: 0.5;
	}

	.deck-card-wrap:hover .btn-card-action {
		opacity: 1;
	}

	.btn-card-action:hover {
		background-color: var(--bg-tertiary);
		border-color: var(--border-subtle);
		color: var(--text-primary);
	}

	.btn-card-action svg {
		width: 13px;
		height: 13px;
	}

	.btn-deck-trigger {
		position: absolute;
		right: 6px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: var(--radius-xs, 4px);
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
		opacity: 0.6;
	}

	.deck-card-wrap:hover .btn-deck-trigger,
	.btn-deck-trigger[aria-expanded="true"] {
		opacity: 1;
	}

	.btn-deck-trigger:hover,
	.btn-deck-trigger[aria-expanded="true"] {
		background-color: var(--bg-tertiary);
		border-color: var(--border-subtle);
		color: var(--text-primary);
	}

	.btn-deck-trigger svg {
		width: 14px;
		height: 14px;
	}

	.deck-menu-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm, 6px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 50;
		min-width: 140px;
		padding: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.deck-menu-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		border-radius: var(--radius-xs, 4px);
		cursor: pointer;
		text-align: left;
		width: 100%;
		font-family: inherit;
		transition:
			background-color 0.12s ease,
			color 0.12s ease;
	}

	.deck-menu-item:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.deck-menu-item svg {
		width: 13px;
		height: 13px;
		flex-shrink: 0;
	}

	.deck-menu-item.danger {
		color: var(--danger, #ef4444);
	}

	.deck-menu-item.danger:hover {
		background: color-mix(in srgb, var(--danger, #ef4444) 12%, transparent);
		color: var(--danger, #ef4444);
	}

	.deck-menu-divider {
		height: 1px;
		background: var(--border-subtle);
		margin: 0.1875rem 0;
	}
</style>
