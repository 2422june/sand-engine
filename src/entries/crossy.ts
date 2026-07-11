import { bootGame } from "../boot";
import { CrossyScene } from "../games/crossy/CrossyScene";

bootGame({
  title: "길건너 친구들",
  subtitle: "↑ 전진 · ↓ 후진 · ← → 좌우 · 자동차 피하기",
  create: (w, h) => new CrossyScene(w, h),
  touchControls: true,
});
