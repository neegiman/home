// Convert timestamped Canvas captures into constant-rate, fast-start H.264 movies.
// FFmpeg is an offline production dependency, never a browser/CDN dependency.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {inspect}=require('../blender/faststart-mp4.cjs');
const root=path.resolve(__dirname,'../..'),encoder=process.argv[2],profile=process.argv[3];
const sizes={desktop:[1920,1080],mobile:[1080,1920],'mobile-lite':[720,1280]};
assert.ok(encoder&&fs.existsSync(encoder),'Pass the installed FFmpeg executable');
assert.ok(sizes[profile],'Pass desktop, mobile or mobile-lite');
const assets=path.join(root,'assets/video'),source=path.join(root,'renders/concept-motion',profile+'.webm');
const [w,h]=sizes[profile],name=`pixel-clash-intro-live-${profile}.mp4`,destination=path.join(assets,name);
const run=args=>{const result=spawnSync(encoder,['-hide_banner','-loglevel','error',...args],{windowsHide:true,encoding:'utf8'});if(result.status!==0)throw Error(result.stderr||'Encoder failed');};
run(['-y','-i',source,'-an','-vf',`fps=30,scale=${w}:${h}:flags=lanczos,tpad=stop_mode=clone:stop_duration=1`,
  '-t','12','-c:v','libx264','-threads','2','-preset','medium','-crf',profile==='mobile-lite'?'23':'20',
  '-pix_fmt','yuv420p','-movflags','+faststart',destination]);
const info=inspect(fs.readFileSync(destination));
assert.equal(info.samples,360);assert.equal(info.duration,12);assert.equal(info.codec,'H264');assert.ok(info.fastStart);
assert.deepEqual([info.width,info.height],sizes[profile]);
if(profile!=='mobile-lite')run(['-y','-ss','1.6','-i',destination,'-frames:v','1','-c:v','libwebp','-quality','85',path.join(assets,`pixel-clash-intro-live-poster-${profile}.webp`)]);
const metadata={mode:'approved-concept 2.5D layered video',generation:'built-in image_gen',
  art:'assets/intro/concept-live-v1',duration:12,fps:30,resolution:sizes[profile],frames:360,
  sharedTimeline:true,sharedArena:true,separatePortraitComposition:true,poses:9,
  articulatedPoseMesh:true,opaqueTextureHandoff:true,bullseyeScreen:[.5,.5],
  centerOutPixelTransform:true,sound:false,...info};
fs.writeFileSync(path.join(assets,`metadata-live-${profile}.json`),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({profile,...info,averageMbps:Math.round(info.sizeBytes*8/12/10000)/100}));
