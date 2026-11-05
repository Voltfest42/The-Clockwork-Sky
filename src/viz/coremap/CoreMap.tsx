import { useId, useMemo, type ReactNode } from 'react';
import { powerOfTen } from '../../core/math/scientific';
import type { Mix, Regime } from '../../core/structure/eos';
import { coreMapRegions, REGIME_NAMES } from './regions';
import styles from '../LineChart.module.css';

/**
 * The core's map (Part III's recurring diagram): a star's central density
 * against its central temperature, on log axes, with the regions where light,
 * hot gas or packed electrons supply most of the pressure, computed from the
 * equations of state. A core moves across it as the star contracts, ignites
 * and dies. Like a phase diagram of water, it shows which physics rules where.
 *
 * Temperatures in K; densities in kg/m³ in the props, drawn in g/cm³.
 */

const REGIME_FILL: Record<Regime, string | undefined> = {
  gas: undefined,
  radiation: 'var(--series-2)',
  degenerate: 'var(--series-1)',
  relativistic: 'var(--series-3)',
};

export interface CoreTrack {
  name: string;
  color: string;
  dashed?: boolean;
  /** Central temperature (K) and density (kg/m³). */
  points: readonly { T: number; rho: number }[];
}

/** A line across the map, such as where a fuel ignites, labelled at its top. */
export interface CoreLine {
  name: string;
  label: string;
  color?: string;
  /** Temperature (K) and density (kg/m³) along it. */
  points: readonly { T: number; rho: number }[];
}

export interface CorePoint {
  T: number;
  rho: number;
  label: string;
  color?: string;
}

interface CoreMapProps {
  mix: Mix;
  /** log₁₀ of the temperature range (K) and of the density range (g/cm³). */
  logT: readonly [number, number];
  logRho: readonly [number, number];
  tracks?: readonly CoreTrack[];
  /** Lines drawn under the tracks: ignition lines. */
  lines?: readonly CoreLine[];
  /** Labelled points (the Sun's centre today); the last is drawn largest, as the moving core. */
  points?: readonly CorePoint[];
  /** The moving core, drawn on top. */
  marker?: CorePoint;
  ariaLabel: string;
  width?: number;
  height?: number;
  children?: (sx: (logT: number) => number, sy: (logRho: number) => number) => ReactNode;
}

const PAD = { left: 60, right: 14, top: 12, bottom: 42 };

