<script lang="ts">
	import { getSupabaseClient } from '$lib/supabase';

	let isLoading = $state(false);
	let errorMessage = $state<string | null>(null);

	const supabase = getSupabaseClient();

	async function handleOAuthLogin() {
		errorMessage = null;
		isLoading = true;

		try {
			const origin = typeof window !== 'undefined' ? window.location.origin : '';
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/home')}`,
					queryParams: { prompt: 'select_account' }
				}
			});

			if (error) throw error;
		} catch (err: any) {
			errorMessage = err?.message || 'Failed to authenticate with Google';
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign In - The Commons</title>
</svelte:head>

<div class="auth-card-body">
	<div class="heading-block">
		<h1 class="auth-title">Sign In</h1>
		<p class="auth-description">
			Sign in with your Google account to continue to your workspace.
		</p>
	</div>

	{#if errorMessage}
		<div class="error-banner" role="alert">
			<svg class="error-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
				<path
					fill-rule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
					clip-rule="evenodd"
				/>
			</svg>
			<span>{errorMessage}</span>
		</div>
	{/if}

	<div class="action-block">
		<button
			type="button"
			class="oauth-button"
			onclick={handleOAuthLogin}
			disabled={isLoading}
		>
			<svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
				<path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" />
				<path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
				<path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.2C.7 9.6 0 12.2 0 15c0 2.8.7 5.4 1.9 7.8l3.7-2.9z" />
				<path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16c1.8 3.8 5.6 6.4 10.1 6.4z" />
			</svg>
			<span class="button-label">
				{#if isLoading}
					Signing in...
				{:else}
					Continue with Google
				{/if}
			</span>
		</button>
	</div>
</div>

<style>
	.auth-card-body {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.heading-block {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		text-align: center;
	}

	.auth-title {
		font-size: 1.375rem;
		font-weight: 600;
		color: var(--text-primary);
		letter-spacing: -0.01em;
	}

	.auth-description {
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.25);
		border-radius: var(--radius-sm);
		padding: 0.625rem 0.75rem;
		color: #ef4444;
		font-size: 0.8125rem;
		line-height: 1.4;
	}

	.error-icon {
		flex-shrink: 0;
		color: var(--danger);
	}

	.action-block {
		display: flex;
		flex-direction: column;
	}

	.oauth-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
		background: #ffffff;
		color: var(--text-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}

	.oauth-button:hover:not(:disabled) {
		background-color: var(--bg-tertiary);
		border-color: #cbd5e1;
	}

	.oauth-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.google-icon {
		flex-shrink: 0;
	}

	.button-label {
		letter-spacing: -0.01em;
	}
</style>

