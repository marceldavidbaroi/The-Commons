import type { GraphNode, GraphEdge } from '$lib/types/notes';

export interface SimulationConfig {
  repulsion: number;       // Repulsion strength between nodes
  linkDistance: number;    // Ideal link distance
  centerForce: number;     // Force pulling towards canvas center (0,0)
  damping: number;         // Velocity decay per frame (e.g., 0.85 - 0.9)
  minDelta: number;        // Energy threshold to sleep simulation
}

export const DEFAULT_SIM_CONFIG: SimulationConfig = {
  repulsion: 450,
  linkDistance: 80,
  centerForce: 0.04,
  damping: 0.88,
  minDelta: 0.01
};

/**
 * Step the force-directed layout simulation by 1 tick.
 * Updates node positions (x, y) and velocities (vx, vy) in-place.
 * Returns total kinetic energy / delta to determine if stable.
 */
export function stepSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: SimulationConfig = DEFAULT_SIM_CONFIG,
  fixedNodeId?: string | null
): number {
  if (nodes.length === 0) return 0;

  const nodeMap = new Map<string, GraphNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  // 1. Repulsion force between all node pairs (Coulomb's Law approximation)
  for (let i = 0; i < nodes.length; i++) {
    const n1 = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const n2 = nodes[j];

      let dx = n2.x - n1.x;
      let dy = n2.y - n1.y;
      let distSq = dx * dx + dy * dy;

      if (distSq < 1) {
        // Prevent division by zero and give a tiny jitter
        dx = (Math.random() - 0.5) * 2;
        dy = (Math.random() - 0.5) * 2;
        distSq = dx * dx + dy * dy || 1;
      }

      const dist = Math.sqrt(distSq);
      // F = config.repulsion / dist
      const force = (config.repulsion * 10) / (distSq + 20);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      n1.vx -= fx;
      n1.vy -= fy;
      n2.vx += fx;
      n2.vy += fy;
    }
  }

  // 2. Link Spring force (Hooke's Law)
  for (const edge of edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) continue;

    let dx = target.x - source.x;
    let dy = target.y - source.y;
    let dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const displacement = dist - config.linkDistance;
    const force = displacement * 0.04;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    source.vx += fx;
    source.vy += fy;
    target.vx -= fx;
    target.vy -= fy;
  }

  // 3. Center Gravity force (pull toward origin 0,0)
  for (const node of nodes) {
    node.vx -= node.x * config.centerForce;
    node.vy -= node.y * config.centerForce;
  }

  // 4. Position integration, damping, and kinetic energy calculation
  let totalEnergy = 0;

  for (const node of nodes) {
    if (fixedNodeId && node.id === fixedNodeId) {
      node.vx = 0;
      node.vy = 0;
      continue;
    }

    // Apply damping
    node.vx *= config.damping;
    node.vy *= config.damping;

    // Cap velocity
    const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
    const maxSpeed = 25;
    if (speed > maxSpeed) {
      node.vx = (node.vx / speed) * maxSpeed;
      node.vy = (node.vy / speed) * maxSpeed;
    }

    node.x += node.vx;
    node.y += node.vy;

    totalEnergy += speed;
  }

  return totalEnergy;
}

/**
 * Initialize positions of nodes in a circular or spiral pattern if they start at (0, 0)
 */
export function initializeNodePositions(nodes: GraphNode[], spreadRadius: number = 200) {
  const count = nodes.length;
  if (count === 0) return;

  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Golden angle ~137.5 degrees

  nodes.forEach((node, i) => {
    if (node.x === 0 && node.y === 0) {
      const r = spreadRadius * Math.sqrt((i + 1) / count);
      const theta = i * goldenAngle;
      node.x = r * Math.cos(theta);
      node.y = r * Math.sin(theta);
      node.vx = 0;
      node.vy = 0;
    }
  });
}
