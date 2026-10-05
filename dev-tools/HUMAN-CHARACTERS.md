# Human character motion specification — 2026-10-05

Mode: built-in image generation, edited from the approved 16-character concept board. Original characters only. No existing game sprites, commercial logos, or proprietary items.

16 identities: 8 outfit themes × 2 appearances. Participants are assigned the least-used identity automatically; no manual character switch or gender input is added. Character and clothing palette indexes are persisted with the participant in the URL. Same-identity duplicates receive the least-used clothing palette (12 palettes). Beyond 192 participants, repeats are inevitable and balanced.

## Runtime assets

`assets/characters/human-v1/{theme}-{m|f}.png` and `{theme}-{m|f}-c1…c11.png`: 512×384 transparent sheets, 128×128 cells, consistent foot anchor y=124. Each identity has 12 frames:

- Row 0: walking, 4 frames.
- Row 1: seated crying, 4 frames (hands on lap / wiping tears / covering face / tear release).
- Row 2: idle / fist raised / both arms raised / relaxed victory.

Canvas staircase uses walking frames, then seated crying and victory frames. CSS battles and final results use the same sheet and palette. Skin, hair, outlines, alpha, and feet are preserved when clothing is tinted; no whole-character hue filter is used.

Raw generation masters: `dev-tools/human-reference/{theme}.png`. Approved art-direction board: `dev-tools/human-reference/approved-concept.png`. Production conversion: `dev-tools/prepare-human-characters.cjs`. Connected-component extraction avoids clipping limbs at nominal atlas grid boundaries. The original masters are preserved. `metrics.js` contains per-pose visible heights so names sit above the actual character, including seated poses.

## Verified

- 224 registrations: maximum character usage spread of one; first 16 unique; first 192 identity/palette pairs unique.
- 192 base motion frames: all nonempty, feet on y=124, no edge clipping; walking / seated crying / victory poses differ.
- 176 recolored sheets: alpha, protected face / hair / hand / outline pixels preserved; clothing changes visibly.
- Browser registration: 32 participants, 16 identities used twice, no change buttons; assignments persist on reload.
- Canvas: walking row 0, seated crying row 1 after the fall, victory row 2; final result reuses the participant's assigned identity/palette.
- CSS final result: 4 cry frames and 3 victory poses cycle, without positional bouncing or full-sprite hue changes.
- Desktop 1440×900 and mobile 390×844: final result fits the viewport; names avoid faces; result share button and blurred cast overlay retained.
- Distribution under a subdirectory: female champion and duplicate clothing palette render from relative local assets with no browser errors.

## Verification commands

```powershell
$env:NODE_PATH='C:\\Users\\neegi\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules'
node dev-tools/prepare-human-characters.cjs dev-tools/human-atlas-inputs.json
node dev-tools/check-human-characters.cjs
node --check app.js
```

## minimal

Generation prompt:

```text
Use case: identity-preserve.
Asset type: production transparent pixel-art sprite atlas, NOT a concept poster.
Reference image: approved HUMAN ROSTER board. Use ONLY the specified two characters, keep their exact original adult faces, hairstyles, outfit structure and palette, footwear, and 5.5-6 head-height proportions. Same detailed crisp low-resolution pixel density, restrained adult look, one-pixel dark outlines, limited shade steps. No chibi.
Create exactly 24 full-body frames in a mathematically regular 4 columns by 6 rows grid on a portrait 2:3 canvas (1024x1536 preferred). Each cell is an equal square. First THREE rows belong to the masculine character, last THREE rows to feminine character. Every frame belongs to the correct same individual; no identity drift.
Row 1 / Row 4: WALK four frames facing right in slight three-quarter view, left-foot contact, right-foot passing lift, right-foot contact, left-foot passing lift. Opposite arms swing naturally. Actual bent knee and alternating foot articulation, not clones shifted/rotated. Heads stay same height, foot contact baseline fixed.
Row 2 / Row 5: SEATED CRY four frames, sitting on the ground with legs visibly folded/bent in front; frame1 seated sad and head lowered; frame2 one hand wipes an eye; frame3 both hands near cheeks and shoulders hunched; frame4 wipe eye and exhale. Restrained adult disappointment, tiny blue tears, no childish giant tears, no injury. Same seated legs and bottom baseline in every frame. Seated height about 65 percent of standing height, same head scale as walking, NEVER giant seated heads.
Row 3 / Row 6: STANDING AND VICTORY four frames. Frame1 composed neutral standing idle. Frame2 confident one fist raised to shoulder/head. Frame3 both arms raised overhead in a clear win pose. Frame4 arms slightly lower and satisfied smile, settle from celebration. Victory head/body/outfit scale matches walking. No weapons or trophies.
All 24 sprites stay fully inside their OWN cell with at least 12 pixels transparent edge padding. Same head size, thickness and local pixel grid across ALL frames. Each cell center aligned and visible body/boot contact baseline at 94% down the cell. High readability at 128px. No shadows, no platforms, no backgrounds, no haze, no glow, no borders/grid lines, no labels, no text, no palette swatches. Background is TRUE alpha transparency.
Do not redesign reference characters. No animal features, sexualized clothing, commercial characters, brand symbols.
Selected pair: MINIMAL, labels M01 and F01 on reference board. Exact clothing/hair specification: M01 short neat dark side-part hair, black minimalist structured short jacket, ivory shirt, charcoal tapered trousers, black ankle boots. F01 short asymmetric black bob, same understated fitted black jacket and ivory top, long charcoal trousers, flat boots.
Only this pair appears in the entire atlas.
```

