# PIXEL CLASH 토너먼트

HTML, CSS, Vanilla JavaScript, HTML5 Canvas만으로 만든 정적 8비트 토너먼트 웹앱입니다.

본문 글꼴은 가독성이 좋은 오픈소스 **Pretendard Variable**을 로컬 파일로 포함합니다. 폰트는 SIL Open Font License 1.1로 배포되며 전문은 `fonts/OFL.txt`에서 확인할 수 있습니다.

## 캐릭터 에셋

`assets/characters/`에는 프로젝트용으로 새로 제작한 투명 PNG 스프라이트 시트가 포함됩니다.

- `clown-spritesheet.png`: IDLE / JUGGLING / SURPRISED / CELEBRATION
- `trainer-spritesheet.png`: IDLE / STANDING / VICTORY / TRIUMPH
- `last-place-bow-spritesheet.png`: KNEEL / HANDS DOWN / DEEP BOW / PROSTRATE

세 캐릭터는 동일한 픽셀 밀도와 외곽선 규칙을 사용하며, 기존 게임 캐릭터·로고·고유 아이템을 복제하지 않은 오리지널 디자인입니다.

`assets/backgrounds/`에는 같은 픽셀 렌더링 규칙으로 제작한 장면 에셋이 포함됩니다.

- `draw-stage.png`: 삐에로 추첨 무대
- `drumroll-curtain.png`: 공유 결과의 두구두구 공개 장면
- `champion-arena.png`: 스크롤 없는 최종 우승 경기장

## 실행

`index.html`을 브라우저에서 직접 열면 됩니다. 별도 설치, 빌드, 서버가 필요하지 않습니다.

## 사용 방법

1. 토너먼트 정보와 참가자를 입력합니다. (4명 이상 권장)
2. `랜덤 대진 생성`을 누르고 추첨 애니메이션을 봅니다.
3. 화면에 크게 표시되는 초기 1대1 경기의 승자를 선택합니다.
4. 승자조에서는 승자를, 패자조에서는 패자를 선택합니다. 선택 즉시 다음 1대1 경기로 넘어갑니다.
5. 예선 → 승자조 → 패자조 → 최종 결과가 각각 독립된 게임 화면으로 진행됩니다.
6. 최종 1위와 최하위가 모두 정해지면 공유 링크를 복사하거나 결과 화면을 엽니다.

## 상태와 공유

- 진행 상태는 UTF-8 안전 Base64 URL 형식으로 주소에 저장됩니다.
- `?mode=tournament&data=...` 주소를 새로고침하면 동일한 대진을 복원합니다.
- `?share=...` 주소는 최종 결과 전용 화면을 바로 표시합니다.
- 서버나 외부 API, 외부 이미지, CDN을 사용하지 않습니다.

> 매우 많은 참가자를 등록하면 모든 데이터가 URL에 포함되므로 브라우저의 주소 길이 제한에 영향을 받을 수 있습니다.
