# Sunset intro — approved storyboard implementation

The approved still board is archived at `dev-tools/sunset-reference/storyboard.png`.
The selected full-bleed painting is `assets/intro/sunset-v1/seascape-master.png` (1672 × 941); its web delivery copy is `seascape.webp`.
Built-in imagegen edit mode was used, exactly one asset request, no CLI fallback. The existing storyboard is the edit target; this is not a redesigned scene.

## Animation

The opening is a live 2D painted-texture animation, **not** an AI-generated video or a 3D render. A WebGL fragment shader changes water UV coordinates and warm reflected luminance independently while keeping the horizon and rocks anchored. Cloud displacement tapers away before the sun. The whole image does not pan, bounce, rotate or zoom. One locally bundled image is loaded lazily only when eligible; no CDN.

- 0–0.6s: the sunset appears.
- 0.6–3.2s: small wave motion, warm reflected shimmer, slow cloud drift.
- 3.2–4.05s: cream/gold `운명의 한판` wordmark appears in the sky, rasterized from the bundled OFL Pretendard font to a crisp pixel grid. The archived approved board retains its historical English title.
- 4.05–5.0s: logo holds over the moving scene.
- 5.0–5.2s: dissolve into the unmodified registration HUD.

Portrait uses the same scene's open center, where sun and gold reflection remain visible. The title uses 78% viewport width, with the skip control inside the top/right safe-area. Resize does not restart playback. Render resolution is capped to 1920px along the longest axis. The shader runs at display requestAnimationFrame rate, with no artificial low-FPS pose switching.

Eligibility is computed before paint from navigation type, URL and reduced-motion preference. Fresh registration navigation (including new tabs/pages) replays the opening; reload and back-forward navigation skip. Browser-wide playback records are no longer read or written, so an old `pixel-clash-sunset-seen-v1` record cannot suppress new tabs. No storage migration or deletion is required. Tournament/share URLs and reduced motion never load the art. `?intro=1` is an explicit debug replay only on registration URLs and never overrides reduced motion/direct URLs. Loading >1.8s, failed art or unavailable WebGL lead immediately to registration. Escape, skip, completion, pagehide and document hiding stop rendering and release resources. The registration surface is inert during playback and restored afterward.

Previous archer/video sources are archived and unused. Tournament draw, battle, stair, credits and share reveal code are unchanged.

## Exact asset prompt

```text
Use case: precise-object-edit
Asset type: standalone full-bleed website background illustration
Input images: Image 1 is the edit target: a sunset storyboard board. Use only its large top key-art scene.
Primary request: extract and faithfully preserve the large top sunset seascape as one clean standalone landscape image. Remove the surrounding dark board, frame, lower storyboard thumbnails, all captions, all text and logos. Fill a 16:9 canvas, preferably 2048 by 1152 pixels.
Scene/backdrop: the same warm orange and gold sunset over a deep navy sea, purple and navy cloud banks, distant rocky coast silhouettes at the far left and far right, foreground rocks at the extreme lower sides, and golden sunlight reflected through the sea waves.
Style/medium: retain the original painterly 2D illustration quality, brushwork, cloud shapes, wave textures, color relationships, and existing scene landmarks.
Composition/framing: preserve the original horizontal scene balance and viewpoint. Keep the low sun approximately 52% across and 48% down the final canvas, with its golden reflection below it. Extend only sky and foreground water as needed to achieve 16:9; do not introduce a new camera view. Maintain an unobstructed center area of sky, sun, reflection, and sea suitable for a centered mobile crop.
Constraints: preserve the top key art; change only board removal and necessary canvas extension. One continuous full-bleed image, edge to edge, without borders or panels. No redesign or new props.
Avoid: any board, frame, thumbnails, typography, letters, numbers, caption, logo, label, watermark, characters, boats, radial sun rays, 3D, photorealism, or newly invented scenery.
```

## Verification

Run `node dev-tools/check-intro.cjs` for source/asset parity checks. Browser results are recorded in `dev-tools/sunset-verification.json` after desktop/mobile checks.