## utility

Generation prompt:

```text
Use case: identity-preserve.
Asset type: production transparent pixel-art sprite atlas, NOT a concept poster.
Reference image: approved HUMAN ROSTER board. Use ONLY the specified two characters, keep their exact original adult faces, hairstyles, outfit structure and palette, footwear, and 5.5-6 head-height proportions. Same detailed crisp low-resolution pixel density, restrained adult look, one-pixel dark outlines, limited shade steps. No chibi.
Create exactly 24 full-body frames in a mathematically regular 4 columns by 6 rows grid on a portrait 2:3 canvas (1024x1536 preferred). Each cell is an equal square. First THREE rows belong to the masculine character, last THREE rows to feminine character. Every frame belongs to the correct same individual; no identity drift.
Row 1 / Row 4: WALK four frames facing right in slight three-quarter view, left-foot contact, right-foot passing lift, right-foot contact, left-foot passing lift. Opposite arms swing naturally. Actual bent knee and alternating foot articulation, not clones shifted/rotated. Heads stay same height, foot contact baseline fixed.
Row 2 / Row 5: SEATED CRY four frames, sitting on the ground with legs visibly folded/bent in front; frame1 seated sad and head lowered; frame2 one hand wipes an eye; frame3 both hands near cheeks and shoulders hunched; frame4 wipe eye and exhale. Restrained adult disappointment, tiny blue tears, no childish giant tears, no injury. Same seated legs and bottom baseline in every frame. Seated height about 65 percent of standing height, same head scale as walking, NEVER giant seated heads.
Row 3 / Row 6: STANDING AND VICTORY four frames. Frame1 composed neutral standing idle. Frame2 confident one fist raised to shoulder/head. Frame3 both arms raised overhead in a clear win pose. Frame4 arms slightly lower and satisfied smile, settle from celebration. Victory head/body/outfit scale matches walking. No weapons or trophies.
All 24 sprites stay fully inside their OWN cell with at least 12 pixels transparent edge padding. Same head size, thickness and local pixel grid across ALL frames. Each cell center aligned and visible body/boot contact baseline at 94% down the cell. High readability at 128px. No shadows, no platforms, no backgrounds, no haze, no glow, no borders/grid lines, no labels, no text, no palette swatches. Background is TRUE alpha transparency.
Do not redesign reference characters. No animal features, sexualized clothing, commercial characters, brand symbols.
Selected pair: UTILITY, labels M02 and F02 on reference board. Exact clothing/hair specification: M02 short textured dark hair, navy and cobalt utility jacket, pale blue tee, blue cargo trousers, grey trainers. F02 brown ponytail, matching navy-cobalt jacket and cargo trousers, grey trainers.
Only this pair appears in the entire atlas.
```

Targeted correction prompt (same atlas, transparency preserved):

```text
Use case: precise-object-edit. Production transparent pixel-art animation atlas. Change ONLY row 1 column 4: it wrongly shows the ponytail woman. Replace that ONE sprite with the SAME short spiky black-haired man as row 1 columns 1-3, in left-foot passing-lift walking pose. The top three rows must ALL be the same man; bottom three rows ALL the ponytail woman. Preserve every other sprite exactly, all original clothing colors, outlines, pixel resolution, 4x6 atlas layout and transparent background.
```

