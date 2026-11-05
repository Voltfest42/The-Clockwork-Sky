import { useState, type ReactNode } from 'react';
import { formatScientific, powerOfTen } from '../core/math/scientific';
import { barrierHeight, boltzmann, gamowEnergy, gamowIntegrand, gamowPeak, tunnelling } from '../core/nuclear/gamow';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { classicalShortfall, formatChance, formatHotKelvin, formatKeV, GAMOW_REACTIONS, log10ShareAboveBarrier } from './furnace';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The Gamow peak (Figure 22.1). Fast nuclei are rare (the Maxwell–Boltzmann
 * tail) and slow ones can't tunnel through their repulsion (the tunnelling
 * chance), so fusion happens in the narrow window where their product peaks.
 * Choose the reaction and the temperature; a switch takes tunnelling away and
 * leaves only nuclei with more energy than the barrier: none, to hundreds of
 * decimal places.
 */

type View = 'log' | 'peak';
const T_RANGE = [5e6, 3e9] as const;
const START = { reaction: 'pp', view: 'log' as View, classical: false };

export function GamowPeakFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [id, setId] = useState(START.reaction);
  const reaction = GAMOW_REACTIONS.find((r) => r.id === id)!;
  const [T, setT] = useState(reaction.T);
  const [view, setView] = useState<View>(START.view);
  const [classical, setClassical] = useState(START.classical);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const reset = () => {
    setId(START.reaction);
    setT(GAMOW_REACTIONS[0].T);
    setView(START.view);
    setClassical(START.classical);
    setCursor(undefined);
  };
  const choose = (r: (typeof GAMOW_REACTIONS)[number]) => {
    setId(r.id);
    setT(r.T);
    setCursor(undefined);
  };

  const g = gamowPeak(reaction, T);
  const barrier = barrierHeight(reaction);
  const EG = gamowEnergy(reaction);
  // Energies from a hundredth of the peak to three times the barrier, in log₁₀ keV.
  const x0 = Math.floor(Math.log10(g.E0 / 100) * 2) / 2;
  const x1 = Math.ceil(Math.log10(barrier * 3) * 2) / 2;
  const xs = Array.from({ length: 241 }, (_, i) => x0 + ((x1 - x0) * i) / 240);
  const peakValue = Math.exp(-g.tau);
  const yMin = 10 ** (Math.floor(Math.log10(peakValue)) - 10);
  const tunnel = (E: number) => (classical ? (E >= barrier ? 1 : 0) : tunnelling(reaction, E));
  const product = (E: number) => boltzmann(E, T) * tunnel(E);
  const at = cursor ?? Math.log10(g.E0);
  const shortfall = classicalShortfall(reaction, T);
  const share = log10ShareAboveBarrier(reaction, T);

  const caption = classical
    ? `Without tunnelling, only ${reaction.name} pairs with more than the barrier’s ${formatKeV(barrier)} could fuse: ${powerOfTen(Math.round(share))} of them at ${formatHotKelvin(T)}, where a typical pair has ${formatKeV(g.kT)}. Fusion would be ${powerOfTen(Math.round(shortfall))} times slower: for ${reaction.where}, never.`
    : `${reaction.name} at ${formatHotKelvin(T)}: a typical pair has ${formatKeV(g.kT)}, and the barrier is ${formatKeV(barrier)}. Fusion happens in a window at ${formatKeV(g.E0)}, ${(g.E0 / g.kT).toFixed(1)} times the typical energy and ${formatKeV(g.width)} wide, where a pair tunnels through with a chance of ${formatChance(g.tunnellingAtPeak)}. The rate climbs as T to the power ${g.nu.toFixed(1)}.`;

  return (
    <Figure
      number={number}
      title="The Gamow peak"
      description="Fusion in a star happens in a narrow window of energy. The share of nuclei with a given energy falls steeply with energy (the Maxwell–Boltzmann tail), and the chance of tunnelling through their electric repulsion rises steeply with it; their product peaks at about 6 keV for two protons at the Sun’s centre, where a typical pair has 1.35 keV and the barrier is nearly 1 MeV. Heavier nuclei repel more and need hotter cores, and their rates climb more steeply with temperature. Without tunnelling no pair in the Sun would ever fuse."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'nuclei with this energy, e^(−E/kT)', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-2)" strokeWidth="2.5" strokeDasharray="5 3" /> },
        { label: classical ? 'no tunnelling: through only above the barrier' : 'chance of tunnelling through', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-1)" strokeWidth="2.5" strokeDasharray="2 3" /> },
        { label: 'their product: where fusion happens', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3.5" /> },
        { label: 'the barrier’s top', symbol: <line x1="0" y1="-8" x2="0" y2="8" stroke="var(--text)" strokeWidth="1.5" strokeDasharray="3 2" /> },
      ]}
      simplified={
        <p>
          The rate is exact for reactions without resonances, given the nuclear physics in the S-factor, which changes slowly with energy and is
          left out of the curves here. The barrier’s top is taken where the nuclei touch, 1.2 A^⅓ femtometres each (the proton’s 0.84); the Gamow
          energy doesn’t depend on it. Electrons in the gas screen the repulsion a little (a few per cent for p + p in the Sun), which this figure
          leaves out.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Reaction">
          {GAMOW_REACTIONS.map((r) => (
            <button key={r.id} type="button" aria-pressed={id === r.id} onClick={() => choose(r)}>
              {r.name}
            </button>
          ))}
        </span>
      </div>
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Show">
          <button type="button" aria-pressed={view === 'log'} onClick={() => setView('log')}>
            Log scale
          </button>
          <button type="button" aria-pressed={view === 'peak'} onClick={() => setView('peak')}>
            The peak up close
          </button>
        </span>
        <button type="button" className={styles.toggle} aria-pressed={classical} onClick={() => setClassical((c) => !c)}>
          Without tunnelling
        </button>
      </div>
      <div className={styles.controls}>
        <Slider label="Temperature" value={T} min={T_RANGE[0]} max={T_RANGE[1]} log step={0.005} format={formatHotKelvin} onChange={setT} />
      </div>

      {view === 'log' ? (
        <ProfilePlot
          series={[
            { name: 'nuclei with this energy', color: 'var(--series-2)', dashed: true, points: xs.map((x) => ({ x, y: Math.max(boltzmann(10 ** x, T), yMin * 1e-3) })) },
            { name: classical ? 'through only above the barrier' : 'chance of tunnelling', color: 'var(--series-1)', dashed: true, points: xs.map((x) => ({ x, y: Math.max(tunnel(10 ** x), yMin * 1e-3) })) },
            { name: 'their product', color: 'var(--accent)', points: xs.map((x) => ({ x, y: Math.max(product(10 ** x), yMin * 1e-3) })) },
          ]}
          xMin={x0}
          xMax={x1}
          formatX={(x) => (Number.isInteger(x) ? formatKeV(10 ** x) : '')}
          xLabel="Energy of a pair of nuclei (keV, log scale)"
          yLabel="Share, or chance"
          yScale="log"
          yMin={yMin}
          yMax={2}
          formatValue={(y) => (y <= yMin ? 'off the bottom' : formatScientific(y, 2))}
          cursor={at}
          onCursor={setCursor}
          cursorText={(x) => formatKeV(10 ** x)}
          ariaLabel={`On log scales, the share of ${reaction.name} pairs with each energy falls and the chance of tunnelling rises; ${classical ? 'without tunnelling their product is zero below the barrier and too small to draw above it' : `their product peaks at ${formatKeV(g.E0)}`}`}
          height={300}
        >
          {(px, py) => (
            <g>
              <line x1={px(Math.log10(barrier))} x2={px(Math.log10(barrier))} y1={py(2)} y2={py(yMin)} stroke="var(--text)" strokeDasharray="3 2" />
              <text x={px(Math.log10(barrier)) - 5} y={py(2) + 14} fontSize="11.5" textAnchor="end" fill="var(--text)">
                barrier {formatKeV(barrier)}
              </text>
              <line x1={px(Math.log10(g.kT))} x2={px(Math.log10(g.kT))} y1={py(2)} y2={py(yMin)} stroke="var(--text-muted)" strokeDasharray="1 3" />
              <text x={px(Math.log10(g.kT)) + 4} y={py(yMin) - 6} fontSize="11.5" fill="var(--text-muted)">
                kT
              </text>
              {!classical && (
                <text x={px(Math.log10(g.E0))} y={py(peakValue) - 8} fontSize="11.5" fontWeight="600" textAnchor="middle" fill="var(--text)">
                  peak {formatKeV(g.E0)}
                </text>
              )}
            </g>
          )}
        </ProfilePlot>
      ) : (
        <ProfilePlot
          series={[
            {
              name: 'their product (peak = 1)',
              color: 'var(--accent)',
              points: Array.from({ length: 201 }, (_, i) => {
                const E = ((g.E0 + 2.5 * g.width) * i) / 200;
                return { x: E, y: classical ? 0 : gamowIntegrand(reaction, E, T) / peakValue };
              }),
            },
          ]}
          xMin={0}
          xMax={g.E0 + 2.5 * g.width}
          formatX={(x) => formatKeV(x)}
          xLabel="Energy of a pair of nuclei (keV)"
          yLabel="Fusions at each energy (peak = 1)"
          yMin={0}
          yMax={1.15}
          formatValue={(y) => y.toFixed(3)}
          cursor={cursor !== undefined ? 10 ** cursor : g.E0}
          onCursor={(x) => setCursor(Math.log10(Math.max(x, 1e-3)))}
          cursorText={(x) => formatKeV(x)}
          ariaLabel={`The Gamow peak for ${reaction.name} on linear scales: centred on ${formatKeV(g.E0)} and ${formatKeV(g.width)} wide, far above the typical ${formatKeV(g.kT)}`}
          height={300}
        >
          {(px, py) => (
            <g>
              <rect x={px(g.E0 - g.width / 2)} width={px(g.E0 + g.width / 2) - px(g.E0 - g.width / 2)} y={py(1.15)} height={py(0) - py(1.15)} fill="var(--accent)" fillOpacity={0.08} />
              <line x1={px(g.kT)} x2={px(g.kT)} y1={py(1.15)} y2={py(0)} stroke="var(--text-muted)" strokeDasharray="1 3" />
              <text x={px(g.kT) + 4} y={py(1.05)} fontSize="11.5" fill="var(--text-muted)">
                typical, kT
              </text>
              <text x={px(g.E0)} y={py(1.07)} fontSize="11.5" fontWeight="600" textAnchor="middle" fill="var(--text)">
                {classical ? 'nothing: no tunnelling' : `E₀ = ${formatKeV(g.E0)}`}
              </text>
            </g>
          )}
        </ProfilePlot>
      )}

      <dl className={styles.facts}>
        <div>
          <dt>Typical energy, kT</dt>
          <dd>{formatKeV(g.kT)}</dd>
        </div>
        <div>
          <dt>Barrier’s top</dt>
          <dd>
            {formatKeV(barrier)}; share of pairs above it {powerOfTen(Math.round(share))}
          </dd>
        </div>
        <div>
          <dt>Gamow energy E_G</dt>
          <dd>{formatKeV(EG)}</dd>
        </div>
        <div>
          <dt>Peak E₀ and width</dt>
          <dd>
            {formatKeV(g.E0)} ({(g.E0 / g.kT).toFixed(1)} kT), {formatKeV(g.width)} wide
          </dd>
        </div>
        <div>
          <dt>Tunnelling at the peak</dt>
          <dd>{formatChance(g.tunnellingAtPeak)}</dd>
        </div>
        <div>
          <dt>Rate climbs as</dt>
          <dd>T to the power {g.nu.toFixed(1)}</dd>
        </div>
      </dl>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
