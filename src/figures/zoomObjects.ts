import { zoomCatalogue, type ZoomObject } from '../core/scale/catalogue';
import { jdFromUnixMs } from '../core/time/julian';

let today: readonly ZoomObject[] | null = null;

/** The zoom's catalogue for the moment the page loaded, made once and shared by every copy of the zoom on the page. */
export function zoomObjectsToday(): readonly ZoomObject[] {
  today ??= zoomCatalogue(jdFromUnixMs(Date.now()));
  return today;
}
