# Rule Book v0.1

시스템의 **누적 참고서**. "어떤 게임이든 이건 이렇게" 를 모아둔다. 게임을 만들 때마다 갱신되고,
쌓이고 정리되며 **확정 설계도**로 수렴한다. 특정 게임 얘긴 안 쓴다 — 그건 Blue Print의 몫.

## 성숙도 원장

| 태그 | 의미 |
|---|---|
| 🧪 실험적 | 1개 게임에서만 나온 패턴. 검증 전. |
| 🔬 검증됨(N) | N개 게임에서 재사용돼 안정된 패턴. |
| 🔒 확정 | 더 손댈 게 없다고 판단된 패턴. |

> **수렴 지표:** 전 항목이 🔒 이면 그 장르/요소는 "완성". 남은 🧪·🔬 개수 = 남은 일.
> 근거 게임(플레이 가능): `mindhack, tetris, chess, checkers, crossy, anomaly-research` (6) + 공용 셸 시드 `template`.
> 화면 방향 — 가로: `mindhack·anomaly-research` / 세로: `tetris·chess·checkers·crossy` / fill(전체화면): `template`.

---

## 공통 (Common) — 장르 무관, 모든 게임에 적용

### 설계 철학
- 🔒 **정직한 난이도** — 위험·규칙을 *먼저* 보여주고 첫인상을 배신하지 않는다. 실패는 "학습이
  보상받는" 형태로. 정보를 숨겨 어렵게 만들지 않는다. 결과는 **운이 아니라 상태로** 갈린다.
- 🔒 **즉각 피드백(juice)** — 입력→반응 지연 최소. 모든 상태 변화는 시청각으로 즉시 표시.
- 🔬(5) **명료한 상태** — 플레이어는 현재상태·목표·실패이유를 항상 알 수 있어야.
- 🔬(5) **빠른 재시작** — 게임오버 → 즉시 리트라이(Enter/R 또는 탭).
- 🔬(4) **한 게임 = 코어 루프 하나** — 곁가지 금지. 재미의 축을 하나로.

### 입력/접근성
- 🔒 **키보드 + 터치 둘 다 필수** — 엔진 `Keyboard`/`Mouse`(터치 탭)/`TouchControls`(모바일 D패드) 재사용.
- 🔬(3) 보드/포인팅형 = 탭(`Mouse`), 액션형 = 방향+액션 표준 매핑(`Keyboard`+D패드).

### 엔진/구현 규약
- 🔒 **재사용 우선** — 새 코드 전에 기존 컴포넌트부터 조립:
  `Transform2D · Velocity2D · Sprite · Actor · Movable · Collider2D · TriggerZone · Health ·
  StateMachine · Animation · Shadow · Light · AudioManager · UI(Panel/Label/Button/Slider/Toggle/ProgressBar)`.
- 🔒 **산출 규격** — 게임 = 독립 엔트리 `src/entries/<id>.ts` + `<id>.html` + 런처 등록(`src/launcher.ts`)
  + `vite.config.ts` 입력 등록.
- 🔒 **씬 패턴** — `CanvasScene` 상속, `update(dt)` / `render(ctx)` 오버라이드.
- 🔒 **검증 필수** — `npm run build`(tsc+vite) 통과 + 실제 플레이 자체검증 후 완료 보고.

### 화면/셸 규약 (플랫폼) — *2026-07-12 신설*
- 🔬(6) **게임 화면 = 캔버스뿐** — 화면(페이지) 밖엔 어떤 글·버튼·요소도 두지 않는다. 게임 이름은
  브라우저 **탭 제목**(`document.title`)으로만. 조작법·상태·HUD·다이얼로그는 전부 **캔버스 안에** 그린다.
- 🧪 **캔버스 크기 = fill 기본** — `bootGame`에 `width`/`height`를 **둘 다 생략하면 fill 모드**:
  캔버스가 뷰포트를 꽉 채우고 리사이즈·회전·모바일 주소창 변화에 `CanvasScene.resize()`로 실시간 대응.
  새 게임의 표준(시드: `template`). render는 `this.width/height` 기반으로 작성해 어떤 크기든 대응.
- 🧪 **고정 레이아웃 게임(가로/세로 둘 다 가능)** — 좌표를 고정한 게임은 논리 크기를 지정하고
  **화면 중앙정렬**. 게임 성격에 맞춰 가로 또는 세로를 고른다.
  세로 게임은 `100dvh`로 모바일 상단 chrome 제외. **가로 게임은 세로 폰에서 회전 안내 아이콘**
  (⟳ "돌려주세요"), 세로 게임은 가로 폰에서 "세워주세요". 회전 안내는 fill 셸에는 적용하지 않는다.
  현재 — 가로: `mindhack·anomaly-research` / 세로: `tetris·chess·checkers·crossy` / fill: `template`.
- 🔬(6) **뒤로 가기 = 종료 확인** — 상단 '메인' 링크 없음. 뒤로 가기(브라우저/기기 back)를 가로채
  인게임 "게임 종료하기" 확인 → 메인(index)으로. 히스토리 트랩으로 확인 없이는 안 나가짐.

### Document→Blue Print 정형화 규칙
- 🔬(1) 모든 Document 항목을 **①엔진 컴포넌트 매핑 ②입력 매핑 ③승/패/진행 조건 ④상태 모델**로 환원.
- 🧪 모호·누락은 Rule Book 기본값으로 채움 (예: 실패시 재시작 on, 상태 표시 on).

