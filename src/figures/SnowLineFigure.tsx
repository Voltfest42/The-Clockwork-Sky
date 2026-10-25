import { useState, type ReactNode } from 'react';
import { discTemperature, gasDensity, MATERIALS, radiusAtTemperature, snowLine, solidDensity } from '../core/orbits/disc';
import { PLANET_WORLDS } from './solarSystem';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { onSky } from './sky/legend';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * The snow line: the temperature across the young Sun's disc (Hayashi's
 * model), which materials are solid where, and the jump in solid material
 * where water freezes, beyond which the giant planets grew.
 */

const W = 560;
const H = 150;
const X0 = 0.03;
const X1 = 100;
const PAD = 16;
const BAND_TOP = 52;
const BAND_H = 44;

/** x on a log axis from X0 to X1 AU. */
const sx = (r: number) => PAD + ((Math.log10(r) - Math.log10(X0)) / (Math.log10(X1) - Math.log10(X0))) * (W - 2 * PAD);

/** A colour for a temperature: white-hot through orange and red to deep blue. */
function heat(kelvin: number): string {
  const t = Math.max(0, Math.min(1, (Math.log10(kelvin) - 1.2) / (3.4 - 1.2)));
  const stops: [number, [number, number, number]][] = [
    [0, [20, 30, 90]],
    [0.35, [60, 110, 190]],
    [0.55, [150, 150, 160]],
    [0.75, [220, 120, 50]],
    [0.9, [250, 200, 80]],
    [1, [255, 245, 220]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [a, ca] = stops[i - 1];
      const [b, cb] = stops[i];
      const f = (t - a) / (b - a);
      return `rgb(${ca.map((c, k) => Math.round(c + f * (cb[k] - c))).join(',')})`;
    }
  }
  return 'rgb(255,245,220)';
}

function kelvinWords(k: number): string {
  const c = Math.round(k - 273.15);
  return `${Math.round(k).toLocaleString('en-GB')} K (${c < 0 ? '−' : ''}${Math.abs(c).toLocaleString('en-GB')} °C)`;
}

