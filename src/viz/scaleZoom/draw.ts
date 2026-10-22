import { Random } from '../../core/random';
import type { ZoomObject } from '../../core/scale/catalogue';
import { PositionTree } from '../../core/scale/tree';
import { cameraCentre, fadeWindow, offsetFromCentre, pixelsPerMetre, scaleBar, smoothstep, type CameraStop } from '../../core/scale/zoom';
import { LIGHT_YEAR } from '../../core/units';

/**
 * Drawing the scale zoom on a 2D canvas. Everything is drawn at its true size;
 * anything smaller than a couple of pixels gets a dot so it can be found. The
 * night sky stays dark in both themes.
 */

export interface ZoomColours {
  sky: string;
  text: string;
  muted: string;
  grid: string;
  sun: string;
  highlight: string;
}

/** Where something was drawn, for clicking on it. */
export interface Drawn {
  id: string;
  x: number;
  y: number;
  /** Radius on screen, px. */
  r: number;
  /** For rings: the inner radius on screen, px. */
  inner?: number;
  kind: ZoomObject['kind'];
}

export interface ZoomScene {
  objects: readonly ZoomObject[];
  tree: PositionTree;
  camera: readonly CameraStop[];
  /** Precomputed dust for the Milky Way sketch, in the Galaxy's frame (m). */
  galaxyDust: Float64Array;
}

const BODY_COLOURS: Record<string, string> = {
  mercury: '#b9b2a8',
  venus: '#e8d3a2',
  earth: '#4f8fe0',
  moon: '#c9c9c9',
  mars: '#d9734e',
  jupiter: '#d8b48a',
  saturn: '#e6d08f',
  uranus: '#9fe0e6',
  neptune: '#6b8ef0',
};

const STAR_COLOURS: Record<string, string> = {
  proxima: '#ff8a65',
  'alpha-cen': '#ffe9a8',
  barnard: '#ff8a65',
  sirius: '#d6e4ff',
  vega: '#e3ebff',
  betelgeuse: '#ff9e5e',
  pleiades: '#a9c4ff',
  'orion-nebula': '#f3a6c8',
};

/** The smallest dot drawn for something too small to see, px. */
const DOT = 2.5;

export function makeZoomScene(objects: readonly ZoomObject[], camera: readonly CameraStop[]): ZoomScene {
  return { objects, tree: new PositionTree(objects), camera, galaxyDust: galaxyDust(1) };
}

/**
 * A sketch of the Milky Way: a central bar and four trailing spiral arms
 * (logarithmic spirals with a 12° pitch), with the Sun between two of them, in
 * a short spur. Seeded, so it's the same every time. Returns x, y pairs in
 * metres in the Galaxy's frame, centred on the centre, with the Sun on the
 * negative x axis.
 */
function galaxyDust(seed: number): Float64Array {
  const random = new Random(seed);
  const points: number[] = [];
  const k = Math.tan((12 * Math.PI) / 180);
  const sunR = 26_700;
  // Put the Sun midway between two arms: an arm passes radius r at angle θ when r = r0·e^(kθ).
  const phase0 = Math.PI - Math.log(sunR / 18_000) / k + Math.PI / 4;
  for (let arm = 0; arm < 4; arm++) {
    const phase = phase0 + (arm * Math.PI) / 2;
    for (let i = 0; i < 2_200; i++) {
      const r = 10_000 + 40_000 * Math.pow(random.next(), 0.8);
      const theta = phase + Math.log(r / 18_000) / k;
      const spread = 450 + 0.03 * r;
      const along = theta;
      const x = r * Math.cos(along) + random.normal() * spread;
      const y = r * Math.sin(along) + random.normal() * spread;
      points.push(x, y);
    }
  }
  // The Orion spur, through the Sun.
  for (let i = 0; i < 160; i++) {
    const t = random.uniform(-1, 1);
    points.push(-sunR + t * 3_000 + random.normal() * 600, t * 9_000 + random.normal() * 600);
  }
  // The bar, about 27° from the Sun–centre line, and the bulge.
  const barAngle = Math.PI + (27 * Math.PI) / 180;
  for (let i = 0; i < 700; i++) {
    const t = random.normal() * 5_500;
    const w = random.normal() * 1_500;
    points.push(t * Math.cos(barAngle) - w * Math.sin(barAngle), t * Math.sin(barAngle) + w * Math.cos(barAngle));
  }
  // A faint disc everywhere.
  for (let i = 0; i < 500; i++) {
    const r = 50_000 * Math.sqrt(random.next());
    const a = random.uniform(0, 2 * Math.PI);
    points.push(r * Math.cos(a), r * Math.sin(a));
  }
  return Float64Array.from(points, (v) => v * LIGHT_YEAR);
}

