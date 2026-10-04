const assert = require("node:assert/strict");
const path = require("node:path");
const sharp = require("sharp");
const keys = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "boar"];
(async () => {
  for (const key of keys) {
    const image = sharp(path.join(__dirname, "../assets/characters/zodiac-cry-v1", `${key}.png`));
    const metadata = await image.metadata();
    assert.equal(metadata.width, 512); assert.equal(metadata.height, 256); assert.equal(metadata.hasAlpha, true);
    const frames = [];
    for (let frame = 0; frame < 2; frame++) {
      const { data, info } = await image.clone().extract({ left: frame * 256, top: 0, width: 256, height: 256 }).raw().toBuffer({ resolveWithObject: true });
      let count = 0, top = 256, bottom = 0, left = 256, right = 0;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        if (data[(y * 256 + x) * info.channels + 3] < 24) continue;
        count++; top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x);
      }
      assert(count > 4000, `${key} ${frame}: missing body`);
      assert(bottom >= 246 && bottom <= 247, `${key} ${frame}: off-ground`);
      assert(top >= 73, `${key} ${frame}: oversized seated body`);
      assert(left >= 10 && right <= 245, `${key} ${frame}: clipped sprite`);
      frames.push(data);
    }
    assert(!frames[0].equals(frames[1]), `${key}: duplicate crying frames`);
  }
  console.log("PASS: all 12 characters have two distinct, transparent, ground-aligned seated crying frames.");
})().catch(error => { console.error(error); process.exitCode = 1; });
