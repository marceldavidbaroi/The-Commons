<script lang="ts">
	import CommonsLogo from '$lib/components/brand/CommonsLogo.svelte';

	let { children } = $props();
</script>

<div class="auth-viewport">
	<main class="auth-container">
		<header class="auth-brand">
			<CommonsLogo
				variant="horizontal"
				size="md"
				href="/"
			/>
		</header>

		<section class="auth-content">
			{@render children()}
		</section>

		<footer class="auth-footer">
			<p>&copy; {new Date().getFullYear()} The Commons</p>
		</footer>
	</main>
</div>

<style>
	.auth-viewport {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		background-color: var(--bg-primary);
	}

	.auth-container {
		width: 100%;
		max-width: 360px;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.auth-brand {
		display: flex;
		justify-content: center;
	}

	.auth-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.auth-footer {
		text-align: center;
		font-size: 0.8125rem;
		color: var(--text-muted);
	}
</style>