interface Label {
  text: string;
  x: number;
  y: number;
  alpha: number;
  priority: number;
  selected: boolean;
}

/**
 * Draws the scene into a canvas context of `width` × `height` CSS pixels (the
 * context should already be scaled for the device pixel ratio). Returns where
 * each visible object landed, smallest first, for hit-testing.
 */
export function drawZoom(
  ctx: CanvasRenderingContext2D,
  scene: ZoomScene,
  power: number,
  width: number,
  height: number,
  colours: ZoomColours,
  selected: string | null,
): Drawn[] {
  const pxPerM = pixelsPerMetre(power, width);
  const centre = cameraCentre(scene.camera, power);
  const cx = width / 2;
  const cy = height / 2;
  const diag = Math.hypot(width, height);
  const drawn: Drawn[] = [];
  const labels: Label[] = [];

  ctx.fillStyle = colours.sky;
  ctx.fillRect(0, 0, width, height);

  const screen = (id: string): [number, number] => {
    const [x, y] = offsetFromCentre(scene.tree, id, centre);
    return [cx + x * pxPerM, cy - y * pxPerM];
  };

  // ---------- the Milky Way sketch ----------
  const galaxy = scene.objects.find((o) => o.kind === 'galaxy');
  if (galaxy) {
    const alpha = fadeWindow(power, 19.6, 30, 0.8);
    if (alpha > 0) {
      const [gx, gy] = screen(galaxy.id);
      const gr = (galaxy.diameter / 2) * pxPerM;
      // A soft glow for the bulge, then the stars, added together so dense parts glow.
      const bulge = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr * 0.22);
      bulge.addColorStop(0, 'rgba(255, 236, 200, 0.55)');
      bulge.addColorStop(1, 'rgba(255, 236, 200, 0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = bulge;
      ctx.fillRect(gx - gr * 0.25, gy - gr * 0.25, gr * 0.5, gr * 0.5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#b8c8ff';
      const dot = Math.max(1, Math.min(2.4, gr / 160));
      for (let i = 0; i < scene.galaxyDust.length; i += 2) {
        const x = gx + scene.galaxyDust[i] * pxPerM;
        const y = gy - scene.galaxyDust[i + 1] * pxPerM;
        if (x < -4 || y < -4 || x > width + 4 || y > height + 4) continue;
        ctx.globalAlpha = alpha * (0.3 + (0.4 * ((i * 7919) % 13)) / 13);
        ctx.fillRect(x - dot / 2, y - dot / 2, dot, dot);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      drawn.push({ id: galaxy.id, x: gx, y: gy, r: (galaxy.diameter / 2) * pxPerM, kind: 'galaxy' });
      labels.push({
        text: galaxy.name,
        x: gx + gr * 0.3,
        y: gy - gr * 0.42,
        alpha: fadeWindow(power, ...galaxy.label),
        priority: galaxy.priority,
        selected: selected === galaxy.id,
      });
    }
  }

  // Largest first, so small things are drawn on top.
  const order = [...scene.objects].sort((a, b) => b.diameter - a.diameter);

  // ---------- orbits ----------
  ctx.lineWidth = 1;
  for (const o of order) {
    if (!o.orbit || o.parent === null) continue;
    // An orbit shows once it is no more than about 40 times wider than the view.
    const orbitPower = Math.log10(2 * Math.hypot(...o.offset));
    const alpha = fadeWindow(power, orbitPower - 1.6, o.label[1] + 0.4, 0.6) * 0.55;
    if (alpha <= 0) continue;
    const [px, py] = screen(o.parent);
    const r = Math.hypot(...o.offset) * pxPerM;
    if (!circleInView(px, py, r, width, height)) continue;
    ctx.strokeStyle = colours.grid;
    ctx.globalAlpha = alpha;
    strokeCircle(ctx, px, py, r, width, height, diag);
    ctx.globalAlpha = 1;
  }

  // ---------- objects ----------
  for (const o of order) {
    if (o.kind === 'galaxy') continue;
    const [x, y] = screen(o.id);
    const r = (o.diameter / 2) * pxPerM;
    const labelAlpha = fadeWindow(power, o.label[0], o.label[1]);
    const isSelected = selected === o.id;

    switch (o.kind) {
      case 'ring':
      case 'circle': {
        const alpha = fadeWindow(power, o.label[0] - 0.2, o.label[1] + 0.3, 0.6);
        if (alpha <= 0 || !circleInView(x, y, r, width, height)) break;
        const inner = (o.innerRadius ?? (o.diameter / 2) * 0.995) * pxPerM;
        if (o.kind === 'ring' && r - inner > 1.5) {
          ctx.globalAlpha = alpha * (o.id === 'atmosphere' ? 0.55 : 0.12);
          ctx.strokeStyle = o.id === 'atmosphere' ? '#7fb4ff' : o.id === 'oort-cloud' ? '#9fb3d9' : '#b8a888';
          ctx.lineWidth = r - inner;
          strokeCircle(ctx, x, y, (r + inner) / 2, width, height, diag);
          ctx.lineWidth = 1;
        } else {
          ctx.globalAlpha = alpha * 0.8;
          ctx.strokeStyle = '#8fb0e8';
          ctx.setLineDash([5, 5]);
          strokeCircle(ctx, x, y, r, width, height, diag);
          ctx.setLineDash([]);
        }
        ctx.globalAlpha = 1;
        drawn.push({ id: o.id, x, y, r, inner: o.kind === 'ring' ? inner : r - 6, kind: o.kind });
        // Label on the visible part of the ring, up and to the right.
        const labelR = Math.min(r, Math.max(inner, Math.min(width, height) * 0.38));
        labels.push({ text: o.name, x: x + labelR * 0.6, y: y - labelR * 0.8, alpha: labelAlpha, priority: o.priority, selected: isSelected });
        break;
      }
      case 'fuzzy': {
        if (labelAlpha <= 0 && r < DOT) break;
        if (!circleInView(x, y, Math.max(r, DOT) + 4, width, height)) break;
        const rr = Math.max(r, DOT + 1);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, rr);
        glow.addColorStop(0, STAR_COLOURS[o.id] ?? colours.text);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = Math.max(0.35, labelAlpha) * 0.9;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
        drawn.push({ id: o.id, x, y, r: rr, kind: o.kind });
        labels.push({ text: o.name, x: x + rr + 6, y: y + 4, alpha: labelAlpha, priority: o.priority, selected: isSelected });
        break;
      }
      case 'marker': {
        if (labelAlpha <= 0) break;
        ctx.globalAlpha = labelAlpha;
        ctx.strokeStyle = colours.sun;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, 2 * Math.PI);
        ctx.moveTo(x - 11, y);
        ctx.lineTo(x - 4, y);
        ctx.moveTo(x + 4, y);
        ctx.lineTo(x + 11, y);
        ctx.stroke();
        ctx.fillStyle = colours.sun;
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
        drawn.push({ id: o.id, x, y, r: 7, kind: o.kind });
        labels.push({ text: o.name, x: x + 14, y: y + 4, alpha: labelAlpha, priority: o.priority, selected: isSelected });
        break;
      }
      case 'pitch': {
        const [len, wid] = o.extent!;
        const w = len * pxPerM;
        const h = wid * pxPerM;
        if (w < 1.5 || w > diag * 400) break;
        drawPitch(ctx, x, y, w, h, pxPerM);
        drawn.push({ id: o.id, x, y, r: w / 2, kind: o.kind });
        labels.push({ text: o.name, x: x + w / 2 + 6, y: y - h / 2 + 12, alpha: labelAlpha, priority: o.priority, selected: isSelected });
        break;
      }
      case 'person': {
        const len = o.diameter * pxPerM;
        if (len >= 6) drawPerson(ctx, x, y, len);
        else if (labelAlpha > 0) dot(ctx, x, y, DOT, '#f0a060');
        if (len >= 6 || labelAlpha > 0) {
          drawn.push({ id: o.id, x, y, r: Math.max(len / 2, DOT), kind: o.kind });
          labels.push({
            text: o.name,
            x: x + Math.max(len * 0.3, DOT) + 8,
            y: y - Math.min(len * 0.35, 200) + 4,
            alpha: labelAlpha,
            priority: o.priority,
            selected: isSelected,
          });
        }
        break;
      }
      default: {
        // Bodies, stars and spacecraft: a disc at true size, or a dot.
        if (!circleInView(x, y, Math.max(r, DOT) + 2, width, height)) break;
        const tiny = r < DOT;
        if (tiny && labelAlpha <= 0 && !isSelected) break;
        if (o.kind === 'craft') {
          if (tiny) {
            ctx.fillStyle = colours.text;
            ctx.globalAlpha = Math.max(labelAlpha, 0.5);
            ctx.fillRect(x - 2, y - 2, 4, 4);
            ctx.globalAlpha = 1;
          } else {
            dot(ctx, x, y, r, o.id === 'sgr-a' ? '#000000' : colours.text);
          }
        } else if (o.kind === 'star') {
          const colour = o.id === 'sun' ? colours.sun : (STAR_COLOURS[o.id] ?? colours.text);
          if (!tiny) {
            fillDisc(ctx, x, y, r, colour, width, height, diag);
            if (o.id === 'sun' && r < diag) haloDisc(ctx, x, y, r, colour);
          } else {
            dot(ctx, x, y, DOT, colour);
          }
        } else {
          const colour = o.id === 'earth' ? earthColour(power) : (BODY_COLOURS[o.id] ?? colours.text);
          fillDisc(ctx, x, y, tiny ? DOT : r, colour, width, height, diag);
        }
        drawn.push({ id: o.id, x, y, r: Math.max(r, DOT), kind: o.kind });
        const big = r > Math.min(width, height) * 0.3;
        labels.push({
          text: o.name,
          x: big ? cx + 12 : x + Math.max(r, DOT) + 6,
          y: big ? Math.max(18, y - r + 18, 22) : y + 4,
          alpha: labelAlpha,
          priority: o.priority,
          selected: isSelected,
        });
      }
    }
    if (isSelected) {
      const last = drawn[drawn.length - 1];
      if (last && last.id === o.id && last.r < diag) {
        ctx.strokeStyle = colours.highlight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(last.x, last.y, Math.max(last.r, 4) + 5, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
  }

  drawLabels(ctx, labels, colours, width, height);
  drawScaleBar(ctx, pxPerM, width, height, colours);

  // Smallest first, so a click on a planet inside a ring picks the planet.
  return drawn.sort((a, b) => a.r - b.r);
}

/** Earth seen from just above the ground is grass; from space, mostly ocean and cloud. */
function earthColour(power: number): string {
  const t = smoothstep((power - 4.5) / 2.5);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${mix(44, 79)}, ${mix(92, 143)}, ${mix(52, 224)})`;
}

function circleInView(x: number, y: number, r: number, width: number, height: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  // Outside the circle's bounding box?
  if (x + r < 0 || x - r > width || y + r < 0 || y - r > height) return false;
  return true;
}

/** Whether the whole view lies inside a circle. */
function viewInside(x: number, y: number, r: number, width: number, height: number): boolean {
  return [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ].every(([px, py]) => Math.hypot(px - x, py - y) < r);
}

/**
 * Traces a circle that may be far bigger than the canvas. Small ones use arc();
 * big ones only the part near the view, as a polyline, so the canvas never sees
 * coordinates in the billions.
 */
function traceCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, width: number, height: number, diag: number) {
  if (r < 20_000) {
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    return;
  }
  const towards = Math.atan2(height / 2 - y, width / 2 - x);
  const d = Math.hypot(width / 2 - x, height / 2 - y);
  const span = Math.min(Math.PI, (2 * diag) / Math.max(1, Math.min(d, r)));
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const a = towards - span + (2 * span * i) / n;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
}

function strokeCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, width: number, height: number, diag: number) {
  if (r > 0.5 && viewInside(x, y, r - ctx.lineWidth / 2 - 1, width, height) && r - ctx.lineWidth / 2 > diag) return;
  ctx.beginPath();
  traceCircle(ctx, x, y, r, width, height, diag);
  ctx.stroke();
}

function fillDisc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, width: number, height: number, diag: number) {
  ctx.fillStyle = colour;
  if (viewInside(x, y, r, width, height)) {
    ctx.fillRect(0, 0, width, height);
    return;
  }
  ctx.beginPath();
  if (r < 20_000) {
    ctx.arc(x, y, r, 0, 2 * Math.PI);
  } else {
    // The visible arc, closed through a point inside the disc beyond the view.
    traceCircle(ctx, x, y, r, width, height, diag);
    const d = Math.hypot(width / 2 - x, height / 2 - y);
    const back = Math.min(r, 3 * diag + (r - d));
    const ux = (x - width / 2) / d;
    const uy = (y - height / 2) / d;
    const edgeX = x - ux * r;
    const edgeY = y - uy * r;
    ctx.lineTo(edgeX + ux * back, edgeY + uy * back);
    ctx.closePath();
  }
  ctx.fill();
}

function haloDisc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string) {
  const glow = ctx.createRadialGradient(x, y, r, x, y, r * 1.6 + 4);
  glow.addColorStop(0, colour);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.6 + 4, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

/** A football pitch from above, with its markings when it's big enough to show them. */
function drawPitch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pxPerM: number) {
  ctx.fillStyle = '#3d8a4a';
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  if (w < 40) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1, 0.12 * pxPerM);
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x, y + h / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 9.15 * pxPerM, 0, 2 * Math.PI);
  ctx.stroke();
  const boxW = 16.5 * pxPerM;
  const boxH = 40.32 * pxPerM;
  ctx.strokeRect(x - w / 2, y - boxH / 2, boxW, boxH);
  ctx.strokeRect(x + w / 2 - boxW, y - boxH / 2, boxW, boxH);
  ctx.lineWidth = 1;
}

/** A person lying on their back, head at the top, `len` pixels long. */
function drawPerson(ctx: CanvasRenderingContext2D, x: number, y: number, len: number) {
  const u = len / 1.7; // pixels per metre
  const top = y - 0.85 * u;
  ctx.save();
  ctx.lineCap = 'round';
  // Legs.
  ctx.strokeStyle = '#3b4a7a';
  ctx.lineWidth = 0.14 * u;
  ctx.beginPath();
  ctx.moveTo(x - 0.09 * u, top + 0.86 * u);
  ctx.lineTo(x - 0.13 * u, top + 1.62 * u);
  ctx.moveTo(x + 0.09 * u, top + 0.86 * u);
  ctx.lineTo(x + 0.13 * u, top + 1.62 * u);
  ctx.stroke();
  // Arms.
  ctx.strokeStyle = '#e0703a';
  ctx.lineWidth = 0.1 * u;
  ctx.beginPath();
  ctx.moveTo(x - 0.2 * u, top + 0.36 * u);
  ctx.lineTo(x - 0.34 * u, top + 0.9 * u);
  ctx.moveTo(x + 0.2 * u, top + 0.36 * u);
  ctx.lineTo(x + 0.34 * u, top + 0.9 * u);
  ctx.stroke();
  // Body.
  ctx.fillStyle = '#e0703a';
  roundRect(ctx, x - 0.2 * u, top + 0.3 * u, 0.4 * u, 0.62 * u, 0.1 * u);
  // Head.
  ctx.fillStyle = '#f1c9a5';
  ctx.beginPath();
  ctx.arc(x, top + 0.13 * u, 0.12 * u, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

/** Labels, most important first, skipping any that would overlap one already placed. */
function drawLabels(ctx: CanvasRenderingContext2D, labels: Label[], colours: ZoomColours, width: number, height: number) {
  ctx.font = '13px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'alphabetic';
  // The ×10 counter sits in the top-right corner.
  const placed: [number, number, number, number][] = [[width - 120, 0, width, 48]];
  const sorted = labels
    .filter((l) => l.alpha > 0.02 || l.selected)
    .sort((a, b) => Number(b.selected) - Number(a.selected) || b.priority - a.priority);
  for (const label of sorted) {
    const w = ctx.measureText(label.text).width;
    let x = label.x;
    let y = label.y;
    if (x + w > width - 4) x = Math.max(4, label.x - w - 24);
    x = Math.max(4, x);
    y = Math.min(Math.max(y, 16), height - 6);
    if (label.x < -40 || label.x > width + 40 || label.y < -40 || label.y > height + 40) continue;
    const box: [number, number, number, number] = [x - 2, y - 13, x + w + 2, y + 4];
    if (placed.some((p) => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1])) continue;
    placed.push(box);
    ctx.globalAlpha = label.selected ? 1 : label.alpha;
    ctx.lineWidth = 3;
    ctx.strokeStyle = colours.sky;
    ctx.strokeText(label.text, x, y);
    ctx.fillStyle = label.selected ? colours.highlight : colours.text;
    ctx.fillText(label.text, x, y);
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

function drawScaleBar(ctx: CanvasRenderingContext2D, pxPerM: number, width: number, height: number, colours: ZoomColours) {
  const { px, text } = scaleBar(pxPerM, Math.min(180, width * 0.3));
  const x = 14;
  const y = height - 16;
  ctx.strokeStyle = colours.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x, y);
  ctx.lineTo(x + px, y);
  ctx.lineTo(x + px, y - 5);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillStyle = colours.text;
  ctx.fillText(text, x, y - 9);
}

/** The object under a point: the smallest drawn thing within reach, or a ring the point falls inside. */
export function hitTest(drawn: readonly Drawn[], x: number, y: number): string | null {
  let best: { id: string; score: number } | null = null;
  for (const d of drawn) {
    const distance = Math.hypot(x - d.x, y - d.y);
    if (d.kind === 'ring' || d.kind === 'circle') {
      const inner = d.inner ?? d.r - 6;
      if (distance >= inner - 4 && distance <= d.r + 4 && (best === null || best.score > 1e6)) best = { id: d.id, score: 1e6 + d.r };
      continue;
    }
    const reach = Math.max(d.r, 12);
    if (distance <= reach) {
      const score = d.r < 12 ? distance : 1e5 + d.r;
      if (best === null || score < best.score) best = { id: d.id, score };
    }
  }
  return best?.id ?? null;
}
