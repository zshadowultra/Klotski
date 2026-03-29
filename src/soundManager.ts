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
          
          // Play silence to unlock on iOS
          const buffer = audioCtx.createBuffer(1, 1, 22050);
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);
          source.start(0);
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

function createSyntheticSound(ctx: AudioContext, type: 'move' | 'select' | 'win'): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = type === 'win' ? sampleRate * 1.5 : sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    if (type === 'move') {
      // Short woody knock
      data[i] = Math.sin(2 * Math.PI * 150 * t) * Math.exp(-30 * t);
    } else if (type === 'select') {
      // Short click
      data[i] = Math.sin(2 * Math.PI * 400 * t) * Math.exp(-40 * t);
    } else {
      // Win chime
      data[i] = (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 554 * t) + Math.sin(2 * Math.PI * 659 * t)) * Math.exp(-3 * t) * 0.3;
    }
  }
  return buffer;
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
    try {
      const res = await fetch(soundUrls![soundName]);
      if (!res.ok) throw new Error(`[soundManager] HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        const decodeResult = audioCtx!.decodeAudioData(
          arrayBuffer,
          (buffer) => resolve(buffer),
          (err) => reject(err)
        );
        if (decodeResult) {
          decodeResult.then(resolve).catch(reject);
        }
      });
      bufferCache.set(soundName, audioBuffer);
      return audioBuffer;
    } catch (err) {
      console.warn(`[soundManager] Failed to load or decode ${soundName} sound, falling back to synthetic sound.`, err);
      const synthBuffer = createSyntheticSound(audioCtx, soundName);
      bufferCache.set(soundName, synthBuffer);
      return synthBuffer;
    }
  })();

  fetchPromises.set(soundName, promise);
  return promise;
}

export function getAudioTime(): number {
  return audioCtx ? audioCtx.currentTime : 0;
}

export async function playSound(soundName: 'move' | 'win' | 'select', volume: number = 1.0, time?: number, playbackRate: number = 1.0) {
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
    source.playbackRate.value = playbackRate;
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    source.start(time !== undefined ? time : 0);
  } catch (err) {
    console.error('Error playing sound:', err);
  }
}
