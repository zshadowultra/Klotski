let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();

let soundUrls: { move: string; select: string; win: string } | null = null;

export function initAudioSync() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      
      // Attach global listeners to ensure audio context resumes on any user interaction
      const resumeAudio = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        // Remove listeners once running
        if (audioCtx && audioCtx.state === 'running') {
          ['click', 'touchstart', 'keydown', 'mousedown'].forEach(evt => {
            document.removeEventListener(evt, resumeAudio);
          });
        }
      };

      ['click', 'touchstart', 'keydown', 'mousedown', 'pointerdown'].forEach(evt => {
        document.addEventListener(evt, resumeAudio, { once: true, capture: true });
      });
    }
  }
}

let initPromise: Promise<void> | null = null;

export async function initAudio(urls: { move: string; select: string; win: string }) {
  soundUrls = urls;
  initAudioSync();
  if (!audioCtx) return;

  if (audioCtx.state === 'closed') {
    initPromise = null;
    audioCtx = null;
    initAudioSync();
    if (!audioCtx) return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      if (audioCtx!.state === 'suspended') {
        await audioCtx!.resume().catch(() => {});
      }
      // Do NOT pre-decode here. Decoding requires the context to be running,
      // which requires a user gesture. Lazy decode in getBuffer handles this.
    })().catch((err) => {
      initPromise = null; // Reset so next call can retry
      throw err;
    });
  }
  return initPromise;
}

async function getBuffer(soundName: 'move' | 'select' | 'win'): Promise<AudioBuffer> {
  if (bufferCache.has(soundName)) {
    return bufferCache.get(soundName)!;
  }

  if (!audioCtx) throw new Error('[soundManager] No AudioContext');

  // CRITICAL: Must be running before decode — iOS Safari throws if suspended
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  if (audioCtx.state !== 'running') {
    throw new Error(`[soundManager] Context not running: ${audioCtx.state}`);
  }

  if (!soundUrls) throw new Error('[soundManager] URLs not set');

  const url = soundUrls[soundName];
  const res = await fetch(url);

  if (!res.ok) throw new Error(`[soundManager] HTTP ${res.status} for ${url}`);

  const contentType = res.headers.get('content-type') ?? 'unknown';
  const arrayBuffer = await res.arrayBuffer();

  if (arrayBuffer.byteLength === 0) {
    throw new Error(`[soundManager] Empty buffer for ${soundName}`);
  }

  // Promise-ONLY form. Never mix callbacks and promise on the same decode call.
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  bufferCache.set(soundName, audioBuffer);

  // After first successful decode, silently warm up remaining sounds in background.
  // This runs fire-and-forget so it never blocks the caller.
  (['move', 'select', 'win'] as const).forEach(name => {
    if (!bufferCache.has(name)) {
      getBuffer(name).catch(() => {});
    }
  });

  return audioBuffer;
}

export async function playSound(soundName: 'move' | 'win' | 'select', volume: number = 1.0) {
  try {
    initAudioSync();
    if (!audioCtx) return;
    
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    if (audioCtx.state !== 'running') {
      console.warn('[soundManager] AudioContext state:', audioCtx.state);
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
