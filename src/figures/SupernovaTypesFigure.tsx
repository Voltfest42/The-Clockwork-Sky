import { useMemo, useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { ProfilePlot } from '../viz/profile/ProfilePlot';
import { blueshifted, pathTo, sketchSpectrum, SUPERNOVA_KINDS, type SupernovaType } from './explosions';
import figureStyles from './figures.module.css';
import styles from './sky/sky.module.css';

/**
 * Supernova spectra, sorted (Figure 25.2): a decision tree from the lines in a
 * supernova's spectrum to its type, a sketched spectrum of each type with its
 * telling lines marked, and what each type means for the star that exploded.
 */

const START: SupernovaType = 'Ia';
const TREE = { w: 560, h: 210 };

export function SupernovaTypesFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [type, setType] = useState<SupernovaType>(START);
  const reset = () => setType(START);
  const kind = SUPERNOVA_KINDS.find((k) => k.type === type)!;
  const spectrum = useMemo(() => sketchSpectrum(kind), [kind]);
  const path = pathTo(type);
  const answered = (q: string) => path.find((p) => p.question === q);

  // The tree: three questions down the left, a type off each "yes" and the last "no".
  const nodes = [
    { q: 'Hydrogen lines?', x: 90, y: 30, yes: { type: 'II' as SupernovaType, x: 300, y: 30 } },
    { q: 'Silicon near 615 nm?', x: 90, y: 100, yes: { type: 'Ia' as SupernovaType, x: 300, y: 100 } },
    { q: 'Helium lines?', x: 90, y: 170, yes: { type: 'Ib' as SupernovaType, x: 300, y: 170 }, no: { type: 'Ic' as SupernovaType, x: 470, y: 170 } },
  ];
  const leafStyle = (t: SupernovaType) => ({ fill: t === type ? 'var(--accent)' : 'var(--bg)', text: t === type ? 'var(--bg)' : 'var(--text)' });
  const caption = `${kind.name}: ${kind.lines}. ${path.map((p) => `${p.question} ${p.answer ? 'Yes' : 'No'}.`).join(' ')} The star was ${kind.star}; ${kind.how}, and it leaves ${kind.leaves}.`;

  return (
    <Figure
      number={number}
      title="Supernova spectra, sorted"
      description="Supernovae are sorted by the lines in their spectra. With hydrogen, Type II: a supergiant whose core collapsed with its envelope on. Without hydrogen but with silicon, Type Ia: a white dwarf blown apart. With helium but neither, Type Ib, and with neither, Type Ic: massive stars stripped of their outer layers, mostly by a companion, whose cores collapsed. Every line is broad and its absorption shifted blue, because the gas is flying towards us at about 10,000 km/s."
      height={820}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'the path to this type through the questions', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--accent)" strokeWidth="3" /> },
        { label: 'a sketched spectrum (not real data)', symbol: <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--text)" strokeWidth="2" /> },
        { label: 'a telling line’s absorption, shifted blue by the expansion', symbol: <line x1="0" y1="-7" x2="0" y2="7" stroke="var(--series-2)" strokeWidth="2" strokeDasharray="3 2" /> },
      ]}
      simplified={
        <p>
          The spectra are sketches, not observations: a warm continuum with each line drawn as a blue-shifted absorption and a weaker emission at
          rest (the “P Cygni” shape of a fast, expanding shell), at widths and depths chosen to look like spectra near maximum light. Real
          spectra change from night to night, and some supernovae sit between the types (IIb, whose hydrogen fades and helium takes over). The
          tree leaves out Type II’s own kinds: II-P, whose light holds steady for about 100 days; II-L, which fades steadily; and IIn, whose
          narrow lines come from gas the star lost before it exploded.
        </p>
      }
    >
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Type">
          {SUPERNOVA_KINDS.map((k) => (
            <button key={k.type} type="button" aria-pressed={type === k.type} onClick={() => setType(k.type)}>
              {k.name}
            </button>
          ))}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${TREE.w} ${TREE.h}`}
        width="100%"
        role="img"
        aria-label={`The decision tree: hydrogen lines? Yes: Type II. No: silicon near 615 nm? Yes: Type Ia. No: helium lines? Yes: Type Ib; no: Type Ic. ${kind.name}’s path: ${path.map((p) => `${p.question} ${p.answer ? 'yes' : 'no'}`).join(', ')}.`}
      >
        {nodes.map((n, k) => {
          const a = answered(n.q);
          const onPath = !!a;
          return (
            <g key={n.q}>
              {k < nodes.length - 1 && (
                <g>
                  <line x1={n.x} x2={n.x} y1={n.y + 16} y2={nodes[k + 1].y - 16} stroke={onPath && a && !a.answer ? 'var(--accent)' : 'var(--border)'} strokeWidth={onPath && a && !a.answer ? 3 : 1.5} />
                  <text x={n.x + 6} y={(n.y + nodes[k + 1].y) / 2 + 4} fontSize="11" fill="var(--text-muted)">
                    no
                  </text>
                </g>
              )}
              <line x1={n.x + 80} x2={n.yes.x - 38} y1={n.y} y2={n.yes.y} stroke={a?.answer ? 'var(--accent)' : 'var(--border)'} strokeWidth={a?.answer ? 3 : 1.5} />
              <text x={(n.x + 80 + n.yes.x - 38) / 2} y={n.y - 5} fontSize="11" fill="var(--text-muted)" textAnchor="middle">
                yes
              </text>
              {n.no && (
                <g>
                  <path d={`M${n.x} ${n.y + 16} L${n.x} ${n.y + 32} L${n.no.x} ${n.y + 32} L${n.no.x} ${n.no.y + 16}`} fill="none" stroke={a && !a.answer ? 'var(--accent)' : 'var(--border)'} strokeWidth={a && !a.answer ? 3 : 1.5} />
                  <text x={(n.x + n.no.x) / 2} y={n.y + 28} fontSize="11" fill="var(--text-muted)" textAnchor="middle">
                    no
                  </text>
                </g>
              )}
              <rect x={n.x - 82} y={n.y - 16} width={164} height={32} rx={8} fill="var(--bg)" stroke={onPath ? 'var(--accent)' : 'var(--border)'} strokeWidth={onPath ? 2 : 1} />
              <text x={n.x} y={n.y + 4} fontSize="12.5" fill="var(--text)" textAnchor="middle">
                {n.q}
              </text>
              {[n.yes, ...(n.no ? [n.no] : [])].map((leaf) => {
                const st = leafStyle(leaf.type);
                return (
                  <g key={leaf.type}>
                    <rect x={leaf.x - 38} y={leaf.y - 15} width={76} height={30} rx={15} fill={st.fill} stroke="var(--accent)" strokeWidth={1.5} />
                    <text x={leaf.x} y={leaf.y + 4.5} fontSize="12.5" fontWeight={600} fill={st.text} textAnchor="middle">
                      Type {leaf.type}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      <p className={styles.panelTitle} style={{ marginTop: 8 }}>
        {kind.name}, sketched near maximum light
      </p>
      <ProfilePlot
        series={[{ name: kind.name, color: 'var(--text)', points: spectrum.map((p) => ({ x: p.nm, y: p.flux })) }]}
        hideLegend
        xMin={350}
        xMax={900}
        formatX={(x) => String(Math.round(x))}
        xLabel="Wavelength (nm)"
        yLabel="Brightness (sketch)"
        yMin={0}
        yMax={1.15}
        formatY={() => ''}
        ariaLabel={`A sketched ${kind.name} spectrum from 350 to 900 nm, with ${kind.marks.join(', ')} marked: ${kind.lines}.`}
        height={240}
      >
        {(sx, sy) => (
          <g>
            {kind.features
              .filter((l) => kind.marks.includes(l.label))
              .map((l, k) => {
                const x = sx(blueshifted(l.nm, kind.speed * 0.75));
                return (
                  <g key={l.label}>
                    <line x1={x} x2={x} y1={sy(1.1)} y2={sy(0.05)} stroke="var(--series-2)" strokeWidth="1.5" strokeDasharray="3 2" />
                    <text x={x + 3} y={sy(1.1) + 10 + (k % 2) * 13} fontSize="11.5" fontWeight={600} fill="var(--text)">
                      {l.label.replace(/ \d+$/, '')}
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
            <dt>Lines</dt>
            <dd>{kind.lines}</dd>
          </div>
          <div>
            <dt>The star</dt>
            <dd>{kind.star}</dd>
          </div>
          <div>
            <dt>What happened</dt>
            <dd>{kind.how}</dd>
          </div>
          <div>
            <dt>Leaves</dt>
            <dd>{kind.leaves}</dd>
          </div>
          <div>
            <dt>Seen</dt>
            <dd>{kind.example}</dd>
          </div>
        </dl>
      </div>
      <Caption>{caption}</Caption>
    </Figure>
  );
}
