import { useMemo, useState, type ReactNode } from 'react';
import { M_SUN } from '../core/constants';
import { decayPower, deposited, diffusionTime, gammaCaught, lightCurve, nickelFromPeak, peakOf, popovPlateau } from '../core/supernova/arnett';
import { SECONDS_PER_DAY } from '../core/units';
import { MEASURED_SUPERNOVAE } from '../data/supernovae';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { CURVE_DAYS, explosionOf, formatSupernovaLuminosity, formatWatts, NICKEL_PRESETS, NICKEL_RANGES, NICKEL_START, PLATEAU_RADIUS, type NickelPreset } from './explosions';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Light from radioactive nickel (Figure 25.3): Arnett's model of a supernova's
 * light curve, with sliders for the nickel made, the mass thrown out, its
 * speed and its opacity; the decays' power, the light, and the share of the
 * γ-rays the gas still catches; SN 2011fe's and SN 1987A's measured peaks
 * beside it; and, for a red supergiant, Popov's plateau.
 */

const DAY_TICKS: Record<number, string> = { 0: '1', 1: '10', 2: '100' };
const LOG_DAYS = Math.log10(500);

export function NickelLightFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [settings, setSettings] = useState<Omit<NickelPreset, 'id' | 'name'>>({ ...NICKEL_START });
  const [cursor, setCursor] = useState(Math.log10(20));
  const reset = () => {
    setSettings({ ...NICKEL_START });
    setCursor(Math.log10(20));
  };
  const set = (k: keyof typeof settings, v: number | boolean) => setSettings((s) => ({ ...s, [k]: v }));
  const input = explosionOf(settings);
  const curve = useMemo(() => lightCurve(input, CURVE_DAYS, settings.plateau ? { radius: PLATEAU_RADIUS } : undefined), [input.nickel, input.ejecta, input.speed, input.opacity, settings.plateau]); // eslint-disable-line react-hooks/exhaustive-deps
  const fine = useMemo(
    () => lightCurve(input, Array.from({ length: 801 }, (_, i) => i * 0.25), settings.plateau ? { radius: PLATEAU_RADIUS } : undefined),
    [input.nickel, input.ejecta, input.speed, input.opacity, settings.plateau], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const peak = peakOf(fine);
  const tm = diffusionTime(input) / SECONDS_PER_DAY;
  const preset = NICKEL_PRESETS.find((p) => p.nickel === settings.nickel && p.ejecta === settings.ejecta && p.speed === settings.speed && p.opacity === settings.opacity && p.plateau === settings.plateau);
  const atPeak = deposited(input, peak.day * SECONDS_PER_DAY);
  const inferred = nickelFromPeak(peak.L, peak.day) / M_SUN;
  const day = 10 ** cursor;
  const here = curve.reduce((b, p) => (Math.abs(Math.log(p.day / day)) < Math.abs(Math.log(b.day / day)) ? p : b), curve[0]);
  const caught100 = gammaCaught(input, 100 * SECONDS_PER_DAY);
  const plateau = settings.plateau ? popovPlateau(input, PLATEAU_RADIUS) : undefined;

  const caption = `${Number(settings.nickel.toPrecision(2))} M☉ of nickel in ${Number(settings.ejecta.toPrecision(2))} M☉ thrown out at ${settings.speed.toLocaleString('en-GB')} km/s: ${
    plateau
      ? `the hydrogen envelope holds the light at ${formatSupernovaLuminosity(plateau.L)} for ${Math.round(plateau.duration / SECONDS_PER_DAY)} days (Popov’s plateau), and then it drops to the cobalt’s tail.`
      : `light takes about ${Math.round(tm)} days to diffuse out, so the light curve peaks on day ${Math.round(peak.day)} at ${formatSupernovaLuminosity(peak.L)}, equal to the decays’ heating then, ${formatWatts(atPeak)}: Arnett’s rule.`
  } By day 100 the gas catches ${Math.round(caught100 * 100)}% of the γ-rays${caught100 < 0.9 ? ', so the light falls faster than the cobalt decays' : ', so the light follows the cobalt’s decay'}.`;

  const legendPoint = (colour: string) => <circle r="5" fill={colour} stroke="var(--bg)" strokeWidth="1.5" />;
  return (
    <Figure
      number={number}
      title="Light from radioactive nickel"
      description="A supernova shines for months on radioactive decay: the explosion makes nickel-56, which decays to cobalt-56 in about nine days and that to iron in about four months, and their γ-rays heat the thinning gas. The light rises while heat is stored, peaks when it equals the heating (Arnett’s rule), so the peak gives the nickel’s mass, and then follows the decay down. Half a solar mass of nickel in a white dwarf’s 1.4 Suns matches SN 2011fe’s peak; SN 1987A’s tail needs 0.07. Later the γ-rays escape and the light falls faster than the cobalt decays."
      height={900}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the light curve (Arnett’s model)', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: 'the decays’ power', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--series-2)" strokeWidth="2" strokeDasharray="6 4" /> },
        { label: 'the share of it the gas catches', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="6 4" /> },
        { label: 'SN 2011fe’s measured peak', symbol: legendPoint('var(--series-3)') },
        { label: 'SN 1987A’s measured peak', symbol: legendPoint('var(--text)') },
      ]}
      simplified={
        <p>
          Arnett’s model is one zone with one opacity, heated only by the decays: the standard first approximation. The γ-rays’ escape is a single
          fixed opacity (0.03 cm²/g); the plateau is Popov’s analytic formula for a red supergiant of 500 R☉. Real light curves are worked out
          shell by shell, with opacities that change as the gas cools and recombines, and Arnett’s rule can be out by tens of per cent. SN 1987A’s
          peak was about twice what its tail’s nickel gives by the rule: a blue supergiant’s compact envelope stored heat the model leaves out.
          The supernovae are their published peaks, not whole light curves.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Explosions">
        {NICKEL_PRESETS.map((p) => (
          <button key={p.id} type="button" className={styles.toggle} aria-pressed={preset?.id === p.id} onClick={() => setSettings({ nickel: p.nickel, ejecta: p.ejecta, speed: p.speed, opacity: p.opacity, plateau: p.plateau })}>
            {p.name}
          </button>
        ))}
      </div>
      <div className={styles.controls} style={{ marginTop: 8 }}>
        <Slider label="Nickel made" value={settings.nickel} min={NICKEL_RANGES.nickel[0]} max={NICKEL_RANGES.nickel[1]} log step={0.005} format={(v) => `${Number(v.toPrecision(2))} M☉`} onChange={(v) => set('nickel', Number(v.toPrecision(2)))} />
        <Slider label="Mass thrown out" value={settings.ejecta} min={NICKEL_RANGES.ejecta[0]} max={NICKEL_RANGES.ejecta[1]} log step={0.005} format={(v) => `${Number(v.toPrecision(2))} M☉`} onChange={(v) => set('ejecta', Number(v.toPrecision(2)))} />
        <Slider label="Speed" value={settings.speed} min={NICKEL_RANGES.speed[0]} max={NICKEL_RANGES.speed[1]} log step={0.005} format={(v) => `${(Math.round(v / 100) * 100).toLocaleString('en-GB')} km/s`} onChange={(v) => set('speed', Math.round(v / 100) * 100)} />
        <Slider label="Opacity" value={settings.opacity} min={NICKEL_RANGES.opacity[0]} max={NICKEL_RANGES.opacity[1]} log step={0.005} format={(v) => `${Number(v.toPrecision(2))} cm²/g`} onChange={(v) => set('opacity', Number(v.toPrecision(2)))} />
      </div>
      <div className={figureStyles.toolbar} style={{ marginTop: 6 }}>
        <span className={styles.toggles}>
          <button type="button" className={styles.toggle} aria-pressed={settings.plateau} onClick={() => set('plateau', !settings.plateau)}>
            Hydrogen envelope (Popov’s plateau)
          </button>
        </span>
      </div>

      <ProfilePlot
        series={[
          { name: 'decays’ power', color: 'var(--series-2)', dashed: true, points: curve.map((p) => ({ x: Math.log10(p.day), y: p.power })) },
          { name: 'caught', color: 'var(--text-muted)', dashed: true, points: curve.map((p) => ({ x: Math.log10(p.day), y: p.power * p.caught })) },
          { name: 'light', color: 'var(--accent)', points: curve.map((p) => ({ x: Math.log10(p.day), y: p.L })) },
        ]}
        hideLegend
        xMin={0}
        xMax={LOG_DAYS}
        formatX={(x) => DAY_TICKS[x] ?? ''}
        xLabel="Days after the explosion (log scale)"
        yLabel="Luminosity (W)"
        yScale="log"
        yMin={1e32}
        yMax={5e36}
        cursor={cursor}
        onCursor={setCursor}
        cursorText={(x) => `day ${Math.round(10 ** x)}`}
        formatValue={(y) => formatSupernovaLuminosity(y)}
        ariaLabel={`A supernova’s luminosity against days after the explosion on log scales: it rises to a peak on day ${Math.round(peak.day)} at ${formatSupernovaLuminosity(peak.L)} and falls with the decays’ power. On day ${Math.round(here.day)} it is ${formatSupernovaLuminosity(here.L)}.`}
        height={320}
      >
        {(sx, sy) => (
          <g>
            {MEASURED_SUPERNOVAE.map((sn, k) => {
              const x = sx(Math.log10(sn.peak.day));
              const y = sy(sn.peak.L);
              const colour = k === 0 ? 'var(--series-3)' : 'var(--text)';
              return (
                <g key={sn.id}>
                  <circle cx={x} cy={y} r={5.5} fill={colour} stroke="var(--bg)" strokeWidth="1.5" />
                  <text x={x + 8} y={y - 6} fontSize="11.5" fill="var(--text)">
                    {sn.name}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </ProfilePlot>

      <div className={styles.card}>
        <dl className={styles.facts}>
          <div>
            <dt>Diffusion time</dt>
            <dd>{Math.round(tm)} days</dd>
          </div>
          <div>
            <dt>Peak</dt>
            <dd>
              day {Math.round(peak.day)}, {formatSupernovaLuminosity(peak.L)}
            </dd>
          </div>
          {!plateau && (
            <div>
              <dt>Nickel from the peak, by Arnett’s rule</dt>
              <dd>{Number(inferred.toPrecision(2))} M☉</dd>
            </div>
          )}
          <div>
            <dt>On day {Math.round(here.day)}</dt>
            <dd>
              {formatSupernovaLuminosity(here.L)}; the decays give {formatSupernovaLuminosity(decayPower(input.nickel, here.day * SECONDS_PER_DAY).total)}, {Math.round(here.caught * 100)}% caught
            </dd>
          </div>
        </dl>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
