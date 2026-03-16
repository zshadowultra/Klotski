import moveSoundUrl from './assets/sounds/move.ogg';
import selectSoundUrl from './assets/sounds/select.ogg';
import winSoundUrl from './assets/sounds/win.ogg';

const soundUrls: Record<string, string> = {
  move: moveSoundUrl,
  select: selectSoundUrl,
  win: winSoundUrl,
};

let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();

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

async function getBuffer(soundName: string): Promise<AudioBuffer> {
  if (bufferCache.has(soundName)) {
    return bufferCache.get(soundName)!;
  }

  const url = soundUrls[soundName];
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch sound: ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const audioBuffer = await audioCtx!.decodeAudioData(arrayBuffer);
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
