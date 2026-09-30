<script lang="ts">
	const features = [
		{
			title: 'Journals',
			description: 'Daily writing & entries',
			href: '/diaries',
			icon: 'journal'
		},
		{
			title: 'Goals',
			description: 'Milestones & horizons',
			href: '/goals',
			icon: 'goal'
		},
		{
			title: 'Tasks',
			description: 'Action items & checklists',
			href: '/tasks',
			icon: 'task'
		},
		{
			title: 'Settings',
			description: 'Preferences & themes',
			href: '/settings',
			icon: 'settings'
		}
	];
</script>

<svelte:head>
	<title>Home - The Commons</title>
</svelte:head>

<div class="minimal-home">
	<div class="features-grid">
		{#each features as feature}
			<a href={feature.href} class="feature-card">
				<div class="card-icon">
					{#if feature.icon === 'journal'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
							<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
							<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
						</svg>
					{:else if feature.icon === 'goal'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
							<circle cx="12" cy="12" r="10" />
							<circle cx="12" cy="12" r="6" />
							<circle cx="12" cy="12" r="2" />
						</svg>
					{:else if feature.icon === 'task'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
							<rect x="3" y="4" width="18" height="18" rx="2" />
							<path d="M9 12l2 2 4-4" />
						</svg>
					{:else if feature.icon === 'settings'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
							<circle cx="12" cy="12" r="3" />
							<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
						</svg>
					{/if}
				</div>
				<div class="card-text">
					<span class="card-title">{feature.title}</span>
					<span class="card-desc">{feature.description}</span>
				</div>
			</a>
		{/each}
	</div>
</div>

<style>
	.minimal-home {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 0;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 240px));
		gap: 0.875rem;
		width: 100%;
		max-width: 500px;
	}

	.feature-card {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 1rem 1.125rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
	}

	.feature-card:hover {
		background-color: var(--bg-tertiary);
		border-color: var(--border-focus);
		transform: translateY(-1px);
	}

	.card-icon {
		width: 20px;
		height: 20px;
		color: var(--primary);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.card-icon svg {
		width: 100%;
		height: 100%;
	}

	.card-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.card-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.card-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (max-width: 540px) {
		.features-grid {
			grid-template-columns: 1fr;
			max-width: 100%;
		}

		.minimal-home {
			padding: 1.5rem 0;
		}
	}
</style>
