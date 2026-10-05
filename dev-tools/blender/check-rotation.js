// QA-only. Start with a portrait viewport; resize to landscape during playback.
window.IntroAnimation.active?.finish('rotation-check-restart');
window.__rotationCheck={};
const view=document.querySelector('#introView'),video=document.querySelector('#introVideo');
const intro=new window.IntroAnimation(document.querySelector('#introAnimation'),{
  view,skipButton:document.querySelector('#skipIntro'),caption:document.querySelector('#introCaption')
});
intro.start();
video.addEventListener('playing',()=>{
  window.__rotationCheck.before={source:video.currentSrc,time:video.currentTime,profile:intro.profile,quality:intro.quality};
},{once:true});
window.__rotationCheckIntro=intro;
'rotation-check-running';
