import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { Slider } from '../../figures/Slider';
import { checkRing, RING_START, type RingSetup } from './chapter31Answers';

const isSetup = (value: unknown): value is RingSetup => {
  if (!value || typeof value !== 'object') return false;
  const { massRatio, pericentre, tilt } = value as Record<string, unknown>;
  return (
    typeof massRatio === 'number' &&
    typeof pericentre === 'number' &&
    typeof tilt === 'number' &&
    massRatio >= 0.05 &&
    massRatio <= 1 &&
    pericentre >= 1 &&
    pericentre <= 50 &&
    tilt >= 0 &&
    tilt <= 90
  );
};

export function MakeARing() {
  return (
    <InteractiveQuestion
      id="make-a-ring"
      prompt="Make a ring galaxy: choose the companion’s mass, how close it passes the main galaxy’s centre, and the main disc’s tilt to its orbit (at 90° the companion plunges straight through the disc). The check runs the collision with Figure 31.1’s engine."
      initial={{ ...RING_START }}
      isState={isSetup}
      check={(s) => checkRing(s)}
    >
      {(s, set) => (
        <>
          <Slider
            label="Companion’s mass"
            value={s.massRatio}
            min={0.05}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}% of the main galaxy’s`}
            onChange={(v) => set({ ...s, massRatio: Math.round(v * 20) / 20 })}
          />
          <Slider label="Closest approach" value={s.pericentre} min={1} max={50} step={1} format={(v) => `${Math.round(v)} kpc`} onChange={(v) => set({ ...s, pericentre: Math.round(v) })} />
          <Slider label="Disc’s tilt to the orbit" value={s.tilt} min={0} max={90} step={5} format={(v) => `${Math.round(v)}°`} onChange={(v) => set({ ...s, tilt: Math.round(v) })} />
        </>
      )}
    </InteractiveQuestion>
  );
}
