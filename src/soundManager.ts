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
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

export async function initAudio(urls: { move: string; select: string; win: string }) {
  soundUrls = urls;
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

  if (!soundUrls) {
    throw new Error('Sound URLs not initialized');
  }

  const url = soundUrls[soundName];
  console.log(`Fetching sound: ${soundName} from URL: ${url}`);
  
  const res = await fetch(url);
  console.log(`Fetch response for ${soundName}:`, res.status, res.statusText, res.headers.get('content-type'));
  
  if (!res.ok) {
    throw new Error(`Failed to fetch sound: ${url} (Status: ${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  console.log(`Fetched arrayBuffer for ${soundName}, length: ${arrayBuffer.byteLength}`);
  
  const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
    try {
      if (!audioCtx) {
        reject(new Error('AudioContext not initialized'));
        return;
      }
      const decodePromise = audioCtx.decodeAudioData(
        arrayBuffer,
        (buffer) => resolve(buffer),
        (err) => reject(err)
      );
      if (decodePromise) {
        decodePromise.then(resolve).catch(reject);
      }
    } catch (e) {
      console.error(`Decoding error for ${soundName}:`, e);
      reject(e);
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
