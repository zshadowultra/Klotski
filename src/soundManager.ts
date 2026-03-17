let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();
const fetchPromises = new Map<string, Promise<AudioBuffer>>();

let soundUrls: { move: string; select: string; win: string } | null = null;

export function initAudioSync() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      
      const resumeAudio = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
      };

      ['click', 'touchstart', 'keydown', 'mousedown', 'pointerdown'].forEach(evt => {
        document.addEventListener(evt, resumeAudio, { once: true, capture: true });
      });
    }
  }
}

export async function initAudio(urls: { move: string; select: string; win: string }) {
  soundUrls = urls;
  initAudioSync();
  
  if (audioCtx?.state === 'suspended') {
    await audioCtx.resume().catch(() => {});
  }
  
  // Safely warm up the cache without race conditions
  if (urls) {
    getBuffer('move').catch(() => {});
    getBuffer('select').catch(() => {});
    getBuffer('win').catch(() => {});
  }
}

async function getBuffer(soundName: 'move' | 'select' | 'win'): Promise<AudioBuffer> {
  // 1. Return immediately if already decoded
  if (bufferCache.has(soundName)) {
    return bufferCache.get(soundName)!;
  }
  
  // 2. Return the existing promise if currently fetching (prevents rapid-fire crashing)
  if (fetchPromises.has(soundName)) {
    return fetchPromises.get(soundName)!;
  }
  
  if (!audioCtx || !soundUrls) throw new Error('[soundManager] Not initialized');

  const promise = (async () => {
    const res = await fetch(soundUrls![soundName]);
    if (!res.ok) throw new Error(`[soundManager] HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    bufferCache.set(soundName, audioBuffer);
    return audioBuffer;
  })();

  fetchPromises.set(soundName, promise);
  return promise;
}

export async function playSound(soundName: 'move' | 'win' | 'select', volume: number = 1.0) {
  try {
    initAudioSync();
    if (!audioCtx) return;
    
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    
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
