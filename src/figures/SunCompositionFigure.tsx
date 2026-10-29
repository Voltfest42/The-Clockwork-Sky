import { useMemo, useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { formatGrams, formatShare, massFractions, solarComposition } from './spectra';
import figureStyles from './figures.module.css';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * What the Sun is made of (Figure 12.4): its elements by number of atoms or
 * by mass, as one bar and on a log scale, with what each would weigh in a
 * kilogram of Sun. Asplund, Amarsi & Grevesse (2021).
 */

const W = 560;
const DECADES = 7;

export function SunCompositionFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [by, setBy] = useState<'number' | 'mass'>('mass');
  const rows = useMemo(() => solarComposition(), []);
  const { X, Y, Z } = massFractions();
  const share = (r: (typeof rows)[number]) => (by === 'number' ? r.byNumber : r.byMass);
  const sorted = [...rows].sort((a, b) => share(b) - share(a));
  const h = sorted.find((r) => r.symbol === 'H')!;
  const he = sorted.find((r) => r.symbol === 'He')!;
  const rest = 1 - share(h) - share(he);
  const left = 92;
  const right = 120;
  const bx = (v: number) => left + ((Math.log10(Math.max(v, 10 ** -DECADES)) + DECADES) / DECADES) * (W - left - right);
  const rowH = 18;
  const top = 74;
  const H = top + sorted.length * rowH + 30;

  return (
    <Figure
      number={number}
      title="What the Sun is made of"
      description="The Sun’s elements, by number of atoms or by mass, from the measurements of its spectrum. By mass the Sun is about 74% hydrogen and 24% helium; everything else, oxygen, carbon, neon, iron and the rest, makes up about 1.4%. By number of atoms hydrogen is 92%. A log scale shows the small amounts, with what each element would weigh in a kilogram of Sun."
      height={520}
      tryThis={tryThis}
      onReset={() => setBy('mass')}
      legend={[
        { label: 'hydrogen', symbol: <rect x="-9" y="-6" width="18" height="12" fill="var(--series-1)" /> },
        { label: 'helium', symbol: <rect x="-9" y="-6" width="18" height="12" fill="var(--series-2)" /> },
        { label: 'everything else (“metals”, to astronomers)', symbol: <rect x="-9" y="-6" width="18" height="12" fill="var(--series-3)" /> },
      ]}
      simplified={
        <p>
          These are the Sun’s surface abundances today, from its spectrum (and, for helium, which makes no lines in the Sun’s visible spectrum,
          from sound waves inside the Sun). The Sun’s core has turned some of its hydrogen into helium since it formed. Solar physicists still argue
          over the amounts of oxygen, carbon and neon by about a fifth: the “solar abundance problem” (Chapter 15).
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <div className={figureStyles.segmented} role="group" aria-label="Count by">
          <button type="button" aria-pressed={by === 'mass'} onClick={() => setBy('mass')}>
            By mass
          </button>
          <button type="button" aria-pressed={by === 'number'} onClick={() => setBy('number')}>
            By number of atoms
          </button>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={seasonStyles.svgLight}
        role="img"
        aria-label={`The Sun by ${by === 'mass' ? 'mass' : 'number of atoms'}: ${sorted.map((r) => `${r.name} ${formatShare(share(r))}`).join(', ')}`}
      >
        <rect x={left} y={8} width={(W - left - right) * share(h)} height={22} fill="var(--series-1)" />
        <rect x={left + (W - left - right) * share(h)} y={8} width={(W - left - right) * share(he)} height={22} fill="var(--series-2)" />
        <rect x={left + (W - left - right) * (share(h) + share(he))} y={8} width={Math.max(1.5, (W - left - right) * rest)} height={22} fill="var(--series-3)" />
        <text x={left - 6} y={23} fontSize="11" textAnchor="end" fill="var(--text)">
          One bar
        </text>
        <text x={W - right + 6} y={23} fontSize="10.5" fill="var(--text)">
          {formatShare(share(h))} · {formatShare(share(he))} · {formatShare(rest)}
        </text>
        {Array.from({ length: DECADES + 1 }, (_, k) => k - DECADES).map((e) => (
          <g key={e}>
            <line x1={bx(10 ** e)} x2={bx(10 ** e)} y1={top - 8} y2={H - 26} stroke="var(--border)" />
            <text x={bx(10 ** e)} y={H - 12} fontSize="10" textAnchor="middle" fill="var(--text-muted)">
              {formatShare(10 ** e)}
            </text>
          </g>
        ))}
        <text x={left} y={top - 14} fontSize="10.5" fill="var(--text-muted)">
          Share (log scale)
        </text>
        <text x={W - 4} y={top - 14} fontSize="10.5" textAnchor="end" fill="var(--text-muted)">
          In 1 kg of Sun
        </text>
        {sorted.map((r, i) => {
          const y = top + i * rowH;
          const color = r.symbol === 'H' ? 'var(--series-1)' : r.symbol === 'He' ? 'var(--series-2)' : 'var(--series-3)';
          return (
            <g key={r.symbol}>
              <text x={left - 6} y={y + 12} fontSize="11" textAnchor="end" fill="var(--text)">
                {r.name}
              </text>
              <rect x={left} y={y + 3} width={bx(share(r)) - left} height={rowH - 6} fill={color} />
              <text x={bx(share(r)) + 4} y={y + 12} fontSize="10" fill="var(--text)">
                {formatShare(share(r))}
              </text>
              <text x={W - 4} y={y + 12} fontSize="10.5" textAnchor="end" fill="var(--text)">
                {formatGrams(r.grams)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className={styles.readout}>
        <span>
          Hydrogen <b>{formatShare(X)}</b>
        </span>
        <span>
          Helium <b>{formatShare(Y)}</b>
        </span>
        <span>
          Everything else <b>{formatShare(Z)}</b>
        </span>
        <span>by mass</span>
      </div>
      <Caption>
        {by === 'mass'
          ? `By mass, a kilogram of Sun is ${formatGrams(1000 * X)} of hydrogen, ${formatGrams(1000 * Y)} of helium and ${formatGrams(1000 * Z)} of everything else: oxygen first, then carbon, neon and iron. The atoms of planets and people are the Sun’s small change.`
          : `By number, ${formatShare(h.byNumber)} of the Sun’s atoms are hydrogen and ${formatShare(he.byNumber)} helium. For every million hydrogen atoms there are about ${Math.round((1e6 * sorted.find((r) => r.symbol === 'O')!.byNumber) / h.byNumber).toLocaleString('en-GB')} of oxygen and ${Math.round((1e6 * sorted.find((r) => r.symbol === 'Fe')!.byNumber) / h.byNumber)} of iron.`}
      </Caption>
    </Figure>
  );
}
