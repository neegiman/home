// Production slicing, ground anchoring, and the game's automatic clothing palettes.
const sharp = require("sharp");
const fs = require("node:fs/promises");
const path = require("node:path");
const { catalog, variants } = require("../characters.js");
const CELL = 128, GROUND = 124;

function components(data, width, height, predicate) {
  const visited = new Uint8Array(width * height), result = [];
  for (let seed = 0; seed < visited.length; seed++) {
    if (visited[seed] || !predicate(seed)) continue;
    visited[seed] = 1;
    const points = [seed]; let x1 = width, y1 = height, x2 = -1, y2 = -1;
    for (let cursor = 0; cursor < points.length; cursor++) {
      const point = points[cursor], x = point % width, y = Math.floor(point / width);
      x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y);
      for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
        const nx = x + dx, ny = y + dy, next = ny * width + nx;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || visited[next] || !predicate(next)) continue;
        visited[next] = 1; points.push(next);
      }
    }
    result.push({ points, left: x1, top: y1, width: x2-x1+1, height: y2-y1+1, area: points.length });
  }
  return result;
}
function median(values) { return values.sort((a,b) => a-b)[Math.floor(values.length/2)]; }
async function saveSheet(frames, filename) {
  // Copy raw cells rather than alpha-composite them a second time. This keeps
  // face/outline colors byte-identical across the base and clothing palettes.
  const pixels = Buffer.alloc(CELL*4*CELL*3*4);
  frames.forEach((frame,index) => {
    for(let y=0;y<CELL;y++) frame.copy(pixels,((Math.floor(index/4)*CELL+y)*CELL*4+index%4*CELL)*4,y*CELL*4,(y+1)*CELL*4);
  });
  await sharp(pixels,{raw:{width:CELL*4,height:CELL*3,channels:4}}).png().toFile(filename);
}
function torsoAnchor(body, data, width) {
  const xs = [];
  for (const point of body.points) {
    const y = Math.floor(point/width);
    if (y >= body.top + body.height * .32 && y <= body.top + body.height * .5) xs.push(point%width);
  }
  return xs.length ? median(xs) : body.left + body.width/2;
}
function warmSkin(r,g,b) { return r > 72 && g > 35 && r > g*1.08 && r > b*1.22 && g > b*1.08; }
function paletteFrame(data, frame, accent) {
  const output = Buffer.from(data), protectedPixels = new Uint8Array(CELL*CELL);
  const bounds = frame.bounds, anchor = frame.anchor;
  let firstFaceY = bounds.top;
  for (let y = bounds.top; y < bounds.top + bounds.height*.5; y++) {
    let count = 0;
    for (let x = Math.max(0,anchor-11); x <= Math.min(CELL-1,anchor+11); x++) {
      const offset = (y*CELL+x)*4;
      if (data[offset+3] > 24 && warmSkin(data[offset],data[offset+1],data[offset+2])) count++;
    }
    if (count >= 3) { firstFaceY = y; break; }
  }
  const headBottom = Math.min(GROUND-15, firstFaceY + 11);
  const skinParts = components(data, CELL, CELL, point => {
    const offset = point*4;
    return data[offset+3] >= 24 && warmSkin(data[offset], data[offset+1], data[offset+2]);
  });
  for (const part of skinParts) {
    // Small warm islands are hands/skin, while large warm panels are clothing.
    if (part.area <= 170 || part.top < headBottom) part.points.forEach(point => { protectedPixels[point] = 1; });
  }
  const rgb = accent ? [1,3,5].map(index => parseInt(accent.slice(index,index+2),16)) : null;
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    const point = y*CELL+x, offset = point*4;
    const r=data[offset],g=data[offset+1],b=data[offset+2];
    const brightness = Math.max(r,g,b);
    if (y <= headBottom || y >= GROUND-9 || protectedPixels[point] || data[offset+3]<24 || brightness < 35) {
      protectedPixels[point] = 1; continue;
    }
    if (!rgb) continue;
    // Retain shade structure; tint only clothes, never a full-sprite hue filter.
    const luminance = .2126*r+.7152*g+.0722*b;
    const targetLuminance = .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
    const shade = Math.min(1.7, (luminance*.82+18)/targetLuminance);
    for (let channel=0;channel<3;channel++) output[offset+channel] = Math.round(Math.min(255, data[offset+channel]*.22 + rgb[channel]*shade*.78));
  }
  return { data:output, protectedPixels };
}

