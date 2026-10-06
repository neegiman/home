// Runs the installed agent-browser CLI, not a second browser implementation.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const browser=process.env.SUNSET_BROWSER;
const session='sunset';
const base='http://127.0.0.1:8138/';
const call=(...args)=>JSON.parse(execFileSync(browser,['--session',session,'--json',...args],{cwd:root,encoding:'utf8'}));
const evaluate=code=>{const r=call('eval',code);if(!r.success)throw new Error(JSON.stringify(r));return r.data.result;};
const state=()=>evaluate(`({started:SunsetIntro.started,done:SunsetIntro.done,hidden:SunsetIntro.section.hidden,reason:SunsetIntro.section.dataset.reason,state:SunsetIntro.section.dataset.state,frame:SunsetIntro.frame,renderer:!!SunsetIntro.painter,registration:!document.querySelector('#registrationView').hidden,inert:SunsetIntro.registration.inert,pending:document.documentElement.classList.contains('sunset-intro-pending'),artRequests:performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/intro/sunset-v1/')).length,oldMovies:performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.mp4')).length})`);
const waitDone=()=>evaluate(`new Promise(resolve=>{const poll=()=>SunsetIntro.section.hidden?resolve(true):setTimeout(poll,50);poll()})`);
const report={checkedAt:new Date().toISOString(),browser:'agent-browser Chromium',checks:{}};
call('set','viewport','1440','900');
// Existing visitors must replay despite a legacy browser-wide seen record.
evaluate(`localStorage.setItem('pixel-clash-sunset-seen-v1','1')`);
call('open',base+'?qa=sunset-first');
let first=state();assert.ok(first.started&&first.renderer&&first.inert&&!first.hidden);report.checks.firstEntry=first;
// Read actual GPU pixels twice. Sky/sun/horizon is anchored while water changes.
const motion=evaluate(`(()=>{const o=SunsetIntro,g=o.canvas.getContext('webgl'),w=o.canvas.width,h=o.canvas.height;const read=(t)=>{o.painter.draw(t);const p=new Uint8Array(w*h*4);g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,p);return p};const a=read(1),b=read(2);let water=0,horizon=0;for(let y=0;y<h;y+=3)for(let x=0;x<w;x+=3){const i=(y*w+x)*4;const changed=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);if(y<h*.4&&changed>3)water++;if(y>h*.48&&y<h*.51&&changed>3)horizon++;}return{waterPixelsChanged:water,horizonPixelsChanged:horizon}})()`);
assert.ok(motion.waterPixelsChanged>100);report.checks.independentMotion=motion;
evaluate(`(()=>{const o=SunsetIntro,original=o.tick.bind(o);window.__sunsetFrames=[];o.tick=function(t){window.__sunsetFrames.push(t);original(t)}})()`);
call('screenshot',path.join(root,'dev-tools/human-sunset-desktop-wave.png'));
evaluate(`new Promise(resolve=>{const poll=()=>SunsetIntro.elapsed>=3650||SunsetIntro.done?resolve(true):setTimeout(poll,30);poll()})`);
call('screenshot',path.join(root,'dev-tools/human-sunset-desktop-title.png'));
waitDone();
let completed=state();assert.ok(completed.hidden&&completed.done&&!completed.inert&&!completed.pending&&completed.frame===0&&!completed.renderer);assert.equal(completed.reason,'complete');report.checks.complete=completed;
report.checks.frameTiming=evaluate(`(()=>{const f=window.__sunsetFrames,d=f.slice(1).map((t,i)=>t-f[i]),sorted=d.slice().sort((a,b)=>a-b);return{sampleCount:d.length,meanMs:d.reduce((a,b)=>a+b,0)/d.length,p95Ms:sorted[Math.floor(sorted.length*.95)],elapsedMs:SunsetIntro.elapsed}})()`);
call('tab','new','--label','opening-replay',base+'?qa=new-tab');call('wait','--load','networkidle');
let newTab=state();assert.ok(newTab.started&&newTab.renderer&&!newTab.hidden);report.checks.newTabReplay=newTab;
assert.equal(evaluate(`localStorage.getItem('pixel-clash-sunset-seen-v1')`),'1');report.checks.legacySeenIgnored=true;
call('snapshot','-i');call('click','#skipSunsetIntro');
call('open',base+'?qa=return');let revisit=state();assert.ok(revisit.started&&revisit.artRequests===1);report.checks.revisitReplay=revisit;
call('reload');let reload=state();assert.ok(!reload.started&&reload.artRequests===0);report.checks.reload=reload;
evaluate(`localStorage.removeItem('pixel-clash-sunset-seen-v1')`);call('reload');reload=state();assert.ok(!reload.started&&reload.artRequests===0);report.checks.reloadWithoutSeen=reload;
call('open',base+'?intro=1');call('snapshot','-i');call('click','#skipSunsetIntro');let skip=state();assert.ok(skip.hidden&&skip.done&&!skip.inert&&skip.frame===0);assert.equal(skip.reason,'skip');report.checks.skipPointer=skip;
call('open',base+'?intro=1');call('press','Escape');assert.equal(state().reason,'skip');report.checks.skipKeyboard=true;
call('set','viewport','390','844');call('open',base+'dist/index.html?intro=1');
let mobile=state();assert.ok(mobile.renderer&&!mobile.hidden);report.checks.mobile=mobile;
report.checks.mobileSafeArea=evaluate(`(()=>{const skip=document.querySelector('#skipSunsetIntro').getBoundingClientRect(),title=document.querySelector('#sunsetTitle').getBoundingClientRect();return{viewport:[innerWidth,innerHeight],skip:[skip.x,skip.y,skip.width,skip.height],title:[title.x,title.y,title.width,title.height],overflow:document.documentElement.scrollWidth>innerWidth}})()`);
assert.equal(report.checks.mobileSafeArea.overflow,false);
evaluate(`new Promise(resolve=>{const poll=()=>SunsetIntro.elapsed>=3650||SunsetIntro.done?resolve(true):setTimeout(poll,30);poll()})`);
call('screenshot',path.join(root,'dev-tools/human-sunset-mobile-title.png'));
// Rotation continues the same sequence; it never restarts.
const before=evaluate('SunsetIntro.startedAt');call('set','viewport','844','390');assert.equal(evaluate('SunsetIntro.startedAt'),before);report.checks.orientationNoRestart=true;waitDone();
call('set','media','reduced-motion');call('open',base+'?intro=1');let reduced=state();assert.ok(!reduced.started&&reduced.artRequests===0);report.checks.reducedMotion=reduced;
call('set','media','no-preference');
const [data,share]=process.argv.slice(2);
if(data){call('open',base+'dist/index.html?intro=1&mode=tournament&data='+data);const tour=state();assert.ok(!tour.started&&!tour.registration&&tour.artRequests===0);report.checks.tournamentDirect=tour;}
if(share){call('open',base+'dist/index.html?intro=1&share='+share);const result=state();assert.ok(!result.started&&!result.registration&&result.artRequests===0);report.checks.shareDirect=result;report.checks.resultNames=evaluate(`({winner:document.querySelector('#shareFirstName').textContent,last:document.querySelector('#shareLastName').textContent})`);}
const errors=call('errors');assert.ok(!errors.data.errors?.length,JSON.stringify(errors));report.checks.pageErrors=errors;
fs.writeFileSync(path.join(root,'dev-tools/sunset-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
