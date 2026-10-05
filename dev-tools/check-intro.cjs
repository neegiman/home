// The cutscene is an actual 300-frame H.264 movie, not the previous nine-key-pose atlas.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {inspect}=require('./blender/faststart-mp4.cjs');
const root=path.resolve(__dirname,'..');
const local=new Map(),session=new Map();
let navigationType='navigate';
const store=map=>({getItem:key=>map.get(key),setItem:(key,value)=>map.set(key,value)});
const sandbox={
  window:{localStorage:store(local),sessionStorage:store(session),performance:{getEntriesByType:()=>[{type:navigationType}]}},
  location:{href:'https://example.com/home/',search:''},URL,URLSearchParams,
  document:{documentElement:{classList:{add(){}}}}
};
const code=fs.readFileSync(path.join(root,'intro.js'),'utf8');
vm.runInNewContext(code,sandbox);
const Intro=sandbox.window.IntroAnimation;
assert.ok(Intro.shouldPlay(new URLSearchParams()));
for(const query of ['mode=tournament','mode=tournament&intro=1','share=abc','share=abc&intro=1'])assert.equal(Intro.shouldPlay(new URLSearchParams(query)),false);
Intro.rememberVisit();assert.equal(Intro.shouldPlay(new URLSearchParams()),false);
session.clear();Intro.seen=false;assert.equal(Intro.shouldPlay(new URLSearchParams()),false);
assert.ok(Intro.shouldPlay(new URLSearchParams('intro=1')));
local.clear();navigationType='reload';assert.equal(Intro.shouldPlay(new URLSearchParams('intro=1')),false);
sandbox.window.localStorage=sandbox.window.sessionStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
assert.equal(Intro.shouldPlay(new URLSearchParams()),false);navigationType='navigate';Intro.rememberVisit();assert.equal(Intro.shouldPlay(new URLSearchParams()),false);
const timeline=[[0,'ARCHER_REAR_VIEW'],[2100,'BOW_DRAW'],[4700,'ARROW_RELEASE'],[5900,'ARROW_FOLLOW'],[6800,'TARGET_HIT'],[8500,'TARGET_PIXEL_TRANSFORM'],[9700,'PIXEL_CLASH_TRANSITION']];
for(const [time,name]of timeline)assert.equal(Intro.prototype.stateAt.call({reduced:false},time).name,name);
assert.equal(Intro.prototype.stateAt.call({reduced:true},600).progress,1);
assert.ok(!code.includes('CinematicPoseRenderer'));assert.ok(code.includes('video.currentTime * 1000'));
assert.ok(code.includes('this.video.removeAttribute("src")'));assert.ok(code.includes('this.controller.abort()'));
const files=['index.html','styles.css','app.js','intro.js'];
const movies=[];
for(const profile of ['desktop','mobile']){
  const file=`assets/intro/3d-v1/opening-${profile}.mp4`;
  const movie=inspect(fs.readFileSync(path.join(root,file)));
  assert.equal(movie.codec,'H264');assert.equal(movie.samples,300);assert.equal(movie.duration,10);assert.ok(movie.fastStart);
  assert.ok(movie.sizeBytes<24*1024*1024);
  const meta=JSON.parse(fs.readFileSync(path.join(root,`assets/intro/3d-v1/metadata-${profile}.json`),'utf8'));
  assert.ok(meta.jointAnimation&&meta.flexingBow);assert.deepEqual(meta.bullseyeScreen,[.5,.5]);
  files.push(file,`assets/intro/3d-v1/poster-${profile}.webp`,`assets/intro/3d-v1/metadata-${profile}.json`);
  movies.push({profile,...movie,resolution:meta.resolution});
}
for(const file of files)assert.ok(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(root,'dist',file))),`Root/dist parity: ${file}`);
console.log(JSON.stringify({pass:true,movies,directLinksSkip:true,persistentFirstVisit:true,reloadSkips:true,reducedMotion:true,videoClock:true,distParity:true},null,2));
