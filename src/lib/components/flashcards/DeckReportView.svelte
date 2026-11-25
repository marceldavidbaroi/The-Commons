<script lang="ts">
	import type { DeckReport, DeckWithStats } from '$lib/types/flashcards';

	interface Props {
		deck: DeckWithStats | null;
		report: DeckReport | null;
		isLoading?: boolean;
	}

	let {
		deck,
		report,
		isLoading = false
	}: Props = $props();

	const total = $derived(report?.totalCards ?? deck?.totalCards ?? 0);
	const activeTotal = $derived(Math.max(0, total - (report?.suspendedCards ?? 0)));

	function pct(value: number, denom: number): string {
		if (!denom || denom <= 0) return '0%';
		return `${Math.round((value / denom) * 100)}%`;
	}

	const segments = $derived.by(() => {
		if (!report || total === 0) return [];
		return [
			{ key: 'mature', label: 'Mature (21d+)', count: report.matureCards, color: 'var(--success, #22c55e)' },
			{ key: 'young', label: 'Young (<21d)', count: report.youngCards, color: 'var(--primary)' },
			{ key: 'learning', label: 'Learning', count: report.learningCards, color: 'var(--warning, #f59e0b)' },
			{ key: 'new', label: 'New', count: report.newCards, color: 'var(--accent, #8CAFA3)' },
			{ key: 'suspended', label: 'Suspended', count: report.suspendedCards, color: 'var(--text-muted)' }
		];
	});
</script>

