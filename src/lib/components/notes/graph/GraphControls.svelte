<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';

	let {
		isExpanded = $bindable(false),
		onResetView
	} = $props<{
		isExpanded?: boolean;
		onResetView?: () => void;
	}>();

	function toggleHUD() {
		isExpanded = !isExpanded;
	}
</script>

<div class="graph-hud-container" class:open={isExpanded}>
	<div class="hud-bar">
		<button
			type="button"
			class="hud-btn hud-toggle-btn"
			onclick={toggleHUD}
			title={isExpanded ? "Collapse Controls" : "Filter & Physics Controls"}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon">
				<line x1="4" y1="21" x2="4" y2="14" />
				<line x1="4" y1="10" x2="4" y2="3" />
				<line x1="12" y1="21" x2="12" y2="12" />
				<line x1="12" y1="8" x2="12" y2="3" />
				<line x1="20" y1="21" x2="20" y2="16" />
				<line x1="20" y1="12" x2="20" y2="3" />
				<line x1="1" y1="14" x2="7" y2="14" />
				<line x1="9" y1="8" x2="15" y2="8" />
				<line x1="17" y1="16" x2="23" y2="16" />
			</svg>
			<span class="hud-label">Filters</span>
		</button>

		{#if onResetView}
			<button
				type="button"
				class="hud-btn"
				onclick={onResetView}
				title="Reset Pan & Zoom"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon">
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
			</button>
		{/if}
	</div>

	{#if isExpanded}
		<div class="hud-drawer">
			<div class="hud-section">
				<span class="section-title">Filters</span>
				
				<label class="toggle-row">
					<input
						type="checkbox"
						checked={notesStore.graphFilterShowGhosts}
						onchange={(e) => (notesStore.graphFilterShowGhosts = e.currentTarget.checked)}
					/>
					<span class="toggle-text">Ghost Nodes (Uncreated)</span>
				</label>

				<label class="toggle-row">
					<input
						type="checkbox"
						checked={notesStore.graphFilterShowOrphans}
						onchange={(e) => (notesStore.graphFilterShowOrphans = e.currentTarget.checked)}
					/>
					<span class="toggle-text">Orphan Nodes (No links)</span>
				</label>
			</div>

			<div class="hud-section">
				<span class="section-title">Forces</span>

				<div class="slider-row">
					<div class="slider-header">
						<span>Repulsion</span>
						<span class="slider-val">{notesStore.graphPhysicsRepulsion}</span>
					</div>
					<input
						type="range"
						min="100"
						max="1000"
						step="25"
						value={notesStore.graphPhysicsRepulsion}
						oninput={(e) => (notesStore.graphPhysicsRepulsion = Number(e.currentTarget.value))}
					/>
				</div>

				<div class="slider-row">
					<div class="slider-header">
						<span>Link Distance</span>
						<span class="slider-val">{notesStore.graphPhysicsLinkDistance}</span>
					</div>
					<input
						type="range"
						min="30"
						max="200"
						step="5"
						value={notesStore.graphPhysicsLinkDistance}
						oninput={(e) => (notesStore.graphPhysicsLinkDistance = Number(e.currentTarget.value))}
					/>
				</div>

				<div class="slider-row">
					<div class="slider-header">
						<span>Center Gravity</span>
						<span class="slider-val">{Math.round(notesStore.graphPhysicsCenterForce * 100)}%</span>
					</div>
					<input
						type="range"
						min="0.01"
						max="0.15"
						step="0.01"
						value={notesStore.graphPhysicsCenterForce}
						oninput={(e) => (notesStore.graphPhysicsCenterForce = Number(e.currentTarget.value))}
					/>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.graph-hud-container {
		position: absolute;
		top: 14px;
		left: 14px;
		z-index: 20;
		display: flex;
		flex-direction: column;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		overflow: hidden;
		transition: width 0.15s ease;
	}

	.hud-bar {
		display: flex;
		align-items: center;
		padding: 4px;
		gap: 4px;
		background: var(--bg-secondary);
	}

	.hud-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 8px;
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background 0.1s ease, color 0.1s ease;
	}

	.hud-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.hud-icon {
		width: 14px;
		height: 14px;
	}

	.hud-drawer {
		width: 230px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		border-top: 1px solid var(--border-subtle);
	}

	.hud-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.section-title {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
	}

	.toggle-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--text-secondary);
		cursor: pointer;
		user-select: none;
	}

	.toggle-row input {
		cursor: pointer;
		accent-color: var(--primary);
	}

	.slider-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.slider-header {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		color: var(--text-secondary);
	}

	.slider-val {
		color: var(--text-muted);
		font-family: monospace;
	}

	.slider-row input[type="range"] {
		width: 100%;
		height: 4px;
		accent-color: var(--primary);
		cursor: pointer;
	}
</style>
