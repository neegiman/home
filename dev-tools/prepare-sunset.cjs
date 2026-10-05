// Mechanical lossless copy + web compression of the selected generated asset.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const input=process.argv[2],board=process.argv[3];
(async()=>{
  const assets=path.join(root,'assets/intro/sunset-v1');
  fs.mkdirSync(assets,{recursive:true});
  fs.copyFileSync(input,path.join(assets,'seascape-master.png'));
  await sharp(input).webp({quality:90,effort:6}).toFile(path.join(assets,'seascape.webp'));
  const reference=path.join(root,'dev-tools/sunset-reference');fs.mkdirSync(reference,{recursive:true});
  fs.copyFileSync(board,path.join(reference,'storyboard.png'));
  fs.mkdirSync(path.join(root,'dist/assets/intro/sunset-v1'),{recursive:true});
  for(const file of ['seascape-master.png','seascape.webp'])fs.copyFileSync(path.join(assets,file),path.join(root,'dist/assets/intro/sunset-v1',file));
  for(const file of ['index.html','app.js','styles.css','sunset-intro.js'])fs.copyFileSync(path.join(root,file),path.join(root,'dist',file));
  console.log(JSON.stringify({asset:'assets/intro/sunset-v1/seascape.webp',bytes:fs.statSync(path.join(assets,'seascape.webp')).size}));
})();
