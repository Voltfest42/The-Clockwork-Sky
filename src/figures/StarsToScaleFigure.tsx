import { useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { StarDisc } from '../viz/star/StarDisc';
import { formatWidth, SCALE_STARS, scalePositions } from './hrStars';
import { formatSuns } from './thermal';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Stars to scale (Figure 13.3): the famous stars side by side at their true
 * sizes, from Sirius B (Earth's size) to the largest known, about 1,500
 * times the Sun's width. Zoom out, and each new star dwarfs the last.
 */

const W = 600;
const H = 260;
const POS = scalePositions();
const LOG_MIN = Math.log10(0.04);
const LOG_MAX = Math.log10(POS[POS.length - 1] + SCALE_STARS[SCALE_STARS.length - 1].radius * 1.3);

/** The zoom (log of the view's width in Suns) that just fits star i. */
function fit(i: number): number {
  return Math.log10(POS[i] + SCALE_STARS[i].radius * 1.25);
}

const START = fit(3);

export function StarsToScaleFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [zoom, setZoom] = useState(START);
  const span = 10 ** zoom;
  const scale = (W - 20) / span;
  const visible = SCALE_STARS.map((s, i) => ({ s, i, x: 10 + POS[i] * scale, r: s.radius * scale })).filter((v) => v.x - v.r < W);
  // Labels, biggest star first, each only where it doesn't run into one already placed.
  const labelled = new Set<string>();
  const spans: [number, number][] = [];
  for (const v of [...visible].reverse()) {
    if (v.r <= 2.5 || v.x >= W - 10) continue;
    const half = v.s.name.length * 3.4;
    if (spans.some(([a, b]) => v.x + half > a - 4 && v.x - half < b + 4)) continue;
    spans.push([v.x - half, v.x + half]);
    labelled.add(v.s.id);
  }
  const biggest = visible.filter((v) => v.s.id !== 'earth' && v.x + v.r <= W + 2).pop() ?? visible[0];

  return (
    <Figure
      number={number}
      title="Stars to scale"
      description="Famous stars drawn side by side at their true sizes, smallest on the left: Sirius B, a white dwarf the size of Earth; Proxima Centauri; the Sun; Sirius; Vega; the giants Arcturus and Aldebaran; the supergiants Rigel, Antares and Betelgeuse; and the largest stars known, about 1,500 times the Sun’s width. Zoom out to bring each bigger star into view."
      height={460}
      tryThis={tryThis}
      onReset={() => setZoom(START)}
      legend={[
        { label: 'a star, in its colour', symbol: <circle r="7" fill="#ffd2a1" /> },
        { label: 'the range of published sizes', symbol: <circle r="7" fill="none" stroke="#fff" strokeDasharray="3 2" /> },
        { label: 'Earth, for scale', symbol: <circle r="5" fill="#3b82f6" /> },
      ]}
      simplified={
        <p>
          The sizes are from measurements, where they exist, and from luminosity and temperature otherwise. Red supergiants have no sharp edge,
          and their distances are uncertain, so their sizes are uncertain by a fifth to a half: the dashed circles show the range.
        </p>
      }
    >
      <div className={styles.controls}>
        <label className={styles.slider}>
          Zoom out
          <input type="range" min={LOG_MIN} max={LOG_MAX} step={0.005} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-valuetext={`View ${formatWidth(span)} across`} />
          <output>{formatSuns(span)} Suns across</output>
        </label>
        <div className={styles.toggles} role="group" aria-label="Go to a star">
          <span className={styles.togglesLabel}>Go to:</span>
          {SCALE_STARS.map((s, i) =>
            s.id === 'earth' ? null : (
              <button key={s.id} type="button" className={styles.toggle} aria-pressed={Math.abs(zoom - fit(i)) < 0.01} onClick={() => setZoom(fit(i))}>
                {s.name}
              </button>
            ),
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svgLight} role="img" aria-label={`Stars to scale, a view ${formatWidth(span)} across, showing ${visible.map((v) => v.s.name).join(', ')}`}>
        <rect width={W} height={H} rx="8" fill="#070b16" />
        <g>
          {visible.map(({ s, x, r }) => {
            const cy = H / 2 - 10;
            return (
              <g key={s.id}>
                {s.id === 'earth' ? <circle cx={x} cy={cy} r={Math.max(r, 0.8)} fill="#3b82f6" /> : <StarDisc cx={x} cy={cy} r={r} kelvin={s.kelvin} title={s.name} />}
                {s.range && r > 3 && (
                  <>
                    <circle cx={x} cy={cy} r={(s.range[0] / s.radius) * r} fill="none" stroke="#fff" strokeOpacity="0.55" strokeDasharray="4 3" />
                    <circle cx={x} cy={cy} r={(s.range[1] / s.radius) * r} fill="none" stroke="#fff" strokeOpacity="0.55" strokeDasharray="4 3" />
                  </>
                )}
                {labelled.has(s.id) && (
                  <text x={x} y={Math.min(H - 28, cy + r + 15)} fontSize="11" textAnchor="middle" fill="#e5e7eb" stroke="#070b16" strokeWidth="3" paintOrder="stroke">
                    {s.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        <line x1={10} x2={W - 10} y1={H - 14} y2={H - 14} stroke="#94a3b8" />
        <text x={W / 2} y={H - 18} fontSize="10.5" textAnchor="middle" fill="#cbd5e1">
          {formatWidth(span)} across
        </text>
      </svg>
      <Caption>
        {`The biggest star in full view: ${biggest.s.id === 'sun' ? 'the Sun' : biggest.s.id === 'largest' ? 'the largest known star' : biggest.s.name}${biggest.s.id === 'sun' ? '' : `, ${formatSuns(biggest.s.radius)} times the Sun’s radius`}${biggest.s.range ? ` (published sizes range from ${formatSuns(biggest.s.range[0])} to ${formatSuns(biggest.s.range[1])})` : ''}. ${biggest.s.id === 'largest' ? 'Put in the Sun’s place, its surface would reach beyond Jupiter’s orbit.' : biggest.s.id === 'betelgeuse' || biggest.s.id === 'antares' ? 'Put in the Sun’s place, it would swallow the orbits of Mercury, Venus, Earth and Mars.' : biggest.s.id === 'sirius-b' ? 'A white dwarf: the mass of the Sun packed into a ball the size of Earth.' : ''}`}
      </Caption>
    </Figure>
  );
}
