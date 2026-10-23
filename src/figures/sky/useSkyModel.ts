import { useMemo, type RefObject } from 'react';
import { findStarByName } from '../../core/stars/catalogue';
import type { Place } from '../../core/sky/frames';
import { useOnScreen } from '../../viz/hooks';
import { useSkyData, type SkyData } from '../../data/sky';
import { buildSkyModel, type SkyMode, type SkyModel } from '../../viz/sky/model';

/**
 * The sky data, loaded once the figure comes near the screen, and the model
 * for a moment. The model is rebuilt only when its inputs change.
 */
export function useSkyModel(ref: RefObject<Element | null>, options: { jdTT: number; place?: Place; mode: SkyMode; daylight?: boolean; bodies?: boolean }) {
  // Once loaded, the data stays, even if the figure scrolls away.
  const near = useOnScreen(ref, '600px');
  const { data, failed } = useSkyData(near);
  const { jdTT, mode, daylight, bodies } = options;
  const lat = options.place?.latitude;
  const lon = options.place?.longitude;
  const model = useMemo<SkyModel | null>(
    () =>
      data
        ? buildSkyModel(data, { jdTT, mode, daylight, bodies, place: lat === undefined || lon === undefined ? undefined : { latitude: lat, longitude: lon } })
        : null,
    [data, jdTT, mode, daylight, bodies, lat, lon],
  );
  return { data, model, failed };
}

/** Catalogue indices of named stars (−1 where a name isn't found). */
export function starIndices(data: SkyData | null, names: readonly string[]): number[] {
  if (!data) return [];
  return names.map((n) => findStarByName(data.stars, n)).filter((i) => i >= 0);
}
