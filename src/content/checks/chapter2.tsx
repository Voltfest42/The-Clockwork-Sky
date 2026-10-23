import { useId, useMemo, useRef, useState } from 'react';
import type { SkyCamera } from '../../core/sky/projection';
import { ttFromUt } from '../../core/time/deltaT';
import { jdNow } from '../../core/time/zone';
import { DEG } from '../../core/units';
import { starIndices, useSkyModel } from '../../figures/sky/useSkyModel';
import { InteractiveQuestion } from '../../site/check/CheckYourself';
import { DEFAULT_LAYERS, type SkyLayers } from '../../viz/sky/draw';
import { SkyView } from '../../viz/sky/SkyView';
import { checkPolarisOnHorizon } from './chapter2Answers';
import styles from './checks.module.css';

const isLatitude = (value: unknown): value is number => typeof value === 'number' && Math.abs(value) <= 90;
const LAYERS: SkyLayers = { ...DEFAULT_LAYERS, milkyWay: false, starNames: false, constellationNames: false };
const CAMERA: SkyCamera = { az: 0, alt: 18 * DEG, fov: 80 * DEG };

export function PolarisOnTheHorizon() {
  return (
    <InteractiveQuestion
      id="polaris-on-the-horizon"
      prompt="Drag the latitude until Polaris, the North Star, sits on the northern horizon. Where on Earth are you?"
      initial={50}
      isState={isLatitude}
      check={(latitude) => checkPolarisOnHorizon(latitude)}
    >
      {(latitude, setLatitude) => <LatitudeSky latitude={latitude} onLatitude={setLatitude} />}
    </InteractiveQuestion>
  );
}

function LatitudeSky({ latitude, onLatitude }: { latitude: number; onLatitude: (lat: number) => void }) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState(CAMERA);
  const [jdTT] = useState(() => ttFromUt(jdNow()));
  const place = useMemo(() => ({ latitude: latitude * DEG, longitude: 0 }), [latitude]);
  const { data, model } = useSkyModel(box, { jdTT, place, mode: 'horizon', daylight: false, bodies: false });
  const featured = useMemo(() => starIndices(data, ['Polaris']), [data]);
  const words = `${Math.abs(latitude).toFixed(1)}° ${latitude >= 0 ? 'north' : 'south'}`;
  return (
    <div ref={box}>
      <div className={styles.guess}>
        <label htmlFor={id}>Latitude</label>
        <input id={id} type="range" min={-30} max={90} step={0.5} value={latitude} onChange={(e) => onLatitude(Number(e.target.value))} aria-valuetext={words} />
        <output htmlFor={id}>{words}</output>
      </div>
      <SkyView
        model={model}
        camera={camera}
        onCamera={setCamera}
        home={CAMERA}
        layers={LAYERS}
        featured={featured}
        selected={null}
        onSelect={() => {}}
        inViewButtons={false}
        aspect={0.45}
        minHeight={200}
        maxHeight={300}
        label={`The northern sky from latitude ${words}`}
      />
    </div>
  );
}
