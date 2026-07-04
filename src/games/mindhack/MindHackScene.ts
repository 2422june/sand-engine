import { Entity } from "../../engine/core/Entity";
import { Transform2D } from "../../engine/components/Transform2D";
import { Velocity2D } from "../../engine/components/Velocity2D";
import { CanvasScene } from "../../engine/render/CanvasScene";

export class MindHackScene extends CanvasScene {
  private readonly orb: Entity;

  constructor(width: number, height: number) {
    super(width, height);

    this.orb = this.addEntity(new Entity("orb"));
    this.orb.addComponent(new Transform2D(width / 2, height / 2));
    this.orb.addComponent(new Velocity2D(84, 46));
  }

  override update(deltaTime: number): void {
    super.update(deltaTime);

    const transform = this.orb.getComponent(Transform2D);
    const velocity = this.orb.getComponent(Velocity2D);

    if (!transform || !velocity) {
      return;
    }

    if (transform.x < 64 || transform.x > this.width - 64) {
      velocity.vx *= -1;
    }

    if (transform.y < 64 || transform.y > this.height - 64) {
      velocity.vy *= -1;
    }
  }

  override render(ctx: CanvasRenderingContext2D): void {
    this.clear(ctx, "#09111c");

    ctx.fillStyle = "#6eb6ff";
    ctx.fillRect(0, this.height - 56, this.width, 56);

    const transform = this.orb.getComponent(Transform2D);
    if (!transform) {
      return;
    }

    const glow = ctx.createRadialGradient(transform.x, transform.y, 6, transform.x, transform.y, 42);
    glow.addColorStop(0, "#f6fbff");
    glow.addColorStop(0.3, "#99f3ff");
    glow.addColorStop(1, "rgba(19, 176, 255, 0)");

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(transform.x, transform.y, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d9fbff";
    ctx.beginPath();
    ctx.arc(transform.x, transform.y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#a6bbd2";
    ctx.font = "16px Pretendard, sans-serif";
    ctx.fillText("Mindhack prototype scene", 24, 36);
  }
}
