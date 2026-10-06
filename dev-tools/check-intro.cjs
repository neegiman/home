// Opening regression checks; browser behavior is checked separately.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const intro=fs.readFileSync(path.join(root,'sunset-intro.js'),'utf8');
for(const [label,source] of [['HTML',html],['app',app],['opening',intro]])assert.ok(!source.includes('PIXEL CLASH'),label+' uses current brand');
assert.ok(html.includes('<title>운명의 한판 — 랜덤 토너먼트</title>'));
assert.ok(html.includes('aria-label="운명의 한판"'));
assert.ok(intro.includes('const text = "운명의 한판"'));
assert.ok(app.includes('운명의 한판 토너먼트 결과를 확인하세요!'));
// Keep the legacy storage key so a title rename does not replay seen openings.
assert.ok(html.includes('pixel-clash-sunset-seen-v1')&&intro.includes('pixel-clash-sunset-seen-v1'));
for(const id of ['sunsetIntro','sunsetScene','sunsetTitle','skipSunsetIntro','registrationView','animationView','tournamentAnimation','tournamentView','finalStairView','finalStairAnimation','resultView','resultIntro'])assert.ok(html.includes(`id="${id}"`),id+' present');
assert.ok(html.includes('navigation !== "reload"'));
assert.ok(html.includes('navigation !== "back_forward"'));
assert.ok(html.includes('prefers-reduced-motion: reduce'));
assert.ok(html.includes('params.has("share")'));
assert.ok(/showOnly\("registration"\);\s+window.SunsetIntro\?\.start\(\);/.test(app));
assert.ok(intro.includes('const DURATION = 5000'));
assert.ok(intro.includes('cancelAnimationFrame(this.frame)'));
assert.ok(intro.includes('gl.deleteTexture(texture)'));
assert.ok(intro.includes('this.registration.inert = false'));
assert.ok(!html.includes('src="intro.js')&&!html.includes('<video'));
for(const file of ['index.html','app.js','styles.css','characters.js','sunset-intro.js','assets/intro/sunset-v1/seascape.webp'])assert.ok(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(root,'dist',file))),file+' root/dist parity');
assert.ok(fs.statSync(path.join(root,'assets/intro/sunset-v1/seascape.webp')).size < 1000000,'single optimized local image');
console.log('PASS: 5s sunset opening, once/reload/URL/reduced-motion guards, cleanup, local asset and root/dist parity.');
