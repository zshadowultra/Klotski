const fs = require('fs');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const files = ['select', 'move', 'win'];

for (const file of files) {
  const input = `public/sounds/${file}.ogg`;
  const output = `public/sounds/${file}.mp3`;
  console.log(`Converting ${input} to ${output}...`);
  try {
    execSync(`"${ffmpeg}" -i "${input}" -y "${output}"`, { stdio: 'inherit' });
    console.log(`Done converting ${file}`);
  } catch (err) {
    console.error(`Failed to convert ${file}`, err);
  }
}
