import { powerOfTen } from '../../core/math/scientific';
import { PARTS } from '../course';
import { href } from '../router';
import styles from './ZoomLevels.module.css';

/** The scale of things each part looks at, as powers of ten of metres. */
const LEVELS: Record<number, { from: number; to: number; range: string; zoom: string }> = {
  1: { from: 7, to: 17, range: '10⁷ to 10¹⁷ m', zoom: 'From Earth out to the nearest stars: the Solar System and the sky it gives us.' },
  2: {
    from: 7,
    to: 19.5,
    range: '10⁷ to 10¹⁹ m',
    zoom: 'Out among the stars: white dwarfs the size of Earth, giants wider than Earth’s orbit, clusters light-years across.',
  },
  3: {
    from: -15,
    to: 22,
    range: '10⁻¹⁵ to 10²² m',
    zoom: 'Both ways at once: in to the nuclei that fuse inside a star and the 20 km of a neutron star, and out to colliding galaxies.',
  },
};

const MIN = -15;
const MAX = 22;

/** The three parts as zoom levels on one ruler of powers of ten, and (unless `list` is false) a list linking to each part. */
export function ZoomLevels({ list = true }: { list?: boolean }) {
  const W = 640;
  const x = (p: number) => 70 + ((p - MIN) / (MAX - MIN)) * (W - 90);
  const ticks = [-15, -10, -5, 0, 5, 10, 15, 20];
  return (
    <div className={styles.levels}>
      <svg
        viewBox={`0 0 ${W} 132`}
        className={styles.ruler}
        role="img"
        aria-label="A ruler of sizes from 10 to the minus 15 metres to 10 to the 22 metres, with the range each part covers."
      >
        {PARTS.map((part, i) => {
          const level = LEVELS[part.number];
          const y = 14 + i * 26;
          return (
            <g key={part.slug}>
              <rect x={x(level.from)} y={y} width={x(level.to) - x(level.from)} height={18} rx={9} className={styles[`band${part.number}`]} />
              <text x={8} y={y + 13} className={styles.bandText}>
                Part {part.numeral}
              </text>
            </g>
          );
        })}
        <line x1={x(MIN)} y1={100} x2={x(MAX)} y2={100} className={styles.axis} />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} y1={96} x2={x(t)} y2={104} className={styles.axis} />
            <text x={x(t)} y={122} textAnchor="middle" className={styles.tick}>
              {t === 0 ? '1 m (you)' : `${powerOfTen(t)} m`}
            </text>
          </g>
        ))}
      </svg>
      {list && (
        <ol className={styles.list}>
          {PARTS.map((part) => {
            const level = LEVELS[part.number];
            return (
              <li key={part.slug}>
                <a href={href(part.slug)} className={styles.link}>
                  <span className={`${styles.swatch} ${styles[`band${part.number}`]}`} aria-hidden="true" />
                  <span>
                    <b>
                      Part {part.numeral} · {part.title}
                    </b>{' '}
                    <span className={styles.range}>({level.range})</span>
                    <span className={styles.zoom}>{level.zoom}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
