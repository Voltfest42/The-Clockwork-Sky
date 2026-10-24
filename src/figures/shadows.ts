/**
 * Shadow cones in a flat side view: the umbra and penumbra behind a round
 * body lit by a bigger round light, from the lines that touch both circles.
 * Plain 2D geometry, in the figure's drawing units.
 */

export interface Circle {
  x: number;
  y: number;
  r: number;
}

type Point = { x: number; y: number };

/** The two points where lines from an outside point P touch a circle. */
function tangentPoints(p: Point, c: Circle): [Point, Point] {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const d = Math.hypot(dx, dy);
  const phi = Math.atan2(dy, dx);
  const beta = Math.acos(Math.min(1, c.r / d));
  return [
    { x: c.x + c.r * Math.cos(phi + beta), y: c.y + c.r * Math.sin(phi + beta) },
    { x: c.x + c.r * Math.cos(phi - beta), y: c.y + c.r * Math.sin(phi - beta) },
  ];
}

const far = (from: Point, through: Point, length: number): Point => {
  const dx = through.x - from.x;
  const dy = through.y - from.y;
  const d = Math.hypot(dx, dy);
  return { x: through.x + (dx / d) * length, y: through.y + (dy / d) * length };
};

export interface Shadow {
  /** The umbra, from the body to the cone's tip (where it ends, if within reach). */
  umbra: Point[];
  /** Beyond the tip: the antumbra, where the body looks smaller than the light. */
  antumbra: Point[];
  /** The penumbra, which contains both. */
  penumbra: Point[];
  /** The tip of the umbra. */
  apex: Point;
}

/** The shadow a body casts away from a larger light, out to `reach` drawing units beyond the body. */
export function shadowOf(light: Circle, body: Circle, reach: number): Shadow {
  // The external tangents meet at the tip of the umbra; the internal ones cross between the two circles.
  const apex = { x: (body.x * light.r - light.x * body.r) / (light.r - body.r), y: (body.y * light.r - light.y * body.r) / (light.r - body.r) };
  const inner = { x: (body.x * light.r + light.x * body.r) / (light.r + body.r), y: (body.y * light.r + light.y * body.r) / (light.r + body.r) };
  const [u1, u2] = tangentPoints(apex, body);
  const [p1, p2] = tangentPoints(inner, body);
  return {
    umbra: [u1, apex, u2],
    antumbra: [apex, far(u1, apex, reach), far(u2, apex, reach)],
    penumbra: [p1, far(inner, p1, reach), far(inner, p2, reach), p2],
    apex,
  };
}

/** How a light looks from a point, part hidden by a body: the angular radii of the two discs and how far apart their centres are. Radians. */
export function viewFrom(point: Point, light: Circle, body: Circle) {
  const a = Math.atan2(light.y - point.y, light.x - point.x);
  const b = Math.atan2(body.y - point.y, body.x - point.x);
  let separation = Math.abs(a - b);
  if (separation > Math.PI) separation = 2 * Math.PI - separation;
  return {
    light: Math.asin(Math.min(1, light.r / Math.hypot(light.x - point.x, light.y - point.y))),
    body: Math.asin(Math.min(1, body.r / Math.hypot(body.x - point.x, body.y - point.y))),
    separation,
  };
}

export type SolarView = 'total' | 'annular' | 'partial' | 'none';

/** What an observer sees of the light: all hidden, a ring, part hidden, or none. */
export function solarView(v: ReturnType<typeof viewFrom>): SolarView {
  if (v.separation >= v.light + v.body) return 'none';
  if (v.separation <= v.body - v.light) return 'total';
  if (v.separation <= v.light - v.body) return 'annular';
  return 'partial';
}

export type LunarView = 'total' | 'partial' | 'penumbral' | 'none';

/** How deep the Moon is in Earth's shadow, from the shadow's two radii at the Moon and the Moon's offset from its axis. */
export function lunarView(umbra: number, penumbra: number, moon: number, offset: number): LunarView {
  const d = Math.abs(offset);
  if (d + moon <= umbra) return 'total';
  if (d - moon < umbra) return 'partial';
  if (d - moon < penumbra) return 'penumbral';
  return 'none';
}

/**
 * The figure's drawings, in drawing units. Nothing is to scale, but the solar
 * one is sized so that the Moon's umbra just reaches the marked place on
 * Earth when the Moon is about 379,700 km from Earth's centre, the true limit
 * for a total eclipse seen under the Moon (where the Moon looks as big as the
 * Sun, 32′ across).
 */
export const DIAGRAM = {
  width: 640,
  height: 250,
  /** Drawing units per 1,000 km of the Moon's distance. */
  perThousandKm: 0.5,
  solar: { sun: { x: 50, y: 125, r: 40 }, earth: { x: 590, y: 125, r: 40 }, moonR: 12, maxOffset: 34 },
  lunar: { sun: { x: 40, y: 125, r: 48 }, earth: { x: 400, y: 125, r: 40 }, moonX: 550, moonR: 13.5, maxOffset: 92 },
};

/** A solar eclipse drawn side on: the Moon `distance` thousand km from Earth's centre and `offset` (−1 to 1) above or below the line. */
export function solarDiagram(distance: number, offset: number) {
  const { sun, earth, moonR, maxOffset } = DIAGRAM.solar;
  const moon: Circle = { x: earth.x - distance * DIAGRAM.perThousandKm, y: earth.y - offset * maxOffset, r: moonR };
  const observer = { x: earth.x - earth.r, y: earth.y };
  const view = viewFrom(observer, sun, moon);
  return { sun, earth, moon, observer, shadow: shadowOf(sun, moon, 400), view, seen: solarView(view) };
}

/** A lunar eclipse drawn side on, with the Moon `offset` (−1 to 1) above or below the axis of Earth's shadow. */
export function lunarDiagram(offset: number) {
  const { sun, earth, moonX, moonR, maxOffset } = DIAGRAM.lunar;
  const moonOffset = offset * maxOffset;
  const moon: Circle = { x: moonX, y: earth.y - moonOffset, r: moonR };
  const s = moonX - earth.x;
  const d = earth.x - sun.x;
  // The shadow's radii at the Moon's distance, by similar triangles.
  const umbra = earth.r - (s * (sun.r - earth.r)) / d;
  const penumbra = earth.r + (s * (sun.r + earth.r)) / d;
  return { sun, earth, moon, moonOffset, umbra, penumbra, shadow: shadowOf(sun, earth, 260), seen: lunarView(umbra, penumbra, moonR, moonOffset) };
}
