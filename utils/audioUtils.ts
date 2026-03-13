
export interface AudioData {
  data: string;
  mimeType: string;
}

export function createBlob(data: Float32Array, sampleRate: number = 16000): AudioData {
  const l = data.length;
  const int16 = new Int16Array(l);
  
  for (let i = 0; i < l; i++) {
    let s = data[i];
    
    // Sanity check for NaN or Infinity which can crash the encoder/server on iOS
    if (!Number.isFinite(s)) s = 0;
    
    // Clamp values to [-1, 1] range before converting to PCM 16-bit
    s = Math.max(-1, Math.min(1, s));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: `audio/pcm;rate=${sampleRate}`,
  };
}

export function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number = 16000): Float32Array {
  if (inputRate === outputRate) {
    return buffer;
  }
  
  const ratio = inputRate / outputRate;
  const newLength = Math.floor(buffer.length / ratio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const offset = Math.floor(i * ratio);
    
    // Safety check to ensure we don't read past the buffer
    if (offset >= buffer.length) {
        result[i] = 0;
        continue;
    }

    result[i] = buffer[offset];
  }
  
  return result;
}

export function encode(bytes: Uint8Array): string {
  const len = bytes.byteLength;
  let binary = '';
  // Process in chunks to avoid stack overflow with spread syntax on large arrays
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
