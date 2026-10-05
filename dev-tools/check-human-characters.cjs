const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const api = require("../characters.js");
const { paletteFrame } = require("./prepare-human-characters.cjs");
const directory = path.resolve(__dirname, "../assets/characters/human-v1");

async function main() {
  const roster = [];
  for (let i = 0; i < 224; i++) {
    const character = api.pickBalanced(roster, () => ((i * .61803398875) % 1));
    const colorVariant = api.pickColor(roster, character);
    roster.push({ id: "qa" + i, name: "참가자" + i, character, colorVariant });
    const counts = Array(16).fill(0);
    roster.forEach(p => counts[p.character]++);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, "least-used assignment");
    if (i < 16) assert.equal(new Set(roster.map(p=>p.character)).size, i+1, "first 16 unique");
    if (i < 192) assert.equal(new Set(roster.map(p=>p.character+":"+p.colorVariant)).size, i+1, "unique palettes before capacity");
  }
  const restored=api.normalizeRoster(JSON.parse(JSON.stringify(roster)));
  assert.deepEqual(restored,roster,"saved roster stable");
  assert.deepEqual(api.normalizeRoster(restored),restored,"normalization idempotent");
  const collision=api.normalizeRoster(Array.from({length:14},(_,i)=>({id:"dup"+i,character:3,colorVariant:0})));
  assert.equal(new Set(collision.slice(0,12).map(p=>p.colorVariant)).size,12);
  assert.deepEqual(api.normalizeRoster(collision),collision);
  const reduced=roster.slice(0,16).filter(p=>p.character!==7);
  assert.equal(api.pickBalanced(reduced),7,"removed identity reused");
  assert.equal(api.catalog.length,16);
  assert.ok(!api.style({character:2,colorVariant:4}).includes('url("'),"safe inline HTML style URLs");
  assert.notEqual(api.pickColor([{id:"blue",character:2,colorVariant:0}],2),1,"blue duplicate gets a contrasting palette, not a near-identical blue");
  let testedFrames=0, testedPalettes=0;
  for (const [character, item] of api.catalog.entries()) {
    const file=path.join(directory,item.key+".png");
    const metadata=JSON.parse(await fs.readFile(path.join(directory,item.key+".json"),"utf8"));
    const original=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(original.info.width,512);assert.equal(original.info.height,384);
    assert.equal(original.info.channels,4);
    const frames=[];
    for(let index=0;index<12;index++){
      const buffer=await sharp(file).extract({left:index%4*128,top:Math.floor(index/4)*128,width:128,height:128}).raw().toBuffer();
      frames.push(buffer);testedFrames++;
      let visible=0,lastY=-1;
      for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(buffer[(y*128+x)*4+3]>=24){
        visible++;lastY=y;
        assert.ok(x>=3&&x<=124&&y>=4,"no edge clipping: "+item.key+":"+index);
      }
      assert.ok(visible>800,"nonempty pose");
      assert.equal(lastY,123,"ground anchor "+item.key+":"+index);
      assert.ok(metadata.frames[index].bounds.height<=120);
    }
    assert.ok(!frames[0].equals(frames[1]),"walk changes");
    assert.ok(!frames[4].equals(frames[5]),"cry changes");
    assert.ok(!frames[8].equals(frames[10]),"victory changes");
    assert.ok(metadata.frames[4].bounds.height<metadata.frames[8].bounds.height*.85,"seated pose lower");
    for(let colorVariant=1;colorVariant<12;colorVariant++){
      const variantFile=path.resolve(__dirname,"..",api.url({character,colorVariant}));
      const colored=await sharp(variantFile).ensureAlpha().raw().toBuffer();
      assert.equal(colored.length,original.data.length);
      let changed=0;
      for(let offset=0;offset<colored.length;offset+=4){
        assert.equal(colored[offset+3],original.data[offset+3],"alpha preserved");
        if(colored[offset]!==original.data[offset]||colored[offset+1]!==original.data[offset+1]||colored[offset+2]!==original.data[offset+2]) changed++;
      }
      assert.ok(changed>1000,"clothing color visibly differs");
      for(let index=0;index<12;index++){
        const result=paletteFrame(frames[index],metadata.frames[index],api.variants[colorVariant].accent);
        const coloredCell=await sharp(variantFile).extract({left:index%4*128,top:Math.floor(index/4)*128,width:128,height:128}).raw().toBuffer();
        // Alpha compositing can round translucent edge RGB by one unit.
        for(let offset=0;offset<coloredCell.length;offset++) if(coloredCell[offset-offset%4+3]>=24) {
          assert.ok(Math.abs(coloredCell[offset]-result.data[offset])<=2,"palette is reproducible");
        }
        for(let point=0;point<result.protectedPixels.length;point++)if(result.protectedPixels[point]){
          assert.ok(coloredCell.subarray(point*4,point*4+4).equals(frames[index].subarray(point*4,point*4+4)),"skin/hair/outline preserved");
        }
      }
      testedPalettes++;
    }
  }
  console.log("PASS: 224 balanced registrations; first 16 unique; 192 distinct character/palette pairs; URL roster stable.");
  console.log("PASS: "+testedFrames+" motion frames; fixed foot anchors; walk/cry/victory distinct; "+testedPalettes+" clothing palettes checked.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