## rider

Generation prompt:

```text
Use case: identity-preserve.
Asset type: production transparent pixel-art sprite atlas, NOT a concept poster.
Reference image: approved HUMAN ROSTER board. Use ONLY the specified two characters, keep their exact original adult faces, hairstyles, outfit structure and palette, footwear, and 5.5-6 head-height proportions. Same detailed crisp low-resolution pixel density, restrained adult look, one-pixel dark outlines, limited shade steps. No chibi.
Create exactly 24 full-body frames in a mathematically regular 4 columns by 6 rows grid on a portrait 2:3 canvas (1024x1536 preferred). Each cell is an equal square. First THREE rows belong to the masculine character, last THREE rows to feminine character. Every frame belongs to the correct same individual; no identity drift.
Row 1 / Row 4: WALK four frames facing right in slight three-quarter view, left-foot contact, right-foot passing lift, right-foot contact, left-foot passing lift. Opposite arms swing naturally. Actual bent knee and alternating foot articulation, not clones shifted/rotated. Heads stay same height, foot contact baseline fixed.
Row 2 / Row 5: SEATED CRY four frames, sitting on the ground with legs visibly folded/bent in front; frame1 seated sad and head lowered; frame2 one hand wipes an eye; frame3 both hands near cheeks and shoulders hunched; frame4 wipe eye and exhale. Restrained adult disappointment, tiny blue tears, no childish giant tears, no injury. Same seated legs and bottom baseline in every frame. Seated height about 65 percent of standing height, same head scale as walking, NEVER giant seated heads.
Row 3 / Row 6: STANDING AND VICTORY four frames. Frame1 composed neutral standing idle. Frame2 confident one fist raised to shoulder/head. Frame3 both arms raised overhead in a clear win pose. Frame4 arms slightly lower and satisfied smile, settle from celebration. Victory head/body/outfit scale matches walking. No weapons or trophies.
All 24 sprites stay fully inside their OWN cell with at least 12 pixels transparent edge padding. Same head size, thickness and local pixel grid across ALL frames. Each cell center aligned and visible body/boot contact baseline at 94% down the cell. High readability at 128px. No shadows, no platforms, no backgrounds, no haze, no glow, no borders/grid lines, no labels, no text, no palette swatches. Background is TRUE alpha transparency.
Do not redesign reference characters. No animal features, sexualized clothing, commercial characters, brand symbols.
Selected pair: RIDER, labels M03 and F03 on reference board. Exact clothing/hair specification: M03 medium swept brown hair, burgundy riding jacket, black tee, straight dark trousers, tall dark boots. F03 shoulder-length dark brown hair, matching burgundy riding jacket, black tee, dark trousers and flat dark boots.
Only this pair appears in the entire atlas.
```

## explorer

Generation prompt:

```text
Use case: identity-preserve.
Asset type: production transparent pixel-art sprite atlas, NOT a concept poster.
Reference image: approved HUMAN ROSTER board. Use ONLY the specified two characters, keep their exact original adult faces, hairstyles, outfit structure and palette, footwear, and 5.5-6 head-height proportions. Same detailed crisp low-resolution pixel density, restrained adult look, one-pixel dark outlines, limited shade steps. No chibi.
Create exactly 24 full-body frames in a mathematically regular 4 columns by 6 rows grid on a portrait 2:3 canvas (1024x1536 preferred). Each cell is an equal square. First THREE rows belong to the masculine character, last THREE rows to feminine character. Every frame belongs to the correct same individual; no identity drift.
Row 1 / Row 4: WALK four frames facing right in slight three-quarter view, left-foot contact, right-foot passing lift, right-foot contact, left-foot passing lift. Opposite arms swing naturally. Actual bent knee and alternating foot articulation, not clones shifted/rotated. Heads stay same height, foot contact baseline fixed.
Row 2 / Row 5: SEATED CRY four frames, sitting on the ground with legs visibly folded/bent in front; frame1 seated sad and head lowered; frame2 one hand wipes an eye; frame3 both hands near cheeks and shoulders hunched; frame4 wipe eye and exhale. Restrained adult disappointment, tiny blue tears, no childish giant tears, no injury. Same seated legs and bottom baseline in every frame. Seated height about 65 percent of standing height, same head scale as walking, NEVER giant seated heads.
Row 3 / Row 6: STANDING AND VICTORY four frames. Frame1 composed neutral standing idle. Frame2 confident one fist raised to shoulder/head. Frame3 both arms raised overhead in a clear win pose. Frame4 arms slightly lower and satisfied smile, settle from celebration. Victory head/body/outfit scale matches walking. No weapons or trophies.
All 24 sprites stay fully inside their OWN cell with at least 12 pixels transparent edge padding. Same head size, thickness and local pixel grid across ALL frames. Each cell center aligned and visible body/boot contact baseline at 94% down the cell. High readability at 128px. No shadows, no platforms, no backgrounds, no haze, no glow, no borders/grid lines, no labels, no text, no palette swatches. Background is TRUE alpha transparency.
Do not redesign reference characters. No animal features, sexualized clothing, commercial characters, brand symbols.
Selected pair: EXPLORER, labels M04 and F04 on reference board. Exact clothing/hair specification: M04 wavy brown hair and subtle beard, olive vest over warm grey rolled sleeves, grey-brown outdoor trousers, trekking boots. F04 brown tied-back braid/pony, olive vest over grey long sleeves, same practical outdoor trousers, trekking boots.
Only this pair appears in the entire atlas.
```

## captain

Generation prompt:

```text
Use case: identity-preserve.
Asset type: production transparent pixel-art sprite atlas, NOT a concept poster.
Reference image: approved HUMAN ROSTER board. Use ONLY the specified two characters, keep their exact original adult faces, hairstyles, outfit structure and palette, footwear, and 5.5-6 head-height proportions. Same detailed crisp low-resolution pixel density, restrained adult look, one-pixel dark outlines, limited shade steps. No chibi.
Create exactly 24 full-body frames in a mathematically regular 4 columns by 6 rows grid on a portrait 2:3 canvas (1024x1536 preferred). Each cell is an equal square. First THREE rows belong to the masculine character, last THREE rows to feminine character. Every frame belongs to the correct same individual; no identity drift.
Row 1 / Row 4: WALK four frames facing right in slight three-quarter view, left-foot contact, right-foot passing lift, right-foot contact, left-foot passing lift. Opposite arms swing naturally. Actual bent knee and alternating foot articulation, not clones shifted/rotated. Heads stay same height, foot contact baseline fixed.
Row 2 / Row 5: SEATED CRY four frames, sitting on the ground with legs visibly folded/bent in front; frame1 seated sad and head lowered; frame2 one hand wipes an eye; frame3 both hands near cheeks and shoulders hunched; frame4 wipe eye and exhale. Restrained adult disappointment, tiny blue tears, no childish giant tears, no injury. Same seated legs and bottom baseline in every frame. Seated height about 65 percent of standing height, same head scale as walking, NEVER giant seated heads.
Row 3 / Row 6: STANDING AND VICTORY four frames. Frame1 composed neutral standing idle. Frame2 confident one fist raised to shoulder/head. Frame3 both arms raised overhead in a clear win pose. Frame4 arms slightly lower and satisfied smile, settle from celebration. Victory head/body/outfit scale matches walking. No weapons or trophies.
All 24 sprites stay fully inside their OWN cell with at least 12 pixels transparent edge padding. Same head size, thickness and local pixel grid across ALL frames. Each cell center aligned and visible body/boot contact baseline at 94% down the cell. High readability at 128px. No shadows, no platforms, no backgrounds, no haze, no glow, no borders/grid lines, no labels, no text, no palette swatches. Background is TRUE alpha transparency.
Do not redesign reference characters. No animal features, sexualized clothing, commercial characters, brand symbols.
Selected pair: CAPTAIN, labels M05 and F05 on reference board. Exact clothing/hair specification: M05 slick short black hair, cream white clean stand-collar jacket with subtle gold original chevron, graphite trousers, plain boots. F05 short black bob, same cream white and gold jacket, graphite trousers and boots. No crowns or cape.
Only this pair appears in the entire atlas.
```

## runner

Generation prompt:

```text
Use case: identity-preserve.
Asset type: production transparent pixel-art sprite atlas, NOT a concept poster.
Reference image: approved HUMAN ROSTER board. Use ONLY the specified two characters, keep their exact original adult faces, hairstyles, outfit structure and palette, footwear, and 5.5-6 head-height proportions. Same detailed crisp low-resolution pixel density, restrained adult look, one-pixel dark outlines, limited shade steps. No chibi.
Create exactly 24 full-body frames in a mathematically regular 4 columns by 6 rows grid on a portrait 2:3 canvas (1024x1536 preferred). Each cell is an equal square. First THREE rows belong to the masculine character, last THREE rows to feminine character. Every frame belongs to the correct same individual; no identity drift.
Row 1 / Row 4: WALK four frames facing right in slight three-quarter view, left-foot contact, right-foot passing lift, right-foot contact, left-foot passing lift. Opposite arms swing naturally. Actual bent knee and alternating foot articulation, not clones shifted/rotated. Heads stay same height, foot contact baseline fixed.
Row 2 / Row 5: SEATED CRY four frames, sitting on the ground with legs visibly folded/bent in front; frame1 seated sad and head lowered; frame2 one hand wipes an eye; frame3 both hands near cheeks and shoulders hunched; frame4 wipe eye and exhale. Restrained adult disappointment, tiny blue tears, no childish giant tears, no injury. Same seated legs and bottom baseline in every frame. Seated height about 65 percent of standing height, same head scale as walking, NEVER giant seated heads.
Row 3 / Row 6: STANDING AND VICTORY four frames. Frame1 composed neutral standing idle. Frame2 confident one fist raised to shoulder/head. Frame3 both arms raised overhead in a clear win pose. Frame4 arms slightly lower and satisfied smile, settle from celebration. Victory head/body/outfit scale matches walking. No weapons or trophies.
All 24 sprites stay fully inside their OWN cell with at least 12 pixels transparent edge padding. Same head size, thickness and local pixel grid across ALL frames. Each cell center aligned and visible body/boot contact baseline at 94% down the cell. High readability at 128px. No shadows, no platforms, no backgrounds, no haze, no glow, no borders/grid lines, no labels, no text, no palette swatches. Background is TRUE alpha transparency.
Do not redesign reference characters. No animal features, sexualized clothing, commercial characters, brand symbols.
Selected pair: RUNNER, labels M06 and F06 on reference board. Exact clothing/hair specification: M06 short spiky dark hair, indigo violet athletic zip jacket, slim dark track trousers, running shoes. F06 long dark ponytail, same indigo violet athletic zip jacket, long dark track trousers and running shoes.
Only this pair appears in the entire atlas.
```

## traveler

Generation prompt:

```text
Use case: identity-preserve.
Asset type: production transparent pixel-art sprite atlas, NOT a concept poster.
Reference image: approved HUMAN ROSTER board. Use ONLY the specified two characters, keep their exact original adult faces, hairstyles, outfit structure and palette, footwear, and 5.5-6 head-height proportions. Same detailed crisp low-resolution pixel density, restrained adult look, one-pixel dark outlines, limited shade steps. No chibi.
Create exactly 24 full-body frames in a mathematically regular 4 columns by 6 rows grid on a portrait 2:3 canvas (1024x1536 preferred). Each cell is an equal square. First THREE rows belong to the masculine character, last THREE rows to feminine character. Every frame belongs to the correct same individual; no identity drift.
Row 1 / Row 4: WALK four frames facing right in slight three-quarter view, left-foot contact, right-foot passing lift, right-foot contact, left-foot passing lift. Opposite arms swing naturally. Actual bent knee and alternating foot articulation, not clones shifted/rotated. Heads stay same height, foot contact baseline fixed.
Row 2 / Row 5: SEATED CRY four frames, sitting on the ground with legs visibly folded/bent in front; frame1 seated sad and head lowered; frame2 one hand wipes an eye; frame3 both hands near cheeks and shoulders hunched; frame4 wipe eye and exhale. Restrained adult disappointment, tiny blue tears, no childish giant tears, no injury. Same seated legs and bottom baseline in every frame. Seated height about 65 percent of standing height, same head scale as walking, NEVER giant seated heads.
Row 3 / Row 6: STANDING AND VICTORY four frames. Frame1 composed neutral standing idle. Frame2 confident one fist raised to shoulder/head. Frame3 both arms raised overhead in a clear win pose. Frame4 arms slightly lower and satisfied smile, settle from celebration. Victory head/body/outfit scale matches walking. No weapons or trophies.
All 24 sprites stay fully inside their OWN cell with at least 12 pixels transparent edge padding. Same head size, thickness and local pixel grid across ALL frames. Each cell center aligned and visible body/boot contact baseline at 94% down the cell. High readability at 128px. No shadows, no platforms, no backgrounds, no haze, no glow, no borders/grid lines, no labels, no text, no palette swatches. Background is TRUE alpha transparency.
Do not redesign reference characters. No animal features, sexualized clothing, commercial characters, brand symbols.
Selected pair: TRAVELER, labels M07 and F07 on reference board. Exact clothing/hair specification: M07 loose brown layered hair and slight beard, sand beige relaxed overshirt and scarf, brown long trousers, ankle boots. F07 medium brown tied hair and scarf, sand beige relaxed overshirt, brown long trousers, ankle boots.
Only this pair appears in the entire atlas.
```

