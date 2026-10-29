import { useState, type ReactNode } from 'react';
import { T_SUN } from '../core/constants';
import { superscript } from '../core/math/scientific';
import { famousStar } from '../data/stars';
import { Caption, Figure } from '../viz/Figure';
import { formatKelvin } from '../viz/spectrum/format';
import { StarDisc } from '../viz/star/StarDisc';
import { formatSuns, SIZE_STARS, solarLuminosity } from './thermal';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Size, temperature, power (Figure 11.3): two stars drawn true, side by side,
 * and their luminosities from L = 4πR²σT⁴ (in solar units, L = R² T⁴). A
 * small map of temperature against luminosity, with lines of equal size, is a
 * first look at Chapter 13's diagram.
 */

const R_MIN = -2.3; // 0.005 R☉
const R_MAX = 3.3; // 2,000 R☉
const T_MIN = 3.3; // 2,000 K
const T_MAX = 4.7; // 50,000 K
const START = {
  ref: 'sun',
  logR: Math.log10(famousStar('betelgeuse').radius.value),
  logT: Math.log10(famousStar('betelgeuse').temperature.value),
};

/** Orbits to draw round a big star, as if it sat where the Sun is: radius in solar radii (1 AU = 215 R☉). */
const ORBIT_RINGS = [
  { name: 'Mercury', r: 0.387 * 215 },
  { name: 'Venus', r: 0.723 * 215 },
  { name: 'Earth', r: 215 },
  { name: 'Mars', r: 1.524 * 215 },
  { name: 'Jupiter', r: 5.2 * 215 },
];

/**
 * The orbits big enough to draw at this scale (px per solar radius), and which to label: labels sit at the top of
 * each ring, so a ring is labelled only if it is clear of the ones already labelled, Earth's first.
 */
function labelledRings(scale: number, width: number) {
  const drawn = ORBIT_RINGS.filter((o) => o.r * scale >= 5 && o.r * scale < 2 * width);
  const taken: number[] = [];
  const labels = new Set<string>();
  for (const name of ['Earth', 'Jupiter', 'Mars', 'Venus', 'Mercury']) {
    const ring = drawn.find((o) => o.name === name);
    if (!ring) continue;
    const r = ring.r * scale;
    if (r >= 12 && taken.every((t) => Math.abs(t - r) >= 13)) {
      taken.push(r);
      labels.add(name);
    }
  }
  return drawn.map((ring) => ({ ring, labelled: labels.has(ring.name) }));
}

