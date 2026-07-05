import { bootGame } from "../boot";
import { CheckersScene } from "../games/checkers/CheckersScene";

bootGame({
  title: "체커 (2인)",
  subtitle: "말 클릭 → 선택 · 잡기 강제 · 연속 점프 · 끝줄 도달 시 킹",
  create: (w, h) => new CheckersScene(w, h),
});
