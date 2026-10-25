import type { Vec3 } from '../../core/math/vec3';
import type { OrreryBody } from '../../core/orrery/engine';

/**
 * "Copy a link to this system": the bodies as compact JSON in base64url,
 * for the address's ?system= parameter. Numbers keep 12 significant figures,
 * enough to rebuild the system as it was to well within the engine's own
 * error. Decoding checks the shape; the engine checks the values.
 */

type Packed = [string, string, number, number, string, number, number, number, number, number, number];

const round = (x: number) => Number(x.toPrecision(12));

export function encodeSystem(bodies: readonly OrreryBody[]): string {
  const packed: Packed[] = bodies.map((b) => [b.id, b.name, round(b.gm), round(b.radius), b.colour, ...b.x.map(round), ...b.v.map(round)] as Packed);
  const bytes = new TextEncoder().encode(JSON.stringify(packed));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSystem(text: string): OrreryBody[] {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const packed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  if (!Array.isArray(packed) || packed.length === 0 || packed.length > 50) throw new Error('Not a system.');
  return packed.map((p): OrreryBody => {
    if (!Array.isArray(p) || p.length !== 11) throw new Error('Not a body.');
    const [id, name, gm, radius, colour, ...rest] = p as unknown[];
    if (typeof id !== 'string' || typeof name !== 'string' || typeof colour !== 'string' || !/^#[0-9a-f]{3,8}$/i.test(colour)) throw new Error('Not a body.');
    const numbers = [gm, radius, ...rest];
    if (!numbers.every((n) => typeof n === 'number' && Number.isFinite(n))) throw new Error('Not a number.');
    const r = rest as number[];
    return { id: id.slice(0, 60), name: name.slice(0, 40), gm: gm as number, radius: radius as number, colour, x: [r[0], r[1], r[2]] as Vec3, v: [r[3], r[4], r[5]] as Vec3 };
  });
}
