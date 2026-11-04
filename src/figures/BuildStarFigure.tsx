import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fromPhysics } from '../core/stars/hr';
import type { StarSummary } from '../core/structure/zams';
import { Caption, Figure } from '../viz/Figure';
import { useAnimationFrame, useOnScreen, useReducedMotion } from '../viz/hooks';
import { physicistRange } from '../viz/hr/axes';
import { HRDiagram, type HRMarker } from '../viz/hr/HRDiagram';
import { ProfilePlot, type ProfileSeries } from '../viz/profile/ProfilePlot';
import { ScatterChart } from '../viz/ScatterChart';
import { useBuiltStar, useMainSequence } from '../viz/useStellar';
import { BUILD_PRESETS, BUILD_RANGE, BURNING, formatLuminosity, MAIN_SEQUENCE_MASSES, SUN_SHELLS, zonesInWords } from './energy';
import { formatGramsPerCc, formatKelvin } from './holding';
import { loadGaia, type GaiaSets } from './hrStars';
import { DEBCAT_STARS } from './massLuminosity';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Build a star (Figure 21.4): mass and make-up in, and the four equations of
 * structure solved in the stellar worker by the fitting method. Each try is
 * drawn: the centre's half and the surface's half of the star, which miss each
 * other at the fitting point until Newton's method brings them together. Out
 * come the radius, luminosity and surface temperature, the profiles inside
 * with the convective zones, and the star's place on the HR diagram. "Build a
 * main sequence" runs a range of masses and lays the line over Gaia's stars
 * and the measured masses and luminosities of DEBCat's eclipsing pairs.
 */

type View = 'tries' | 'inside' | 'hr' | 'mass';
const VIEWS: { id: View; name: string }[] = [
  { id: 'tries', name: 'The tries' },
  { id: 'inside', name: 'Inside' },
  { id: 'hr', name: 'HR diagram' },
  { id: 'mass', name: 'Mass and light' },
];
type Quantity = 'T' | 'rho' | 'L' | 'm' | 'gradients';
const QUANTITIES: { id: Quantity; name: string }[] = [
  { id: 'T', name: 'Temperature' },
  { id: 'rho', name: 'Density' },
  { id: 'L', name: 'Luminosity' },
  { id: 'm', name: 'Mass inside' },
  { id: 'gradients', name: 'Gradients' },
];

const START = {
  preset: 'young-sun',
  mass: 1,
  X: 0.7,
  Z: 0.02,
  burning: 1,
  today: false,
  view: 'tries' as View,
  quantity: 'T' as Quantity,
  cursor: 0.5,
};
const RANGE = physicistRange(50000, 2000, 1e-4, 1e6);

/** Inputs rounded so that a slider's every pixel doesn't make a new star. */
const roundMass = (m: number) => Number(m.toPrecision(3));
const roundZ = (z: number) => Number(z.toPrecision(2));

/** A main sequence's luminosity at a mass, by interpolating in log–log between the stars built. */
function lineThrough(ms: readonly StarSummary[], key: 'luminosity' | 'radius') {
  const ok = ms.filter((s) => s.converged);
  return (m: number) => {
    if (!ok.length) return NaN;
    if (m <= ok[0].mass || m >= ok[ok.length - 1].mass) return NaN;
    let k = 1;
    while (k < ok.length - 1 && ok[k].mass < m) k++;
    const a = ok[k - 1];
    const b = ok[k];
    const f = Math.log(m / a.mass) / Math.log(b.mass / a.mass);
    return Math.exp(Math.log(a[key]) + f * Math.log(b[key] / a[key]));
  };
}

