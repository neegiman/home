/* Locally rendered Blender cutscene. Video clock drives the HUD, not PNG poses. */
(() => {
  "use strict";
  const STORAGE_KEY = `pixel-clash:opening:v1:${new URL(".", location.href).pathname}`;
  const VERSION = "20261005-mobile-safe-v2";
  const SEQUENCE = Object.freeze([
    ["ARCHER_REAR_VIEW", 0, 2000], ["BOW_DRAW", 2000, 4500],
    ["ARROW_RELEASE", 4500, 5166], ["ARROW_FOLLOW", 5166, 6500],
    ["TARGET_HIT", 6500, 7333], ["TARGET_PIXEL_TRANSFORM", 7333, 9533],
    ["PIXEL_CLASH_TRANSITION", 9533, 10000]
  ]);
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
  const clamp = n => Math.max(0, Math.min(1, n));
  class Rendered3DIntroAnimation {
    static active = null;
    static seen = false;
    static selectMovie({ width = innerWidth, height = innerHeight, dpr = devicePixelRatio || 1,
      portrait = matchMedia("(orientation: portrait)").matches,
      connection = navigator.connection, reducedData = matchMedia("(prefers-reduced-data: reduce)").matches } = {}) {
      const profile = portrait || (width <= 768 && height > width) ? "mobile" : "desktop";
      const constrained = reducedData || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "");
      const lite = profile === "mobile" && (constrained || width * dpr <= 720);
      return { profile, quality: lite ? "mobile-lite" : profile };
    }
    static rememberVisit() {
      this.seen = true;
      for (const name of ["localStorage", "sessionStorage"]) {
        try { window[name].setItem(STORAGE_KEY, "seen"); } catch (_) { /* Storage is optional. */ }
      }
    }
    static shouldPlay(params = new URLSearchParams(location.search)) {
      if (params.get("mode") === "tournament" || params.has("share")) return false;
      if (window.performance?.getEntriesByType?.("navigation")?.[0]?.type === "reload") return false;
      if (params.get("intro") === "1") return true;
      for (const name of ["localStorage", "sessionStorage"]) {
        try { if (window[name].getItem(STORAGE_KEY) === "seen") return false; } catch (_) { /* Try the other store. */ }
      }
      return !this.seen;
    }
    constructor(canvas, { view, skipButton, caption, onReveal, onComplete } = {}) {
      this.canvas = canvas; this.context = canvas.getContext("2d");
      this.view = view; this.video = view.querySelector("video");
      this.skipButton = skipButton; this.caption = caption; this.playButton = view.querySelector(".intro-play");
      this.onReveal = onReveal || (() => {}); this.onComplete = onComplete || (() => {});
      this.controller = new AbortController(); this.running = false; this.frameId = 0; this.revealed = false;
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.duration = this.reduced ? 600 : 10000;
      this.elapsed = 0; this.ready = false; this.resumeOnVisible = false;
      // Choose once per entry. A rotation never swaps source or restarts playback.
      const movie = Rendered3DIntroAnimation.selectMovie();
      this.profile = movie.profile; this.quality = movie.quality;
      const { signal } = this.controller;
      skipButton.addEventListener("click", () => this.finish("skip"), { signal });
      this.playButton.addEventListener("click", () => this.play(), { signal });
      window.addEventListener("keydown", e => { if (e.key === "Escape") this.finish("skip"); }, { signal });
      window.addEventListener("resize", () => this.resize(), { signal });
      window.addEventListener("pagehide", () => this.finish("pagehide"), { signal });
      this.video.addEventListener("ended", () => this.finish("complete"), { signal });
      this.video.addEventListener("error", () => this.fallback("video-error"), { signal });
      this.video.addEventListener("playing", () => {
        clearTimeout(this.assetTimer); clearTimeout(this.stallTimer); this.ready = true; this.caption.textContent = "";
        this.playButton.hidden = true; this.view.dataset.buffering = "false";
        this.view.dataset.ready = "true";
      }, { signal });
      this.video.addEventListener("waiting", () => {
        this.view.dataset.buffering = "true";
        clearTimeout(this.stallTimer);
        if(!document.hidden)this.stallTimer=setTimeout(()=>this.fallback("buffer-timeout"),8000);
      }, { signal });
      document.addEventListener("visibilitychange", () => {
        if (!this.running) return;
        if (document.hidden) {
          clearTimeout(this.stallTimer);
          this.resumeOnVisible = !this.video.paused; this.video.pause();
          cancelAnimationFrame(this.frameId); this.frameId = 0;
        } else {
          if (this.resumeOnVisible && !this.reduced) this.play();
          this.lastTime = performance.now(); this.queueFrame();
        }
      }, { signal });
    }
    start() {
      if (this.running) return;
      Rendered3DIntroAnimation.active?.finish("replaced");
      Rendered3DIntroAnimation.active = this; Rendered3DIntroAnimation.rememberVisit();
      this.running = true; this.view.hidden = false; this.skipButton.hidden = false; this.caption.hidden = false;
      this.playButton.hidden = true; this.canvas.dataset.running = "true";
      this.canvas.dataset.renderMode = this.reduced ? "reduced-logo" : "rendered-3d-video";
      this.view.dataset.profile = this.profile;
      this.view.dataset.quality = this.quality; this.view.dataset.ready = "false";
      delete this.canvas.dataset.fallback;
      document.documentElement.classList.remove("intro-pending"); document.body.classList.add("intro-playing");
      document.body.style.setProperty("--intro-crt", "0"); this.resize();
      if (this.reduced) {
        this.video.hidden = true; this.ready = true; this.lastTime = performance.now();
      } else {
        this.video.hidden = false; this.video.muted = true; this.video.defaultMuted = true;
        this.video.playsInline = true; this.video.autoplay = true; this.video.preload = "auto";
        // Direct tournament/share links and reduced motion never request either movie.
        this.video.poster = `assets/video/pixel-clash-intro-poster${this.profile === "mobile" ? "-mobile" : ""}.webp?v=${VERSION}`;
        this.video.src = `assets/video/pixel-clash-intro-${this.quality}.mp4?v=${VERSION}`;
        this.video.load(); this.caption.textContent = "경기장을 준비하는 중";
        this.assetTimer = setTimeout(() => this.fallback("load-timeout"), 8000); this.play();
      }
      this.queueFrame();
    }
    async play() {
      if (!this.running || this.reduced) return;
      try { await this.video.play(); }
      catch (error) {
        if (!this.running || error.name === "AbortError") return;
        if (error.name === "NotAllowedError") {
          clearTimeout(this.assetTimer); this.playButton.hidden = false;
          this.caption.textContent = "화면을 눌러 오프닝을 시작하세요";
        } else this.fallback("playback-error");
      }
    }
    fallback(reason) {
      if (!this.running || this.reduced) return;
      this.video.pause(); this.video.hidden = true;
      this.reduced = true; this.ready = true; this.duration = 600; this.elapsed = 0;
      this.lastTime = performance.now(); this.caption.textContent = ""; this.playButton.hidden = true;
      this.canvas.dataset.fallback = reason; clearTimeout(this.assetTimer); clearTimeout(this.stallTimer); this.queueFrame();
    }
    resize() {
      this.width = innerWidth; this.height = innerHeight; this.dpr = Math.min(devicePixelRatio || 1, 2);
      const ratio = this.width / this.height, sourceRatio = this.profile === "mobile" ? 9/16 : 16/9;
      // Cover normal phones; preserve the shot after rotation or on tablets/ultrawide screens.
      const mismatched = (ratio < 1) !== (this.profile === "mobile");
      const excessiveCrop = Math.min(ratio/sourceRatio, sourceRatio/ratio) < .72 || (this.profile === "mobile" && ratio > .65);
      this.view.dataset.fit = mismatched || excessiveCrop ? "contain" : "cover";
      this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
      this.context.setTransform(this.dpr,0,0,this.dpr,0,0); this.draw();
    }
    stateAt(elapsed) {
      if (this.reduced) return { name: "PIXEL_CLASH_TRANSITION", progress: clamp((elapsed - 250) / 350) };
      const row = SEQUENCE.find(([,begin,end]) => elapsed >= begin && elapsed < end) || SEQUENCE.at(-1);
      return { name: row[0], progress: clamp((elapsed-row[1])/(row[2]-row[1])) };
    }
    queueFrame() {
      if (!this.running || document.hidden || this.frameId) return;
      this.frameId = requestAnimationFrame(now => {
        this.frameId = 0; if (!this.running) return;
        if (this.reduced) { this.elapsed += Math.min(now-(this.lastTime || now), 80); this.lastTime = now; }
        else this.elapsed = this.video.currentTime * 1000;
        this.draw();
        if (this.reduced && this.elapsed >= this.duration) this.finish("complete"); else this.queueFrame();
      });
    }
    drawTitle(progress = 1) {
      const c = this.context, portrait = this.width < this.height;
      const lines = portrait ? ["PIXEL", "CLASH"] : ["PIXEL CLASH"];
      const cells = portrait ? 29 : 65;
      const size = Math.max(2, Math.round(Math.min(this.width*(portrait?.74:.46)/cells, this.height*.25/(portrait?16:7))));
      const width = cells*size, height=(portrait?16:7)*size, x=(this.width-width)/2, y=(this.height-height)/2;
      this.canvas.dataset.titleBounds = JSON.stringify({x,y,width,height,lines:lines.length});
      const step = Math.floor(clamp(progress)*6), scale = step<2?.86:step<4?1.07:1;
      c.save();c.translate(this.width/2,y+height/2);c.scale(scale,scale);c.translate(-this.width/2,-y-height/2);
      c.fillStyle="#33427a";c.fillRect(x-14,y-14,width+28,height+28);
      c.fillStyle="#0d1230";c.fillRect(x-10,y-10,width+20,height+20);
      lines.forEach((text,index)=>{
      let cursor=x, lineY=y+index*9*size;
      for(const char of text){
        if(char!==" ") GLYPHS[char].forEach((row,yy)=>[...row].forEach((cell,xx)=>{
          if(cell==="1"){
            c.fillStyle="#2658d9";c.fillRect(cursor+xx*size+size,lineY+yy*size+size,size,size);
            c.fillStyle=yy<3?"#fff5cf":"#ffd84d";c.fillRect(cursor+xx*size,lineY+yy*size,size,size);
          }
        })); cursor+=(char===" "?5:6)*size;
      }
      });
      c.restore();
    }
    draw() {
      const c=this.context,w=this.width,h=this.height; if(!w||!h)return;
      c.clearRect(0,0,w,h);
      const {name,progress}=this.stateAt(this.elapsed);this.canvas.dataset.state=name;this.view.dataset.state=name;
      if(this.reduced){c.fillStyle="#080a18";c.fillRect(0,0,w,h);this.drawTitle();}
      else {
        // The poster stays visible while video data is pending.
        this.video.style.opacity=this.ready?String(clamp(this.elapsed/400)):"1";
        document.body.style.setProperty("--intro-crt",String(this.elapsed>=7333?.14*clamp((this.elapsed-7333)/2200):0));
        if(this.elapsed>=9533)this.drawTitle(progress);
      }
      if(name==="PIXEL_CLASH_TRANSITION"&&progress>.65&&!this.revealed){this.revealed=true;this.onReveal();}
      if(this.revealed){
        const wipe=clamp((progress-.65)/.35);
        this.view.style.clipPath=`inset(0 ${Math.floor(wipe*16)/16*100}% 0 0)`;
      }
    }
    finish(reason="complete") {
      if(!this.running)return;
      this.running=false;cancelAnimationFrame(this.frameId);this.frameId=0;clearTimeout(this.assetTimer);clearTimeout(this.stallTimer);
      this.controller.abort();this.video.pause();this.video.removeAttribute("src");this.video.removeAttribute("poster");
      this.video.load();this.video.hidden=true;this.playButton.hidden=true;this.view.hidden=true;this.view.style.clipPath="";
      this.canvas.dataset.running="false";this.canvas.dataset.state="REGISTRATION";this.canvas.width=this.canvas.height=1;
      document.documentElement.classList.remove("intro-pending");document.body.classList.remove("intro-playing");
      document.body.style.removeProperty("--intro-crt");
      if(Rendered3DIntroAnimation.active===this)Rendered3DIntroAnimation.active=null;
      this.onComplete(reason);
    }
  }
  window.Rendered3DIntroAnimation=Rendered3DIntroAnimation;window.IntroAnimation=Rendered3DIntroAnimation;
  if(Rendered3DIntroAnimation.shouldPlay())document.documentElement.classList.add("intro-pending");
})();
