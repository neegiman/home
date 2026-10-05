// Run with agent-browser eval --stdin on the local preview after the movies exist.
(async()=>{
  window.IntroAnimation.active?.finish('verification-restart');
  const canvas=document.querySelector('#introAnimation');
  const view=document.querySelector('#introView'),video=document.querySelector('#introVideo');
  const reg=document.querySelector('#registrationView');
  const states=new Set(),deltas=[];
  let completed=null,previous=0;
  reg.hidden=true;reg.inert=true;
  const intro=new window.IntroAnimation(canvas,{
    view,skipButton:document.querySelector('#skipIntro'),caption:document.querySelector('#introCaption'),
    onReveal:()=>{reg.hidden=false;},onComplete:reason=>{completed=reason;reg.hidden=false;reg.inert=false;}
  });
  const originalDraw=intro.draw.bind(intro);
  intro.draw=()=>{originalDraw();states.add(canvas.dataset.state);const now=performance.now();if(previous)deltas.push(now-previous);previous=now;};
  const originalFinish=intro.finish.bind(intro);
  let decoded;
  intro.finish=reason=>{decoded=video.getVideoPlaybackQuality?.();originalFinish(reason);};
  const began=performance.now();intro.start();
  await new Promise(resolve=>{const timer=setInterval(()=>{if(!intro.running){clearInterval(timer);resolve();}},40);});
  const sorted=deltas.sort((a,b)=>a-b);
  const result={
    profile:intro.profile,totalMs:Math.round(performance.now()-began),completed,states:[...states],
    fallback:canvas.dataset.fallback||null,renderMode:canvas.dataset.renderMode,
    decodedFrames:decoded?.totalVideoFrames,droppedFrames:decoded?.droppedVideoFrames,
    frameIntervalP95:Math.round(sorted[Math.floor(sorted.length*.95)]||0),
    rafStopped:intro.frameId===0,handlersAborted:intro.controller.signal.aborted,
    sourceReleased:video.getAttribute('src')===null,activeCleared:window.IntroAnimation.active===null,
    registrationInteractive:!reg.hidden&&!reg.inert
  };
  window.__intro3DVerification=result;
  return result;
})()
