# Blue Print — 괴이 연구소 (가제: 제2지부)  · v0.4 (화면 설계 v1 반영)

`Blue Print = design(Document │ Rule Book)`
- **Document:** `../../documents/anomaly-research.md`
- **참조 Rule Book:** 공통 전부 + 장르「내러티브 선택형 어드벤처」
- **상태:** 전체 설계 뽑음. §11 감독 결정은 *추천 기본값*으로 임시 확정(작가가 덮어쓰기 가능).

## 0. 감독 결정 — 추천 기본값 적용 (override 가능)
| # | 항목 | 적용값(기본) |
|---|---|---|
| 1 | 표현 | **텍스트 + 실제 아트**. 관제실 프레임·장면 일러·초상·괴이 아트 확보됨(§15) → `Sprite`로 배치. (기존 "슬롯만" → 아트 실물 반영) |
| 2 | 연출 | **가벼운 타자기 + 페이드** (설정 토글) |
| 3 | 스탯 | **hp + 정신(sanity) 2축** (호러 적합). 정신 0 → 광기 엔딩 |
| 4 | 전투 | **아이템 게이트 판정**(운 아님) 확정 |
| 5 | 엔딩 | **다중 엔딩** (생존/보고서/사망자수/정신 기반) |
| 6 | 분량 | **백본 + 탐험 #1~#5 프로토타입** 먼저 → 검증 후 전량 |

## 1. 게임 정체
- **플레이어:** 이름 `박지용` · **직위 = 관리자**(ID카드 `idcard-player.png` 표기와 일치, 코드 role도 관리자).
  서사 호칭은 "소장"(제2지부 연구소장)이지만 **직위 라벨은 관리자로 확정**.
- **장르:** 내러티브 선택형 어드벤처(호러/미스터리)
- **코어 루프:** 상황 낭독 → 선택 → 결과·소지품/스탯 변화 → 다음 노드. 탐험하며 소비/부상/획득이
  **누적**되고 그 누적이 생존·엔딩을 가른다.

## 2. 산출 규격 (공통)
`src/entries/anomaly-research.ts` + `anomaly-research.html` + 런처 등록 + `vite.config.ts` 입력.
검증: `npm run build` 통과 + 플레이 자체검증.

## 3. 아키텍처 (엔진 매핑)
```
NarrativeScene extends CanvasScene
 ├─ StoryRunner   현재 Passage 실행·선택 처리·전이(goto)·Effect 적용·status 틱
 ├─ StoryState    stats/status/abilities/inventory/flags/visited/reports
 ├─ story.ts      Passage 그래프(백본+이벤트)  ← 프로즈 원문 여기 전사
 └─ UI(엔진 툴킷)  Panel(낭독+로그) · Button(선택 1~4/탭) · ProgressBar(hp·정신) · Label(상태/능력/소지품)
```
- 씬 단계 `StateMachine`: `낭독 → 선택대기 → 결과낭독 → (전투/보고서) → 다음`.
- 입력: 탭 + 숫자키 1~4 선택, Space/Enter 낭독 진행 (터치 자동).

