import moveSound from './assets/sounds/move.mp3';
import selectSound from './assets/sounds/select.mp3';
import winSound from './assets/sounds/win.mp3';

let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();

const soundUrls = {
  move: moveSound,
  select: selectSound,
  win: winSound
};

export function initAudioSync() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

export async function initAudio() {
  initAudioSync();
  if (!audioCtx) return;
  
  // Pre-load sounds to avoid latency during gameplay
  const soundNames = ['move', 'win', 'select'] as const;
  await Promise.all(soundNames.map(name => getBuffer(name)));
}

async function getBuffer(soundName: 'move' | 'select' | 'win'): Promise<AudioBuffer> {
  if (bufferCache.has(soundName)) {
    return bufferCache.get(soundName)!;
  }

  const url = soundUrls[soundName];
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch sound: ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  
  const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
    const decodePromise = audioCtx!.decodeAudioData(
      arrayBuffer,
      (buffer) => resolve(buffer),
      (err) => reject(err)
    );
    if (decodePromise) {
      decodePromise.then(resolve).catch(reject);
    }
  });

  bufferCache.set(soundName, audioBuffer);
  return audioBuffer;
}

export async function playSound(soundName: 'move' | 'win' | 'select', volume: number = 1.0) {
  try {
    initAudioSync();
    if (!audioCtx) return;
    
    const buffer = await getBuffer(soundName);
    
    const source = audioCtx.createBufferSource();
    const gainNode = audioCtx.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    source.start(0);
  } catch (err) {
    console.error('Error playing sound:', err);
  }
}
