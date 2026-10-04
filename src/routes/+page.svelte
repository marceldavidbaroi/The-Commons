<script lang="ts">
	import CommonsLogo from '$lib/components/brand/CommonsLogo.svelte';
	import ThemeSelector from '$lib/components/ThemeSelector.svelte';

	const features = [
		{
			title: 'Daily Journals',
			tag: 'Reflection',
			desc: 'A serene manuscript ledger for mindful journaling, daily reflections, and personal entries.'
		},
		{
			title: 'Long-term Goals',
			tag: 'Horizons',
			desc: 'Set quarterly milestones, track key horizons, and align your daily actions with high-level objectives.'
		},
		{
			title: 'Task Ledgers',
			tag: 'Execution',
			desc: 'High-density, structured checklists with subtasks, dependencies, parent hierarchies, and custom tags.'
		},
		{
			title: 'Tag Architecture',
			tag: 'Organization',
			desc: 'Organize your thoughts with multi-dimensional categories, hierarchical tags, and colored indicators.'
		}
	];
</script>

<svelte:head>
	<title>The Commons - Personal Workspace & Archival Journal</title>
</svelte:head>

<div class="landing">
	<!-- Top Editorial Header -->
	<header class="landing-nav">
		<div class="nav-inner">
			<div class="brand">
				<CommonsLogo variant="horizontal" size="sm" showFolio={true} subtitle="Workspace & Journal" />
			</div>
			<div class="nav-actions">
				<ThemeSelector />
				<a href="/login" class="login-btn">Sign In</a>
				<a href="/home" class="cta-btn">Open App →</a>
			</div>
		</div>
	</header>

	<!-- Main Content Canvas -->
	<main class="landing-main">
		<!-- Hero Section -->
		<section class="hero-section">
			<div class="hero-kicker">
				<span class="kicker-pill">Editorial Workspace</span>
				<span class="kicker-divider">•</span>
				<span class="kicker-text">Quiet Focus for Deep Thinkers</span>
			</div>

			<h1 class="hero-title">
				A quiet space for thought,<br class="hide-mobile" />
				reflection, and execution.
			</h1>

			<p class="hero-desc">
				Capture daily journals, map long-term milestones, and organize tasks in a clean, high-performance workspace designed for clarity.
			</p>

			<div class="hero-actions">
				<a href="/login" class="primary-btn">
					Get Started Free
					<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
						<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</a>
				<a href="/dev/design-system" class="secondary-btn">
					Explore Design System
				</a>
			</div>
		</section>

		<!-- Hairline Editorial Rule -->
		<div class="editorial-divider">
			<div class="divider-line"></div>
			<span class="divider-mark">§</span>
			<div class="divider-line"></div>
		</div>

		<!-- Feature Highlights Grid -->
		<section class="features-section">
			<div class="section-intro">
				<span class="section-kicker">Core Capabilities</span>
				<h2 class="section-title">Built with intention and craft</h2>
			</div>

			<div class="features-grid">
				{#each features as feature}
					<div class="feature-tile">
						<div class="tile-header">
							<span class="tile-tag">{feature.tag}</span>
						</div>
						<h3 class="tile-title">{feature.title}</h3>
						<p class="tile-desc">{feature.desc}</p>
					</div>
				{/each}
			</div>
		</section>

		<!-- Bottom Call to Action Card -->
		<section class="cta-section">
			<div class="cta-banner">
				<div class="cta-content">
					<h3 class="cta-heading">Ready to cultivate your personal archive?</h3>
					<p class="cta-sub">Sign in with your Google account to get started in seconds.</p>
				</div>
				<a href="/login" class="primary-btn">
					Enter Workspace →
				</a>
			</div>
		</section>
	</main>

	<!-- Minimal Footer -->
	<footer class="landing-footer">
		<div class="footer-inner">
			<div class="footer-left">
				<CommonsLogo variant="mark" size="xs" />
				<span class="footer-copy">The Commons &copy; 2026. All rights reserved.</span>
			</div>
			<div class="footer-links">
				<a href="/dev/design-system" class="footer-link">Design System</a>
				<a href="/login" class="footer-link">Sign In</a>
				<a href="/home" class="footer-link">Dashboard</a>
			</div>
		</div>
	</footer>
</div>

<style>
	.landing {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: var(--bg-primary);
		color: var(--text-primary);
	}

	/* Navigation Bar */
	.landing-nav {
		position: sticky;
		top: 0;
		z-index: 50;
		height: 52px;
		background-color: var(--bg-secondary);
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
	}

	.nav-inner {
		width: 100%;
		max-width: 1024px;
		margin: 0 auto;
		padding: 0 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.brand {
		display: flex;
		align-items: center;
	}

	.nav-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.login-btn {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-secondary);
		padding: 0.375rem 0.75rem;
		border-radius: var(--radius-sm);
		transition: color 0.15s ease, background-color 0.15s ease;
	}

	.login-btn:hover {
		color: var(--text-primary);
		background-color: var(--bg-tertiary);
	}

	.cta-btn {
		background-color: var(--primary);
		color: var(--primary-foreground, #ffffff);
		padding: 0.375rem 0.875rem;
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		font-weight: 600;
		transition: opacity 0.15s ease, transform 0.1s ease;
	}

	.cta-btn:hover {
		opacity: 0.92;
		transform: translateY(-1px);
	}

	/* Main Canvas */
	.landing-main {
		flex: 1;
		width: 100%;
		max-width: 1024px;
		margin: 0 auto;
		padding: 3.5rem 1.25rem 4rem;
		display: flex;
		flex-direction: column;
		gap: 3.5rem;
		box-sizing: border-box;
	}

	/* Hero Section */
	.hero-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 1.5rem 0 1rem;
		gap: 1.25rem;
		max-width: 720px;
		margin: 0 auto;
	}

	.hero-kicker {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.kicker-pill {
		background-color: var(--bg-tertiary);
		color: var(--primary);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-full);
		border: 1px solid var(--border-subtle);
		font-size: 0.6875rem;
	}

	.kicker-divider {
		color: var(--text-muted);
		opacity: 0.6;
	}

	.hero-title {
		font-family: var(--font-serif);
		font-size: 2.75rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 1.18;
		color: var(--text-primary);
		margin: 0;
	}

	.hero-desc {
		font-size: 1.0625rem;
		color: var(--text-secondary);
		line-height: 1.6;
		max-width: 580px;
		margin: 0;
	}

	.hero-actions {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		margin-top: 0.75rem;
	}

	.primary-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background-color: var(--primary);
		color: var(--primary-foreground, #ffffff);
		padding: 0.625rem 1.25rem;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-weight: 600;
		transition: opacity 0.15s ease, transform 0.1s ease;
	}

	.primary-btn:hover {
		opacity: 0.92;
		transform: translateY(-1px);
	}

	.secondary-btn {
		display: inline-flex;
		align-items: center;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		padding: 0.625rem 1.125rem;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-weight: 500;
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}

	.secondary-btn:hover {
		background-color: var(--bg-tertiary);
		border-color: var(--border-focus);
	}

	/* Hairline Editorial Rule */
	.editorial-divider {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		opacity: 0.7;
	}

	.divider-line {
		flex: 1;
		height: 1px;
		background-color: var(--border-subtle);
	}

	.divider-mark {
		font-family: var(--font-serif);
		font-size: 0.875rem;
		color: var(--text-muted);
	}

	/* Features Section */
	.features-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section-intro {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.section-kicker {
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 600;
		color: var(--primary);
	}

	.section-title {
		font-family: var(--font-serif);
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.feature-tile {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1.25rem 1.375rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		transition: border-color 0.15s ease, background-color 0.15s ease;
	}

	.feature-tile:hover {
		border-color: var(--border-focus);
		background-color: var(--bg-tertiary);
	}

	.tile-header {
		display: flex;
		align-items: center;
	}

	.tile-tag {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.tile-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.tile-desc {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.55;
	}

	/* Call to Action Section */
	.cta-section {
		width: 100%;
	}

	.cta-banner {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1.75rem 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
	}

	.cta-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.cta-heading {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.cta-sub {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	/* Footer */
	.landing-footer {
		border-top: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
		padding: 1.25rem 0;
	}

	.footer-inner {
		width: 100%;
		max-width: 1024px;
		margin: 0 auto;
		padding: 0 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		box-sizing: border-box;
	}

	.footer-left {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.footer-copy {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.footer-links {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}

	.footer-link {
		font-size: 0.75rem;
		color: var(--text-secondary);
		transition: color 0.15s ease;
	}

	.footer-link:hover {
		color: var(--text-primary);
	}

	@media (max-width: 768px) {
		.hero-title {
			font-size: 2.125rem;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}

		.cta-banner {
			flex-direction: column;
			align-items: flex-start;
			padding: 1.5rem;
		}

		.hide-mobile {
			display: none;
		}
	}

	@media (max-width: 540px) {
		.hero-actions {
			flex-direction: column;
			width: 100%;
		}

		.primary-btn, .secondary-btn {
			width: 100%;
			justify-content: center;
		}

		.footer-inner {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}
	}
</style>

