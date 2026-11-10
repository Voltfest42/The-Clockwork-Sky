import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { EOS_FITS } from '../../data/eos';
import { checkTooSoft, HEAVY_MASS } from './chapter26Answers';
import styles from './checks.module.css';

const IDS = EOS_FITS.map((f) => f.id);

const isSettings = (value: unknown): value is { ticked: string[] } => {
  if (!value || typeof value !== 'object') return false;
  const ticked = (value as Record<string, unknown>).ticked;
  return Array.isArray(ticked) && ticked.every((t) => typeof t === 'string' && IDS.includes(t));
};

export function TooSoftForTheHeaviest() {
  return (
    <InteractiveQuestion
      id="eos-too-soft"
      prompt={`In Figure 26.2, which equations of state can’t hold up a neutron star of ${HEAVY_MASS} M☉, as heavy as PSR J0952−0607? Tick every one.`}
      initial={{ ticked: [] as string[] }}
      isState={isSettings}
      check={(s) => checkTooSoft(s)}
    >
      {(s, set) => (
        <div className={styles.guess} role="group" aria-label="Equations of state">
          {EOS_FITS.map((f) => (
            <label key={f.id} style={{ marginRight: 12 }}>
              <input
                type="checkbox"
                checked={s.ticked.includes(f.id)}
                onChange={(e) => set({ ticked: e.target.checked ? [...s.ticked, f.id] : s.ticked.filter((t) => t !== f.id) })}
              />{' '}
              {f.name}
            </label>
          ))}
        </div>
      )}
    </InteractiveQuestion>
  );
}
