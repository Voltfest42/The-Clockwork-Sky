import { useState, type ReactNode } from 'react';
import { Caption, Figure } from '../viz/Figure';
import { Slider } from './Slider';
import { formatKg, SCALE_THINGS, teaspoon, zoomWidth, ZOOM_WIDTHS, type ScaleThing } from './starDeaths';
import seasonStyles from './seasons.module.css';
import styles from './sky/sky.module.css';

/**
 * Dead stars to scale (Figure 18.2): Earth beside a white dwarf, then a zoom
 * of over three hundred times onto a neutron star over a city and two black holes'
 * horizons, all at their true sizes; and what a teaspoon of each weighs.
 */

const W = 640;
const H = 300;

/** Where each thing sits along the strip, km from Earth's centre: the big ones on the left, the small ones together on the right. */
const PLACE: Record<string, number> = {
  earth: 0,
  'sirius-b': 13_500,
  manhattan: 20_500,
  'neutron-star': 20_500,
  'bh-10': 20_545,
  'bh-1': 20_590,
};

/** The view's centre for a zoom (0 wide to 1 close): from between Earth and Sirius B to the small ones, moving as the view narrows. */
function centreAt(f: number): number {
  const wide = 7000;
  const close = 20_545;
  const s = Math.min(1, Math.max(0, (f - 0.12) / 0.55));
  return wide + (close - wide) * s * s * (3 - 2 * s);
}

const STOPS = [
  { name: 'Earth and a white dwarf', f: 0 },
  { name: 'A neutron star and black holes', f: 1 },
];

const FILL: Record<ScaleThing['kind'], string> = {
  planet: '#4f8fd6',
  'white-dwarf': '#e8eefc',
  'neutron-star': '#b8c0ff',
  'black-hole': '#000',
  city: '#5b6577',
};

function km(x: number): string {
  return x >= 100 ? `${Math.round(x).toLocaleString('en-GB')} km` : `${Number(x.toPrecision(2))} km`;
}

