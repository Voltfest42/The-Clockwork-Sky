import { useState, type ReactNode } from 'react';
import { AU } from '../core/constants';
import { formatScientific } from '../core/math/scientific';
import { lightYearsFromParsecs, NAKED_EYE_LIMIT } from '../core/stars/distance';
import { starDot } from '../core/stars/photometry';
import { PARSEC } from '../core/units';
import { Caption, Figure } from '../viz/Figure';
import { onSky } from './sky/legend';
import { describeSun, distanceWords, SKY_REFERENCES, sunMagnitude, sunVisibleTo, VANTAGE_POINTS } from './sunAway';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Move the Sun away: how bright it looks from farther and farther off, on
 * the magnitude scale beside things in our own sky, and as a dot. Beyond
 * about 17 parsecs (55 light-years) it fades below what the eye can see.
 */

const W = 560;
const H = 170;
const M0 = -28;
const M1 = 20;
const PAD = 20;
/** 1 AU (log₁₀ of 4.85 × 10⁻⁶ pc is −5.314), on the slider's 0.005 grid. */
const LOG_MIN = -5.315;
const LOG_MAX = 4;
const SUN_COLOUR = '#fff1c4';

const mx = (m: number) => PAD + ((m - M0) / (M1 - M0)) * (W - 2 * PAD);