export function StarPowerFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [refId, setRefId] = useState(START.ref);
  const [logR, setLogR] = useState(START.logR);
  const [logT, setLogT] = useState(START.logT);
  const reset = () => {
    setRefId(START.ref);
    setLogR(START.logR);
    setLogT(START.logT);
  };
  const ref = famousStar(refId);
  const R = 10 ** logR;
  const T = 10 ** logT;
  const L = solarLuminosity(R, T);
  const refL = solarLuminosity(ref.radius.value, ref.temperature.value);
  const match = SIZE_STARS.find((s) => Math.abs(Math.log10(s.radius.value) - logR) < 0.003 && Math.abs(Math.log10(s.temperature.value) - logT) < 0.003);
  const yourName = match ? (match.id === 'sun' ? 'the Sun' : match.name) : 'your star';

  // The stars side by side, at true relative size.
  const W = 560;
  const H = 230;
  const big = Math.max(R, ref.radius.value);
  const scale = 92 / big; // px per solar radius
  const rRef = ref.radius.value * scale;
  const rYou = R * scale;
  const cxRef = W * 0.27;
  const cxYou = W * 0.73;

  // The temperature–luminosity map.
  const MW = 260;
  const MH = 230;
  const mx = (t: number) => 34 + ((Math.log10(50_000) - Math.log10(t)) / (Math.log10(50_000) - Math.log10(2000))) * (MW - 44);
  const my = (l: number) => 12 + ((6 - Math.log10(l)) / 11) * (MH - 40);
  const inMap = (l: number) => l >= 1e-5 && l <= 1e6;

  const areaRatio = (R / ref.radius.value) ** 2;
  const fluxRatio = (T / ref.temperature.value) ** 4;
  const refName = ref.id === 'sun' ? 'the Sun' : ref.name;
  const caption = `${cap(yourName)}: ${formatSuns(R)} times the Sun’s radius at ${formatKelvin(T)}, giving out ${formatSuns(L)} times the Sun’s power. Against ${refName}: ${formatSuns(areaRatio)} times the surface, each square metre giving ${formatSuns(fluxRatio)} times the power, so ${formatSuns(L / refL)} times as luminous.`;

  return (
    <Figure
      number={number}
      title="Size, temperature, power"
      description="Two stars drawn at their true relative sizes, in the colours their temperatures give, with their luminosities from their sizes and temperatures (L = 4πR²σT⁴). Betelgeuse is cooler than the Sun but about 90,000 times as luminous, because it is enormous; Sirius B is hotter than the Sun and far dimmer, because it is the size of Earth. Beside them, a map of temperature against luminosity with lines of equal size."
      height={700}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        {
          label: 'stars drawn true: true sizes, true colours',
          symbol: <circle r="8" fill="#ffd9a8" />,
        },
        {
          label: 'planets’ orbits, as if the star were the Sun',
          symbol: <circle r="8" fill="none" stroke="#56607a" strokeDasharray="3 2" />,
        },
        {
          label: 'on the map: your star',
          symbol: <path d="M0 -8 L6 0 L0 8 L-6 0 Z" fill="var(--series-1)" />,
        },
        {
          label: 'on the map: the star you compare with',
          symbol: <circle r="6" fill="none" stroke="var(--series-2)" strokeWidth="2" />,
        },
        {
          label: 'lines of equal size on the map',
          symbol: <path d="M-10 8 L10 -8" stroke="var(--text-muted)" strokeDasharray="3 3" />,
        },
      ]}
      simplified={
        <p>
          Each star is drawn as a smooth disc, darker towards its edge as real stars are. Real supergiants like Betelgeuse have no sharp edge, and their sizes
          are uncertain by a fifth or more. Luminosities here come from the stars’ sizes and temperatures alone.
        </p>
      }
    >
      <div className={styles.controls}>
        <label className={figureStyles.inputLabel}>
          Compare with
          <select value={refId} onChange={(e) => setRefId(e.target.value)}>
            {SIZE_STARS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id === 'sun' ? 'the Sun' : s.name}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.presets} role="group" aria-label="Make your star">
          <span className={styles.togglesLabel}>Your star:</span>
          {SIZE_STARS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.toggle}
              aria-pressed={match?.id === s.id}
              onClick={() => {
                setLogR(Math.log10(s.radius.value));
                setLogT(Math.log10(s.temperature.value));
              }}
            >
              {s.id === 'sun' ? 'The Sun' : s.name}
            </button>
          ))}
        </div>
        <label className={styles.slider}>
          Radius
          <input
            type="range"
            min={R_MIN}
            max={R_MAX}
            step={0.002}
            value={logR}
            onChange={(e) => setLogR(Number(e.target.value))}
            aria-valuetext={`${formatSuns(R)} times the Sun’s radius`}
          />
          <output>{formatSuns(R)} R☉</output>
        </label>
        <label className={styles.slider}>
          Temperature
          <input
            type="range"
            min={T_MIN}
            max={T_MAX}
            step={0.002}
            value={logT}
            onChange={(e) => setLogT(Number(e.target.value))}
            aria-valuetext={formatKelvin(T)}
          />
          <output>{formatKelvin(T)}</output>
        </label>
      </div>
      <div className={figureStyles.withSide}>
        <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svg} role="img" aria-label={`${cap(refName)} and ${yourName}, side by side at their true sizes`}>
          <rect width={W} height={H} fill="#070b16" />
          <clipPath id={`panel-${number.replace('.', '-')}`}>
            <rect width={W} height={H} />
          </clipPath>
          <g clipPath={`url(#panel-${number.replace('.', '-')})`}>
            <StarDisc cx={cxRef} cy={H / 2} r={rRef} kelvin={ref.temperature.value} title={refName} />
            <StarDisc cx={cxYou} cy={H / 2} r={rYou} kelvin={T} title={yourName} />
            {[
              { cx: cxRef, R: ref.radius.value },
              { cx: cxYou, R },
            ]
              .filter((s) => s.R >= 50)
              .map((s) =>
                labelledRings(scale, W).map(({ ring: o, labelled }) => (
                  <g key={`${s.cx}-${o.name}`}>
                    <circle cx={s.cx} cy={H / 2} r={o.r * scale} fill="none" stroke="#e2e8f5" strokeOpacity={0.7} strokeDasharray="4 3" />
                    {labelled && (
                      <text x={s.cx} y={H / 2 - o.r * scale - 2} fontSize="10" textAnchor="middle" fill="#e2e8f5" stroke="#070b16" strokeWidth="2.5" paintOrder="stroke">
                        {o.name}
                      </text>
                    )}
                  </g>
                )),
              )}
            {[
              { cx: cxRef, r: rRef },
              { cx: cxYou, r: rYou },
            ]
              .filter((s) => s.r < 1.5)
              .map((s) => (
                <circle key={s.cx} cx={s.cx} cy={H / 2} r={7} fill="none" stroke="#e2e8f5" strokeWidth="1" />
              ))}
          </g>
          <text x={cxRef} y={H - 10} fontSize="12" textAnchor="middle" fill="#e2e8f5">
            {refName}
            {rRef < 1.5 ? ' (too small to see here)' : ''}
          </text>
          <text x={cxYou} y={H - 10} fontSize="12" textAnchor="middle" fill="#e2e8f5">
            {yourName}
            {rYou < 1.5 ? ' (too small to see here)' : ''}
          </text>
        </svg>
        <svg
          viewBox={`0 0 ${MW} ${MH}`}
          className={seasonStyles.svgLight}
          role="img"
          aria-label={`A map of temperature against luminosity: ${yourName} at ${formatKelvin(T)} and ${formatSuns(L)} Suns`}
        >
          <rect x={34} y={12} width={MW - 44} height={MH - 40} fill="var(--surface)" stroke="var(--border)" />
          {[0.01, 0.1, 1, 10, 100, 1000].map((r) => {
            const pts = [2000, 50_000].map((t) => [mx(t), my(solarLuminosity(r, t))]);
            return (
              <g key={r}>
                <line
                  x1={pts[0][0]}
                  y1={pts[0][1]}
                  x2={pts[1][0]}
                  y2={pts[1][1]}
                  stroke="var(--text-muted)"
                  strokeDasharray="3 3"
                  strokeWidth="0.8"
                  clipPath="url(#hr-clip)"
                />
              </g>
            );
          })}
          <clipPath id="hr-clip">
            <rect x={34} y={12} width={MW - 44} height={MH - 40} />
          </clipPath>
          {[0.01, 1, 100].map((r) => {
            const t = 2000 * 1.6;
            const l = solarLuminosity(r, t);
            return inMap(l) ? (
              <text key={r} x={mx(t)} y={my(l) - 3} fontSize="9" fill="var(--text-muted)">
                {r} R☉
              </text>
            ) : null;
          })}
          {[1e-4, 1e-2, 1, 1e2, 1e4, 1e6].map((l) => (
            <text key={l} x={30} y={my(l) + 3} fontSize="9" textAnchor="end" fill="var(--text-muted)">
              10{superscript(Math.log10(l))}
            </text>
          ))}
          {[30_000, 10_000, 5000, 3000].map((t) => (
            <text key={t} x={mx(t)} y={MH - 16} fontSize="9" textAnchor="middle" fill="var(--text-muted)">
              {t.toLocaleString('en-GB')}
            </text>
          ))}
          <text x={(MW + 34) / 2} y={MH - 4} fontSize="10" fontWeight="600" textAnchor="middle" fill="var(--text)">
            ← hotter · temperature, K
          </text>
          <text transform={`translate(9 ${MH / 2 - 10}) rotate(-90)`} fontSize="10" fontWeight="600" textAnchor="middle" fill="var(--text)">
            luminosity, Suns
          </text>
          {SIZE_STARS.map((s) => {
            const l = solarLuminosity(s.radius.value, s.temperature.value);
            return <circle key={s.id} cx={mx(s.temperature.value)} cy={my(l)} r={2.5} fill="var(--text-muted)" opacity={0.6} />;
          })}
          {inMap(refL) && <circle cx={mx(ref.temperature.value)} cy={my(refL)} r={5} fill="none" stroke="var(--series-2)" strokeWidth="2" />}
          {inMap(L) && <path d={`M${mx(T)} ${my(L) - 7} l6 7 l-6 7 l-6 -7 z`} fill="var(--series-1)" />}
        </svg>
      </div>
      <div className={styles.readout}>
        <span>
          {cap(refName)}: <b>{formatSuns(refL)} L☉</b>
        </span>
        <span>
          {cap(yourName)}: <b>{formatSuns(L)} L☉</b>
        </span>
        <span>L = R² × (T ÷ {T_SUN.toLocaleString('en-GB')} K)⁴, in Suns</span>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
