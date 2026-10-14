import { scaleLinear } from 'd3';
import type { Tradition } from '../data/schema';
import { FAMILIES } from '../data/families';

export const NOW = 2026;

export interface Lane {
  t: Tradition;
  y: number;
  start: number;
  end: number;
  parent?: Tradition;
  parentY?: number;
  width: number;
  colour: string;
  depth: number;
}

/** Non-linear time scale: more room for the crowded centuries after 1500. */
export function timeScale(width: number) {
  return scaleLinear().domain([30, 1000, 1500, 1800, NOW]).range([0, 0.2, 0.38, 0.68, 1].map((f) => f * width)).clamp(true);
}

/**
 * Orders traditions into lanes: depth-first from the roots, with each parent
 * placed in the middle of its (date-sorted) children so the river branches
 * symmetrically.
 */
export function layoutLanes(traditions: Tradition[], laneGap: number, filter?: (t: Tradition) => boolean): Lane[] {
  const list = filter ? traditions.filter(filter) : traditions;
  const byId = new Map(list.map((t) => [t.id, t]));
  const primaryParent = (t: Tradition) => t.parentIds.find((p) => byId.has(p));
  const kids = new Map<string, Tradition[]>();
  const roots: Tradition[] = [];
  for (const t of list) {
    const p = primaryParent(t);
    if (p) { if (!kids.has(p)) kids.set(p, []); kids.get(p)!.push(t); } else roots.push(t);
  }
  for (const k of kids.values()) k.sort((a, b) => a.foundedYear - b.foundedYear);
  roots.sort((a, b) => a.foundedYear - b.foundedYear);

  const order: { t: Tradition; depth: number }[] = [];
  const visit = (t: Tradition, depth: number) => {
    const ch = kids.get(t.id) ?? [];
    // Interleave: alternate children above and below the parent for balance.
    const above: Tradition[] = [];
    const below: Tradition[] = [];
    ch.forEach((c, i) => (i % 2 === 0 ? below : above).push(c));
    above.reverse().forEach((c) => visit(c, depth + 1));
    order.push({ t, depth });
    below.forEach((c) => visit(c, depth + 1));
  };
  roots.forEach((r) => visit(r, 0));

  const yOf = new Map(order.map((o, i) => [o.t.id, i * laneGap]));
  return order.map(({ t, depth }) => {
    const pid = primaryParent(t);
    const children = kids.get(t.id) ?? [];
    let end = t.endYear ?? NOW;
    // The undivided early church "ends" as its great branches take over.
    if (t.family === 'early' && children.length) end = Math.max(end === NOW ? 0 : end, ...children.map((c) => c.foundedYear));
    const adherents = t.adherents?.estimate ?? 0;
    return {
      t,
      y: yOf.get(t.id)!,
      start: t.foundedYear,
      end,
      parent: pid ? byId.get(pid) : undefined,
      parentY: pid ? yOf.get(pid) : undefined,
      width: adherents ? Math.max(2.5, Math.min(16, Math.sqrt(adherents / 1e6) * 0.9)) : t.family === 'early' ? 12 : 3,
      colour: FAMILIES[t.family]?.colour ?? '#888',
      depth,
    };
  });
}

/** SVG path for a lane: a smooth S-curve out of the parent, then a straight run. */
export function lanePath(l: Lane, x: (y: number) => number, branchLen = 60) {
  const x0 = x(l.start);
  const x1 = x(l.end);
  if (l.parentY === undefined) return `M${x0},${l.y} L${x1},${l.y}`;
  const xb = Math.min(x0 + branchLen, x1);
  const mid = (x0 + xb) / 2;
  return `M${x0},${l.parentY} C${mid},${l.parentY} ${mid},${l.y} ${xb},${l.y} L${x1},${l.y}`;
}