## tech

Generation prompt:

```text
Use case: identity-preserve.
Asset type: production transparent pixel-art sprite atlas, NOT a concept poster.
Reference image: approved HUMAN ROSTER board. Use ONLY the specified two characters, keep their exact original adult faces, hairstyles, outfit structure and palette, footwear, and 5.5-6 head-height proportions. Same detailed crisp low-resolution pixel density, restrained adult look, one-pixel dark outlines, limited shade steps. No chibi.
Create exactly 24 full-body frames in a mathematically regular 4 columns by 6 rows grid on a portrait 2:3 canvas (1024x1536 preferred). Each cell is an equal square. First THREE rows belong to the masculine character, last THREE rows to feminine character. Every frame belongs to the correct same individual; no identity drift.
Row 1 / Row 4: WALK four frames facing right in slight three-quarter view, left-foot contact, right-foot passing lift, right-foot contact, left-foot passing lift. Opposite arms swing naturally. Actual bent knee and alternating foot articulation, not clones shifted/rotated. Heads stay same height, foot contact baseline fixed.
Row 2 / Row 5: SEATED CRY four frames, sitting on the ground with legs visibly folded/bent in front; frame1 seated sad and head lowered; frame2 one hand wipes an eye; frame3 both hands near cheeks and shoulders hunched; frame4 wipe eye and exhale. Restrained adult disappointment, tiny blue tears, no childish giant tears, no injury. Same seated legs and bottom baseline in every frame. Seated height about 65 percent of standing height, same head scale as walking, NEVER giant seated heads.
Row 3 / Row 6: STANDING AND VICTORY four frames. Frame1 composed neutral standing idle. Frame2 confident one fist raised to shoulder/head. Frame3 both arms raised overhead in a clear win pose. Frame4 arms slightly lower and satisfied smile, settle from celebration. Victory head/body/outfit scale matches walking. No weapons or trophies.
All 24 sprites stay fully inside their OWN cell with at least 12 pixels transparent edge padding. Same head size, thickness and local pixel grid across ALL frames. Each cell center aligned and visible body/boot contact baseline at 94% down the cell. High readability at 128px. No shadows, no platforms, no backgrounds, no haze, no glow, no borders/grid lines, no labels, no text, no palette swatches. Background is TRUE alpha transparency.
Do not redesign reference characters. No animal features, sexualized clothing, commercial characters, brand symbols.
Selected pair: TECH, labels M08 and F08 on reference board. Exact clothing/hair specification: M08 neat dark fringe, graphite technical shell jacket with muted teal panels, charcoal utility trousers, streamlined boots. F08 silver-grey pixie haircut, graphite technical shell jacket and muted teal panels, charcoal long trousers, streamlined boots. No armor or cyborg parts.
Only this pair appears in the entire atlas.
```

Targeted correction prompt (same atlas, transparency preserved):

```text
Use case: precise-object-edit. Production transparent pixel-art animation atlas. Change ONLY row 3 column 4: it wrongly shows the silver-haired female. Replace that ONE sprite with the SAME black-haired adult man as row 3 columns 1-3, with both fists near chest in calm victory recovery. Top three rows must ALL be the black-haired man, bottom three rows ALL the silver pixie-haired woman. Preserve every other sprite exactly, outfit and palette, outlines and pixel density, 4x6 atlas layout and alpha transparency.
```

