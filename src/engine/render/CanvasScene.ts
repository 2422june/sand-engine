import { Scene } from "../core/Scene";

export abstract class CanvasScene extends Scene {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    super();
    this.width = width;
    this.height = height;
  }

  /**
   * 캔버스 버퍼가 리사이즈되면(fill 모드: 화면을 꽉 채우는 템플릿 규칙) 논리 크기를
   * 갱신한다. 크기에 의존해 그리는 씬은 `render`에서 `this.width/height`를 그대로
   * 쓰면 다음 프레임부터 새 크기로 반영된다. 생성자에서 좌표를 캐시한 씬은 필요 시
   * 이 메서드를 오버라이드해 재배치한다.
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  clear(ctx: CanvasRenderingContext2D, fillStyle = "#0f1724"): void {
    ctx.fillStyle = fillStyle;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
