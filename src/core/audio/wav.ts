// Minimal WAV reader for the device-validation fixture: PCM 16-bit, PCM 24/32-bit
// integer, or IEEE float 32. Multi-channel input is downmixed to mono.
export interface DecodedWav {
  sampleRate: number;
  channels: number;
  samples: Float32Array;
}

function tag(v: DataView, off: number): string {
  return String.fromCharCode(v.getUint8(off), v.getUint8(off + 1), v.getUint8(off + 2), v.getUint8(off + 3));
}

export function parseWav(buffer: ArrayBuffer): DecodedWav {
  const v = new DataView(buffer);
  if (buffer.byteLength < 12 || tag(v, 0) !== 'RIFF' || tag(v, 8) !== 'WAVE') throw new Error('not a RIFF/WAVE file');
  let off = 12;
  let fmt: { format: number; channels: number; rate: number; bits: number } | null = null;
  let dataOff = -1;
  let dataLen = 0;
  while (off + 8 <= buffer.byteLength) {
    const id = tag(v, off);
    const size = v.getUint32(off + 4, true);
    const body = off + 8;
    if (id === 'fmt ') {
      let format = v.getUint16(body, true);
      const bits = v.getUint16(body + 14, true);
      if (format === 0xfffe && size >= 26) format = v.getUint16(body + 24, true); // WAVE_FORMAT_EXTENSIBLE
      fmt = { format, channels: v.getUint16(body + 2, true), rate: v.getUint32(body + 4, true), bits };
    } else if (id === 'data') {
      dataOff = body;
      dataLen = Math.min(size, buffer.byteLength - body);
      break;
    }
    off = body + size + (size % 2);
  }
  if (!fmt) throw new Error('missing fmt chunk');
  if (dataOff < 0) throw new Error('missing data chunk');
  const { format, channels, rate, bits } = fmt;
  const isPcm = format === 1;
  const isFloat = format === 3;
  if (!(isPcm && (bits === 16 || bits === 24 || bits === 32)) && !(isFloat && bits === 32)) {
    throw new Error(`unsupported WAV encoding (format ${format}, ${bits} bit)`);
  }
  const bytes = bits / 8;
  const frames = Math.floor(dataLen / (bytes * channels));
  const out = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let acc = 0;
    for (let c = 0; c < channels; c++) {
      const p = dataOff + (f * channels + c) * bytes;
      let s: number;
      if (isFloat) s = v.getFloat32(p, true);
      else if (bits === 16) s = v.getInt16(p, true) / 32768;
      else if (bits === 24) {
        const x = v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getInt8(p + 2) << 16);
        s = x / 8388608;
      } else s = v.getInt32(p, true) / 2147483648;
      acc += s;
    }
    out[f] = acc / channels;
  }
  return { sampleRate: rate, channels, samples: out };
}
