import { AU } from '../../core/constants';
import { eclipticFromEquatorial, meanObliquity } from '../../core/coords/transforms';
import { meanLongitude, MEAN_ORBITS, PLANETS } from '../../core/ephemeris/meanLongitude';
import { voyagerDirection, voyagerSunDistanceAu } from '../../core/scale/catalogue';
import { fromSpherical, type Vec3 } from '../../core/math/vec3';
import { J2000 } from '../../core/time/julian';
import { DEG, HOUR_ANGLE, LIGHT_YEAR, lightTravelTime } from '../../core/units';
import { BODY_NAMES, DIAMETERS_KM, STARS } from '../../data/scale';

/** One place light passes on its way out from the Sun (Figure 1.3). Positions in AU, in the ecliptic frame. */
export interface RaceStop {
  id: string;
  name: string;
  distanceAu: number;
  /** Seconds after leaving the Sun. */
  arrival: number;
  position: Vec3;
  /** True radius, AU (0 for a spacecraft). */
  radiusAu: number;
  kind: 'planet' | 'craft' | 'star';
}

/** The stops, nearest first, for a date (Julian Date, TT): the planets at their average distances and today's average positions, Voyager 1 and Proxima Centauri. */
export function raceStops(jdTT: number): RaceStop[] {
  const stops: RaceStop[] = PLANETS.map((planet) => {
    const a = MEAN_ORBITS[planet].a;
    return {
      id: planet,
      name: BODY_NAMES[planet],
      distanceAu: a,
      arrival: lightTravelTime(a * AU),
      position: fromSpherical(meanLongitude(planet, jdTT), 0, a),
      radiusAu: (DIAMETERS_KM[planet] * 500) / AU,
      kind: 'planet',
    };
  });

  const voyagerAu = voyagerSunDistanceAu(jdTT);
  const v = voyagerDirection();
  stops.push({
    id: 'voyager-1',
    name: 'Voyager 1',
    distanceAu: voyagerAu,
    arrival: lightTravelTime(voyagerAu * AU),
    position: fromSpherical(v.lon, v.lat, voyagerAu),
    radiusAu: 0,
    kind: 'craft',
  });

  const proxima = STARS.find((s) => s.id === 'proxima')!;
  const p = eclipticFromEquatorial({ ra: proxima.raHours * HOUR_ANGLE, dec: proxima.decDegrees * DEG }, meanObliquity(J2000));
  const proximaAu = (proxima.distanceLy * LIGHT_YEAR) / AU;
  stops.push({
    id: 'proxima',
    name: proxima.name,
    distanceAu: proximaAu,
    arrival: lightTravelTime(proximaAu * AU),
    position: fromSpherical(p.lon, p.lat, proximaAu),
    radiusAu: (proxima.radiusSun! * DIAMETERS_KM.sun * 500) / AU,
    kind: 'star',
  });
  return stops;
}

/** The Sun's radius, AU. */
export const SUN_RADIUS_AU = (DIAMETERS_KM.sun * 500) / AU;
