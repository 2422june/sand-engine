export const PLAYER_CHARACTER_ID = "player";
export const PLAYER_NAME = "박지용";

/** 플레이어/NPC 공용 로스터 카드 (UI 시안 2026-07-10 반영 — 감정의 바다 참고). */
export type Character = {
  id: string;
  name: string;
  role: string;
  /** 서사상 아직 등장하지 않은 NPC는 로스터에 넣지 않으므로, 존재 = 이미 공개된 상태. */
  condition: string;
};

/** Blue Print.md §4 상태 모델 — hp + 정신 2축, 상태이상/능력/소지품/플래그/방문/보고서 + 캐릭터 로스터. */
export type StoryState = {
  stats: { hp: number; 정신: number };
  status: string[];
  abilities: { 속도: number; 인지: number };
  inventory: string[];
  flags: Record<string, number>;
  visited: Set<string>;
  reports: string[];
  characters: Character[];
};

/** §0-1 초기 소지품: 장갑. §4: hp/정신 100 시작. 로스터는 플레이어 본인만으로 시작. */
export function createInitialState(): StoryState {
  return {
    stats: { hp: 100, 정신: 100 },
    status: [],
    abilities: { 속도: 0, 인지: 0 },
    inventory: ["장갑"],
    flags: {},
    visited: new Set<string>(),
    reports: [],
    characters: [{ id: PLAYER_CHARACTER_ID, name: PLAYER_NAME, role: "관리자", condition: "정상" }],
  };
}
