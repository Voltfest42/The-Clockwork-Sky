import { useMemo, useState, type ReactNode } from 'react';
import { formatScientific, powerOfTen } from '../core/math/scientific';
import { degeneratePressure } from '../core/structure/eos';
import { degeneracyDensity, occupation, pairGas } from '../core/structure/fermi';
import { AMU, K_B } from '../core/constants';
import { CoreMap } from '../viz/coremap/CoreMap';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { formatGramsPerCc, formatPascals } from './holding';
import { FERMI_PRESETS, FERMI_RHO_RANGE, FERMI_START, FERMI_T_RANGE, fermiState, formatAnyKelvin, formatElectronvolts, formatMomentum, packingWord } from './limits';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Filling the Fermi sea (Figure 24.1): electrons filling momentum states,
 * shown as a slice through momentum space, each state shaded by how likely it
 * is to be taken (Fermi–Dirac, at the chosen density and temperature); their
 * pressure against density, beside an ideal gas's and packed electrons' at
 * zero temperature; and the core's map with the line where the electrons'
 * Fermi energy equals kT.
 */

const CELLS = 25;
const LOG_T_MAP = [4.5, 9.5] as const;
const LOG_RHO_MAP = [-2, 10] as const;
const HELIUM = { X: 0, Z: 0 };