export function BuildStarFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [preset, setPreset] = useState<string | null>(START.preset);
  const [mass, setMass] = useState(START.mass);
  const [X, setX] = useState(START.X);
  const [Z, setZ] = useState(START.Z);
  const [burning, setBurning] = useState(START.burning);
  const [today, setToday] = useState(START.today);
  const [view, setView] = useState<View>(START.view);
  const [quantity, setQuantity] = useState<Quantity>(START.quantity);
  const [cursor, setCursor] = useState(START.cursor);
  const [tryShown, setTryShown] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [wantLine, setWantLine] = useState(false);
  const [gaia, setGaia] = useState<GaiaSets | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(box);
  const reducedMotion = useReducedMotion();
  const reset = () => {
    setPreset(START.preset);
    setMass(START.mass);
    setX(START.X);
    setZ(START.Z);
    setBurning(START.burning);
    setToday(START.today);
    setView(START.view);
    setQuantity(START.quantity);
    setCursor(START.cursor);
    setTryShown(null);
    setPlaying(false);
    setWantLine(false);
  };

  const request = { mass: today ? 1 : mass, X, Z, burning, today };
  const answer = useBuiltStar(request);
  const fresh =
    !!answer &&
    answer.input.X === X &&
    answer.input.Z === Z &&
    (answer.input.burning ?? 1) === burning &&
    (today ? !!answer.input.hydrogen : !answer.input.hydrogen && answer.input.mass === mass);
  const model = answer;
  const line = useMainSequence(wantLine ? { masses: MAIN_SEQUENCE_MASSES, X, Z } : null);
  const lineFresh = !!line && line.length === MAIN_SEQUENCE_MASSES.length;

  useEffect(() => {
    if (view !== 'hr' || gaia) return;
    let live = true;
    loadGaia().then((g) => live && setGaia(g));
    return () => {
      live = false;
    };
  }, [view, gaia]);

  const tries = model?.tries ?? [];
  const lastTry = Math.max(0, tries.length - 1);
  const shownTry = Math.min(tryShown ?? lastTry, lastTry);

  useAnimationFrame(playing && onScreen && view === 'tries', () => {
    // One try every half second or so: the frame counter advances slowly.
    setTryShown((t) => {
      const next = (t ?? 0) + 1 / 30;
      if (next >= lastTry) {
        setPlaying(false);
        return lastTry;
      }
      return next;
    });
  });

  const choosePreset = (id: string) => {
    const p = BUILD_PRESETS.find((q) => q.id === id)!;
    setPreset(id);
    setMass(p.mass);
    setX(p.X);
    setZ(p.Z);
    setToday(!!p.today);
    setBurning(1);
    setTryShown(null);
  };
  const changed = (f: () => void) => {
    f();
    setPreset(null);
    setToday(false);
    setTryShown(null);
  };

  const isSun = (today || (mass === 1 && X === 0.7 && Z === 0.02)) && burning === 1;
  const ok = model?.converged;

  // ---------- The tries ----------
  const triesSeries: ProfileSeries[] = [];
  const k = Math.floor(shownTry);
  tries.forEach((t, i) => {
    if (i > k) return;
    const current = i === k;
    const color = current ? 'var(--accent)' : 'var(--text-muted)';
    if (!current && i < k - 3) return;
    triesSeries.push({
      name: current ? `try ${i + 1}: from the centre` : `try ${i + 1}`,
      color,
      points: t.out.r.map((r, j) => ({ x: r, y: Math.exp(t.out.lnT[j]) })),
    });
    triesSeries.push({
      name: current ? `try ${i + 1}: from the surface` : `try ${i + 1} (surface)`,
      color: current ? 'var(--series-2)' : 'var(--text-muted)',
      dashed: true,
      points: t.in.r.map((r, j) => ({ x: r, y: Math.exp(t.in.lnT[j]) })).reverse(),
    });
  });
  const rMax = Math.max(0.2, ...tries.slice(0, k + 1).flatMap((t) => [...t.in.r, ...t.out.r])) * 1.05;
  const miss = tries[k]?.miss;
  const pct = (lnRatio: number) => `${lnRatio >= 0 ? '+' : '−'}${Math.abs((Math.exp(lnRatio) - 1) * 100).toPrecision(2)}%`;

  // ---------- Inside ----------
  const shells = ok ? model!.shells : [];
  const inside: ProfileSeries[] = [];
  let yScale: 'linear' | 'log' = 'log';
  let yMin = 1e3;
  let yMax = 1e8;
  let yLabel = 'Temperature (K)';
  let formatValue = (v: number) => formatKelvin(v);
  const sun = (pick: (s: (typeof SUN_SHELLS)[number]) => number) => SUN_SHELLS.map((s) => ({ x: s.x, y: pick(s) }));
  if (quantity === 'T') {
    inside.push({
      name: 'built star',
      color: 'var(--accent)',
      points: shells.map((s) => ({ x: s.r, y: s.T })),
    });
    if (isSun)
      inside.push({
        name: 'today’s Sun (Model S)',
        color: 'var(--series-2)',
        dashed: true,
        points: sun((s) => s.T),
      });
  } else if (quantity === 'rho') {
    yLabel = 'Density (g/cm³)';
    yMin = 1e-7;
    yMax = 1e3;
    formatValue = (v) => formatGramsPerCc(v * 1000);
    inside.push({
      name: 'built star',
      color: 'var(--accent)',
      points: shells.map((s) => ({ x: s.r, y: s.rho / 1000 })),
    });
    if (isSun)
      inside.push({
        name: 'today’s Sun (Model S)',
        color: 'var(--series-2)',
        dashed: true,
        points: sun((s) => s.rho / 1000),
      });
  } else if (quantity === 'L' || quantity === 'm') {
    yScale = 'linear';
    yMin = 0;
    yMax = 1;
    yLabel = quantity === 'L' ? 'Luminosity made inside (fraction)' : 'Mass inside (fraction)';
    formatValue = (v) => `${Math.round(v * 100)}%`;
    const L = model?.luminosity ?? 1;
    inside.push({
      name: 'built star',
      color: 'var(--accent)',
      points: shells.map((s) => ({
        x: s.r,
        y: quantity === 'L' ? s.L / L : s.q,
      })),
    });
    if (isSun)
      inside.push({
        name: 'today’s Sun (Model S)',
        color: 'var(--series-2)',
        dashed: true,
        points: sun((s) => (quantity === 'L' ? s.L : s.m)),
      });
  } else {
    yScale = 'linear';
    yMin = 0;
    yMax = 1;
    yLabel = 'd ln T / d ln P';
    formatValue = (v) => v.toFixed(3);
    inside.push({
      name: 'what radiation needs, ∇_rad',
      color: 'var(--accent)',
      points: shells.filter((s) => s.nablaRad < 1.05).map((s) => ({ x: s.r, y: s.nablaRad })),
    });
    inside.push({
      name: 'adiabat ∇_ad',
      color: 'var(--series-2)',
      dashed: true,
      points: shells.map((s) => ({ x: s.r, y: s.nablaAd })),
    });
  }

  // ---------- HR and mass–luminosity ----------
  const markers: HRMarker[] = ok
    ? [
        {
          id: 'built',
          label: `${today ? 'today’s Sun' : `${mass} M☉`}, built`,
          point: fromPhysics(model!.teff, model!.luminosity),
          highlight: true,
        },
      ]
    : [];
  const msPoints = lineFresh ? line!.filter((s) => s.converged) : [];
  const lumLine = useMemo(() => (lineFresh ? lineThrough(line!, 'luminosity') : null), [line, lineFresh]);

  const summary = ok
    ? `${today ? 'Today’s Sun, built with Model S’s burnt-down core,' : `A star of ${mass} M☉ (X = ${X}, Z = ${Z}${burning !== 1 ? `, burning ×${burning}` : ''})`} has a radius of ${model!.radius.toPrecision(3)} R☉, shines with ${formatLuminosity(model!.luminosity)} and has a surface of ${formatKelvin(model!.teff)}. Its centre is ${formatKelvin(model!.centre.T)} and ${formatGramsPerCc(model!.centre.rho)}; ${zonesInWords(model!)}.`
    : model
      ? `The solver didn’t settle: ${model.failure}.`
      : 'Building…';

  const tryCaption =
    tries.length && miss
      ? `Try ${k + 1} of ${tries.length}: at the fitting point, halfway out in mass, the centre’s half and the surface’s half differ by ${pct(miss[0])} in radius, ${pct(miss[1])} in pressure, ${(miss[2] * 100).toPrecision(2)}% of the luminosity and ${pct(miss[3])} in temperature.${
          k === lastTry && ok ? ' They meet: this is the star.' : ' Newton’s method uses the misses to correct the four guesses.'
        }`
      : '';

  return (
    <Figure
      number={number}
      title="Build a star"
      description="A star built from scratch: choose its mass and make-up, and the four equations of stellar structure (mass, balance, energy and transport) are solved by stepping out from the centre and in from the surface, correcting four guesses until the halves meet. Out come its radius, luminosity, surface temperature, the profiles inside and where it convects. Built from today’s make-up, the Sun comes out within about 15% of Model S; built young, it has 0.59 of today’s luminosity. A range of masses lays a main sequence over Gaia’s stars and DEBCat’s measured masses and luminosities."
      height={820}
      tryThis={tryThis}
      onReset={reset}
      simplified={
        <p>
          The gas is ideal, with Saha’s ionisation for hydrogen and helium in the outer layers, partly degenerate electrons and light; its opacity is
          the analytic fits of Figure 21.2, with Kramers’ correction factor fitted to the Sun’s tables; its burning the pp and CNO fits (Chapter 22).
          Convecting gas follows the adiabat exactly (no mixing length), and the photosphere is where T = T_eff and P = ⅔g/κ. The star is freshly
          mixed and unchanging, a zero-age main-sequence star, except today’s Sun, which takes Model S’s hydrogen. No rotation, magnetism or
          diffusion. From 0.8 to 20 Suns its luminosities are within a factor of 1.5 of detailed models’ (Tout and colleagues’ fits) and its radii
          within a quarter (mostly within 10%); below about half a Sun its stars come out two to three times too faint and too cool, because red
          dwarfs’ surfaces are full of molecules it doesn’t have, and its convective cores appear at about 1.4 Suns rather than 1.1–1.2. Research
          codes such as MESA use tabulated opacities and equations of state, thousands of layers and every reaction.
        </p>
      }
    >
      <div ref={box}>
        <div className={styles.presets} role="group" aria-label="Stars">
          {BUILD_PRESETS.map((p) => (
            <button key={p.id} type="button" className={styles.toggle} aria-pressed={preset === p.id} onClick={() => choosePreset(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
        <div className={styles.controls} style={{ marginTop: 8 }}>
          <Slider
            label="Mass"
            value={today ? 1 : mass}
            min={BUILD_RANGE[0]}
            max={BUILD_RANGE[1]}
            log
            format={(m) => `${roundMass(m)} M☉`}
            onChange={(m) => changed(() => setMass(roundMass(m)))}
            disabled={today}
          />
          <Slider
            label="Hydrogen, X"
            value={X}
            min={0.5}
            max={0.76}
            step={0.01}
            format={(x) => x.toFixed(2)}
            onChange={(x) => changed(() => setX(Math.round(x * 100) / 100))}
          />
          <Slider
            label="Metals, Z"
            value={Z}
            min={0.001}
            max={0.04}
            log
            format={(z) => String(roundZ(z))}
            onChange={(z) => changed(() => setZ(roundZ(z)))}
          />
        </div>
        <div className={figureStyles.toolbar}>
          <span className={figureStyles.segmented} role="group" aria-label="Burning rate">
            {BURNING.map((b) => (
              <button key={b} type="button" aria-pressed={burning === b} onClick={() => setBurning(b)}>
                Burning ×{b}
              </button>
            ))}
          </span>
        </div>
        <div className={styles.card} aria-live="polite" aria-busy={!fresh}>
          <p style={{ margin: 0 }}>{fresh || !model ? summary : `Building… (showing the last star: ${summary})`}</p>
        </div>

        <div className={figureStyles.toolbar} style={{ marginTop: 10 }}>
          <span className={figureStyles.segmented} role="group" aria-label="Show">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}>
                {v.name}
              </button>
            ))}
          </span>
          {(view === 'hr' || view === 'mass') && (
            <button type="button" className={styles.toggle} aria-pressed={wantLine} onClick={() => setWantLine(true)} disabled={wantLine}>
              {wantLine ? (lineFresh ? `A main sequence of ${msPoints.length} stars` : 'Building a main sequence…') : 'Build a main sequence'}
            </button>
          )}
        </div>

        {view === 'tries' && (
          <>
            <div className={figureStyles.toolbar}>
              <button
                type="button"
                className={styles.toggle}
                aria-pressed={playing}
                disabled={tries.length < 2}
                onClick={() => {
                  if (reducedMotion) {
                    setTryShown(lastTry);
                    return;
                  }
                  if (!playing && k >= lastTry) setTryShown(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? 'Pause' : 'Play the tries'}
              </button>
            </div>
            <div className={styles.controls}>
              <Slider
                label="Try"
                value={k + 1}
                min={1}
                max={Math.max(1, tries.length)}
                step={1}
                format={(t) => `${Math.round(t)} of ${tries.length}`}
                onChange={(t) => {
                  setPlaying(false);
                  setTryShown(Math.round(t) - 1);
                }}
                disabled={tries.length < 2}
              />
            </div>
            <ProfilePlot
              series={triesSeries}
              xLabel="Distance from the centre (R☉)"
              yLabel="Temperature (K)"
              xMax={rMax}
              yScale="log"
              yMin={2e3}
              yMax={1e8}
              formatX={(x) => String(Number(x.toPrecision(2)))}
              formatValue={formatKelvin}
              hideLegend
              ariaLabel={`Try ${k + 1} of ${tries.length}: the temperature stepped out from the centre and in from the surface, meeting at the fitting point${k === lastTry && ok ? '' : ' or missing it'}`}
              height={280}
            />
            <p className={styles.hint}>Solid: stepped out from the centre. Dashed: stepped in from the surface. Grey: the three tries before.</p>
          </>
        )}

        {view === 'inside' && (
          <>
            <div className={figureStyles.toolbar}>
              <span className={figureStyles.segmented} role="group" aria-label="Quantity">
                {QUANTITIES.map((q) => (
                  <button key={q.id} type="button" aria-pressed={quantity === q.id} onClick={() => setQuantity(q.id)}>
                    {q.name}
                  </button>
                ))}
              </span>
            </div>
            <ProfilePlot
              series={inside}
              zones={
                ok
                  ? model!.zones.map((z) => ({
                      from: z.r[0],
                      to: z.r[1],
                      label: 'convects',
                    }))
                  : []
              }
              xLabel="Distance from the centre (fraction of the radius)"
              yLabel={yLabel}
              yScale={yScale}
              yMin={yMin}
              yMax={yMax}
              formatValue={formatValue}
              cursor={cursor}
              onCursor={setCursor}
              cursorText={(x) => `${x.toFixed(2)} of the radius`}
              ariaLabel={`${yLabel} inside the built star against distance from its centre${isSun ? ', beside Model S' : ''}`}
              height={280}
            />
          </>
        )}

        {view === 'hr' && (
          <HRDiagram
            axes="physicist"
            range={RANGE}
            density={gaia?.hundred.density}
            radiusLines
            markers={markers}
            ariaLabel={`The built star on the HR diagram over Gaia’s stars within 100 parsecs${lineFresh ? ', with the main sequence the builder made' : ''}`}
          >
            {(place) =>
              lineFresh ? (
                <polyline
                  points={msPoints.map((s) => place(fromPhysics(s.teff, s.luminosity)).join(',')).join(' ')}
                  fill="none"
                  stroke="#f6c453"
                  strokeWidth="2.5"
                />
              ) : null
            }
          </HRDiagram>
        )}

        {view === 'mass' && (
          <ScatterChart
            groups={[
              {
                name: 'measured stars (DEBCat)',
                color: 'var(--text-muted)',
                shape: 'circle',
                points: DEBCAT_STARS.filter((s) => s.mainSequence).map((s) => ({
                  x: s.mass,
                  y: s.luminosity,
                  label: s.label,
                })),
              },
            ]}
            lines={
              lumLine
                ? [
                    {
                      name: 'the builder’s main sequence',
                      color: 'var(--accent)',
                      f: lumLine,
                    },
                  ]
                : []
            }
            highlight={
              ok
                ? {
                    x: today ? 1 : mass,
                    y: model!.luminosity,
                    label: 'built',
                    color: 'var(--series-2)',
                  }
                : undefined
            }
            xScale="log"
            yScale="log"
            xMin={0.1}
            xMax={30}
            yMin={1e-3}
            yMax={1e6}
            xLabel="Mass (M☉)"
            yLabel="Luminosity (L☉)"
            formatY={(y) => String(y >= 1 ? y : Number(y.toPrecision(1)))}
            ariaLabel="Luminosity against mass on log axes: measured eclipsing pairs, the built star and, once built, the builder’s main sequence"
            height={320}
          />
        )}
      </div>
      <Caption>{view === 'tries' ? tryCaption || summary : summary}</Caption>
    </Figure>
  );
}
