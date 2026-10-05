PIXEL CLASH — one editable 3D master, two camera compositions

Master (generated locally, not uploaded with the website):
  master/pixel-clash-intro-master.blend

Shared scene: archer, articulated arms, hair, bow, arrow, arena, target, particles.
Desktop cameras: Camera_Desktop / Camera_Arrow_Desktop / Camera_Target_Desktop
Portrait cameras: Camera_Mobile / Camera_Arrow_Mobile / Camera_Target_Mobile
Same animation, 300 frames at 30 FPS, 10 seconds; camera cuts 1 / 156 / 196.

Generated movies:
  pixel-clash-intro-desktop.mp4      1920 x 1080
  pixel-clash-intro-mobile.mp4       1080 x 1920
  pixel-clash-intro-mobile-lite.mp4   720 x 1280

Regenerate all three from the SAME scene in one Blender invocation:
  blender --background --factory-startup --python-exit-code 1
    --python dev-tools/blender/build-intro.py -- --profile all --render
Preview first: replace --render with --preview.

To preserve manual edits in the .blend, render it directly without rebuilding:
  blender --background renders/master/pixel-clash-intro-master.blend
    --python-exit-code 1 --python dev-tools/blender/render-master.py
    -- --profile all --render
Inspect shared scene/cameras: replace --render with --inspect.

After rendering:
  node dev-tools/blender/prepare-assets.cjs
This moves MP4 metadata to the front (fast-start), preserves the H.264 frames,
copies movies/posters/metadata to assets/video and dist/assets/video.
The web player adds the responsive pixel title; it is not baked into the master.

Portrait composition is NOT a crop of the desktop movie.
Mobile Lite shares all mobile camera keys, with a smaller output resolution.
No sound track; autoplay starts muted/playsinline, with skip/reduced-motion fallback.
No physical iPhone/Safari verification is claimed; browser viewport QA is separate.
