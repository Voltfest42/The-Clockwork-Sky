const DEG = Math.PI / 180;
const COMPASS_WORDS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

/** "south-east": the compass direction of an azimuth (radians, from north through east). */
export function compassWord(az: number): string {
  return COMPASS_WORDS[Math.round(((az / DEG + 360) % 360) / 45) % 8];
}
