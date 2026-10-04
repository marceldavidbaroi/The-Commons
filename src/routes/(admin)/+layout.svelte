<script lang="ts">
	import { onMount } from 'svelte';
	import { getSupabaseClient } from '$lib/supabase';
	import CommonsLogo from '$lib/components/brand/CommonsLogo.svelte';
	import ThemeSelector from '$lib/components/ThemeSelector.svelte';

	let { children } = $props();

	const supabase = getSupabaseClient();
	let isLoggingOut = $state(false);
	let userEmail = $state<string | null>(null);

	onMount(async () => {
		try {
			const { data } = await supabase.auth.getUser();
			if (data?.user?.email) {
				userEmail = data.user.email;
			}
		} catch (err) {
			console.error('Error fetching admin user', err);
		}
	});

	async function handleSignOut() {
		isLoggingOut = true;
		try {
			await supabase.auth.signOut();
			if (typeof window !== 'undefined') {
				window.location.href = '/admin/login';
			}
		} catch (err) {
			console.error('Error signing out', err);
			isLoggingOut = false;
		}
	}
</script>

<div class="admin-shell">
	<!-- Dedicated Admin Header: No member navigation items -->
	<header class="admin-header">
		<div class="header-inner">
			<div class="header-brand-group">
				<CommonsLogo variant="mark" size="sm" href="/admin" />
				<span class="brand-title">The Commons</span>
				<span class="admin-tag">Admin Console</span>
			</div>

			<div class="header-actions">
				<ThemeSelector />
				{#if userEmail}
					<span class="user-email-badge" title={userEmail}>{userEmail}</span>
				{/if}
				<button
					type="button"
					class="btn-logout"
					onclick={handleSignOut}
					disabled={isLoggingOut}
					title="Sign Out"
				>
					<svg class="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
						<polyline points="16 17 21 12 16 7" />
						<line x1="21" y1="12" x2="9" y2="12" />
					</svg>
					<span>{isLoggingOut ? '...' : 'Log out'}</span>
				</button>
			</div>
		</div>
	</header>

	<main class="admin-main">
		<div class="content-wrapper">
			{@render children()}
		</div>
	</main>
</div>

<style>
	.admin-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: var(--bg-primary);
	}

	.admin-header {
		position: sticky;
		top: 0;
		z-index: 50;
		height: 44px;
		background-color: var(--bg-secondary);
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
	}

	.header-inner {
		width: 100%;
		max-width: 900px;
		margin: 0 auto;
		height: 100%;
		padding: 0 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.header-brand-group {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.brand-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.admin-tag {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.user-email-badge {
		font-size: 0.75rem;
		color: var(--text-secondary);
		max-width: 180px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.btn-logout {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		background: transparent;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0.25rem 0.5rem;
		color: var(--text-secondary);
		font-size: 0.75rem;
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
	}

	.btn-logout:hover:not(:disabled) {
		background-color: #fee2e2;
		color: var(--danger);
		border-color: #fca5a5;
	}

	.btn-logout:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.logout-icon {
		width: 13px;
		height: 13px;
	}

	.admin-main {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.content-wrapper {
		width: 100%;
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem 1.25rem 3.5rem;
		box-sizing: border-box;
	}

	@media (max-width: 640px) {
		.header-inner {
			padding: 0 0.875rem;
		}

		.content-wrapper {
			padding: 1.25rem 0.875rem 2.5rem;
		}

		.user-email-badge {
			display: none;
		}
	}
</style>
