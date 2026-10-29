import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { regionOf, type HRPoint } from '../core/stars/hr';
import { useHydrated } from '../site/hydration';
import { Caption, Figure } from '../viz/Figure';
import { HRDiagram, type Axes, type HRLayer } from '../viz/hr/HRDiagram';
import { describePlace, famousMarkers, famousName, inWords, loadGaia, loadNakedEye, regionShares, type GaiaSets, type StarSet } from './hrStars';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * The HR diagram of real stars (Figure 13.2): Gaia's stars within 100
 * parsecs as a density map with a sample of dots, or every star within 20
 * parsecs, or the stars you can see with the naked eye (from Hipparcos, by
 * way of the HYG catalogue). Observers' or physicists' axes; the famous stars
 * marked; click or use the arrow keys and Enter to ask what lives where.
 */

type Set = 'hundred' | 'twenty' | 'eye';

const SETS: { id: Set; label: string }[] = [
  { id: 'hundred', label: 'Within 100 parsecs' },
  { id: 'twenty', label: 'Within 20 parsecs' },
  { id: 'eye', label: 'Naked-eye stars' },
];

export function HRDiagramFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [set, setSet] = useState<Set>('hundred');
  const [axes, setAxes] = useState<Axes>('observer');
  const [famous, setFamous] = useState(true);
  const [highlight, setHighlight] = useState<string | undefined>();
  const [cursor, setCursor] = useState<HRPoint | null>(null);
  const [picked, setPicked] = useState<HRPoint | null>(null);
  const [gaia, setGaia] = useState<GaiaSets | null>(null);
  const [eye, setEye] = useState<StarSet | null>(null);
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    loadGaia().then((g) => live && setGaia(g));
    return () => {
      live = false;
    };
  }, [hydrated]);
  useEffect(() => {
    if (set !== 'eye' || eye) return;
    let live = true;
    loadNakedEye().then((e) => live && setEye(e));
    return () => {
      live = false;
    };
  }, [set, eye]);

  const reset = () => {
    setSet('hundred');
    setAxes('observer');
    setFamous(true);
    setHighlight(undefined);
    setCursor(null);
    setPicked(null);
  };

  const data: StarSet | null = set === 'eye' ? eye : gaia ? gaia[set] : null;
  const layers: HRLayer[] = useMemo(() => (data ? [{ id: set, points: data.points, size: set === 'hundred' ? 1.3 : 1.8, alpha: set === 'hundred' ? 0.7 : 0.9 }] : []), [data, set]);
  const shares = useMemo(() => (data ? regionShares(data.points) : null), [data]);
  const markers = famous ? famousMarkers(highlight) : [];

  const summary = !data || !shares
    ? 'Loading the stars…'
    : set === 'hundred'
      ? `Gaia’s ${data.count.toLocaleString('en-GB')} stars within 100 parsecs (326 light-years) with good measurements, drawn as a map of how crowded each part of the diagram is, with ${data.points.length.toLocaleString('en-GB')} of them as dots. ${cap(inWords(shares['main-sequence'] + shares['red-dwarfs']))} lie on the main sequence; about ${inWords(shares['white-dwarfs'])} is a white dwarf.`
      : set === 'twenty'
        ? `All ${data.count.toLocaleString('en-GB')} stars within 20 parsecs that Gaia measured well. ${cap(inWords(shares['red-dwarfs']))} are red dwarfs, too faint to see without a telescope; giants are almost absent, because they are rare.`
        : `The ${data.count.toLocaleString('en-GB')} stars you can see with the naked eye whose distances Hipparcos measured. ${cap(inWords(shares.giants + shares.supergiants + shares.subgiants))} are giants or subgiants, and most of the rest are hotter and brighter than the Sun: you see them because they are luminous enough to be seen from far away. The eye’s stars are not typical.`;

  return (
    <Figure
      number={number}
      title="The HR diagram of real stars"
      description="The Hertzsprung–Russell diagram of real stars measured by the Gaia spacecraft: colour (or temperature) across, with hot stars on the left, and brightness (absolute magnitude, or luminosity) up the side. Most stars lie along one band from top left to bottom right, the main sequence; giants and supergiants lie above it and white dwarfs below. Choose all the stars within 100 parsecs, the ones within 20 parsecs (mostly faint red dwarfs) or the stars you can see with the naked eye (mostly luminous stars far away); switch between observers’ and physicists’ axes; pick any place to see what lives there."
      height={760}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'how crowded each part is (Gaia, within 100 parsecs)', symbol: <rect x="-9" y="-6" width="18" height="12" fill="rgb(150,175,255)" opacity="0.7" /> },
        { label: 'a star, in its colour', symbol: <circle r="3" fill="#ffd2a1" stroke="#070b16" /> },
        { label: 'a famous star', symbol: <circle r="4.5" fill="#fff4ea" stroke="#64748b" strokeWidth="1.2" /> },
        ...(axes === 'physicist' ? [{ label: 'stars of equal size', symbol: <line x1="-10" x2="10" stroke="var(--text-muted)" strokeDasharray="4 3" /> }] : []),
      ]}
      simplified={
        <p>
          The observers’ axes are Gaia’s own measurements. The physicists’ axes need a temperature from each colour and a correction from Gaia’s G band
          to all wavelengths, both from a table for main-sequence stars (Mamajek’s), so they are approximate for giants and white dwarfs. Gaia
          misses the very brightest stars, which saturate its cameras, and pairs too close to measure cleanly. The naked-eye stars’ colours are
          converted from B − V. Data: ESA/Gaia/DPAC (CC BY-NC 3.0 IGO); HYG (CC BY-SA 4.0).
        </p>
      }
    >
      <div className={styles.controls}>
        <div className={figureStyles.toolbar} style={{ marginBottom: 0 }}>
          <div className={figureStyles.segmented} role="group" aria-label="Which stars">
            {SETS.map((s) => (
              <button key={s.id} type="button" aria-pressed={set === s.id} onClick={() => setSet(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <div className={figureStyles.segmented} role="group" aria-label="Axes">
            <button type="button" aria-pressed={axes === 'observer'} onClick={() => setAxes('observer')}>
              Observers’ axes
            </button>
            <button type="button" aria-pressed={axes === 'physicist'} onClick={() => setAxes('physicist')}>
              Physicists’ axes
            </button>
          </div>
        </div>
        <div className={styles.toggles} role="group" aria-label="Famous stars">
          <button type="button" className={styles.toggle} aria-pressed={famous} onClick={() => setFamous(!famous)}>
            Famous stars
          </button>
          {famous &&
            famousMarkers().map((m) => (
              <button key={m.id} type="button" className={styles.toggle} aria-pressed={highlight === m.id} onClick={() => {
                setHighlight(highlight === m.id ? undefined : m.id);
                setCursor(m.point);
                setPicked(m.point);
              }}>
                {m.id === 'sun' ? 'The Sun' : famousName(m.id)}
              </button>
            ))}
        </div>
      </div>
      <HRDiagram
        axes={axes}
        density={set === 'hundred' ? data?.density : undefined}
        layers={layers}
        markers={markers}
        radiusLines
        cursor={cursor}
        onCursor={setCursor}
        onPick={(p) => {
          setPicked(p);
          setHighlight(undefined);
        }}
        ariaLabel={`HR diagram, ${axes === 'observer' ? 'observers’' : 'physicists’'} axes, ${SETS.find((s) => s.id === set)!.label.toLowerCase()}. Move the cross-hair with the arrow keys and press Enter to ask what lives there.`}
      />
      <p className={figureStyles.below} style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>
        {summary}
      </p>
      <Caption>
        {picked
          ? `${highlight ? `${cap(famousName(highlight))}: ` : ''}${describePlace(picked)}`
          : 'Click anywhere on the diagram, or move the cross-hair with the arrow keys and press Enter, to see what lives there.'}
      </Caption>
      {picked && regionOf(picked.kelvin, picked.luminosity) === 'white-dwarfs' && axes === 'observer' && set === 'hundred' && (
        <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Look closely: Gaia’s white dwarfs lie on two close tracks, not one, split by the make-up of their thin atmospheres.
        </p>
      )}
    </Figure>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
