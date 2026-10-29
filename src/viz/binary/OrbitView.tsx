import { useMemo } from 'react';
import { binaryState, type BinaryOrbit } from '../../core/binaries/orbit';
import { StarDisc } from '../star/StarDisc';

/**
 * Two stars round their balance point, drawn from above the orbit or as we
 * see it from Earth, tilted. Sizes are in R☉; when the stars' radii are
 * given they are drawn to the orbit's scale, otherwise as dots sized by mass
 * (the figure says so).
 */

interface OrbitViewProps {
  orbit: BinaryOrbit;
  phase: number;
  view: 'above' | 'sky';
  temperatures: readonly [number, number];
  /** Radii, R☉, to draw the stars to scale. */
  radii?: readonly [number, number];
  names?: readonly [string, string];
  /** Half the width of the view, R☉; by default the orbit fits. */
  extent?: number;
  size?: number;
  /** A scale bar: its length (R☉) and label. */
  scaleBar?: { length: number; label: string };
  title: string;
  ariaLabel: string;
}

export function OrbitView({ orbit, phase, view, temperatures, radii, names = ['Star 1', 'Star 2'], extent, size = 260, scaleBar, title, ariaLabel }: OrbitViewProps) {
  const paths = useMemo(() => {
    const p1: string[] = [];
    const p2: string[] = [];
    let reach = 0;
    for (let k = 0; k <= 240; k++) {
      const s = binaryState(orbit, k / 240);
      const [a, b] = view === 'above' ? s.above : s.sky;
      p1.push(`${k ? 'L' : 'M'}${a.x.toFixed(4)} ${(-a.y).toFixed(4)}`);
      p2.push(`${k ? 'L' : 'M'}${b.x.toFixed(4)} ${(-b.y).toFixed(4)}`);
      reach = Math.max(reach, Math.hypot(a.x, a.y), Math.hypot(b.x, b.y));
    }
    return { p1: p1.join(''), p2: p2.join(''), reach };
  }, [orbit, view]);
  const half = extent ?? paths.reach * 1.15 + (radii ? Math.max(...radii) : 0);
  const k = size / 2 / half;
  const s = binaryState(orbit, phase);
  const places = view === 'above' ? s.above : s.sky;
  // Nearer star drawn last; from above, the order doesn't matter.
  const order = view === 'sky' && s.sky[0].z < s.sky[1].z ? [1, 0] : [0, 1];
  const massDot = (m: number) => 3 + 2.5 * Math.sqrt(m);
  const H = size + 22;

  return (
    <svg viewBox={`0 0 ${size} ${H}`} width="100%" style={{ maxWidth: size + 40, display: 'block' }} role="img" aria-label={ariaLabel}>
      <rect width={size} height={size} rx="8" fill="#070b16" />
      <text x={8} y={16} fontSize="11" fill="#cbd5e1">
        {title}
      </text>
      <g transform={`translate(${size / 2} ${size / 2}) scale(${k})`}>
        <path d={paths.p1} fill="none" stroke="#93c5fd" strokeOpacity="0.55" strokeWidth={1.2 / k} />
        <path d={paths.p2} fill="none" stroke="#fdba74" strokeOpacity="0.55" strokeWidth={1.2 / k} strokeDasharray={`${4 / k} ${3 / k}`} />
        <line x1={places[0].x} y1={-places[0].y} x2={places[1].x} y2={-places[1].y} stroke="#e5e7eb" strokeOpacity="0.35" strokeWidth={1 / k} />
        <path d={`M${-5 / k} 0 h${10 / k} M0 ${-5 / k} v${10 / k}`} stroke="#f8fafc" strokeWidth={1.6 / k} />
      </g>
      {order.map((j) => {
        const p = places[j];
        const cx = size / 2 + p.x * k;
        const cy = size / 2 - p.y * k;
        const r = radii ? Math.max(2.5, radii[j] * k) : massDot(j === 0 ? orbit.m1 : orbit.m2);
        return (
          <g key={j}>
            <StarDisc cx={cx} cy={cy} r={r} kelvin={temperatures[j]} title={names[j]} />
            <text x={cx + r + 4} y={cy + 4} fontSize="10.5" fill="#e5e7eb" stroke="#070b16" strokeWidth="3" paintOrder="stroke">
              {j + 1}
            </text>
          </g>
        );
      })}
      {view === 'above' ? (
        <g>
          <line x1={size / 2} x2={size / 2} y1={size - 30} y2={size - 10} stroke="#cbd5e1" strokeWidth="1.5" />
          <path d={`M${size / 2 - 4} ${size - 15} L${size / 2} ${size - 8} L${size / 2 + 4} ${size - 15}`} fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
          <text x={size / 2 + 8} y={size - 14} fontSize="10.5" fill="#cbd5e1">
            to Earth
          </text>
        </g>
      ) : (
        <text x={8} y={size - 10} fontSize="10.5" fill="#cbd5e1">
          tilted {Math.round(orbit.i)}° from face-on
        </text>
      )}
      {scaleBar && scaleBar.length * k < size - 40 && (
        <g>
          <line x1={size - 12 - scaleBar.length * k} x2={size - 12} y1={size - 12} y2={size - 12} stroke="#e5e7eb" strokeWidth="2" />
          <text x={size - 12} y={size - 17} fontSize="10" textAnchor="end" fill="#e5e7eb">
            {scaleBar.label}
          </text>
        </g>
      )}
      <text x={size / 2} y={H - 6} fontSize="10.5" textAnchor="middle" fill="var(--text-muted)">
        + the balance point
      </text>
    </svg>
  );
}
