import type { ReactNode } from 'react';
import type { SkyLayers } from '../../viz/sky/draw';
import type { PickedFacts } from './describe';
import figureStyles from '../figures.module.css';
import styles from './sky.module.css';

/** Facts about the picked star or planet, with buttons to look at it and to close the card. */
export function PickedCard({ facts, onLook, onClose }: { facts: PickedFacts; onLook?: () => void; onClose: () => void }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>
          {facts.title}
          {facts.subtitle && <span className={styles.cardSubtitle}> · {facts.subtitle}</span>}
        </h3>
        {onLook && (
          <button type="button" className={figureStyles.toolButton} onClick={onLook}>
            Look at it
          </button>
        )}
        <button type="button" className={figureStyles.toolButton} onClick={onClose} aria-label={`Close the details of ${facts.title}`}>
          ✕
        </button>
      </div>
      <dl className={styles.facts}>
        {facts.rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type Toggle = { key: keyof SkyLayers; label: string } | { key: 'daylight'; label: string };

/** Switches for the sky view's layers, as toggle buttons. */
export function LayerToggles({
  layers,
  onLayers,
  daylight,
  onDaylight,
  toggles,
  children,
}: {
  layers: SkyLayers;
  onLayers: (layers: SkyLayers) => void;
  daylight?: boolean;
  onDaylight?: (on: boolean) => void;
  toggles: readonly Toggle[];
  children?: ReactNode;
}) {
  return (
    <div className={styles.toggles} role="group" aria-label="Show">
      <span className={styles.togglesLabel}>Show</span>
      {toggles.map((t) => {
        if (t.key === 'daylight') {
          return (
            <button key="daylight" type="button" className={styles.toggle} aria-pressed={!!daylight} onClick={() => onDaylight?.(!daylight)}>
              {t.label}
            </button>
          );
        }
        const key = t.key as keyof SkyLayers;
        const on = key === 'grid' ? layers.grid !== 'none' : !!layers[key];
        return (
          <button
            key={key}
            type="button"
            className={styles.toggle}
            aria-pressed={on}
            onClick={() => onLayers({ ...layers, [key]: key === 'grid' ? (on ? 'none' : 'altaz') : !on })}
          >
            {t.label}
          </button>
        );
      })}
      {children}
    </div>
  );
}
