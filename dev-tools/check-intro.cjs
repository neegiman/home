// Production plays a 360-frame H.264 movie, made from approved articulated concept art.
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
const timeline=[[0,'ARCHER_REAR_VIEW'],[2100,'BOW_DRAW'],[5000,'ARROW_RELEASE'],[5900,'ARROW_FOLLOW'],[7500,'TARGET_HIT'],[9500,'TARGET_PIXEL_TRANSFORM'],[11300,'PIXEL_CLASH_TRANSITION']];
for(const [time,name]of timeline)assert.equal(Intro.prototype.stateAt.call({reduced:false},time).name,name);
assert.equal(Intro.prototype.stateAt.call({reduced:true},600).progress,1);
assert.ok(!code.includes('CinematicPoseRenderer'));assert.ok(code.includes('video.currentTime * 1000'));
assert.ok(code.includes('this.video.removeAttribute("src")'));assert.ok(code.includes('this.controller.abort()'));
function select(width,height,dpr=1,connection={},reducedData=false){return Intro.selectMovie({width,height,dpr,portrait:height>width,connection,reducedData});}
assert.equal(select(1920,1080).quality,'desktop');
assert.equal(select(390,844,3).quality,'mobile');
assert.equal(select(390,844).quality,'mobile-lite');
assert.equal(select(390,844,3,{saveData:true}).quality,'mobile-lite');
assert.equal(select(390,844,3,{effectiveType:'slow-2g'}).quality,'mobile-lite');
assert.equal(select(390,844,3,{},true).quality,'mobile-lite');
assert.equal(select(844,390,3).quality,'desktop');
assert.ok(code.includes('this.ready?String')); // poster remains visible before playback
sandbox.innerWidth=390;sandbox.innerHeight=844;sandbox.devicePixelRatio=3;
const resized={profile:'mobile',canvas:{},context:{setTransform(){}},view:{dataset:{}},draw(){}};
Intro.prototype.resize.call(resized);assert.equal(resized.view.dataset.fit,'cover');
sandbox.innerWidth=844;sandbox.innerHeight=390;
Intro.prototype.resize.call(resized);assert.equal(resized.view.dataset.fit,'contain');assert.equal(resized.profile,'mobile');
sandbox.innerWidth=768;sandbox.innerHeight=1024;
Intro.prototype.resize.call(resized);assert.equal(resized.view.dataset.fit,'contain');
sandbox.innerWidth=1920;sandbox.innerHeight=1080;resized.profile='desktop';
Intro.prototype.resize.call(resized);assert.equal(resized.view.dataset.fit,'cover');
const files=['index.html','styles.css','app.js','intro.js'];
const movies=[];
const logicOnly=process.argv.includes('--logic-only');
for(const profile of logicOnly?[]:['desktop','mobile','mobile-lite']){
  const file=`assets/video/pixel-clash-intro-live-${profile}.mp4`;
  const movie=inspect(fs.readFileSync(path.join(root,file)));
  assert.equal(movie.codec,'H264');assert.equal(movie.samples,360);assert.equal(movie.duration,12);assert.ok(movie.fastStart);
  assert.ok(movie.sizeBytes<24*1024*1024);
  const meta=JSON.parse(fs.readFileSync(path.join(root,`assets/video/metadata-live-${profile}.json`),'utf8'));
  assert.ok(meta.articulatedPoseMesh&&meta.opaqueTextureHandoff);assert.deepEqual(meta.bullseyeScreen,[.5,.5]);
  assert.ok(meta.sharedTimeline&&meta.sharedArena&&meta.separatePortraitComposition);
  assert.equal(meta.poses,9);assert.ok(meta.centerOutPixelTransform);
  assert.deepEqual([movie.width,movie.height],meta.resolution);
  files.push(file,`assets/video/metadata-live-${profile}.json`);
  movies.push({profile,...movie,resolution:meta.resolution});
}
files.push('assets/video/pixel-clash-intro-live-poster-desktop.webp','assets/video/pixel-clash-intro-live-poster-mobile.webp');
for(const file of files)assert.ok(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(root,'dist',file))),`Root/dist parity: ${file}`);
console.log(JSON.stringify({pass:true,logicOnly,movies,directLinksSkip:true,persistentFirstVisit:true,reloadSkips:true,reducedMotion:true,rotationKeepsProfile:true,videoClock:true,distParity:true},null,2));
