<script lang="ts">
	import type { ThemePalette } from '$lib/theme';

	interface Props {
		size?: number;
		markOnly?: boolean;
		theme?: ThemePalette | 'current';
		class?: string;
	}

	let { size = 40, markOnly = false, theme = 'current', class: className = '' }: Props = $props();

	// Unique ID suffix to prevent gradient ID collisions when multiple logos/themes are displayed together
	const uniqueId = `seal-${Math.random().toString(36).substring(2, 9)}`;
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 160 160"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class="commons-seal theme-{theme} {className}"
	data-seal-theme={theme !== 'current' ? theme : undefined}
	aria-label="The Commons Archival Seal"
>
	<defs>
		<radialGradient id="sealShine-{uniqueId}" cx="50%" cy="30%" r="70%">
			<stop offset="0%" stop-color="var(--seal-gradient-top, #66A3BF)" stop-opacity="0.3" />
			<stop offset="60%" stop-color="var(--seal-gradient-mid, #3368A0)" stop-opacity="0.12" />
			<stop offset="100%" stop-color="var(--seal-gradient-bottom, #1E2D3D)" stop-opacity="0.22" />
		</radialGradient>
	</defs>

	<!-- Outer boundary -->
	<circle
		cx="80"
		cy="80"
		r="74"
		stroke="var(--seal-outer-dash, currentColor)"
		stroke-width="1.25"
		stroke-dasharray="3 2"
		class="seal-dash"
	/>
	<circle
		cx="80"
		cy="80"
		r="68"
		stroke="var(--seal-outer-ring, currentColor)"
		stroke-width="1"
		class="seal-outer-ring"
	/>
	<circle
		cx="80"
		cy="80"
		r="60"
		fill="url(#sealShine-{uniqueId})"
		stroke="var(--seal-solid-ring, currentColor)"
		stroke-width="1.5"
		class="seal-solid-ring"
	/>

	<!-- Arc Inscriptions -->
	{#if !markOnly && size >= 36}
		<path id="logoPathTop-{uniqueId}" d="M 28 80 A 52 52 0 0 1 132 80" fill="none" />
		<path id="logoPathBottom-{uniqueId}" d="M 132 80 A 52 52 0 0 1 28 80" fill="none" />

		<text class="arc-text arc-top">
			<textPath href="#logoPathTop-{uniqueId}" startOffset="50%" text-anchor="middle">
				THE COMMONS ARCHIVE
			</textPath>
		</text>
		<text class="arc-text arc-bottom">
			<textPath href="#logoPathBottom-{uniqueId}" startOffset="50%" text-anchor="middle">
				LITTERA SCRIPTA MANET
			</textPath>
		</text>
	{/if}

	<!-- Central Monogram Ring & Star Compass -->
	<circle cx="80" cy="80" r="32" stroke="var(--seal-inner-ring, currentColor)" stroke-width="1.1" class="seal-inner-ring" />

	<!-- Outer 4-Point Star Compass -->
	<polygon
		points="80,54 87,73 106,80 87,87 80,106 73,87 54,80 73,73"
		fill="var(--seal-star-outer, currentColor)"
		class="star-outer"
	/>

	<!-- Inner Inlaid Star -->
	<polygon
		points="80,63 84,76 97,80 84,84 80,97 76,84 63,80 76,76"
		fill="var(--seal-star-inner, #ffffff)"
		class="star-inner"
	/>

	<!-- Center Dot -->
	<circle cx="80" cy="80" r="3.5" fill="var(--seal-center-dot, #9E5A3C)" class="seal-center-dot" />
</svg>

<style>
	.commons-seal {
		display: inline-block;
		flex-shrink: 0;
		user-select: none;
		vertical-align: middle;

		/* Default (Current / Inherited from CSS tokens) */
		--seal-outer-dash: var(--primary, #9E5A3C);
		--seal-outer-ring: var(--primary, #9E5A3C);
		--seal-solid-ring: var(--primary, #9E5A3C);
		--seal-inner-ring: var(--primary, #9E5A3C);
		--seal-star-outer: var(--primary, #9E5A3C);
		--seal-star-inner: var(--bg-secondary, #ffffff);
		--seal-center-dot: var(--accent, #D9C3B0);
		--seal-text-top: var(--text-primary, #2C2825);
		--seal-text-bottom: var(--text-muted, #948B82);
		--seal-gradient-top: var(--accent, #D9C3B0);
		--seal-gradient-mid: var(--primary, #9E5A3C);
		--seal-gradient-bottom: var(--text-primary, #2C2825);
	}

	/* 1. PAPER / WARM LINEN THEME */
	:global([data-theme="paper"]) .commons-seal.theme-current,
	.commons-seal.theme-paper,
	.commons-seal[data-seal-theme="paper"] {
		--seal-outer-dash: #9E5A3C;
		--seal-outer-ring: rgba(158, 90, 60, 0.45);
		--seal-solid-ring: #9E5A3C;
		--seal-inner-ring: rgba(158, 90, 60, 0.5);
		--seal-star-outer: #9E5A3C;
		--seal-star-inner: #F6F4EE;
		--seal-center-dot: #C47854;
		--seal-text-top: #2C2825;
		--seal-text-bottom: #948B82;
		--seal-gradient-top: #D9C3B0;
		--seal-gradient-mid: #9E5A3C;
		--seal-gradient-bottom: #2C2825;
	}

	/* 2. SAGE / BOTANICAL SAGE THEME */
	:global([data-theme="sage"]) .commons-seal.theme-current,
	.commons-seal.theme-sage,
	.commons-seal[data-seal-theme="sage"] {
		--seal-outer-dash: #3A6053;
		--seal-outer-ring: rgba(58, 96, 83, 0.45);
		--seal-solid-ring: #3A6053;
		--seal-inner-ring: rgba(58, 96, 83, 0.5);
		--seal-star-outer: #3A6053;
		--seal-star-inner: #F3F4F1;
		--seal-center-dot: #8CAFA3;
		--seal-text-top: #1E2522;
		--seal-text-bottom: #84948D;
		--seal-gradient-top: #8CAFA3;
		--seal-gradient-mid: #3A6053;
		--seal-gradient-bottom: #1E2522;
	}

	/* 3. DENIM / QUIET DENIM THEME */
	:global([data-theme="denim"]) .commons-seal.theme-current,
	.commons-seal.theme-denim,
	.commons-seal[data-seal-theme="denim"] {
		--seal-outer-dash: #415E78;
		--seal-outer-ring: rgba(65, 94, 120, 0.45);
		--seal-solid-ring: #415E78;
		--seal-inner-ring: rgba(65, 94, 120, 0.5);
		--seal-star-outer: #415E78;
		--seal-star-inner: #F6F7F9;
		--seal-center-dot: #7A9AB5;
		--seal-text-top: #1F2633;
		--seal-text-bottom: #8A97A6;
		--seal-gradient-top: #8BA9C4;
		--seal-gradient-mid: #415E78;
		--seal-gradient-bottom: #1F2633;
	}

	/* 4. CLASSIC / SANCTUARY CLASSIC THEME */
	:global([data-theme="classic"]) .commons-seal.theme-current,
	.commons-seal.theme-classic,
	.commons-seal[data-seal-theme="classic"] {
		--seal-outer-dash: #3368A0;
		--seal-outer-ring: rgba(51, 104, 160, 0.45);
		--seal-solid-ring: #3368A0;
		--seal-inner-ring: rgba(51, 104, 160, 0.5);
		--seal-star-outer: #3368A0;
		--seal-star-inner: #FAF8F5;
		--seal-center-dot: #C94A4A;
		--seal-text-top: #1E293B;
		--seal-text-bottom: #8E9CA8;
		--seal-gradient-top: #66A3BF;
		--seal-gradient-mid: #3368A0;
		--seal-gradient-bottom: #1E293B;
	}

	/* 5. MIDNIGHT / MIDNIGHT BASALT THEME */
	:global([data-theme="midnight"]) .commons-seal.theme-current,
	:global(.dark) .commons-seal.theme-current,
	.commons-seal.theme-midnight,
	.commons-seal[data-seal-theme="midnight"] {
		--seal-outer-dash: #D49B55;
		--seal-outer-ring: rgba(212, 155, 85, 0.45);
		--seal-solid-ring: #D49B55;
		--seal-inner-ring: rgba(212, 155, 85, 0.5);
		--seal-star-outer: #D49B55;
		--seal-star-inner: #181716;
		--seal-center-dot: #F5C589;
		--seal-text-top: #EDE8DF;
		--seal-text-bottom: #A39B8F;
		--seal-gradient-top: #D49B55;
		--seal-gradient-mid: #B37D3E;
		--seal-gradient-bottom: #181716;
	}

	.seal-dash {
		opacity: 0.85;
	}

	.seal-outer-ring {
		opacity: 0.5;
	}

	.seal-inner-ring {
		opacity: 0.6;
	}

	.arc-text {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 7.5px;
		letter-spacing: 0.24em;
		font-weight: 600;
		text-transform: uppercase;
	}

	.arc-top {
		fill: var(--seal-text-top);
	}

	.arc-bottom {
		font-size: 6.5px;
		letter-spacing: 0.22em;
		fill: var(--seal-text-bottom);
	}
</style>
