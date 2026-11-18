import { useState } from 'react';
import { ClusterMode } from './ClusterMode';
import { GalaxyMode } from './GalaxyMode';
import { clusterFromQuery, collisionFromQuery, modeFromQuery, type OrreryMode } from './manyLinks';
import { findClusterPreset } from './manyPresets';
import { OrreryLab } from './OrreryLab';
import figureStyles from '../../figures/figures.module.css';
import styles from './Orrery.module.css';

/**
 * The Orrery's three modes: planetary systems (version 1's lab, with
 * relativity and the Sun's death added), star clusters and colliding
 * galaxies. The address picks the mode and its starting point
 * (?mode=cluster&…, ?mode=galaxies&…; see manyLinks.ts), so the chapters'
 * figures can open what they show.
 */

const MODES: { id: OrreryMode; label: string }[] = [
  { id: 'planets', label: 'Planets and stars' },
  { id: 'cluster', label: 'A star cluster' },
  { id: 'galaxies', label: 'Colliding galaxies' },
];

export function OrreryModes() {
  const [start] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    // A cluster from a preset, from settings in the address, or the first preset.
    const preset = findClusterPreset(q.get('preset')) ?? (q.has('n') ? undefined : findClusterPreset('young-open'));
    return {
      mode: modeFromQuery(q),
      cluster: preset ? { ...preset.config } : clusterFromQuery(q),
      clusterPreset: preset ? preset.id : null,
      galaxy: collisionFromQuery(q),
    };
  });
  const [mode, setMode] = useState<OrreryMode>(start.mode);
  const [visits, setVisits] = useState(0);

  const choose = (next: OrreryMode) => {
    if (next === mode) return;
    setMode(next);
    setVisits((k) => k + 1);
    try {
      window.history.replaceState(window.history.state, '', next === 'planets' ? window.location.pathname : `${window.location.pathname}?mode=${next}`);
    } catch {
      // The address only records the mode; the lab works without it.
    }
  };

  // The starting points apply to the first visit; switching back starts a mode afresh.
  const first = visits === 0;
  return (
    <>
      <div className={styles.modes}>
        <span className={figureStyles.segmented} role="group" aria-label="What to run">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => choose(m.id)}>
              {m.label}
            </button>
          ))}
        </span>
      </div>
      {mode === 'planets' ? (
        <OrreryLab />
      ) : (
        <div className={styles.lab}>
          {mode === 'cluster' ? (
            <ClusterMode initial={first ? start.cluster : { ...findClusterPreset('young-open')!.config }} initialPreset={first ? start.clusterPreset : 'young-open'} />
          ) : (
            <GalaxyMode initial={first ? start.galaxy : collisionFromQuery(new URLSearchParams())} />
          )}
        </div>
      )}
    </>
  );
}
