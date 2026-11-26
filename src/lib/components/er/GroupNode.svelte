<script lang="ts">
	import { NodeResizer, type NodeProps } from '@xyflow/svelte';
	import { erStore } from '$lib/stores/er.svelte';
	import type { ErGroup } from '$lib/types/er';

	interface GroupNodeData {
		group: ErGroup;
		tableCount: number;
		noteCount?: number;
	}

	let { data, selected }: NodeProps & { data: GroupNodeData } = $props();

	const group = $derived(data.group);
	const tableCount = $derived(data.tableCount ?? 0);
	const noteCount = $derived(data.noteCount ?? 0);
	const isLoaded = $derived(!!erStore.loadedGroupKeys[group.id]);

	const COLOR_MAP: Record<string, { border: string; bg: string; badge: string }> = {
		slate: {
			border: 'rgba(148, 163, 184, 0.45)',
			bg: 'rgba(148, 163, 184, 0.06)',
			badge: '#94a3b8'
		},
		blue: {
			border: 'rgba(59, 130, 246, 0.45)',
			bg: 'rgba(59, 130, 246, 0.06)',
			badge: '#3b82f6'
		},
		emerald: {
			border: 'rgba(16, 185, 129, 0.45)',
			bg: 'rgba(16, 185, 129, 0.06)',
			badge: '#10b981'
		},
		amber: {
			border: 'rgba(245, 158, 11, 0.45)',
			bg: 'rgba(245, 158, 11, 0.06)',
			badge: '#f59e0b'
		},
		rose: {
			border: 'rgba(244, 63, 94, 0.45)',
			bg: 'rgba(244, 63, 94, 0.06)',
			badge: '#f43f5e'
		},
		violet: {
			border: 'rgba(139, 92, 246, 0.45)',
			bg: 'rgba(139, 92, 246, 0.06)',
			badge: '#8b5cf6'
		}
	};

	const palette = $derived(COLOR_MAP[group.color] ?? COLOR_MAP.slate);

	async function handleResizeEnd(
		_event: unknown,
		params: { x: number; y: number; width: number; height: number }
	) {
		await erStore.updateGroup(group.id, {
			position: {
				x: Math.round(params.x),
				y: Math.round(params.y),
				width: Math.round(params.width),
				height: Math.round(params.height)
			}
		});
	}
</script>

<NodeResizer
	isVisible={selected}
	minWidth={280}
	minHeight={200}
	color={palette.badge}
	onResizeEnd={handleResizeEnd}
/>

<div
	class="er-group-node"
	class:selected
	style:border-color={selected ? palette.badge : palette.border}
	style:background={palette.bg}
>
	<header class="er-group-header">
		<span class="er-group-dot" style:background={palette.badge}></span>
		<span class="er-group-name">{group.name}</span>
		<span class="er-group-count">{tableCount}</span>
		{#if noteCount > 0}
			<span class="er-group-note-badge" title="{noteCount} note(s)">{noteCount}</span>
		{/if}
	</header>

	{#if !isLoaded && tableCount > 0}
		<div class="er-group-lazy-hint">
			Click group to load {tableCount} table(s)
		</div>
	{/if}
</div>

<style>
	.er-group-node {
		width: 100%;
		height: 100%;
		min-width: 280px;
		min-height: 200px;
		border: 1.5px dashed;
		border-radius: 10px;
		box-sizing: border-box;
		pointer-events: all;
	}

	.er-group-header {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin: 8px 10px;
		padding: 3px 8px;
		border-radius: 6px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		font-size: 12px;
		color: var(--text-primary);
	}

	.er-group-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.er-group-name {
		font-weight: 600;
	}

	.er-group-count,
	.er-group-note-badge {
		font-size: 10px;
		font-weight: 600;
		padding: 0 5px;
		border-radius: 4px;
		background: var(--bg-tertiary);
		color: var(--text-secondary);
	}

	.er-group-note-badge {
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.er-group-lazy-hint {
		margin: 24px 12px;
		font-size: 11px;
		color: var(--text-secondary);
		font-style: italic;
	}
</style>
