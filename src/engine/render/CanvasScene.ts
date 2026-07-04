import { Scene } from "../core/Scene";

export abstract class CanvasScene extends Scene {
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    super();
    this.width = width;
    this.height = height;
  }

  clear(ctx: CanvasRenderingContext2D, fillStyle = "#0f1724"): void {
    ctx.fillStyle = fillStyle;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
