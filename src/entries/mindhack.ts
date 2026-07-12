import { bootGame } from "../boot";
import { MindHackScene } from "../games/mindhack/MindHackScene";

bootGame({
  title: "MindHack (엔진 데모)",
  width: 960, // 가로 게임 (세로 폰에선 회전 안내)
  height: 540,
  create: (w, h) => new MindHackScene(w, h),
  touchControls: true,
});
