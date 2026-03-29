const fs = require('fs');
function writeWav(filename, type) {
  const sampleRate = 44100;
  const length = type === 'win' ? sampleRate * 1.5 : sampleRate * 0.1;
  const buffer = Buffer.alloc(44 + length * 2);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(length * 2, 40);
  
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let val = 0;
    if (type === 'move') {
      val = Math.sin(2 * Math.PI * 150 * t) * Math.exp(-30 * t);
    } else if (type === 'select') {
      val = Math.sin(2 * Math.PI * 400 * t) * Math.exp(-40 * t);
    } else {
      val = (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 554 * t) + Math.sin(2 * Math.PI * 659 * t)) * Math.exp(-3 * t) * 0.3;
    }
    // clamp and convert to 16-bit PCM
    val = Math.max(-1, Math.min(1, val));
    buffer.writeInt16LE(Math.floor(val * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filename, buffer);
}
writeWav('public/sounds/move.wav', 'move');
writeWav('public/sounds/select.wav', 'select');
writeWav('public/sounds/win.wav', 'win');