---

## 장르: 아케이드/퍼즐  (시드: tetris)
- 🧪 고정 그리드 + 중력 스텝(`dropInterval`), 홀드 반복 입력, 라인/매치 소거 → 점수·레벨·속도 상승.
- 🧪 NEXT 미리보기 + HUD(점수/라인/레벨). 게임오버 오버레이 + 재시작.

## 장르: 보드 (2인)  (시드: chess, checkers)
- 🔬(2) 8×8 그리드 + 좌표 히트테스트, 말 클릭→선택→합법수 하이라이트→클릭 이동.
- 🔬(2) 규칙 엔진: 합법수 생성 → 자기 위험수 필터 → 턴 교대 → 종료(승/무) 판정.
- 🧪 잡기/강제·특수규칙은 게임별로 Blue Print에서 상세화(체스 캐슬링/앙파상, 체커 연속점프).

## 장르: 액션/러너  (시드: crossy)
- 🧪 절차적 레인 생성(안전장치: 위험 레인 연속 제한) + 카메라 추적 + 이산 홉 이동.
- 🧪 충돌 판정으로 즉사 → 점수(전진량) → 재시작.

---

## 장르: 내러티브 선택형 어드벤처  (시드: anomaly-research) — **개척 중**

호러/미스터리 텍스트 어드벤처. 서사 낭독 + 선택지 + 소지품/스탯/플래그 + 분기/루프 퍼즐 +
경량 전투 + 보고서(메타). 캔버스 렌더보다 **UI 툴킷 중심**.

### 콘텐츠 구조 (핵심)
- 🧪 **Passage 그래프** — 이야기를 노드 그래프로. 노드(구현 기준 `story.ts`):
  `{ id, text:string, onEnter?:Effect[], choices?:Choice[], next?:id, ending?, endingTitle?, hub? }`.
- 🧪 **Choice** — `{ id, label, requires?:Condition, effects:Effect[] }`. 전이(`goto`)는 effects의 `goto` op으로.
  선택지는 위험을 라벨로 예고하고, 결과 텍스트는 결정론적(같은 상태면 같은 결과 = 정직한 난이도).
- 🧪 **Effect(op) 목록** — `giveItem/consumeItem/modStat/applyStatus/clearStatus/setFlag/incFlag/unlockReport/revealCharacter/setCondition/goto`. 조건 `requires`: `hasItem/not/flagGte`.
  - Document 예: "장갑이 녹음"=`consumeItem(gloves)`, "몸이 가벼워짐"=`modStat(speed,+1)`,
    "출혈"=`applyStatus(bleed)`(지속피해), "권총 획득"=`giveItem(pistol)`.
- 🧪 **분기/루프 퍼즐** — 노드가 서로를 가리키게 해 잘못된 경로는 시작 노드로 되돌림. 정답 시퀀스/
    플래그 게이트로 탈출(Document #5 반복되는 길: 좌-우-좌… 특정 순서).

### 상태/진행 모델
- 🧪 **StoryState** — `{ stats:{hp,...}, status:string[](출혈 등 지속효과), abilities:{속도,인지},
    inventory:string[], flags:Record<string,number>, visited:Set<id> }`. Passage 넘어가도 유지.
- 🧪 지속효과(status)는 `onEnter`마다 틱(예: bleed → hp 감소). 회복 이벤트로 해제.

### 입력
- 🧪 선택지 = 포인터 탭 + 숫자키 1~4. 낭독 진행/다음 = 클릭·Space·Enter. (엔진 `Mouse`/`Keyboard`/터치 재사용)

### UI/표현 스타일
- 🧪 레이아웃(관제실): **흑백 관제실 프레임 배경** + **컬러 장면창**(코너 브래킷) + **우측 이벤트 로그**
    (대사·결과 누적, 하단 선택지 바) ↔ **업무노트(태블릿) 토글** + **플레이어 장치**(명함/HP/아이템 그리드) +
    **좌측 슬롯 스트립** + **인물 카드 레일**. 전부 엔진 UI 툴킷(Panel/Label/Button/ProgressBar/Sprite)으로.
    (상세: Blue Print §9·§17·§18)
- 🧪 컬러는 장면창에만, 나머진 흑백. 낭독은 교체가 아니라 **누적 로그**.
- 🧪 호러 톤: 어두운 팔레트, 느린 페이드, 절제된 SFX(무전 치직/괴이음)는 `AudioManager`.

### 전투(경량)
- 🧪 액션 전투 아님. **소지 장비/아이템으로 판정** — 보호장비·진압도구 있으면 성공(도구 소모),
    없으면 부상(hp 감소). "미끼" 같은 대안 선택지 제공. 운 아닌 상태로 결정(공통 정직한 난이도).

### 메타: 보고서/연구
- 🧪 탐험 중 획득 지식/샘플 → **보고서 항목 언락**(`unlockReport`). 수집·열람 뷰. 진행/엔딩 게이트에 활용.

### 구현 매핑(엔진)
- 🧪 `NarrativeScene extends CanvasScene` + 데이터 주도 `StoryRunner`(현재 노드 실행/전이) +
    `story.ts`(Passage 데이터) + `StoryState`. 렌더는 UI 툴킷. `StateMachine`으로 씬 단계(낭독/선택/전투/보고서) 관리 가능.

> 이 장르는 지금 전부 🧪 (Document 1개 근거). anomaly-research 개발이 끝나면 재사용된 패턴은 🔬로 승급.
