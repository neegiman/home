// QA-only helper, never included by the website.
(async()=>{
  window.IntroAnimation.active?.finish('screenshot');
  const view=document.querySelector('#introView'),video=document.querySelector('#introVideo');
  const intro=new window.IntroAnimation(document.querySelector('#introAnimation'),{
    view,skipButton:document.querySelector('#skipIntro'),caption:document.querySelector('#introCaption')
  });
  intro.queueFrame=()=>{};intro.start();
  await new Promise(resolve=>video.addEventListener('loadeddata',resolve,{once:true}));
  video.pause();intro.ready=true;
  video.currentTime=3.8;
  await new Promise(resolve=>video.addEventListener('seeked',resolve,{once:true}));
  intro.elapsed=video.currentTime*1000;intro.draw();
  window.__frozenIntro=intro;
  return {profile:intro.profile,time:video.currentTime,width:video.videoWidth,height:video.videoHeight};
})()
