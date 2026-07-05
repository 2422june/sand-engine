import { bootGame } from "../boot";
import { ChessScene } from "../games/chess/ChessScene";

bootGame({
  title: "체스 (2인)",
  subtitle: "말 클릭 → 선택, 초록 표시 클릭 → 이동 · 캐슬링·앙파상·승격 지원",
  create: (w, h) => new ChessScene(w, h),
});
