import type * as THREE from 'three';
import type { ThreeModule } from './engine';

/**
 * A planet globe for Scene3D scenes: a sphere with a map wrapped round it,
 * its axis tilted, spinning about that axis, and rings if it has them.
 *
 * In the scene's z-up world the globe's axis starts along z; `tilt` leans it
 * sideways (about the y axis, so a camera on the y axis sees the lean) and
 * `spin` turns it about its own axis. Maps load in the background and the
 * globe shows its plain colour until then.
 */

export interface GlobeSpec {
  /** Radius, scene units. */
  radius: number;
  /** Plain colour, shown until the map arrives. */
  colour: string;
  /** URL of an equirectangular map, or null for a plain globe. */
  texture: string | null;
  /** Axial tilt, radians: the pole leans from z towards −x. Over 90° the globe is upside down (Venus, Uranus). */
  tilt: number;
  /** Rings: inner and outer radii (scene units) and a map running from the inner edge to the outer. */
  rings?: { inner: number; outer: number; texture: string } | null;
}

export interface Globe {
  /** Add this to the scene and move it to place the globe. */
  group: THREE.Group;
  /** Turns the globe to a spin angle (radians) about its axis. */
  setSpin(angle: number): void;
  dispose(): void;
}

/** Loads each map once per scene, and asks for a new frame when one arrives. */
export class TextureCache {
  private readonly textures = new Map<string, THREE.Texture>();
  private readonly T: ThreeModule;
  private readonly onLoad: () => void;

  constructor(T: ThreeModule, onLoad: () => void) {
    this.T = T;
    this.onLoad = onLoad;
  }

  get(url: string): THREE.Texture {
    let texture = this.textures.get(url);
    if (!texture) {
      texture = new this.T.TextureLoader().load(url, () => this.onLoad());
      texture.colorSpace = this.T.SRGBColorSpace;
      texture.anisotropy = 4;
      this.textures.set(url, texture);
    }
    return texture;
  }

  dispose() {
    for (const t of this.textures.values()) t.dispose();
    this.textures.clear();
  }
}

/** A ring whose map runs from the inner edge (u = 0) to the outer (u = 1), as ring textures are drawn. */
function ringGeometry(T: ThreeModule, inner: number, outer: number): THREE.BufferGeometry {
  const geometry = new T.RingGeometry(inner, outer, 128, 1);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const r = Math.hypot(position.getX(i), position.getY(i));
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  return geometry;
}

export function createGlobe(T: ThreeModule, spec: GlobeSpec, textures: TextureCache): Globe {
  const group = new T.Group();
  const tilted = new T.Group();
  tilted.rotation.y = -spec.tilt;
  group.add(tilted);

  const sphere = new T.SphereGeometry(spec.radius, 64, 32);
  // three.js puts a sphere's poles on y; this world's axis is z.
  sphere.rotateX(Math.PI / 2);
  const material = new T.MeshLambertMaterial({ color: spec.texture ? '#ffffff' : spec.colour });
  if (spec.texture) {
    material.map = textures.get(spec.texture);
  }
  const body = new T.Mesh(sphere, material);
  tilted.add(body);

  let ring: THREE.Mesh | null = null;
  if (spec.rings) {
    ring = new T.Mesh(
      ringGeometry(T, spec.rings.inner, spec.rings.outer),
      new T.MeshLambertMaterial({ map: textures.get(spec.rings.texture), transparent: true, side: T.DoubleSide, depthWrite: false }),
    );
    tilted.add(ring);
  }

  return {
    group,
    setSpin(angle) {
      body.rotation.z = angle;
    },
    dispose() {
      sphere.dispose();
      material.dispose();
      if (ring) {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      }
    },
  };
}