export function SnowLineFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [logL, setLogL] = useState(0);
  const [logR, setLogR] = useState(Math.log10(5.2));
  const L = 10 ** logL;
  const r = 10 ** logR;
  const snow = snowLine(L);
  const T = discTemperature(r, L);
  const solid = MATERIALS.filter((m) => T < m.freezesK);

  const reset = () => {
    setLogL(0);
    setLogR(Math.log10(5.2));
  };

  const stripes = Array.from({ length: 120 }, (_, i) => {
    const a = 10 ** (Math.log10(X0) + (i / 120) * (Math.log10(X1) - Math.log10(X0)));
    const b = 10 ** (Math.log10(X0) + ((i + 1) / 120) * (Math.log10(X1) - Math.log10(X0)));
    return { x: sx(a), w: sx(b) - sx(a) + 0.5, colour: heat(discTemperature(Math.sqrt(a * b), L)) };
  });

  const caption = `At ${r < 1 ? r.toFixed(2) : r.toFixed(1)} AU the disc is ${kelvinWords(T)}. Solid there: ${solid.length ? solid.map((m) => m.name.toLowerCase()).join(', ') : 'nothing: even rock is vapour'}. ${
    r < snow
      ? `Inside the snow line (${snow.toFixed(1)} AU) only rock and metal can form solid grains, so planets here stay small and rocky.`
      : `Beyond the snow line (${snow.toFixed(1)} AU) water freezes too, and there is ${(30 / 7.1).toFixed(1)} times as much solid material to build with: enough for cores that grab gas and become giants.`
  }`;

  return (
    <Figure
      number={number}
      title="The snow line"
      description="The disc of gas and dust round the young Sun, coloured by temperature from over 1,000 K near the Sun to under 50 K beyond Neptune, with the planets at their distances. Rock and metal are solid almost everywhere, water ice only beyond the snow line at about 2.7 AU, and methane ice beyond about 50 AU. A chart below shows the solid material per square centimetre jumping fourfold at the snow line. A slider changes the star’s brightness and moves the lines."
      height={760}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        ...MATERIALS.map((m) => ({ label: `${m.name.toLowerCase()} freezes beyond this line (${m.freezesK.toLocaleString('en-GB')} K)`, symbol: onSky(<line x1="0" y1="-9" x2="0" y2="9" stroke={m.colour} strokeWidth="2" strokeDasharray={m.freezesK === 170 ? undefined : '3 3'} />) })),
        { label: 'a planet where it is today', symbol: onSky(<circle r="4" fill="#ffffff" />) },
      ]}
      simplified={
        <p>
          This is the textbook “minimum-mass solar nebula” of Hayashi (1981): the disc as a smooth, still sheet, warmed only by sunlight,
          with the least material that could have made the planets. Real discs were hotter inside early on, cooled over millions of years, and
          the giant planets have since moved (the snow line was probably nearer 3–5 AU when Jupiter formed). The freezing temperatures are rounded.
        </p>
      }
    >
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svg} role="img" aria-label={caption}>
          <rect width={W} height={H} fill="#070b16" />
          {stripes.map((s, i) => (
            <rect key={i} x={s.x} y={BAND_TOP} width={s.w} height={BAND_H} fill={s.colour} />
          ))}
          <circle cx={PAD} cy={BAND_TOP + BAND_H / 2} r={7} fill="var(--sun)" />
          {MATERIALS.map((m) => {
            const at = radiusAtTemperature(m.freezesK, L);
            if (at < X0 || at > X1) return null;
            return (
              <g key={m.name}>
                <line x1={sx(at)} x2={sx(at)} y1={BAND_TOP - 6} y2={BAND_TOP + BAND_H + 6} stroke={m.colour} strokeWidth="2" strokeDasharray={m.freezesK === 170 ? undefined : '4 3'} />
                <text x={sx(at)} y={BAND_TOP + BAND_H + 20} fontSize="11" textAnchor="middle" fill={m.colour}>
                  {m.freezesK === 170 ? `snow line ${at.toFixed(1)} AU` : m.name.toLowerCase()}
                </text>
              </g>
            );
          })}
          {PLANET_WORLDS.map((w, i) => (
            <g key={w.id}>
              <circle cx={sx(w.distanceAu)} cy={BAND_TOP - 16} r={3.5} fill="#ffffff" />
              <text x={sx(w.distanceAu)} y={BAND_TOP - 24 - (i % 2) * 12} fontSize="10.5" textAnchor="middle" fill="var(--sky-muted)">
                {w.name}
              </text>
            </g>
          ))}
          <line x1={sx(r)} x2={sx(r)} y1={BAND_TOP} y2={BAND_TOP + BAND_H} stroke="#ffffff" strokeWidth="2.5" />
          {[0.1, 1, 10, 100].map((t) => (
            <text key={t} x={sx(t)} y={H - 8} fontSize="10.5" textAnchor="middle" fill="var(--sky-muted)">
              {t} AU
            </text>
          ))}
        </svg>
        <label className={styles.slider} style={{ marginTop: 10 }}>
          Distance
          <input
            type="range"
            min={-1.3}
            max={1.9}
            step={0.005}
            value={logR}
            onChange={(e) => setLogR(Number(e.target.value))}
            aria-valuetext={`${r < 1 ? r.toFixed(2) : r.toFixed(1)} AU: ${kelvinWords(T)}`}
          />
          <output>{r < 1 ? r.toFixed(2) : r.toFixed(1)} AU</output>
        </label>
        <label className={styles.slider}>
          The star’s brightness
          <input type="range" min={-0.6} max={0.6} step={0.01} value={logL} onChange={(e) => setLogL(Number(e.target.value))} aria-valuetext={`${L.toFixed(2)} times the Sun’s`} />
          <output>{L.toFixed(2)} × Sun</output>
        </label>
        <div className={styles.readout}>
          <span>
            Temperature: <b>{kelvinWords(T)}</b>
          </span>
          <span>
            Solids: <b>{solidDensity(r, L) < 1 ? solidDensity(r, L).toFixed(2) : solidDensity(r, L).toFixed(1)} g</b> per cm²
          </span>
          <span>
            Gas: <b>{Math.round(gasDensity(r)).toLocaleString('en-GB')} g</b> per cm²
          </span>
        </div>
        <ScatterChart
          groups={[]}
          lines={[{ name: 'Solid material (rock and metal, plus ice beyond the snow line)', color: '#62d6c4', f: (x) => solidDensity(x, L) }]}
          xScale="log"
          yScale="log"
          xMin={0.1}
          xMax={X1}
          yMin={0.01}
          yMax={1000}
          xLabel="Distance from the Sun, AU"
          yLabel="Grams per cm² of disc"
          height={260}
          ariaLabel={`Solid material per square centimetre of the disc against distance, on log axes: it falls steadily outward but jumps ${(30 / 7.1).toFixed(1)} times at the snow line, ${snow.toFixed(1)} AU.`}
        >
          {(cx, cy) => (
            <>
              <line x1={cx(snow)} x2={cx(snow)} y1={cy(1000)} y2={cy(0.01)} stroke="#7fc8f8" strokeWidth="1.5" />
              <circle cx={cx(r)} cy={cy(solidDensity(r, L))} r={5} fill="none" stroke="var(--text)" strokeWidth="2" />
            </>
          )}
        </ScatterChart>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
