/**
 * 괴이 연구소 — Passage 그래프 (백본 + 탐험 이벤트 #1~#5).
 *
 * 구조는 `Blue Print.md` §5~§7이 정본. 이 파일은 그 스펙을 실행 가능한 데이터로
 * 옮긴 것 — 선택→효과/전이 구조가 우선이고, 지문(prose)은 백본 라벨(§7 괄호 설명)과
 * 탐험 이벤트 표(§6)를 바탕으로 한 프로토타입용 축약 텍스트다. 원문 프로즈 전문은
 * gakain이 전달한 원본 문서에만 있고 이 리포지토리에는 옮겨져 있지 않아서, 정식
 * 프로즈로 교체하기 전까지는 이 축약 텍스트가 자리를 지킨다.
 *
 * 미로(#5, `ev_maze`)의 정답 시퀀스는 원본 문서 순서가 리포지토리에 없어 프로토타입
 * 임의값(왼쪽→오른쪽→직진)으로 둔다 — 정식 프로즈 편입 시 같이 교체.
 */

export type StatKey = "hp" | "정신";
export type AbilityKey = "속도" | "인지";

export type Effect =
  | { op: "giveItem"; item: string }
  | { op: "consumeItem"; item: string }
  | { op: "modStat"; stat: StatKey | AbilityKey; delta: number }
  | { op: "applyStatus"; status: string }
  | { op: "clearStatus"; status: string }
  | { op: "setFlag"; flag: string; value: number }
  | { op: "incFlag"; flag: string; amount?: number }
  | { op: "unlockReport"; report: string }
  | { op: "goto"; passage: string }
  | { op: "revealCharacter"; id: string; name: string; role: string }
  | { op: "setCondition"; id: string; condition: string };

export type Condition =
  | { op: "hasItem"; item: string }
  | { op: "not"; cond: Condition }
  | { op: "flagGte"; flag: string; value: number };

export type Choice = {
  id: string;
  label: string;
  requires?: Condition;
  effects: Effect[];
};

export type EndingKind = "death" | "madness" | "survive" | "truth";

export type Passage = {
  id: string;
  text: string;
  choices?: Choice[];
  /** Linear auto-advance target when there are no choices (or hub is drained). */
  next?: string;
  /** Effects applied once, the moment this passage is entered. */
  onEnter?: Effect[];
  ending?: EndingKind;
  endingTitle?: string;
  /** explore_hub: dynamic choice list built from `EXPLORE_EVENTS`, not `choices`. */
  hub?: boolean;
};

export const START_ID = "b_intro_car";

/** id + hub label for each prototype-scope exploration event (#1~#5). */
export const EXPLORE_EVENTS: { id: string; label: string }[] = [
  { id: "ev_green_liquid", label: "정체불명의 녹색 액체 (#1)" },
  { id: "ev_radio", label: "잡음 섞인 무전 (#2)" },
  { id: "ev_butterfly", label: "복도를 나는 나비 (#3)" },
  { id: "ev_medkit", label: "쓰러진 대원의 응급키트 (#4)" },
  { id: "ev_maze", label: "거울처럼 반복되는 회랑 (#5)" },
];

