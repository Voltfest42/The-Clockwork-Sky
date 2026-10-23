import { useEffect, useState } from 'react';
import { parseConstellations, parseMilkyWay, type Constellation, type MilkyWay, type RawConstellationFile, type RawMilkyWayFile } from '../core/sky/charts';
import { parseStarCatalogue, type RawStarFile, type StarCatalogue } from '../core/stars/catalogue';

/**
 * The sky view's data: about 8,900 stars, the constellations and the Milky
 * Way. They load on demand (about 210 kB compressed, in their own chunks) when
 * the first sky figure comes near the screen, and once only.
 */

export interface SkyData {
  stars: StarCatalogue;
  constellations: Constellation[];
  milkyWay: MilkyWay;
}

let pending: Promise<SkyData> | null = null;

export function loadSkyData(): Promise<SkyData> {
  pending ??= Promise.all([import('./hyg/stars.json'), import('./constellations.json'), import('./milkyway.json')]).then(
    ([stars, constellations, milkyWay]) => ({
      stars: parseStarCatalogue(stars.default as unknown as RawStarFile),
      constellations: parseConstellations(constellations.default as unknown as RawConstellationFile),
      milkyWay: parseMilkyWay(milkyWay.default as RawMilkyWayFile),
    }),
  );
  return pending;
}

/** The sky data, or null while it loads; `start` false waits (until the figure is near the screen). */
export function useSkyData(start = true): { data: SkyData | null; failed: boolean } {
  const [data, setData] = useState<SkyData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!start) return;
    let live = true;
    loadSkyData()
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [start]);
  return { data, failed };
}
