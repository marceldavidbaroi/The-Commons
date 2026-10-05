<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { getSupabaseClient } from '$lib/supabase';
	import CommonsLogo from '$lib/components/brand/CommonsLogo.svelte';
	import ThemeSelector from '$lib/components/ThemeSelector.svelte';

	let { children } = $props();

	const supabase = getSupabaseClient();
	let isLoggingOut = $state(false);
	let isMenuOpen = $state(false);
	let userEmail = $state<string | null>(null);
	let userInitial = $state<string>('C');

	const navItems = [
		{ path: '/home', label: 'Home' },
		{ path: '/diaries', label: 'Journals' },
		{ path: '/goals', label: 'Goals' },
		{ path: '/tasks', label: 'Tasks' },
		{ path: '/homeops', label: 'HomeOps' },
		{ path: '/settings', label: 'Settings' }
	];

	onMount(() => {
		async function loadUser() {
			try {
				const { data } = await supabase.auth.getUser();
				if (data?.user?.email) {
					userEmail = data.user.email;
					userInitial = (data.user.user_metadata?.full_name?.[0] || data.user.email[0] || 'U').toUpperCase();
				}
			} catch (err) {
				console.error('Error fetching user', err);
			}
		}

		loadUser();

		function handleOutsideClick(event: MouseEvent) {
			const target = event.target as HTMLElement | null;
			if (isMenuOpen && target && !target.closest('.user-menu-container')) {
				isMenuOpen = false;
			}
		}

		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape' && isMenuOpen) {
				isMenuOpen = false;
			}
		}

		window.addEventListener('click', handleOutsideClick);
		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('click', handleOutsideClick);
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	async function handleSignOut() {
		isLoggingOut = true;
		try {
			await supabase.auth.signOut();
			if (typeof window !== 'undefined') {
				window.location.href = '/login';
			}
		} catch (err) {
			console.error('Error signing out', err);
			isLoggingOut = false;
		}
	}
</script>

<div class="app-shell">
	<!-- Thin Apple-style Navigation Header -->
	<header class="app-header">
		<div class="header-inner">
			<!-- Logo Icon -->
			<div class="header-brand">
				<CommonsLogo variant="mark" size="sm" href="/home" />
			</div>

			<!-- Navigation Links -->
			<nav class="header-nav" aria-label="Main Navigation">
				{#each navItems as item}
					{@const isActive = page.url.pathname === item.path || (item.path !== '/home' && page.url.pathname.startsWith(item.path))}
					<a href={item.path} class="nav-item" class:active={isActive}>
						{item.label}
					</a>
				{/each}
			</nav>

			<!-- Theme Selector & User Avatar Menu -->
			<div class="header-user">
				<ThemeSelector />
				<div class="user-menu-container">
					<button
						type="button"
						class="avatar-button"
						class:active={isMenuOpen}
						onclick={toggleMenu}
						aria-expanded={isMenuOpen}
						aria-haspopup="true"
						aria-label="Account menu"
					>
						<span class="avatar-initial">{userInitial}</span>
					</button>

					{#if isMenuOpen}
						<div class="user-dropdown" role="menu">
							{#if userEmail}
								<div class="dropdown-header">
									<span class="user-label">Signed in as</span>
									<span class="user-email" title={userEmail}>{userEmail}</span>
								</div>
								<div class="dropdown-divider"></div>
							{/if}

							<a href="/settings" class="dropdown-item" onclick={() => (isMenuOpen = false)} role="menuitem">
								<svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
									<circle cx="12" cy="12" r="3" />
								</svg>
								<span>Settings</span>
							</a>

							<div class="dropdown-divider"></div>

							<button
								type="button"
								class="dropdown-item logout-item"
								onclick={handleSignOut}
								disabled={isLoggingOut}
								role="menuitem"
							>
								<svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
									<polyline points="16 17 21 12 16 7" />
									<line x1="21" y1="12" x2="9" y2="12" />
								</svg>
								<span>{isLoggingOut ? 'Signing out...' : 'Log out'}</span>
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content Canvas -->
	<main class="main-content">
		<div class="content-wrapper">
			{@render children()}
		</div>
	</main>
</div>

<style>
	.app-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background-color: var(--bg-primary);
	}

	/* Thin Apple-style Top Header (~44px) */
	.app-header {
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
		max-width: 1024px;
		margin: 0 auto;
		height: 100%;
		padding: 0 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.header-brand {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.header-nav {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.nav-item {
		font-size: 0.8125rem;
		font-weight: 400;
		color: var(--text-secondary);
		letter-spacing: -0.01em;
		transition: color 0.15s ease, opacity 0.15s ease;
		white-space: nowrap;
	}

	.nav-item:hover {
		color: var(--text-primary);
	}

	.nav-item.active {
		color: var(--text-primary);
		font-weight: 500;
	}

	.header-user {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.user-menu-container {
		position: relative;
		display: flex;
		align-items: center;
	}

	/* Minimal Avatar Pill/Button */
	.avatar-button {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		background-color: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		color: var(--primary);
		font-size: 0.75rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.1s ease;
		user-select: none;
	}

	.avatar-button:hover,
	.avatar-button.active {
		border-color: var(--primary);
		background-color: var(--bg-surface);
	}

	.avatar-initial {
		line-height: 1;
	}

	/* Apple-style clean dropdown menu */
	.user-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 200px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
		padding: 0.375rem;
		z-index: 100;
		display: flex;
		flex-direction: column;
		animation: fadeIn 0.12s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.dropdown-header {
		padding: 0.5rem 0.625rem 0.375rem;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.user-label {
		font-size: 0.6875rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.user-email {
		font-size: 0.75rem;
		color: var(--text-primary);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.dropdown-divider {
		height: 1px;
		background-color: var(--border-subtle);
		margin: 0.25rem 0;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4375rem 0.625rem;
		font-size: 0.8125rem;
		color: var(--text-primary);
		border-radius: var(--radius-sm);
		text-decoration: none;
		background: transparent;
		border: none;
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease;
		box-sizing: border-box;
	}

	.dropdown-item:hover {
		background-color: var(--bg-tertiary);
	}

	.dropdown-icon {
		width: 14px;
		height: 14px;
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.logout-item {
		color: var(--danger);
	}

	.logout-item .dropdown-icon {
		color: var(--danger);
	}

	.logout-item:hover:not(:disabled) {
		background-color: #fee2e2;
		color: var(--danger);
	}

	.logout-item:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.content-wrapper {
		width: 100%;
		max-width: 1024px;
		margin: 0 auto;
		padding: 2rem 1.25rem 3.5rem;
		box-sizing: border-box;
	}

	@media (max-width: 640px) {
		.header-inner {
			padding: 0 0.875rem;
		}

		.header-nav {
			gap: 0.875rem;
		}

		.nav-item {
			font-size: 0.75rem;
		}

		.content-wrapper {
			padding: 1.25rem 0.875rem 2.5rem;
		}
	}
</style>
