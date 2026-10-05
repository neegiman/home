// Mechanical atlas slicing only: preserve generated alpha and original pixels.
const sharp = require("sharp");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const names = ["archer-idle","archer-draw-01","archer-draw-02","archer-draw-03","archer-draw-04","archer-draw-05","archer-release-01","archer-release-02","archer-release-03"];
async function main() {
  const input = process.argv[2];
  assert.ok(input, "Supply generated 3x3 transparent atlas");
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const frames=[];
  for(let index=0;index<9;index++){
    const x0=Math.floor(index%3*info.width/3),xEnd=Math.floor((index%3+1)*info.width/3);
    const y0=Math.floor(Math.floor(index/3)*info.height/3),yEnd=Math.floor((Math.floor(index/3)+1)*info.height/3);
    let left=xEnd,top=yEnd,right=-1,bottom=-1;const head=[];
    for(let y=y0;y<yEnd;y++)for(let x=x0;x<xEnd;x++){
      const offset=(y*info.width+x)*4;if(data[offset+3]<24)continue;
      left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
      const r=data[offset],g=data[offset+1],b=data[offset+2];
      if(x<x0+(xEnd-x0)*.58&&y<y0+(yEnd-y0)*.43&&r>72&&g>35&&r>g*1.08&&r>b*1.22&&g>b*1.08)head.push(x);
    }
    assert.ok(right>=left&&head.length>30,"nonempty character / face: "+index);
    head.sort((a,b)=>a-b);
    frames.push({left,top,width:right-left+1,height:bottom-top+1,headX:head[Math.floor(head.length/2)]});
  }
  const scale=Math.min(118/Math.max(...frames.map(f=>f.height)),110/Math.max(...frames.map(f=>f.width)));
  const pixels=Buffer.alloc(384*384*4),metadata=[];
  for(let index=0;index<9;index++){
    const f=frames[index],width=Math.round(f.width*scale),height=Math.round(f.height*scale);
    const left=Math.max(3,Math.min(125-width,Math.round(45-(f.headX-f.left)*scale))),top=124-height;
    const sprite=await sharp(input).extract({left:f.left,top:f.top,width:f.width,height:f.height}).resize(width,height,{kernel:"nearest"}).ensureAlpha().raw().toBuffer();
    for(let y=0;y<height;y++)sprite.copy(pixels,(((Math.floor(index/3)*128+top+y)*384)+index%3*128+left)*4,y*width*4,(y+1)*width*4);
    metadata.push({name:names[index],bounds:{left,top,width,height},headX:Math.round(left+(f.headX-f.left)*scale),ground:124});
  }
  const output=path.resolve(__dirname,"../assets/characters/intro-archer-v1.png");
  await sharp(pixels,{raw:{width:384,height:384,channels:4}}).png().toFile(output);
  await fs.writeFile(output.replace(/\.png$/,".json"),JSON.stringify({cell:128,columns:3,rows:3,ground:124,frames:metadata},null,2)+"\n");
  console.log(JSON.stringify({output,frames:metadata,scale}));
}
main().catch(error=>{console.error(error);process.exitCode=1});
