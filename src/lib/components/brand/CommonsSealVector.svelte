<script lang="ts">
	interface Props {
		size?: number;
		markOnly?: boolean;
		class?: string;
	}

	let { size = 40, markOnly = false, class: className = '' }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 160 160"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class="commons-seal {className}"
	aria-label="The Commons Archival Seal"
>
	<defs>
		<radialGradient id="commonsLogoShine" cx="50%" cy="30%" r="70%">
			<stop offset="0%" stop-color="#66A3BF" stop-opacity="0.25" />
			<stop offset="60%" stop-color="#3368A0" stop-opacity="0.08" />
			<stop offset="100%" stop-color="#1E2D3D" stop-opacity="0.18" />
		</radialGradient>
	</defs>

	<!-- Outer boundary -->
	<circle
		cx="80"
		cy="80"
		r="74"
		stroke="currentColor"
		stroke-width="1.25"
		stroke-dasharray="3 2"
		class="seal-dash"
	/>
	<circle
		cx="80"
		cy="80"
		r="68"
		stroke="currentColor"
		stroke-width="1"
		class="seal-outer-ring"
	/>
	<circle
		cx="80"
		cy="80"
		r="60"
		fill="url(#commonsLogoShine)"
		stroke="currentColor"
		stroke-width="1.5"
		class="seal-solid-ring"
	/>

	<!-- Arc Inscriptions -->
	{#if !markOnly && size >= 36}
		<path id="logoPathTop" d="M 28 80 A 52 52 0 0 1 132 80" fill="none" />
		<path id="logoPathBottom" d="M 132 80 A 52 52 0 0 1 28 80" fill="none" />

		<text class="arc-text arc-top">
			<textPath href="#logoPathTop" startOffset="50%" text-anchor="middle">
				THE COMMONS ARCHIVE
			</textPath>
		</text>
		<text class="arc-text arc-bottom">
			<textPath href="#logoPathBottom" startOffset="50%" text-anchor="middle">
				LITTERA SCRIPTA MANET
			</textPath>
		</text>
	{/if}

	<!-- Central Monogram Ring & Star Compass -->
	<circle cx="80" cy="80" r="32" stroke="currentColor" stroke-width="1.1" class="seal-inner-ring" />

	<!-- Outer 4-Point Star Compass -->
	<polygon
		points="80,54 87,73 106,80 87,87 80,106 73,87 54,80 73,73"
		fill="currentColor"
		class="star-outer"
	/>

	<!-- Inner Inlaid Star -->
	<polygon
		points="80,63 84,76 97,80 84,84 80,97 76,84 63,80 76,76"
		fill="#ffffff"
		class="star-inner"
	/>

	<!-- Wax Seal Center Dot -->
	<circle cx="80" cy="80" r="3.5" fill="#8C3A27" class="seal-center-dot" />
</svg>

<style>
	.commons-seal {
		display: inline-block;
		flex-shrink: 0;
		user-select: none;
		vertical-align: middle;
	}

	.seal-dash {
		color: #66A3BF;
		opacity: 0.7;
	}

	.seal-outer-ring {
		color: #66A3BF;
		opacity: 0.4;
	}

	.seal-solid-ring {
		color: #66A3BF;
	}

	.seal-inner-ring {
		color: #66A3BF;
		opacity: 0.5;
	}

	.star-outer {
		color: #66A3BF;
	}

	.arc-text {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 7.5px;
		letter-spacing: 0.24em;
		font-weight: 600;
		text-transform: uppercase;
	}

	.arc-top {
		fill: #C8DFDB;
	}

	.arc-bottom {
		font-size: 6.5px;
		letter-spacing: 0.22em;
		fill: #94a3b8;
	}

	.seal-center-dot {
		fill: #e59375;
	}
</style>
