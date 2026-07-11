# Blue Print — 괴이 연구소 (가제: 제2지부)  · v0.2 (full)

`Blue Print = design(Document │ Rule Book)`
- **Document:** `../../documents/anomaly-research.md`
- **참조 Rule Book:** 공통 전부 + 장르「내러티브 선택형 어드벤처」
- **상태:** 전체 설계 뽑음. §11 감독 결정은 *추천 기본값*으로 임시 확정(작가가 덮어쓰기 가능).

## 0. 감독 결정 — 추천 기본값 적용 (override 가능)
| # | 항목 | 적용값(기본) |
|---|---|---|
| 1 | 표현 | **텍스트 우선**. 배경 스프라이트/일러는 후속(엔진 `Sprite`로 슬롯만 열어둠) |
| 2 | 연출 | **가벼운 타자기 + 페이드** (설정 토글) |
| 3 | 스탯 | **hp + 정신(sanity) 2축** (호러 적합). 정신 0 → 광기 엔딩 |
| 4 | 전투 | **아이템 게이트 판정**(운 아님) 확정 |
| 5 | 엔딩 | **다중 엔딩** (생존/보고서/사망자수/정신 기반) |
| 6 | 분량 | **백본 + 탐험 #1~#5 프로토타입** 먼저 → 검증 후 전량 |

## 1. 게임 정체
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

## 5. Effect op 규격 (Rule Book 준수)
`giveItem(x) · consumeItem(x) · modStat(stat,±n) · applyStatus(s) · clearStatus(s) · setFlag(k,v) · incFlag(k) · unlockReport(id) · goto(id)`
조건 `requires`: `hasItem(x) · not(cond) · flagGte(k,n)`

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

## 9. UI 레이아웃(와이어)
```
┌───────────────────────────────────────┐
│ HP ▓▓▓▓▓░  정신 ▓▓▓▓░  속도1 인지1     │ 상태바(Label+ProgressBar)
├───────────────────────────────────────┤
│  [ 낭독 본문 · 타자기 ]                 │ Panel
│                                       │
├───────────────────────────────────────┤
│ 1) 재빠르게   2) 장갑을 끼고   3) 그냥  │ Button 리스트(탭/숫자키)
└───────────────────────────────────────┘
  소지품: 장갑 · 녹색액체 …   [로그]        측면/하단
```

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