## 4. 상태 모델 (구체값)
```ts
StoryState = {
  stats:     { hp: 100, 정신: 100 },
  status:    string[],                  // "출혈"(hp DoT), "어지럼"(일시)
  abilities: { 속도: 0, 인지: 0 },
  inventory: string[],
  flags:     Record<string, number>,    // 사망자, 서류투척, maze_step ...
  visited:   Set<string>,
  reports:   string[],                  // 언락된 보고서 id
}
```
- **틱:** 노드 onEnter마다 `출혈` 있으면 `hp -= 6`. `#10`에서 해제.
- **정신:** 특정 이벤트(#2 소리, #3 나비, #9 렌즈)가 감소/왜곡. 0 → 광기 엔딩.

### 마스터 목록
- **아이템:** 장갑(초기 소지) · 녹색액체 · 톱니 · 권총 · 맥가이버칼 · 체크리스트 · 지도 · 보호장비 · 진압스테프 · 의료용품
- **상태:** 출혈(지속 hp피해) · 어지럼(다음 선택 페널티)
- **보고서:** `rep_monster`(괴물 정체/수배지) · `rep_greenblood`(녹색피) · `rep_butterfly`(나비 기구) · `rep_lens`(고양이 렌즈) · `rep_map`(마을 지도)

## 5. Effect op 규격 (Rule Book 준수 · 구현 `story.ts` 기준)
`giveItem(x) · consumeItem(x) · modStat(stat,±n) · applyStatus(s) · clearStatus(s) · setFlag(k,v) · incFlag(k) · unlockReport(id) · revealCharacter(id,name,role) · setCondition(id,cond) · goto(id)`
조건 `requires`: `hasItem(x) · not(cond) · flagGte(k,n)`
- `revealCharacter/setCondition` = 인물 카드 레일(§9)용: 인물 등장 공개 / 상태문구 갱신.

## 6. 탐험 이벤트 전량 인코딩 (구조 스펙)
> 프로즈 원문은 story.ts로 전사. 여기선 선택→효과/전이 구조가 정본.

| id | 선택지 → 효과 |
|---|---|
| `ev_green_liquid`(#1) | 재빠르게→`give(녹색액체)` · 장갑끼고`[req 장갑]`→`give(녹색액체)+consume(장갑)` · 그냥→`applyStatus(출혈)` ; `unlockReport(rep_greenblood)` |
| `ev_radio`(#2) | 무시→`incFlag(불안)` · 쫓아간다→`modStat(정신,-15)` (머릿속 소리) |
| `ev_butterfly`(#3) | 따라간다→`incFlag(사망자)+modStat(정신,-10)` · 사로잡는다→`modStat(속도,+1)+unlockReport(rep_butterfly)` |
| `ev_medkit`(#4) | 재빠르게→`give(의료용품)+give(보호장비)` 후 도주 · 적당히→`give(의료용품)` |
| `ev_maze`(#5) | 자기참조 루프. 오답→`goto(ev_maze)` , 정답 시퀀스 끝→`goto(explore_hub)` (Document 순서 기반) |
| `ev_altar`(#6) | 손올림→`applyStatus(출혈)+give(톱니)` · 조작→`give(톱니)` · 무시→— |
| `ev_belongings`(#7) | 가방→`give(권총)` · 옷주머니→`give(맥가이버칼)` |
| `ev_chase`(#8) | 왼/오→회피(소리 멀어짐) · 멈춘다→거미괴이 미니전투(산성에 녹아 격퇴, `modStat(hp,-10)`) |
| `ev_catdoor`(#9) | 렌즈본다→`modStat(인지,+1)+modStat(정신,-10)` · 발로참→`modStat(hp,-8)` · 노크→`incFlag(사망자)` · 그림뜯음→`give(체크리스트)+unlockReport(rep_lens)` |
| `ev_bleeding`(#10) | 천조각→`clearStatus(출혈)+modStat(hp,-4)` · 의료품`[req 의료용품]`→`clearStatus(출혈)` · 의료경력→`clearStatus(출혈)` · 방치→(출혈 지속) |
| `ev_tower`(#11) | 방문→`give(지도)+unlockReport(rep_map)` · 무시→— |
| `ev_combat`(#12) | 맞서싸움`[req 보호장비&진압스테프]`→`consume(보호장비)+consume(진압스테프)` · 맞서싸움`[not 보호장비]`→`modStat(hp,-20)` · 미끼→`incFlag(사망자)` |
| `ev_locked_door`(#19) | 자물쇠 문 — 맥가이버칼/톱니 게이트로 개방(스텁) |
| `ev_flee_hide`(#26) | 도망간다→물품 소모 후 탈출 · 숨는다→`modStat(hp,-4)`(허리/수명) |
| `ev_acid_rain`(#41) | 피할곳→시체 가득한 곳서 휴식(정신-, hp 회복 소폭) |

- **탐험 허브** `explore_hub`: 미방문 이벤트 제시 → 선택 소진/생존. `visited`로 재방문 제어.

## 7. 스토리 백본 (선형 Passage)
`b_intro_car(도시 밖/회상) → b_arrival(첫출근·조수·악수) → b_office(겨울/창밖) → b_knock(2차감사단 도착)
→ b_audit(감사: 계단/수압/약물 지적) → b_collapse(감사단 각혈·쓰러짐) → b_halt(감사중단·숙소)
→ b_night(밤 전환) → b_confront(변장 괴이 독대·말싸움) → b_sabotage(시설파괴) → b_papers(서류 투척, setFlag 서류투척)
→ b_rampage(폭주) → b_subdue(진압) → b_contain(격리) → b_domain(격리실 영역 생성)
→ #0 b_radio(조수 무전) → explore_hub(#1~#12…) → b_report(보고서 정리) → 엔딩 분기`

## 8. 진행/엔딩 조건
- **사망 엔딩:** `hp<=0` (출혈 방치/무장비 전투 누적) — "고통은 끝나지 않는다".
- **광기 엔딩:** `정신<=0` (소리/나비/렌즈 누적).
- **생존(기본):** 탐험 소진 + `hp,정신>0` → 격리 유지, 보고서 제출.
- **진실 엔딩:** 생존 + `reports ⊇ {rep_monster, rep_greenblood, rep_map}` → 괴물의 정체(죽고 싶어 온 존재)를 앎.
- 괴물 backstory는 `rep_monster`로 언락(수배지/독대 단서). 테마: *"다시 살아갈 희망을 얻었다. 죽기 위해서."*

## 9. UI 레이아웃 (참조 화면 기반, v0.3)
> **근거:** 작가 제공 참조 스크린샷 = §14 (`reference/`). "감정의 바다(苦海)" 관제실 UI를
> 괴이 연구소 톤으로 차용. 기존 단순 3분할 와이어는 폐기하고 아래 **관제실 레이아웃**으로 대체.

**전체 테마:** 흑백 기계식 관제실(시설 패널: 토글 스위치·노브·무전기·게이지 배경) — 컬러는
**장면 일러스트 창** 하나에만 몰아줘 시선 집중. 괴이 연구소 「제2지부 관제실」 컨셉과 정합.

```
┌─────────────────────────────┬──────────────────────────────┐
│ ⚙설정                        │ ▁이벤트 헤더 바▁ (달을 바라보기) │  ← 우측: 이벤트 로그(누적·스크롤)
│ ┌───[ 코너 브래킷 ]───┐      │  달을 바라본다.                 │     헤더 바 → 낭독/결과 본문 →
│ │                     │      │ ▁상황·결과 설명▁               │     다음 헤더 … 반복 누적
│ │  장면 일러스트 창    │      │ ▁자물쇠로 잠긴 문 이벤트▁       │
│ │  (컬러 · 현재 장소)  │      │  …                            │
│ └─────────────────────┘      │ ▁억지로 부순다▁ ← 선택지(바형 Button) │
├──────────────┬──────────────┤                              │
│ [관리자 ID카드]│ [바이탈 장치] │                              │
│  초상+이름     │ ♥심박선(hp)  ●●● 상태등 · 텍스트슬롯+슬라이더  │
└──────────────┴──────────────┴──────────────────────────────┘
  ▼ 하단 레일: 인물 카드 걸이 — [사망][사망][장ㅇㅇ][바이올렛]… 생존=초상+이름 / 사망=블랭크+"사망"
```

**엔진 매핑 (Rule Book「재사용 우선」 준수):**
| 영역 | 화면 | 엔진 컴포넌트 |
|---|---|---|
| 배경 | 흑백 관제실 패널 | `Sprite`(정적 배경 1장) — `frame-console.png` (§15) |
| 장면 창 | 코너 브래킷 프레임 + 컬러 일러스트 | `Panel`(프레임) + `Sprite`(장면별 교체, 예 `scene-forest.png`/괴이 `portrait-anomaly.png`) — §0.1 "Sprite 슬롯"의 구체화 |
| 이벤트 로그 | 헤더 바→본문 누적 스크롤 | 스크롤 `Panel`(배경 `screen-monitor.png`) + `Label` 리스트(헤더=강조 Label 바, 본문=일반 Label) |
| 선택지 | 로그 하단 바형 버튼 | `Button`(바 스타일) · 탭/숫자키 1~4 |
| 관리자 ID | 좌하단 사원증(초상+이름) | `Panel` + `Sprite`(`idcard-player.png`, 초상=`portrait-blank`+`*-hair` 합성) + `Label` (§15) |
| 바이탈 장치 | 심박선 + 상태등 3 + 슬롯 | hp=`ProgressBar`/심박 `Animation`, 정신=`ProgressBar`, 상태등=인디케이터, 로그슬롯=`Label`+`Slider` |
| 인물 레일 | 하단 카드 걸이(사망/생존) | `Row`(of `Panel` 카드, 빈칸 `card-blank.png`) · 상태는 `flags.사망자`·visited로 갱신 |

**차용 시 설계 변경(개발봇에게):** 낭독을 *교체*하지 않고 **누적 로그**로 쌓는 방식이 참조의 핵심.
현재 `NarrativeScene`(현재 passage만 표시)에서 **스크롤 이벤트 로그**로 전환 필요. §3 아키텍처의
`UI(엔진 툴킷)` 줄에 로그 Panel을 추가하는 것으로 반영.

## 10. 프로토타입 범위 (분량#6)
1차: 백본 `b_intro_car ~ b_domain` + `#0` + 탐험 `#1~#5` + 사망/생존 엔딩.
→ 빌드/플레이 검증 후 2차에서 #6~#12 + 다중엔딩 + 보고서 뷰 확장.

## 11. Rule Book 환류 (개발 후 🧪→🔬 승급 후보)
Passage 그래프 스키마 · Effect op 세트 · 루프퍼즐(자기참조+정답시퀀스) · 아이템게이트 전투 ·
status DoT+회복 · 보고서 메타 언락 · hp/정신 2축 상태바 UI.

## 12. 참조 영상 조사 결과 (2026-07-10)
gakain 지시: `https://youtu.be/CmOIl5tEKD8` 영상 내용 확인 → Blue Print 반영 → 프로토타입 개발.

- **확보한 메타데이터:** 제목 "감정의 바다, 알파 테스트" · 채널 "세제원샷"
  (`@Seje_WonSyat`) · 썸네일 URL만 확인(`i.ytimg.com/vi/CmOIl5tEKD8/hqdefault.jpg`).
- **확보 실패:** 영상 설명란, 자막/스크립트, 챕터, 실제 화면 스크린샷 — 전부 시도했으나
  실패. YouTube 시청 페이지는 JS로 렌더링돼 정적 페치로는 각주/정책 텍스트만 나오고,
  oEmbed API는 제목/채널/썸네일 URL만 제공. 자막 추출 서비스(youtubetranscript.com)는
  403. 채널·게임명으로 웹 검색해도 관련 게시물/데브로그를 찾지 못함. 썸네일 이미지 자체를
  내려받아 시각적으로 확인하는 것도 이 세션의 네트워크 접근 정책(Bash 통한 curl 등 차단)
  때문에 불가능했음.
- **결론:** 영상이 실제로 보여주는 게임 진행/화면/UI를 파악할 방법이 없었다. 제목("감정의
  바다")과 채널명으로 볼 때 괴이 연구소와는 다른 프로젝트(작가 본인 또는 지인의 다른
  게임 알파 테스트 영상)로 추정되나 확인 불가. **날조를 피하기 위해 §0~§11 기존 설계는
  그대로 두고 변경하지 않았다.** 영상 내용이 이후 접근 가능한 형태(스크린샷 첨부, 텍스트
  요약, 자막 파일 등)로 제공되면 그때 §9 UI 와이어프레임/§3 아키텍처에 반영할 것.

## 13. 프로토타입 구현 현황 (v1, 2026-07-10)
§10 범위(백본 `b_intro_car~b_domain` + `#0` + 탐험 `#1~#5` + 사망/생존 엔딩) 그대로 구현.
경로는 `sand-engine` 리포 기준:
- `src/games/anomaly-research/StoryState.ts` — §4 상태 모델.
- `src/games/anomaly-research/story.ts` — Passage 그래프(백본 15개 + `explore_hub` +
  `#1~#5` + 미로 3스텝 + `b_report` + 엔딩 4종). Effect/Condition 타입 포함.
- `src/games/anomaly-research/StoryRunner.ts` — §3의 `StoryRunner`. 선택 처리, requires
  게이트, 출혈 DoT 틱, hp/정신 0 리다이렉트, `b_report` 진실엔딩 분기, `restart()`.
- `src/games/anomaly-research/NarrativeScene.ts` — §3의 `NarrativeScene extends
  CanvasScene`. 타자기+페이드, hp/정신 ProgressBar, 선택지 Button(탭/숫자키 1~4),
  Space/Enter 진행.
- `src/entries/anomaly-research.ts` + `anomaly-research.html` — 다른 게임과 동일한
  entry 관례. `vite.config.ts`·`src/launcher.ts`에 등록 완료.

**알려진 축약/한계 (2차 확장 시 정리 필요):**
- 원본 문서의 프로즈 전문이 이 리포에 없어(§12 참고 겸 documents/ 폴더에 원문 미편입),
  백본·이벤트 지문은 Blue Print §6/§7의 라벨을 바탕으로 한 축약 텍스트로 대체. 정식
  프로즈 전달되면 `story.ts`의 `text` 필드만 교체하면 됨(구조는 그대로).
  `game-design-system/documents/anomaly-research.md` 문서화도 아직 안 됨 —
  `documents/README.md`가 원본이 Discord 인박스(`~/.claude/channels/discord/inbox/
  1783512485123-1524386549788315749.txt`)에만 있다고 표시.
- 미로(`ev_maze`, #5) 정답 시퀀스(왼쪽→오른쪽→직진)는 원본 문서 순서를 알 수 없어 프로토
  타입 임의값. 자기참조 루프(오답 시 처음으로) 구조 자체는 스펙대로.
- 엔딩은 사망/생존만 §10 범위지만, `#2`/`#3` 정신 감소 이벤트가 이미 1차 범위에 있어
  광기 엔딩도 함께 구현(도달 가능). 진실 엔딩은 `rep_monster`/`rep_map`이 `#6`/`#11`
  이벤트(2차 범위)에서만 나와 이번 빌드에서는 도달 불가 — 판정 로직만 미리 넣어둠.
- 검증: `npm run build`(tsc strict + vite) 통과. 브라우저 렌더링(Canvas)까지의 수동
  플레이 검증은 이 세션에서 못함 — 사용 중인 Bash 권한 정책이 `node`/`npx` 직접 실행을
  막아 headless 스모크 테스트를 못 돌렸음. 대신 `StoryRunner`를 vite SSR로 로드해
  로직만 검증하려 했으나 같은 이유로 실행 자체가 막힘. 다음 세션에서 `npm run dev`로
  직접 켜서 플레이 검증 필요.

## 14. 참조 화면 디자인 — 스크린샷 확보 (2026-07-12)
> **§12 해소:** §12에서 "영상 화면/UI를 파악할 방법 없음"이라 보류했던 그 영상
> (`youtu.be/CmOIl5tEKD8` = "감정의 바다 苦海")의 **인게임 스크린샷 7장을 작가가 직접 제공**.
> 이제 UI 디자인을 확인·반영함. 원본 이미지: `reference/` 폴더.

| 파일 | 화면 | 핵심 |
|---|---|---|
| `reference/01-boot.jpg` | 부팅 | 순검정 화면 + **커스텀 커서**(눈/스페이드 모티프). 로딩 톤. |
| `reference/02-title.jpg` | 타이틀 | 픽셀 세리프 「감정의 바다 / 苦海」, 어두운 물결 텍스처 배경, 하단 "Press any key". → 우리 것: 「괴이 연구소 / 제2지부」 + 시설 텍스처 + "아무 키나". |
| `reference/03-main-scene.jpg` | 본 게임 | §9 관제실 레이아웃 원본. 컬러 장면창(초록 숲/빛나는 뿌리) + 우측 이벤트 패널 + 좌하단 관리자 ID + 바이탈 장치. |
| `reference/04-event-log.jpg` | 이벤트 로그 | 헤더 바(이벤트)→낭독→결과 설명이 **누적**되고 하단에 바형 선택지("억지로 부순다"). |
| `reference/05-character-rack.jpg` | 인물 레일 | 하단에 사원증 카드 걸이 — "사망" 블랭크 + 생존 인물(초상+이름). 인물/사상자 원장 UI. |
| `reference/06-settings.jpg` | 설정 팝업 | 창모드(전체화면/창)·음량·**대사 속도**(=타자기 속도, §0.2와 직결)·저장하기/나가기. |
| `reference/07-wireframe.png` | 와이어프레임 | 아트 미충전 레이아웃 골격(메인창·헤더바·ID썸네일·바이탈·스위치패널). §9 배치 근거. |

**반영 완료:** §9를 이 참조 기반 「관제실 레이아웃 v0.3」으로 전면 개정. **후속(개발봇):**
누적 이벤트 로그 전환, 관제실 배경 Sprite, 장면 일러스트 슬롯, 인물 카드 레일, 설정 팝업
(창모드/음량/대사속도) 구현. 아트는 흑백 시설 + 컬러 장면창 대비 원칙 유지.

## 15. 실제 이미지 소스 → 에셋 매핑 (2026-07-12)
> §14 참조 화면과 달리 **이건 실제로 게임에 쓰는 아트 소스** 8장(작가 제공). §9 UI 슬롯·엔진
> 컴포넌트·목표 파일명에 1:1 매핑. 목표 경로 = `src/games/anomaly-research/assets/`
> (기존 플레이스홀더 자산 규약 승계). 소스 원본은 `reference/assets/`에 보관.

| 소스(원본명) | 정체 | §9 슬롯 | 목표 파일 (`assets/`) | 엔진 |
|---|---|---|---|---|
| `2.png` | **관제실 프레임 배경** — 흑백 시설(대형 모니터 프레임·좌하단 장면 썸네일 틀·바이탈 장치·우측 토글스위치/노브/무전기/페이더) | 전체 배경 chrome | `frame-console.png` | `Sprite`(정적 배경) |
| `1_.png` | **장면 일러스트: 괴이 숲** — 빛나는 초록 뿌리·나무 속 얼굴들(컬러) | 장면 창 | `scene-forest.png` | `Sprite`(장면별 교체) |
| `54c212…png` | **괴이(몬스터) 일러스트** — 녹색 넝마 + 해골등 + 산성 늪, 스페이드/눈 문양 | 장면 창(전투/독대) · `rep_monster` 단서 | `portrait-anomaly.png` (플레이스홀더 대체) | `Sprite` |
| `0026d9…png` | **관리자 사원증(완성본)** — 초상+「관리자」+스페이드 문양 | 좌하단 ID 카드 | `idcard-player.png` (플레이스홀더 대체) | `Sprite` in `Panel` |
| `1.png` | **초상 베이스(민두상)** | ID/인물 카드 초상 하부 | `portrait-blank.png` (플레이스홀더 대체) | `Sprite`(레이어 하단) |
| `3-1.png` | **머리카락 파츠(투명)** | 초상 상부 레이어 | `portrait-player-hair.png` | `Sprite`(레이어 상단, 베이스 위 합성) |
| `ba2750…png` | **빈 인물 카드 템플릿** — 흰 카드+스페이드 워터마크 | 하단 인물 레일(미상/사망 카드) | `card-blank.png` | `Panel`/`Sprite`(Row 반복) |
| `d9a99c…png` | **모니터 화면 베젤** — 금속테+검은 스크린+스페이드 버튼 | 우측 이벤트 로그 스크린 | `screen-monitor.png` | `Panel` 배경(로그 위에) |

**메모(개발봇):**
- **초상 합성:** 인물 초상 = `portrait-blank`(베이스) + `*-hair`(파츠) 레이어 겹치기. 인물별로
  머리/파츠 교체해 캐스팅. 관리자는 이미 합성본(`idcard-player`)이 있으니 카드엔 그걸 바로 사용.
- **대비 원칙:** `frame-console`·`card-blank`·`screen-monitor`는 흑백, `scene-forest`·괴이만 컬러 →
  §9 "컬러는 장면창에만" 원칙과 일치.
- **교체 관계:** `portrait-anomaly`/`idcard-player`/`portrait-blank`는 기존 폴더의 **플레이스홀더를
  실제 아트로 덮어쓰기**. `frame-console`·`scene-forest`·`portrait-player-hair`·`card-blank`·
  `screen-monitor`는 **신규 추가**.
- 파일 이동은 §산출물 밖(에셋 반입)이라 이 문서엔 매핑만 확정. 실제 복사는 별도 처리.

## 16. 구현 현황 (v2 — 관제실 UI 반영, 2026-07-12)
§9 관제실 레이아웃 v0.3 + §15 실제 에셋으로 **표현 계층(`NarrativeScene.ts`) 전면 개편**.
로직(`StoryRunner`/`story`/`StoryState`)은 그대로.
- **프레임 배경:** `frame-console.png`(1920×1080)를 캔버스(960×540)에 0.5배 정확 정렬로 깔고,
  각 구멍에 콘텐츠 배치 — 좌상단 모니터=장면 일러(`scene-forest`/`scene-facility`),
  우측=이벤트 로그(`screen-monitor` 베젤+스크림), 좌하단=관리자 ID(`idcard-player`),
  하단중앙 장치=바이탈(hp/정신 바·심박선·경고등 3).
- **우측 누적 로그로 전환:** 낭독을 상단 패널 교체식 → **우측 로그에 지난 기록(흐리게) +
  현재 낭독(타자기/페이드) + 선택지(바형 Button)** 누적식으로. §9 "누적 로그" 요구 반영.
- **인물 카드 레일:** 인물 2명↑ 등장 시 하단에 `card-blank` + 초상(플레이어=blank+hair 합성,
  괴이=`portrait-anomaly`) 오버레이. 사망 인물은 이름 자리에 "사망".
- **설정 모달:** 전체화면/음량/대사속도 유지(§0.2·§6 설정 화면과 정합).
- **검증:** `npm run build`(tsc strict + vite) **통과**, 새 에셋 8개 번들 포함 확인.
  단 **브라우저 Canvas 렌더 육안 검증은 미완** — dev 서버 실행이 이 세션 권한으로 막혀
  좌표 미세정렬(프레임 구멍과 콘텐츠 픽셀 맞춤)은 `npm run dev`로 확인하며 조정 필요.
  구멍 좌표는 프레임 아트에서 육안 측정한 상대분수라 ±약간 오차 가능.

## 17. 화면 설계 v1 반영 (Document → Blue Print, 2026-07-12)
> Document `documents/anomaly-research.md`의 「화면 설계 상세(와이어프레임 v1)」를 Rule Book
> 「재사용 우선」에 맞춰 엔진에 매핑. §9 관제실 레이아웃을 아래 요소로 보강. 원본 와이어프레임:
> `documents/anomaly-research/wireframes/`.

| 영역 | 화면 | 엔진 매핑 |
|---|---|---|
| 좌측 슬롯 스트립 | 세로 4칸, 최상단 `소장` + 상태등 3(●●●) | `Column`(of `Panel`) + 상태 인디케이터 — 핵심 인물/직위 상태 |
| 플레이어 장치 | 명함(박지용)+HP 바+상태등 3+**아이템 그리드(6칸)**+슬라이더 | `Panel` + `Label`(명함) + `ProgressBar`(hp) + 인디케이터 + 아이템 `Row/Grid`(`Sprite`) |
| 우측 패널 토글 | 이벤트 로그 ↔ **업무노트(태블릿)** | 같은 영역 두 뷰 스왑; `태블릿` 버튼으로 전환 |

- **4대 상호작용 요소:** 명함 · HP · 설정(⚙) · 태블릿(업무노트).
- **조건부 노출:** 시퀀스로 정보 획득 시 장면/보고서 우측에 카메라 영상·도장 드러남(`unlockReport` 연동).

## 18. 업무노트/보고서 폼 (와이어프레임 v1)
`괴물 연구부 · 제2지부` 태블릿 폼 — 수집 단서를 플레이어가 분류·기록. §8 보고서/메타의 UI 구체화.
- **드롭다운 필드:** `등급 · 외형 · 감정 유형 · 관리법 · 행동`(각 삼각형 선택자).
  → 필드 = `Button`(선택 팝업) 또는 값 순환 토글 + `Label`; 선택값은 `StoryState`에 저장.
- **서술/목록:** `감응 후 소재`(텍스트) · `아이템`(소지품 표시).
- **버튼:** `되돌아 간다`(로그 뷰 복귀) · `작성완료, 1지부로 전송`(보고서 확정 → 엔딩 판정 입력).
- **아트:** `frame-console` 톤 + 크라프트지 "관리정보" 감성. 흑백 폼 + 컬러 장면창 대비 원칙 유지.
- **구현 현황(2026-07-12):** ✅ 우측 로그↔업무노트 2뷰 토글 + 보고서 폼(등급/외형/감정유형/관리법/행동
  드롭다운·되돌아간다·작성완료) `NarrativeScene`에 구현. ✅ 장치 아이템 그리드(6칸) 구현. ✅ 괴이 장면
  아트, hp/정신 `ProgressBar`화. ⏳ 좌측 슬롯 스트립 미구현(기존 인물 카드 레일과 역할 중복 검토 후).
  ⏳ 폼 선택값은 아직 씬 로컬(엔딩 판정 연동은 후속). 브라우저 육안 검증(`npm run dev`) 필요.
