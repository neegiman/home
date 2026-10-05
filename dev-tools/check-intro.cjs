// Read-only checks for opening assets, routing and the cutscene timeline.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const sharp = require("sharp");
const root = path.resolve(__dirname, "..");

async function main() {
  const metadata = JSON.parse(await fs.readFile(path.join(root, "assets/characters/intro-archer-taegeuk-v2.json"), "utf8"));
  const { data, info } = await sharp(path.join(root, "assets/characters/intro-archer-taegeuk-v2.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 384); assert.equal(info.height, 384);
  assert.equal(metadata.frames.length, 9); assert.equal(metadata.cell, 128);
  const hashes = new Set();
  for (let index = 0; index < 9; index++) {
    const cell = Buffer.alloc(128 * 128 * 4);
    let count = 0, bottom = -1;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const from = ((Math.floor(index / 3) * 128 + y) * 384 + index % 3 * 128 + x) * 4;
      data.copy(cell, (y * 128 + x) * 4, from, from + 4);
      if (data[from + 3] < 24) continue;
      count++; bottom = Math.max(bottom, y);
      assert.ok(x >= 3 && x <= 124 && y >= 3 && y <= 124, `Unclipped transparent margin: frame ${index}`);
    }
    assert.ok(count > 1200, `Complete sprite: frame ${index}`);
    assert.equal(bottom, 123, `Shared boot baseline: frame ${index}`);
    assert.equal(metadata.frames[index].headX, 45);
    hashes.add(crypto.createHash("sha256").update(cell).digest("hex"));
  }
  assert.equal(hashes.size, 9, "Every pose has distinct sprite pixels");

  const storage = new Map();
  const local = new Map();
  let navigationType = "navigate";
  const sessionStore = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  const localStore = { getItem: key => local.get(key), setItem: (key, value) => local.set(key, value) };
  const sandbox = {
    window: { sessionStorage: sessionStore, localStorage: localStore, performance: { getEntriesByType: () => [{ type: navigationType }] } },
    location: { href: "https://example.com/home/", search: "" },
    URL, URLSearchParams,
    document: { documentElement: { classList: { add() {} } } }
  };
  vm.runInNewContext(await fs.readFile(path.join(root, "intro.js"), "utf8"), sandbox);
  const Intro = sandbox.window.IntroAnimation;
  assert.ok(Intro.shouldPlay(new URLSearchParams()));
  for (const search of ["mode=tournament", "mode=tournament&intro=1", "share=abc", "share=abc&intro=1"]) {
    assert.equal(Intro.shouldPlay(new URLSearchParams(search)), false, `Direct link: ${search}`);
  }
  storage.set("pixel-clash:opening:v1:/home/", "seen");
  assert.equal(Intro.shouldPlay(new URLSearchParams()), false, "Same-session reload skips opening");
  assert.ok(Intro.shouldPlay(new URLSearchParams("intro=1")), "Explicit development replay");
  Intro.rememberVisit();
  storage.clear(); Intro.seen = false;
  assert.equal(Intro.shouldPlay(new URLSearchParams()), false, "Later browser visit uses persistent record");
  local.clear(); navigationType = "reload";
  assert.equal(Intro.shouldPlay(new URLSearchParams()), false, "Reload skips even without a stored record");
  assert.equal(Intro.shouldPlay(new URLSearchParams("intro=1")), false, "Debug URL reload also skips");
  sandbox.window.sessionStorage = sandbox.window.localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(Intro.shouldPlay(new URLSearchParams()), false, "Storage-blocked reload skips");
  navigationType = "navigate";
  Intro.rememberVisit();
  assert.equal(Intro.shouldPlay(new URLSearchParams()), false, "Same-page memory fallback");
  const timeline = [[0,"INTRO_DARK"],[800,"ARCHER_DRAW"],[2000,"FULL_TENSION"],[2120,"ARROW_RELEASE"],[2900,"ARROW_FOLLOW"],[3500,"TARGET_HIT"],[4700,"TITLE_REVEAL"],[5150,"PAGE_TRANSITION"]];
  for (const [time, state] of timeline) assert.equal(Intro.prototype.stateAt.call({ reduced: false }, time).name, state);
  assert.equal(Intro.prototype.stateAt.call({ reduced: true }, 100).name, "TITLE_REVEAL");
  assert.equal(Intro.prototype.stateAt.call({ reduced: true }, 500).name, "PAGE_TRANSITION");

  for (const file of ["index.html", "styles.css", "app.js", "intro.js", "assets/characters/intro-archer-taegeuk-v2.png", "assets/characters/intro-archer-taegeuk-v2.json"]) {
    const source = await fs.readFile(path.join(root, file)), deployed = await fs.readFile(path.join(root, "dist", file));
    assert.ok(source.equals(deployed), `Root / deployment copy matches: ${file}`);
  }
  console.log(JSON.stringify({ pass: true, distinctPoses: hashes.size, baseResolution: "128x128", timeline: timeline.map(([, name]) => name), directLinksSkip: true, sessionReplaySkip: true, persistentVisitSkip: true, reloadAlwaysSkip: true, reducedMotion: true, distParity: true }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
