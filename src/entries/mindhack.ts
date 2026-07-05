import { bootGame } from "../boot";
import { MindHackScene } from "../games/mindhack/MindHackScene";

bootGame({
  title: "MindHack (엔진 데모)",
  subtitle: "WASD / 방향키 이동 · 엔진 기능 종합 데모",
  create: (w, h) => new MindHackScene(w, h),
});
