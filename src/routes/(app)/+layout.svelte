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
	let isMobileNavOpen = $state(false);
	let userEmail = $state<string | null>(null);
	let userInitial = $state<string>('C');

	const navItems = [
		{
			path: '/home',
			label: 'Home',
			icon: 'home'
		},
		{
			path: '/notes',
			label: 'Notes',
			icon: 'notes'
		},
		{
			path: '/flashcards',
			label: 'Flashcards',
			icon: 'flashcards'
		},
		{
			path: '/diaries',
			label: 'Journals',
			icon: 'journals'
		},
		{
			path: '/goals',
			label: 'Goals',
			icon: 'goals'
		},
		{
			path: '/tasks',
			label: 'Tasks',
			icon: 'tasks'
		},
		{
			path: '/homeops',
			label: 'HomeOps',
			icon: 'homeops'
		},
		{
			path: '/settings',
			label: 'Settings',
			icon: 'settings'
		}
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
			if (event.key === 'Escape') {
				if (isMenuOpen) isMenuOpen = false;
				if (isMobileNavOpen) isMobileNavOpen = false;
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

	function closeMobileNav() {
		isMobileNavOpen = false;
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

{#snippet navIcon(iconName: string)}
	{#if iconName === 'home'}
		<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
			<polyline points="9 22 9 12 15 12 15 22" />
		</svg>
	{:else if iconName === 'notes'}
		<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
			<polyline points="14 2 14 8 20 8" />
			<line x1="16" y1="13" x2="8" y2="13" />
			<line x1="16" y1="17" x2="8" y2="17" />
			<line x1="10" y1="9" x2="8" y2="9" />
		</svg>
	{:else if iconName === 'flashcards'}
		<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<rect x="2" y="7" width="16" height="13" rx="2" />
			<path d="M6 3h14a2 2 0 0 1 2 2v12" />
		</svg>
	{:else if iconName === 'journals'}
		<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
			<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
		</svg>
	{:else if iconName === 'goals'}
		<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="10" />
			<circle cx="12" cy="12" r="6" />
			<circle cx="12" cy="12" r="2" />
		</svg>
	{:else if iconName === 'tasks'}
		<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="9 11 12 14 22 4" />
			<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
		</svg>
	{:else if iconName === 'homeops'}
		<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M12 2v4" />
			<path d="M12 18v4" />
			<path d="m4.93 4.93 2.83 2.83" />
			<path d="m16.24 16.24 2.83 2.83" />
			<path d="M2 12h4" />
			<path d="M18 12h4" />
			<path d="m4.93 19.07 2.83-2.83" />
			<path d="m16.24 7.76 2.83-2.83" />
		</svg>
	{:else if iconName === 'settings'}
		<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	{/if}
{/snippet}

<div class="app-layout">
	<!-- Mobile Top Bar (<768px) -->
	<header class="mobile-topbar">
		<button
			type="button"
			class="mobile-menu-btn"
			aria-label="Toggle navigation menu"
			onclick={() => (isMobileNavOpen = !isMobileNavOpen)}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-icon">
				<line x1="3" y1="12" x2="21" y2="12" />
				<line x1="3" y1="6" x2="21" y2="6" />
				<line x1="3" y1="18" x2="21" y2="18" />
			</svg>
		</button>

		<div class="mobile-brand">
			<CommonsLogo variant="mark" size="sm" href="/home" />
			<span class="mobile-brand-title">The Commons</span>
		</div>

		<div class="mobile-actions">
			<ThemeSelector />
		</div>
	</header>

	<!-- Mobile Backdrop Overlay -->
	{#if isMobileNavOpen}
		<button
			type="button"
			class="sidebar-backdrop"
			aria-label="Close navigation"
			onclick={closeMobileNav}
		></button>
	{/if}

	<!-- Left Side Navigation -->
	<aside class="app-sidebar" class:open={isMobileNavOpen}>
		<div class="sidebar-header">
			<a href="/home" class="sidebar-brand" onclick={closeMobileNav}>
				<CommonsLogo variant="mark" size="sm" />
				<div class="brand-text">
					<span class="brand-title">The Commons</span>
					<span class="brand-sub">Workspace</span>
				</div>
			</a>
		</div>

		<nav class="sidebar-nav" aria-label="Main Navigation">
			<div class="nav-section-label">Navigation</div>
			{#each navItems as item}
				{@const isActive = page.url.pathname === item.path || (item.path !== '/home' && page.url.pathname.startsWith(item.path))}
				<a
					href={item.path}
					class="nav-link"
					class:active={isActive}
					onclick={closeMobileNav}
				>
					<span class="nav-icon-wrapper">
						{@render navIcon(item.icon)}
					</span>
					<span class="nav-label">{item.label}</span>
				</a>
			{/each}
		</nav>

		<!-- Sidebar Footer: Theme and Account -->
		<div class="sidebar-footer">
			<div class="theme-row">
				<span class="theme-label">Theme</span>
				<ThemeSelector />
			</div>

			<div class="user-menu-container">
				<button
					type="button"
					class="user-profile-button"
					class:active={isMenuOpen}
					onclick={toggleMenu}
					aria-expanded={isMenuOpen}
					aria-haspopup="true"
					aria-label="Account menu"
				>
					<div class="user-avatar">
						<span class="avatar-initial">{userInitial}</span>
					</div>
					<div class="user-meta">
						<span class="user-display-name">{userEmail ? userEmail.split('@')[0] : 'Account'}</span>
						<span class="user-email-text" title={userEmail || ''}>{userEmail || 'Personal'}</span>
					</div>
					<svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="6 9 12 15 18 9" />
					</svg>
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

						<a
							href="/settings"
							class="dropdown-item"
							onclick={() => {
								isMenuOpen = false;
								closeMobileNav();
							}}
							role="menuitem"
						>
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
	</aside>

	<!-- Main Content Area -->
	<main class="main-content">
		<div class="content-wrapper">
			{@render children()}
		</div>
	</main>
</div>

<style>
	.app-layout {
		min-height: 100vh;
		display: flex;
		background-color: var(--bg-primary);
	}

	/* Topbar for mobile viewports */
	.mobile-topbar {
		display: none;
	}

	/* Side Navigation Container */
	.app-sidebar {
		width: 240px;
		flex-shrink: 0;
		background-color: var(--bg-secondary);
		border-right: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		position: sticky;
		top: 0;
		height: 100vh;
		box-sizing: border-box;
		z-index: 40;
	}

	.sidebar-header {
		padding: 1.125rem 1rem 1rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		text-decoration: none;
		color: var(--text-primary);
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}

	.brand-title {
		font-size: 0.875rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--text-primary);
	}

	.brand-sub {
		font-size: 0.6875rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.sidebar-nav {
		flex: 1;
		padding: 0.75rem 0.625rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		overflow-y: auto;
		scrollbar-width: thin;
	}

	.nav-section-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		padding: 0.375rem 0.625rem 0.25rem;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.4375rem 0.625rem;
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.8125rem;
		font-weight: 450;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.nav-link:hover {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.nav-link.active {
		background-color: var(--bg-tertiary);
		color: var(--primary);
		font-weight: 600;
	}

	.nav-icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.sidebar-icon {
		width: 16px;
		height: 16px;
	}

	.nav-label {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Sidebar Bottom Section */
	.sidebar-footer {
		padding: 0.75rem 0.625rem 0.875rem;
		border-top: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		background-color: var(--bg-secondary);
	}

	.theme-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.375rem;
	}

	.theme-label {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.user-menu-container {
		position: relative;
	}

	.user-profile-button {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		border-radius: var(--radius-sm);
		background: transparent;
		border: 1px solid transparent;
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}

	.user-profile-button:hover,
	.user-profile-button.active {
		background-color: var(--bg-tertiary);
		border-color: var(--border-subtle);
	}

	.user-avatar {
		width: 26px;
		height: 26px;
		border-radius: var(--radius-full);
		background-color: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		color: var(--primary);
		font-size: 0.75rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.avatar-initial {
		line-height: 1;
	}

	.user-meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		line-height: 1.15;
	}

	.user-display-name {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-email-text {
		font-size: 0.6875rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chevron-icon {
		width: 14px;
		height: 14px;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	/* User Dropdown */
	.user-dropdown {
		position: absolute;
		bottom: calc(100% + 6px);
		left: 0;
		right: 0;
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
			transform: translateY(4px);
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

	/* Main Content Area */
	.main-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow-x: hidden;
	}

	.content-wrapper {
		width: 100%;
		max-width: 1100px;
		margin: 0 auto;
		padding: 1.25rem 1.75rem 3rem;
		box-sizing: border-box;
	}

	/* Mobile responsive styles */
	@media (max-width: 768px) {
		.app-layout {
			flex-direction: column;
		}

		.mobile-topbar {
			position: sticky;
			top: 0;
			z-index: 50;
			height: 48px;
			background-color: var(--bg-secondary);
			border-bottom: 1px solid var(--border-subtle);
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 0.875rem;
		}

		.mobile-menu-btn {
			background: transparent;
			border: none;
			padding: 0.375rem;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			color: var(--text-primary);
			border-radius: var(--radius-sm);
		}

		.mobile-menu-btn:hover {
			background-color: var(--bg-tertiary);
		}

		.menu-icon {
			width: 20px;
			height: 20px;
		}

		.mobile-brand {
			display: flex;
			align-items: center;
			gap: 0.5rem;
		}

		.mobile-brand-title {
			font-size: 0.875rem;
			font-weight: 600;
			color: var(--text-primary);
		}

		.mobile-actions {
			display: flex;
			align-items: center;
		}

		.app-sidebar {
			position: fixed;
			top: 0;
			left: 0;
			bottom: 0;
			height: 100%;
			transform: translateX(-100%);
			transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
			z-index: 60;
			box-shadow: none;
		}

		.app-sidebar.open {
			transform: translateX(0);
			box-shadow: 0 0 24px rgba(0, 0, 0, 0.15);
		}

		.sidebar-backdrop {
			position: fixed;
			inset: 0;
			background-color: rgba(0, 0, 0, 0.35);
			z-index: 55;
			border: none;
			padding: 0;
			cursor: pointer;
		}

		.content-wrapper {
			padding: 0.875rem 1rem calc(env(safe-area-inset-bottom, 0px) + 2rem);
		}
	}
</style>
