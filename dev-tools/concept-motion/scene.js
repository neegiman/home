/* Approved art, articulated key-pose meshes and independent cinematic layers.
   This is 2.5D animation, not a generated 3D body or an AI video model. */
(() => {
  "use strict";
  const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const JOINTS={
    desktop:[
      [[232,76],[236,148],[171,181],[135,251],[111,311],[286,183],[306,275],[314,332],[70,145],[145,409],[200,285]],
      [[232,82],[240,156],[205,188],[277,244],[343,291],[287,174],[313,202],[343,291],[333,8],[299,402],[174,267]],
      [[220,81],[231,148],[243,182],[295,178],[355,161],[170,161],[160,136],[221,151],[292,8],[320,350],[154,245]],
      [[193,93],[198,161],[218,191],[278,185],[354,172],[129,151],[116,134],[206,153],[309,6],[314,368],[99,247]],
      [[194,94],[201,162],[222,190],[282,185],[361,171],[132,152],[123,139],[211,157],[311,6],[318,368],[111,248]],
      [[192,94],[201,160],[219,191],[281,184],[360,170],[132,149],[122,135],[210,153],[309,6],[318,369],[108,250]],
      [[196,95],[211,163],[223,187],[284,182],[354,177],[135,164],[97,173],[185,148],[306,9],[316,369],[102,269]],
      [[200,96],[215,165],[230,189],[293,188],[356,188],[141,166],[128,154],[215,126],[317,9],[321,374],[105,276]],
      [[201,98],[216,166],[230,190],[297,190],[362,190],[143,165],[113,171],[198,159],[316,9],[321,375],[110,274]]
    ],
    mobile:[
      [[233,77],[240,148],[169,182],[134,251],[108,308],[287,181],[303,274],[317,329],[63,140],[145,408],[199,280]],
      [[235,99],[249,163],[179,198],[164,281],[140,327],[288,181],[303,154],[354,150],[326,10],[324,313],[191,286]],
      [[235,88],[250,155],[245,182],[304,171],[363,139],[289,181],[290,137],[263,153],[326,7],[330,310],[189,272]],
      [[197,104],[214,169],[220,200],[284,190],[354,178],[259,209],[256,195],[230,180],[306,7],[314,368],[108,286]],
      [[204,106],[218,176],[224,208],[287,195],[360,176],[155,162],[134,153],[220,169],[310,7],[318,365],[131,284]],
      [[204,107],[218,176],[224,206],[288,194],[361,176],[154,163],[135,151],[219,168],[310,7],[320,366],[127,283]],
      [[192,106],[211,177],[227,211],[287,204],[355,179],[136,190],[101,189],[194,158],[302,7],[321,370],[99,280]],
      [[198,109],[214,180],[224,208],[288,204],[354,185],[140,191],[125,181],[215,147],[305,7],[321,370],[104,287]],
      [[201,111],[216,181],[225,211],[289,207],[353,186],[145,189],[151,168],[234,170],[306,7],[323,371],[111,288]]
    ]
  };
  const PALETTE=[[8,10,24],[13,18,48],[18,24,59],[23,31,75],[51,66,122],[38,88,217],[72,199,255],[170,180,221],[255,245,207],[255,216,77],[255,145,71],[255,73,108],[119,28,79]];
  const GLYPHS={P:["11110","10001","10001","11110","10000","10000","10000"],I:["11111","00100","00100","00100","00100","00100","11111"],X:["10001","10001","01010","00100","01010","10001","10001"],E:["11111","10000","10000","11110","10000","10000","11111"],L:["10000","10000","10000","10000","10000","10000","11111"],C:["01111","10000","10000","10000","10000","10000","01111"],A:["01110","10001","10001","11111","10001","10001","10001"],S:["01111","10000","10000","01110","00001","00001","11110"],H:["10001","10001","10001","11111","10001","10001","10001"]};
  const image=url=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error("Asset failed: "+url));i.src=url;});
  const makeCanvas=(w,h)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c;};
  class ArticulatedAtlas {
    constructor(atlas,meta,profile){
      this.image=atlas;this.meta=meta;this.cell=meta.cell;this.canvas=makeCanvas(512,512);this.origin={x:320,y:480};this.pairs=new Map();
      this.joints=JOINTS[profile].map((row,i)=>row.map(([x,y])=>[x*meta.sourceCell/418+meta.offsets[i][0],y*meta.sourceCell/418+meta.offsets[i][1]]));
      this.anchors=this.measureAnchors();this.grid=[];const segments=24;
      for(let y=0;y<=segments;y++)for(let x=0;x<=segments;x++)this.grid.push({x:x/segments*this.cell,y:y/segments*this.cell});
      const indices=[];for(let y=0;y<segments;y++)for(let x=0;x<segments;x++){const a=y*(segments+1)+x,b=a+1,c=a+segments+1,d=c+1;indices.push(a,b,d,a,d,c);}
      this.indices=new Uint16Array(indices);this.vertices=new Float32Array(this.grid.length*4);
      this.initializeGL();for(let a=0;a<8;a++){this.flow(a,a+1);this.flow(a+1,a);}this.render(0,0,0,0);
    }
    measureAnchors(){
      const a=makeCanvas(this.cell,40),c=a.getContext("2d",{willReadFrequently:true}),result=[];
      for(let i=0;i<9;i++){c.clearRect(0,0,this.cell,40);c.drawImage(this.image,i%3*this.cell,Math.floor(i/3)*this.cell+this.cell-40,this.cell,40,0,0,this.cell,40);const data=c.getImageData(0,0,this.cell,40).data;let sum=0,total=0;
        for(let y=0;y<40;y++)for(let x=this.cell*.2|0;x<this.cell*.82;x++){const v=data[(y*this.cell+x)*4+3];if(v<128)continue;const weight=v*(y+1)**2;sum+=x*weight;total+=weight;}result.push({x:total?sum/total:230,y:this.cell-17});}
      return result;
    }
    initializeGL(){
      const gl=this.canvas.getContext("webgl",{alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true,antialias:false});if(!gl)throw Error("A WebGL renderer is required for the offline pose capture.");this.gl=gl;
      const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
      const v=shader(gl.VERTEX_SHADER,"attribute vec2 a_position;attribute vec2 a_uv;varying vec2 v_uv;void main(){gl_Position=vec4(a_position.x/256.-1.,1.-a_position.y/256.,0.,1.);v_uv=a_uv;}");
      const f=shader(gl.FRAGMENT_SHADER,"precision mediump float;uniform sampler2D u_atlas;uniform float u_weight;varying vec2 v_uv;void main(){vec4 color=texture2D(u_atlas,v_uv);if(color.a<0.015)discard;gl_FragColor=color*u_weight;}");
      const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error("Pose shader link failed");this.program=p;gl.useProgram(p);
      this.position=gl.getAttribLocation(p,"a_position");this.uv=gl.getAttribLocation(p,"a_uv");this.weight=gl.getUniformLocation(p,"u_weight");this.vertexBuffer=gl.createBuffer();this.indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,this.indices,gl.STATIC_DRAW);
      this.texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(p,"u_atlas"),0);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
    }
    flow(from,to){
      const key=from+":"+to;if(this.pairs.has(key))return this.pairs.get(key);const a=this.anchors[from],b=this.anchors[to];
      const controls=this.joints[from].map(([x,y],i)=>({x,y,dx:this.joints[to][i][0]-b.x-(x-a.x),dy:this.joints[to][i][1]-b.y-(y-a.y)}));
      [[a.x-55,a.y],[a.x+55,a.y],[a.x,a.y-30],[0,0],[this.cell,0],[0,this.cell],[this.cell,this.cell]].forEach(([x,y])=>controls.push({x,y,dx:0,dy:0}));const result=new Float32Array(this.grid.length*2);
      this.grid.forEach((point,i)=>{let px=0,py=0,qx=0,qy=0,total=0;const weights=controls.map(control=>{const w=1/((point.x-control.x)**2+(point.y-control.y)**2+1);px+=control.x*w;py+=control.y*w;qx+=(control.x+control.dx)*w;qy+=(control.y+control.dy)*w;total+=w;return w;});px/=total;py/=total;qx/=total;qy/=total;let dot=0,cross=0,den=0;
        controls.forEach((control,index)=>{const ax=control.x-px,ay=control.y-py,bx=control.x+control.dx-qx,by=control.y+control.dy-qy,w=weights[index];dot+=w*(ax*bx+ay*by);cross+=w*(ax*by-ay*bx);den+=w*(ax*ax+ay*ay);});let co=dot/Math.max(den,.001),si=cross/Math.max(den,.001),scale=Math.hypot(co,si),bounded=Math.max(.8,Math.min(1.2,scale));if(scale>.001){co*=bounded/scale;si*=bounded/scale;}const vx=point.x-px,vy=point.y-py;result[i*2]=qx+co*vx-si*vy-point.x;result[i*2+1]=qy+si*vx+co*vy-point.y;});this.pairs.set(key,result);return result;
    }
    mesh(frame,other,t,weight,time,release){
      if(weight<.0001)return;const gl=this.gl,a=this.anchors[frame],flow=this.flow(frame,other),head=this.joints[frame][0],hair=this.joints[frame][10];
      this.grid.forEach((p,i)=>{const at=i*4,nearHair=Math.exp(-((p.x-hair[0])**2/3800+(p.y-hair[1])**2/8800)),still= time>4100&&time<4800?.14:1;
        const breeze=nearHair*(Math.sin(time*.003+p.y*.038)*1.5*still+Math.sin(time*.008)*release*2.0),breath=Math.exp(-((p.x-head[0])**2+(p.y-head[1]-130)**2)/8000)*Math.sin(time*.002)*.75*still;
        this.vertices[at]=this.origin.x+p.x-a.x+flow[i*2]*t+breeze;this.vertices[at+1]=this.origin.y+p.y-a.y+flow[i*2+1]*t+breath;
        const u=Math.max(.5,Math.min(this.cell-.5,p.x)),v=Math.max(.5,Math.min(this.cell-.5,p.y));this.vertices[at+2]=(frame%3+u/this.cell)/3;this.vertices[at+3]=(Math.floor(frame/3)+v/this.cell)/3;
      });gl.bindBuffer(gl.ARRAY_BUFFER,this.vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,this.vertices,gl.DYNAMIC_DRAW);gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.uv,2,gl.FLOAT,false,16,8);gl.enableVertexAttribArray(this.uv);gl.uniform1f(this.weight,weight);gl.drawElements(gl.TRIANGLES,this.indices.length,gl.UNSIGNED_SHORT,0);
    }
    render(from,to,t,time,release=0){const gl=this.gl;gl.viewport(0,0,512,512);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.program);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);
      // Both key poses share interpolated joint positions; an opaque texture handoff
      // avoids doubled bows, translucent torsos and ghost arms at the midpoint.
      if(t<.5)this.mesh(from,to,t,1,time,release);else this.mesh(to,from,1-t,1,time,release);return this.canvas;}
    rest(frame=5){const a=this.anchors[frame],p=this.joints[frame][4];return{x:this.origin.x+p[0]-a.x,y:this.origin.y+p[1]-a.y-8};}
    dispose(){const g=this.gl;g.deleteTexture(this.texture);g.deleteBuffer(this.vertexBuffer);g.deleteBuffer(this.indexBuffer);g.deleteProgram(this.program);this.canvas.width=this.canvas.height=1;this.pairs.clear();}
  }
  class ConceptScene {
    static async create(canvas,profile){
      const base="../../assets/intro/concept-live-v1/",actual=profile==="desktop"?"desktop":"mobile",meta=await fetch(base+"manifest.json").then(r=>{if(!r.ok)throw Error("Manifest failed");return r.json();});
      const [atlas,arena,target,arrow]=await Promise.all([image(base+"archer-"+actual+".webp"),image(base+"arena.webp"),image(base+"target.webp"),image(base+"arrow.webp")]);return new ConceptScene(canvas,actual,meta,{atlas,arena,target,arrow});
    }
    constructor(canvas,profile,meta,images){this.canvas=canvas;this.c=canvas.getContext("2d");this.w=canvas.width;this.h=canvas.height;this.profile=profile;this.mobile=profile==="mobile";this.meta=meta;this.images=images;this.rig=new ArticulatedAtlas(images.atlas,meta.profiles[profile],profile);this.pixelWorld=this.makePixelWorld();this.frames=0;this.maxDrawMs=0;}
    background(c,w,h,t,zoom=1){const s=this.meta.arena[this.profile],i=this.images.arena;c.save();c.translate(w/2,h/2);c.scale(zoom,zoom);c.drawImage(i,s[0]*i.width,s[1]*i.height,s[2]*i.width,s[3]*i.height,-w/2,-h/2,w,h);c.restore();}
    targetGeometry(p=1,w=this.w,h=this.h){const circle= this.mobile?mix(w*.125,w*.75,p):mix(h*.105,h*.78,p);const size=circle/.746;return{x:mix(w*(this.mobile?.5:.65),w*.5,p),y:mix(h*(this.mobile?.19:.545),h*.5,p),size};}
    target(c,g,t,hit=false){c.save();c.translate(g.x,g.y);if(hit){const dt=t-7300,shake=dt>=0&&dt<180?Math.sin(dt*.13)*3*(1-dt/180):0;c.translate(shake,shake*.4);c.rotate(dt>=0&&dt<500?Math.sin(dt*.046)*.007*Math.exp(-dt/130):0);}c.drawImage(this.images.target,-g.size*this.meta.targetAnchor[0],-g.size*this.meta.targetAnchor[1],g.size,g.size);c.restore();}
    arrow(c,tipX,tipY,length,angle,trail=0){c.save();c.translate(tipX,tipY);c.rotate(angle);const i=this.images.arrow,height=length*i.height/i.width;c.drawImage(i,-length*this.meta.arrowTip[0],-height*this.meta.arrowTip[1],length,height);if(trail){c.globalCompositeOperation="screen";const g=c.createLinearGradient(-length*.85,0,-length*1.4,0);g.addColorStop(0,"rgba(255,222,153,.22)");g.addColorStop(1,"rgba(255,222,153,0)");c.fillStyle=g;c.fillRect(-length*1.4,-1,length*.55,2);}c.restore();}
    atmosphere(t,chase=0){const c=this.c,w=this.w,h=this.h,still=t>4100&&t<4800?.15:1;
      c.save();c.globalCompositeOperation="screen";
      for(let i=0;i<12;i++){const x=((i*.157*w+t*(.0012+i*.0001))%(w*1.5))-w*.25,y=h*(.68+(i%3)*.13)+Math.sin(t*.0003+i)*h*.025,r=w*(.16+i%4*.025);const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(150,165,190,${.015*still})`);g.addColorStop(1,"rgba(150,165,190,0)");c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
      for(let i=0;i<24;i++){const k=i*3.73,x=(Math.sin(k)*.45+.5)*w,y=(h*.96-((t*(.015+i%3*.004)+i*73)%(h*.62)));c.globalAlpha=(.15+.1*Math.sin(t*.005+i))*still;c.fillStyle=i%3?"#ffd09b":"#fff5cf";c.fillRect(x+Math.sin(t*.002+i)*4,y,Math.max(1,w/1300),Math.max(1,h/800));}
      if(chase){for(let i=0;i<28;i++){const a=i/28*Math.PI*2,start=.2+((t*.0011+i*.31)%1)*.5,dx=Math.cos(a),dy=Math.sin(a),r=Math.max(w,h)*start;c.strokeStyle="rgba(186,204,224,.10)";c.lineWidth=1+i%2;c.beginPath();c.moveTo(w*.5+dx*r,h*.5+dy*r*.6);c.lineTo(w*.5+dx*r*(1.10+chase*.25),h*.5+dy*r*.6*(1.10+chase*.25));c.stroke();}}
      c.restore();
    }
    poseAt(t){if(t<1850)return[0,0,0];if(t<2550)return[0,1,smooth((t-1850)/700)];if(t<3100)return[1,2,smooth((t-2550)/550)];if(t<3500)return[2,3,smooth((t-3100)/400)];if(t<3850)return[3,4,smooth((t-3500)/350)];if(t<4100)return[4,5,smooth((t-3850)/250)];if(t<4800)return[5,5,0];if(t<5100)return[5,6,smooth((t-4800)/300)];if(t<5550)return[6,7,smooth((t-5100)/450)];return[7,8,smooth((t-5550)/350)];}
    archer(t){const c=this.c,w=this.w,h=this.h,[a,b,p]=this.poseAt(t),release=clamp((t-4800)/220)*Math.exp(-Math.max(0,t-5200)/600),sprite=this.rig.render(a,b,p,t,release),push=smooth((t-1400)/2700),size=this.mobile?h*.72:h*1.05*(1+push*.035),hipX=w*(this.mobile?.43:.30),hipY=h*1.025,x=hipX-size*this.rig.origin.x/512,y=hipY-size*this.rig.origin.y/512;
      c.drawImage(sprite,x,y,size,size);const rest=this.rig.rest();this.rest={x:x+rest.x/512*size,y:y+rest.y/512*size};this.actorBounds={x,y,size};
    }
    impact(t,g){const c=this.c,dt=t-7300;if(dt<0||dt>750)return;const p=dt/750;c.save();c.globalCompositeOperation="screen";
      if(dt<95){c.fillStyle=`rgba(255,246,213,${.22*(1-dt/95)})`;c.fillRect(0,0,this.w,this.h);}
      const r=8+dt*.08,glow=c.createRadialGradient(g.x,g.y,0,g.x,g.y,r);glow.addColorStop(0,`rgba(255,231,160,${.65*(1-p)})`);glow.addColorStop(1,"rgba(255,231,160,0)");c.fillStyle=glow;c.fillRect(g.x-r,g.y-r,r*2,r*2);
      for(let i=0;i<16;i++){const a=i*2.399,dist=dt*(.055+i%4*.021),x=g.x+Math.cos(a)*dist,y=g.y+Math.sin(a)*dist+dt*dt*.000045;c.globalAlpha=(1-p)*.85;c.fillStyle=i%3?"#ffd84d":"#fff5cf";c.fillRect(x,y,2+i%2,2+i%3);}c.restore();}
    makePixelWorld(){const w=this.mobile?180:320,h=this.mobile?320:180,cvs=makeCanvas(w,h),c=cvs.getContext("2d",{willReadFrequently:true});c.filter="blur(1.25px)";this.background(c,w,h,0,1.13);c.filter="none";const g=this.targetGeometry(1,w,h),radius=g.size*.373;
      // Flat, readable target bands replace realistic surface grain one pixel at a time.
      c.fillStyle="#332941";c.fillRect(g.x-radius*.57,g.y+radius*.8,radius*.15,h);c.fillRect(g.x+radius*.42,g.y+radius*.8,radius*.15,h);c.fillStyle="#aa8653";c.fillRect(g.x-radius*.60,g.y+radius*.82,radius*.15,h);c.fillRect(g.x+radius*.38,g.y+radius*.82,radius*.15,h);
      const data=c.getImageData(0,0,w,h),bands=[[233,185,73],[191,57,71],[50,102,177],[24,31,52],[232,222,192]],shade=[[186,143,54],[148,40,57],[34,73,134],[17,23,42],[184,174,153]];
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,dx=x+.5-g.x,dy=y+.5-g.y,d=Math.hypot(dx,dy)/radius;let best,distance=Infinity;
        if(d<1){const band=Math.min(4,Math.floor(d*5));best=(dx+dy>radius*.63?shade:bands)[band];if(d>.975)best=[51,66,122];}
        else for(const col of PALETTE){const delta=(col[0]-data.data[i])**2*.7+(col[1]-data.data[i+1])**2+(col[2]-data.data[i+2])**2*.8;if(delta<distance){best=col;distance=delta;}}
        data.data[i]=best[0];data.data[i+1]=best[1];data.data[i+2]=best[2];data.data[i+3]=255;}
      c.putImageData(data,0,0);c.imageSmoothingEnabled=false;this.arrow(c,g.x,g.y,this.mobile?w*.43:w*.27,this.mobile?-Math.PI*.29:0);return cvs;}
    pixelTransform(t,g){const elapsed=t-8300,p=smooth(elapsed/2450),c=this.c,w=this.w,h=this.h,cell=w/this.pixelWorld.width,core=g.size*.373,expansion=smooth((elapsed-1050)/1400),r=mix(core*smooth(elapsed/1050),Math.hypot(w,h)*.8,expansion),rx=this.mobile?r*.75:r;this.transformationRadius=r;c.save();c.beginPath();
      for(let row=0;row<this.pixelWorld.height;row++){const y=row*cell,dy=y+cell*.5-g.y;if(Math.abs(dy)>r)continue;const half=rx*Math.sqrt(Math.max(0,1-(dy/r)**2)),left=Math.floor((g.x-half)/cell)*cell,right=Math.ceil((g.x+half)/cell)*cell;c.rect(left,y,right-left,cell);}
      c.clip();c.imageSmoothingEnabled=false;c.drawImage(this.pixelWorld,0,0,w,h);c.restore();
      c.save();c.globalCompositeOperation="screen";for(let i=0;i<20;i++){const a=i*2.399+Math.sin(t*.001)*.05,x=g.x+Math.cos(a)*rx,y=g.y+Math.sin(a)*r;if(x<0||x>w||y<0||y>h)continue;c.fillStyle=i%3?"#ffd84d":"#48c7ff";c.globalAlpha=.35+.5*(i%2);c.fillRect(Math.round(x/cell)*cell,Math.round(y/cell)*cell,cell,cell);}c.restore();return p;}
    title(t){const c=this.c,w=this.w,h=this.h,p=smooth((t-10800)/450),lines=this.mobile?["PIXEL","CLASH"]:["PIXEL CLASH"],cells=this.mobile?29:65,size=Math.max(2,Math.round(w*(this.mobile?.74:.46)/cells)),height=(this.mobile?16:7)*size,width=cells*size,x=(w-width)/2,y=(h-height)/2,settle=t<10900?.88:t<11000?1.08:1;
      c.save();c.globalAlpha=p;c.translate(w/2,h/2);c.scale(settle,settle);c.translate(-w/2,-h/2);c.fillStyle="#080a18";c.fillRect(x-18,y-18,width+36,height+36);c.fillStyle="#ffd84d";c.fillRect(x-18,y-18,width+36,3);c.fillRect(x-18,y+height+15,width+36,3);
      lines.forEach((text,index)=>{let cursor=x;for(const char of text){if(char!==" ")GLYPHS[char].forEach((row,yy)=>[...row].forEach((cell,xx)=>{if(cell==="1"){c.fillStyle="#2658d9";c.fillRect(cursor+xx*size+size,y+index*9*size+yy*size+size,size,size);c.fillStyle=yy<3?"#fff5cf":"#ffd84d";c.fillRect(cursor+xx*size,y+index*9*size+yy*size,size,size);}}));cursor+=(char===" "?5:6)*size;}});c.restore();this.titleBounds={x,y,width,height};
    }
    stateAt(t){return t<1850?"ARCHER_REAR_VIEW":t<4800?"BOW_DRAW":t<5500?"ARROW_RELEASE":t<7300?"ARROW_FOLLOW":t<8300?"TARGET_HIT":t<11100?"TARGET_PIXEL_TRANSFORM":"PIXEL_CLASH_TRANSITION";}
    draw(t){const began=performance.now(),c=this.c,w=this.w,h=this.h,state=this.stateAt(t);c.clearRect(0,0,w,h);c.fillStyle="#080a18";c.fillRect(0,0,w,h);c.save();const releaseShake=t>=4990&&t<5070?Math.sin((t-4990)*.17)*2*(1-(t-4990)/80):0,hitShake=t>=7300&&t<7470?Math.sin((t-7300)*.14)*3*(1-(t-7300)/170):0;c.translate(releaseShake+hitShake,hitShake*.4);
      if(t<5500){this.background(c,w,h,t,1+.025*smooth(t/4100));this.target(c,this.targetGeometry(0),t);this.atmosphere(t);this.archer(t);if(t>=5010){const p=clamp((t-5010)/280),rest=this.rest,tipX=this.mobile?mix(rest.x,w*.5,p):rest.x+p*w*.7,tipY=this.mobile?mix(rest.y,h*.16,p):rest.y-p*h*.025;this.arrow(c,tipX,tipY,this.mobile?w*.18:w*.14,this.mobile?-Math.PI*.43:0,1);}}
      else{const p=smooth((t-5500)/1800),g=this.targetGeometry(p);this.background(c,w,h,t,1.025+p*.105);this.atmosphere(t,t<7300?p:0);this.target(c,g,t,t>=7300);
        if(t<7300){const flight=clamp((t-5500)/1800),angle=this.mobile?mix(-Math.PI*.5,-Math.PI*.29,smooth(flight)):0,tipX=this.mobile?w*.5:mix(w*.48,g.x,flight),tipY=mix(h*(this.mobile?.56:.50),g.y,flight)-Math.sin(flight*Math.PI)*h*.007,length=this.mobile?mix(w*.23,w*.43,flight):mix(w*.16,w*.27,flight);this.arrow(c,tipX,tipY,length,angle,1);}
        else{const wobble=Math.sin((t-7300)*.07)*Math.exp(-(t-7300)/180)*.007;this.arrow(c,g.x,g.y,this.mobile?w*.43:w*.27,(this.mobile?-Math.PI*.29:0)+wobble);this.impact(t,g);if(t>=8300)this.pixelTransform(t,g);if(t>=10800)this.title(t);}
        this.bullseye={x:g.x,y:g.y};
      }c.restore();if(t<600){c.fillStyle=`rgba(0,0,0,${1-smooth(t/600)})`;c.fillRect(0,0,w,h);}const vignette=c.createRadialGradient(w*.5,h*.48,Math.min(w,h)*.18,w*.5,h*.5,Math.max(w,h)*.65);vignette.addColorStop(0,"rgba(0,0,0,0)");vignette.addColorStop(1,"rgba(0,0,0,.34)");c.fillStyle=vignette;c.fillRect(0,0,w,h);this.canvas.dataset.state=state;this.frames++;this.maxDrawMs=Math.max(this.maxDrawMs,performance.now()-began);this.lastTime=t;
    }
    dispose(){this.rig.dispose();this.pixelWorld.width=this.pixelWorld.height=1;}
  }
  window.ConceptScene=ConceptScene;
})();
