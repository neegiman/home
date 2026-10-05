// Local-only preview/capture endpoint; accepts only three whitelisted movie names.
const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../.."),capture=path.join(root,"renders/concept-motion");
fs.mkdirSync(capture,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript",".json":"application/json",".css":"text/css",".webp":"image/webp",".png":"image/png",".mp4":"video/mp4",".woff2":"font/woff2"};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,"http://127.0.0.1");
  if(req.method==="POST"){
    const match=url.pathname.match(/^\/__capture\/(desktop|mobile|mobile-lite)$/);
    if(!match){res.writeHead(404).end();return;}
    let size=0;const parts=[];
    for await(const part of req){size+=part.length;if(size>150*1024*1024){res.writeHead(413).end();req.destroy();return;}parts.push(part);}
    const destination=path.join(capture,match[1]+".webm");
    fs.writeFileSync(destination,Buffer.concat(parts));res.writeHead(200,{"Content-Type":"application/json"}).end(JSON.stringify({saved:match[1],bytes:size}));return;
  }
  let relative;try{relative=decodeURIComponent(url.pathname==="/"?"/index.html":url.pathname);}catch{res.writeHead(400).end();return;}
  const file=path.resolve(root,"."+relative);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  let stat;try{stat=fs.statSync(file);}catch{res.writeHead(404).end();return;}
  if(!stat.isFile()){res.writeHead(404).end();return;}
  const headers={"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"};
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),stat.size-1):stat.size-1;if(start>end||start>=stat.size){res.writeHead(416).end();return;}res.writeHead(206,{...headers,"Content-Range":`bytes ${start}-${end}/${stat.size}`,"Accept-Ranges":"bytes","Content-Length":end-start+1});fs.createReadStream(file,{start,end}).pipe(res);}
  else{res.writeHead(200,{...headers,"Content-Length":stat.size});fs.createReadStream(file).pipe(res);}
});
server.listen(8138,"127.0.0.1",()=>console.log("Local: http://127.0.0.1:8138"));