export function DeadStarsFigure({ number, tryThis }: { number: string; tryThis: ReactNode }) {
  const [f, setF] = useState(0);
  const reset = () => setF(0);
  const width = zoomWidth(f);
  const centre = centreAt(f);
  const scale = W / width; // pixels per km
  const sx = (x: number) => W / 2 + (x - centre) * scale;
  const visible = SCALE_THINGS.filter((t) => {
    const x = sx(PLACE[t.id]);
    return x + (t.size * scale) / 2 > -40 && x - (t.size * scale) / 2 < W + 40;
  });
  const bar = niceBar(width / 4);

  return (
    <Figure
      number={number}
      title="Dead stars to scale"
      description="Earth beside Sirius B, a white dwarf with the Sun’s mass squeezed into a ball smaller than Earth; then, about three hundred times closer, a neutron star 24 km across over Manhattan, and the horizons of a black hole of 10 Suns and of the Sun if it were one, all at their true sizes. A teaspoon of white dwarf weighs about 14 tonnes, and a teaspoon of neutron star about 2 billion tonnes."
      height={640}
      tryThis={tryThis}
      onReset={reset}
      legend={[
        { label: 'a planet', symbol: <circle r="7" fill={FILL.planet} /> },
        { label: 'a white dwarf or neutron star', symbol: <circle r="7" fill={FILL['neutron-star']} /> },
        { label: 'a black hole’s horizon', symbol: <circle r="7" fill="#000" stroke="#ff9f1c" strokeWidth="1.5" /> },
        { label: 'a city, for scale', symbol: <rect x="-9" y="-3" width="18" height="6" fill={FILL.city} /> },
      ]}
      simplified={
        <p>
          A neutron star’s radius is known to about a kilometre (12 km here, from NICER’s measurements); a black hole’s horizon is drawn as a
          black disc, though nothing marks it and light bending would make it look bigger. Manhattan is drawn as a strip of its length.
        </p>
      }
    >
      <div className={styles.presets} role="group" aria-label="Go to" style={{ marginBottom: 6 }}>
        {STOPS.map((s) => (
          <button key={s.name} type="button" className={styles.toggle} aria-pressed={Math.abs(f - s.f) < 0.005} onClick={() => setF(s.f)}>
            {s.name}
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <Slider label="Zoom" value={f} min={0} max={1} step={0.002} format={() => `${km(width)} across`} onChange={setF} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: '#070b16', borderRadius: 6, display: 'block' }} role="img" aria-label={`A view ${km(width)} across showing ${visible.map((t) => `${t.name} (${km(t.size)})`).join(', ') || 'empty space'}.`}>
        {visible.map((t) => {
          const x = sx(PLACE[t.id]);
          const r = (t.size * scale) / 2;
          const y = H / 2 - 10;
          const tiny = r < 1.5;
          if (t.kind === 'city') {
            // A strip of the city's length, just under the neutron star it is compared with.
            const ns = (SCALE_THINGS.find((x) => x.id === 'neutron-star')!.size * scale) / 2;
            const top = y + Math.max(ns, 2) + 10;
            return (
              <g key={t.id}>
                <rect x={x - r} y={top} width={Math.max(2, 2 * r)} height={4} fill={FILL.city} />
                {!tiny && (
                  <text x={x} y={top + 18} fontSize="11" textAnchor="middle" fill="#cdd6f4">
                    Manhattan, 21.6 km long
                  </text>
                )}
              </g>
            );
          }
          return (
            <g key={t.id}>
              <circle cx={x} cy={y} r={Math.max(r, 1.2)} fill={FILL[t.kind]} stroke={t.kind === 'black-hole' ? '#ff9f1c' : 'none'} strokeWidth={1.5} />
              {r * 2 > 3 && (
                <text x={x} y={Math.max(16, y - Math.max(r, 4) - 8)} fontSize="11.5" textAnchor="middle" fill="#fff" stroke="#070b16" strokeWidth={3} paintOrder="stroke">
                  {t.name}
                </text>
              )}
            </g>
          );
        })}
        {SCALE_THINGS.find((t) => t.id === 'bh-10')!.size * scale < 3 && (
          <text x={sx(PLACE['bh-10'])} y={H / 2 - 22} fontSize="11" textAnchor="middle" fill="#cdd6f4" stroke="#070b16" strokeWidth={3} paintOrder="stroke">
            neutron star and black holes: zoom in
          </text>
        )}
        <line x1={16} x2={16 + bar * scale} y1={H - 16} y2={H - 16} stroke="#cdd6f4" strokeWidth={2} />
        <text x={16} y={H - 22} fontSize="11" fill="#cdd6f4">
          {km(bar)}
        </text>
      </svg>
      <div style={{ overflowX: 'auto' }}>
        <table className={seasonStyles.table}>
          <caption>What a teaspoon (5 cm³) of each weighs</caption>
          <thead>
            <tr>
              <th scope="col">Object</th>
              <th scope="col">Width</th>
              <th scope="col">Mass</th>
              <th scope="col">A teaspoon</th>
            </tr>
          </thead>
          <tbody>
            {SCALE_THINGS.filter((t) => t.kind !== 'city').map((t) => (
              <tr key={t.id}>
                <th scope="row">{t.name}</th>
                <td>{km(t.size)}</td>
                <td>{t.id === 'earth' ? '1/333,000 Sun' : t.mass === 1 ? '1 Sun' : `${t.mass} Suns`}</td>
                <td>{t.kind === 'black-hole' ? 'no surface to scoop' : formatKg(teaspoon(t.mass!, t.size))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Caption>
        {width > 5000
          ? `${km(width)} across: Sirius B, with the mass of the Sun, is a little smaller than Earth.`
          : width > 200
            ? `${km(width)} across: zooming in on the neutron star and the black holes, which would fit inside a city.`
            : `${km(width)} across: a neutron star is about as wide as Manhattan is long; a black hole of 10 Suns, about 60 km across.`}
      </Caption>
    </Figure>
  );
}

/** A round scale-bar length near `x` km: 1, 2 or 5 times a power of ten. */
function niceBar(x: number): number {
  const p = 10 ** Math.floor(Math.log10(x));
  return [5, 2, 1].map((k) => k * p).find((v) => v <= x) ?? p;
}

export { ZOOM_WIDTHS };
