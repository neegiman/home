// Mechanical MP4 packaging: move moov before mdat, preserving H.264 samples.
// Does not transcode or alter the rendered frames.
const fs = require('node:fs');
const path = require('node:path');
const CONTAINERS = new Set(['moov','trak','mdia','minf','stbl','edts','dinf','udta']);
function atoms(buffer, start=0, end=buffer.length) {
  const items=[];
  for(let offset=start;offset+8<=end;){
    let size=buffer.readUInt32BE(offset),header=8;
    const type=buffer.toString('ascii',offset+4,offset+8);
    if(size===1){size=Number(buffer.readBigUInt64BE(offset+8));header=16;}
    if(size===0)size=end-offset;
    if(size<header||offset+size>end)throw new Error(`Invalid MP4 atom ${type}`);
    items.push({type,offset,size,header});offset+=size;
  }
  return items;
}
function inspect(buffer){
  const top=atoms(buffer),moov=top.find(a=>a.type==='moov');
  if(!moov)throw new Error('Movie metadata missing');
  const data={atoms:top.map(a=>a.type),sizeBytes:buffer.length,fastStart:top.findIndex(a=>a.type==='moov')<top.findIndex(a=>a.type==='mdat')};
  function walk(start,end){
    for(const a of atoms(buffer,start,end)){
      const p=a.offset+a.header;
      if(a.type==='mvhd'){
        const v=buffer[p],scale=buffer.readUInt32BE(p+(v?20:12));
        const duration=v?Number(buffer.readBigUInt64BE(p+24)):buffer.readUInt32BE(p+16);
        data.duration=duration/scale;
      }
      if(a.type==='stsd'&&buffer.toString('ascii',p+12,p+16)==='avc1')data.codec='H264';
      if(a.type==='stsz')data.samples=buffer.readUInt32BE(p+8);
      if(CONTAINERS.has(a.type))walk(p,a.offset+a.size);
    }
  }
  walk(moov.offset+moov.header,moov.offset+moov.size);return data;
}
function faststart(file){
  const buffer=fs.readFileSync(file),top=atoms(buffer);
  const moov=top.find(a=>a.type==='moov'),mdat=top.find(a=>a.type==='mdat');
  if(!moov||!mdat)throw new Error('Expected moov/mdat');
  if(moov.offset<mdat.offset)return inspect(buffer);
  const metadata=Buffer.from(buffer.subarray(moov.offset,moov.offset+moov.size));
  const insert=top.findIndex(a=>a.type==='mdat');
  function rewrite(start,end){
    for(const a of atoms(metadata,start,end)){
      const p=a.offset+a.header;
      if(a.type==='stco'||a.type==='co64'){
        const count=metadata.readUInt32BE(p+4),size=a.type==='stco'?4:8;
        for(let i=0;i<count;i++){
          const where=p+8+i*size;
          const old=size===4?metadata.readUInt32BE(where):Number(metadata.readBigUInt64BE(where));
          const oldAtom=top.find(a=>old>=a.offset&&old<a.offset+a.size);
          if(!oldAtom)throw new Error('Sample offset outside source atoms');
          const moved=old>=top[insert].offset&&old<moov.offset?old+moov.size:old;
          if(size===4)metadata.writeUInt32BE(moved,where);else metadata.writeBigUInt64BE(BigInt(moved),where);
        }
      }else if(CONTAINERS.has(a.type))rewrite(p,a.offset+a.size);
    }
  }
  rewrite(8,metadata.length);
  const chunks=[];
  top.forEach((a,i)=>{if(i===insert)chunks.push(metadata);if(a!==moov)chunks.push(buffer.subarray(a.offset,a.offset+a.size));});
  const output=Buffer.concat(chunks);
  if(output.length!==buffer.length)throw new Error('Packaging changed file size');
  fs.writeFileSync(file,output);return inspect(output);
}
module.exports={inspect,faststart};
if(require.main===module){for(const file of process.argv.slice(2))console.log(JSON.stringify({file:path.basename(file),...faststart(file)}));}
