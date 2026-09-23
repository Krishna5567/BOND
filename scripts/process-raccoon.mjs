import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const inputPath = 'C:/Users/KRISHNA/.gemini/antigravity/brain/d929efd7-b2be-41ee-b9dc-e33a8080ac7c/.user_uploaded/media_1790009752278.png';
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

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

  // Push borders
  for (let x = 0; x < width; x++) {
    const top = x;
    const btm = (height - 1) * width + x;
    if (data[top * 4] > 200) push(top);
    if (data[btm * 4] > 200) push(btm);
  }
  for (let y = 0; y < height; y++) {
    const lft = y * width;
    const rgt = y * width + (width - 1);
    if (data[lft * 4] > 200) push(lft);
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

  console.log(`Found ${qEnd} background pixels out of ${width * height}`);

  // Create clean version:
  // - Background = transparent
  // - White parts of raccoon = pure white (#ffffff)
  // - Black parts of raccoon = rich black (#0a0a0a)
  const rawRaccoon = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (isBg[i]) {
      rawRaccoon[i * 4] = 0;
      rawRaccoon[i * 4 + 1] = 0;
      rawRaccoon[i * 4 + 2] = 0;
      rawRaccoon[i * 4 + 3] = 0;
    } else {
      const r = data[i * 4];
      if (r > 140) {
        // White facial highlights
        rawRaccoon[i * 4] = 255;
        rawRaccoon[i * 4 + 1] = 255;
        rawRaccoon[i * 4 + 2] = 255;
        rawRaccoon[i * 4 + 3] = 255;
      } else {
        // Black fur and mask
        rawRaccoon[i * 4] = 12;
        rawRaccoon[i * 4 + 1] = 14;
        rawRaccoon[i * 4 + 2] = 16;
        rawRaccoon[i * 4 + 3] = 255;
      }
    }
  }

  // Crop to bounding box (135, 75, 245, 235)
  const cropped = await sharp(rawRaccoon, { raw: { width, height, channels: 4 } })
    .extract({ left: 135, top: 75, width: 245, height: 235 })
    .png()
    .toBuffer();

  // Save the pure raccoon
  fs.writeFileSync('src/renderer/assets/bond-logo.png', cropped);
  console.log('Saved pure raccoon to src/renderer/assets/bond-logo.png');
}

main().catch(console.error);
