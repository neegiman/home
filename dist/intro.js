/* Original archery opening. No tournament state, participant data, or remote assets. */
(() => {
  "use strict";
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const STORAGE_KEY = `pixel-clash:opening:v1:${new URL(".", location.href).pathname}`;
  const SEQUENCE = Object.freeze([
    ["INTRO_DARK", 0, 200], ["ARCHER_DRAW", 200, 1800],
    ["FULL_TENSION", 1800, 2100], ["ARROW_RELEASE", 2100, 2350],
    ["ARROW_FOLLOW", 2350, 3500], ["TARGET_HIT", 3500, 4500],
    ["TITLE_REVEAL", 4500, 5000], ["PAGE_TRANSITION", 5000, 5300]
  ]);
  const GLYPHS = {
    P: ["11110","10001","10001","11110","10000","10000","10000"],
    I: ["11111","00100","00100","00100","00100","00100","11111"],
    X: ["10001","10001","01010","00100","01010","10001","10001"],
    E: ["11111","10000","10000","11110","10000","10000","11111"],
    L: ["10000","10000","10000","10000","10000","10000","11111"],
    C: ["01111","10000","10000","10000","10000","10000","01111"],
    A: ["01110","10001","10001","11111","10001","10001","10001"],
    S: ["01111","10000","10000","01110","00001","00001","11110"],
    H: ["10001","10001","10001","11111","10001","10001","10001"]
  };

  class IntroAnimation {
    static active = null;
    static shouldPlay(params = new URLSearchParams(location.search)) {
      if (params.get("mode") === "tournament" || params.has("share")) return false;
      if (params.get("intro") === "1") return true; // Development replay, no extra production button.
      try { return sessionStorage.getItem(STORAGE_KEY) !== "seen"; } catch (_) { return true; }
    }

    constructor(canvas, { view, skipButton, caption, onReveal, onComplete } = {}) {
      this.canvas = canvas;
      this.context = canvas.getContext("2d", { alpha: true });
      this.view = view;
      this.skipButton = skipButton;
      this.caption = caption;
      this.onReveal = onReveal || (() => {});
      this.onComplete = onComplete || (() => {});
      this.elapsed = 0;
      this.frameId = 0;
      this.running = false;
      this.ready = false;
      this.revealed = false;
      this.controller = new AbortController();
      this.camera = { x: 0, y: 0, zoom: 1, shakeX: 0, shakeY: 0 };
      this.arrow = { x: 0, y: 0, angle: 0 };
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.duration = this.reduced ? 600 : 5300;
      const tokens = getComputedStyle(document.documentElement);
      this.palette = Object.fromEntries(["ink","navy","panel","panel-2","line","cream","gold","orange","red","blue","blue-dark","muted"].map(key => [key, tokens.getPropertyValue(`--${key}`).trim()]));
      this.archer = new Image();
      this.arena = new Image();
      this.archer.decoding = this.arena.decoding = "async";
      this.archer.src = "assets/characters/intro-archer-v1.png";
      this.arena.src = "assets/backgrounds/champion-arena.png";
      this.logo = this.createLogo();
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
      IntroAnimation.active?.finish("replaced");
      IntroAnimation.active = this;
      this.running = true;
      try { sessionStorage.setItem(STORAGE_KEY, "seen"); } catch (_) { /* Storage is optional. */ }
      document.documentElement.classList.remove("intro-pending");
      document.body.classList.add("intro-playing");
      this.view.hidden = false;
      this.skipButton.hidden = false;
      this.caption.hidden = false;
      this.canvas.dataset.running = "true";
      this.resize();
      this.draw(0);
      const loaded = this.reduced || await this.waitForAssets();
      if (!this.running) return;
      if (!loaded) { this.reduced = true; this.duration = 600; }
      this.ready = true;
      this.lastTime = performance.now();
      if (!document.hidden) this.queueFrame();
    }

    waitForAssets() {
      const imageReady = image => image.complete
        ? Promise.resolve(Boolean(image.naturalWidth))
        : new Promise(resolve => {
          const done = () => { image.removeEventListener("load", done); image.removeEventListener("error", done); resolve(Boolean(image.naturalWidth)); };
          image.addEventListener("load", done, { once: true }); image.addEventListener("error", done, { once: true });
          this.controller.signal.addEventListener("abort", done, { once: true });
        });
      return new Promise(resolve => {
        this.assetTimer = setTimeout(() => resolve(false), 1800);
        Promise.all([imageReady(this.archer), imageReady(this.arena)]).then(results => { clearTimeout(this.assetTimer); resolve(results.every(Boolean)); });
      });
    }

    resize() {
      const w = innerWidth, h = innerHeight;
      // The existing sprites use 128px cells. Render to a low-resolution world,
      // not a HiDPI illustration, and let nearest-neighbor scaling expose pixels.
      this.width = Math.min(768, Math.max(320, Math.round(w / 2)));
      this.height = Math.round(this.width * h / w);
      this.canvas.width = this.width; this.canvas.height = this.height;
      this.context.imageSmoothingEnabled = false;
      this.cssPixel = this.width / w;
      if (this.running) this.draw(this.elapsed);
    }

    queueFrame() {
      if (this.frameId || !this.running) return;
      this.frameId = requestAnimationFrame(now => {
        this.frameId = 0;
        if (!this.running) return;
        this.update(Math.min(100, Math.max(0, now - this.lastTime)));
        this.lastTime = now;
        if (this.elapsed >= this.duration) { this.finish("complete"); return; }
        this.draw(this.elapsed);
        this.queueFrame();
      });
    }

    update(deltaTime) { this.elapsed += deltaTime; }
    stateAt(elapsed) {
      if (this.reduced) return elapsed < 450 ? { name: "TITLE_REVEAL", progress: 1 } : { name: "PAGE_TRANSITION", progress: clamp((elapsed - 450) / 150) };
      const entry = SEQUENCE.find(([, start, end]) => elapsed >= start && elapsed < end) || SEQUENCE.at(-1);
      return { name: entry[0], progress: clamp((elapsed - entry[1]) / (entry[2] - entry[1])) };
    }

    pixel(x, y, w, h, color, alpha = 1) {
      this.context.globalAlpha = alpha;
      this.context.fillStyle = color;
      this.context.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
      this.context.globalAlpha = 1;
    }

    updateCamera(elapsed, state) {
      this.camera = { x: 0, y: 0, zoom: 1, shakeX: 0, shakeY: 0 };
      if (elapsed < 2100) this.camera.zoom = 1 + .035 * smooth((Math.min(elapsed,1800) - 1200) / 600);
      if (state.name === "ARROW_RELEASE" && elapsed < 2180) this.camera.shakeX = Math.sin(elapsed * .17) * 2 * this.cssPixel;
      if (state.name === "ARROW_FOLLOW") {
        const t = state.progress;
        this.arrow.x = 1500 * t + 240 * t * t;
        this.arrow.y = this.height * .48 - 10 * Math.sin(Math.PI * t) + 2 * (t * t - t);
        this.arrow.angle = Math.atan2(-10 * Math.PI * Math.cos(Math.PI * t) + 4 * t - 2, 1500 + 480 * t);
        this.camera.x = this.arrow.x - this.width * mix(.38,.56,t);
      }
      if (state.name === "TARGET_HIT" && elapsed < 3660) {
        const fade = 1 - (elapsed - 3500) / 160;
        this.camera.shakeX = Math.sin(elapsed * .13) * 3 * this.cssPixel * fade;
        this.camera.shakeY = Math.cos(elapsed * .19) * 2 * this.cssPixel * fade;
      }
    }

    drawArena(elapsed, state) {
      const c = this.context, w = this.width, h = this.height;
      this.pixel(0,0,w,h,this.palette.ink);
      if (!this.arena.naturalWidth) return;
      const scale = Math.max(w / this.arena.naturalWidth, h / this.arena.naturalHeight);
      const iw = this.arena.naturalWidth * scale, ih = this.arena.naturalHeight * scale;
      const left = (w-iw)/2, top = (h-ih)/2;
      const travel = state.name === "ARROW_FOLLOW" ? this.arrow.x : ["TARGET_HIT","TITLE_REVEAL","PAGE_TRANSITION"].includes(state.name) ? 1740 : 0;
      // Keep stadium architecture continuous. Independent near planes provide
      // parallax without cutting a flattened background into misaligned bands.
      const offset=travel*.035%iw;
      for(let copy=-1;copy<=1;copy++)c.drawImage(this.arena,Math.round(left-offset+copy*iw),Math.round(top),Math.round(iw),Math.round(ih));
      this.pixel(0,0,w,h,this.palette.navy,.76);
      this.pixel(0,h*.64,w,h*.36,this.palette.ink,.25);
      if(state.name==="ARROW_FOLLOW"||state.name==="TARGET_HIT"){
        for(let i=-1;i<Math.ceil(w/110)+2;i++){
          const x=i*110-(travel*.12%110);
          this.pixel(x,h*.67,3,28,this.palette.line,.4);
          this.pixel(x+4,h*.68,15,24,this.palette.red,.20);
          this.pixel(x+8,h*.70,5,2,this.palette.gold,.35);
        }
        for(let i=-1;i<Math.ceil(w/18)+2;i++){
          const x=i*18-(travel*.23%18),y=h*.79-(i%3)*3;
          this.pixel(x,y,4,4,this.palette.ink,.85);this.pixel(x-2,y+4,8,7,this.palette.ink,.85);
        }
        this.pixel(0,h*.87,w,9,this.palette.navy,.85);
        for(let i=-1;i<Math.ceil(w/120)+2;i++){
          const x=i*120-(travel*.46%120);
          this.pixel(x,h*.82,6,h*.18,this.palette.ink,.94);
          this.pixel(x-3,h*.82,12,3,this.palette.line,.7);
        }
      }
      // Torch flicker becomes almost still at maximum tension.
      if (elapsed < 1800) for (let i=0;i<6;i++) {
        const flicker=.12+Math.sin(Math.floor(elapsed/100)+i*2)*.04;
        this.pixel(w*(.08+i*.17),h*.57,2,4,this.palette.gold,flicker);
      }
    }

    archerLayout() {
      const size = Math.min(460,this.width*.92,this.height*1.12);
      return { size, x:this.width*.46, y:this.height*.48+size*.54 };
    }

    drawArcher(elapsed, state) {
      if (!this.archer.naturalWidth) return;
      const c=this.context, {size,x,y}=this.archerLayout();
      let frame=elapsed<800?0:Math.min(5,1+Math.floor((elapsed-800)/200));
      if(state.name==="ARROW_RELEASE")frame=6+Math.min(2,Math.floor(state.progress*3));
      const alpha=smooth((elapsed-450)/250);
      const cell=this.archer.naturalWidth/3;
      this.canvas.dataset.spriteFrame=String(frame);
      c.save();c.globalAlpha=alpha;
      c.translate(Math.round(x),Math.round(y));c.scale(this.camera.zoom,this.camera.zoom);
      c.drawImage(this.archer,frame%3*cell,Math.floor(frame/3)*cell,cell,cell*(100/128),-size*.5,-size*(124/128),size,size*(100/128));
      c.restore();
      // Frame a bow / hands close-up, never floating boots in front of a stage.
      const fadeTop=y-size*.34, fadeBottom=y-size*.18;
      for(let band=0;band<8;band++)this.pixel(0,fadeTop+(fadeBottom-fadeTop)*band/8,this.width,(fadeBottom-fadeTop)/8+1,this.palette.navy,(band+1)/8);
      this.pixel(0,fadeBottom,this.width,this.height-fadeBottom,this.palette.navy);
      // Tiny sparks stop before the 1.8–2.1s silence, not a bouncing character.
      if(elapsed>850&&elapsed<1500)for(let i=0;i<4;i++)this.pixel(x+size*.28+(i%2)*5,y-size*.48-i*6,1,1,this.palette.gold,.35);
      if(state.name==="ARROW_RELEASE"){
        const t=state.progress;
        this.drawArrow(x+size*.40+t*this.width*.65,y-size*.54,-.015,Math.min(3.4,size/128*1.5),4);
        if(elapsed<2160)this.pixel(0,0,this.width,this.height,this.palette.cream,.12*(1-(elapsed-2100)/60));
      }
    }

    drawSpotlight(elapsed) {
      const {x,y,size}=this.archerLayout(), c=this.context;
      const opacity=.20*smooth((elapsed-200)/400);
      // Stepped light cone / shadow bands share the game's pixel grid.
      for(let row=0;row<18;row++){
        const py=this.height*.08+row*this.height*.047;
        const spread=12+row*5;
        this.pixel(x-spread,py,spread*2,this.height*.047+1,this.palette.cream,opacity*(1-row/24));
      }
      c.globalAlpha=1;
      this.pixel(x-size*.25,y+1,size*.5,3,this.palette.ink,.8);
    }

    drawArrow(x,y,angle=0,scale=1,trail=0) {
      const c=this.context;c.save();c.translate(Math.round(x),Math.round(y));c.rotate(angle);c.scale(scale,scale);
      for(let i=trail;i>0;i--){this.pixel(-35-i*7,-1+(i%2),5,2,i%2?this.palette.gold:this.palette.cream,(1-i/(trail+1))*.32);}
      this.pixel(-34,-1,29,2,this.palette.cream);
      this.pixel(-31,-2,5,1,this.palette.gold);
      this.pixel(-34,-4,8,2,this.palette.red);this.pixel(-34,2,8,2,this.palette.red);
      this.pixel(-7,-3,3,6,this.palette.line);this.pixel(-4,-2,2,4,this.palette.gold);this.pixel(-2,-1,2,2,this.palette.cream);
      c.restore();
    }

    drawTarget(x,y,radius,age=0) {
      const c=this.context;c.save();c.translate(Math.round(x),Math.round(y));
      const r=Math.round(radius);
      if(this.targetRadius!==r){
        this.targetRadius=r;
        const target=document.createElement("canvas"),center=r+6;
        target.width=center*2;target.height=Math.ceil(r*2.55+12);
        const tc=target.getContext("2d");tc.translate(center,center);
        const block=(px,py,pw,ph,color)=>{tc.fillStyle=color;tc.fillRect(Math.round(px),Math.round(py),Math.max(1,Math.round(pw)),Math.max(1,Math.round(ph)))};
        block(-r*.65,r,r*.13,r*.5,this.palette.line);block(r*.52,r,r*.13,r*.5,this.palette.line);
        block(-r*.72,r*1.45,r*1.45,3,this.palette.gold);
        // Quantized circular rings, with wood grain, cached as local pixels.
        for(let py=-r-4;py<=r+4;py+=2)for(let px=-r-4;px<=r+4;px+=2){
          const distance=Math.hypot(px+1,py+1)/r;if(distance>1.065)continue;
          const color=distance>1?this.palette.ink:distance>.90?this.palette.gold:distance>.65?this.palette.cream:distance>.43?this.palette.blue:distance>.21?this.palette.red:this.palette.gold;
          block(px,py,2,2,color);
          if(distance>.92&&(px+py)%14===0)block(px,py,2,1,this.palette.orange);
        }
        block(-1,-1,2,2,this.palette.cream);
        this.targetSprite=target;
      }
      c.drawImage(this.targetSprite,-r-6,-r-6);
      if(age>=0&&this.state.name==="TARGET_HIT")this.drawArrow(0,0,0,1.25,0);
      c.restore();
    }

    drawParticles(age,x,y) {
      const t=age/650;if(t<0||t>1)return;
      for(let i=0;i<16;i++){
        const angle=i*2.399, speed=18+(i%5)*9;
        const px=x+Math.cos(angle)*speed*t, py=y+Math.sin(angle)*speed*t+28*t*t;
        const color=[this.palette.gold,this.palette.red,this.palette.cream,this.palette.orange][i%4];
        this.pixel(px,py,i%3===0?3:2,2,color,1-t);
      }
    }

    createLogo() {
      const logo=document.createElement("canvas");logo.width=66;logo.height=12;
      const c=logo.getContext("2d");let cursor=1;
      for(const [index,letter] of [..."PIXEL CLASH"].entries()){
        if(letter===" "){cursor+=4;continue;}
        GLYPHS[letter].forEach((row,y)=>[...row].forEach((bit,x)=>{if(bit==="1"){
          c.fillStyle=this.palette["panel-2"];c.fillRect(cursor+x+1,y+4,1,1);
          c.fillStyle=index<5?this.palette.gold:this.palette.cream;c.fillRect(cursor+x,y+1,1,1);
        }}));cursor+=6;
      }
      return logo;
    }

    drawTitle(elapsed) {
      const w=this.width,h=this.height,c=this.context;
      const t=this.reduced?1:clamp((elapsed-4500)/200);
      const frame=Math.floor(t*8)/8;
      const pop=frame<.6?mix(.8,1.1,frame/.6):mix(1.1,1,(frame-.6)/.4);
      const logoW=Math.round(Math.min(w*.80,610)*pop),logoH=Math.round(logoW/66*12);
      const x=Math.round((w-logoW)/2),y=Math.round(h*.48-logoH/2);
      this.pixel(0,0,w,h,this.palette.ink,.88);
      const pad=12;
      this.pixel(x-pad-2,y-pad-2,logoW+pad*2+4,logoH+pad*2+4,this.palette.line);
      this.pixel(x-pad,y-pad,logoW+pad*2,logoH+pad*2,this.palette.panel,.95);
      c.drawImage(this.logo,x,y,logoW,logoH);
      [[x-pad-2,y-pad-2],[x+logoW+pad-2,y+logoH+pad-2]].forEach(([sx,sy])=>this.pixel(sx,sy,4,4,this.palette.gold));
      if(!this.reduced&&elapsed<4800)for(let i=0;i<8;i++){
        const p=clamp((elapsed-4500)/300),angle=i*Math.PI/4;
        this.pixel(w/2+Math.cos(angle)*(logoW*.45+18*p),h*.48+Math.sin(angle)*(logoH*.6+18*p),2,2,this.palette.gold,1-p);
      }
    }

    transitionToRegistration(progress) {
      if(!this.revealed){this.revealed=true;this.onReveal();this.caption.hidden=true;this.skipButton.hidden=true;}
      const block=16, columns=Math.ceil(this.width/block);
      for(let row=0;row*block<this.height;row++)for(let column=0;column<columns;column++){
        const delay=(row/Math.ceil(this.height/block))*.72+(column%4)*.035;
        if(progress>=delay)this.context.clearRect(column*block,row*block,block,block);
      }
    }

    draw(elapsed) {
      this.state=this.stateAt(elapsed);
      const {name,progress}=this.state,w=this.width,h=this.height,c=this.context;
      this.canvas.dataset.state=name;
      this.view.dataset.state=name;
      this.updateCamera(elapsed,this.state);
      c.clearRect(0,0,w,h);c.save();c.translate(Math.round(this.camera.shakeX),Math.round(this.camera.shakeY));
      this.drawArena(elapsed,this.state);
      if(["INTRO_DARK","ARCHER_DRAW","FULL_TENSION","ARROW_RELEASE"].includes(name)){
        this.drawSpotlight(elapsed);this.drawArcher(elapsed,this.state);
        this.pixel(0,0,w,h,this.palette.ink,1-smooth(elapsed/500));
      }else if(name==="ARROW_FOLLOW"){
        const targetX=1740-this.camera.x,targetY=h*.48;
        if(targetX<w*1.3)this.drawTarget(targetX,targetY,Math.min(w*.25,h*.27,100),-1);
        this.drawArrow(this.arrow.x-this.camera.x,this.arrow.y,this.arrow.angle,mix(1.5,1.25,progress),6);
      }else if(name==="TARGET_HIT"){
        const x=w*.56,y=h*.48,r=Math.min(w*.25,h*.27,100);
        this.drawTarget(x,y,r,elapsed-3500);this.drawParticles(elapsed-3500,x,y);
        if(elapsed<3580&&!this.reduced)this.pixel(0,0,w,h,this.palette.cream,.22*(1-(elapsed-3500)/80));
        if(elapsed>4200)this.pixel(0,0,w,h,this.palette.ink,clamp((elapsed-4200)/300)*.8);
      }
      c.restore();
      if(name==="TITLE_REVEAL"||name==="PAGE_TRANSITION")this.drawTitle(elapsed);
      if(name==="PAGE_TRANSITION")this.transitionToRegistration(progress);
      const captions={INTRO_DARK:"",ARCHER_DRAW:"숨을 고르고, 목표를 겨냥합니다",FULL_TENSION:"",ARROW_RELEASE:"",ARROW_FOLLOW:"",TARGET_HIT:"한 발의 집중, 대결의 시작",TITLE_REVEAL:"운명의 대결을 시작하세요"};
      if(name!=="PAGE_TRANSITION"&&this.caption.textContent!==captions[name])this.caption.textContent=captions[name]||"";
    }

    finish(reason="complete") {
      if(!this.running)return;
      this.running=false;cancelAnimationFrame(this.frameId);this.frameId=0;clearTimeout(this.assetTimer);
      this.controller.abort();
      this.canvas.dataset.running="false";this.canvas.dataset.state="COMPLETE";
      this.view.hidden=true;
      document.documentElement.classList.remove("intro-pending");document.body.classList.remove("intro-playing");
      if(IntroAnimation.active===this)IntroAnimation.active=null;
      this.onComplete(reason);
    }
  }

  window.IntroAnimation=IntroAnimation;
  if(IntroAnimation.shouldPlay())document.documentElement.classList.add("intro-pending");
})();
