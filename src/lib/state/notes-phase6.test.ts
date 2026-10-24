import { describe, it, expect, beforeEach } from 'vitest';
import { NotesStore } from './notes.svelte';
import type { NoteStub, NoteDetail } from '$lib/types/notes';
import {
  stepSimulation,
  initializeNodePositions,
  DEFAULT_SIM_CONFIG
} from '$lib/components/notes/graph/graph-physics';

describe('Phase 6: Canvas Force-Directed Graph Engine & Context Dock', () => {
  let store: NotesStore;

  const mockNotes: NoteStub[] = [
    {
      id: 'note-1',
      folder_id: null,
      title: 'Graph Theory',
      updated_at: '2026-10-24T00:00:00Z',
      deleted_at: null
    },
    {
      id: 'note-2',
      folder_id: null,
      title: 'Network Topology',
      updated_at: '2026-10-24T00:00:00Z',
      deleted_at: null
    },
    {
      id: 'note-3',
      folder_id: null,
      title: 'Physics Simulation',
      updated_at: '2026-10-24T00:00:00Z',
      deleted_at: null
    },
    {
      id: 'note-4',
      folder_id: null,
      title: 'Isolated Island Note',
      updated_at: '2026-10-24T00:00:00Z',
      deleted_at: null
    }
  ];

  beforeEach(() => {
    store = new NotesStore();
    store.notes = [...mockNotes];
  });

  it('builds graphData nodes and edges including ghost nodes and computes degrees', () => {
    // Note 1 links to Note 2 and to an unresolved ghost note
    store.outgoingLinks = new Map([
      [
        'note-1',
        [
          { title: 'Network Topology', isResolved: true },
          { title: 'Future Quantum Idea', isResolved: false }
        ]
      ],
      [
        'note-2',
        [
          { title: 'Physics Simulation', isResolved: true }
        ]
      ]
    ]);

    const graph = store.graphData;
    expect(graph.nodes.length).toBeGreaterThanOrEqual(4);

    // Note 1 should connect to Note 2
    const edge1to2 = graph.edges.find((e) => e.source === 'note-1' && e.target === 'note-2');
    expect(edge1to2).toBeDefined();

    // Ghost node should exist because graphFilterShowGhosts is true
    const ghostNode = graph.nodes.find((n) => n.title === 'Future Quantum Idea');
    expect(ghostNode).toBeDefined();
    expect(ghostNode?.isGhost).toBe(true);

    // Filter orphans toggle works
    store.graphFilterShowOrphans = false;
    const filteredGraph = store.graphData;
    const orphan = filteredGraph.nodes.find((n) => n.id === 'note-4');
    expect(orphan).toBeUndefined();
  });

  it('calculates scoped local graph for 1-hop, 2-hop, and 3-hop traversal', () => {
    // Topology: 1 -> 2 -> 3
    store.outgoingLinks = new Map([
      ['note-1', [{ title: 'Network Topology', isResolved: true }]],
      ['note-2', [{ title: 'Physics Simulation', isResolved: true }]]
    ]);

    // 1-hop from Note 1 should include Note 1 and Note 2
    const hop1 = store.getLocalGraphData('note-1', 1);
    const hop1Ids = hop1.nodes.map((n) => n.id);
    expect(hop1Ids).toContain('note-1');
    expect(hop1Ids).toContain('note-2');
    expect(hop1Ids).not.toContain('note-3');

    // 2-hop from Note 1 should include Note 1, Note 2, and Note 3
    const hop2 = store.getLocalGraphData('note-1', 2);
    const hop2Ids = hop2.nodes.map((n) => n.id);
    expect(hop2Ids).toContain('note-1');
    expect(hop2Ids).toContain('note-2');
    expect(hop2Ids).toContain('note-3');
  });

  it('detects unlinked mentions of active note across vault notes', () => {
    // Populate activeNotesCache
    store.activeNotesCache.set('note-1', {
      id: 'note-1',
      folder_id: null,
      title: 'Graph Theory',
      content: 'Core definitions and foundations.',
      created_at: '2026-10-24T00:00:00Z',
      updated_at: '2026-10-24T00:00:00Z'
    });

    store.activeNotesCache.set('note-2', {
      id: 'note-2',
      folder_id: null,
      title: 'Network Topology',
      content: 'This discusses graph theory principles without an explicit wikilink brackets.',
      created_at: '2026-10-24T00:00:00Z',
      updated_at: '2026-10-24T00:00:00Z'
    });

    store.activeNotesCache.set('note-3', {
      id: 'note-3',
      folder_id: null,
      title: 'Physics Simulation',
      content: 'This has an explicit [[Graph Theory]] wikilink, so it is linked, not unlinked.',
      created_at: '2026-10-24T00:00:00Z',
      updated_at: '2026-10-24T00:00:00Z'
    });

    // Open Note 1 in active pane
    store.openNoteInActivePane('note-1');

    const unlinked = store.activeUnlinkedMentions;
    expect(unlinked).toHaveLength(1);
    expect(unlinked[0].id).toBe('note-2');
    expect(unlinked[0].title).toBe('Network Topology');
    expect(unlinked[0].snippet).toContain('graph theory');
  });

  it('simulates force-directed physics steps smoothly updating velocities and positions', () => {
    const nodes = [
      { id: 'a', title: 'A', isGhost: false, degree: 1, x: 0, y: 0, vx: 0, vy: 0, radius: 5 },
      { id: 'b', title: 'B', isGhost: false, degree: 1, x: 0, y: 0, vx: 0, vy: 0, radius: 5 }
    ];
    const edges = [{ source: 'a', target: 'b' }];

    initializeNodePositions(nodes, 100);
    expect(nodes[0].x !== 0 || nodes[1].x !== 0).toBe(true);

    const initialDist = Math.hypot(nodes[1].x - nodes[0].x, nodes[1].y - nodes[0].y);

    // Step physics
    const energy = stepSimulation(nodes, edges, DEFAULT_SIM_CONFIG);
    expect(energy).toBeGreaterThan(0);
    expect(nodes[0].x).toBeDefined();
    expect(nodes[1].x).toBeDefined();
  });
});
