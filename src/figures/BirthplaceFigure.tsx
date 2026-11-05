import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import {
  ELEMENT_NAMES,
  ELEMENT_ORIGINS,
  formatPercent,
  formatPerHydrogen,
  IN_YOU,
  ORIGINS,
  originsOf,
  processShares,
  solarLogEps,
  solarMassFraction,
  SYMBOLS,
  tablePlace,
} from './elements';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Every element's birthplace (Figure 23.3): the periodic table with each
 * element's square split by where the Solar System's supply of it was made
 * (Johnson's shares), and the Sun's abundance of every element on a log
 * scale below it. The card for the chosen element gives its origins in
 * words, how we know, the slow, rapid and p processes' shares from gallium
 * on, and how much of it is in the Sun and in a person.
 */

const LAST = 103;
const CELL = 38;
const GAP = 3;
const W = 18 * (CELL + GAP) + 8;
const H = 10 * (CELL + GAP) + 10;

const at = (row: number, col: number) => {
  for (let Z = 1; Z <= LAST; Z++) {
    const [r, c] = tablePlace(Z);
    if (r === row && c === col) return Z;
  }
  return null;
};

const NOTES: Readonly<Record<number, string>> = {
  1: 'Every hydrogen atom is from the Big Bang; stars only destroy it.',
  2: 'Most helium is from the Big Bang; stars have added about a tenth.',
  3: 'The Sun has burnt most of its own lithium: its surface has about 200 times less than the meteorites, which keep the Solar System’s first supply.',
  6: 'Made by triple-alpha, through Hoyle’s resonance (Chapter 22).',
  7: 'Made in the CNO cycle, where the catalysts pile up as nitrogen-14 (Chapter 22).',
  8: 'The commonest element after hydrogen and helium, and most of your mass.',
  26: 'Made as nickel-56, which decays through cobalt-56 to iron-56 in weeks.',
  43: 'No stable isotope; seen in red giants’ spectra (Merrill 1952), proof that the slow process works today.',
  61: 'No stable isotope; its longest-lived, promethium-145, lasts 18 years.',
  79: 'Gold has one stable isotope, gold-197; the rapid process made almost all of it.',
  82: 'Lead-208 is the slow process’s end, with a share from stars poor in metals; lead-206 and -207 also come from uranium’s decay.',
  83: 'The slow process stops here: bismuth-209 catches a neutron and comes back as lead-206.',
  92: 'Made only by the rapid process; half of the uranium-238 the Earth was born with is left.',
};

const START = { Z: 79, view: 'origins' as const };

export function BirthplaceFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [Z, setZ] = useState(START.Z);
  const [view, setView] = useState<'origins' | 'sun'>(START.view);
  const reset = () => {
    setZ(START.Z);
    setView(START.view);
  };
  const shares = originsOf(Z);
  const sun = solarLogEps(Z);
  const massShare = solarMassFraction(Z);
  const processes = processShares(Z);
  const sunPoints = useMemo(
    () =>
      Array.from({ length: 92 }, (_, i) => i + 1)
        .map((z) => ({ z, l: solarLogEps(z) }))
        .filter((p): p is { z: number; l: { value: number; from: 'photosphere' | 'meteorites' } } => p.l !== null),
    [],
  );

  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    const [row, col] = tablePlace(Z);
    const find = (dr: number, dc: number) => {
      for (let k = 1; k <= 18; k++) {
        const z = at(row + dr * k, col + dc * k);
        if (z) return z;
        if (dr !== 0) break;
      }
      return null;
    };
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = Z < LAST ? Z + 1 : Z;
    else if (event.key === 'ArrowLeft') next = Z > 1 ? Z - 1 : Z;
    else if (event.key === 'ArrowUp') next = find(-1, 0) ?? (row === 9 ? 39 : row === 10 ? Z - 32 : null);
    else if (event.key === 'ArrowDown') next = find(1, 0) ?? (row === 5 && col === 3 ? 57 : row === 9 ? Z + 32 : null);
    else if (event.key === 'Home') next = 1;
    else if (event.key === 'End') next = LAST;
    if (next !== null) {
      event.preventDefault();
      setZ(next);
    }
  };

  const main = shares[0];
  const caption = `${capitalise(ELEMENT_NAMES[Z])}: ${shares.map((s) => `${formatPercent(s.share)} from ${s.origin.phrase}`).join(', ')}.${
    sun ? ` The Sun has ${formatPerHydrogen(sun.value)}${sun.from === 'meteorites' ? ' (from meteorites)' : ''}.` : ''
  }${IN_YOU[Z] ? ` It is ${IN_YOU[Z] >= 0.1 ? `${IN_YOU[Z]}%` : 'a trace'} of your mass.` : ''}`;

  return (
    <Figure
      number={number}
      title="Every element’s birthplace"
      description="The periodic table, each element coloured by where the Solar System’s supply of it was made: hydrogen and most helium in the Big Bang; lithium, beryllium and boron by cosmic rays; carbon, nitrogen and the slow-process elements such as barium and lead in dying low-mass stars; oxygen to calcium in exploding massive stars; much of the iron in exploding white dwarfs; and gold, platinum, europium and uranium in merging neutron stars. Below it, the Sun’s abundance of every element on a log scale, with peaks at oxygen, iron, barium and lead."
      height={860}
      tryThis={tryThis}
      onReset={reset}
      legend={ORIGINS.map((o) => ({ label: o.name, symbol: <rect x="-7" y="-7" width="14" height="14" fill={o.colour} /> }))}
      simplified={
        <p>
          The shares are Jennifer Johnson’s (2017; <i>Science</i>, 2019), read off her figure (CC BY-SA 4.0), and are themselves from models:
          good to ten or twenty per cent, and in places argued over. Where the rapid process happens, mergers or collapsing stars or both, is
          still open. For gallium to krypton Johnson gives everything to massive stars, while Prantzos et al.’s (2020) model, shown on the
          card, gives a third to two-thirds of them to the rapid process. The Sun’s abundances are its photosphere’s, or the meteorites’
          where the photosphere’s can’t be measured (Asplund et al. 2021).
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Colour by">
          <button type="button" aria-pressed={view === 'origins'} onClick={() => setView('origins')}>
            Where it was made
          </button>
          <button type="button" aria-pressed={view === 'sun'} onClick={() => setView('sun')}>
            How much the Sun has
          </button>
        </span>
      </div>
      <div>
        <div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            role="application"
            tabIndex={0}
            aria-label={`The periodic table coloured by ${view === 'origins' ? 'where each element was made' : 'how much of each the Sun has'}. ${capitalise(ELEMENT_NAMES[Z])} is chosen. Arrow keys move through the table.`}
            onKeyDown={onKey}
            style={{ touchAction: 'manipulation' }}
          >
            {ELEMENT_ORIGINS.slice(0, LAST).map((e) => {
              const [row, col] = tablePlace(e.Z);
              const x = 4 + (col - 1) * (CELL + GAP);
              const y = 4 + (row - 1) * (CELL + GAP) + (row >= 9 ? 6 : 0);
              const parts = originsOf(e.Z);
              const l = solarLogEps(e.Z);
              const chosen = e.Z === Z;
              let left = 0;
              return (
                <g key={e.Z} onClick={() => setZ(e.Z)} style={{ cursor: 'pointer' }}>
                  {view === 'origins' ? (
                    parts.map((p) => {
                      const w = p.share * CELL;
                      const rect = <rect key={p.origin.id} x={x + left} y={y} width={w + 0.3} height={CELL} fill={p.origin.colour} />;
                      left += w;
                      return rect;
                    })
                  ) : (
                    <rect x={x} y={y} width={CELL} height={CELL} fill={l ? abundanceColour(l.value) : 'var(--border)'} />
                  )}
                  <text x={x + CELL / 2} y={y + 17} fontSize="13" fontWeight="700" textAnchor="middle" fill="#fff" stroke="#000" strokeOpacity="0.55" strokeWidth="2.5" paintOrder="stroke">
                    {e.symbol}
                  </text>
                  <text x={x + CELL / 2} y={y + 31} fontSize="9" textAnchor="middle" fill="#fff" stroke="#000" strokeOpacity="0.55" strokeWidth="2" paintOrder="stroke">
                    {e.Z}
                  </text>
                  {chosen && <rect x={x - 2} y={y - 2} width={CELL + 4} height={CELL + 4} fill="none" stroke="var(--text)" strokeWidth="3" rx="3" />}
                </g>
              );
            })}
            <text x={4 + 2 * (CELL + GAP)} y={4 + 8 * (CELL + GAP) + 2} fontSize="10" fill="var(--text-muted)">
              lanthanides and actinides
            </text>
          </svg>
        </div>
      </div>
      <div className={figureStyles.withSide} style={{ marginTop: 12 }}>
        <ProfilePlot
          hideLegend
          width={460}
          series={[{ name: 'the Sun', color: 'var(--text-muted)', points: sunPoints.map((p) => ({ x: p.z, y: 10 ** p.l.value })) }]}
          xMin={1}
          xMax={92}
          formatX={(x) => String(Math.round(x))}
          xLabel="Atomic number (protons)"
          yLabel="Atoms per 10¹² of hydrogen (log)"
          yScale="log"
          yMin={0.1}
          yMax={2e12}
          formatValue={(y) => formatPerHydrogen(Math.log10(y))}
          cursor={Z}
          onCursor={(x) => setZ(Math.max(1, Math.min(92, Math.round(x))))}
          cursorText={(x) => `${capitalise(ELEMENT_NAMES[Math.max(1, Math.min(92, Math.round(x)))])}`}
          ariaLabel="The Sun’s abundance of each element against atomic number, on a log scale: falling from hydrogen with a zigzag between odd and even elements, peaks at oxygen, iron, barium and lead, and deep dips at lithium, beryllium and boron"
          height={240}
        >
          {(sx, sy) => (
            <g>
              {sunPoints.map((p) => (
                <circle key={p.z} cx={sx(p.z)} cy={sy(10 ** p.l.value)} r={p.z === Z ? 5 : 3} fill={originsOf(p.z)[0]?.origin.colour ?? 'var(--text-muted)'} stroke={p.z === Z ? 'var(--text)' : 'none'} strokeWidth="2" />
              ))}
            </g>
          )}
        </ProfilePlot>
        <div className={figureStyles.side}>
          <div className={styles.card} style={{ marginTop: 0 }}>
            <p className={styles.cardTitle}>
              {capitalise(ELEMENT_NAMES[Z])} <span className={styles.cardSubtitle}>{SYMBOLS[Z]}, element {Z}</span>
            </p>
            <dl className={styles.facts}>
              <div>
                <dt>Made by</dt>
                <dd>{shares.map((s) => `${s.origin.phrase} ${formatPercent(s.share)}`).join('; ')}</dd>
              </div>
              {processes && (
                <div>
                  <dt>By process</dt>
                  <dd>
                    slow {formatPercent(processes.s)}, rapid {formatPercent(processes.r)}
                    {processes.p > 0.0005 ? `, p ${formatPercent(processes.p)}` : ''} (Prantzos et al.)
                  </dd>
                </div>
              )}
              <div>
                <dt>In the Sun</dt>
                <dd>{sun ? `${formatPerHydrogen(sun.value)}${sun.from === 'meteorites' ? ' (meteorites)' : ''}${massShare ? `; ${formatMassShare(massShare)} of its mass` : ''}` : 'none to speak of'}</dd>
              </div>
              {IN_YOU[Z] !== undefined && (
                <div>
                  <dt>In you</dt>
                  <dd>{IN_YOU[Z] >= 0.1 ? `${IN_YOU[Z]}% of your mass` : 'about 4 g, in your blood'}</dd>
                </div>
              )}
            </dl>
            {main && (
              <p className={figureStyles.note} style={{ margin: '8px 0 0' }}>
                <b>How we know:</b> {main.origin.how}
              </p>
            )}
            {NOTES[Z] && (
              <p className={figureStyles.note} style={{ margin: '6px 0 0' }}>
                {NOTES[Z]}
              </p>
            )}
          </div>
        </div>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function formatMassShare(f: number): string {
  if (f >= 0.01) return `${Number((f * 100).toPrecision(2))}%`;
  if (f >= 1e-6) return `${Number((f * 1e6).toPrecision(2))} parts per million`;
  return `${Number((f * 1e9).toPrecision(2))} parts per billion`;
}

/** The Sun's abundance as a colour: deep for hydrogen, pale for the rarest. */
function abundanceColour(logEps: number): string {
  const t = Math.max(0, Math.min(1, logEps / 12));
  const a = [253, 231, 37];
  const b = [68, 1, 84];
  const c = a.map((v, i) => Math.round(v + t * (b[i] - v)));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
