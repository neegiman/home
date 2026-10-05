// Mechanical atlas padding / WebP packaging only. Artwork comes from ImageGen.
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const [archerPath, arenaPath, targetPath, arrowPath] = process.argv.slice(2);
  if (!targetPath) throw new Error("Usage: node prepare-cinematic-intro.cjs <archer.png> <arena.png> <target.png>");
  const root = path.resolve(__dirname, "..");
  const directory = path.join(root, "assets/intro/cinematic-v3");
  await fs.mkdir(directory, { recursive: true });
  const meta = await sharp(archerPath).metadata();
  if (meta.width !== meta.height || meta.width % 3) throw new Error("Expected square 3x3 atlas");
  const sourceCell = meta.width / 3, margin = 15, cell = sourceCell + margin * 2;
  const layers = [];
  const names = ["rear-idle", "rear-breeze", "raise-bow", "draw-01", "draw-02", "full-tension", "release-01", "release-02", "follow-through"];
  for (let i = 0; i < 9; i++) {
    const input = await sharp(archerPath).extract({ left: i % 3 * sourceCell, top: Math.floor(i / 3) * sourceCell, width: sourceCell, height: sourceCell }).png().toBuffer();
    const raw = await sharp(input).ensureAlpha().raw().toBuffer();
    let bottom = 0;
    for (let y = 0; y < sourceCell; y++) for (let x = 0; x < sourceCell; x++) if (raw[(y * sourceCell + x) * 4 + 3] >= 128) bottom = y;
    layers.push({ input, left: i % 3 * cell + margin, top: Math.floor(i / 3) * cell + margin + sourceCell - 2 - bottom });
  }
  await sharp({ create: { width: cell * 3, height: cell * 3, channels: 4, background: "#00000000" } }).composite(layers).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(directory, "archer-poses.webp"));
  await sharp(arenaPath).resize({ width: 1672, withoutEnlargement: true }).webp({ quality: 90, effort: 6 }).toFile(path.join(directory, "arena.webp"));
  await sharp(targetPath).trim({ threshold: 10 }).resize(960, 960, { fit: "contain", background: "#00000000" }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(directory, "target.webp"));
  if (arrowPath) {
    const { data, info } = await sharp(arrowPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 128) {
      minX = Math.min(minX,x); maxX = Math.max(maxX,x); minY = Math.min(minY,y); maxY = Math.max(maxY,y);
    }
    const tipRows = [];
    for (let y = minY; y <= maxY; y++) if (data[(y * info.width + maxX) * 4 + 3] > 128) tipRows.push(y);
    const centerY = Math.round(tipRows.reduce((sum,y) => sum + y,0) / tipRows.length);
    const radius = Math.max(centerY - minY,maxY - centerY) + 3;
    await sharp(arrowPath).extract({ left:minX-2, top:centerY-radius, width:maxX-minX+5, height:radius*2+1 }).resize({ width:1400, withoutEnlargement:true }).webp({ quality:95, alphaQuality:100, effort:6 }).toFile(path.join(directory, "arrow.webp"));
  }
  // Shared lower-body baseline with translation-only padding. No stretching,
  // rotation, silhouette deformation or recoloring is performed.
  const metadata = { cell, columns: 3, rows: 3, margin, style: "photographic rear-view adult female archer", anchor: { x: (270 + margin) / cell, y: (415 + margin) / cell }, mirrorForDownrange: true, frames: names.map((name, index) => ({ name, index })), targetAnchor: { x: .5, y: .5 } };
  await fs.writeFile(path.join(directory, "manifest.json"), JSON.stringify(metadata, null, 2) + "\n");
  console.log(JSON.stringify({ directory, cell, poses: names, assets: await fs.readdir(directory) }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
