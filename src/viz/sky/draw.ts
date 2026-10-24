import { clamp } from '../../core/math/angles';
import { apply, type Mat3, type Vec3 } from '../../core/math/vec3';
import { cameraBasis, horizonOnScreen, localDirection, projectionScale, type CameraBasis, type SkyCamera } from '../../core/sky/projection';
import { starColour, starDot } from '../../core/stars/photometry';
import type { StarCatalogue } from '../../core/stars/catalogue';
import { milkyWayAt } from '../../core/sky/charts';
import { refract, starLabel, starVector, type ModelBody, type SkyModel } from './model';

/**
 * Draws the sky view on a 2D canvas: the sky's colour, the Milky Way, grids,
 * constellations, stars, the Sun, the Moon and the planets, overlays from the
 * figure (trails, paths, markers), the ground, and labels that keep out of
 * each other's way. Returns what was drawn where, for picking with the mouse
 * and for describing the view in words.
 */

export interface SkyLayers {
  constellations: boolean;
  constellationNames: boolean;
  boundaries: boolean;
  starNames: boolean;
  milkyWay: boolean;
  /** Lines of altitude and azimuth, or of right ascension and declination. */
  grid: 'none' | 'altaz' | 'equatorial';
  /** The Sun's yearly path. */
  ecliptic: boolean;
  /** The celestial equator. */
  equator: boolean;
  /** The opaque ground below the horizon; off shows the stars below it, behind a tint. */
  ground: boolean;
  planets: boolean;
  /** The Moon (shown unless this is false). */
  moon?: boolean;
  /** The stars (shown unless this is false, for diagrams that need a plain sky). */
  stars?: boolean;
}

export const DEFAULT_LAYERS: SkyLayers = {
  constellations: true,
  constellationNames: true,
  boundaries: false,
  starNames: true,
  milkyWay: true,
  grid: 'none',
  ecliptic: false,
  equator: false,
  ground: true,
  planets: true,
};

/** Shapes a figure adds on top of the sky. Vectors are in the view's local frame. */
export type SkyOverlay =
  | { kind: 'path'; points: readonly Vec3[]; colour: string; width?: number; dash?: readonly number[]; closed?: boolean }
  | { kind: 'trails'; paths: readonly Float64Array[]; colours: readonly string[]; width?: number; alpha?: number }
  | { kind: 'marker'; at: Vec3; label?: string; colour: string; shape: 'ring' | 'cross' | 'dot'; size?: number }
  | { kind: 'text'; at: Vec3; text: string; colour: string; small?: boolean };

export interface SkyColours {
  /** The night sky. */
  sky: string;
  text: string;
  muted: string;
  sun: string;
}

/** Something drawn that the reader can pick. */
export interface PickTarget {
  id: string;
  name: string;
  x: number;
  y: number;
  r: number;
  /** Higher is more interesting: bodies, then bright named stars. */
  priority: number;
}

export interface DrawResult {
  targets: PickTarget[];
  /** Named things in view, most interesting first. */
  inView: { id: string; name: string }[];
  /** Constellations whose names are in view. */
  constellationsInView: string[];
}

interface DrawOptions {
  camera: SkyCamera;
  width: number;
  height: number;
  layers: SkyLayers;
  overlays: readonly SkyOverlay[];
  selected: string | null;
  /** Star indices that always get a label. */
  featured: readonly number[];
  colours: SkyColours;
  /** An offscreen canvas for the Milky Way's glow. */
  glow: HTMLCanvasElement | null;
}

export const PLANET_COLOURS: Record<string, string> = {
  mercury: '#cfc6b8',
  venus: '#fff3cf',
  mars: '#ff9f70',
  jupiter: '#f4ddb6',
  saturn: '#f2dc9c',
  uranus: '#a9e8ee',
  neptune: '#93acff',
  moon: '#ece9df',
};

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Views wider than this cut points more than ~120° from the centre, where the projection blows up. */
const DEPTH_CUTOFF = -0.5;

/** Star colours as CSS strings, worked out once per catalogue. */
const colourCache = new WeakMap<StarCatalogue, string[]>();
function starColours(cat: StarCatalogue): string[] {
  let colours = colourCache.get(cat);
  if (!colours) {
    colours = Array.from(cat.bv, (bv) => {
      const [r, g, b] = starColour(bv);
      return `rgb(${r},${g},${b})`;
    });
    colourCache.set(cat, colours);
  }
  return colours;
}

