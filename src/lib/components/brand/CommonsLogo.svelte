<script lang="ts">
	import CommonsSealVector from './CommonsSealVector.svelte';
	import type { ThemePalette } from '$lib/theme';

	interface Props {
		variant?: 'seal' | 'mark' | 'horizontal' | 'stacked';
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
		theme?: ThemePalette | 'current';
		href?: string;
		subtitle?: string;
		showFolio?: boolean;
		class?: string;
	}

	const sizeMap = {
		xs: 20,
		sm: 28,
		md: 40,
		lg: 64,
		xl: 96
	};

	let {
		variant = 'horizontal',
		size = 'md',
		theme = 'current',
		href,
		subtitle,
		showFolio = false,
		class: className = ''
	}: Props = $props();

	let pixelSize = $derived.by(() => {
		return typeof size === 'number' ? size : sizeMap[size];
	});
</script>

{#snippet logoContent()}
	<div
		class="commons-logo variant-{variant} theme-{theme} {className}"
		class:stacked={variant === 'stacked'}
		data-logo-theme={theme !== 'current' ? theme : undefined}
	>
		<div class="seal-wrapper">
			<CommonsSealVector size={pixelSize} markOnly={variant === 'mark'} {theme} />
		</div>

		{#if variant !== 'seal' && variant !== 'mark'}
			<div class="logo-text-block">
				<div class="title-row">
					<span class="logo-title">The Commons</span>
					{#if showFolio}
						<span class="logo-folio">EST. 2026</span>
					{/if}
				</div>
				{#if subtitle}
					<span class="logo-subtitle">{subtitle}</span>
				{/if}
			</div>
		{/if}
	</div>
{/snippet}

{#if href}
	<a {href} class="logo-link">
		{@render logoContent()}
	</a>
{:else}
	{@render logoContent()}
{/if}

<style>
	.logo-link {
		display: inline-flex;
		text-decoration: none;
		color: inherit;
		outline: none;
	}

	.commons-logo {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		user-select: none;
		transition: all 0.2s ease;

		--logo-title-color: var(--text-primary, #2C2825);
		--logo-hover-color: var(--primary, #9E5A3C);
		--logo-folio-color: var(--primary, #9E5A3C);
		--logo-folio-border: var(--border-subtle, #E3DDD1);
		--logo-sub-color: var(--text-muted, #948B82);
	}

	.commons-logo.stacked {
		flex-direction: column;
		text-align: center;
		gap: 0.5rem;
	}

	/* Theme overrides for standalone displays */
	.commons-logo.theme-paper,
	.commons-logo[data-logo-theme="paper"] {
		--logo-title-color: #2C2825;
		--logo-hover-color: #9E5A3C;
		--logo-folio-color: #9E5A3C;
		--logo-folio-border: #E3DDD1;
		--logo-sub-color: #948B82;
	}

	.commons-logo.theme-sage,
	.commons-logo[data-logo-theme="sage"] {
		--logo-title-color: #1E2522;
		--logo-hover-color: #3A6053;
		--logo-folio-color: #3A6053;
		--logo-folio-border: #D7E0D6;
		--logo-sub-color: #84948D;
	}

	.commons-logo.theme-denim,
	.commons-logo[data-logo-theme="denim"] {
		--logo-title-color: #1F2633;
		--logo-hover-color: #415E78;
		--logo-folio-color: #415E78;
		--logo-folio-border: #DCE4EB;
		--logo-sub-color: #8A97A6;
	}

	.commons-logo.theme-classic,
	.commons-logo[data-logo-theme="classic"] {
		--logo-title-color: #1E293B;
		--logo-hover-color: #3368A0;
		--logo-folio-color: #3368A0;
		--logo-folio-border: #E5E1D8;
		--logo-sub-color: #8E9CA8;
	}

	.commons-logo.theme-midnight,
	.commons-logo[data-logo-theme="midnight"] {
		--logo-title-color: #EDE8DF;
		--logo-hover-color: #D49B55;
		--logo-folio-color: #D49B55;
		--logo-folio-border: #34302B;
		--logo-sub-color: #736C61;
	}

	.seal-wrapper {
		transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.commons-logo:hover .seal-wrapper {
		transform: scale(1.05) rotate(2deg);
	}

	.logo-text-block {
		display: flex;
		flex-direction: column;
	}

	.stacked .logo-text-block {
		align-items: center;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.logo-title {
		font-family: Georgia, Cambria, "Times New Roman", Times, serif;
		font-weight: 700;
		font-size: 1.125rem;
		line-height: 1;
		letter-spacing: -0.01em;
		color: var(--logo-title-color);
		transition: color 0.15s ease;
	}

	.commons-logo:hover .logo-title {
		color: var(--logo-hover-color);
	}

	.logo-folio {
		font-family: var(--font-mono, monospace);
		font-size: 0.59375rem;
		letter-spacing: 0.15em;
		color: var(--logo-folio-color);
		border-left: 1px solid var(--logo-folio-border);
		padding-left: 0.5rem;
	}

	.logo-subtitle {
		font-family: var(--font-mono, monospace);
		font-size: 0.625rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--logo-sub-color);
		margin-top: 0.25rem;
	}
</style>
