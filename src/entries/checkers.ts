import { bootGame } from "../boot";
import { CheckersScene } from "../games/checkers/CheckersScene";

bootGame({
  title: "체커 (2인)",
  subtitle: "말 클릭 → 선택 · 잡기 강제 · 연속 점프 · 끝줄 도달 시 킹",
  width: 540, // 세로 화면 (상단 차례 표시 + 8×60 보드 중앙)
  height: 600,
  create: (w, h) => new CheckersScene(w, h),
  touchControls: false, // 포인터 탭만으로 조작 — D패드 불필요
});
