const fs = require('fs');
const { Readable } = require('stream');
const { finished } = require('stream/promises');

async function downloadFile(url, dest) {
  console.log(`Downloading ${url} to ${dest}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  const fileStream = fs.createWriteStream(dest);
  await finished(Readable.fromWeb(res.body).pipe(fileStream));
  console.log(`Successfully downloaded ${dest}`);
}

async function main() {
  try {
    if (!fs.existsSync('public/sounds')) {
      fs.mkdirSync('public/sounds', { recursive: true });
    }
    await Promise.all([
      downloadFile('https://gamesounds.xyz/Kenney%27s%20Sound%20Pack/UI%20Audio/click3.ogg', 'public/sounds/select.ogg'),
      downloadFile('https://gamesounds.xyz/Kenney%27s%20Sound%20Pack/UI%20Audio/switch3.ogg', 'public/sounds/move.ogg'),
      downloadFile('https://gamesounds.xyz/Kenney%27s%20Sound%20Pack/UI%20Audio/switch33.ogg', 'public/sounds/win.ogg')
    ]);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