export function SunAwayFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [logD, setLogD] = useState(Math.log10(1.34));
  const parsecs = 10 ** logD;
  const m = sunMagnitude(parsecs);
  const au = (parsecs * PARSEC) / AU;
  const reset = () => setLogD(Math.log10(1.34));
  const edge = sunVisibleTo();
  const dot = starDot(Math.max(m, -1.5), 6.5);
  const caption = describeSun(parsecs);
  const magText = `${m < 0 ? '−' : ''}${Math.abs(m).toFixed(1)}`;

  return (
    <Figure
      number={number}
      title="Move the Sun away"
      description="The Sun’s brightness as it is moved farther and farther away, on the astronomers’ magnitude scale (bigger numbers are fainter) beside the full Moon, Venus, Sirius, Vega and Polaris as we see them. From α Centauri the Sun would be one of the brightest stars in the sky; beyond about 17 parsecs (55 light-years) it fades below what the eye can see."
      height={520}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the Sun, seen from the distance chosen', symbol: onSky(<path d="M0 -9 L5 0 L0 9 L-5 0 Z" fill={SUN_COLOUR} />) },
        { label: 'things in our own sky, for comparison', symbol: onSky(<line x1="0" y1="-8" x2="0" y2="8" stroke="#8fa3c8" strokeWidth="1.5" />) },
        { label: 'too faint to see without a telescope', symbol: onSky(<rect x="-9" y="-6" width="18" height="12" fill="#2a3550" />) },
      ]}
      simplified={
        <p>
          Brightness here is the Sun’s visible light only, from the inverse-square law, with nothing in the way: no dust, which dims distant
          stars a little, and no atmosphere. “The faintest the eye can see” is about magnitude 6 under a dark country sky; from a city it is
          nearer 3 or 4.
        </p>
      }
    >
      <div>
        <div className={styles.presets} role="group" aria-label="See the Sun from" style={{ marginBottom: 10 }}>
          {VANTAGE_POINTS.map((v) => (
            <button key={v.id} type="button" className={styles.toggle} aria-pressed={Math.abs(Math.log10(v.parsecs) - logD) < 0.002} onClick={() => setLogD(Math.log10(v.parsecs))}>
              {v.name}
            </button>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className={seasonStyles.svg} role="img" aria-label={`${caption} On the magnitude scale, bigger numbers are fainter.`}>
          <rect width={W} height={H} fill="#070b16" />
          <rect x={mx(NAKED_EYE_LIMIT)} y={40} width={mx(M1) - mx(NAKED_EYE_LIMIT)} height={64} fill="#2a3550" opacity={0.6} />
          <text x={mx(NAKED_EYE_LIMIT) + 6} y={98} fontSize="11" fill="var(--sky-muted)">
            too faint for the eye
          </text>
          <line x1={mx(M0)} x2={mx(M1)} y1={72} y2={72} stroke="#5c6b8a" />
          {[-25, -20, -15, -10, -5, 0, 5, 10, 15, 20].map((t) => (
            <g key={t}>
              <line x1={mx(t)} x2={mx(t)} y1={68} y2={76} stroke="#5c6b8a" />
              <text x={mx(t)} y={H - 10} fontSize="10.5" textAnchor="middle" fill="var(--sky-muted)">
                {t < 0 ? `−${-t}` : t}
              </text>
            </g>
          ))}
          {SKY_REFERENCES.map((r, i) => (
            <g key={r.name}>
              <line x1={mx(r.mag)} x2={mx(r.mag)} y1={58} y2={86} stroke="#8fa3c8" strokeWidth="1.5" />
              <text x={mx(r.mag)} y={i % 2 ? 128 : 22} fontSize="10.5" textAnchor={r.mag > 8 ? 'end' : r.mag < -20 ? 'start' : 'middle'} fill="var(--sky-muted)">
                {r.name.replace('The faintest stars the eye sees', 'Eye’s limit').replace('The faintest stars in binoculars', 'Binoculars').replace(', from Earth', ' from Earth').replace(' at its brightest', '')}
              </text>
            </g>
          ))}
          <path d={`M${mx(m)} 54 L${mx(m) + 7} 72 L${mx(m)} 90 L${mx(m) - 7} 72 Z`} fill={SUN_COLOUR} />
          <text x={Math.min(W - 60, Math.max(60, mx(m)))} y={46} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--sky-text)">
            Sun {magText}
          </text>
        </svg>
        <label className={styles.slider} style={{ marginTop: 10 }}>
          Distance
          <input
            type="range"
            min={LOG_MIN}
            max={LOG_MAX}
            step={0.005}
            value={logD}
            onChange={(e) => setLogD(Number(e.target.value))}
            aria-valuetext={`${distanceWords(parsecs)}: the Sun is magnitude ${magText}`}
          />
          <output>{distanceWords(parsecs)}</output>
        </label>
        <div className={styles.split} style={{ alignItems: 'center' }}>
          <div className={styles.readout}>
            <span>
              Distance: <b>{parsecs < 0.05 ? `${formatScientific(au, 3)} AU` : `${parsecs < 10 ? parsecs.toFixed(2) : Math.round(parsecs).toLocaleString('en-GB')} pc, ${lightYearsFromParsecs(parsecs) < 10 ? lightYearsFromParsecs(parsecs).toFixed(2) : Math.round(lightYearsFromParsecs(parsecs)).toLocaleString('en-GB')} ly`}</b>
            </span>
            <span>
              Magnitude: <b>{magText}</b>
            </span>
            <span>
              Light received: <b>{au <= 1.0001 ? 'as on Earth' : `1 / ${formatScientific(au * au, 2)} of what reaches Earth`}</b>
            </span>
            <span>
              Visible to the eye out to <b>{edge.toFixed(0)} pc ({Math.round(lightYearsFromParsecs(edge))} ly)</b>
            </span>
          </div>
          <svg viewBox="-40 -30 80 60" width="160" height="120" role="img" aria-label={m <= NAKED_EYE_LIMIT ? `The Sun as a point of light of magnitude ${magText}` : 'Nothing to see: the Sun is too faint for the eye'} style={{ justifySelf: 'center' }}>
            <rect x={-40} y={-30} width={80} height={60} rx={6} fill="#070b16" />
            {m < -2 ? (
              <circle r={Math.min(22, 4 + (-2 - m) * 0.8)} fill={SUN_COLOUR} />
            ) : (
              dot.radius > 0 && <circle r={dot.radius} fill={SUN_COLOUR} opacity={dot.alpha} />
            )}
          </svg>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
