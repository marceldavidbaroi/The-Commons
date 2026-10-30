<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { flashcardsStore } from '$lib/state/flashcards.svelte';
	import type { CardTypeRecord, FieldSchemaItem } from '$lib/types/flashcards';
	import CardTypeListView from '$lib/components/flashcards/CardTypeListView.svelte';
	import CardTypeModal from '$lib/components/flashcards/CardTypeModal.svelte';

	let isModalOpen = $state(false);
	let editingType = $state<CardTypeRecord | null>(null);

	onMount(() => {
		if (flashcardsStore.cardTypes.length === 0) {
			flashcardsStore.loadHubData();
		}
	});

	function handleCreate() {
		editingType = null;
		isModalOpen = true;
	}

	function handleSelectType(typeRecord: CardTypeRecord) {
		editingType = typeRecord;
		isModalOpen = true;
	}

	async function handleSaveType(data: {
		name: string;
		fields_schema: FieldSchemaItem[];
		has_reverse: boolean;
	}) {
		if (editingType) {
			await flashcardsStore.updateCardType(editingType.id, data);
		} else {
			await flashcardsStore.createCardType(data);
		}
	}

	async function handleDeleteType(id: number | string) {
		await flashcardsStore.deleteCardType(id);
	}
</script>

<svelte:head>
	<title>Card Types — The Commons</title>
</svelte:head>

<div class="card-types-page">
	<!-- Tier 1 Header (~40px) -->
	<header class="tier-header">
		<div class="header-left">
			<a href="/flashcards" class="back-link" title="Back to Flashcards">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="19" y1="12" x2="5" y2="12" />
					<polyline points="12 19 5 12 12 5" />
				</svg>
			</a>
			<h1 class="page-title">Card Types</h1>
			<span class="count-badge">{flashcardsStore.cardTypes.length}</span>
		</div>

		<div class="header-actions">
			<button
				type="button"
				class="btn btn-primary"
				onclick={handleCreate}
			>
				<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				<span>Create Type</span>
			</button>
		</div>
	</header>

	<!-- Main Canvas -->
	<main class="content-container">
		{#if flashcardsStore.isLoading && flashcardsStore.cardTypes.length === 0}
			<div class="loading-state">
				<div class="spinner"></div>
				<span>Loading card types...</span>
			</div>
		{:else if flashcardsStore.cardTypes.length === 0}
			<div class="empty-state">
				<div class="empty-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
					</svg>
				</div>
				<h3 class="empty-title">No card types yet</h3>
				<p class="empty-desc">
					Create a schema to define custom fields for your flashcards.
				</p>
				<button
					type="button"
					class="btn btn-primary compact"
					onclick={handleCreate}
				>
					Create Type
				</button>
			</div>
		{:else}
			<CardTypeListView
				cardTypes={flashcardsStore.cardTypes}
				variant="grid"
				onSelectType={handleSelectType}
			/>
		{/if}
	</main>

	<!-- Edit / Create Modal with Confirmation Delete -->
	<CardTypeModal
		isOpen={isModalOpen}
		initialCardType={editingType}
		onClose={() => {
			isModalOpen = false;
			editingType = null;
		}}
		onSave={handleSaveType}
		onDelete={handleDeleteType}
	/>
</div>

<style>
	.card-types-page {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
	}

	.tier-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 40px;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
		color: var(--text-muted);
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.back-link:hover {
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.back-link svg {
		width: 15px;
		height: 15px;
	}

	.page-title {
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		line-height: 1;
		margin: 0;
	}

	.count-badge {
		font-size: 0.75rem;
		font-weight: 600;
		font-family: var(--font-mono);
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-full);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}



	.content-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		background-color: var(--bg-secondary);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-md);
		text-align: center;
		gap: 0.625rem;
	}

	.loading-state {
		font-size: 0.8125rem;
		color: var(--text-muted);
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--border-subtle);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty-icon {
		width: 36px;
		height: 36px;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.empty-icon svg {
		width: 100%;
		height: 100%;
	}

	.empty-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.empty-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		max-width: 340px;
		margin: 0;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.4375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
		text-decoration: none;
	}

	.btn.compact {
		padding: 0.3125rem 0.625rem;
	}

	.btn-icon {
		width: 14px;
		height: 14px;
	}

	.btn-primary {
		background-color: var(--primary);
		color: var(--primary-foreground);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--primary-hover);
	}

	.btn-secondary {
		background-color: var(--bg-tertiary);
		border-color: var(--border-subtle);
		color: var(--text-primary);
	}

	.btn-secondary:hover {
		background-color: var(--bg-secondary);
		border-color: var(--border-focus);
	}
</style>
