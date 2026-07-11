import { bootGame } from "../boot";
import { NarrativeScene } from "../games/anomaly-research/NarrativeScene";

bootGame({
  title: "괴이 연구소",
  subtitle: "낭독 진행: 탭/클릭 또는 숫자키 1~6 · Space/Enter로 계속",
  create: (w, h) => new NarrativeScene(w, h),
  touchControls: false, // 로그/선택지 탭으로 진행 — D패드 불필요
});
