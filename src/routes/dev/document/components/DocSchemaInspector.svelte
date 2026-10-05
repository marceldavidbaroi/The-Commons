<script lang="ts">
	import { onMount } from 'svelte';
	import type { SchemaMetadata, SchemaTable } from '$lib/server/schema-loader';
	import { getFeatureTableNames } from './docs-helpers';

	let {
		schema,
		featureFolder
	}: {
		schema?: SchemaMetadata;
		featureFolder?: string;
	} = $props();

	let schemaSearch = $state('');
	let schemaScope = $state<'feature' | 'all'>('all');
	let viewMode = $state<'erd' | 'cards'>('erd');
	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let hoveredTable = $state<string | null>(null);
	let selectedTable = $state<string | null>(null);

	// Filtered tables for schema view
	let featureTables = $derived.by((): SchemaTable[] => {
		if (!schema?.tables) return [];
		if (schemaScope === 'all' || !featureFolder) return schema.tables;
		const tableNames = getFeatureTableNames(featureFolder);
		if (tableNames.length === 0) return schema.tables;
		return schema.tables.filter((t: SchemaTable) => tableNames.includes(t.name));
	});

	let filteredSchemaTables = $derived.by(() => {
		const q = schemaSearch.toLowerCase().trim();
		if (!q) return featureTables;
		return featureTables.filter(
			(t: SchemaTable) =>
				t.name.toLowerCase().includes(q) ||
				t.columns.some((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q))
		);
	});

	// Compute positioned nodes for ERD canvas
	interface TableNodePos {
		table: SchemaTable;
		x: number;
		y: number;
		width: number;
		height: number;
	}

	let tablePositions = $derived.by((): Map<string, TableNodePos> => {
		const map = new Map<string, TableNodePos>();
		const tables = filteredSchemaTables;
		const cols = Math.max(1, Math.ceil(Math.sqrt(tables.length * 1.6)));
		const cardWidth = 260;
		const colGap = 80;
		const rowGap = 50;

		// Track column heights for masonry layout
		const colHeights = new Array(cols).fill(60);

		tables.forEach((table, index) => {
			// Find column with smallest current height
			let minCol = 0;
			for (let c = 1; c < cols; c++) {
				if (colHeights[c] < colHeights[minCol]) {
					minCol = c;
				}
			}

			const x = 60 + minCol * (cardWidth + colGap);
			const y = colHeights[minCol];
			const estHeight = 44 + table.columns.length * 30 + 12;

			map.set(table.name, {
				table,
				x,
				y,
				width: cardWidth,
				height: estHeight
			});

			colHeights[minCol] += estHeight + rowGap;
		});

		return map;
	});

	// Generate orthogonal SVG connector paths between related tables
	interface ConnectionPath {
		id: string;
		d: string;
		fromTable: string;
		toTable: string;
		fromCol: string;
		toCol: string;
		isHighlighted: boolean;
	}

	let connections = $derived.by((): ConnectionPath[] => {
		const paths: ConnectionPath[] = [];
		const activeHover = hoveredTable || selectedTable;

		tablePositions.forEach((fromPos, tableName) => {
			fromPos.table.relationships.forEach((rel) => {
				const toPos = tablePositions.get(rel.referencedRelation);
				if (!toPos) return;

				// Find column index for vertical anchor point
				const fromColIdx = Math.max(
					0,
					fromPos.table.columns.findIndex((c) => rel.columns.includes(c.name))
				);
				const toColIdx = Math.max(
					0,
					toPos.table.columns.findIndex((c) => rel.referencedColumns.includes(c.name))
				);

				const startY = fromPos.y + 44 + fromColIdx * 30 + 15;
				const endY = toPos.y + 44 + toColIdx * 30 + 15;

				let startX: number;
				let endX: number;
				let d = '';

				if (fromPos.x < toPos.x) {
					// from on left, to on right
					startX = fromPos.x + fromPos.width;
					endX = toPos.x;
					const midX = startX + (endX - startX) / 2;
					d = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
				} else if (fromPos.x > toPos.x) {
					// from on right, to on left
					startX = fromPos.x;
					endX = toPos.x + toPos.width;
					const midX = endX + (startX - endX) / 2;
					d = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
				} else {
					// Same column
					startX = fromPos.x + fromPos.width;
					endX = toPos.x + toPos.width;
					const loopX = Math.max(startX, endX) + 40;
					d = `M ${startX} ${startY} L ${loopX} ${startY} L ${loopX} ${endY} L ${endX} ${endY}`;
				}

				const isHighlighted =
					activeHover === tableName || activeHover === rel.referencedRelation;

				paths.push({
					id: `${tableName}-${rel.foreignKeyName}-${rel.referencedRelation}`,
					d,
					fromTable: tableName,
					toTable: rel.referencedRelation,
					fromCol: rel.columns.join(', '),
					toCol: rel.referencedColumns.join(', '),
					isHighlighted
				});
			});
		});

		return paths;
	});

	function handleMouseDown(e: MouseEvent) {
		// Only drag canvas on background click
		if ((e.target as HTMLElement).closest('.erd-node')) return;
		isDragging = true;
		dragStartX = e.clientX - panX;
		dragStartY = e.clientY - panY;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		panX = e.clientX - dragStartX;
		panY = e.clientY - dragStartY;
	}

	function handleMouseUp() {
		isDragging = false;
	}

	function resetView() {
		zoom = 1;
		panX = 0;
		panY = 0;
		selectedTable = null;
	}

	function zoomIn() {
		zoom = Math.min(2.2, zoom * 1.2);
	}

	function zoomOut() {
		zoom = Math.max(0.4, zoom / 1.2);
	}
