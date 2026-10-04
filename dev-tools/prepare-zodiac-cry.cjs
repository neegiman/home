// Mechanical atlas slicing only: preserves the generated pixels and alpha.
const sharp = require("sharp");
const fs = require("node:fs/promises");
const path = require("node:path");
const keys = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "boar"];

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("Usage: node prepare-zodiac-cry.cjs atlas.png output-directory");
  await fs.mkdir(output, { recursive: true });
  const metadata = await sharp(input).metadata();
  if (!metadata.hasAlpha || metadata.width % 4 || metadata.height % 6) throw new Error("Expected transparent 4 x 6 atlas");
  const width = metadata.width / 4;
  const height = metadata.height / 6;
  for (let index = 0; index < keys.length; index++) {
    const cells = [];
    for (let frame = 0; frame < 2; frame++) {
      const left = index % 4 * width;
      const top = (Math.floor(index / 4) * 2 + frame) * height;
      const cell = await sharp(input).extract({ left, top, width, height }).png().toBuffer();
      const { data, info } = await sharp(cell).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      // Crop to the character itself, not tiny fragments crossing a tile edge.
      const visited = new Uint8Array(width * height);
      let largest = null;
      for (let seed = 0; seed < visited.length; seed++) {
        if (visited[seed] || data[seed * info.channels + 3] < 24) continue;
        const queue = [seed]; visited[seed] = 1;
        let x1 = width, y1 = height, x2 = -1, y2 = -1;
        for (let head = 0; head < queue.length; head++) {
          const point = queue[head], x = point % width, y = Math.floor(point / width);
          x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y);
          for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
            const nx = x + dx, ny = y + dy, next = ny * width + nx;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height || visited[next] || data[next * info.channels + 3] < 24) continue;
            visited[next] = 1; queue.push(next);
          }
        }
        if (!largest || queue.length > largest.area) largest = { area: queue.length, left: x1, top: y1, width: x2 - x1 + 1, height: y2 - y1 + 1 };
      }
      if (!largest) throw new Error(`Empty ${keys[index]} frame ${frame}`);
      const { area, ...bounds } = largest;
      cells.push({ cell, bounds });
    }
    // Shared scale across both poses; all contact pixels sit at y=247.
    const scale = Math.min(174 / Math.max(...cells.map(c => c.bounds.height)), 232 / Math.max(...cells.map(c => c.bounds.width)));
    const composites = [];
    for (let frame = 0; frame < 2; frame++) {
      const { cell, bounds } = cells[frame];
      const w = Math.round(bounds.width * scale), h = Math.round(bounds.height * scale);
      const sprite = await sharp(cell).extract(bounds).resize(w, h, { kernel: "nearest" }).png().toBuffer();
      composites.push({ input: sprite, left: frame * 256 + Math.round((256 - w) / 2), top: 248 - h });
    }
    await sharp({ create: { width: 512, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(composites).png().toFile(path.join(output, `${keys[index]}.png`));
  }
  console.log(`Prepared ${keys.length} transparent two-frame crying sheets, 512x256, ground y=248.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
