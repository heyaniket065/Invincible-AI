// Helper functions for audio decoding, based on Gemini API guidelines
// FIX: Export the decode function so it can be used in other modules.
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper function for audio encoding for the Live API
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}


async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
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

// Global AudioContext to avoid creating multiple contexts, ensuring better performance.
let audioContext: AudioContext | null = null;
const getAudioContext = (sampleRate: number = 24000): AudioContext => {
  if (!audioContext || audioContext.sampleRate !== sampleRate || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
  }
  return audioContext;
};

/**
 * Decodes a Base64 encoded audio string and plays it using the Web Audio API.
 * @param base64Audio The Base64 encoded audio data string.
 */
export const playBase64Audio = async (base64Audio: string): Promise<void> => {
    try {
        const context = getAudioContext(24000); // TTS uses 24000 sample rate
        // Resume context if it's suspended (e.g., due to browser policies)
        if (context.state === 'suspended') {
            await context.resume();
        }

        const audioBytes = decode(base64Audio);
        // Gemini TTS returns single-channel (mono) audio at 24kHz
        const audioBuffer = await decodeAudioData(audioBytes, context, 24000, 1);
        
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        source.start();
    } catch (e) {
        console.error("Failed to play audio:", e);
    }
};

/**
 * Decodes raw PCM audio bytes and returns an AudioBuffer.
 * This is specifically for the Live API's raw audio stream.
 * @param audioBytes The raw Uint8Array audio data.
 * @param sampleRate The sample rate of the audio (e.g., 24000 for Live API output).
 */
export const decodeLiveAudio = async (audioBytes: Uint8Array, sampleRate: number): Promise<AudioBuffer> => {
    const context = getAudioContext(sampleRate);
    if (context.state === 'suspended') {
        await context.resume();
    }
    // Live API returns single-channel (mono) audio
    return await decodeAudioData(audioBytes, context, sampleRate, 1);
};