// Read-only checks for opening assets, routing and the cutscene timeline.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const sharp = require("sharp");
const root = path.resolve(__dirname, "..");

async function main() {
  const directory = "assets/intro/cinematic-v3";
  const metadata = JSON.parse(await fs.readFile(path.join(root, directory, "manifest.json"), "utf8"));
  const { data, info } = await sharp(path.join(root, directory, "archer-poses.webp")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, metadata.cell * 3); assert.equal(info.height, metadata.cell * 3);
  assert.equal(metadata.frames.length, 9); assert.ok(metadata.cell >= 400);
  const size = metadata.cell;
  const hashes = new Set();
  for (let index = 0; index < 9; index++) {
    const cell = Buffer.alloc(size * size * 4);
    let count = 0, bottom = -1;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const from = ((Math.floor(index / 3) * size + y) * info.width + index % 3 * size + x) * 4;
      data.copy(cell, (y * size + x) * 4, from, from + 4);
      if (data[from + 3] < 24) continue;
      count++; bottom = Math.max(bottom, y);
      assert.ok(x >= 14 && x <= size - 15 && y >= 14 && y <= size - 15, `Padded transparent margin: frame ${index}`);
    }
    assert.ok(count > 15000, `Complete photographic pose: frame ${index}`);
    assert.ok(bottom >= size - 22, `Shared hip baseline: frame ${index}`);
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
  const timeline = [[0,"INTRO_DARK"],[800,"ARCHER_REAR_VIEW"],[1900,"BOW_DRAW"],[2250,"ARROW_RELEASE"],[2900,"ARROW_RELEASE"],[3500,"TARGET_HIT"],[4300,"TARGET_PIXEL_TRANSFORM"],[4850,"PIXEL_CLASH_TRANSITION"]];
  for (const [time, state] of timeline) assert.equal(Intro.prototype.stateAt.call({ reduced: false }, time).name, state);
  assert.equal(Intro.prototype.stateAt.call({ reduced: true }, 100).name, "PIXEL_CLASH_TRANSITION");
  assert.equal(Intro.prototype.stateAt.call({ reduced: true }, 100).progress, 0);
  assert.equal(Intro.prototype.stateAt.call({ reduced: true }, 600).progress, 1);
  const poseSet = new Set();
  for (let time = 0; time < 2600; time += 10) poseSet.add(Intro.prototype.poseAt.call({}, time).frame);
  assert.equal(poseSet.size, 9);
  assert.equal(Intro.prototype.poseAt.call({}, 2199).frame, 5, "Full tension held before release");
  assert.equal(Intro.prototype.poseAt.call({}, 2200).frame, 6, "Release pose starts at 2.2s");
  const targetStart = Intro.prototype.targetLayout.call({ width: 1440, height: 900 }, 3000);
  const targetEnd = Intro.prototype.targetLayout.call({ width: 1440, height: 900 }, 4750);
  assert.deepEqual(targetStart, targetEnd, "Bullseye anchor does not jump during transformation");
  sandbox.innerWidth = 1440; sandbox.innerHeight = 900; sandbox.devicePixelRatio = 2;
  const geometry = { canvas: {}, context: { setTransform() {} }, pixelWorld: {}, running: false, targetLayout: Intro.prototype.targetLayout };
  Intro.prototype.resize.call(geometry);
  assert.equal(geometry.canvas.width, 1920, "Cinematic canvas retains high resolution");
  assert.ok(geometry.pixelWorld.width < geometry.canvas.width / 2, "Pixel world is a separate low-res layer");
  const ordered = [...geometry.cells].sort((a,b) => Math.hypot(a.x-targetStart.x,a.y-targetStart.y) - Math.hypot(b.x-targetStart.x,b.y-targetStart.y));
  assert.ok(ordered[0].at < .03, "Transformation begins at impact center");
  assert.ok(ordered.at(-1).at > .9, "Screen corners remain photographic until late");
  const coverage = progress => geometry.cells.filter(cell => cell.at <= progress).length / geometry.cells.length;
  assert.ok(coverage(.1) < .05, "Small initial portal, not whole-screen pixelation");
  assert.ok(coverage(.48) < .5, "Target converts before most of the arena");
  assert.equal(coverage(1), 1, "Complete conversion reaches all cells");
  const code = await fs.readFile(path.join(root, "intro.js"), "utf8");
  assert.ok(!code.includes("intro-archer-taegeuk"), "Old pixel archer is no longer used");
  assert.ok(code.includes("class CinematicIntroAnimation"));

  for (const file of ["index.html", "styles.css", "app.js", "intro.js", ...["archer-poses.webp", "arena.webp", "target.webp", "arrow.webp", "manifest.json"].map(file => `${directory}/${file}`)]) {
    const source = await fs.readFile(path.join(root, file)), deployed = await fs.readFile(path.join(root, "dist", file));
    assert.ok(source.equals(deployed), `Root / deployment copy matches: ${file}`);
  }
  console.log(JSON.stringify({ pass: true, distinctPoses: hashes.size, photographicPoseResolution: `${size}x${size}`, timeline: timeline.map(([, name]) => name), exactBullseyeAnchor: true, directLinksSkip: true, sessionReplaySkip: true, persistentVisitSkip: true, reloadAlwaysSkip: true, reducedMotion: true, distParity: true }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
