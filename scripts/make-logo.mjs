import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

async function makeLogo() {
  const inputPath = 'C:/Users/KRISHNA/.gemini/antigravity/brain/d929efd7-b2be-41ee-b9dc-e33a8080ac7c/.user_uploaded/media_1790009752278.png';
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Flood fill to distinguish outer background from inside the raccoon
  const isBg = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let qStart = 0;
  let qEnd = 0;

  function push(idx) {
    if (!isBg[idx]) {
      isBg[idx] = 1;
      queue[qEnd++] = idx;
    }
  }

  // Border seeds
  for (let x = 0; x < width; x++) {
    if (data[x * 4] > 200) push(x);
    const btm = (height - 1) * width + x;
    if (data[btm * 4] > 200) push(btm);
  }
  for (let y = 0; y < height; y++) {
    if (data[y * width * 4] > 200) push(y * width);
    const rgt = y * width + (width - 1);
    if (data[rgt * 4] > 200) push(rgt);
  }

  while (qStart < qEnd) {
    const curr = queue[qStart++];
    const cx = curr % width;
    const cy = Math.floor(curr / width);

    const nx = [cx + 1, cx - 1, cx, cx];
    const ny = [cy, cy, cy + 1, cy - 1];

    for (let k = 0; k < 4; k++) {
      const x = nx[k];
      const y = ny[k];
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const nIdx = y * width + x;
        if (!isBg[nIdx]) {
          const r = data[nIdx * 4];
          const g = data[nIdx * 4 + 1];
          const b = data[nIdx * 4 + 2];
          if (r > 190 && g > 190 && b > 190) {
            push(nIdx);
          }
        }
      }
    }
  }

  // Create clean raccoon:
  // - Exterior background = transparent
  // - Internal raccoon highlights = pure white (#FFFFFF)
  // - Internal raccoon fur/features = rich black (#0D0E12)
  const rawRaccoon = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (isBg[i]) {
      rawRaccoon[i * 4] = 0;
      rawRaccoon[i * 4 + 1] = 0;
      rawRaccoon[i * 4 + 2] = 0;
      rawRaccoon[i * 4 + 3] = 0;
    } else {
      const r = data[i * 4];
      if (r > 130) {
        // Facial white
        rawRaccoon[i * 4] = 255;
        rawRaccoon[i * 4 + 1] = 255;
        rawRaccoon[i * 4 + 2] = 255;
        rawRaccoon[i * 4 + 3] = 255;
      } else {
        // Black fur, mask, bowtie
        rawRaccoon[i * 4] = 13;
        rawRaccoon[i * 4 + 1] = 14;
        rawRaccoon[i * 4 + 2] = 18;
        rawRaccoon[i * 4 + 3] = 255;
      }
    }
  }

  const cropped = await sharp(rawRaccoon, { raw: { width, height, channels: 4 } })
    .extract({ left: 135, top: 75, width: 245, height: 235 })
    .png()
    .toBuffer();

  const outDir = path.resolve('src/renderer/assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'bond-logo.png'), cropped);

  // App icon
  const buildDir = path.resolve('build');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

  // For build/icon.png: 256x256 on a crisp rounded badge
  const iconBase = await sharp({
    create: {
      width: 256,
      height: 256,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([{
    input: await sharp(cropped).resize(220, 220, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    gravity: 'center'
  }])
  .png()
  .toBuffer();

  fs.writeFileSync(path.join(buildDir, 'icon.png'), iconBase);

  // Base64 helper
  const b64 = (await sharp(cropped).resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()).toString('base64');
  fs.writeFileSync(path.join(outDir, 'bond-logo-b64.js'), `export const BOND_LOGO_B64 = "data:image/png;base64,${b64}";\n`);

  console.log('Successfully generated clean logo assets!');
}

makeLogo().catch(console.error);
