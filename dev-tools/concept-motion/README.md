# 시안 기반 오프닝 · concept-motion-v1

확정된 5장 시안의 선수, 의상, 조명, 경기장과 데스크톱/모바일 구도를 기준으로 제작했습니다. 새 3D 인체 모델이나 AI 동영상 모델을 사용한 결과는 아닙니다. 이미지 생성으로 만든 9개 자세를 관절 기준 2.5D 메시로 연결하고, 독립적인 화살·과녁·안개·충돌·픽셀 변환 레이어를 합성한 영상입니다.

## 산출물

- `assets/video/pixel-clash-intro-live-desktop.mp4`: 1920×1080, 12초, 30 FPS
- `assets/video/pixel-clash-intro-live-mobile.mp4`: 1080×1920, 동일 타임라인, 별도 세로 구도
- `assets/video/pixel-clash-intro-live-mobile-lite.mp4`: 720×1280, 저대역폭용
- `assets/video/pixel-clash-intro-live-poster-{desktop,mobile}.webp`
- `assets/intro/concept-live-v1/`: 투명 자세 시트, 경기장·화살·과녁 및 프레임 메타데이터
- `sources.json`: built-in image_gen의 실제 제작 프롬프트와 원본 경로

원본 시안과 이전 Blender 영상은 보존합니다. 새 영상만 버전 구분된 경로로 연결합니다. 런타임은 H.264 영상과 Vanilla JavaScript 플레이어뿐이며 외부 CDN이나 이미지 생성 API에 의존하지 않습니다.

## 연출

0–1.85초 뒷모습과 경기장 → 1.85–4.8초 활을 들고 시위 당김 → 4.8–5.5초 발사와 머리카락 반응 → 5.5–7.3초 화살 추적 → 7.3–8.3초 중앙 명중 → 8.3–11.1초 명중점부터 픽셀화 확산 → 11.1–12초 타이틀 유지와 등록 화면 전환.

포즈 사이에 메시를 움직이되 두 신체 이미지를 오래 반투명하게 섞지 않습니다. 불필요한 이중 활·팔 잔상을 피하기 위한 불투명 텍스처 전환입니다. 이는 포즈 사이의 실제 3D 회전을 복원하는 기술은 아닙니다.

## 로컬 재현

1. `prepare.cjs`로 생성 원본을 로컬 WebP와 여백이 있는 시트로 인코딩합니다. Node와 Sharp가 필요합니다.
2. `serve.cjs`로 127.0.0.1:8138 전용 프리뷰를 실행합니다.
3. `preview.html?profile=desktop`, `mobile`, `mobile-lite`를 각각 열어 렌더 캡처합니다. 프리뷰의 POST는 세 개의 지정된 WebM 경로만 허용합니다.
4. `encode.cjs <FFmpeg 실행파일> <프로필>`로 각 캡처를 30 FPS H.264/yuv420p MP4로 인코딩합니다. 가변 캡처 타임스탬프를 고정 프레임으로 변환하며 Fast Start를 사용합니다.
5. `node dev-tools/check-intro.cjs`로 진입 조건, 영상 형식과 root/dist 동기화를 검증합니다. `check-playback.js`는 agent-browser로 실제 플레이어에서 평가합니다.

최초 등록 화면 진입만 재생합니다. 새로고침, 진행 중 대회와 공유 결과는 생략합니다. `?intro=1`로 새로운 탐색을 하면 검수용 다시 재생이 가능하지만 새로고침·대회·공유 링크의 생략 조건이 우선합니다. 우측 상단 건너뛰기, Reduced Motion 축약, 자동재생 차단 대응, 로딩 시간 초과 폴백, 종료 후 영상/RAF/이벤트 정리를 유지합니다.

모바일 영상은 데스크톱을 잘라 만든 영상이 아닙니다. 같은 디자인과 장면 시간을 공유하되 세로용 자세 시트·배경 프레이밍·화살 추적 구도를 사용합니다. 물리적 iPhone/Safari 검수는 별도로 필요합니다.
