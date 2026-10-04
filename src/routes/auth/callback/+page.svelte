<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { getSupabaseClient } from '$lib/supabase';
	import { fetchUserProfile, checkIsWhitelisted } from '$lib/services/member-service';

	let statusMessage = $state('Verifying security clearance...');
	let isError = $state(false);

	onMount(async () => {
		const supabase = getSupabaseClient();
		const next = page.url.searchParams.get('next') || '/home';

		try {
			// Get current authenticated user
			const { data: userData, error: userError } = await supabase.auth.getUser();

			if (userError || !userData?.user?.email) {
				console.error('No authenticated user found after callback:', userError);
				window.location.href = '/login?error=unauthorized';
				return;
			}

			const email = userData.user.email;
			const profile = await fetchUserProfile();
			const role = profile?.role || 'member';

			// Admin Route Verification
			if (next.startsWith('/admin')) {
				if (role === 'admin') {
					window.location.href = next;
					return;
				}

				// Not an admin: sign out and redirect to admin login
				await supabase.auth.signOut();
				window.location.href = '/admin/login?error=unauthorized_admin';
				return;
			}

			// Member Route Verification (/home, /diaries, /goals, /tasks, etc.)
			// Admins are always allowed
			if (role === 'admin') {
				window.location.href = next;
				return;
			}

			// Check Whitelist status in allowed_members table
			const isWhitelisted = await checkIsWhitelisted(email);

			if (isWhitelisted) {
				window.location.href = next;
				return;
			}

			// Not whitelisted: sign out and redirect to member login
			await supabase.auth.signOut();
			window.location.href = '/login?error=not_whitelisted';
		} catch (err) {
			console.error('Error during auth verification:', err);
			await supabase.auth.signOut();
			window.location.href = '/login?error=unauthorized';
		}
	});
</script>

<svelte:head>
	<title>Verifying Clearance - The Commons</title>
</svelte:head>

<div class="callback-container">
	<div class="spinner"></div>
	<p class="status-text">{statusMessage}</p>
</div>

<style>
	.callback-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		background-color: var(--bg-primary);
		color: var(--text-primary);
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border-subtle);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.status-text {
		font-size: 0.875rem;
		color: var(--text-secondary);
		letter-spacing: -0.01em;
	}
</style>
