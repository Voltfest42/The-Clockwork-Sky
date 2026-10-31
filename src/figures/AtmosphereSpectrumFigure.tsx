import { useState, type ReactNode } from 'react';
import { BANDS, GAS_NAMES, scaleHeight, signalPerScaleHeight, surfaceGravity, transmissionSpectrum, type Gas } from '../core/exoplanets/transmission';
import { Caption, Figure } from '../viz/Figure';
import { LineChart } from '../viz/LineChart';
import { ALL_GASES, ATMOSPHERES, CLOUD_TOP, type AtmospherePreset } from './otherWorlds';
import styles from './sky/sky.module.css';

/**
 * Starlight through an atmosphere (Figure 19.5): a toy transmission spectrum.
 * During a transit, the planet's air blocks starlight to a greater height at
 * the wavelengths its gases absorb, so the transit is a little deeper there.
 * The signal scales with the air's scale height, which is why puffy, hot,
 * hydrogen-rich planets are the easiest to read, and an Earth across a
 * Sun-like star is all but impossible.
 */

const START = 'hot-jupiter';
const FORMULAS: Record<Gas, string> = { H2O: 'H₂O', CH4: 'CH₄', CO2: 'CO₂' };
const presetById = (id: string) => ATMOSPHERES.find((a) => a.id === id)!;

export function AtmosphereSpectrumFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [planetId, setPlanetId] = useState(START);
  const [gases, setGases] = useState<readonly Gas[]>(presetById(START).gases);
  const [cloudy, setCloudy] = useState(false);
  const choose = (id: string) => {
    setPlanetId(id);
    setGases(presetById(id).gases);
    setCloudy(false);
  };
  const reset = () => choose(START);
  const preset: AtmospherePreset = presetById(planetId);
  const atm = { ...preset, gases, cloudTop: cloudy ? CLOUD_TOP : null };
  const spectrum = transmissionSpectrum(atm, 0.5, 5.5, 500);
  const ppm = spectrum.map((p) => ({ x: p.lambda, y: p.depth * 1e6 }));
  const lo = Math.min(...ppm.map((p) => p.y));
  const hi = Math.max(...ppm.map((p) => p.y));
  const perH = signalPerScaleHeight(atm) * 1e6;
  const h = scaleHeight(atm.kelvin, atm.mu, surfaceGravity(atm.massEarths, atm.radiusEarths)) / 1000;
  const margin = Math.max(perH * 1.5, 1);
  const feature = hi - lo;
  const toggle = (gas: Gas) => setGases((g) => (g.includes(gas) ? g.filter((x) => x !== gas) : [...g, gas]));
  // The strong bands, one marker per place: water's and carbon dioxide's both lie at 2.7 µm.
  const places = new Map<number, string[]>();
  for (const gas of gases)
    for (const [centre, , strength] of BANDS[gas]) if (strength >= 0.5) places.set(centre, [...(places.get(centre) ?? []), FORMULAS[gas]]);
  const markers = [...places].map(([x, names]) => ({ x, label: names.join(' + '), faint: true }));
  const decimals = hi > 1000 ? 0 : hi > 10 ? 1 : 2;

  return (
    <Figure
      number={number}
      title="Starlight through an atmosphere"
      description="A toy transmission spectrum: how deep a planet’s transit is at each wavelength from 0.5 to 5.5 micrometres. The planet’s air blocks starlight to a greater height where its gases absorb, so the transit is deeper in the bands of water, methane and carbon dioxide. For a puffy hot Jupiter like WASP-39 b the bands stand out by over a thousand parts per million; for an Earth seen across the Sun, by under a part per million. Clouds flatten them."
      height={760}
      tryThis={tryThis}
      onReset={reset}
      legend={[{ label: 'the transit’s depth at each wavelength', symbol: <line x1="-9" x2="9" stroke="var(--series-1)" strokeWidth="2.5" /> }]}
      simplified={
        <p>
          This is a sketch, not a model of real air. Each gas is a few bands at their real wavelengths, with made-up strengths, and the planet looks
          one scale height bigger for each factor of e in how strongly it absorbs (Lecavelier des Etangs et al. 2008). Real spectra come from
          radiative-transfer models fitted to the measurements, with the gases’ amounts, the temperature and hazes as unknowns, and the star’s spots
          can leave false features of their own.
        </p>
      }
    >
      <div className={styles.controls}>
        <div className={styles.presets} role="group" aria-label="Planet">
          {ATMOSPHERES.map((a) => (
            <button key={a.id} type="button" className={styles.toggle} aria-pressed={planetId === a.id} onClick={() => choose(a.id)}>
              {a.name}
            </button>
          ))}
        </div>
        <div className={styles.toggles} role="group" aria-label="Gases and clouds">
          <span className={styles.togglesLabel}>In its air:</span>
          {ALL_GASES.map((gas) => (
            <button key={gas} type="button" className={styles.toggle} aria-pressed={gases.includes(gas)} onClick={() => toggle(gas)}>
              {GAS_NAMES[gas][0].toUpperCase() + GAS_NAMES[gas].slice(1)}
            </button>
          ))}
          <button type="button" className={styles.toggle} aria-pressed={cloudy} onClick={() => setCloudy(!cloudy)}>
            High clouds
          </button>
        </div>
      </div>
      <LineChart
        series={[{ name: 'Transit depth', color: 'var(--series-1)', points: ppm }]}
        xLabel="Wavelength (micrometres)"
        yLabel="Transit depth (ppm)"
        xMin={0.5}
        xMax={5.5}
        yMin={lo - margin}
        yMax={hi + margin}
        formatY={(y) => y.toLocaleString('en-GB', { maximumFractionDigits: decimals })}
        xTicks={[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5].map((v) => ({ value: v, label: String(v) }))}
        markers={markers}
        dots={false}
        height={280}
        ariaLabel={`The transit’s depth from 0.5 to 5.5 micrometres: from ${Math.round(lo).toLocaleString('en-GB')} to ${Math.round(hi).toLocaleString('en-GB')} parts per million${gases.length ? `, deepest in the bands of ${gases.map((g) => GAS_NAMES[g]).join(', ')}` : ''}.`}
        hideLegend
      />
      <div className={styles.readout}>
        <span>
          Scale height: <b>{h >= 100 ? Math.round(h).toLocaleString('en-GB') : h.toFixed(1)} km</b>
        </span>
        <span>
          One scale height of air: <b>{perH >= 10 ? Math.round(perH) : perH.toFixed(2)} ppm</b>
        </span>
        <span>
          Bands stand out by: <b>{feature >= 10 ? Math.round(feature).toLocaleString('en-GB') : feature.toFixed(2)} ppm</b>
        </span>
      </div>
      <p className={styles.hint}>{preset.note}.</p>
      <Caption>
        {gases.length === 0
          ? 'With no gases that absorb, only the slope of scattered blue light is left: the planet looks a little bigger at short wavelengths.'
          : cloudy
            ? `High clouds hide the air below them: the bands shrink to ${Math.round(feature).toLocaleString('en-GB')} ppm. Many planets turn out cloudy, with flat spectra.`
            : feature > 300
              ? `The bands stand out by about ${Math.round(feature).toLocaleString('en-GB')} parts per million: easy for JWST, which measures transits to a few tens of parts per million.`
              : feature > 20
                ? `The bands stand out by about ${Math.round(feature)} parts per million: within JWST’s reach, but only by adding up many transits.`
                : `The bands stand out by only ${feature.toFixed(1)} parts per million: far too little to measure. Small, dense planets with heavy air round big stars are the hardest to read.`}
      </Caption>
    </Figure>
  );
}
