(() => {
  "use strict";
  const DURATION = 5000;
  const ART = "assets/intro/sunset-v1/seascape.webp";
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };

  // Rasterize the existing local OFL font on a small grid: readable Hangul,
  // crisp pixel edges, and the same cream/gold shadow as the original wordmark.
  function drawLogo(canvas) {
    const text = "운명의 한판";
    canvas.width = 224; canvas.height = 48;
    const context = canvas.getContext("2d");
    context.font = '900 38px "Pretendard", "Malgun Gothic", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, 23);
    const mask = context.getImageData(0, 0, canvas.width, canvas.height).data;
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const [offset, color] of [[3,"#38243b"],[1,"#a75b3e"],[0,"#fff0bc"]]) {
      context.fillStyle = color;
      for (let y = 0; y < canvas.height - 3; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          if (mask[(y * canvas.width + x) * 4 + 3] >= 96) context.fillRect(x, y + offset, 1, 1);
        }
      }
    }
  }

  const vertex = `attribute vec2 position; varying vec2 uv;
    void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision mediump float;
    uniform sampler2D art; uniform vec2 crop; uniform float time; uniform float exposure;
    varying vec2 uv;
    void main(){
      vec2 q=(vec2(uv.x,1.-uv.y)-.5)*crop+.5;
      float water=smoothstep(.504,.55,q.y);
      float depth=clamp((q.y-.49)/.51,0.,1.);
      // Rock silhouettes are anchored; only the central open water is displaced.
      float edge=smoothstep(.015,.18,q.x)*(1.-smoothstep(.82,.985,q.x));
      float rock=1.-smoothstep(.74,.97,q.y)*(1.-edge);
      vec2 moving=q;
      moving.x+=water*rock*(.0014+depth*.0018)*sin(q.y*83.-time*1.35+sin(q.x*21.+time*.3));
      moving.y+=water*rock*depth*.0019*sin(q.x*37.+q.y*44.-time*1.8);
      // Cloud drift tapers away before the sun and coastline: horizon never wobbles.
      float cloud=1.-smoothstep(.26,.43,q.y);
      moving.x+=cloud*.00065*time;
      vec3 color=texture2D(art,clamp(moving,.001,.999)).rgb;
      float warm=smoothstep(.035,.18,color.r-color.b)*smoothstep(.3,.65,color.r);
      float shimmer=sin(q.y*185.-time*3.+sin(q.x*40.+time*.5))*.045;
      color*=1.+warm*water*shimmer;
      gl_FragColor=vec4(color*exposure,1.);
    }`;

  function createPainter(canvas, image) {
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: false });
    if (!gl) return null;
    const compile = (type, source) => {
      const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Opening shader unavailable");
      return shader;
    };
    const shaders = [compile(gl.VERTEX_SHADER, vertex), compile(gl.FRAGMENT_SHADER, fragment)];
    const program = gl.createProgram(); shaders.forEach((shader) => gl.attachShader(program, shader)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Opening renderer unavailable");
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program,"position"); gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
    const crop = gl.getUniformLocation(program,"crop"), time = gl.getUniformLocation(program,"time"), exposure = gl.getUniformLocation(program,"exposure");
    return {
      draw(seconds) {
        const ratio = canvas.width / canvas.height, imageRatio = image.width / image.height;
        gl.viewport(0,0,canvas.width,canvas.height);
        gl.uniform2f(crop, Math.min(1,ratio/imageRatio), Math.min(1,imageRatio/ratio));
        gl.uniform1f(time,seconds); gl.uniform1f(exposure,.3 + .7*smooth(seconds/.55));
        gl.drawArrays(gl.TRIANGLES,0,6);
      },
      dispose() { gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program); shaders.forEach((shader) => gl.deleteShader(shader)); }
    };
  }

  class SunsetOpening {
    constructor() {
      this.section = document.querySelector("#sunsetIntro");
      this.canvas = document.querySelector("#sunsetScene");
      this.title = document.querySelector("#sunsetTitle");
      this.skip = document.querySelector("#skipSunsetIntro");
      this.registration = document.querySelector("#registrationView");
      this.frame = 0; this.done = false; this.started = false; this.painter = null;
      this.resize = () => {
        // Keep a 1080p-class surface even on high-DPR phones, not a 4K mobile texture.
        const ratio = Math.min(devicePixelRatio || 1, 2, 1920 / Math.max(innerWidth, innerHeight));
        this.canvas.width = Math.round(innerWidth * ratio); this.canvas.height = Math.round(innerHeight * ratio);
        if (this.painter) this.painter.draw(this.elapsed / 1000 || 0);
      };
      this.key = (event) => {
        if (event.key === "Escape") this.finish("skip");
        if (event.key === "Tab") { event.preventDefault(); this.skip.focus(); }
      };
      this.visibility = () => { if (document.hidden) this.finish("background"); };
      this.unload = () => this.finish("pagehide");
    }
    async start() {
      if (this.started || !window.__sunsetIntroEligible) return;
      this.started = true; this.elapsed = 0;
      clearTimeout(window.__sunsetIntroGuard);
      this.previousFocus = document.activeElement;
      this.registration.inert = true;
      this.section.hidden = false;
      this.section.dataset.state = "PREPARING";
      document.body.classList.add("sunset-intro-playing");
      this.skip.onclick = () => this.finish("skip"); this.skip.focus({ preventScroll: true });
      drawLogo(this.title); this.title.style.opacity = "1"; this.resize();
      // Font preparation never delays the opening or its skip/fallback path.
      document.fonts?.load('900 38px "Pretendard"', "운명의 한판").then(() => {
        if (!this.done) drawLogo(this.title);
      }).catch(() => {});
      window.addEventListener("resize",this.resize);
      window.addEventListener("keydown",this.key);
      document.addEventListener("visibilitychange",this.visibility);
      window.addEventListener("pagehide",this.unload);
      this.loadTimer = setTimeout(() => this.finish("loading-timeout"),1800);
      this.image = new Image();
      this.image.onload = () => {
        if (this.done) return;
        clearTimeout(this.loadTimer);
        try { this.painter = createPainter(this.canvas,this.image); } catch (_) { this.painter = null; }
        if (!this.painter) { this.finish("renderer-fallback"); return; }
        this.title.style.opacity = "0";
        this.startedAt = performance.now();
        this.frame = requestAnimationFrame((now) => this.tick(now));
      };
      this.image.onerror = () => this.finish("asset-fallback");
      this.image.src = ART;
    }
    tick(now) {
      if (this.done) return;
      this.elapsed = now - this.startedAt;
      if (this.elapsed >= DURATION) { this.finish("complete"); return; }
      this.section.dataset.state = this.elapsed < 600 ? "SEA_REVEAL" : this.elapsed < 3200 ? "WAVES" : "TITLE_REVEAL";
      this.painter.draw(this.elapsed/1000);
      this.title.style.opacity = smooth((this.elapsed-3200)/850).toFixed(3);
      this.frame = requestAnimationFrame((next) => this.tick(next));
    }
    finish(reason) {
      if (this.done) return;
      this.done = true; cancelAnimationFrame(this.frame); this.frame = 0;
      clearTimeout(this.loadTimer); clearTimeout(window.__sunsetIntroGuard);
      this.image && (this.image.onload = this.image.onerror = null);
      window.removeEventListener("resize",this.resize); window.removeEventListener("keydown",this.key);
      document.removeEventListener("visibilitychange",this.visibility); window.removeEventListener("pagehide",this.unload);
      this.painter?.dispose(); this.painter = null;
      this.section.dataset.state = "FINISHED"; this.section.dataset.reason = reason;
      document.documentElement.classList.remove("sunset-intro-pending");
      document.body.classList.remove("sunset-intro-playing");
      this.registration.inert = false;
      this.section.classList.add("is-leaving");
      // Short dissolve joins the approved painting to the existing game HUD.
      const hide = () => { this.section.hidden = true; this.section.classList.remove("is-leaving"); };
      if (reason === "complete") setTimeout(hide,210); else hide();
      if (this.previousFocus instanceof HTMLElement && this.previousFocus !== document.body) this.previousFocus.focus({ preventScroll: true });
      else if (["skip","complete"].includes(reason)) document.querySelector("#tournamentName")?.focus({ preventScroll: true });
    }
  }
  window.SunsetIntro = new SunsetOpening();
})();
