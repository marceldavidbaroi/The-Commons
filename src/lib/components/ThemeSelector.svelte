<script lang="ts">
	import { onMount } from 'svelte';
	import { themeStore, THEME_PALETTES, type ThemePalette } from '$lib/theme';

	let isOpen = $state(false);
	let currentTheme = $derived(
		THEME_PALETTES.find((p) => p.id === $themeStore) || THEME_PALETTES[0]
	);

	onMount(() => {
		themeStore.init();

		function handleOutsideClick(event: MouseEvent) {
			const target = event.target as HTMLElement | null;
			if (isOpen && target && !target.closest('.theme-selector-container')) {
				isOpen = false;
			}
		}

		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape' && isOpen) {
				isOpen = false;
			}
		}

		window.addEventListener('click', handleOutsideClick);
		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('click', handleOutsideClick);
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	let triggerEl: HTMLButtonElement | null = $state(null);

	function selectTheme(themeId: ThemePalette, event?: MouseEvent) {
		if (themeId === $themeStore) {
			isOpen = false;
			return;
		}

		const x = event?.clientX ?? triggerEl?.getBoundingClientRect().left ?? window.innerWidth / 2;
		const y = event?.clientY ?? triggerEl?.getBoundingClientRect().top ?? window.innerHeight / 2;

		const endRadius = Math.hypot(
			Math.max(x, window.innerWidth - x),
			Math.max(y, window.innerHeight - y)
		);

		// Check if View Transitions API is supported
		if (typeof document !== 'undefined' && 'startViewTransition' in document) {
			const transition = (document as any).startViewTransition(() => {
				themeStore.setTheme(themeId);
			});

			transition.ready.then(() => {
				document.documentElement.animate(
					{
						clipPath: [
							`circle(0px at ${x}px ${y}px)`,
							`circle(${endRadius}px at ${x}px ${y}px)`
						]
					},
					{
						duration: 450,
						easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
						pseudoElement: '::view-transition-new(root)'
					}
				);
			});
		} else {
			themeStore.setTheme(themeId);
		}

		isOpen = false;
	}
</script>

<div class="theme-selector-container">
	<button
		bind:this={triggerEl}
		type="button"
		class="theme-trigger"
		class:active={isOpen}
		onclick={toggleDropdown}
		aria-expanded={isOpen}
		aria-haspopup="true"
		aria-label="Select theme"
		title="Theme: {currentTheme.name}"
	>
		<span class="theme-color-indicator" style="background-color: {currentTheme.accentHex};"></span>
		<svg class="palette-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
			<circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
			<circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
			<circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
			<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
		</svg>
	</button>

	{#if isOpen}
		<div class="theme-dropdown" role="menu">
			<div class="dropdown-header">
				<span class="dropdown-title">Atmosphere</span>
				<span class="dropdown-subtitle">5 Themes</span>
			</div>
			<div class="dropdown-divider"></div>

			<div class="theme-list">
				{#each THEME_PALETTES as palette}
					{@const isSelected = $themeStore === palette.id}
					<button
						type="button"
						class="theme-option-btn"
						class:selected={isSelected}
						onclick={(e) => selectTheme(palette.id, e)}
						role="menuitem"
					>
						<div class="theme-preview-box" style="background-color: {palette.bgHex};">
							<span class="theme-accent-dot" style="background-color: {palette.accentHex};"></span>
						</div>

						<div class="theme-meta">
							<div class="theme-name-row">
								<span class="theme-name">{palette.name}</span>
								{#if isSelected}
									<span class="active-badge">Active</span>
								{/if}
							</div>
							<span class="theme-tagline">{palette.tagline}</span>
						</div>

						{#if isSelected}
							<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<polyline points="20 6 9 17 4 12" />
							</svg>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.theme-selector-container {
		position: relative;
		display: flex;
		align-items: center;
	}

	.theme-trigger {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		background-color: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		position: relative;
		transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
		            background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
		            color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
		            transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
		user-select: none;
	}

	.theme-trigger:active {
		transform: scale(0.92);
	}

	.theme-trigger:hover,
	.theme-trigger.active {
		border-color: var(--primary);
		background-color: var(--bg-surface);
		color: var(--primary);
	}

	.theme-color-indicator {
		position: absolute;
		bottom: -1px;
		right: -1px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 1.5px solid var(--bg-secondary);
		transition: background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
		            border-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
		            transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.theme-trigger:hover .theme-color-indicator {
		transform: scale(1.15);
	}

	.palette-icon {
		width: 14px;
		height: 14px;
		transition: transform 0.3s ease, color 0.3s ease;
	}

	.theme-trigger:hover .palette-icon {
		transform: rotate(15deg);
	}

	.theme-dropdown {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 240px;
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
		align-items: center;
		justify-content: space-between;
	}

	.dropdown-title {
		font-size: 0.6875rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-weight: 600;
	}

	.dropdown-subtitle {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.dropdown-divider {
		height: 1px;
		background-color: var(--border-subtle);
		margin: 0.25rem 0;
	}

	.theme-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.theme-option-btn {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.4375rem 0.5rem;
		font-size: 0.8125rem;
		color: var(--text-primary);
		border-radius: var(--radius-sm);
		background: transparent;
		border: 1px solid transparent;
		width: 100%;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.15s ease, border-color 0.15s ease;
		box-sizing: border-box;
	}

	.theme-option-btn:hover {
		background-color: var(--bg-tertiary);
	}

	.theme-option-btn.selected {
		background-color: var(--bg-tertiary);
		border-color: var(--border-subtle);
	}

	.theme-preview-box {
		width: 22px;
		height: 22px;
		border-radius: 5px;
		border: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.theme-accent-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.theme-meta {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		flex: 1;
		min-width: 0;
	}

	.theme-name-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.theme-name {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-primary);
		line-height: 1.2;
	}

	.active-badge {
		font-size: 0.625rem;
		background-color: var(--bg-surface);
		color: var(--primary);
		padding: 0.0625rem 0.3125rem;
		border-radius: 4px;
		font-weight: 600;
		line-height: 1.2;
		letter-spacing: 0.02em;
	}

	.theme-tagline {
		font-size: 0.6875rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.2;
	}

	.check-icon {
		width: 14px;
		height: 14px;
		color: var(--primary);
		flex-shrink: 0;
	}
</style>
