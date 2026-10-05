// Regression check: registration opens directly; only the opening was removed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
for(const token of ['intro.js','introView','introVideo','introAnimation','skipIntro'])assert.ok(!html.includes(token),token+' removed');
assert.ok(!app.includes('IntroAnimation'));assert.ok(!app.includes('showOnly("intro")'));
assert.ok(/renderDraftParticipants\(\);\s+showOnly\("registration"\);/.test(app));
for(const token of ['intro-pending','intro-playing','.intro-view','#introVideo','#introAnimation'])assert.ok(!css.includes(token),token+' CSS removed');
for(const file of ['intro.js','dist/intro.js'])assert.ok(!fs.existsSync(path.join(root,file)),file+' removed');
for(const id of ['registrationView','animationView','tournamentAnimation','tournamentView','finalStairView','finalStairAnimation','resultView','resultIntro'])assert.ok(html.includes(`id="${id}"`),id+' preserved');
assert.ok(app.includes('params.get("share")'));assert.ok(app.includes('params.get("mode") === "tournament"'));
assert.ok(css.includes('.result-intro'));
for(const file of ['index.html','app.js','styles.css','characters.js'])assert.ok(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(root,'dist',file))),file+' root/dist parity');
assert.ok(fs.existsSync(path.join(root,'assets/video/pixel-clash-intro-live-desktop.mp4')),'original movie retained');
console.log('PASS: opening removed; direct registration; draw/battle/stair/result screens and URL restoration preserved; root/dist parity; original artwork retained.');
