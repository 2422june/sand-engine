import { Scene } from "./Scene";

export class Game {
  private scene: Scene;
  private readonly ctx: CanvasRenderingContext2D;
  private lastTime = 0;

  constructor(scene: Scene, ctx: CanvasRenderingContext2D) {
    this.scene = scene;
    this.ctx = ctx;
  }

  start(): void {
    requestAnimationFrame(this.loop);
  }

  setScene(scene: Scene): void {
    this.scene = scene;
  }

  private readonly loop = (time: number): void => {
    const deltaTime = (time - this.lastTime) / 1000;
    this.lastTime = time;
    this.scene.update(Number.isFinite(deltaTime) ? deltaTime : 0);
    this.scene.render(this.ctx);
    requestAnimationFrame(this.loop);
  };
}
