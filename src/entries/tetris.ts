import { bootGame } from "../boot";
import { TetrisScene } from "../games/tetris/TetrisScene";

bootGame({
  title: "테트리스",
  subtitle: "← → 이동 · ↑/X 회전 · ↓ 소프트드롭 · Space 하드드롭",
  width: 480, // 세로 화면 (10×28 보드 + 우측 정보)
  height: 660,
  create: (w, h) => new TetrisScene(w, h),
  touchControls: true,
});
