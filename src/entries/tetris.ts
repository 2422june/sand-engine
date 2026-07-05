import { bootGame } from "../boot";
import { TetrisScene } from "../games/tetris/TetrisScene";

bootGame({
  title: "테트리스",
  subtitle: "← → 이동 · ↑/X 회전 · ↓ 소프트드롭 · Space 하드드롭",
  create: (w, h) => new TetrisScene(w, h),
});