</script>

<div class="schema-live-container">
	<!-- ERD Toolbar Header -->
	<div class="erd-top-toolbar">
		<div class="toolbar-left">
			<div class="title-cluster">
				<span class="toolbar-icon">⚡</span>
				<span class="toolbar-title">Database Schema ERD</span>
				<span class="count-badge">{filteredSchemaTables.length} tables</span>
			</div>
		</div>

		<div class="toolbar-center">
			<div class="scope-toggle">
				<button
					class:active={schemaScope === 'feature'}
					onclick={() => (schemaScope = 'feature')}
				>
					{featureFolder || 'This Feature'}
				</button>
				<button
					class:active={schemaScope === 'all'}
					onclick={() => (schemaScope = 'all')}
				>
					All Tables ({schema?.tables?.length || 0})
				</button>
			</div>

			<div class="search-box">
				<span class="search-icon">🔍</span>
				<input
					type="search"
					placeholder="Search tables & fields..."
					bind:value={schemaSearch}
					class="schema-search-input"
				/>
			</div>
		</div>

		<div class="toolbar-right">
			<div class="view-toggle">
				<button
					class:active={viewMode === 'erd'}
					onclick={() => (viewMode = 'erd')}
					title="Interactive ERD Diagram"
				>
					🕸️ ERD Canvas
				</button>
				<button
					class:active={viewMode === 'cards'}
					onclick={() => (viewMode = 'cards')}
					title="Table List View"
				>
					📋 Cards
				</button>
			</div>

			{#if viewMode === 'erd'}
				<div class="zoom-controls">
					<button onclick={zoomOut} title="Zoom Out">−</button>
					<button onclick={resetView} class="zoom-level" title="Reset View">{Math.round(zoom * 100)}%</button>
					<button onclick={zoomIn} title="Zoom In">+</button>
				</div>
			{/if}
		</div>
	</div>

	{#if viewMode === 'erd'}
		<!-- Dark Blueprint / Dot Grid ERD Canvas -->
		<div
			class="erd-canvas-viewport"
			onmousedown={handleMouseDown}
			onmousemove={handleMouseMove}
			onmouseup={handleMouseUp}
			onmouseleave={handleMouseUp}
			role="region"
			aria-label="ERD Canvas"
			tabindex="0"
		>
			<div
				class="erd-canvas-layer"
				style="transform: translate({panX}px, {panY}px) scale({zoom});"
			>
				<!-- SVG Orthogonal Relationship Lines -->
				<svg class="erd-connections-svg">
					<defs>
						<marker
							id="arrowhead"
							viewBox="0 0 10 10"
							refX="8"
							refY="5"
							markerWidth="6"
							markerHeight="6"
							orient="auto-start-reverse"
						>
							<path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#71717a" />
						</marker>
						<marker
							id="arrowhead-active"
							viewBox="0 0 10 10"
							refX="8"
							refY="5"
							markerWidth="6"
							markerHeight="6"
							orient="auto-start-reverse"
						>
							<path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3b82f6" />
						</marker>
					</defs>

					{#each connections as conn (conn.id)}
						<path
							d={conn.d}
							class="erd-connector {conn.isHighlighted ? 'highlighted' : ''}"
							marker-end={conn.isHighlighted ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
						/>
					{/each}
				</svg>

				<!-- Schema Table Nodes -->
				{#each filteredSchemaTables as table (table.name)}
					{@const pos = tablePositions.get(table.name)}
					{#if pos}
						<div
							class="erd-node"
							class:highlighted={hoveredTable === table.name || selectedTable === table.name}
							style="left: {pos.x}px; top: {pos.y}px; width: {pos.width}px;"
							onmouseenter={() => (hoveredTable = table.name)}
							onmouseleave={() => (hoveredTable = null)}
							onclick={() => (selectedTable = selectedTable === table.name ? null : table.name)}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && (selectedTable = table.name)}
						>
							<!-- Table Header -->
							<div class="erd-node-header">
								<div class="header-left-group">
									<span class="table-glyph">⊞</span>
									<span class="table-name">{table.name}</span>
								</div>
								<div class="header-right-menu">
									<span class="dots-glyph">⋮</span>
								</div>
							</div>

							<!-- Table Columns -->
							<div class="erd-node-columns">
								{#each table.columns as col}
									{@const isPk = col.isPrimaryKey || col.name === 'id'}
									{@const isFk = table.relationships.some((r) => r.columns.includes(col.name))}
									<div class="erd-column-row" class:pk-row={isPk} class:fk-row={isFk}>
										<div class="col-left">
											<!-- Diamond or Key Icon Indicator -->
											{#if isPk}
												<span class="col-glyph key-glyph" title="Primary Key">🔑</span>
											{:else if isFk}
												<span class="col-glyph fk-glyph" title="Foreign Key">◆</span>
											{:else if col.isNullable}
												<span class="col-glyph null-diamond" title="Nullable">◇</span>
											{:else}
												<span class="col-glyph filled-diamond" title="Not Null">◆</span>
											{/if}

											{#if isPk}
												<span class="hash-glyph">#</span>
											{/if}

											<span class="col-name">{col.name}</span>
										</div>

										<span class="col-type">{col.type}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/each}
			</div>

			<!-- Canvas Footer / Navigation Hint -->
			<div class="canvas-hints">
				<span>💡 Drag to pan • Click table to inspect</span>
			</div>
		</div>
	{:else}
		<!-- Fallback Grid Cards View -->
		<div class="schema-tables-grid">
			{#each filteredSchemaTables as table}
				<div class="schema-table-card">
					<div class="table-card-header">
						<span class="table-icon">⊞</span>
						<span class="table-name-text">{table.name}</span>
						<span class="col-count">{table.columns.length} columns</span>
					</div>

					<table class="columns-table">
						<thead>
							<tr>
								<th>Column</th>
								<th>Type</th>
								<th>Nullable</th>
							</tr>
						</thead>
						<tbody>
							{#each table.columns as col}
								<tr>
									<td class="col-name-cell">
										<code>{col.name}</code>
									</td>
									<td class="col-type-cell">
										<span class="type-pill">{col.type}</span>
									</td>
									<td class="col-null-cell">
										{col.isNullable ? 'YES' : 'NO'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>

					{#if table.relationships && table.relationships.length > 0}
						<div class="table-relations">
							<span class="rel-title">Foreign Keys:</span>
							{#each table.relationships as rel}
								<div class="rel-item">
									<span>↳ <code>{rel.columns.join(', ')}</code> → <code>{rel.referencedRelation}({rel.referencedColumns.join(', ')})</code></span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.schema-live-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1rem;
		width: 100%;
	}

	/* Top Controls Toolbar */
	.erd-top-toolbar {
		background: #121214;
		border: 1px solid #27272a;
		border-radius: 8px;
		padding: 0.5rem 0.875rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.toolbar-left,
	.toolbar-center,
	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.title-cluster {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.toolbar-icon {
		font-size: 0.875rem;
		color: #e4e4e7;
	}

	.toolbar-title {
		font-size: 0.8125rem;
		font-weight: 700;
		color: #f4f4f5;
		letter-spacing: -0.01em;
	}

	.count-badge {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		background: #27272a;
		color: #a1a1aa;
		padding: 0.125rem 0.4375rem;
		border-radius: 4px;
	}

	.scope-toggle,
	.view-toggle {
		display: flex;
		background: #18181b;
		border: 1px solid #27272a;
		border-radius: 6px;
		padding: 2px;
	}

	.scope-toggle button,
	.view-toggle button {
		background: transparent;
		border: none;
		font-size: 0.6875rem;
		font-weight: 600;
		color: #a1a1aa;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.scope-toggle button.active,
	.view-toggle button.active {
		background: #27272a;
		color: #f4f4f5;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
	}

	.search-box {
		display: flex;
		align-items: center;
		background: #18181b;
		border: 1px solid #27272a;
		border-radius: 6px;
		padding: 0 0.5rem;
	}

	.search-icon {
		font-size: 0.75rem;
		color: #71717a;
	}

	.schema-search-input {
		background: transparent;
		border: none;
		padding: 0.3125rem 0.375rem;
		font-size: 0.75rem;
		color: #f4f4f5;
		outline: none;
		min-width: 170px;
	}

	.schema-search-input::placeholder {
		color: #71717a;
	}

	.zoom-controls {
		display: flex;
		align-items: center;
		background: #18181b;
		border: 1px solid #27272a;
		border-radius: 6px;
		padding: 2px;
	}

	.zoom-controls button {
		background: transparent;
		border: none;
		color: #a1a1aa;
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		font-family: var(--font-mono);
	}

	.zoom-controls button:hover {
		color: #f4f4f5;
	}

	.zoom-level {
		font-size: 0.6875rem !important;
		min-width: 44px;
		text-align: center;
	}

	/* Dark Blueprint ERD Canvas */
	.erd-canvas-viewport {
		position: relative;
		width: 100%;
		height: 720px;
		background-color: #0d0e11;
		background-image: radial-gradient(#27272a 1px, transparent 1px);
		background-size: 20px 20px;
		border: 1px solid #27272a;
		border-radius: 8px;
		overflow: hidden;
		user-select: none;
		cursor: grab;
	}

	.erd-canvas-viewport:active {
		cursor: grabbing;
	}

	.erd-canvas-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 4000px;
		height: 4000px;
		transform-origin: 0 0;
		transition: transform 0.05s linear;
	}

	.erd-connections-svg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 1;
	}

	.erd-connector {
		fill: none;
		stroke: #52525b;
		stroke-width: 1.25px;
		stroke-dasharray: none;
		transition: stroke 0.2s, stroke-width 0.2s;
	}

	.erd-connector.highlighted {
		stroke: #3b82f6;
		stroke-width: 2px;
		z-index: 10;
	}

	/* Dark Floating Table Card Node */
	.erd-node {
		position: absolute;
		background: #141416;
		border: 1px solid #27272a;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
		z-index: 5;
		overflow: hidden;
		cursor: pointer;
		transition: border-color 0.15s, box-shadow 0.15s;
		font-family: var(--font-mono, ui-monospace, monospace);
	}

	.erd-node:hover {
		border-color: #3f3f46;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.8);
	}

	.erd-node.highlighted {
		border-color: #3b82f6;
		box-shadow: 0 0 0 1px #3b82f6, 0 8px 30px rgba(0, 0, 0, 0.9);
	}

	.erd-node-header {
		background: #18181b;
		padding: 0.5rem 0.75rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid #27272a;
	}

	.header-left-group {
		display: flex;
		align-items: center;
		gap: 0.4375rem;
	}

	.table-glyph {
		font-size: 0.8125rem;
		color: #a1a1aa;
	}

	.table-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #f4f4f5;
		letter-spacing: -0.01em;
	}

	.dots-glyph {
		color: #71717a;
		font-size: 0.875rem;
	}

	.erd-node-columns {
		padding: 0.25rem 0;
	}

	.erd-column-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.3125rem 0.75rem;
		font-size: 0.75rem;
		border-bottom: 1px solid rgba(39, 39, 42, 0.4);
		transition: background 0.1s;
	}

	.erd-column-row:last-child {
		border-bottom: none;
	}

	.erd-column-row:hover {
		background: #1c1c20;
	}

	.col-left {
		display: flex;
		align-items: center;
		gap: 0.4375rem;
		min-width: 0;
	}

	.col-glyph {
		font-size: 0.625rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.key-glyph {
		font-size: 0.6875rem;
	}

	.filled-diamond {
		color: #a1a1aa;
	}

	.null-diamond {
		color: #71717a;
	}

	.fk-glyph {
		color: #60a5fa;
	}

	.hash-glyph {
		font-size: 0.6875rem;
		color: #a1a1aa;
		margin-right: -0.125rem;
	}

	.col-name {
		color: #d4d4d8;
		font-size: 0.75rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.col-type {
		color: #71717a;
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		padding-left: 0.5rem;
		flex-shrink: 0;
	}

	.canvas-hints {
		position: absolute;
		bottom: 0.75rem;
		left: 0.875rem;
		background: rgba(18, 18, 20, 0.85);
		border: 1px solid #27272a;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
		color: #a1a1aa;
		pointer-events: none;
		z-index: 20;
	}

	/* Fallback Cards Grid */
	.schema-tables-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
		gap: 1.25rem;
	}

	.schema-table-card {
		background: #141416;
		border: 1px solid #27272a;
		border-radius: 8px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.table-card-header {
		background: #18181b;
		border-bottom: 1px solid #27272a;
		padding: 0.625rem 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.table-icon {
		color: #a1a1aa;
	}

	.table-name-text {
		font-size: 0.8125rem;
		font-weight: 700;
		font-family: var(--font-mono);
		color: #f4f4f5;
		flex: 1;
	}

	.col-count {
		font-size: 0.6875rem;
		color: #71717a;
		font-family: var(--font-mono);
	}

	.columns-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	.columns-table th {
		text-align: left;
		padding: 0.375rem 0.75rem;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		color: #71717a;
		border-bottom: 1px solid #27272a;
		background: #121214;
	}

	.columns-table td {
		padding: 0.375rem 0.75rem;
		border-bottom: 1px solid #27272a;
	}

	.columns-table tr:last-child td {
		border-bottom: none;
	}

	.col-name-cell code {
		font-family: var(--font-mono);
		font-weight: 600;
		color: #f4f4f5;
	}

	.type-pill {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		padding: 0.0625rem 0.3125rem;
		border-radius: 4px;
		background: rgba(59, 130, 246, 0.1);
		color: #60a5fa;
		border: 1px solid rgba(59, 130, 246, 0.2);
	}

	.col-null-cell {
		font-size: 0.625rem;
		font-family: var(--font-mono);
		color: #71717a;
	}

	.table-relations {
		background: #121214;
		border-top: 1px solid #27272a;
		padding: 0.5rem 0.75rem;
		font-size: 0.6875rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.rel-title {
		font-weight: 700;
		color: #71717a;
		font-size: 0.625rem;
		text-transform: uppercase;
	}

	.rel-item {
		color: #a1a1aa;
		font-family: var(--font-mono);
		font-size: 0.6875rem;
	}
</style>

