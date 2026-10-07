// Coarse location, GPS only, never reverse geocoded. Every call is bounded by a
// timeout: on the simulator, permission queries alone took >8 s right after boot.
import * as Location from 'expo-location';

import { LOCATION_TIMEOUT_MS } from '../config';
import { roundCoord } from '../core/db/rows';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

export interface CoarseLocation {
  lat: number;
  lon: number;
}

/** Returns rounded coordinates or null (denied, timeout, no fix). Never throws. */
export async function getCoarseLocation(timeoutMs = LOCATION_TIMEOUT_MS): Promise<CoarseLocation | null> {
  const started = Date.now();
  try {
    let perm = await withTimeout(Location.getForegroundPermissionsAsync(), timeoutMs);
    console.log(`[location] permission ${perm ? `${perm.status} canAskAgain=${perm.canAskAgain}` : 'timeout'}`);
    if (!perm) return null;
    if (perm.status === 'undetermined' && perm.canAskAgain) {
      perm = await withTimeout(Location.requestForegroundPermissionsAsync(), timeoutMs * 6);
    }
    if (!perm || perm.status !== 'granted') {
      console.log(`[location] not granted (${perm?.status ?? 'timeout'}), saving without coordinates`);
      return null;
    }
    const remaining = Math.max(1000, timeoutMs - (Date.now() - started));
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 }).catch(() => null);
    const pos =
      last ??
      (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), remaining));
    if (!pos) return null;
    const lat = roundCoord(pos.coords.latitude);
    const lon = roundCoord(pos.coords.longitude);
    return lat == null || lon == null ? null : { lat, lon };
  } catch (e) {
    console.warn('[location] failed', e);
    return null;
  }
}
