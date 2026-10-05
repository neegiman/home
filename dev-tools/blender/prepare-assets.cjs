// Mechanical encoding/copying of the completed Blender renders. No image redesign.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require('sharp');
const {faststart}=require('./faststart-mp4.cjs');
const root=path.resolve(__dirname,'../..'),assets=path.join(root,'assets/video');
(async()=>{
  fs.mkdirSync(assets,{recursive:true});
  for(const profile of ['desktop','mobile']){
    const name=`pixel-clash-intro-poster${profile==='mobile'?'-mobile':''}.webp`;
    await sharp(path.join(root,`renders/previews/preview-${profile}-045.png`)).webp({quality:84}).toFile(path.join(assets,name));
  }
  if(!process.argv.includes('--posters-only')){
    for(const profile of ['desktop','mobile','mobile-lite']){
      const name=`pixel-clash-intro-${profile}.mp4`,source=path.join(root,'renders',name);
      const meta=JSON.parse(fs.readFileSync(path.join(assets,`metadata-${profile}.json`),'utf8'));
      const info=faststart(source);
      assert.equal(info.samples,300);assert.equal(info.duration,10);
      assert.deepEqual([info.width,info.height],meta.resolution);
      fs.copyFileSync(source,path.join(assets,name));
      console.log(JSON.stringify({profile,...info,averageMbps:Math.round(info.sizeBytes*8/10/10000)/100}));
    }
  }
  fs.mkdirSync(path.join(root,'dist/assets/video'),{recursive:true});
  for(const name of fs.readdirSync(assets))fs.copyFileSync(path.join(assets,name),path.join(root,'dist/assets/video',name));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
