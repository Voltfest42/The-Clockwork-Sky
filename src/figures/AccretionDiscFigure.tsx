import { useMemo, useState, type ReactNode } from 'react';
import { C, L_SUN, M_SUN } from '../core/constants';
import { discTemperature, eddingtonLuminosity, FUELS, gravitationalRadius } from '../core/gr/disc';
import { powerOfTen } from '../core/math/scientific';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { SpectrumView } from '../viz/spectrum/SpectrumView';
import { bandOf, DISC_START, discFor, formatPhotonEnergy, HOLES, spectrumOf, WAVELENGTHS } from './blackHoles';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The accretion disc (Figure 27.3): a thin disc of gas spiralling into a
 * black hole of 10 or 10⁸ Suns, its inner edge at the innermost stable orbit.
 * Its temperature from the inner edge outward, its spectrum as the sum of
 * every ring's black body, and the share of rest-mass energy each fuel gives,
 * from burning gas to a spinning black hole. Spin the hole to move the inner
 * edge in; turn the gas supply up to the Eddington limit.
 */

const YEAR = 365.25 * 86400;

export function AccretionDiscFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [hole, setHole] = useState<string>(DISC_START.hole);
  const [spin, setSpin] = useState<number>(DISC_START.spin);
  const [edd, setEdd] = useState<number>(DISC_START.eddington);
  const reset = () => {
    setHole(DISC_START.hole);
    setSpin(DISC_START.spin);
    setEdd(DISC_START.eddington);
  };
  const choice = HOLES.find((h) => h.id === hole) ?? HOLES[0];
  const disc = useMemo(() => discFor(hole, spin, edd), [hole, spin, edd]);
  const spectrum = useMemo(() => spectrumOf(disc), [disc]);
  const rg = gravitationalRadius(disc.massKg);
  const peak = spectrum.reduce((a, b) => (b.nuLnu > a.nuLnu ? b : a));
  const top = peak.nuLnu * 3;
  const mdotSunsPerYear = (disc.accretionRate * YEAR) / M_SUN;
  const lEdd = eddingtonLuminosity(disc.massKg);
  const fusionShare = disc.efficiency / FUELS.find((f) => f.id === 'fusion')!.efficiency;
  const rInKm = disc.rIn / 1000;

  const caption = `A black hole of ${choice.name} (${choice.example}), spinning at ${spin.toFixed(spin >= 0.99 ? 3 : 2)}: the disc’s inner edge is at ${disc.rInGravitational.toFixed(2)} GM/c² (${formatDistance(rInKm)}), and gas reaching it has given out ${(disc.efficiency * 100).toFixed(1)}% of its rest-mass energy, ${fusionShare.toFixed(0)} times what fusion gets from hydrogen. Shining at ${Math.round(edd * 100)}% of the Eddington limit, ${formatLuminosity(disc.luminosity)}, it swallows ${formatRate(mdotSunsPerYear)}. Its hottest ring is ${formatKelvin(disc.tMax)}, and its light peaks in ${bandOf(peak.wavelength)} at about ${formatPhotonEnergy(peak.wavelength)}.`;

  return (
    <Figure
      number={number}
      title="The accretion disc"
      description="A thin disc of gas spiralling into a black hole, hottest at its inner edge, the innermost stable orbit. Round a black hole of ten Suns the inner disc reaches about ten million degrees and shines in X-rays; round one of a hundred million Suns it is cooler, about a hundred thousand degrees, and shines in ultraviolet, as quasars do. Gas falling that deep gives out 6% of its rest-mass energy, up to 42% round a spinning hole: far more than fusion’s 0.7%."
      height={1100}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the disc’s temperature, and its light', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: 'the inner edge: the innermost stable orbit', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--wrong)" strokeWidth="2" strokeDasharray="4 3" /> },
        { label: 'this black hole’s efficiency among the fuels', symbol: <rect x="-9" y="-5" width="18" height="10" fill="var(--accent)" /> },
        { label: 'other fuels', symbol: <rect x="-9" y="-5" width="18" height="10" fill="var(--text-muted)" fillOpacity="0.55" /> },
      ]}
      simplified={
        <p>
          The disc is Shakura and Sunyaev’s (1973) thin disc, with each ring glowing as a black body and no torque at its inner edge, put at
          relativity’s innermost stable orbit; its temperatures are scaled so that its light adds up to the luminosity chosen. Relativity’s other
          effects on the light (redshift, light bending, the Doppler boost of the side coming towards us) are left out, and so are the hot corona that
          makes a black hole’s hardest X-rays, and the electron scattering that hardens a hot disc’s spectrum. The disc is seen face-on. Spin is
          capped at 0.998, where Thorne (1974) found that a disc’s own light stops spinning the hole up.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Black hole">
          {HOLES.map((h) => (
            <button key={h.id} type="button" aria-pressed={hole === h.id} onClick={() => setHole(h.id)}>
              {h.name}
            </button>
          ))}
        </span>
      </div>
      <div className={styles.controls}>
        <Slider label="Spin" value={spin} min={0} max={0.998} step={0.002} format={(v) => v.toFixed(3)} onChange={(v) => setSpin(Math.round(v * 1000) / 1000)} />
        <Slider label="Shining at" value={edd} min={0.01} max={1} log step={0.02} format={(v) => `${Math.round(v * 100)}% of the Eddington limit`} onChange={(v) => setEdd(Number(v.toPrecision(2)))} />
      </div>

      <div className={styles.split}>
        <div>
          <p className={styles.panelTitle}>Temperature, from the inner edge out</p>
          <ScatterChart
            groups={[]}
            lines={[{ name: 'temperature', color: 'var(--accent)', f: (x) => discTemperature(disc, x * rg) }]}
            xScale="log"
            yScale="log"
            xMin={1}
            xMax={1e5}
            yMin={1e3}
            yMax={1e8}
            xLabel="Distance from the centre (GM/c²)"
            yLabel="Temperature (K)"
            formatX={(x) => powerOfTen(Math.round(Math.log10(x)))}
            formatY={(y) => powerOfTen(Math.round(Math.log10(y)))}
            height={320}
            ariaLabel={`The disc’s temperature against distance: zero at the inner edge, ${disc.rInGravitational.toFixed(2)} GM/c², rising to ${formatKelvin(disc.tMax)} just outside it, then falling as distance to the power −¾.`}
          >
            {(sx, sy) => (
              <g>
                <line x1={sx(disc.rInGravitational)} x2={sx(disc.rInGravitational)} y1={sy(1e3)} y2={sy(1e8)} stroke="var(--wrong)" strokeWidth="2" strokeDasharray="4 3" />
                <text x={sx(disc.rInGravitational) + 5} y={sy(1e8) + 14} fontSize="11" fill="var(--text)">
                  inner edge
                </text>
              </g>
            )}
          </ScatterChart>
        </div>
        <div>
          <p className={styles.panelTitle}>Energy given out, as a share of rest mass</p>
          <svg viewBox="0 0 320 300" width="100%" style={{ maxWidth: 420, display: 'block' }} role="img" aria-label={`Bars on a logarithmic scale: ${FUELS.map((f) => `${f.name.toLowerCase()} ${formatShare(f.efficiency)}`).join(', ')}. This black hole: ${formatShare(disc.efficiency)}.`}>
            {(() => {
              const x0 = 10;
              const x1 = 310;
              const sx = (e: number) => x0 + ((Math.log10(e) + 10) / 10) * (x1 - x0);
              const rows = [...FUELS.filter((f) => !f.id.startsWith('bh')), { id: 'this', name: `This black hole (spin ${spin.toFixed(2)})`, efficiency: disc.efficiency, how: '' }].sort((a, b) => a.efficiency - b.efficiency);
              return (
                <g>
                  {[-10, -8, -6, -4, -2, 0].map((p) => (
                    <g key={p}>
                      <line x1={sx(10 ** p)} x2={sx(10 ** p)} y1={0} y2={280} stroke="var(--border)" />
                      <text x={sx(10 ** p)} y={294} fontSize="10" fill="var(--text-muted)" textAnchor="middle">
                        {p === 0 ? '100%' : powerOfTen(p)}
                      </text>
                    </g>
                  ))}
                  {rows.map((f, i) => {
                    const y = 6 + i * 34;
                    const mine = f.id === 'this';
                    return (
                      <g key={f.id}>
                        <rect x={x0} y={y + 14} width={Math.max(2, sx(f.efficiency) - x0)} height={12} rx="2" fill={mine ? 'var(--accent)' : 'var(--text-muted)'} fillOpacity={mine ? 1 : 0.55} />
                        <text x={x0} y={y + 10} fontSize="11" fill="var(--text)" fontWeight={mine ? 700 : 400}>
                          {f.name}: {formatShare(f.efficiency)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      <p className={styles.panelTitle} style={{ marginTop: 12 }}>
        Its light: every ring’s glow added up
      </p>
      <SpectrumView
        min={WAVELENGTHS[0]}
        max={WAVELENGTHS[WAVELENGTHS.length - 1]}
        bands
        plotHeight={200}
        curves={[{ id: 'disc', label: 'the disc', color: 'var(--accent)', points: spectrum.map((p) => [p.wavelength, Math.max(top * 1e-5, p.nuLnu)] as const) }]}
        y={{ scale: 'log', min: top * 1e-4, max: top, label: 'Power (νLν)', format: (v) => `${powerOfTen(Math.round(Math.log10(v)))} W` }}
        markers={[{ at: peak.wavelength, label: `peak ${formatPhotonEnergy(peak.wavelength)}`, dashed: true }]}
        ariaLabel={`The disc’s spectrum: a broad hump, the sum of black bodies from ${formatKelvin(disc.tMax)} at the inner edge to far cooler rings outside, peaking in ${bandOf(peak.wavelength)} near ${formatPhotonEnergy(peak.wavelength)}.`}
      />
      <dl className={styles.facts}>
        <div>
          <dt>Eddington limit</dt>
          <dd>{formatLuminosity(lEdd)}</dd>
        </div>
        <div>
          <dt>Gas swallowed</dt>
          <dd>{formatRate(mdotSunsPerYear)}</dd>
        </div>
        <div>
          <dt>Light’s share of what falls in</dt>
          <dd>
            {(disc.efficiency * 100).toFixed(1)}%: {formatEnergyPerKg(disc.efficiency)}
          </dd>
        </div>
      </dl>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

function formatKelvin(T: number): string {
  if (T >= 1e6) return `${Number((T / 1e6).toPrecision(2))} million K`;
  return `${Math.round(Number(T.toPrecision(2))).toLocaleString('en-GB')} K`;
}

function formatShare(e: number): string {
  if (e >= 0.01) return `${Number((e * 100).toPrecision(2))}%`;
  if (e >= 1e-4) return `${Number((e * 100).toPrecision(2))}%`;
  const exp = Math.floor(Math.log10(e));
  return `${Number((e / 10 ** exp).toFixed(1))} × ${powerOfTen(exp)}`;
}

function formatLuminosity(W: number): string {
  const suns = W / L_SUN;
  const exp = Math.floor(Math.log10(suns));
  return suns >= 1e6 ? `${Number((suns / 10 ** exp).toFixed(1))} × ${powerOfTen(exp)} Suns` : `${Number(suns.toPrecision(2)).toLocaleString('en-GB')} Suns`;
}

function formatRate(sunsPerYear: number): string {
  if (sunsPerYear >= 0.01) return `${Number(sunsPerYear.toPrecision(2))} M☉ a year`;
  const earthsPerYear = sunsPerYear * 332_946;
  if (earthsPerYear >= 0.01) return `${Number(earthsPerYear.toPrecision(2))} Earth masses a year`;
  const exp = Math.floor(Math.log10(sunsPerYear));
  return `${Number((sunsPerYear / 10 ** exp).toFixed(1))} × ${powerOfTen(exp)} M☉ a year`;
}

function formatDistance(km: number): string {
  if (km >= 1e6) return `${Number((km / 1e6).toPrecision(2))} million km`;
  return `${Math.round(km).toLocaleString('en-GB')} km`;
}

/** The energy per kilogram a share of rest mass gives: "5.1 × 10¹⁵ J/kg". */
function formatEnergyPerKg(share: number): string {
  const J = share * C * C;
  const exp = Math.floor(Math.log10(J));
  return `${Number((J / 10 ** exp).toFixed(1))} × ${powerOfTen(exp)} J per kilogram`;
}
