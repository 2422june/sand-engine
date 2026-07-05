import { Actor } from "../../engine/components/Actor";
import { Animation } from "../../engine/components/Animation";
import { Collider2D } from "../../engine/components/Collider2D";
import { Health } from "../../engine/components/Health";
import { InputController } from "../../engine/components/InputController";
import { Sprite } from "../../engine/components/Sprite";
import { StateMachine } from "../../engine/components/StateMachine";
import { Transform2D } from "../../engine/components/Transform2D";
import { Velocity2D } from "../../engine/components/Velocity2D";
import { Entity } from "../../engine/core/Entity";
import { CanvasScene } from "../../engine/render/CanvasScene";

export class MindHackScene extends CanvasScene {
  private readonly player: Entity;
  private readonly orb: Entity;
  private readonly enemyStateMachine: StateMachine;

  constructor(width: number, height: number) {
    super(width, height);

    this.player = this.addEntity(new Entity("player"));
    this.player.addComponent(new Transform2D(width / 2 - 140, height / 2));
    // Input dispatch runs first, then Actor turns it into velocity, then
    // Velocity2D applies it to the transform — same-frame movement.
    const playerInput = this.player.addComponent(new InputController());
    const playerActor = this.player.addComponent(new Actor({ speed: 190 }));
    this.player.addComponent(new Velocity2D());
    // Demo of the input phases: hold Shift to sprint, release to slow back down.
    playerInput.onHold("Shift", () => {
      playerActor.speed = 320;
    });
    playerInput.onRelease("Shift", () => {
      playerActor.speed = 190;
    });
    this.player.addComponent(new Collider2D(44, 44));
    this.player.addComponent(new Health(100));
    this.player.addComponent(
      new Sprite({
        width: 44,
        height: 44,
        color: "#ffe082",
        shape: "rect",
      }),
    );
    this.player
      .addComponent(new Animation())
      .addClip("idle", [
        { color: "#ffe082", scale: 1, duration: 0.35 },
        { color: "#ffd54f", scale: 1.05, duration: 0.35 },
      ])
      .addClip("hit", [
        { color: "#ff7043", scale: 1.18, duration: 0.12 },
        { color: "#ffe082", scale: 1, duration: 0.12 },
      ]);

    this.orb = this.addEntity(new Entity("orb"));
    this.orb.addComponent(new Transform2D(width / 2, height / 2));
    this.orb.addComponent(new Velocity2D(84, 46));
    this.orb.addComponent(new Collider2D(36, 36));
    this.orb.addComponent(new Health(30));
    this.orb.addComponent(
      new Sprite({
        width: 36,
        height: 36,
        color: "#7bdff6",
        shape: "circle",
      }),
    );
    this.orb
      .addComponent(new Animation())
      .addClip("idle", [
        { color: "#7bdff6", scale: 1, duration: 0.25 },
        { color: "#b2f7ef", scale: 1.18, duration: 0.25 },
      ])
      .addClip("alert", [
        { color: "#ff8a65", scale: 1.1, duration: 0.15 },
        { color: "#ff5252", scale: 1.26, duration: 0.15 },
      ]);

    this.enemyStateMachine = this.orb.addComponent(new StateMachine());
    this.enemyStateMachine
      .addState("idle", {
        onEnter: () => {
          this.orb.getComponent(Animation)?.play("idle");
        },
      })
      .addState("alert", {
        onEnter: () => {
          this.orb.getComponent(Animation)?.play("alert");
        },
      });
    this.enemyStateMachine.setState("idle");
  }

  override update(deltaTime: number): void {
    super.update(deltaTime);

    const playerTransform = this.player.getComponent(Transform2D);
    const playerCollider = this.player.getComponent(Collider2D);
    const playerHealth = this.player.getComponent(Health);
    const orbTransform = this.orb.getComponent(Transform2D);
    const orbVelocity = this.orb.getComponent(Velocity2D);
    const orbCollider = this.orb.getComponent(Collider2D);
    const orbHealth = this.orb.getComponent(Health);

    if (
      !playerTransform ||
      !playerCollider ||
      !playerHealth ||
      !orbTransform ||
      !orbVelocity ||
      !orbCollider ||
      !orbHealth
    ) {
      return;
    }

    playerTransform.x = Math.max(32, Math.min(this.width - 32, playerTransform.x));
    playerTransform.y = Math.max(32, Math.min(this.height - 88, playerTransform.y));

    if (orbTransform.x < 64 || orbTransform.x > this.width - 64) {
      orbVelocity.vx *= -1;
    }

    if (orbTransform.y < 64 || orbTransform.y > this.height - 64) {
      orbVelocity.vy *= -1;
    }

    const distance = Math.hypot(playerTransform.x - orbTransform.x, playerTransform.y - orbTransform.y);
    this.enemyStateMachine.setState(distance < 150 ? "alert" : "idle");

    if (playerCollider.intersects(orbCollider)) {
      playerHealth.damage(deltaTime * 18);
      orbHealth.damage(deltaTime * 10);
      this.player.getComponent(Animation)?.play("hit");
    } else {
      this.player.getComponent(Animation)?.play("idle");
    }
  }

  override render(ctx: CanvasRenderingContext2D): void {
    this.clear(ctx, "#09111c");

    ctx.fillStyle = "#6eb6ff";
    ctx.fillRect(0, this.height - 56, this.width, 56);

    for (const entity of this.entities) {
      const transform = entity.getComponent(Transform2D);
      const sprite = entity.getComponent(Sprite);

      if (!transform || !sprite) {
        continue;
      }

      ctx.save();
      ctx.globalAlpha = sprite.opacity;
      ctx.fillStyle = sprite.color;
      ctx.translate(transform.x, transform.y);
      ctx.rotate(transform.rotation);
      ctx.scale(sprite.scale, sprite.scale);

      if (sprite.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, sprite.width / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
      }

      ctx.restore();
    }

    const orbTransform = this.orb.getComponent(Transform2D);
    if (!orbTransform) {
      return;
    }

    const glow = ctx.createRadialGradient(orbTransform.x, orbTransform.y, 6, orbTransform.x, orbTransform.y, 42);
    glow.addColorStop(0, "#f6fbff");
    glow.addColorStop(0.3, "#99f3ff");
    glow.addColorStop(1, "rgba(19, 176, 255, 0)");

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(orbTransform.x, orbTransform.y, 42, 0, Math.PI * 2);
    ctx.fill();

    const playerHealth = this.player.getComponent(Health);
    const orbHealth = this.orb.getComponent(Health);
    const enemyState = this.orb.getComponent(StateMachine)?.currentState ?? "unknown";

    ctx.fillStyle = "#a6bbd2";
    ctx.font = "16px Pretendard, sans-serif";
    ctx.fillText("Mindhack prototype scene", 24, 36);
    ctx.fillText("Move: WASD / Arrow Keys", 24, 60);
    ctx.fillText(`Player HP: ${Math.ceil(playerHealth?.hp ?? 0)}`, 24, 92);
    ctx.fillText(`Orb HP: ${Math.ceil(orbHealth?.hp ?? 0)}`, 24, 116);
    ctx.fillText(`Orb State: ${enemyState}`, 24, 140);
  }
}
