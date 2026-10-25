import type { RefObject } from 'react';
import { Scene3D } from '../../viz/scene3d/Scene3D';
import { orreryScene } from './scene';
import type { ViewModel } from './TopView';

/** The Orrery's 3D view: Scene3D with the Orrery's scene, looking down at the system from 35° above its plane. */
export default function Scene3DView({
  model,
  version,
  unit,
  ring,
  onPick,
  cameraReset,
  description,
  running,
}: {
  model: RefObject<ViewModel>;
  version: number;
  unit: number;
  ring: number;
  onPick: (id: string | null) => void;
  cameraReset: number;
  description: string;
  running: boolean;
}) {
  return (
    <Scene3D
      label="The Orrery in 3D"
      description={description}
      factory={orreryScene}
      state={{ model: model.current, version, unit, ring, onPick }}
      running={running}
      camera={{ target: [0, 0, 0], azimuth: -Math.PI / 2, elevation: 0.6, distance: 3.2 }}
      limits={{ minDistance: 1e-4, maxDistance: 400 }}
      cameraReset={cameraReset}
      height="clamp(320px, 62vw, 560px)"
    />
  );
}
