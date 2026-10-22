import fc from 'fast-check';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { checkNeptuneFit, NEPTUNE_ORBIT_POWER } from '../src/content/checks/chapter1Answers';
import { divideScientific, multiplyScientific } from '../src/core/math/scientific';
import { distance } from '../src/core/math/vec3';
import { angularSize } from '../src/core/math/angularSize';
import { DEG } from '../src/core/units';
import { EXAMPLES, formatAngle } from '../src/figures/angles';
import { PRESETS } from '../src/figures/powers';
import { VoyagerLightDay } from '../src/site/content/Dated';
import { voyagerHasReachedLightDay, voyagerYears } from '../src/site/content/voyagerDates';
import { ZoomLevels } from '../src/site/pages/ZoomLevels';
import { hitTest } from '../src/viz/scaleZoom/draw';
import { cameraKey, cameraPosition, rotate, wheelZoom, zoom, type OrbitCameraState } from '../src/viz/scene3d/orbitCamera';
import { Scene3D } from '../src/viz/scene3d/Scene3D';
import { expectNear } from './helpers';

const START: OrbitCameraState = { target: [1, 2, 3], azimuth: 0, elevation: 0, distance: 10 };

describe('the orbit camera', () => {
  it('sits at its distance from the target, in the direction of its angles', () => {
    expect(cameraPosition(START)).toEqual([11, 2, 3]);
    const above = cameraPosition({ ...START, elevation: Math.PI / 2 });
    expectNear(above[2], 13, 1e-12, 'z');
    fc.assert(
      fc.property(fc.double({ min: -10, max: 10, noNaN: true }), fc.double({ min: -1.5, max: 1.5, noNaN: true }), fc.double({ min: 0.01, max: 1e6, noNaN: true }), (azimuth, elevation, d) => {
        expectNear(distance(cameraPosition({ ...START, azimuth, elevation, distance: d }), START.target), d, d * 1e-12, 'distance');
      }),
    );
  });

  it('turns with the arrow keys and zooms with + and −, within its limits', () => {
    expect(cameraKey(START, 'ArrowRight')!.azimuth).toBeGreaterThan(0);
    expect(cameraKey(START, 'ArrowUp')!.elevation).toBeGreaterThan(0);
    expect(cameraKey(START, '+')!.distance).toBeLessThan(10);
    expect(cameraKey(START, '-')!.distance).toBeGreaterThan(10);
    expect(cameraKey(START, 'a')).toBeNull();
    const limits = { minDistance: 5, maxDistance: 20, maxElevation: 1 };
    expect(zoom(START, 0.01, limits).distance).toBe(5);
    expect(zoom(START, 100, limits).distance).toBe(20);
    expect(rotate(START, 0, 5, limits).elevation).toBe(1);
    expect(wheelZoom(100)).toBeGreaterThan(1);
    expect(wheelZoom(-100)).toBeLessThan(1);
  });
});

describe('Chapter 1’s interactive questions', () => {
  it('accepts a view that just fits Neptune’s orbit, about 13 steps of ×10', () => {
    expectNear(NEPTUNE_ORBIT_POWER, 12.95, 0.01, 'Neptune’s orbit');
    expect(checkNeptuneFit(12.9).correct).toBe(false);
    expect(checkNeptuneFit(13.0).correct).toBe(true);
    expect(checkNeptuneFit(13.3).correct).toBe(true);
    expect(checkNeptuneFit(13.5).correct).toBe(false);
  });
});

describe('Voyager 1’s milestone, in the right tense', () => {
  const before = Date.parse('2026-10-22T12:00:00Z');
  const after = Date.parse('2026-11-18T07:00:00Z');

  it('switches tense at 06:16 UTC on 18 November 2026', () => {
    expect(voyagerHasReachedLightDay(before)).toBe(false);
    expect(voyagerHasReachedLightDay(Date.parse('2026-11-18T06:15:00Z'))).toBe(false);
    expect(voyagerHasReachedLightDay(after)).toBe(true);
    expect(renderToStaticMarkup(<VoyagerLightDay now={before} />)).toContain('will become the first spacecraft');
    expect(renderToStaticMarkup(<VoyagerLightDay now={after} />)).toContain('became the first spacecraft');
  });

  it('counts the years since launch', () => {
    expect(voyagerYears(before)).toBe(49);
    expect(voyagerYears(Date.parse('2027-09-06T00:00:00Z'))).toBe(50);
    expect(renderToStaticMarkup(<VoyagerLightDay now={before} />)).toContain('After 49 years');
  });
});

describe('the Toolkit figures’ examples', () => {
  it('work out as their captions say', () => {
    const value = (i: number) => {
      const p = PRESETS[i];
      const { result } = p.op === 'times' ? multiplyScientific(p.a, p.b) : divideScientific(p.a, p.b);
      return result.mantissa * 10 ** result.exponent;
    };
    expectNear(value(0), 499, 1, 'sunlight, s');
    expectNear(value(1), 109, 0.5, 'Earths across the Sun');
    expectNear(value(2) / 1e15, 9.46, 0.01, 'light-year, 10¹⁵ m');
    expect(PRESETS[0].meaning(value(0))).toContain('8 minutes 19 seconds');
  });

  it('measure angles like the Toolkit page', () => {
    const angle = (name: string) => {
      const e = EXAMPLES.find((x) => x.name === name)!;
      return angularSize(e.size, e.distance);
    };
    expectNear(angle('Your little finger at arm’s length') / DEG, 1, 0.01, 'little finger');
    expectNear(angle('Your fist at arm’s length') / DEG, 10, 0.1, 'fist');
    expect(formatAngle(angle('The full Moon'))).toBe('31.1′');
    expect(formatAngle(angle('Jupiter, when it is closest'))).toBe('46.9″');
    expect(formatAngle(angle('A person 1 km away'))).toBe('5.84′');
  });
});

describe('clicking in the zoom', () => {
  it('picks the smallest thing under the pointer, then a ring the pointer is on', () => {
    const drawn = [
      { id: 'earth', x: 100, y: 100, r: 2.5, kind: 'body' as const },
      { id: 'sun', x: 50, y: 50, r: 30, kind: 'star' as const },
      { id: 'belt', x: 50, y: 50, r: 200, inner: 150, kind: 'ring' as const },
    ];
    expect(hitTest(drawn, 104, 103)).toBe('earth');
    expect(hitTest(drawn, 60, 60)).toBe('sun');
    expect(hitTest(drawn, 50, 230)).toBe('belt');
    expect(hitTest(drawn, 50, 150)).toBeNull();
  });
});

describe('components', () => {
  it('Scene3D renders a labelled, keyboard-focusable view with a description and help, before three.js arrives', () => {
    const html = renderToStaticMarkup(
      <Scene3D label="3D test" description="A test scene." factory={() => ({})} state={0} camera={START} />,
    );
    expect(html).toContain('aria-roledescription="3D view"');
    expect(html).toContain('aria-label="3D test"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('A test scene.');
    expect(html).toContain('Loading the 3D view');
    expect(html).toMatch(/arrow keys to turn/);
  });

  it('ZoomLevels links to each part', () => {
    const html = renderToStaticMarkup(<ZoomLevels />);
    expect(html).toContain('href="#/part-1"');
    expect(html).toContain('href="#/part-3"');
    expect(renderToStaticMarkup(<ZoomLevels list={false} />)).not.toContain('href=');
  });
});