export const PASSAGES: Record<string, Passage> = {
  // ── 백본 ──────────────────────────────────────────────────────────────
  b_intro_car: {
    id: "b_intro_car",
    text: "도시를 빠져나가는 차 안. 창밖으로 익숙한 풍경이 뒤로 밀려난다. 제2지부로 발령받았다는 통보를 받은 게 일주일 전. 그때의 기억이 스쳐 지나간다.",
    next: "b_arrival",
  },
  b_arrival: {
    id: "b_arrival",
    text: "첫 출근. 문 앞에서 조수가 기다리고 있다. \"오시느라 고생하셨습니다.\" 악수를 나눈다. 손이 차갑다.",
    onEnter: [{ op: "revealCharacter", id: "assistant", name: "한도경", role: "조수" }],
    next: "b_office",
  },
  b_office: {
    id: "b_office",
    text: "배정된 사무실. 겨울 창밖으로 눈이 흩날린다. 책상 위엔 아직 정리되지 않은 전임자의 서류가 쌓여 있다.",
    next: "b_knock",
  },
  b_knock: {
    id: "b_knock",
    text: "문을 두드리는 소리. 2차 감사단이 예정보다 일찍 도착했다.",
    next: "b_audit",
  },
  b_audit: {
    id: "b_audit",
    text: "감사가 시작된다. 계단 안전율, 수압, 격리동 약물 재고 — 지적 사항이 늘어난다. 감사단장의 표정이 점점 굳는다.",
    onEnter: [{ op: "revealCharacter", id: "auditor", name: "윤서혁", role: "감사단장" }],
    next: "b_collapse",
  },
  b_collapse: {
    id: "b_collapse",
    text: "지적 사항을 읽던 감사단원 한 명이 갑자기 각혈하며 쓰러진다. 사무실이 순식간에 아수라장이 된다.",
    onEnter: [
      { op: "revealCharacter", id: "member", name: "오태율", role: "대원" },
      { op: "setCondition", id: "member", condition: "기절" },
    ],
    next: "b_halt",
  },
  b_halt: {
    id: "b_halt",
    text: "감사가 중단됐다. 감사단은 임시 숙소로 옮겨졌고, 시설은 무거운 침묵에 잠긴다.",
    next: "b_night",
  },
  b_night: {
    id: "b_night",
    text: "밤이 깊는다. 복도의 조명이 하나둘 꺼지고, 시설은 낮과는 다른 얼굴을 드러낸다.",
    next: "b_confront",
  },
  b_confront: {
    id: "b_confront",
    text: "인간으로 변장한 괴이와 독대한다. 말이 오간다 — 설득도 협박도 아닌, 서로의 사정을 저울질하는 말싸움.",
    onEnter: [{ op: "revealCharacter", id: "anomaly", name: "???", role: "미확인" }],
    next: "b_sabotage",
  },
  b_sabotage: {
    id: "b_sabotage",
    text: "괴이가 시설 설비를 파괴하기 시작한다. 경보가 울린다.",
    onEnter: [{ op: "setCondition", id: "anomaly", condition: "경계" }],
    next: "b_papers",
  },
  b_papers: {
    id: "b_papers",
    text: "괴이가 서류함을 뒤엎는다. 서류가 사방에 흩날린다 — 그중 하나가 눈에 들어온다.",
    onEnter: [{ op: "setFlag", flag: "서류투척", value: 1 }],
    next: "b_rampage",
  },
  b_rampage: {
    id: "b_rampage",
    text: "괴이가 완전히 폭주한다. 대원들이 진압 대형을 갖춘다.",
    onEnter: [{ op: "setCondition", id: "anomaly", condition: "폭주" }],
    next: "b_subdue",
  },
  b_subdue: {
    id: "b_subdue",
    text: "치열한 진압 끝에 괴이가 제압된다. 대원 여럿이 부상을 입었다.",
    onEnter: [{ op: "setCondition", id: "member", condition: "부상" }],
    next: "b_contain",
  },
  b_contain: {
    id: "b_contain",
    text: "괴이가 격리된다. 안도와 피로가 동시에 몰려온다.",
    onEnter: [{ op: "setCondition", id: "anomaly", condition: "격리됨" }],
    next: "b_domain",
  },
  b_domain: {
    id: "b_domain",
    text: "격리실 주변으로 낯선 영역(Domain)이 생성되기 시작한다. 벽의 질감이, 소리의 결이 조금씩 달라진다.",
    onEnter: [{ op: "setFlag", flag: "domain", value: 1 }],
    next: "b_radio",
  },
  b_radio: {
    id: "b_radio",
    text: "무전이 지직거린다. \"...소장님, 들리십니까. 시설 곳곳에 이상 반응이 감지됩니다. 확인이 필요합니다.\"",
    next: "explore_hub",
  },

  // ── 탐험 허브 ──────────────────────────────────────────────────────────
  explore_hub: {
    id: "explore_hub",
    text: "무전을 끝내고 시설을 둘러본다. 확인해야 할 곳이 아직 남아 있다.",
    hub: true,
    next: "b_report",
  },

  // ── #1 녹색 액체 ──────────────────────────────────────────────────────
  ev_green_liquid: {
    id: "ev_green_liquid",
    text: "복도 바닥에 정체불명의 녹색 액체가 고여 있다. 유리병 하나가 그 옆에 굴러다닌다.",
    choices: [
      {
        id: "quick",
        label: "재빠르게 집는다",
        effects: [{ op: "giveItem", item: "녹색액체" }],
      },
      {
        id: "gloved",
        label: "장갑을 끼고 집는다",
        requires: { op: "hasItem", item: "장갑" },
        effects: [
          { op: "giveItem", item: "녹색액체" },
          { op: "consumeItem", item: "장갑" },
        ],
      },
      {
        id: "bare",
        label: "그냥 만진다",
        effects: [{ op: "applyStatus", status: "출혈" }],
      },
    ],
    onEnter: [{ op: "unlockReport", report: "rep_greenblood" }],
    next: "explore_hub",
  },

  // ── #2 라디오 ────────────────────────────────────────────────────────
  ev_radio: {
    id: "ev_radio",
    text: "빈 사무실에서 라디오 잡음이 들린다. 사람 목소리 같기도, 아닌 것 같기도 하다.",
    choices: [
      {
        id: "ignore",
        label: "무시한다",
        effects: [{ op: "incFlag", flag: "불안" }],
      },
      {
        id: "chase",
        label: "소리를 쫓아간다",
        effects: [{ op: "modStat", stat: "정신", delta: -15 }],
      },
    ],
    next: "explore_hub",
  },

  // ── #3 나비 ──────────────────────────────────────────────────────────
  ev_butterfly: {
    id: "ev_butterfly",
    text: "복도 한가운데를 나비 한 마리가 날아간다. 이곳에 있을 리 없는 생물이다.",
    choices: [
      {
        id: "follow",
        label: "따라간다",
        effects: [
          { op: "incFlag", flag: "사망자" },
          { op: "modStat", stat: "정신", delta: -10 },
        ],
      },
      {
        id: "catch",
        label: "사로잡는다",
        effects: [
          { op: "modStat", stat: "속도", delta: 1 },
          { op: "unlockReport", report: "rep_butterfly" },
        ],
      },
    ],
    next: "explore_hub",
  },

  // ── #4 응급키트 ───────────────────────────────────────────────────────
  ev_medkit: {
    id: "ev_medkit",
    text: "쓰러진 대원 옆에 응급키트가 떨어져 있다. 대원의 상태는 알 수 없다.",
    choices: [
      {
        id: "quick",
        label: "재빠르게 챙기고 물러난다",
        effects: [
          { op: "giveItem", item: "의료용품" },
          { op: "giveItem", item: "보호장비" },
        ],
      },
      {
        id: "modest",
        label: "적당히 챙긴다",
        effects: [{ op: "giveItem", item: "의료용품" }],
      },
    ],
    next: "explore_hub",
  },

  // ── #5 미로 (자기참조 루프 + 정답 시퀀스) ────────────────────────────────
  ev_maze: {
    id: "ev_maze",
    text: "회랑이 거울처럼 반복된다. 같은 벽화, 같은 금 간 타일. 방향을 정한다.",
    choices: [
      { id: "left", label: "왼쪽", effects: [{ op: "goto", passage: "ev_maze_2" }] },
      { id: "right", label: "오른쪽", effects: [{ op: "goto", passage: "ev_maze" }] },
      { id: "straight", label: "직진", effects: [{ op: "goto", passage: "ev_maze" }] },
    ],
  },
  ev_maze_2: {
    id: "ev_maze_2",
    text: "또 같은 벽화. 그런데 타일의 금이 아까와 조금 다르다 — 방향이 맞았다는 뜻일까.",
    choices: [
      { id: "left", label: "왼쪽", effects: [{ op: "goto", passage: "ev_maze" }] },
      { id: "right", label: "오른쪽", effects: [{ op: "goto", passage: "ev_maze_3" }] },
      { id: "straight", label: "직진", effects: [{ op: "goto", passage: "ev_maze" }] },
    ],
  },
  ev_maze_3: {
    id: "ev_maze_3",
    text: "출구인 듯한 빛이 저 끝에서 새어 나온다. 마지막 방향을 정한다.",
    choices: [
      { id: "left", label: "왼쪽", effects: [{ op: "goto", passage: "ev_maze" }] },
      { id: "right", label: "오른쪽", effects: [{ op: "goto", passage: "ev_maze" }] },
      {
        id: "straight",
        label: "직진",
        effects: [{ op: "goto", passage: "explore_hub" }],
      },
    ],
  },

  // ── 보고서 정리 → 엔딩 분기 ────────────────────────────────────────────
  b_report: {
    id: "b_report",
    text: "탐험을 마치고 보고서를 정리한다. 오늘 확인한 것들을 기록에 남긴다.",
    // next는 StoryRunner가 hp/정신/reports 상태를 보고 ending_* 로 리다이렉트한다.
    next: "ending_survive",
  },

  // ── 엔딩 (프로토타입 범위: 사망/생존. 광기는 #1~#5만으로도 도달 가능해 포함) ──
  ending_death: {
    id: "ending_death",
    ending: "death",
    endingTitle: "고통은 끝나지 않는다",
    text: "출혈은 멈추지 않았다. 시야가 흐려지고, 마지막으로 들리는 건 무전기의 잡음뿐이다. — 고통은 끝나지 않는다.",
  },
  ending_madness: {
    id: "ending_madness",
    ending: "madness",
    endingTitle: "광기",
    text: "머릿속에서 소리가 멈추지 않는다. 무엇이 진짜였는지 더는 구분할 수 없다.",
  },
  ending_survive: {
    id: "ending_survive",
    ending: "survive",
    endingTitle: "격리 유지",
    text: "격리는 유지됐다. 보고서를 제출한다. 오늘은 여기까지 — 내일도 이 시설은 그대로 있을 것이다.",
  },
  ending_truth: {
    id: "ending_truth",
    ending: "truth",
    endingTitle: "다시 살아갈 희망을 얻었다, 죽기 위해서",
    text: "모아온 보고서들이 하나로 맞춰진다. 괴이의 정체가 드러난다 — 이곳에 온 건, 죽고 싶어서였다.",
  },
};
