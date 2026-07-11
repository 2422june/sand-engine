# Game Design System

게임을 **아이디어에서 구현까지** 굴리는 파이프라인. 게임을 하나씩 만들수록 시스템의
"기억(Rule Book)"이 쌓여, 결국 **더 손댈 게 없는 설계 지식**으로 수렴하는 걸 목표로 한다.

## 3층 구조

```
영감(raw)
  → Document      (이번 게임 아이디어 · 비정형 · 작가/기획봇 작성)
  → [Rule Book]   (누적 참고서 · 장르×요소 패턴 · 시스템의 기억)
  → Blue Print    (이번 게임 구현설계 = design(Document │ Rule Book))
  → 개발          (엔진 위에 구현 → 빌드/플레이 검증)
  → 새 패턴 환류 → Rule Book 갱신
```

- **Document** — 게임마다 다른 입력. 어느 정도 정리된 아이디어. 게임 화면, 리소스 경로, 흐름도도 함께
  적을 수 있다. 작성 규칙은 `documents/DOCUMENT_RULES.md`. (`documents/`)
- **Rule Book** — 모든 게임이 공유·갱신하는 **누적 참고서**. 장르별 특징 · "이 요소는 이렇게
  표현/개발" · UI 스타일. 성숙도 원장으로 수렴을 측정한다. (`RULEBOOK.md`)
- **Blue Print** — Rule Book을 참고서 삼아 **이 Document를 어떻게 구현할지** 설계한 문서. 게임마다
  하나. 엔진 컴포넌트 언어로 쓴다. (`blueprints/`)

## 역할 (모자)

| 모자 | 담당 | 하는 일 |
|---|---|---|
| 작가(감독) | 사람 | Document/영감 제공, 규칙 관리, 최종 검수 게이트 |
| 기획봇 | 샤미/키샤 中 1 | Document→Blue Print 설계, Rule Book 참조/갱신 |
| 개발봇 | 샤미/키샤 中 1 | Blue Print→엔진 구현, 빌드/플레이 검증 |
| 리팩터 | 전문 개발자 | Blue Print 사전 타당성 검토 + 사후 수정 |

> 기획 모자와 개발 모자는 **서로 다른 봇**이 쓴다 — 설계자가 자기 설계를 단독 검증하는 맹점 방지.

## 수렴 장치 (Rule Book이 "확정 설계도"가 되는 법)

1. **성숙도 원장** — 항목마다 `🧪실험적 → 🔬검증됨(N게임) → 🔒확정`. 전 항목 🔒 = 완성.
2. **중복 상향 일반화** — 여러 게임의 공통 패턴은 상위(공통 섹션)로 끌어올려 항목 수를 줄인다.
3. **승격** — 어떤 패턴이 장르를 안 가리게 되면 → 장르 섹션에서 **공통 섹션**으로.
4. **피드백 루프** — 개발 결과의 새 패턴을 Rule Book에 환류. Blue Print가 그 다리.

## 현황

- 시드 게임(기존): mindhack, tetris, chess, checkers, crossy → 공통/보드/아케이드/러너 패턴의 근거.
- 최초 Document: `documents/anomaly-research.md` (내러티브 선택형 어드벤처) → 신규 장르 개척.
- 최초 Blue Print: `blueprints/anomaly-research/Blue Print.md` (규칙: 게임마다 폴더 + 파일명 `Blue Print.md`).
