import { CanvasScene } from "../../engine/render/CanvasScene";

/**
 * 공용 템플릿 테스트 — 콘텐츠가 없는 빈 게임.
 *
 * 공용 셸(boot: 헤더 제거 · 뒤로가기→종료 확인 · 화면 중앙정렬)과 `CanvasScene`
 * 렌더 파이프라인이 제대로 도는지 확인하기 위한 최소 스켈레톤. 새 게임을 시작할 때
 * 이 파일을 복사해 `render`/`update`만 채우면 된다.
 */
export class TemplateScene extends CanvasScene {
  override update(_deltaTime: number): void {
    // 콘텐츠 없음 — 상태 변화 없음.
  }

  override render(ctx: CanvasRenderingContext2D): void {
    this.clear(ctx, "#0b0d12");

    // 캔버스 영역/중앙정렬 확인용 옅은 테두리 + 중앙 라벨.
    ctx.strokeStyle = "rgba(234, 241, 255, 0.14)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, this.width - 2, this.height - 2);

    ctx.fillStyle = "rgba(234, 241, 255, 0.5)";
    ctx.font = "16px Pretendard, 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("공용 템플릿 테스트 · 빈 게임", this.width / 2, this.height / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}
