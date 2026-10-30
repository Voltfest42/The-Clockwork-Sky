import { useMemo, useState, type ReactNode } from 'react';
import { LEAVITT, MILKY_WAY } from '../data/cepheids';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { Slider } from './Slider';
import { cepheidAbsoluteV, cepheidDistance, cepheidLuminosity, cepheidMagnitude, leavittFits } from './starLives';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Leavitt's law (Figure 17.4): Henrietta Leavitt's own 25 Cepheids in the
 * Small Magellanic Cloud (1912), plotted as she plotted them, against period
 * or its logarithm; a Cepheid's light curve; and the law put to work: from a
 * period, a luminosity, and from that and the star's brightness, a distance.
 */

type PeriodAxis = 'period' | 'log';
const START_PRESET = 'delta-cep';

const mag = (m: number) => m.toFixed(1);
const pc = (d: number) => `${Number(d.toPrecision(3)).toLocaleString('en-GB')} parsecs`;

export function LeavittFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const startStar = MILKY_WAY.find((c) => c.id === START_PRESET)!;
  const [axis, setAxis] = useState<PeriodAxis>('log');
  const [preset, setPreset] = useState<string | null>(START_PRESET);
  const [period, setPeriod] = useState(startStar.period);
  const [meanV, setMeanV] = useState(startStar.meanV);
  const [av, setAv] = useState(startStar.av);
  const reset = () => {
    setAxis('log');
    choose(START_PRESET);
  };
  const choose = (id: string | null) => {
    setPreset(id);
    const c = MILKY_WAY.find((x) => x.id === id);
    if (c) {
      setPeriod(c.period);
      setMeanV(c.meanV);
      setAv(c.av);
    }
  };
  const fits = useMemo(() => leavittFits(), []);
  const chosen = MILKY_WAY.find((c) => c.id === preset) ?? null;
  const absV = cepheidAbsoluteV(period);
  const distance = cepheidDistance(period, meanV, av);
  const range = chosen?.range ?? [meanV - 0.45, meanV + 0.45];

  const maxima = LEAVITT.map((s) => ({ x: s.period, y: -s.max, label: `H${s.h} at its brightest` }));
  const minima = LEAVITT.map((s) => ({ x: s.period, y: -s.min, label: `H${s.h} at its faintest` }));

  return (
    <Figure
      number={number}
      title="Leavitt’s law"
      description="Henrietta Leavitt’s 25 Cepheids in the Small Magellanic Cloud, from her 1912 table: their brightness at maximum and minimum against how long each takes to pulse. The slower a Cepheid pulses, the brighter it is, so its period gives its true luminosity, and comparing that with how bright it looks gives its distance. A Cepheid’s light curve, and a calculator from period to distance for δ Cephei and ℓ Carinae."
      height={1120}
      tryThis={tryThis}
      onReset={reset}
      simplified={
        <p>
          Leavitt’s magnitudes are photographic, on the provisional scale of 1912, not today’s V magnitudes, so her numbers can’t be fed into the
          calculator directly. The light curve is a drawn shape with δ Cephei’s period and range, not a measured one. The calculator uses one
          modern calibration from the Hubble Space Telescope’s parallaxes of ten Milky Way Cepheids (Benedict et al. 2007); Cepheids poorer in
          metals, and those pulsing in an overtone, such as Polaris, need adjusting.
        </p>
      }
    >
      <p className={styles.panelTitle}>Leavitt’s 25 Cepheids, 1912</p>
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Plot against">
          <button type="button" aria-pressed={axis === 'period'} onClick={() => setAxis('period')}>
            Period (her Figure 1)
          </button>
          <button type="button" aria-pressed={axis === 'log'} onClick={() => setAxis('log')}>
            Logarithm of the period (her Figure 2)
          </button>
        </span>
      </div>
      <ScatterChart
        groups={[
          { name: 'At maximum', color: 'var(--series-1)', shape: 'circle', points: maxima },
          { name: 'At minimum', color: 'var(--series-2)', shape: 'square', points: minima },
        ]}
        lines={[
          { name: 'Line through the maxima', color: 'var(--text-muted)', dashed: true, f: (p) => -(fits.max.a + fits.max.b * Math.log10(p)) },
          { name: 'Line through the minima', color: 'var(--text-muted)', dashed: true, f: (p) => -(fits.min.a + fits.min.b * Math.log10(p)) },
        ]}
        xScale={axis === 'log' ? 'log' : 'linear'}
        yScale="linear"
        xMin={axis === 'log' ? 1 : 0}
        xMax={axis === 'log' ? 200 : 140}
        yMin={-16.6}
        yMax={-10.8}
        xLabel={axis === 'log' ? 'Period (days, on a log scale)' : 'Period (days)'}
        yLabel="Photographic magnitude (brighter ↑)"
        formatY={(y) => mag(-y)}
        height={340}
        ariaLabel={`Leavitt’s 25 Cepheids: magnitude at maximum and minimum against ${axis === 'log' ? 'the logarithm of the period' : 'the period'}. The longer the period, the brighter the star: about ${Math.abs(fits.max.b).toFixed(1)} magnitudes brighter for every tenfold longer period.`}
      />
      <p className={styles.hint}>
        Fitting straight lines to her numbers: each tenfold longer period is about {Math.abs(fits.max.b).toFixed(1)} magnitudes brighter, or the
        logarithm of the period grows by {(1 / Math.abs(fits.max.b)).toFixed(2)} for each magnitude. Leavitt wrote “about 0.48”.
      </p>

      <p className={styles.panelTitle} style={{ marginTop: 14 }}>
        Put it to work
      </p>
      <div className={styles.presets} role="group" aria-label="Cepheid" style={{ marginBottom: 6 }}>
        {MILKY_WAY.map((c) => (
          <button key={c.id} type="button" className={styles.toggle} aria-pressed={preset === c.id} onClick={() => choose(c.id)}>
            {c.name}
          </button>
        ))}
        <button type="button" className={styles.toggle} aria-pressed={preset === null} onClick={() => setPreset(null)}>
          Your own
        </button>
      </div>
      <div className={styles.controls}>
        <Slider
          label="Period"
          value={period}
          min={1}
          max={100}
          log
          format={(p) => `${p.toFixed(p < 10 ? 2 : 1)} days`}
          onChange={(p) => {
            setPreset(null);
            setPeriod(p);
          }}
        />
        <Slider
          label="Mean brightness, V"
          value={meanV}
          min={2}
          max={26}
          step={0.01}
          format={(v) => `magnitude ${v.toFixed(2)}`}
          onChange={(v) => {
            setPreset(null);
            setMeanV(v);
          }}
        />
        <Slider
          label="Dimming by dust"
          value={av}
          min={0}
          max={3}
          step={0.01}
          format={(a) => `${a.toFixed(2)} mag`}
          onChange={(a) => {
            setPreset(null);
            setAv(a);
          }}
        />
      </div>
      <ScatterChart
        groups={[]}
        lines={[{ name: 'Brightness over two pulses (drawn shape)', color: 'var(--series-1)', f: (d) => -cepheidMagnitude(d / period, range[0], range[1]) }]}
        xScale="linear"
        yScale="linear"
        xMin={0}
        xMax={2 * period}
        yMin={-(range[1] + 0.25)}
        yMax={-(range[0] - 0.25)}
        xLabel="Days"
        yLabel="V magnitude (brighter ↑)"
        formatX={(d) => (period < 3 ? d.toFixed(1) : String(Math.round(d)))}
        formatY={(y) => (-y).toFixed(1)}
        height={220}
        ariaLabel={`A Cepheid’s brightness over two pulses of ${period.toFixed(2)} days: a quick brightening, then a slow fading.`}
      />
      <div className={styles.card} aria-live="polite">
        <p style={{ margin: 0 }}>
          A Cepheid that pulses every <b>{period.toFixed(2)} days</b> has an absolute magnitude of <b>{absV.toFixed(2)}</b>: about{' '}
          <b>{Number(cepheidLuminosity(period).toPrecision(2)).toLocaleString('en-GB')} times</b> the Sun’s power in visible light.
        </p>
        <p style={{ margin: '6px 0 0' }}>
          Looking {meanV.toFixed(2)} magnitudes bright{av > 0 ? ` through ${av.toFixed(2)} magnitudes of dust` : ''}, it must be about <b>{pc(distance)}</b> away
          ({Number((distance * 3.2616).toPrecision(3)).toLocaleString('en-GB')} light-years).
        </p>
        {chosen && (
          <p style={{ margin: '6px 0 0' }}>
            {chosen.name}, {chosen.note}: its parallax, measured by the Hubble Space Telescope, puts it at {pc(chosen.parallaxDistance)}.
          </p>
        )}
      </div>
      <Caption>
        {`Period ${period.toFixed(2)} days → luminosity ${Number(cepheidLuminosity(period).toPrecision(2)).toLocaleString('en-GB')} Suns → distance ${pc(distance)}.`}
      </Caption>
    </Figure>
  );
}
