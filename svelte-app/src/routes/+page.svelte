<script lang="ts">
</script>

<svelte:head>
	<title>The Commons - Sovereign Sanctuary</title>
</svelte:head>

<div class="landing">
	<header class="landing-nav">
		<div class="brand">
			<span class="brand-badge">🏛️</span>
			<span class="brand-title">The Commons</span>
		</div>
		<div class="nav-links">
			<a href="/login" class="cta-btn">Enter Sanctuary</a>
		</div>
	</header>

	<main class="hero">
		<h1 class="hero-title">A Sovereign Sanctuary for Thought & Growth</h1>
		<p class="hero-desc">
			Inscribe personal diaries, align long-term goals, and cultivate your verified citizen passport in a private, high-performance ledger.
		</p>
		<div class="hero-actions">
			<a href="/app" class="primary-btn">Enter Sanctuary →</a>
			<a href="/login" class="secondary-btn">Sign in to Passport</a>
		</div>
	</main>
</div>

<style>
	.landing {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: radial-gradient(circle at 50% 0%, #1c2230 0%, var(--bg-primary) 70%);
	}

	.landing-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 3rem;
		max-width: 1400px;
		width: 100%;
		margin: 0 auto;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1.25rem;
		font-weight: 700;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}

	.nav-link {
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.nav-link:hover {
		color: var(--text-primary);
	}

	.cta-btn {
		background: var(--primary);
		color: #ffffff;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		font-size: 0.875rem;
		font-weight: 600;
		transition: background 0.15s ease;
	}

	.cta-btn:hover {
		background: var(--primary-hover);
	}

	.hero {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 4rem 1.5rem;
		max-width: 800px;
		margin: 0 auto;
		gap: 1.5rem;
	}

	.hero-title {
		font-size: 3rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.15;
		background: linear-gradient(180deg, #ffffff 40%, var(--text-secondary) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.hero-desc {
		font-size: 1.125rem;
		color: var(--text-secondary);
		max-width: 600px;
		line-height: 1.6;
	}

	.hero-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.primary-btn {
		background: var(--primary);
		color: #ffffff;
		padding: 0.75rem 1.5rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
		font-size: 0.9375rem;
	}

	.primary-btn:hover {
		background: var(--primary-hover);
	}

	.secondary-btn {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		padding: 0.75rem 1.5rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
		font-size: 0.9375rem;
	}

	.secondary-btn:hover {
		background: var(--bg-elevated);
	}
</style>