export function CoreMap({ mix, logT, logRho, tracks = [], lines = [], points = [], marker, ariaLabel, width = 560, height = 360, children }: CoreMapProps) {
  const W = width;
  const H = height;
  const regions = useMemo(() => coreMapRegions(mix, logT, logRho), [mix, logT, logRho]);
  const sx = (x: number) => PAD.left + ((x - logT[0]) / (logT[1] - logT[0])) * (W - PAD.left - PAD.right);
  const sy = (y: number) => H - PAD.bottom - ((y - logRho[0]) / (logRho[1] - logRho[0])) * (H - PAD.top - PAD.bottom);
  const at = (p: { T: number; rho: number }) => ({ x: sx(Math.log10(p.T)), y: sy(Math.log10(p.rho / 1000)) });
  const inside = (p: { T: number; rho: number }) => {
    const x = Math.log10(p.T);
    const y = Math.log10(p.rho / 1000);
    return x >= logT[0] && x <= logT[1] && y >= logRho[0] && y <= logRho[1];
  };
  const xTicks: number[] = [];
  for (let e = Math.ceil(logT[0]); e <= logT[1]; e++) xTicks.push(e);
  const yStep = logRho[1] - logRho[0] > 10 ? 2 : 1;
  const yTicks: number[] = [];
  for (let e = Math.ceil(logRho[0] / yStep) * yStep; e <= logRho[1]; e += yStep) yTicks.push(e);
  const clipId = `coremap${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className={styles.wrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label={ariaLabel}>
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {regions.runs.map((r, i) =>
            REGIME_FILL[r.regime] ? (
              <rect
                key={i}
                x={sx(r.x)}
                y={sy(r.y1)}
                width={sx(r.x + r.width) - sx(r.x) + 0.6}
                height={Math.max(0, sy(r.y0) - sy(r.y1))}
                fill={REGIME_FILL[r.regime]}
                fillOpacity={0.13}
              />
            ) : null,
          )}
          {regions.boundaries.map((b) => (
            <polyline
              key={b.between.join('|')}
              points={b.points.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')}
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          ))}
        </g>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} className={styles.grid} strokeOpacity={0.5} />
            <text x={PAD.left - 6} y={sy(t) + 3.5} className={styles.tick} textAnchor="end">
              {powerOfTen(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} x={sx(t)} y={H - PAD.bottom + 15} className={styles.tick} textAnchor="middle">
            {powerOfTen(t)}
          </text>
        ))}
        <rect x={PAD.left} y={PAD.top} width={W - PAD.left - PAD.right} height={H - PAD.top - PAD.bottom} fill="none" stroke="var(--border)" />
        <text x={(PAD.left + W - PAD.right) / 2} y={H - 6} className={styles.axis} textAnchor="middle">
          Central temperature (K): hotter →
        </text>
        <text transform={`translate(13 ${(PAD.top + H - PAD.bottom) / 2}) rotate(-90)`} className={styles.axis} textAnchor="middle">
          Central density (g/cm³): denser →
        </text>
        {(Object.keys(regions.labels) as Regime[]).map((regime) => {
          const p = regions.labels[regime]!;
          const x = Math.min(W - PAD.right - 70, Math.max(PAD.left + 70, sx(p.x)));
          return (
            <text key={regime} x={x} y={sy(p.y)} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--text)" opacity={0.85}>
              {REGIME_NAMES[regime]}
            </text>
          );
        })}
        <g clipPath={`url(#${clipId})`}>
          {lines.map((l) => (
            <polyline
              key={l.name}
              points={l.points
                .map(at)
                .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                .join(' ')}
              fill="none"
              stroke={l.color ?? 'var(--text)'}
              strokeWidth="1.5"
              strokeOpacity={0.85}
            />
          ))}
          {lines.map((l, k) => {
            const top = l.points.filter(inside).reduce<{ T: number; rho: number } | undefined>((b, p) => (!b || p.rho > b.rho ? p : b), undefined);
            if (!top) return null;
            const q = at(top);
            return (
              <text key={`${l.name}-label`} x={q.x + 4} y={Math.max(PAD.top + 12, q.y + 12) + (k % 2) * 13} fontSize="11" fontWeight="600" fill={l.color ?? 'var(--text)'}>
                {l.label}
              </text>
            );
          })}
          {tracks.map((t) => (
            <polyline
              key={t.name}
              points={t.points
                .map(at)
                .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                .join(' ')}
              fill="none"
              stroke={t.color}
              strokeWidth="2.5"
              strokeDasharray={t.dashed ? '6 4' : undefined}
              strokeLinejoin="round"
            />
          ))}
          {children?.(sx, sy)}
        </g>
        {points.filter(inside).map((p) => {
          const q = at(p);
          return (
            <g key={p.label}>
              <circle cx={q.x} cy={q.y} r="4" fill={p.color ?? 'var(--text)'} />
              <text x={q.x + 7} y={q.y + 4} fontSize="11" fill="var(--text)">
                {p.label}
              </text>
            </g>
          );
        })}
        {marker && inside(marker) && (
          <g>
            <circle cx={at(marker).x} cy={at(marker).y} r="7" fill={marker.color ?? 'var(--accent)'} stroke="var(--bg)" strokeWidth="2" />
            <text x={at(marker).x + 10} y={at(marker).y + 18} fontSize="11.5" fontWeight="600" fill="var(--text)">
              {marker.label}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
