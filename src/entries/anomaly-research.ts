import { bootGame } from "../boot";
import { NarrativeScene } from "../games/anomaly-research/NarrativeScene";

bootGame({
  title: "감정의 바다",
  width: 960, // 가로 게임(관제실 UI 960×540 고정) — 세로 폰에선 회전 안내
  height: 540,
  create: (w, h) => new NarrativeScene(w, h),
  touchControls: false, // 로그/선택지 탭으로 진행 — D패드 불필요
});
