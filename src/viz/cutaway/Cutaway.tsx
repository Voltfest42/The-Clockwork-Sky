import type { KeyboardEvent } from 'react';

/**
 * A star cut open: nested shells drawn to scale as a disc with a quarter cut
 * away, and its outer atmosphere drawn beyond the edge, not to scale. A
 * radial line marks a chosen depth. Layers are buttons: click or press Enter
 * to pick one. Radii are fractions of the star's radius.
 */

export interface CutawayLayer {
  id: string;
  name: string;
  from: number;
  to: number;
  colour: string;
}

interface CutawayProps {
  layers: readonly CutawayLayer[];
  /** The marked depth, a fraction of the radius. */
  depth: number;
  selected: string;
  onSelect: (id: string) => void;
  /** Layers beyond 1 are drawn squeezed into this much of the radius beyond the edge. */
  atmosphere?: number;
  size?: number;
  /** The colour of the uncut surface (the Sun's orange by default). */
  surface?: string;
  /** A note in the corner; none if null. */
  footnote?: string | null;
  ariaLabel: string;
}

export function Cutaway({ layers, depth, selected, onSelect, atmosphere = 0.22, size = 300, surface = '#ffb347', footnote = 'Outer atmosphere not to scale', ariaLabel }: CutawayProps) {
  const c = size / 2;
  const R = (size / 2) * (1 / (1 + atmosphere)) - 4;
  // Outside the star, radii from 1 to the outermost layer's edge are squeezed into [1, 1 + atmosphere].
  const outer = Math.max(...layers.map((l) => l.to));
  const radius = (r: number) => (r <= 1 ? r * R : R * (1 + ((r - 1) / (outer - 1)) * atmosphere));
  const quarter = (r: number) => `M${c} ${c} L${c + r} ${c} A${r} ${r} 0 0 0 ${c} ${c - r} Z`;
  const ring = (r0: number, r1: number) =>
    `M${c + r1} ${c} A${r1} ${r1} 0 1 1 ${c} ${c - r1} L${c} ${c - r0} A${r0} ${r0} 0 1 0 ${c + r0} ${c} Z`;
  const keys = (id: string) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(id);
    }
  };
  // Thick layers first, outermost first, so inner ones are drawn over them; thin ones last.
  const thin = (l: CutawayLayer) => l.to - l.from < 0.01;
  const inside = layers.filter((l) => l.to <= 1).sort((a, b) => Number(thin(a)) - Number(thin(b)) || b.to - a.to);
  const beyond = layers.filter((l) => l.from >= 1);
  const angle = -Math.PI / 4;
  const d = radius(depth);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size + 40, display: 'block' }} role="group" aria-label={ariaLabel}>
      <rect width={size} height={size} rx="8" fill="#070b16" />
      {[...beyond].reverse().map((l) => (
        <g key={l.id} role="button" tabIndex={0} aria-label={`${l.name} (not to scale)`} aria-pressed={selected === l.id} onClick={() => onSelect(l.id)} onKeyDown={keys(l.id)} style={{ cursor: 'pointer' }}>
          <circle cx={c} cy={c} r={radius(l.to)} fill={l.colour} fillOpacity={selected === l.id ? 0.55 : 0.3} stroke={selected === l.id ? '#fff' : 'none'} strokeWidth="1.5" />
        </g>
      ))}
      {/* The uncut three quarters: the surface. */}
      <path d={ring(0, R)} fill={surface} />
      <circle cx={c} cy={c} r={R} fill="none" stroke="#fde68a" strokeWidth="1.5" />
      {inside.map((l) => (
        <g key={l.id} role="button" tabIndex={0} aria-label={l.name} aria-pressed={selected === l.id} onClick={() => onSelect(l.id)} onKeyDown={keys(l.id)} style={{ cursor: 'pointer' }}>
          {thin(l) ? (
            // Too thin to see at this scale: drawn as a band along the edge.
            <path d={`M${c + R - 3} ${c} A${R - 3} ${R - 3} 0 0 0 ${c} ${c - R + 3}`} fill="none" stroke={l.colour} strokeWidth={selected === l.id ? 8 : 6} style={{ pointerEvents: 'stroke' }} />
          ) : (
            <path d={quarter(Math.max(radius(l.to) - (l.to === 1 ? 6 : 0), 2))} fill={l.colour} stroke={selected === l.id ? '#0f172a' : 'none'} strokeWidth="2.5" />
          )}
        </g>
      ))}
      <line x1={c} y1={c} x2={c + d * Math.cos(angle)} y2={c + d * Math.sin(angle)} stroke="#0f172a" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx={c + d * Math.cos(angle)} cy={c + d * Math.sin(angle)} r="4.5" fill="#0f172a" stroke="#fff" strokeWidth="1.5" />
      {footnote && (
        <text x={8} y={size - 10} fontSize="10.5" fill="#cbd5e1">
          {footnote}
        </text>
      )}
    </svg>
  );
}
