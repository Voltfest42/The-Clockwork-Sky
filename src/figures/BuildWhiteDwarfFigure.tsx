import { useMemo, useState, type ReactNode } from 'react';
import { M_SUN } from '../core/constants';
import { densityAt, relativisticShare } from '../core/compact/whiteDwarf';
import { formatScientific } from '../core/math/scientific';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { formatGramsPerCc } from './holding';
import { CHANDRASEKHAR, EARTH_KM, formatKm, MEASURED, MOON_KM, WD_LOG_RHO, WD_MAKEUPS, WD_PREDICTIONS, WD_START, wdCurves, whiteDwarfAt, type MakeupId } from './limits';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Build a white dwarf (Figure 24.2): choose the central density, and the
 * stepping solver builds a cold white dwarf with Chandrasekhar's exact
 * pressure, step by step from the centre to the surface; its mass and radius
 * go on the mass–radius curve, beside the white dwarfs whose masses and radii
 * are measured. Heavier white dwarfs are smaller, and none is heavier than
 * Chandrasekhar's mass. A predict-first question opens it.
 */

const R_MAX = 25_000;

export function BuildWhiteDwarfFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [logRho, setLogRho] = useState<number>(WD_START.logRho);
  const [makeup, setMakeup] = useState<MakeupId>(WD_START.makeup);
  const [guess, setGuess] = useState<number | null>(null);
  const [checked, setChecked] = useState<number | null>(null);
  const reset = () => {
    setLogRho(WD_START.logRho);
    setMakeup(WD_START.makeup);
    setGuess(null);
    setChecked(null);
  };
  const mue = WD_MAKEUPS.find((m) => m.id === makeup)!.mue;
  const iron = makeup === 'iron';
  const wd = useMemo(() => whiteDwarfAt(logRho, mue), [logRho, mue]);
  const curves = wdCurves();
  const curve = iron ? curves.iron : curves.two;
  const other = iron ? curves.two : curves.iron;
  const limit = iron ? CHANDRASEKHAR.iron : CHANDRASEKHAR.two;
  const mass = wd.mass / M_SUN;
  const radiusKm = wd.radius / 1000;
  const share = relativisticShare(wd);
  // Mass → central density, along the curve, for a click on the chart.
  const pickMass = (m: number) => {
    for (let i = 1; i < curve.length; i++) {
      if (curve[i].mass >= m) {
        const f = (m - curve[i - 1].mass) / (curve[i].mass - curve[i - 1].mass);
        const lr = Math.log10(curve[i - 1].rhoC / 1000) + f * (Math.log10(curve[i].rhoC / 1000) - Math.log10(curve[i - 1].rhoC / 1000));
        setLogRho(Math.round(lr * 100) / 100);
        return;
      }
    }
    setLogRho(WD_LOG_RHO[1]);
  };
  const profile = wd.profile.filter((p) => p.rho > 0);
  const stepDots = wd.steps.map((s) => ({ r: s.x / 1000, rho: densityAt(s.y[0], mue) / 1000 })).filter((d) => d.rho > 0);
  const earths = radiusKm / EARTH_KM;
  const caption = `With ${formatGramsPerCc(wd.rhoC)} at its centre, the solver steps out ${wd.steps.length} times to the surface: the white dwarf weighs ${mass.toFixed(3)} M☉ and is ${formatKm(radiusKm)} in radius, ${
    earths >= 0.95 ? `${earths.toFixed(1)} times Earth’s` : `${Math.round(earths * 100)}% of Earth’s`
  }. Its electrons move near light speed (faster than mₑc) in ${Math.round(share * 100)}% of its mass${mass > 0.99 * limit ? `; it is within 1% of the limit, ${limit.toFixed(2)} M☉, and squeezing it harder adds almost nothing` : ''}.`;
  // To scale: the white dwarf beside Earth and the Moon.
  const biggest = Math.max(radiusKm, EARTH_KM);
  const sr = (km: number) => (km / biggest) * 52;

  return (
    <Figure
      number={number}
      title="Build a white dwarf"
      description="A cold white dwarf built by stepping out from its centre with the exact pressure of packed electrons, from slow ones to those near light speed. The denser its centre, the heavier it is and the smaller: a white dwarf of half a Sun is a little larger than Earth, one of 1.4 Suns the size of the Moon, and none can weigh more than Chandrasekhar’s 1.46 Suns (1.26 if it were iron). Measured white dwarfs, Sirius B, Procyon B, 40 Eridani B and ZTF J1901+1458, lie close to the curve."
      height={1060}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'white dwarfs the solver builds', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: iron ? 'two nucleons per electron, for comparison' : 'iron, for comparison', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="6 4" /> },
        { label: 'measured white dwarfs, with their errors', symbol: <circle r="4.5" fill="var(--series-3)" /> },
        { label: 'this white dwarf', symbol: <circle r="6" fill="var(--accent)" stroke="var(--bg)" strokeWidth="1.5" /> },
        { label: 'the solver’s steps, centre to surface', symbol: <circle r="3" fill="var(--series-2)" /> },
      ]}
      simplified={
        <p>
          The white dwarfs are cold: their electrons’ pressure is Chandrasekhar’s exact one at zero temperature, and nothing else holds them up.
          Only how many nucleons there are per electron matters, so helium and carbon–oxygen white dwarfs come out the same; the electric pull
          between electrons and ions, which shrinks real ones by a few per cent and separates the two, is left out, and so are the white dwarf’s
          heat and thin skin of hydrogen, which make young ones larger, general relativity and the capture of electrons by nuclei at the
          highest densities, which bring a real carbon–oxygen white dwarf’s limit to about 1.38 Suns. Close to the limit the radius changes fast
          with mass, which is why ZTF J1901+1458 sits furthest from the curve.
        </p>
      }
    >
      <div className={seasonStyles.predict}>
        <fieldset>
          <legend>Predict first: one white dwarf is heavier than another. Is it bigger or smaller?</legend>
          {WD_PREDICTIONS.map((p, k) => (
            <label key={p.id} className={figureStyles.checkbox}>
              <input type="radio" name={`wd-guess-${number}`} checked={guess === k} onChange={() => setGuess(k)} />
              {p.label}
            </label>
          ))}
          <button type="button" className={figureStyles.toolButton} disabled={guess === null} onClick={() => setChecked(guess)}>
            Check
          </button>
        </fieldset>
        <div aria-live="polite">
          {checked !== null && (
            <p className={seasonStyles.verdict}>
              <span className={WD_PREDICTIONS[checked].correct ? seasonStyles.right : seasonStyles.wrong}>{WD_PREDICTIONS[checked].correct ? '✓ Right.' : '✗ Not quite.'}</span> It is
              smaller. More weight needs more pressure to hold it, and packed electrons push harder only when they are packed tighter, so a
              heavier white dwarf is squeezed into a smaller ball. Slide the central density up and watch the radius fall.
            </p>
          )}
        </div>
      </div>

      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Made of">
          {WD_MAKEUPS.map((m) => (
            <button key={m.id} type="button" aria-pressed={makeup === m.id} onClick={() => setMakeup(m.id)}>
              {m.name}
            </button>
          ))}
        </span>
      </div>
      <div className={styles.controls}>
        <Slider
          label="Density at the centre"
          value={10 ** logRho * 1000}
          min={10 ** WD_LOG_RHO[0] * 1000}
          max={10 ** WD_LOG_RHO[1] * 1000}
          log
          step={0.01}
          format={formatGramsPerCc}
          onChange={(v) => setLogRho(Math.round(Math.log10(v / 1000) * 100) / 100)}
        />
      </div>

      <div className={figureStyles.withSide}>
        <div>
          <p className={styles.panelTitle}>Mass and radius</p>
          <ProfilePlot
            series={[
              { name: iron ? 'two nucleons per electron' : 'iron', color: 'var(--text-muted)', dashed: true, points: other.map((p) => ({ x: p.mass, y: p.radiusKm })) },
              { name: iron ? 'iron' : 'helium, carbon or oxygen', color: 'var(--accent)', points: curve.map((p) => ({ x: p.mass, y: p.radiusKm })) },
            ]}
            hideLegend
            xMin={0}
            xMax={1.5}
            formatX={(x) => x.toFixed(1)}
            xLabel="Mass (M☉)"
            yLabel="Radius (km)"
            yMin={0}
            yMax={R_MAX}
            formatY={(y) => Number(y).toLocaleString('en-GB')}
            cursor={mass}
            onCursor={pickMass}
            cursorText={(x) => `${x.toFixed(2)} M☉`}
            formatValue={(y) => formatKm(y)}
            ariaLabel={`White dwarfs’ radius against mass: the radius falls as the mass grows, to nothing at ${limit.toFixed(2)} M☉. This one weighs ${mass.toFixed(3)} M☉ and is ${formatKm(radiusKm)} in radius.`}
            height={330}
          >
            {(sx, sy) => (
              <g>
                {[
                  { km: EARTH_KM, label: 'Earth’s radius' },
                  { km: MOON_KM, label: 'the Moon’s' },
                ].map((l) => (
                  <g key={l.label}>
                    <line x1={sx(0)} x2={sx(1.5)} y1={sy(l.km)} y2={sy(l.km)} stroke="var(--text-muted)" strokeDasharray="2 3" />
                    <text x={sx(0.02)} y={sy(l.km) - 4} fontSize="11" fill="var(--text-muted)">
                      {l.label}
                    </text>
                  </g>
                ))}
                <line x1={sx(limit)} x2={sx(limit)} y1={sy(0)} y2={sy(R_MAX)} stroke="var(--accent)" strokeDasharray="5 3" />
                <text x={sx(limit) - 4} y={sy(R_MAX * 0.93)} fontSize="11" fill="var(--text)" textAnchor="end">
                  limit {limit.toFixed(2)} M☉
                </text>
                {MEASURED.map((w) => (
                  <g key={w.id}>
                    <line x1={sx(w.mass - w.massError)} x2={sx(w.mass + w.massError)} y1={sy(w.radiusKm)} y2={sy(w.radiusKm)} stroke="var(--series-3)" strokeWidth="1.5" />
                    <line x1={sx(w.mass)} x2={sx(w.mass)} y1={sy(w.radiusKm - w.radiusErrorKm)} y2={sy(w.radiusKm + w.radiusErrorKm)} stroke="var(--series-3)" strokeWidth="1.5" />
                    <circle cx={sx(w.mass)} cy={sy(w.radiusKm)} r={4.5} fill="var(--series-3)" />
                    <text x={sx(w.mass) + (w.id === 'sirius-b' ? 7 : -7)} y={sy(w.radiusKm) + (w.id === '40-eri-b' ? 15 : -7)} fontSize="11" fill="var(--text)" textAnchor={w.id === 'sirius-b' ? 'start' : 'end'}>
                      {w.name}
                    </text>
                  </g>
                ))}
                <circle cx={sx(mass)} cy={sy(radiusKm)} r={6.5} fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />
              </g>
            )}
          </ProfilePlot>
        </div>
        <div className={figureStyles.side}>
          <p className={styles.panelTitle}>To scale</p>
          <svg viewBox="0 0 240 130" width="100%" role="img" aria-label={`This white dwarf beside Earth and the Moon, to scale: ${formatKm(radiusKm)} in radius against Earth’s ${formatKm(EARTH_KM)} and the Moon’s ${formatKm(MOON_KM)}.`}>
            <circle cx={60} cy={62} r={sr(EARTH_KM)} fill="var(--series-3)" fillOpacity={0.55} />
            <text x={60} y={124} fontSize="11" fill="var(--text)" textAnchor="middle">
              Earth
            </text>
            <circle cx={150} cy={62} r={Math.max(1.5, sr(radiusKm))} fill="var(--accent)" fillOpacity={0.85} />
            <text x={150} y={124} fontSize="11" fill="var(--text)" textAnchor="middle">
              this white dwarf
            </text>
            <circle cx={222} cy={62} r={Math.max(1, sr(MOON_KM))} fill="var(--text-muted)" fillOpacity={0.7} />
            <text x={222} y={124} fontSize="11" fill="var(--text)" textAnchor="middle">
              Moon
            </text>
          </svg>
          <dl className={styles.facts}>
            <div>
              <dt>Mass</dt>
              <dd>{mass.toFixed(3)} M☉</dd>
            </div>
            <div>
              <dt>Radius</dt>
              <dd>
                {formatKm(radiusKm)} ({earths.toFixed(2)} Earths)
              </dd>
            </div>
            <div>
              <dt>Centre</dt>
              <dd>{formatGramsPerCc(wd.rhoC)}</dd>
            </div>
            <div>
              <dt>Near light speed</dt>
              <dd>{Math.round(share * 100)}% of its mass</dd>
            </div>
            <div>
              <dt>A teaspoon of its centre</dt>
              <dd>{formatScientific((wd.rhoC / 1000) * 5, 2)} g</dd>
            </div>
          </dl>
        </div>
      </div>

      <p className={styles.panelTitle} style={{ marginTop: 12 }}>
        Inside it: density from the centre out, and the solver’s steps
      </p>
      <ProfilePlot
        series={[{ name: 'density', color: 'var(--accent)', points: profile.map((p) => ({ x: p.r / 1000, y: p.rho / 1000 })) }]}
        hideLegend
        xMin={0}
        xMax={radiusKm}
        formatX={(x) => Math.round(x).toLocaleString('en-GB')}
        xLabel="Distance from the centre (km)"
        yLabel="Density (g/cm³)"
        yScale="log"
        yMin={Math.max(1, (wd.rhoC / 1000) * 1e-7)}
        yMax={(wd.rhoC / 1000) * 3}
        ariaLabel={`Density inside the white dwarf, falling from ${formatGramsPerCc(wd.rhoC)} at the centre to nothing at ${formatKm(radiusKm)}, with the ${wd.steps.length} steps the solver took, shorter where the density changes fastest, near the surface.`}
        height={220}
      >
        {(sx, sy) => (
          <g>
            {stepDots.map((d, k) => (
              <circle key={k} cx={sx(d.r)} cy={sy(d.rho)} r={2.4} fill="var(--series-2)" />
            ))}
          </g>
        )}
      </ProfilePlot>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
