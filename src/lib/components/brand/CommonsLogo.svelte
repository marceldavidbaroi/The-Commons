<script lang="ts">
	import CommonsSealVector from './CommonsSealVector.svelte';

	interface Props {
		variant?: 'seal' | 'mark' | 'horizontal' | 'stacked';
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
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
		class="commons-logo variant-{variant} {className}"
		class:stacked={variant === 'stacked'}
	>
		<div class="seal-wrapper">
			<CommonsSealVector size={pixelSize} markOnly={variant === 'mark'} />
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
	}

	.commons-logo.stacked {
		flex-direction: column;
		text-align: center;
		gap: 0.5rem;
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
		color: var(--text-primary, #f1f5f9);
		transition: color 0.15s ease;
	}

	.commons-logo:hover .logo-title {
		color: #66A3BF;
	}

	.logo-folio {
		font-family: var(--font-mono, monospace);
		font-size: 0.59375rem;
		letter-spacing: 0.15em;
		color: #66A3BF;
		border-left: 1px solid var(--border-subtle, #2d3748);
		padding-left: 0.5rem;
	}

	.logo-subtitle {
		font-family: var(--font-mono, monospace);
		font-size: 0.625rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted, #64748b);
		margin-top: 0.25rem;
	}
</style>
