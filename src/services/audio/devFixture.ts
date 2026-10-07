// __DEV__ only: load a WAV dropped into Documents (scripts/dev-fixture.sh) so the
// Listen flow can be verified on simulators/emulators without a real bird.
import { File, Paths } from 'expo-file-system';

import { DEV_FIXTURE_FILENAME, LISTEN } from '../../config';
import { clampUnit, resampleLinear } from '../../core/audio/resample';
import { parseWav } from '../../core/audio/wav';

export function devFixtureAvailable(): boolean {
  return __DEV__ && new File(Paths.document, DEV_FIXTURE_FILENAME).exists;
}

export async function loadDevFixture(seconds = LISTEN.seconds): Promise<{ samples: Float32Array; sourceRate: number }> {
  const file = new File(Paths.document, DEV_FIXTURE_FILENAME);
  if (!file.exists) throw new Error(`No ${DEV_FIXTURE_FILENAME} in Documents`);
  const b = await file.bytes();
  const wav = parseWav(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const at48 = resampleLinear(wav.samples, wav.sampleRate, LISTEN.sampleRate);
  return { samples: clampUnit(at48.slice(0, LISTEN.sampleRate * seconds)), sourceRate: wav.sampleRate };
}
