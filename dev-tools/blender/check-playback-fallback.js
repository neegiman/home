// QA-only simulation of mobile autoplay rejection and a stalled load.
(async()=>{
  window.IntroAnimation.active?.finish('fallback-check-restart');
  const video=document.querySelector('#introVideo'),view=document.querySelector('#introView');
  const originalPlay=video.play.bind(video),originalLoad=video.load.bind(video);
  // Disable actual fetching only for this test, keeping the real DOM poster/layout.
  Object.defineProperty(video,'src',{configurable:true,get(){return '';},set(){}});
  video.load=()=>{};
  video.play=()=>Promise.reject(new DOMException('Simulated policy','NotAllowedError'));
  const intro=new window.IntroAnimation(document.querySelector('#introAnimation'),{
    view,skipButton:document.querySelector('#skipIntro'),caption:document.querySelector('#introCaption')
  });
  intro.start();await new Promise(resolve=>setTimeout(resolve,60));
  const autoplayButtonVisible=!view.querySelector('.intro-play').hidden;
  const posterVisible=!!video.poster&&video.style.opacity==='1';
  intro.finish('test-autoplay');
  video.play=()=>new Promise(()=>{});
  const fallbackIntro=new window.IntroAnimation(document.querySelector('#introAnimation'),{
    view,skipButton:document.querySelector('#skipIntro'),caption:document.querySelector('#introCaption')
  });
  fallbackIntro.start();
  // Exercise the same timeout path without an unnecessary eight-second QA delay.
  fallbackIntro.fallback('load-timeout');
  await new Promise(resolve=>setTimeout(resolve,750));
  delete video.src;video.play=originalPlay;video.load=originalLoad;
  return {simulatedPolicy:true,autoplayButtonVisible,posterVisible,
    timeoutLogo:fallbackIntro.canvas.dataset.fallback==='load-timeout',
    finished:!fallbackIntro.running,sourceReleased:video.getAttribute('src')===null};
})()
