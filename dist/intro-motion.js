/* Runtime pose interpolation of the existing photographic atlas.
   No generated bitmap frames, dependencies, or external rendering engine. */
(() => {
  "use strict";
  // Same semantic joints in each 448px source pose: head, neck, bow shoulder,
  // elbow, wrist, draw shoulder/elbow/wrist, bow tips and hair ends.
  const JOINTS = [
    [[287,88],[286,173],[250,207],[212,301],[138,329],[344,203],[360,317],[363,406],[160,25],[152,430],[310,298]],
    [[287,88],[286,173],[251,207],[211,301],[138,329],[345,203],[363,317],[363,406],[148,25],[156,430],[355,296]],
    [[313,92],[313,185],[265,220],[201,240],[143,267],[370,218],[391,327],[392,405],[166,25],[158,430],[361,302]],
    [[289,125],[298,211],[243,235],[175,250],[106,251],[351,208],[388,189],[312,181],[130,22],[159,430],[351,305]],
    [[293,125],[299,214],[249,235],[182,253],[122,251],[358,208],[409,191],[318,181],[160,22],[177,430],[355,305]],
    [[315,125],[319,214],[270,236],[192,256],[134,257],[384,215],[421,183],[331,186],[166,24],[174,430],[369,305]],
    [[310,105],[305,210],[247,234],[166,246],[105,252],[327,218],[359,195],[401,169],[137,22],[160,430],[216,291]],
    [[321,113],[310,215],[253,240],[180,252],[120,255],[360,217],[418,206],[361,171],[170,22],[174,430],[224,290]],
    [[316,122],[310,222],[271,264],[203,282],[141,288],[366,267],[392,341],[390,409],[161,22],[177,430],[358,318]]
  ];
  class CinematicPoseRenderer {
    constructor(image) {
      this.image=image; this.cell=image.naturalWidth/3; this.resolution=512;
      this.origin={x:320,y:480}; this.canvas=document.createElement("canvas");
      this.canvas.width=this.canvas.height=this.resolution;
      this.anchors=this.measureAnchors(); this.pairs=new Map();
      this.grid=[]; const segments=24;
      for(let row=0;row<=segments;row++)for(let col=0;col<=segments;col++)this.grid.push({x:col/segments*this.cell,y:row/segments*this.cell});
      const indices=[];
      for(let row=0;row<segments;row++)for(let col=0;col<segments;col++) {
        const a=row*(segments+1)+col,b=a+1,c=a+segments+1,d=c+1;
        indices.push(a,b,d,a,d,c);
      }
      this.indices=new Uint16Array(indices);this.vertices=new Float32Array(this.grid.length*4);
      try { this.initializeGL(); } catch (_) { this.useFallback(); }
      if(this.mode==="joint-morph") {
        // Prepare joint fits and the first GPU draw before the playback clock
        // starts, rather than introducing a hitch at each new key pose.
        for(let frame=0;frame<8;frame++){this.flow(frame,frame+1);this.flow(frame+1,frame);}
        this.render(0,1,0);
      }
    }
    measureAnchors() {
      const analysis=document.createElement("canvas"),band=36,cell=this.cell;
      analysis.width=cell;analysis.height=band;
      const c=analysis.getContext("2d",{willReadFrequently:true}),anchors=[];
      for(let frame=0;frame<9;frame++) {
        c.clearRect(0,0,cell,band);
        c.drawImage(this.image,frame%3*cell,Math.floor(frame/3)*cell+cell-band,cell,band,0,0,cell,band);
        const pixels=c.getImageData(0,0,cell,band).data;let sum=0,weight=0;
        for(let y=0;y<band;y++)for(let x=Math.round(cell*.42);x<cell;x++) {
          const alpha=pixels[(y*cell+x)*4+3];if(alpha<128)continue;
          const strength=alpha*(y+1)*(y+1);sum+=x*strength;weight+=strength;
        }
        anchors.push({x:weight?sum/weight:285,y:cell-17});
      }
      analysis.width=analysis.height=1;return anchors;
    }
    initializeGL() {
      const gl=this.canvas.getContext("webgl",{alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true,antialias:false});
      if(!gl)throw new Error("WebGL unavailable");this.gl=gl;
      const shader=(type,source)=> {
        const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
        if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw new Error("Pose shader failed");}return s;
      };
      const vertex=shader(gl.VERTEX_SHADER,`attribute vec2 a_position; attribute vec2 a_uv; varying vec2 v_uv;
        void main(){gl_Position=vec4(a_position.x/256.0-1.0,1.0-a_position.y/256.0,0.0,1.0);v_uv=a_uv;}`);
      const fragment=shader(gl.FRAGMENT_SHADER,`precision mediump float; uniform sampler2D u_atlas; uniform float u_weight; varying vec2 v_uv;
        void main(){gl_FragColor=texture2D(u_atlas,v_uv)*u_weight;}`);
      const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
      gl.deleteShader(vertex);gl.deleteShader(fragment);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error("Pose program failed");
      this.program=program;gl.useProgram(program);
      this.position=gl.getAttribLocation(program,"a_position");this.uv=gl.getAttribLocation(program,"a_uv");this.weight=gl.getUniformLocation(program,"u_weight");
      this.vertexBuffer=gl.createBuffer();this.indexBuffer=gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,this.indices,gl.STATIC_DRAW);
      this.texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.image);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(program,"u_atlas"),0);
      // Weighted premultiplied colors ADD to one opaque pose. Source-over
      // crossfades dimmed the body midway through every old 90ms transition.
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);this.mode="joint-morph";
    }
    useFallback() {
      this.releaseGL();
      this.canvas=document.createElement("canvas");this.canvas.width=this.canvas.height=this.resolution;
      this.context=this.canvas.getContext("2d");this.mode="aligned-blend";
    }
    flow(from,to) {
      const key=`${from}:${to}`;if(this.pairs.has(key))return this.pairs.get(key);
      const a=this.anchors[from],b=this.anchors[to];
      const controls=JOINTS[from].map(([x,y],i)=>({x,y,dx:JOINTS[to][i][0]-b.x-(x-a.x),dy:JOINTS[to][i][1]-b.y-(y-a.y)}));
      // Fixed pelvis/cloth boundaries keep body scale and hip position stable.
      [[a.x-55,a.y],[a.x+55,a.y],[a.x,a.y-45],[0,0],[this.cell,0],[0,this.cell],[this.cell,this.cell]].forEach(([x,y])=>controls.push({x,y,dx:0,dy:0}));
      const result=new Float32Array(this.grid.length*2);
      this.grid.forEach((point,i)=> {
        let px=0,py=0,qx=0,qy=0,total=0;
        const weights=[];
        for(const control of controls) {
          const d=(point.x-control.x)**2+(point.y-control.y)**2;
          const w=1/(d+1);weights.push(w);
          px+=control.x*w;py+=control.y*w;qx+=(control.x+control.dx)*w;qy+=(control.y+control.dy)*w;total+=w;
        }
        px/=total;py/=total;qx/=total;qy/=total;
        let dot=0,cross=0,denominator=0;
        controls.forEach((control,index)=> {
          const ax=control.x-px,ay=control.y-py,bx=control.x+control.dx-qx,by=control.y+control.dy-qy,w=weights[index];
          dot+=w*(ax*bx+ay*by);cross+=w*(ax*by-ay*bx);denominator+=w*(ax*ax+ay*ay);
        });
        // Local similarity fitting rotates limbs instead of dragging isolated
        // vertices into sharp folds. Bound local scale to preserve cloth detail.
        let cosine=dot/Math.max(denominator,.001),sine=cross/Math.max(denominator,.001);
        const scale=Math.hypot(cosine,sine),bounded=Math.max(.75,Math.min(1.25,scale));
        if(scale>.001){cosine*=bounded/scale;sine*=bounded/scale;}
        const vx=point.x-px,vy=point.y-py;
        result[i*2]=qx+cosine*vx-sine*vy-point.x;
        result[i*2+1]=qy+sine*vx+cosine*vy-point.y;
      });this.pairs.set(key,result);return result;
    }
    drawMesh(frame,other,movement,weight) {
      if(weight<.0001)return;
      const gl=this.gl,anchor=this.anchors[frame],flow=this.flow(frame,other);
      this.grid.forEach((point,i)=> {
        const at=i*4;
        this.vertices[at]=this.origin.x+point.x-anchor.x+flow[i*2]*movement;
        this.vertices[at+1]=this.origin.y+point.y-anchor.y+flow[i*2+1]*movement;
        this.vertices[at+2]=(frame%3+point.x/this.cell)/3;
        this.vertices[at+3]=(Math.floor(frame/3)+point.y/this.cell)/3;
      });
      gl.bindBuffer(gl.ARRAY_BUFFER,this.vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,this.vertices,gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(this.position);
      gl.vertexAttribPointer(this.uv,2,gl.FLOAT,false,16,8);gl.enableVertexAttribArray(this.uv);
      gl.uniform1f(this.weight,weight);gl.drawElements(gl.TRIANGLES,this.indices.length,gl.UNSIGNED_SHORT,0);
    }
    render(from,to,blend) {
      if(this.gl?.isContextLost())this.useFallback();
      if(this.mode==="joint-morph") {
        const gl=this.gl;gl.viewport(0,0,this.resolution,this.resolution);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);
        const t=Math.max(0,Math.min(1,(blend-.46)/.08)),weight=t*t*(3-2*t);
        // Morph one opaque source pose continuously. A short texture handoff,
        // rather than a long dissolve, prevents translucent double bodies/bows.
        this.drawMesh(from,to,blend,1-weight);this.drawMesh(to,from,1-blend,weight);
      }else {
        const c=this.context;c.clearRect(0,0,this.resolution,this.resolution);c.globalCompositeOperation="lighter";
        [[from,1-blend],[to,blend]].forEach(([frame,weight])=> {
          const anchor=this.anchors[frame];c.globalAlpha=weight;
          c.drawImage(this.image,frame%3*this.cell,Math.floor(frame/3)*this.cell,this.cell,this.cell,this.origin.x-anchor.x,this.origin.y-anchor.y,this.cell,this.cell);
        });c.globalAlpha=1;c.globalCompositeOperation="source-over";
      }
      return this.canvas;
    }
    arrowRest(frame=5) {
      const anchor=this.anchors[frame],wrist=JOINTS[frame][4];
      return {x:wrist[0]-anchor.x-10,y:wrist[1]-anchor.y-18};
    }
    releaseGL() {
      if(this.gl) {
        this.gl.deleteTexture(this.texture);this.gl.deleteBuffer(this.vertexBuffer);this.gl.deleteBuffer(this.indexBuffer);this.gl.deleteProgram(this.program);
      }
      this.gl=null;
    }
    dispose() {
      this.releaseGL();
      this.canvas.width=this.canvas.height=1;this.pairs.clear();this.image=null;
    }
  }
  window.CinematicPoseRenderer=CinematicPoseRenderer;
})();