export function FermiSeaFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [rho, setRho] = useState<number>(FERMI_START.rho);
  const [T, setT] = useState<number>(FERMI_START.T);
  const [mue, setMue] = useState<number>(FERMI_START.mue);
  const reset = () => {
    setRho(FERMI_START.rho);
    setT(FERMI_START.T);
    setMue(FERMI_START.mue);
  };
  const s = fermiState(rho, T, mue);
  const preset = FERMI_PRESETS.find((p) => Math.abs(p.rho / rho - 1) < 1e-6 && Math.abs(p.T / T - 1) < 1e-6);
  const packing = packingWord(T, s.TF);

  // The momentum slice: wide enough for the sea and for the spread heat gives it.
  const thermal = Math.sqrt((1 + 3 * s.theta) ** 2 - 1);
  const view = 1.45 * Math.max(s.x, thermal);
  const cell = (2 * view) / CELLS;
  const size = 300;
  const scale = size / (2 * view);
  const cells = useMemo(() => {
    const out: { i: number; j: number; f: number }[] = [];
    for (let i = 0; i < CELLS; i++) {
      for (let j = 0; j < CELLS; j++) {
        const px = -view + (i + 0.5) * cell;
        const py = -view + (j + 0.5) * cell;
        const t = Math.hypot(px, py);
        out.push({ i, j, f: occupation(Math.sqrt(1 + t * t), s.psi, s.theta) });
      }
    }
    return out;
  }, [view, cell, s.psi, s.theta]);

  // Pressure against density at this temperature.
  const curves = useMemo(() => {
    const xs = Array.from({ length: 61 }, (_, k) => 0 + (k / 60) * 10);
    const nOf = (lg: number) => (10 ** lg * 1000) / (mue * AMU);
    return {
      exact: xs.map((x) => ({ x, y: pairGas(nOf(x), T, false).pressure })),
      ideal: xs.map((x) => ({ x, y: nOf(x) * K_B * T })),
      packed: xs.map((x) => ({ x, y: degeneratePressure(nOf(x)) })),
    };
  }, [T, mue]);
  const degeneracyLine = useMemo(
    () => Array.from({ length: 40 }, (_, k) => 10 ** (LOG_T_MAP[0] + (k / 39) * (LOG_T_MAP[1] - LOG_T_MAP[0]))).map((t) => ({ T: t, rho: degeneracyDensity(t, 2) })),
    [],
  );

  const ratio = s.P / s.ideal;
  const caption = `At ${formatGramsPerCc(rho)} and ${formatAnyKelvin(T)}, the electrons fill their states up to ${formatMomentum(s.x)}, a Fermi energy of ${formatElectronvolts(s.EF)} (a Fermi temperature of ${formatAnyKelvin(s.TF)}). ${
    packing === 'packed'
      ? `The gas is far colder than that, so the electrons are packed: every state below the edge is taken (${Math.round(s.filled * 100)}%), and they push ${ratio >= 100 ? formatScientific(ratio, 2) : Number(ratio.toPrecision(2))} times as hard as a hot gas at this temperature would, at ${formatPascals(s.P)}.`
      : packing === 'partly packed'
        ? `Heat and packing are about equal: ${Math.round(s.filled * 100)}% of the states below the edge are taken, and the pressure, ${formatPascals(s.P)}, is ${ratio < 1.5 ? `${Math.round((ratio - 1) * 100)}% above` : `${Number(ratio.toPrecision(2))} times`} an ideal gas’s.`
        : `The gas is far hotter than that, so the electrons are free: only ${s.filled < 0.01 ? 'a few' : `${Math.round(s.filled * 100)}%`} of those states are taken, and the pressure, ${formatPascals(s.P)}, is an ideal gas’s, nkT.`
  }`;

  const sx = (p: number) => (p + view) * scale;
  const ringLight = 1 * scale;

  return (
    <Figure
      number={number}
      title="Filling the Fermi sea"
      description="Electrons fill the states of motion open to them, two to each, from the slowest up, like water filling a basin. Squeeze them into less room and the states spread apart, so they must fill faster ones, and they push harder however cold they are: degeneracy pressure, which grows as the density to the power 5/3 and, once the fastest move near light speed, as 4/3. Heat smears the sea’s edge; far hotter than its Fermi temperature, the electrons are an ordinary gas. On the core’s map, the line where the Fermi energy equals kT divides the two."
      height={1080}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a state of motion, shaded by how likely it is to be taken', symbol: <rect x="-6" y="-6" width="12" height="12" fill="var(--accent)" fillOpacity="0.7" stroke="var(--border)" /> },
        { label: 'the Fermi momentum, the sea’s edge', symbol: <circle r="6" fill="none" stroke="var(--text)" strokeWidth="2" /> },
        { label: 'momentum mₑc: faster electrons move near light speed', symbol: <circle r="6" fill="none" stroke="var(--series-3)" strokeWidth="2" strokeDasharray="3 2" /> },
        { label: 'the pressure at this temperature', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: 'an ideal gas, nkT', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-2)" strokeWidth="2" strokeDasharray="5 3" /> },
        { label: 'packed electrons at zero temperature', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-3)" strokeWidth="2" strokeDasharray="5 3" /> },
      ]}
      simplified={
        <p>
          The pressures are exact for electrons alone, by Fermi–Dirac integrals done numerically, with relativity; the ions’ own pressure and the
          electric pull between electrons and ions (a few per cent in a white dwarf) are left out, and so are electron–positron pairs, which matter
          only above about a billion kelvin (Chapter 25). The slice through momentum space is a picture: the real states are far too many and too
          close to draw. The map’s regions are for helium.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Places">
        {FERMI_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.toggle}
            aria-pressed={preset?.id === p.id}
            onClick={() => {
              setRho(p.rho);
              setT(p.T);
              setMue(p.mue);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className={styles.controls} style={{ marginTop: 8 }}>
        <Slider label="Density" value={rho} min={FERMI_RHO_RANGE[0]} max={FERMI_RHO_RANGE[1]} log step={0.01} format={formatGramsPerCc} onChange={(v) => setRho(Number(v.toPrecision(3)))} />
        <Slider label="Temperature" value={T} min={FERMI_T_RANGE[0]} max={FERMI_T_RANGE[1]} log step={0.01} format={formatAnyKelvin} onChange={(v) => setT(Number(v.toPrecision(3)))} />
      </div>

      <div className={figureStyles.withSide}>
        <div>
          <p className={styles.panelTitle}>A slice through the states of motion</p>
          <svg
            viewBox={`0 0 ${size} ${size + 24}`}
            width="100%"
            style={{ maxWidth: 380 }}
            role="img"
            aria-label={`States of motion, momentum across and up, out to ${formatMomentum(view)}. The electrons fill them up to ${formatMomentum(s.x)}; ${
              packing === 'packed' ? 'the edge is sharp' : packing === 'partly packed' ? 'heat smears the edge' : 'heat spreads them thinly over many states, few of them taken'
            }.${view > 1 ? ' The dashed ring marks momentum mₑc.' : ` Momentum mₑc, where electrons approach light speed, is ${Number((1 / view).toPrecision(2))} times further out than shown.`}`}
          >
            {cells.map((c) => (
              <rect key={`${c.i}-${c.j}`} x={c.i * cell * scale + 0.6} y={c.j * cell * scale + 0.6} width={cell * scale - 1.2} height={cell * scale - 1.2} rx={1.5} fill="var(--accent)" fillOpacity={0.06 + 0.84 * c.f} />
            ))}
            <circle cx={size / 2} cy={size / 2} r={s.x * scale} fill="none" stroke="var(--text)" strokeWidth="2" />
            {view > 1 && <circle cx={size / 2} cy={size / 2} r={ringLight} fill="none" stroke="var(--series-3)" strokeWidth="2" strokeDasharray="5 3" />}
            <text x={sx(0) + 4} y={14} fontSize="11" fill="var(--text-muted)">
              momentum up
            </text>
            <text x={size - 4} y={size / 2 - 5} fontSize="11" fill="var(--text-muted)" textAnchor="end">
              across
            </text>
            <text x={size / 2} y={size + 17} fontSize="11.5" fill="var(--text)" textAnchor="middle">
              edge {formatMomentum(s.x)}; view ±{formatMomentum(view)}
            </text>
          </svg>
        </div>
        <div className={figureStyles.side}>
          <dl className={styles.facts}>
            <div>
              <dt>Electrons</dt>
              <dd>{formatScientific(s.ne * 1e-6, 2)} per cm³</dd>
            </div>
            <div>
              <dt>Fermi energy</dt>
              <dd>
                {formatElectronvolts(s.EF)} ({formatAnyKelvin(s.TF)})
              </dd>
            </div>
            <div>
              <dt>Fastest at the edge</dt>
              <dd>{Math.round(s.edgeSpeed * 100)}% of light’s speed</dd>
            </div>
            <div>
              <dt>Electrons are</dt>
              <dd>{packing}</dd>
            </div>
            <div>
              <dt>Pressure</dt>
              <dd>{formatPascals(s.P)}</dd>
            </div>
            <div>
              <dt>An ideal gas’s</dt>
              <dd>{formatPascals(s.ideal)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <p className={styles.panelTitle} style={{ marginTop: 12 }}>
        Pressure against density at {formatAnyKelvin(T)}
      </p>
      <ProfilePlot
        series={[
          { name: 'at this temperature', color: 'var(--accent)', points: curves.exact },
          { name: 'an ideal gas, nkT', color: 'var(--series-2)', dashed: true, points: curves.ideal },
          { name: 'packed, at zero temperature', color: 'var(--series-3)', dashed: true, points: curves.packed },
        ]}
        xMin={0}
        xMax={10}
        formatX={(x) => (Number.isInteger(x) && x % 2 === 0 ? (x === 0 ? '1' : powerOfTen(x)) : '')}
        xLabel="Density (g/cm³, log scale)"
        yLabel="Electron pressure (Pa)"
        yScale="log"
        yMin={1e8}
        yMax={1e29}
        cursor={Math.log10(rho / 1000)}
        onCursor={(x) => setRho(Number((10 ** x * 1000).toPrecision(3)))}
        cursorText={(x) => formatGramsPerCc(10 ** x * 1000)}
        formatValue={formatPascals}
        ariaLabel={`Electron pressure against density at ${formatAnyKelvin(T)}: it follows an ideal gas’s nkT while the gas is thin, and packed electrons’ pressure, which doesn’t depend on temperature, once it is dense. At ${formatGramsPerCc(rho)} it is ${formatPascals(s.P)}.`}
        height={260}
      />

      <p className={styles.panelTitle} style={{ marginTop: 12 }}>
        The core’s map, with the degeneracy line
      </p>
      <CoreMap
        mix={HELIUM}
        logT={LOG_T_MAP}
        logRho={LOG_RHO_MAP}
        lines={[{ name: 'degeneracy', label: '', color: 'var(--accent)', points: degeneracyLine }]}
        points={FERMI_PRESETS.map((p) => ({ T: p.T, rho: p.rho, label: p.name, color: 'var(--text-muted)' }))}
        marker={{ T, rho, label: `${formatAnyKelvin(T)}, ${formatGramsPerCc(rho)}` }}
        ariaLabel={`The core’s map for helium, with the line where the electrons’ Fermi energy equals kT, which climbs as the temperature to the power 3/2 and then 3. Denser or cooler than it, electrons are packed. The chosen gas, ${formatAnyKelvin(T)} and ${formatGramsPerCc(rho)}, is ${packing === 'packed' ? 'above it' : packing === 'free' ? 'below it' : 'near it'}.`}
        height={330}
      >
        {(sx, sy) => {
          // The line's own label, part-way along it, where it is inside the map.
          const T0 = 10 ** 5.2;
          return (
            <text x={sx(Math.log10(T0)) + 4} y={sy(Math.log10(degeneracyDensity(T0, 2) / 1000)) - 16} fontSize="11.5" fontWeight={600} fill="var(--accent)">
              Fermi energy = kT
            </text>
          );
        }}
      </CoreMap>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