/** The sky's colour for a lightness from 0 (night) to 1 (day): night, through a deep twilight blue, to a daytime blue. */
export function skyColour(night: string, lightness: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const n = /^#[0-9a-f]{6}$/i.test(night) ? parse(night) : [7, 11, 22];
  const stops: [number, number[]][] = [
    [0, n],
    [0.25, [24, 36, 74]],
    [0.6, [52, 92, 152]],
    [1, [92, 142, 204]],
  ];
  let i = 1;
  while (i < stops.length - 1 && lightness > stops[i][0]) i++;
  const [t0, c0] = stops[i - 1];
  const [t1, c1] = stops[i];
  const t = clamp((lightness - t0) / (t1 - t0), 0, 1);
  const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Turns grid circles defined in some frame into points: a declination or latitude circle, or a meridian. */
function circlePoints(kind: 'parallel' | 'meridian', angle: number, steps: number): Vec3[] {
  const points: Vec3[] = [];
  for (let k = 0; k <= steps; k++) {
    if (kind === 'parallel') {
      const lon = (2 * Math.PI * k) / steps;
      points.push([Math.cos(angle) * Math.cos(lon), Math.cos(angle) * Math.sin(lon), Math.sin(angle)]);
    } else {
      const lat = -Math.PI / 2 + (Math.PI * k) / steps;
      points.push([Math.cos(lat) * Math.cos(angle), Math.cos(lat) * Math.sin(angle), Math.sin(lat)]);
    }
  }
  return points;
}

const DEG = Math.PI / 180;
const EQUATORIAL_GRID: Vec3[][] = [
  ...Array.from({ length: 17 }, (_, i) => circlePoints('parallel', (-80 + 10 * i) * DEG, 180)),
  ...Array.from({ length: 24 }, (_, i) => circlePoints('meridian', i * 15 * DEG, 90)),
];
const ALTAZ_GRID: Vec3[][] = [
  ...Array.from({ length: 8 }, (_, i) => circlePoints('parallel', (10 + 10 * i) * DEG, 180)),
  ...Array.from({ length: 12 }, (_, i) => circlePoints('meridian', i * 30 * DEG, 90)),
];
const GREAT_CIRCLE = circlePoints('parallel', 0, 360);

interface Projector {
  basis: CameraBasis;
  scale: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

function toScreen(p: Projector, v: Vec3): [number, number, number] {
  const { right, up, forward } = p.basis;
  const x = v[0] * right[0] + v[1] * right[1] + v[2] * right[2];
  const y = v[0] * up[0] + v[1] * up[1] + v[2] * up[2];
  const z = v[0] * forward[0] + v[1] * forward[1] + v[2] * forward[2];
  const k = (2 * p.scale) / (1 + Math.max(z, -0.999_999));
  return [p.cx + k * x, p.cy - k * y, z];
}

function onScreen(p: Projector, x: number, y: number, margin: number): boolean {
  return x > -margin && x < p.width + margin && y > -margin && y < p.height + margin;
}

/** Strokes a polyline on the sphere, splitting long steps so it curves properly and dropping parts behind the viewer. */
function strokeSphere(ctx: CanvasRenderingContext2D, p: Projector, points: readonly Vec3[], maxStep: number, closed = false) {
  const n = points.length;
  if (n < 2) return;
  let pen = false;
  const visit = (v: Vec3) => {
    const [x, y, depth] = toScreen(p, v);
    if (depth < DEPTH_CUTOFF || !onScreen(p, x, y, p.width)) {
      pen = false;
      return;
    }
    if (pen) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
    pen = true;
  };
  const count = closed ? n + 1 : n;
  visit(points[0]);
  for (let k = 1; k < count; k++) {
    const a = points[k - 1];
    const b = points[k % n];
    const cos = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const steps = Math.min(40, Math.ceil(Math.acos(Math.max(-1, Math.min(1, cos))) / maxStep));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const v: Vec3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      const len = Math.hypot(v[0], v[1], v[2]);
      visit([v[0] / len, v[1] / len, v[2] / len]);
    }
  }
}

function transformAll(m: Mat3, points: readonly Vec3[], refracted: boolean): Vec3[] {
  return points.map((v) => {
    const local = apply(m, v);
    return refracted && local[2] > -0.05 ? refract(local) : local;
  });
}

interface LabelRequest {
  text: string;
  x: number;
  y: number;
  priority: number;
  colour: string;
  font: string;
  /** Offset from the point. */
  dx: number;
  dy: number;
  align?: CanvasTextAlign;
}

export function drawSky(ctx: CanvasRenderingContext2D, model: SkyModel, o: DrawOptions): DrawResult {
  const { camera, width, height, layers, colours } = o;
  const p: Projector = {
    basis: cameraBasis(camera.az, camera.alt),
    scale: projectionScale(camera.fov, width),
    cx: width / 2,
    cy: height / 2,
    width,
    height,
  };
  const horizon = model.mode === 'horizon';
  const night = 1 - model.lightness;
  const linesAlpha = clamp(1 - model.lightness * 0.85, 0.15, 1);
  const labels: LabelRequest[] = [];
  const targets: PickTarget[] = [];
  const constellationsInView: string[] = [];
  const maxStep = Math.max(0.5 * DEG, camera.fov / 50);
  const cat = model.data.stars;
  const zoom = clamp((1.6 / camera.fov) ** 0.3, 0.85, 1.7);

  // ---------- the sky ----------
  ctx.fillStyle = skyColour(colours.sky, model.lightness);
  ctx.fillRect(0, 0, width, height);

  // ---------- the Milky Way: its brightness map, looked up for each pixel of a small canvas, then scaled up ----------
  if (layers.milkyWay && o.glow && night > 0.05) {
    const factor = 6;
    const gw = Math.max(1, Math.ceil(width / factor));
    const gh = Math.max(1, Math.ceil(height / factor));
    if (o.glow.width !== gw || o.glow.height !== gh) {
      o.glow.width = gw;
      o.glow.height = gh;
    }
    const g = o.glow.getContext('2d');
    if (g) {
      const image = g.createImageData(gw, gh);
      const pixels = image.data;
      const M = model.frames.fromJ2000;
      const { right, up, forward } = p.basis;
      const mw = model.data.milkyWay;
      for (let py = 0; py < gh; py++) {
        const Y = (p.cy - (py + 0.5) * factor) / p.scale;
        for (let px = 0; px < gw; px++) {
          const X = ((px + 0.5) * factor - p.cx) / p.scale;
          const rho2 = X * X + Y * Y;
          if (rho2 > 16) continue; // more than 127° from the centre of the view
          const d = 4 + rho2;
          const a = (4 * X) / d;
          const b = (4 * Y) / d;
          const c = (4 - rho2) / d;
          // The local direction, then back to J2000 with the transpose of the frame matrix.
          const lx = a * right[0] + b * up[0] + c * forward[0];
          const ly = a * right[1] + b * up[1] + c * forward[1];
          const lz = a * right[2] + b * up[2] + c * forward[2];
          const value = milkyWayAt(mw, M[0][0] * lx + M[1][0] * ly + M[2][0] * lz, M[0][1] * lx + M[1][1] * ly + M[2][1] * lz, M[0][2] * lx + M[1][2] * ly + M[2][2] * lz);
          if (value <= 0) continue;
          const k = 4 * (py * gw + px);
          pixels[k] = 176;
          pixels[k + 1] = 196;
          pixels[k + 2] = 255;
          pixels[k + 3] = Math.round(value * 6);
        }
      }
      g.putImageData(image, 0, 0);
      ctx.save();
      ctx.globalAlpha = night;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(o.glow, 0, 0, gw * factor, gh * factor);
      ctx.restore();
    }
  }

  // ---------- grids and great circles ----------
  ctx.lineWidth = 1;
  if (layers.grid === 'equatorial') {
    ctx.strokeStyle = `rgba(110, 150, 220, ${0.35 * linesAlpha})`;
    ctx.beginPath();
    for (const line of EQUATORIAL_GRID) strokeSphere(ctx, p, transformAll(model.frames.fromEquatorOfDate, line, horizon), maxStep);
    ctx.stroke();
  } else if (layers.grid === 'altaz' && horizon) {
    ctx.strokeStyle = `rgba(120, 190, 150, ${0.35 * linesAlpha})`;
    ctx.beginPath();
    for (const line of ALTAZ_GRID) strokeSphere(ctx, p, line, maxStep);
    ctx.stroke();
  }
  if (layers.equator) {
    ctx.strokeStyle = `rgba(90, 210, 210, ${0.75 * linesAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    strokeSphere(ctx, p, transformAll(model.frames.fromEquatorOfDate, GREAT_CIRCLE, horizon), maxStep, true);
    ctx.stroke();
    labelAlongCircle(p, transformAll(model.frames.fromEquatorOfDate, GREAT_CIRCLE, horizon), 'celestial equator', 'rgb(110, 220, 220)', labels);
  }
  if (layers.ecliptic) {
    ctx.strokeStyle = `rgba(240, 186, 90, ${0.8 * linesAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    const ecliptic = transformAll(model.frames.fromEclipticOfDate, GREAT_CIRCLE, horizon);
    strokeSphere(ctx, p, ecliptic, maxStep, true);
    ctx.stroke();
    ctx.setLineDash([]);
    labelAlongCircle(p, ecliptic, 'ecliptic', 'rgb(245, 196, 110)', labels);
  }

  // ---------- constellations ----------
  if (layers.boundaries) {
    ctx.strokeStyle = `rgba(160, 150, 210, ${0.35 * linesAlpha})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    for (const c of model.data.constellations) {
      for (const ring of c.boundaries) strokeSphere(ctx, p, transformAll(model.frames.fromJ2000, ring, horizon), maxStep, true);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (layers.constellations || layers.constellationNames) {
    ctx.strokeStyle = `rgba(118, 160, 235, ${0.55 * linesAlpha})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (const c of model.data.constellations) {
      if (layers.constellations) {
        for (const stroke of c.strokes) {
          const points = stroke.map((pt) =>
            'star' in pt ? starVector(model, pt.star) : transformAll(model.frames.fromJ2000, [pt.fixed], horizon)[0],
          );
          strokeSphere(ctx, p, points, maxStep);
        }
      }
      if (layers.constellationNames) {
        const at = transformAll(model.frames.fromJ2000, [c.label], horizon)[0];
        const [x, y, depth] = toScreen(p, at);
        const showRank = camera.fov > 2.2 ? 1 : camera.fov > 1.2 ? 2 : 3;
        if (depth > 0 && onScreen(p, x, y, -10) && (!horizon || at[2] > -0.02)) {
          constellationsInView.push(c.name);
          if (c.rank <= showRank) {
            labels.push({
              text: c.name.toUpperCase(),
              x,
              y,
              priority: 10 - c.rank,
              colour: `rgba(150, 178, 235, ${0.85 * linesAlpha})`,
              font: '600 10.5px var(--font-sans, system-ui), system-ui, sans-serif',
              dx: 0,
              dy: 0,
              align: 'center',
            });
          }
        }
      }
    }
    ctx.stroke();
  }

  // ---------- stars ----------
  const starColoursList = starColours(cat);
  const limit = model.limit;
  const nameLimit = camera.fov > 2.4 ? 1.3 : camera.fov > 1.3 ? 2.1 : camera.fov > 0.6 ? 3.2 : 4.5;
  const featured = new Set(o.featured);
  const selectedStar = o.selected?.startsWith('star:') ? Number(o.selected.slice(5)) : -1;
  for (let i = layers.stars === false ? -1 : cat.count - 1; i >= 0; i--) {
    const mag = model.starMag[i];
    if (mag > limit && !featured.has(i)) continue;
    const v = starVector(model, i);
    const [x, y, depth] = toScreen(p, v);
    if (depth < DEPTH_CUTOFF || !onScreen(p, x, y, 8)) continue;
    const dot = starDot(Math.min(mag, limit), limit, zoom);
    if (dot.radius <= 0) continue;
    const r = dot.radius;
    ctx.globalAlpha = dot.alpha;
    ctx.fillStyle = starColoursList[i];
    if (r < 1.1) {
      ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
      if (mag < 1.2) {
        ctx.globalAlpha = 0.18 * dot.alpha;
        ctx.beginPath();
        ctx.arc(x, y, r * 2.4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    const name = cat.names.get(i);
    if (mag < 5 || featured.has(i)) {
      targets.push({ id: `star:${i}`, name: starLabel(cat, i), x, y, r: Math.max(r, 3), priority: name ? 50 - mag : 20 - mag });
    }
    const hidden = horizon && layers.ground && v[2] < 0; // under the ground
    if (!hidden && ((layers.starNames && name && mag < nameLimit) || featured.has(i) || i === selectedStar)) {
      labels.push({
        text: starLabel(cat, i),
        x,
        y,
        priority: featured.has(i) || i === selectedStar ? 90 : 40 - mag,
        colour: featured.has(i) || i === selectedStar ? colours.text : colours.muted,
        font: '11.5px var(--font-sans, system-ui), system-ui, sans-serif',
        dx: r + 4,
        dy: 4,
      });
    }
  }
  ctx.globalAlpha = 1;

  // ---------- the Sun, the Moon and the planets ----------
  const bodies = model.bodies.filter((b) => b.name === 'sun' || (b.name === 'moon' ? layers.moon !== false : layers.planets));
  // Farthest first, so the Moon covers what it passes in front of.
  for (const body of [...bodies].sort((a, b) => b.distance - a.distance)) {
    const [x, y, depth] = toScreen(p, body.local);
    if (depth < DEPTH_CUTOFF || !onScreen(p, x, y, 60)) continue;
    const discRadius = (body.angularRadius * 2 * p.scale) / (1 + depth);
    let r: number;
    if (body.name === 'sun') {
      r = Math.max(discRadius, 6);
      drawSun(ctx, x, y, r, colours.sun);
    } else if (body.name === 'moon') {
      r = Math.max(discRadius, 6);
      drawMoon(ctx, p, body, x, y, r);
    } else {
      const dot = starDot(Math.min(body.magnitude, 6.5), 6.5, zoom);
      if (body.magnitude > limit + 0.5 && model.lightness > 0.3) continue;
      r = Math.max(dot.radius, discRadius, 2);
      ctx.fillStyle = PLANET_COLOURS[body.name] ?? '#fff';
      ctx.globalAlpha = Math.max(0.6, dot.alpha);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    targets.push({ id: `body:${body.name}`, name: body.label, x, y, r: Math.max(r, 5), priority: 100 - body.magnitude / 10 });
    if (horizon && layers.ground && body.local[2] < 0) continue; // under the ground: no label
    labels.push({
      text: body.label,
      x,
      y,
      priority: o.selected === `body:${body.name}` ? 99 : 80,
      colour: body.name === 'sun' ? colours.sun : (PLANET_COLOURS[body.name] ?? colours.text),
      font: '600 12px var(--font-sans, system-ui), system-ui, sans-serif',
      dx: r + 5,
      dy: -r - 2,
    });
  }

  // ---------- the figure's overlays ----------
  for (const overlay of o.overlays) drawOverlay(ctx, p, overlay, labels, maxStep);

  // ---------- the ground ----------
  if (horizon) drawGround(ctx, p, camera, layers.ground, model.lightness, labels);

  // ---------- selection ----------
  const chosen = targets.find((t) => t.id === o.selected);
  if (chosen) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(chosen.x, chosen.y, chosen.r + 5, 0, 2 * Math.PI);
    ctx.stroke();
  }

  placeLabels(ctx, labels, width, height, skyColour(colours.sky, model.lightness));

  // What's in view, for screen readers and the "In view" buttons: above the horizon only.
  const inView = targets
    .filter((t) => onScreen(p, t.x, t.y, -4) && (!horizon || !belowHorizon(model, t.id)))
    .filter((t) => t.id.startsWith('body:') || cat.names.has(Number(t.id.slice(5))))
    .sort((a, b) => b.priority - a.priority)
    .map((t) => ({ id: t.id, name: t.name }));
  return { targets: horizon ? targets.filter((t) => !belowHorizon(model, t.id) || !layers.ground) : targets, inView, constellationsInView };
}

function belowHorizon(model: SkyModel, id: string): boolean {
  if (id.startsWith('star:')) return model.starLocal[3 * Number(id.slice(5)) + 2] < 0;
  const body = model.bodies.find((b) => `body:${b.name}` === id);
  return !!body && body.local[2] < 0;
}

function labelAlongCircle(p: Projector, points: readonly Vec3[], text: string, colour: string, labels: LabelRequest[]) {
  // Label the circle where it passes closest to a point right of the middle of the view.
  let best: [number, number] | null = null;
  let bestD = Infinity;
  for (const v of points) {
    const [x, y, depth] = toScreen(p, v);
    if (depth < 0 || !onScreen(p, x, y, -30)) continue;
    const d = Math.hypot(x - p.cx * 1.3, y - p.cy);
    if (d < bestD) {
      bestD = d;
      best = [x, y];
    }
  }
  if (best) labels.push({ text, x: best[0], y: best[1], priority: 30, colour, font: 'italic 11px var(--font-sans, system-ui), system-ui, sans-serif', dx: 4, dy: -5 });
}

function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string) {
  const glow = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 5);
  glow.addColorStop(0, 'rgba(255, 236, 170, 0.45)');
  glow.addColorStop(1, 'rgba(255, 236, 170, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

/** The Moon, lit on the side facing the Sun: a dark disc, then the lit part bounded by the terminator's half-ellipse. */
function drawMoon(ctx: CanvasRenderingContext2D, p: Projector, moon: ModelBody, x: number, y: number, r: number) {
  // Which way on screen is the Sun from the Moon? Step a little along the great circle towards it.
  const m = moon.local;
  const s = moon.sunLocal;
  const d = s[0] * m[0] + s[1] * m[1] + s[2] * m[2];
  const t: Vec3 = [s[0] - d * m[0], s[1] - d * m[1], s[2] - d * m[2]];
  const tl = Math.hypot(t[0], t[1], t[2]) || 1;
  const step = 0.01;
  const ahead: Vec3 = [m[0] + (step * t[0]) / tl, m[1] + (step * t[1]) / tl, m[2] + (step * t[2]) / tl];
  const [ax, ay] = toScreen(p, ahead);
  const angle = Math.atan2(ay - y, ax - x);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(52, 56, 70, 0.95)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 2 * Math.PI);
  ctx.fill();
  const cosI = Math.cos(moon.phaseAngle);
  const rx = Math.max(0.001, r * Math.abs(cosI));
  ctx.fillStyle = PLANET_COLOURS.moon;
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
  // Gibbous (more than half lit): the terminator bulges away from the Sun; crescent: towards it.
  if (cosI >= 0) ctx.ellipse(0, 0, rx, r, 0, Math.PI / 2, (3 * Math.PI) / 2, false);
  else ctx.ellipse(0, 0, rx, r, 0, Math.PI / 2, -Math.PI / 2, true);
  ctx.fill();
  ctx.restore();
}

function drawOverlay(ctx: CanvasRenderingContext2D, p: Projector, overlay: SkyOverlay, labels: LabelRequest[], maxStep: number) {
  switch (overlay.kind) {
    case 'path': {
      ctx.strokeStyle = overlay.colour;
      ctx.lineWidth = overlay.width ?? 1.5;
      ctx.setLineDash(overlay.dash ? [...overlay.dash] : []);
      ctx.beginPath();
      strokeSphere(ctx, p, overlay.points, maxStep, overlay.closed);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'trails': {
      ctx.lineWidth = overlay.width ?? 1.2;
      ctx.lineCap = 'round';
      ctx.globalAlpha = overlay.alpha ?? 0.85;
      overlay.paths.forEach((path, i) => {
        if (path.length < 6) return;
        ctx.strokeStyle = overlay.colours[i] ?? '#fff';
        ctx.beginPath();
        let pen = false;
        for (let k = 0; k < path.length; k += 3) {
          const [x, y, depth] = toScreen(p, [path[k], path[k + 1], path[k + 2]]);
          if (depth < DEPTH_CUTOFF || !onScreen(p, x, y, p.width)) {
            pen = false;
            continue;
          }
          if (pen) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
          pen = true;
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
      break;
    }
    case 'marker': {
      const [x, y, depth] = toScreen(p, overlay.at);
      if (depth < DEPTH_CUTOFF || !onScreen(p, x, y, 20)) return;
      const size = overlay.size ?? 7;
      ctx.strokeStyle = overlay.colour;
      ctx.fillStyle = overlay.colour;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      if (overlay.shape === 'ring') ctx.arc(x, y, size, 0, 2 * Math.PI);
      if (overlay.shape === 'cross') {
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size, y);
        ctx.moveTo(x, y - size);
        ctx.lineTo(x, y + size);
      }
      if (overlay.shape === 'dot') {
        ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.stroke();
      if (overlay.label) {
        labels.push({ text: overlay.label, x, y, priority: 95, colour: overlay.colour, font: '600 12px var(--font-sans, system-ui), system-ui, sans-serif', dx: size + 4, dy: size + 10 });
      }
      break;
    }
    case 'text': {
      const [x, y, depth] = toScreen(p, overlay.at);
      if (depth < DEPTH_CUTOFF || !onScreen(p, x, y, 0)) return;
      labels.push({
        text: overlay.text,
        x,
        y,
        priority: 60,
        colour: overlay.colour,
        font: `${overlay.small ? '10.5px' : '600 11.5px'} var(--font-sans, system-ui), system-ui, sans-serif`,
        dx: 4,
        dy: -4,
      });
      break;
    }
  }
}

/** The ground below the horizon (or a tint, when it's see-through), the horizon line and the compass points. */
function drawGround(ctx: CanvasRenderingContext2D, p: Projector, camera: SkyCamera, opaque: boolean, lightness: number, labels: LabelRequest[]) {
  const shape = horizonOnScreen(camera.alt);
  const ground = opaque
    ? `rgba(${Math.round(14 + 40 * lightness)}, ${Math.round(20 + 46 * lightness)}, ${Math.round(16 + 26 * lightness)}, 0.96)`
    : 'rgba(30, 44, 30, 0.35)';
  ctx.save();
  ctx.beginPath();
  if (shape.kind === 'line') {
    ctx.rect(0, p.cy, p.width, p.height - p.cy);
  } else {
    const cy = p.cy - shape.centreY * p.scale;
    const r = shape.radius * p.scale;
    if (shape.groundInside) {
      ctx.arc(p.cx, cy, r, 0, 2 * Math.PI);
    } else {
      ctx.rect(-10, -10, p.width + 20, p.height + 20);
      ctx.moveTo(p.cx + r, cy);
      ctx.arc(p.cx, cy, r, 0, 2 * Math.PI, true);
    }
  }
  ctx.fillStyle = ground;
  ctx.fill('evenodd');
  ctx.restore();

  // The horizon line.
  ctx.strokeStyle = 'rgba(140, 190, 140, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  strokeSphere(ctx, p, GREAT_CIRCLE, Math.max(0.5 * DEG, camera.fov / 60), true);
  ctx.stroke();

  // Compass points, just below the horizon.
  COMPASS.forEach((name, k) => {
    const [x, y, depth] = toScreen(p, localDirection((k * Math.PI) / 4, 0));
    if (depth < 0 || !onScreen(p, x, y, -6)) return;
    labels.push({
      text: name,
      x,
      y,
      priority: 100,
      colour: k % 2 === 0 ? '#c8f0c8' : 'rgba(170, 210, 170, 0.85)',
      font: `${k % 2 === 0 ? '700 13px' : '600 11px'} var(--font-sans, system-ui), system-ui, sans-serif`,
      dx: 0,
      dy: 16,
      align: 'center',
    });
  });
}

/** Draws labels, most important first, skipping any that would overlap one already placed. */
function placeLabels(ctx: CanvasRenderingContext2D, labels: LabelRequest[], width: number, height: number, halo: string) {
  const placed: [number, number, number, number][] = [];
  labels.sort((a, b) => b.priority - a.priority);
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  for (const l of labels) {
    ctx.font = l.font;
    const w = ctx.measureText(l.text).width;
    const align = l.align ?? 'left';
    let x = l.x + l.dx;
    const y = l.y + l.dy;
    if (align === 'center') x -= w / 2;
    if (x + w > width - 2 && align === 'left') x = l.x - l.dx - w; // flip to the left near the right edge
    const box: [number, number, number, number] = [x - 2, y - 11, x + w + 2, y + 3];
    if (box[0] < 0 || box[2] > width || box[1] < 0 || box[3] > height) continue;
    if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
    placed.push(box);
    ctx.textAlign = 'left';
    ctx.strokeStyle = halo;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.85;
    ctx.strokeText(l.text, x, y);
    ctx.globalAlpha = 1;
    ctx.fillStyle = l.colour;
    ctx.fillText(l.text, x, y);
  }
}
