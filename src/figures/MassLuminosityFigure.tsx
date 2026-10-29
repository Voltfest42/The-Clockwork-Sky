import { useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { ScatterChart } from '../viz/ScatterChart';
import { doubling, DEBCAT_STARS, FAMOUS_WEIGHED, FIT_RANGES, fitRange, type Quantity } from './massLuminosity';
import { Slider } from './Slider';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The mass–luminosity relation (Figure 14.4): stars weighed in eclipsing
 * pairs (DEBCat), luminosity against mass on log axes, where a power law is
 * a straight line. Tilt a line to match them, or fit the best slope over a
 * range of masses; switch to radius against mass.
 */

const START = { quantity: 'luminosity' as Quantity, slope: 1, range: 'all' };

export function MassLuminosityFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [quantity, setQuantity] = useState<Quantity>(START.quantity);
  const [slope, setSlope] = useState(START.slope);
  const [rangeId, setRangeId] = useState<string>(START.range);
  const reset = () => {
    setQuantity(START.quantity);
    setSlope(START.slope);
    setRangeId(START.range);
  };
  const range = FIT_RANGES.find((r) => r.id === rangeId)!;
  const rangeWords = range.name[0].toLowerCase() + range.name.slice(1);
  const fit = fitRange(quantity, range.from, range.to);
  const luminous = quantity === 'luminosity';
  const main = DEBCAT_STARS.filter((s) => s.mainSequence);
  const swollen = DEBCAT_STARS.filter((s) => !s.mainSequence);
  const fitted = Math.abs(slope - fit.slope) < 0.005;
  // The reader's line passes through the Sun: y = M^slope.
  const factor = doubling(slope);

  return (
    <Figure
      number={number}
      title="The mass–luminosity relation"
      description="About 300 main-sequence stars weighed in eclipsing pairs, their luminosity against their mass on logarithmic axes, with the Sun and other stars weighed by their orbits. They lie close to a straight line: luminosity rises roughly as mass to the power 3.5 to 4, so a star of twice the Sun’s mass is more than ten times as luminous. Tilt a line through the Sun to match them, or fit the best slope over a range of masses. A second view shows radius against mass."
      height={600}
      tryThis={tryThis}
      onReset={reset}
      simplified={
        <p>
          Luminosities are worked out from each star’s measured radius and temperature (L = R²T⁴ in solar units). Stars count as on the main
          sequence by their surface gravity; the rest, mostly swollen and a few still young, are shown apart. The stars differ in age and make-up, which spreads them a little
          about any one line. DEBCat’s copy here is its 2017 version, with few red dwarfs.
        </p>
      }
    >
      <div className={styles.controls}>
        <div className={figureStyles.toolbar}>
          <div className={figureStyles.segmented} role="group" aria-label="Plot against mass">
            <button type="button" aria-pressed={luminous} onClick={() => setQuantity('luminosity')}>
              Luminosity
            </button>
            <button type="button" aria-pressed={!luminous} onClick={() => setQuantity('radius')}>
              Radius
            </button>
          </div>
        </div>
        <Slider label={`Your line: ${luminous ? 'L' : 'R'} = M to the power`} value={slope} min={0} max={6} step={0.05} format={(n) => n.toFixed(2)} onChange={setSlope} />
        <div className={styles.toggles} role="group" aria-label="Fit the best slope">
          <span className={styles.togglesLabel}>Fit the best slope:</span>
          {FIT_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              className={styles.toggle}
              aria-pressed={fitted && rangeId === r.id}
              onClick={() => {
                setRangeId(r.id);
                setSlope(fitRange(quantity, r.from, r.to).slope);
              }}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>
      <ScatterChart
        groups={[
          { name: 'On the main sequence (DEBCat)', color: 'var(--series-1)', shape: 'circle', points: main.map((s) => ({ x: s.mass, y: s[quantity], label: s.label })) },
          { name: 'Off the main sequence (DEBCat)', color: 'var(--series-3)', shape: 'triangle', points: swollen.map((s) => ({ x: s.mass, y: s[quantity], label: s.label })) },
          { name: 'Weighed by their orbits', color: 'var(--series-2)', shape: 'diamond', points: FAMOUS_WEIGHED.map((s) => ({ x: s.mass, y: s[quantity], label: s.label })) },
        ]}
        lines={[{ name: `Your line, ${luminous ? 'L' : 'R'} ∝ M^${slope.toFixed(2)}`, color: 'var(--accent)', f: (m) => m ** slope }]}
        labelled={['the Sun', 'Sirius A', 'Proxima Centauri']}
        xScale="log"
        yScale="log"
        xMin={0.08}
        xMax={40}
        yMin={luminous ? 1e-3 : 0.1}
        yMax={luminous ? 1e6 : 30}
        xLabel="Mass (Suns)"
        yLabel={luminous ? 'Luminosity (Suns)' : 'Radius (Suns)'}
        ariaLabel={`${luminous ? 'Luminosity' : 'Radius'} against mass on logarithmic axes for ${DEBCAT_STARS.length} stars in eclipsing pairs, with a line of slope ${slope.toFixed(2)}`}
      />
      <div className={styles.readout}>
        <span>
          Your line: twice the mass gives <b>{factor}</b> times the {luminous ? 'light' : 'width'}
        </span>
        <span>
          Best slope {rangeWords}: <b>{fit.slope.toFixed(2)}</b> ({fit.count} stars, scatter ×{(10 ** fit.scatter).toFixed(2)})
        </span>
      </div>
      <Caption>
        {luminous
          ? `On a log–log plot a power law is a straight line, and its slope is the power. The best slope for stars ${rangeWords} is ${fit.slope.toFixed(1)}: twice the mass, ${doubling(fit.slope)} times the light. ${range.id === 'low' || range.id === 'top' ? 'At this end of the main sequence the line is flatter than in the middle.' : 'The stars off the main sequence sit above the line: most have begun to swell, and a few are young red dwarfs still shrinking towards it.'}`
          : `Radius grows more slowly than mass: the best slope for stars ${rangeWords} is ${fit.slope.toFixed(2)}, so a star of twice the mass is about ${doubling(fit.slope)} times as wide. Stars off the main sequence sit well above the line.`}
      </Caption>
    </Figure>
  );
}
