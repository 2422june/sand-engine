import { bootGame } from "../boot";
import { ChessScene } from "../games/chess/ChessScene";

bootGame({
  title: "체스 (2인)",
  subtitle: "말 클릭 → 선택, 초록 표시 클릭 → 이동 · 캐슬링·앙파상·승격 지원",
  width: 540, // 세로 화면 (상단 차례 표시 + 8×60 보드 중앙)
  height: 600,
  create: (w, h) => new ChessScene(w, h),
  touchControls: false, // 포인터 탭만으로 조작 — D패드 불필요
});
