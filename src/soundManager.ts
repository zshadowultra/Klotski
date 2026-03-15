let audioCtx: AudioContext | null = null;
const bufferCache = new Map<string, AudioBuffer>();

export async function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  
  // Pre-load sounds to avoid latency during gameplay
  const soundNames = ['move', 'win', 'select'] as const;
  await Promise.all(soundNames.map(name => getBuffer(name)));
}

async function getBuffer(soundName: string): Promise<AudioBuffer> {
  if (bufferCache.has(soundName)) {
    return bufferCache.get(soundName)!;
  }

  const res = await fetch(`/sounds/${soundName}.ogg`);
  const arrayBuffer = await res.arrayBuffer();
  const audioBuffer = await audioCtx!.decodeAudioData(arrayBuffer);
  bufferCache.set(soundName, audioBuffer);
  return audioBuffer;
}

export async function playSound(soundName: 'move' | 'win' | 'select', volume: number = 1.0) {
  try {
    await initAudio();
    const buffer = await getBuffer(soundName);
    
    const source = audioCtx!.createBufferSource();
    const gainNode = audioCtx!.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(audioCtx!.destination);
    
    source.start(0);
  } catch (err) {
    console.error('Error playing sound:', err);
  }
}
