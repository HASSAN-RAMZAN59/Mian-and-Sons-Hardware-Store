// Usage:
// 1. npm install --save-dev png-to-ico
// 2. node tools/generate-favicon.js

const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

// Prefer the explicit user-provided fevicon.jpeg if present, otherwise fallback to store-logo.png
const candidates = [
  path.join(__dirname, '..', 'public', 'images', 'fevicon.jpeg'),
  path.join(__dirname, '..', 'build', 'images', 'fevicon.jpeg'),
  path.join(__dirname, '..', 'public', 'images', 'store-logo.png'),
  path.join(__dirname, '..', 'public', 'images', 'store-logo.jpeg')
];

let src = null;
for (const c of candidates) {
  if (fs.existsSync(c)) { src = c; break; }
}

if (!src) {
  console.error('No source image found. Checked:', candidates.join('\n'));
  process.exit(1);
}
const dest = path.join(__dirname, '..', 'public', 'favicon.ico');

if (!fs.existsSync(src)) {
  console.error('Source image not found:', src);
  process.exit(1);
}

pngToIco(src)
  .then(buf => fs.writeFileSync(dest, buf))
  .then(() => console.log('favicon.ico generated at', dest))
  .catch(err => {
    console.error('Failed to generate favicon:', err);
    process.exit(1);
  });
