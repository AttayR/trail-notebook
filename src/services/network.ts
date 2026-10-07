import * as Network from 'expo-network';

/** True when the phone has no usable connection. Null if unknown. Never throws. */
export async function isOffline(): Promise<boolean | null> {
  try {
    const s = await Network.getNetworkStateAsync();
    if (s.isConnected === false) return true;
    if (s.isInternetReachable === false) return true;
    if (s.isConnected === true) return false;
    return null;
  } catch {
    return null;
  }
}
