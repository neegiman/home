/* Cinematic archery -> pixel-world opening. Independent of tournament state. */
(() => {
  "use strict";
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  // Preserve visit records when replacing artwork, so returning players skip it.
  const STORAGE_KEY = `pixel-clash:opening:v1:${new URL(".", location.href).pathname}`;
  const TIMING = Object.freeze({ release:3700, track:4100, hit:4800, transform:5950, title:7150, transition:7350, wipe:7600, end:8000 });
  const SEQUENCE = Object.freeze([
    ["INTRO_DARK", 0, 120], ["ARCHER_REAR_VIEW", 120, 1750],
    ["BOW_DRAW", 1750, TIMING.release], ["ARROW_RELEASE", TIMING.release, TIMING.hit],
    ["TARGET_HIT", TIMING.hit, TIMING.transform], ["TARGET_PIXEL_TRANSFORM", TIMING.transform, TIMING.transition],
    ["PIXEL_CLASH_TRANSITION", TIMING.transition, TIMING.end]
  ]);
  const POSES = [[0,0],[1000,1],[1850,2],[2450,3],[3020,4],[3450,5],[3700,5],[3830,6],[4050,7],[4400,8]];
  const GLYPHS = {
    P:["11110","10001","10001","11110","10000","10000","10000"],
    I:["11111","00100","00100","00100","00100","00100","11111"],
    X:["10001","10001","01010","00100","01010","10001","10001"],
    E:["11111","10000","10000","11110","10000","10000","11111"],
    L:["10000","10000","10000","10000","10000","10000","11111"],
    C:["01111","10000","10000","10000","10000","10000","01111"],
    A:["01110","10001","10001","11111","10001","10001","10001"],
    S:["01111","10000","10000","01110","00001","00001","11110"],
    H:["10001","10001","10001","11111","10001","10001","10001"]
  };

  class CinematicIntroAnimation {
    static active = null;
    static seen = false;
    static rememberVisit() {
      CinematicIntroAnimation.seen = true;
      for (const name of ["localStorage", "sessionStorage"]) {
        try { window[name].setItem(STORAGE_KEY, "seen"); } catch (_) { /* Optional storage. */ }
      }
    }
    static shouldPlay(params = new URLSearchParams(location.search)) {
      if (params.get("mode") === "tournament" || params.has("share")) return false;
      if (window.performance?.getEntriesByType?.("navigation")?.[0]?.type === "reload") return false;
      if (params.get("intro") === "1") return true; // Explicit preview, never a reload.
      for (const name of ["localStorage", "sessionStorage"]) {
        try { if (window[name].getItem(STORAGE_KEY) === "seen") return false; } catch (_) { /* Try the other store. */ }
      }
      return !CinematicIntroAnimation.seen;
    }

    constructor(canvas, { view, skipButton, caption, onReveal, onComplete } = {}) {
      this.canvas = canvas; this.context = canvas.getContext("2d", { alpha: true });
      this.view = view; this.skipButton = skipButton; this.caption = caption;
      this.onReveal = onReveal || (() => {}); this.onComplete = onComplete || (() => {});
      this.elapsed = 0; this.frameId = 0; this.running = false; this.ready = false; this.revealed = false;
      this.controller = new AbortController();
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.duration = this.reduced ? 600 : TIMING.end;
      this.camera = { x: 0, y: 0, zoom: 1, shakeX: 0, shakeY: 0 };
      const tokens = getComputedStyle(document.documentElement);
      this.palette = Object.fromEntries(["ink","navy","panel","panel-2","line","cream","gold","orange","red","blue","blue-dark"].map(key => [key,tokens.getPropertyValue(`--${key}`).trim()]));
      this.assets = [];
      const loadImage = path => {
        const image = new Image(); image.decoding = "async"; image.src = path; this.assets.push(image); return image;
      };
      // Photographic assets are loaded only when the opening is instantiated.
      if (!this.reduced) {
        this.archer = loadImage("assets/intro/cinematic-v3/archer-poses.webp");
        this.arena = loadImage("assets/intro/cinematic-v3/arena.webp");
        this.target = loadImage("assets/intro/cinematic-v3/target.webp");
        this.arrowImage = loadImage("assets/intro/cinematic-v3/arrow.webp");
      }
      this.gameArena = loadImage("assets/backgrounds/champion-arena.png");
      this.pixelWorld = document.createElement("canvas"); this.portal = document.createElement("canvas"); this.logo = this.createLogo();
      const { signal } = this.controller;
      skipButton?.addEventListener("click", () => this.finish("skip"), { signal });
      window.addEventListener("keydown", event => { if (event.key === "Escape") this.finish("skip"); }, { signal });
      window.addEventListener("resize", () => this.resize(), { signal });
      window.addEventListener("pagehide", () => this.finish("pagehide"), { signal });
      document.addEventListener("visibilitychange", () => {
        cancelAnimationFrame(this.frameId); this.frameId = 0;
        if (this.running && this.ready && !document.hidden) { this.lastTime = performance.now(); this.queueFrame(); }
      }, { signal });
    }

    async start() {
      if (this.running) return;
      CinematicIntroAnimation.active?.finish("replaced");
      CinematicIntroAnimation.active = this; this.running = true;
      CinematicIntroAnimation.rememberVisit();
      document.documentElement.classList.remove("intro-pending"); document.body.classList.add("intro-playing");
      this.view.hidden = false; this.skipButton.hidden = false; this.caption.hidden = false;
      this.canvas.dataset.running = "true"; this.canvas.dataset.pixelCoverage = "0";
      delete this.canvas.dataset.fallback; delete this.canvas.dataset.spriteFrame;
      delete this.canvas.dataset.motionMode; delete this.canvas.dataset.poseMix;
      this.resize(); this.draw(0);
      const loaded = this.reduced || await this.waitForAssets();
      if (!this.running) return;
      if (!loaded) { this.reduced = true; this.duration = 600; this.canvas.dataset.fallback = "asset-timeout"; }
      if(!this.reduced && window.CinematicPoseRenderer) {
        this.poseRenderer=new window.CinematicPoseRenderer(this.archer);
        this.canvas.dataset.motionMode=this.poseRenderer.mode;
      }
      // Prepare the pixel destination and upload image layers while still black;
      // the first portal frame should not pay the cost of building all its art.
      if(!this.reduced)this.buildPixelWorld();
      this.draw(0);
      this.ready = true; this.lastTime = performance.now();
      if (!document.hidden) this.queueFrame();
    }

    waitForAssets() {
      const imageReady = image => image.complete ? Promise.resolve(Boolean(image.naturalWidth)) : new Promise(resolve => {
        const done = () => {
          image.removeEventListener("load", done); image.removeEventListener("error", done);
          this.controller.signal.removeEventListener("abort", done); resolve(Boolean(image.naturalWidth));
        };
        image.addEventListener("load", done, { once: true }); image.addEventListener("error", done, { once: true });
        this.controller.signal.addEventListener("abort", done, { once: true });
      });
      return new Promise(resolve => {
        this.assetTimer = setTimeout(() => resolve(false), 2500);
        Promise.all(this.assets.map(imageReady)).then(results => { clearTimeout(this.assetTimer); resolve(results.every(Boolean)); });
      });
    }

    resize() {
      this.width = innerWidth; this.height = innerHeight;
      // Smooth HiDPI cinema before impact. Only the game layer is low-resolution.
      this.dpr = Math.min(devicePixelRatio || 1, 2, 1920 / this.width);
      this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
      this.context.setTransform(this.dpr,0,0,this.dpr,0,0);
      this.context.imageSmoothingEnabled = true; this.context.imageSmoothingQuality = "high";
      this.pixelScale = this.width < 700 ? 2 : 3;
      this.pixelWorld.width = Math.ceil(this.width / this.pixelScale); this.pixelWorld.height = Math.ceil(this.height / this.pixelScale);
      this.portal.width=this.pixelWorld.width;this.portal.height=this.pixelWorld.height;this.portalIndex=0;this.portalProgress=0;
      this.worldDirty = true;
      const target = this.targetLayout(TIMING.hit), block = this.pixelScale * 4;
      this.cells = [];
      const maxDistance = Math.max(...[[0,0],[this.width,0],[0,this.height],[this.width,this.height]].map(([x,y]) => Math.hypot(x-target.x,y-target.y)));
      for (let y=0; y<this.height; y+=block) for (let x=0; x<this.width; x+=block) {
        const distance = Math.hypot(x+block/2-target.x,y+block/2-target.y);
        const noise = (Math.sin(x*12.9898+y*78.233)*43758.5453)%1;
        // Target first, then arena: a radial front, not a global downsample.
        const threshold = distance <= target.r*1.12 ? distance/(target.r*1.12)*.48 : .48+(distance-target.r*1.12)/(maxDistance-target.r*1.12)*.49;
        this.cells.push({ x,y,size:block,at:clamp(threshold+noise*.016,0,.99) });
      }
      this.sortedCells=[...this.cells].sort((a,b)=>a.at-b.at);
      if (this.running) this.draw(this.elapsed);
    }

    queueFrame() {
      if (this.frameId || !this.running) return;
      this.frameId = requestAnimationFrame(now => {
        this.frameId = 0; if (!this.running) return;
        this.update(Math.min(100,Math.max(0,now-this.lastTime))); this.lastTime = now;
        if (this.elapsed >= this.duration) { this.finish("complete"); return; }
        this.draw(this.elapsed); this.queueFrame();
      });
    }
    update(deltaTime) { this.elapsed += deltaTime; }
    stateAt(elapsed) {
      if (this.reduced) return { name:"PIXEL_CLASH_TRANSITION", progress:clamp((elapsed-450)/150) };
      const entry = SEQUENCE.find(([,start,end]) => elapsed >= start && elapsed < end) || SEQUENCE.at(-1);
      return { name:entry[0], progress:clamp((elapsed-entry[1])/(entry[2]-entry[1])) };
    }

    updateCamera(elapsed) {
      const flight = smooth((elapsed-TIMING.track)/(TIMING.hit-TIMING.track));
      this.camera.zoom = elapsed < TIMING.track ? 1+.025*smooth((elapsed-2700)/650) : mix(1.025,1.24,flight);
      this.camera.x = flight*.035*this.width; this.camera.y = flight*.018*this.height;
      this.camera.shakeX = this.camera.shakeY = 0;
      if (elapsed>=TIMING.release && elapsed<TIMING.release+80) this.camera.shakeX = Math.sin(elapsed*.14)*1.8*(1-(elapsed-TIMING.release)/80);
      if (elapsed>=TIMING.hit && elapsed<TIMING.hit+150) {
        const decay = 1-(elapsed-TIMING.hit)/150;
        this.camera.shakeX = Math.sin(elapsed*.12)*3*decay; this.camera.shakeY = Math.cos(elapsed*.17)*2*decay;
      }
    }

    cover(c, image, w, h, zoom=1, ox=0, oy=0) {
      if (!image?.naturalWidth) return;
      const scale = Math.max(w/image.naturalWidth,h/image.naturalHeight)*zoom;
      const iw = image.naturalWidth*scale, ih = image.naturalHeight*scale;
      c.drawImage(image,(w-iw)/2+ox,(h-ih)/2+oy,iw,ih);
    }

    drawArena(elapsed) {
      const c=this.context,w=this.width,h=this.height;
      c.fillStyle="#04070e"; c.fillRect(0,0,w,h);
      this.cover(c,this.arena,w,h,this.camera.zoom,-this.camera.x,-this.camera.y);
      const flight=smooth((elapsed-TIMING.track)/(TIMING.hit-TIMING.track));
      c.fillStyle="rgba(3,9,20,.16)"; c.fillRect(0,0,w,h);
      const haze=c.createLinearGradient(0,h*.28,0,h);
      haze.addColorStop(0,"rgba(36,58,89,.02)"); haze.addColorStop(.5,"rgba(36,58,89,.12)"); haze.addColorStop(1,"rgba(1,4,9,.62)");
      c.fillStyle=haze; c.fillRect(0,0,w,h);
      if (flight>0 && elapsed<TIMING.hit) {
        c.save(); c.globalAlpha=Math.sin(flight*Math.PI)*.17; c.lineWidth=1.5;
        for(let i=0;i<12;i++) {
          const x=(i+.5)/12*w, shift=(flight*430*(i%3+1))%w;
          c.strokeStyle=i%2?"#87aac6":"#e1d1ac"; c.beginPath();
          c.moveTo(x-shift,h*.71); c.lineTo(x-shift-w*.12,h*.83); c.stroke();
        }
        c.restore();
      }
      const vignette=c.createRadialGradient(w*.52,h*.43,Math.min(w,h)*.12,w*.5,h*.5,Math.max(w,h)*.70);
      vignette.addColorStop(0,"rgba(0,0,0,0)"); vignette.addColorStop(1,"rgba(0,0,0,.65)");
      c.fillStyle=vignette; c.fillRect(0,0,w,h);
    }

    archerLayout() {
      const size=Math.min(this.height*.95,this.width*1.5);
      return { size, x:this.width*(this.width<700?.24:.33), bottom:this.height*1.04 };
    }
    poseAt(elapsed) {
      let index=0;
      while(index<POSES.length-1 && elapsed>=POSES[index+1][0]) index++;
      const current=POSES[index],next=POSES[Math.min(index+1,POSES.length-1)];
      const blend=next[0]===current[0]?0:clamp((elapsed-current[0])/(next[0]-current[0]));
      return { from:current[1],to:next[1],frame:blend<.5?current[1]:next[1],previous:current[1],blend };
    }
    drawArcher(elapsed) {
      if (!this.archer?.naturalWidth || elapsed>=TIMING.hit) return;
      const c=this.context,{size,x,bottom}=this.archerLayout(),cell=this.archer.naturalWidth/3;
      const {frame,from,to,blend}=this.poseAt(elapsed);
      this.canvas.dataset.spriteFrame=String(frame);
      this.canvas.dataset.poseMix=blend.toFixed(4);
      const leave=1-smooth((elapsed-4350)/400), reveal=smooth((elapsed-160)/420);
      c.save(); c.translate(x,bottom); c.scale(-1,1);
      c.globalAlpha=leave*reveal;
      if(this.poseRenderer) {
        const image=this.poseRenderer.render(from,to,blend),scale=size/cell,origin=this.poseRenderer.origin;
        c.drawImage(image,-origin.x*scale,-origin.y*scale,image.width*scale,image.height*scale);
      }else c.drawImage(this.archer,frame%3*cell,Math.floor(frame/3)*cell,cell,cell,-size*(285/448),-size*(430/448),size,size);
      c.restore();
      const shadow=c.createLinearGradient(0,this.height*.82,0,this.height);
      shadow.addColorStop(0,"rgba(0,0,0,0)"); shadow.addColorStop(1,"rgba(0,0,0,.55)");
      c.fillStyle=shadow; c.fillRect(0,this.height*.82,this.width,this.height*.18);
    }

    targetLayout(elapsed) {
      const close=smooth((elapsed-TIMING.track)/(TIMING.hit-TIMING.track)),w=this.width,h=this.height;
      return { x:mix(w*.67,w*.5,close), y:mix(h*(w<700?.67:.51),h*.46,close), r:mix(Math.min(w,h)*.047,Math.min(w*.39,h*.31),close) };
    }
    drawTarget(elapsed) {
      if (!this.target?.naturalWidth) return;
      const c=this.context,{x,y,r}=this.targetLayout(elapsed);
      // Projectile, photographic disc, close-up and pixel target share this anchor.
      c.save(); c.shadowColor="rgba(0,0,0,.6)"; c.shadowBlur=r*.12; c.shadowOffsetY=r*.04;
      c.drawImage(this.target,x-r,y-r,r*2,r*2); c.restore();
      const stand=c.createLinearGradient(x-r*.3,0,x+r*.3,0);
      stand.addColorStop(0,"#090d11"); stand.addColorStop(.5,"#36424a"); stand.addColorStop(1,"#070b11");
      c.strokeStyle=stand; c.lineWidth=Math.max(2,r*.035);
      c.beginPath();c.moveTo(x-r*.38,y+r*.85);c.lineTo(x-r*.52,y+r*1.43);c.moveTo(x+r*.38,y+r*.85);c.lineTo(x+r*.52,y+r*1.43);c.stroke();
      if(elapsed>=TIMING.hit)this.drawArrow(x,y,r*.9,-.39,false);
    }
    drawArrow(x,y,length,angle,pixel=false,trail=0,context=this.context) {
      const c=context;c.save();c.translate(x,y);c.rotate(angle);
      const thickness=Math.max(pixel?1:1.3,length*.012);
      if(trail) {
        const g=c.createLinearGradient(-length-trail,0,-length,0);
        g.addColorStop(0,"rgba(201,217,225,0)");g.addColorStop(1,"rgba(233,225,197,.34)");
        c.fillStyle=g;c.fillRect(-length-trail,-thickness,trail,thickness*2);
      }
      if(!pixel && this.arrowImage?.naturalWidth) {
        const height=length*this.arrowImage.naturalHeight/this.arrowImage.naturalWidth;
        c.drawImage(this.arrowImage,-length,-height/2,length,height);c.restore();return;
      }
      c.fillStyle=pixel?this.palette.cream:"#d5cdb5";c.fillRect(-length,-thickness*.5,length,thickness);
      c.fillStyle=pixel?this.palette.gold:"#444d55";c.fillRect(-length,-thickness*.5,length,thickness*.35);
      c.fillStyle=pixel?this.palette.red:"#b52442";
      c.beginPath();c.moveTo(-length,0);c.lineTo(-length*.84,-thickness*4);c.lineTo(-length*.69,-thickness*3);c.lineTo(-length*.76,0);c.closePath();c.fill();
      c.fillStyle=pixel?this.palette.cream:"#eee9df";
      c.beginPath();c.moveTo(-length,0);c.lineTo(-length*.88,thickness*4);c.lineTo(-length*.71,thickness*3);c.lineTo(-length*.77,0);c.closePath();c.fill();
      c.fillStyle=pixel?this.palette.gold:"#adb6bd";
      c.beginPath();c.moveTo(0,0);c.lineTo(-thickness*6,-thickness*2);c.lineTo(-thickness*6,thickness*2);c.closePath();c.fill();c.restore();
    }
    drawFlight(elapsed) {
      if(elapsed<TIMING.release || elapsed>=TIMING.hit)return;
      const t=clamp((elapsed-TIMING.release)/(TIMING.hit-TIMING.release)),target=this.targetLayout(elapsed),archer=this.archerLayout();
      const rest=this.poseRenderer?.arrowRest(),scale=archer.size/448;
      const start=rest?{x:archer.x-rest.x*scale,y:archer.bottom+rest.y*scale}:
        {x:archer.x+archer.size*(285/448-.27),y:archer.bottom-archer.size*(430/448-.44)};
      // Fast initial acceleration clears the bow instead of drifting across the
      // archer's hair; the camera then follows the projectile into the target.
      const travel=1-(1-t)**3;
      const x=mix(start.x,target.x,travel),y=mix(start.y,target.y,travel)-Math.sin(travel*Math.PI)*this.height*.045;
      const angle=mix(Math.atan2(target.y-start.y,target.x-start.x),-.39,smooth((t-.6)/.4));
      if(elapsed<TIMING.release+70) {
        const c=this.context,fade=1-(elapsed-TIMING.release)/70;
        const light=c.createRadialGradient(start.x,start.y,0,start.x,start.y,22);
        light.addColorStop(0,`rgba(251,240,215,${.45*fade})`);light.addColorStop(1,"rgba(251,240,215,0)");
        c.fillStyle=light;c.fillRect(start.x-22,start.y-22,44,44);
      }
      // Perspective, a small trajectory and lens trail, not simple x translation.
      this.drawArrow(x,y,mix(this.width*.19,target.r*.9,travel),angle,false,this.width*.14*(1-travel));
    }
    drawImpact(elapsed) {
      const age=elapsed-TIMING.hit;if(age<0 || age>570)return;
      const c=this.context,{x,y,r}=this.targetLayout(TIMING.hit),t=age/570;
      if(age<80){c.fillStyle=`rgba(255,235,190,${.16*(1-age/80)})`;c.fillRect(0,0,this.width,this.height);}
      for(let i=0;i<16;i++) {
        const angle=i*2.399,speed=r*(.14+(i%5)*.06),px=x+Math.cos(angle)*speed*t,py=y+Math.sin(angle)*speed*t+r*.15*t*t;
        c.globalAlpha=(1-t)*.8;c.fillStyle=i%3?"#d1ad73":"#eddcc0";
        c.beginPath();c.ellipse(px,py,i%4===0?2:1,.7,angle,0,Math.PI*2);c.fill();
      }
      c.globalAlpha=1;
    }

    buildPixelWorld() {
      if(!this.worldDirty)return;
      const c=this.pixelWorld.getContext("2d"),w=this.pixelWorld.width,h=this.pixelWorld.height,s=this.pixelScale;
      c.imageSmoothingEnabled=false;c.fillStyle=this.palette.ink;c.fillRect(0,0,w,h);
      this.cover(c,this.gameArena,w,h);c.fillStyle="rgba(8,10,24,.52)";c.fillRect(0,0,w,h);
      const target=this.targetLayout(TIMING.hit),x=Math.round(target.x/s),y=Math.round(target.y/s),r=Math.round(target.r/s);
      // Newly drawn game art, not a globally downsampled photograph.
      c.fillStyle=this.palette.line;c.fillRect(x-r*.4,y+r*.85,3,r*.6);c.fillRect(x+r*.4-3,y+r*.85,3,r*.6);
      for(let py=-r-2;py<r+2;py+=2)for(let px=-r-2;px<r+2;px+=2) {
        const d=Math.hypot(px+1,py+1)/r;if(d>1.025)continue;
        c.fillStyle=d>1?this.palette.ink:d>.81?this.palette.cream:d>.61?this.palette.navy:d>.40?this.palette.blue:d>.19?this.palette.red:this.palette.gold;
        c.fillRect(x+px,y+py,2,2);
        if(d>.94 && (px+py)%12===0){c.fillStyle=this.palette.gold;c.fillRect(x+px,y+py,2,1);}
      }
      this.drawArrow(x,y,r*.9,-.39,true,0,c);this.worldDirty=false;
    }
    drawTransformation(progress) {
      this.buildPixelWorld();const c=this.context,s=this.pixelScale;
      c.save();c.imageSmoothingEnabled=false;let changed=0;
      if(progress>=1) {
        c.drawImage(this.pixelWorld,0,0,this.width,this.height);c.restore();
        this.canvas.dataset.pixelCoverage="1.000";return;
      }
      const portal=this.portal.getContext("2d");portal.imageSmoothingEnabled=false;
      if(progress<this.portalProgress){portal.clearRect(0,0,this.portal.width,this.portal.height);this.portalIndex=0;}
      while(this.portalIndex<this.sortedCells.length && this.sortedCells[this.portalIndex].at<=progress) {
        const cell=this.sortedCells[this.portalIndex++];
        portal.drawImage(this.pixelWorld,cell.x/s,cell.y/s,cell.size/s,cell.size/s,cell.x/s,cell.y/s,cell.size/s,cell.size/s);
      }
      this.portalProgress=progress;changed=this.portalIndex;c.drawImage(this.portal,0,0,this.width,this.height);
      // Only the active edge lights up; completed tiles are cached, not re-drawn.
      for(let i=this.portalIndex-1;i>=0 && progress-this.sortedCells[i].at<.026;i--) {
        const cell=this.sortedCells[i];c.globalAlpha=.45;c.fillStyle=cell.x%24?this.palette.gold:this.palette.blue;c.fillRect(cell.x,cell.y,cell.size,cell.size);
      }
      c.restore();this.canvas.dataset.pixelCoverage=(changed/this.cells.length).toFixed(3);
    }
    createLogo() {
      const logo=document.createElement("canvas");logo.width=66;logo.height=12;
      const c=logo.getContext("2d");let cursor=1;
      for(const [index,letter] of [..."PIXEL CLASH"].entries()) {
        if(letter===" "){cursor+=4;continue;}
        GLYPHS[letter].forEach((row,y)=>[...row].forEach((bit,x)=>{if(bit==="1") {
          c.fillStyle=this.palette["panel-2"];c.fillRect(cursor+x+1,y+4,1,1);
          c.fillStyle=index<5?this.palette.gold:this.palette.cream;c.fillRect(cursor+x,y+1,1,1);
        }}));cursor+=6;
      }
      return logo;
    }
    drawTitle(elapsed) {
      const c=this.context,w=this.width,h=this.height;
      const pop=this.reduced?1:mix(.94,1,Math.floor(clamp((elapsed-TIMING.title)/180)*4)/4);
      const width=Math.round(Math.min(w*.78,680)*pop),height=width*12/66,x=(w-width)/2,y=h*.16-height/2;
      c.save();c.imageSmoothingEnabled=false;
      c.fillStyle=this.palette.line;c.fillRect(x-12,y-12,width+24,height+24);
      c.fillStyle=this.palette.panel;c.fillRect(x-9,y-9,width+18,height+18);
      c.drawImage(this.logo,x,y,width,height);c.restore();
    }
    transitionToRegistration(progress) {
      if(!this.revealed){this.revealed=true;this.onReveal();this.caption.hidden=true;}
      if(progress<=0)return;
      const c=this.context,center=this.targetLayout(TIMING.hit);
      const far=Math.hypot(Math.max(center.x,this.width-center.x),Math.max(center.y,this.height-center.y));
      for(const cell of this.cells)if(Math.hypot(cell.x-center.x,cell.y-center.y)<far*progress*1.05)c.clearRect(cell.x,cell.y,cell.size,cell.size);
    }
    draw(elapsed) {
      this.state=this.stateAt(elapsed);
      const {name,progress}=this.state,c=this.context,w=this.width,h=this.height;
      this.canvas.dataset.state=name;this.view.dataset.state=name;
      this.canvas.dataset.renderMode=elapsed<TIMING.transform&&!this.reduced?"cinematic":"pixel-portal";
      c.setTransform(this.dpr,0,0,this.dpr,0,0);c.globalAlpha=1;c.imageSmoothingEnabled=true;c.clearRect(0,0,w,h);
      if(this.reduced) {
        c.fillStyle=this.palette.ink;c.fillRect(0,0,w,h);this.drawTitle(elapsed);
        document.body.style.setProperty("--intro-crt",".14");
        if(progress>0)this.transitionToRegistration(progress);
      }else {
        this.updateCamera(elapsed);c.save();c.translate(this.camera.shakeX,this.camera.shakeY);
        this.drawArena(elapsed);this.drawTarget(elapsed);this.drawArcher(elapsed);this.drawFlight(elapsed);this.drawImpact(elapsed);
        if(elapsed<600){c.fillStyle=`rgba(0,0,0,${1-smooth(elapsed/600)})`;c.fillRect(0,0,w,h);}
        c.restore();
        const conversion=name==="TARGET_PIXEL_TRANSFORM"?progress:name==="PIXEL_CLASH_TRANSITION"?1:0;
        document.body.style.setProperty("--intro-crt",String(.14*conversion));
        if(conversion>0)this.drawTransformation(conversion);
        else this.canvas.dataset.pixelCoverage="0";
        if(elapsed>=TIMING.title)this.drawTitle(elapsed);
        if(name==="PIXEL_CLASH_TRANSITION")this.transitionToRegistration(clamp((elapsed-TIMING.wipe)/(TIMING.end-TIMING.wipe)));
      }
      const captions={TARGET_PIXEL_TRANSFORM:"정확한 한 발, 새로운 세계",PIXEL_CLASH_TRANSITION:"운명의 대결을 시작하세요"};
      if(!this.revealed)this.caption.textContent=captions[name]||"";
    }
    finish(reason="complete") {
      if(!this.running)return;
      this.running=false;cancelAnimationFrame(this.frameId);this.frameId=0;clearTimeout(this.assetTimer);
      this.controller.abort();this.assets.length=0;
      this.canvas.dataset.running="false";this.canvas.dataset.state="REGISTRATION";this.view.hidden=true;
      this.canvas.width=this.canvas.height=1;this.pixelWorld.width=this.pixelWorld.height=1;this.portal.width=this.portal.height=1;
      this.poseRenderer?.dispose();this.poseRenderer=null;
      this.archer=this.arena=this.target=this.arrowImage=this.gameArena=null;
      document.documentElement.classList.remove("intro-pending");document.body.classList.remove("intro-playing");
      document.body.style.removeProperty("--intro-crt");
      if(CinematicIntroAnimation.active===this)CinematicIntroAnimation.active=null;
      this.onComplete(reason);
    }
  }
  window.CinematicIntroAnimation=CinematicIntroAnimation;
  // Retain the app's bootstrap contract, not the old cutscene implementation.
  window.IntroAnimation=CinematicIntroAnimation;
  if(CinematicIntroAnimation.shouldPlay())document.documentElement.classList.add("intro-pending");
})();
