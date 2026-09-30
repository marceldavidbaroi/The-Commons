<svelte:head>
	<title>Sanctuary Dashboard - The Commons</title>
</svelte:head>

<div class="dashboard-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Sanctuary Overview</h1>
			<p class="page-subtitle">Welcome back, citizen. Here is your ledger summary for today.</p>
		</div>
		<div class="header-actions">
			<a href="/app/my-diaries" class="btn btn-secondary">Open Diary</a>
			<a href="/app/goals" class="btn btn-primary">+ Inscribe Goal</a>
		</div>
	</header>

	<div class="stats-grid">
		<div class="stat-card">
			<span class="stat-label">Active Goals</span>
			<span class="stat-value">12</span>
			<span class="stat-trend positive">+2 this week</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">Diary Leaves</span>
			<span class="stat-value">48</span>
			<span class="stat-trend neutral">Last written today</span>
		</div>
		<div class="stat-card">
			<span class="stat-label">Citizen Credibility</span>
			<span class="stat-value">94%</span>
			<span class="stat-trend positive">Tier II Verified</span>
		</div>
	</div>
</div>

<style>
	.dashboard-page {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	.page-subtitle {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-top: 0.25rem;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.btn {
		padding: 0.5rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.btn-primary:hover {
		background: var(--primary-hover);
	}

	.btn-secondary {
		background: var(--bg-surface);
		border-color: var(--border-subtle);
		color: var(--text-primary);
	}

	.btn-secondary:hover {
		background: var(--bg-elevated);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.stat-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.stat-trend {
		font-size: 0.75rem;
		font-weight: 500;
	}

	.stat-trend.positive {
		color: var(--success);
	}

	.stat-trend.neutral {
		color: var(--text-secondary);
	}
</style>
