/**
 * Positions across 21 powers of ten without losing precision.
 *
 * A person's 1.7 m and the Sun's 2.5 × 10²⁰ m from the Galaxy's centre can't
 * share one coordinate system: a double keeps about 16 digits, so at 10²⁰ m the
 * smallest step is about 30 km. Instead each object sits in its parent's frame
 * (the Moon in Earth's, Earth in the Sun's, the Sun in the Galaxy's), and the
 * offset between two objects is summed only up to their nearest shared
 * ancestor. That's the "floating origin" trick from big game worlds.
 *
 * Offsets are 2D, in metres. Frames are not rotated relative to each other.
 */

export type Vec2 = readonly [number, number];

export interface TreeNode {
  id: string;
  /** The frame it sits in; null for the root. */
  parent: string | null;
  /** Its centre, relative to its parent's centre, m. */
  offset: Vec2;
}

export class PositionTree {
  private readonly nodes = new Map<string, TreeNode>();

  constructor(nodes: readonly TreeNode[]) {
    for (const node of nodes) {
      if (this.nodes.has(node.id)) throw new Error(`Duplicate node "${node.id}"`);
      this.nodes.set(node.id, node);
    }
    for (const node of nodes) {
      if (node.parent !== null && !this.nodes.has(node.parent)) throw new Error(`Node "${node.id}" has an unknown parent "${node.parent}"`);
      // Walk up to the root, to catch cycles.
      this.chain(node.id);
    }
  }

  has(id: string): boolean {
    return this.nodes.has(id);
  }

  /** The node and its ancestors, nearest first. */
  chain(id: string): string[] {
    const out: string[] = [];
    let current: string | null = id;
    while (current !== null) {
      if (out.includes(current)) throw new Error(`Cycle through "${current}"`);
      const node = this.nodes.get(current);
      if (!node) throw new Error(`Unknown node "${current}"`);
      out.push(current);
      current = node.parent;
    }
    return out;
  }

  /** Where a is, relative to b: position(a) − position(b), m. Exact to the precision of the offsets below their shared ancestor. */
  relative(a: string, b: string): Vec2 {
    if (a === b) return [0, 0];
    const up = this.chain(a);
    const fromB = this.chain(b);
    const shared = up.find((id) => fromB.includes(id));
    if (shared === undefined) throw new Error(`"${a}" and "${b}" are in different trees`);
    let x = 0;
    let y = 0;
    for (const id of up) {
      if (id === shared) break;
      const [dx, dy] = this.nodes.get(id)!.offset;
      x += dx;
      y += dy;
    }
    for (const id of fromB) {
      if (id === shared) break;
      const [dx, dy] = this.nodes.get(id)!.offset;
      x -= dx;
      y -= dy;
    }
    return [x, y];
  }
}
