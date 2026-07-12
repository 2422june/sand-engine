import { bootGame } from "../boot";
import { CrossyScene } from "../games/crossy/CrossyScene";

bootGame({
  title: "길건너 친구들",
  subtitle: "↑ 전진 · ↓ 후진 · ← → 좌우 · 자동차 피하기",
  width: 540, // 세로 화면 (9열 × TILE 60)
  height: 960,
  create: (w, h) => new CrossyScene(w, h),
  touchControls: true,
});
