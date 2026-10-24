<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { notesStore } from '$lib/state/notes.svelte';
	import type { GraphNode, GraphEdge } from '$lib/types/notes';
	import {
		stepSimulation,
		initializeNodePositions,
		type SimulationConfig,
		DEFAULT_SIM_CONFIG
	} from './graph-physics';
	import GraphControls from './GraphControls.svelte';

	let {
		nodes = [],
		edges = [],
		highlightNodeId = null,
		isMini = false,
		onNodeClick
	} = $props<{
		nodes?: GraphNode[];
		edges?: GraphEdge[];
		highlightNodeId?: string | null;
		isMini?: boolean;
		onNodeClick?: (nodeId: string, isGhost: boolean, title: string) => void;
	}>();

	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let animationFrameId: number | null = null;
	let isHUDExpanded = $state<boolean>(false);

	// Pan & Zoom Camera transform
	let cameraX = $state<number>(0);
	let cameraY = $state<number>(0);
	let cameraZoom = $state<number>(1);

	// Mouse interaction states
	let isPanning = $state<boolean>(false);
	let panStartX = 0;
	let panStartY = 0;

	let draggedNode = $state<GraphNode | null>(null);
	let hoveredNode = $state<GraphNode | null>(null);

	// Internal clone of nodes to maintain local physics coordinates across renders
	let localNodes = $state<GraphNode[]>([]);
	let localEdges = $state<GraphEdge[]>([]);

	// Sync incoming nodes/edges props with physics layout
	$effect(() => {
		const incomingNodes = nodes;
		const incomingEdges = edges;

		untrack(() => {
			// Merge positions from previous localNodes if exists
			const prevMap = new Map<string, GraphNode>();
			for (const n of localNodes) {
				prevMap.set(n.id, n);
			}

			const merged: GraphNode[] = (incomingNodes || []).map((n: GraphNode) => {
				const prev = prevMap.get(n.id);
				return {
					...n,
					x: prev ? prev.x : n.x,
					y: prev ? prev.y : n.y,
					vx: prev ? prev.vx : 0,
					vy: prev ? prev.vy : 0
				};
			});

			initializeNodePositions(merged, isMini ? 80 : 250);
			localNodes = merged;
			localEdges = incomingEdges || [];
		});
	});

	onMount(() => {
		const canvas = canvasEl;
		if (!canvas) return;

		const resizeObserver = new ResizeObserver(() => {
			updateCanvasSize();
		});
		resizeObserver.observe(canvas.parentElement || canvas);

		updateCanvasSize();
		startRenderLoop();

		return () => {
			resizeObserver.disconnect();
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	});

	function updateCanvasSize() {
		if (!canvasEl) return;
		const rect = canvasEl.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		canvasEl.width = rect.width * dpr;
		canvasEl.height = rect.height * dpr;
	}

	function resetView() {
		cameraX = 0;
		cameraY = 0;
		cameraZoom = isMini ? 0.9 : 1;
	}

	function startRenderLoop() {
		const loop = () => {
			tickAndRender();
			animationFrameId = requestAnimationFrame(loop);
		};
		animationFrameId = requestAnimationFrame(loop);
	}

	function tickAndRender() {
		if (!canvasEl) return;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		const width = canvasEl.width;
		const height = canvasEl.height;

		// 1. Step physics simulation
		const simConfig: SimulationConfig = {
			repulsion: notesStore.graphPhysicsRepulsion,
			linkDistance: notesStore.graphPhysicsLinkDistance,
			centerForce: notesStore.graphPhysicsCenterForce,
			damping: 0.88,
			minDelta: 0.01
		};
		stepSimulation(localNodes, localEdges, simConfig, draggedNode?.id);

		// 2. Fetch active computed theme tokens from canvas element
		const computedStyle = getComputedStyle(canvasEl);
		const bgPrimary = computedStyle.getPropertyValue('--bg-primary').trim() || '#f6f4ee';
		const textPrimary = computedStyle.getPropertyValue('--text-primary').trim() || '#2c2825';
		const textSecondary = computedStyle.getPropertyValue('--text-secondary').trim() || '#6b625b';
		const textMuted = computedStyle.getPropertyValue('--text-muted').trim() || '#948b82';
		const borderSubtle = computedStyle.getPropertyValue('--border-subtle').trim() || '#e3ddd1';
		const primaryColor = computedStyle.getPropertyValue('--primary').trim() || '#9e5a3c';
		const warningColor = computedStyle.getPropertyValue('--warning').trim() || '#f59e0b';
		const bgSecondary = computedStyle.getPropertyValue('--bg-secondary').trim() || '#ffffff';

		// Clear canvas and draw matching solid theme background
		ctx.fillStyle = bgPrimary;
		ctx.fillRect(0, 0, width, height);

		// 3. Save transform and set camera
		ctx.save();
		// Center of canvas
		ctx.translate(width / 2, height / 2);
		ctx.scale(cameraZoom * dpr, cameraZoom * dpr);
		ctx.translate(cameraX, cameraY);

		// 4. Render Edges
		const nodeMap = new Map<string, GraphNode>();
		for (const n of localNodes) {
			nodeMap.set(n.id, n);
		}

		const isEdgeHighlighted = (sourceId: string, targetId: string) => {
			const activeId = hoveredNode?.id || highlightNodeId;
			if (!activeId) return false;
			return sourceId === activeId || targetId === activeId;
		};

		for (const edge of localEdges) {
			const source = nodeMap.get(edge.source);
			const target = nodeMap.get(edge.target);
			if (!source || !target) continue;

			const highlighted = isEdgeHighlighted(edge.source, edge.target);

			ctx.beginPath();
			ctx.moveTo(source.x, source.y);
			ctx.lineTo(target.x, target.y);

			if (highlighted) {
				ctx.strokeStyle = primaryColor; // Bright active edge in theme brand color
				ctx.lineWidth = 2.2 / cameraZoom;
			} else {
				ctx.strokeStyle = borderSubtle; // Subtle theme border color
				ctx.lineWidth = 1.2 / cameraZoom;
			}
			ctx.stroke();
		}

		// 5. Render Nodes
		for (const node of localNodes) {
			const isHovered = hoveredNode?.id === node.id;
			const isCenterActive = highlightNodeId === node.id;
			const radius = (node.radius || 5) * (isHovered || isCenterActive ? 1.3 : 1);

			ctx.beginPath();
			ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

			if (node.isGhost) {
				// Ghost node (uncreated note link): hollow circle with dashed border
				ctx.fillStyle = bgSecondary;
				ctx.fill();
				ctx.strokeStyle = isHovered ? warningColor : textMuted;
				ctx.lineWidth = 1.5 / cameraZoom;
				ctx.setLineDash([3, 3]);
				ctx.stroke();
				ctx.setLineDash([]);
			} else if (isCenterActive) {
				// Currently active note node: highlighted theme primary
				ctx.fillStyle = primaryColor;
				ctx.fill();
				ctx.strokeStyle = bgSecondary;
				ctx.lineWidth = 2 / cameraZoom;
				ctx.stroke();
			} else {
				// Standard resolved note node: theme text secondary fill with subtle border
				ctx.fillStyle = isHovered ? primaryColor : textSecondary;
				ctx.fill();
				ctx.strokeStyle = bgSecondary;
				ctx.lineWidth = 1.2 / cameraZoom;
				ctx.stroke();
			}

			// Render title label if zoomed in, hovered, active, or large degree
			const shouldRenderLabel =
				!isMini && (cameraZoom >= 0.7 || isHovered || isCenterActive || node.degree >= 2);

			if (shouldRenderLabel) {
				ctx.font = `${isHovered || isCenterActive ? 'bold ' : ''}${Math.max(10, 11 / cameraZoom)}px system-ui, sans-serif`;
				ctx.fillStyle = isHovered || isCenterActive ? primaryColor : textPrimary;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'top';
				ctx.fillText(node.title, node.x, node.y + radius + 4);
			}
		}

		ctx.restore();
	}

	// --- Canvas Event Handlers (Pan, Zoom, Drag, Click) ---

	function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
		if (!canvasEl) return { x: 0, y: 0 };
		const rect = canvasEl.getBoundingClientRect();
		const clientX = e.clientX - rect.left;
		const clientY = e.clientY - rect.top;

		// Convert screen position to virtual simulation coordinates
		const cx = clientX - rect.width / 2;
		const cy = clientY - rect.height / 2;

		const worldX = cx / cameraZoom - cameraX;
		const worldY = cy / cameraZoom - cameraY;

		return { x: worldX, y: worldY };
	}

	function findNodeAt(coords: { x: number; y: number }): GraphNode | null {
		const hitThreshold = 10 / cameraZoom;
		for (let i = localNodes.length - 1; i >= 0; i--) {
			const node = localNodes[i];
			const dx = node.x - coords.x;
			const dy = node.y - coords.y;
			const hitRadius = (node.radius || 6) + hitThreshold;
			if (dx * dx + dy * dy <= hitRadius * hitRadius) {
				return node;
			}
		}
		return null;
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.button !== 0) return; // Only primary button
		const coords = getCanvasCoords(e);
		const hit = findNodeAt(coords);

		if (hit) {
			draggedNode = hit;
		} else {
			isPanning = true;
			panStartX = e.clientX;
			panStartY = e.clientY;
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (draggedNode) {
			const coords = getCanvasCoords(e);
			draggedNode.x = coords.x;
			draggedNode.y = coords.y;
			draggedNode.vx = 0;
			draggedNode.vy = 0;
		} else if (isPanning) {
			const dx = (e.clientX - panStartX) / cameraZoom;
			const dy = (e.clientY - panStartY) / cameraZoom;
			cameraX += dx;
			cameraY += dy;
			panStartX = e.clientX;
			panStartY = e.clientY;
		} else {
			const coords = getCanvasCoords(e);
			hoveredNode = findNodeAt(coords);
		}
	}

	function handleMouseUp(e: MouseEvent) {
		if (draggedNode) {
			// If not significantly moved, count as click
			draggedNode = null;
		}
		isPanning = false;
	}

	function handleClick(e: MouseEvent) {
		const coords = getCanvasCoords(e);
		const hit = findNodeAt(coords);
		if (hit) {
			if (onNodeClick) {
				onNodeClick(hit.id, hit.isGhost, hit.title);
			} else {
				// Default navigation
				if (hit.isGhost) {
					notesStore.createNewNote(hit.title);
				} else {
					notesStore.openNoteInActivePane(hit.id);
				}
			}
		}
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
		const nextZoom = Math.min(3.5, Math.max(0.2, cameraZoom * zoomFactor));
		cameraZoom = nextZoom;
	}
</script>

<div class="graph-canvas-wrapper" class:mini={isMini}>
	<canvas
		bind:this={canvasEl}
		class="graph-canvas"
		class:grabbing={isPanning || !!draggedNode}
		class:pointer={!!hoveredNode}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onclick={handleClick}
		onwheel={handleWheel}
	></canvas>

	{#if !isMini}
		<GraphControls
			bind:isExpanded={isHUDExpanded}
			onResetView={resetView}
		/>
	{/if}

	{#if localNodes.length === 0}
		<div class="graph-empty-overlay">
			<p>No notes or connections to display.</p>
		</div>
	{/if}
</div>

<style>
	.graph-canvas-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: var(--bg-primary);
	}

	.graph-canvas {
		width: 100%;
		height: 100%;
		display: block;
		cursor: grab;
	}

	.graph-canvas.grabbing {
		cursor: grabbing;
	}

	.graph-canvas.pointer {
		cursor: pointer;
	}

	.graph-empty-overlay {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: var(--text-muted);
		font-size: 13px;
		pointer-events: none;
	}
</style>