<div class="deck-report-wrap">
	<div class="report-header">
		<div class="report-title-group">
			<h3 class="report-heading">Deck Report</h3>
			<span class="report-tally">{total} total</span>
		</div>
	</div>

	{#if isLoading}
		<div class="report-loading">
			<div class="spinner-sm"></div>
			<span>Generating deck report...</span>
		</div>
	{:else if report}
		<!-- Primary KPI Tiles -->
		<div class="kpi-grid">
			<div class="kpi-card">
				<span class="kpi-label">Total Deck Cards</span>
				<span class="kpi-value">{report.totalCards}</span>
				<span class="kpi-sub">
					{activeTotal} active{report.suspendedCards > 0 ? ` · ${report.suspendedCards} suspended` : ''}
				</span>
			</div>

			<div class="kpi-card" class:highlight={report.dueNow > 0}>
				<span class="kpi-label">Due Now</span>
				<span class="kpi-value">{report.dueNow}</span>
				<span class="kpi-sub">
					{report.dueNow > 0 ? 'Ready for review' : 'All caught up'}
				</span>
			</div>

			<div class="kpi-card">
				<span class="kpi-label">New Cards</span>
				<span class="kpi-value">{report.newCards}</span>
				<span class="kpi-sub">
					Limit: {deck?.config?.new_cards_per_day ?? 20}/day
				</span>
			</div>

			<div class="kpi-card">
				<span class="kpi-label">Mature Mastery</span>
				<span class="kpi-value">{pct(report.matureCards, activeTotal)}</span>
				<span class="kpi-sub">
					{report.matureCards} of {activeTotal} active
				</span>
			</div>
		</div>

		<!-- State Breakdown -->
		<div class="report-panel">
			<div class="panel-header">
				<span class="panel-title">Card State Breakdown</span>
				<span class="panel-meta">{total} cards</span>
			</div>

			{#if total === 0}
				<p class="empty-note">No cards in this deck yet. Add cards or import a CSV to see distribution.</p>
			{:else}
				<div class="stacked-bar" role="img" aria-label="Card state distribution">
					{#each segments as seg (seg.key)}
						{#if seg.count > 0}
							<div
								class="bar-segment"
								style="width: {(seg.count / total) * 100}%; background-color: {seg.color};"
								title="{seg.label}: {seg.count} ({pct(seg.count, total)})"
							></div>
						{/if}
					{/each}
				</div>

				<div class="breakdown-grid">
					{#each segments as seg (seg.key)}
						<div class="breakdown-item">
							<span class="dot" style="background-color: {seg.color};"></span>
							<span class="item-label">{seg.label}</span>
							<span class="item-value">{seg.count}</span>
							<span class="item-pct">{pct(seg.count, total)}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Forecast & Health -->
		<div class="secondary-grid">
			<div class="report-panel">
				<div class="panel-header">
					<span class="panel-title">Review Forecast</span>
					<span class="panel-meta">Upcoming due</span>
				</div>
				<div class="metric-rows">
					<div class="metric-row">
						<span class="metric-label">Due now</span>
						<span class="metric-val">{report.dueNow}</span>
					</div>
					<div class="metric-row">
						<span class="metric-label">Due tomorrow</span>
						<span class="metric-val">{report.dueTomorrow}</span>
					</div>
					<div class="metric-row">
						<span class="metric-label">Due in next 7 days</span>
						<span class="metric-val">{report.dueNext7Days}</span>
					</div>
				</div>
			</div>

			<div class="report-panel">
				<div class="panel-header">
					<span class="panel-title">Deck Health & Limits</span>
					<span class="panel-meta">Configuration</span>
				</div>
				<div class="metric-rows">
					<div class="metric-row">
						<span class="metric-label">Leeches (&ge; {deck?.config?.leech_threshold ?? 8} lapses)</span>
						<span class="metric-val" class:warn={report.leeches > 0}>{report.leeches}</span>
					</div>
					<div class="metric-row">
						<span class="metric-label">Daily new / review cap</span>
						<span class="metric-val">
							{deck?.config?.new_cards_per_day ?? 20} / {deck?.config?.max_reviews_per_day ?? 200}
						</span>
					</div>
					<div class="metric-row">
						<span class="metric-label">Suspended cards</span>
						<span class="metric-val">{report.suspendedCards}</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.deck-report-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		margin-top: 0.75rem;
		padding-top: 1rem;
		border-top: 1px dashed var(--border-subtle);
	}

	.report-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.report-title-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.report-heading {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.report-tally {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		font-weight: 600;
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		padding: 0.0625rem 0.5rem;
		border-radius: var(--radius-full);
		border: 1px solid var(--border-subtle);
	}

	.report-loading {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--text-muted);
		padding: 1.5rem 0;
	}

	.spinner-sm {
		width: 14px;
		height: 14px;
		border: 2px solid var(--border-subtle);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.625rem;
	}

	@media (max-width: 768px) {
		.kpi-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.kpi-card {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 0.75rem 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.kpi-card.highlight {
		border-color: var(--primary);
	}

	.kpi-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.kpi-value {
		font-size: 1.375rem;
		font-weight: 700;
		font-family: var(--font-mono);
		color: var(--text-primary);
		line-height: 1.2;
	}

	.kpi-card.highlight .kpi-value {
		color: var(--primary);
	}

	.kpi-sub {
		font-size: 0.6875rem;
		color: var(--text-secondary);
	}

	.report-panel {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 0.875rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.panel-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.panel-meta {
		font-size: 0.6875rem;
		color: var(--text-muted);
		font-family: var(--font-mono);
	}

	.empty-note {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0;
	}

	.stacked-bar {
		display: flex;
		width: 100%;
		height: 10px;
		border-radius: var(--radius-full);
		overflow: hidden;
		background-color: var(--bg-tertiary);
		gap: 1px;
	}

	.bar-segment {
		height: 100%;
		min-width: 4px;
		transition: width 0.25s ease;
	}

	.breakdown-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.5rem 1rem;
	}

	.breakdown-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.item-label {
		color: var(--text-secondary);
		flex: 1;
	}

	.item-value {
		font-family: var(--font-mono);
		font-weight: 600;
		color: var(--text-primary);
	}

	.item-pct {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--text-muted);
		min-width: 2.25rem;
		text-align: right;
	}

	.secondary-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.625rem;
	}

	@media (max-width: 640px) {
		.secondary-grid {
			grid-template-columns: 1fr;
		}
	}

	.metric-rows {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.metric-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.75rem;
		padding-bottom: 0.375rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.metric-row:last-child {
		padding-bottom: 0;
		border-bottom: none;
	}

	.metric-label {
		color: var(--text-secondary);
	}

	.metric-val {
		font-family: var(--font-mono);
		font-weight: 600;
		color: var(--text-primary);
	}

	.metric-val.warn {
		color: var(--danger);
	}
</style>