async function prepare(theme, input, output) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if (info.channels !== 4) throw new Error(`RGBA required: ${theme}`);
  const bodies = components(data, info.width, info.height, point => data[point*4+3] >= 24).filter(body => body.area > 1800);
  const grid = Array(24).fill(null);
  for (const body of bodies) {
    const column=Math.min(3,Math.floor((body.left+body.width/2)/info.width*4));
    const row=Math.min(5,Math.floor((body.top+body.height/2)/info.height*6));
    const index=row*4+column;
    if (!grid[index] || body.area > grid[index].area) grid[index]=body;
  }
  if (grid.some(body=>!body)) throw new Error(`${theme}: missing frame(s) ${grid.flatMap((body,index)=>body?[]:[index]).join(",")}`);
  for (const [person, appearance] of ["m","f"].entries()) {
    const frames=grid.slice(person*12,person*12+12);
    const referenceHeight=median([...frames.slice(0,4).map(frame=>frame.height),frames[8].height]);
    const scale=Math.min(106/referenceHeight,120/Math.max(...frames.map(frame=>frame.height)),110/Math.max(...frames.map(frame=>frame.width)));
    const prepared=[];
    for (let index=0;index<12;index++) {
      const body=frames[index], anchor=torsoAnchor(body,data,info.width);
      const w=Math.round(body.width*scale),h=Math.round(body.height*scale);
      const left=Math.max(3,Math.min(CELL-w-3,Math.round(CELL/2-(anchor-body.left)*scale)));
      const top=GROUND-h;
      const sprite=await sharp(input).extract({left:body.left,top:body.top,width:body.width,height:body.height}).resize(w,h,{kernel:"nearest"}).png().toBuffer();
      const cell=await sharp({create:{width:CELL,height:CELL,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:sprite,left,top}]).raw().toBuffer();
      const frame={bounds:{left,top,width:w,height:h},anchor:Math.round(left+(anchor-body.left)*scale),data:cell};
      prepared.push(frame);
    }
    const key=`${theme}-${appearance}`;
    await saveSheet(prepared.map(frame=>frame.data),path.join(output,`${key}.png`));
    for (let variant=1;variant<variants.length;variant++) {
      const tinted=[];
      for (let index=0;index<12;index++) {
        const recolored=paletteFrame(prepared[index].data,prepared[index],variants[variant].accent);
        tinted.push(recolored.data);
      }
      await saveSheet(tinted,path.join(output,`${key}-c${variant}.png`));
    }
    await fs.writeFile(path.join(output,`${key}.json`),JSON.stringify({cell:CELL,columns:4,rows:3,ground:GROUND,frames:prepared.map(({bounds,anchor})=>({bounds,anchor}))},null,2)+"\n");
  }
  console.log(`Prepared ${theme}: 2 identities, 24 motion frames, ${variants.length} clothing palettes.`);
}
async function main() {
  const manifest=JSON.parse(await fs.readFile(process.argv[2],"utf8"));
  const output=path.resolve(__dirname,"../assets/characters/human-v1"); await fs.mkdir(output,{recursive:true});
  for (const [theme,input] of Object.entries(manifest)) await prepare(theme,path.resolve(__dirname,"..",input),output);
  const heights = {};
  for(const {key} of catalog) {
    const metadata=JSON.parse(await fs.readFile(path.join(output,`${key}.json`),"utf8"));
    heights[key]=metadata.frames.map(frame=>frame.bounds.height/CELL);
  }
  await fs.writeFile(path.join(output,"metrics.js"),"// Generated pose heights for safe nameplate placement.\nglobalThis.HumanCharacterMetrics="+JSON.stringify(heights)+";\n");
  console.log(`Human roster ready: ${catalog.length} identities.`);
}
if(require.main===module) main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={paletteFrame};
