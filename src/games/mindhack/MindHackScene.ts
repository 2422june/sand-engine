import { AudioManager } from "../../engine/audio/AudioManager";
import { Actor } from "../../engine/components/Actor";
import { Animation } from "../../engine/components/Animation";
import { Collider2D } from "../../engine/components/Collider2D";
import { Health } from "../../engine/components/Health";
import { InputController } from "../../engine/components/InputController";
import { Light } from "../../engine/components/Light";
import { Movable } from "../../engine/components/Movable";
import { Shadow } from "../../engine/components/Shadow";
import { Sprite } from "../../engine/components/Sprite";
import { StateMachine } from "../../engine/components/StateMachine";
import { Transform2D } from "../../engine/components/Transform2D";
import { TriggerZone } from "../../engine/components/TriggerZone";
import { Velocity2D } from "../../engine/components/Velocity2D";
import { Entity } from "../../engine/core/Entity";
import { CanvasScene } from "../../engine/render/CanvasScene";
import { LightingLayer, type LightSource } from "../../engine/render/LightingLayer";
import { Button } from "../../engine/ui/Button";
import { Column } from "../../engine/ui/Column";
import { Label } from "../../engine/ui/Label";
import { Panel } from "../../engine/ui/Panel";
import { ProgressBar } from "../../engine/ui/ProgressBar";
import { Row } from "../../engine/ui/Row";
import { Slider } from "../../engine/ui/Slider";
import { Toggle } from "../../engine/ui/Toggle";
import { UI } from "../../engine/ui/UI";

export class MindHackScene extends CanvasScene {
  private readonly player: Entity;
  private readonly orb: Entity;
  private readonly enemyStateMachine: StateMachine;
  private readonly ui = new UI();
  private readonly lighting = new LightingLayer("#3f4056");
  private readonly audio = AudioManager.instance;
  private readonly playerHpBar: ProgressBar;
  private playerInvulnerable = false;
  private baseSpeed = 190;
  private wasColliding = false;

  constructor(width: number, height: number) {
    super(width, height);

    this.player = this.addEntity(new Entity("player"));
    this.player.addComponent(new Transform2D(width / 2 - 140, height / 2));
    // Input dispatch runs first, then Actor turns it into velocity, then
    // Velocity2D applies it to the transform — same-frame movement.
    const playerInput = this.player.addComponent(new InputController());
    const playerActor = this.player.addComponent(new Actor({ speed: this.baseSpeed }));
    this.player.addComponent(new Velocity2D());
    // Demo of the input phases: hold Shift to sprint (1.6x the base speed the
    // slider sets), release to return to base.
    playerInput.onHold("Shift", () => {
      playerActor.speed = this.baseSpeed * 1.6;
    });
    playerInput.onRelease("Shift", () => {
      playerActor.speed = this.baseSpeed;
    });
    this.player.addComponent(new Collider2D(44, 44));
    this.player.addComponent(new Movable());
    this.player.addComponent(new Health(100));
    this.player.addComponent(new Shadow({ offsetY: 26, radiusX: 30, radiusY: 11 }));
    this.player.addComponent(new Light({ radius: 220, color: "#ffd9a0", intensity: 0.95 }));
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
    this.orb.addComponent(new Shadow({ offsetY: 22, radiusX: 24, radiusY: 9, alpha: 0.3 }));
    this.orb.addComponent(new Light({ radius: 190, color: "#8fe6ff", intensity: 0.9, flicker: 0.12 }));
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

    // Solid walls the player (which has a Movable) cannot pass through.
    this.addWall(300, 210, 150, 26);
    this.addWall(300, 340, 26, 170);
    this.addWall(520, 300, 170, 26);

    // Trigger zone (heal pad): enter / stay / exit fire separately. Its collider
    // is a trigger, so it detects the player but does not block movement.
    const healPad = this.addEntity(new Entity("heal-pad"));
    healPad.addComponent(new Transform2D(150, 380));
    healPad.addComponent(new Collider2D(120, 100, true));
    const padSprite = healPad.addComponent(
      new Sprite({ width: 120, height: 100, color: "#2f7d5b", shape: "rect", opacity: 0.35 }),
    );
    healPad
      .addComponent(new TriggerZone({ filter: (entity) => entity === this.player }))
      .onEnter(() => {
        padSprite.color = "#5ad19b";
        this.audio.tone(520, 0.12, { type: "sine", volume: 0.2 });
      })
      .onStay((other, dt) => {
        other.getComponent(Health)?.heal(dt * 22);
      })
      .onExit(() => {
        padSprite.color = "#2f7d5b";
        this.audio.tone(390, 0.12, { type: "sine", volume: 0.18 });
      });

    // UI is driven by the pointer, fully separate from the keyboard input above.
    // The panel holds a Column that auto-stacks every widget vertically — no
    // manual Y coordinates, and children use local coords via the hierarchy.
    const panel = this.ui.add(new Panel(width - 184, 20, 160, 292));
    const column = panel.addChild(new Column(12, 12, 136, { gap: 10 }));

    column.addChild(new Label(0, 0, "Player", { color: "#a6bbd2" }));
    this.playerHpBar = column.addChild(
      new ProgressBar(0, 0, 136, 16, this.player.getComponent(Health)?.maxHp ?? 100),
    );
    // A Row lays two buttons out side by side inside the Column.
    const buttonRow = column.addChild(new Row(0, 0, { gap: 10 }));
    buttonRow
      .addChild(new Button(0, 0, 63, 34, "Heal"))
      .onClick(() => {
        this.player.getComponent(Health)?.heal(25);
        // SFX: a bright rising blip.
        this.audio.tone(660, 0.12, { type: "triangle", volume: 0.25 });
      });
    buttonRow
      .addChild(new Button(0, 0, 63, 34, "Hurt"))
      .onClick(() => {
        this.player.getComponent(Health)?.damage(25);
        // SFX: a low thud.
        this.audio.tone(160, 0.16, { type: "sawtooth", volume: 0.25 });
      });

    // Interactive widgets driving gameplay (still a separate input path).
    column.addChild(new Label(0, 0, "Move Speed", { color: "#a6bbd2" }));
    column
      .addChild(new Slider(0, 0, 136, 10, 80, 360, this.baseSpeed))
      .onChange((value) => {
        this.baseSpeed = value;
        playerActor.speed = value;
      });
    column
      .addChild(new Toggle(0, 0, 18, "Invulnerable", this.playerInvulnerable))
      .onChange((checked) => {
        this.playerInvulnerable = checked;
      });

    // Audio controls (drive the AudioManager, separate from gameplay again).
    column.addChild(new Label(0, 0, "Volume", { color: "#a6bbd2" }));
    column
      .addChild(new Slider(0, 0, 136, 10, 0, 1, this.audio.masterVolume))
      .onChange((value) => {
        this.audio.masterVolume = value;
      });
    column
      .addChild(new Toggle(0, 0, 18, "Mute", this.audio.muted))
      .onChange((checked) => {
        this.audio.muted = checked;
      });

    // BGM: a soft, asset-free synth chord loop (starts on first user gesture).
    this.audio.makeChord("ambient", [110, 164.81, 220], 4);
    this.audio.playBgm("ambient", { loop: true, volume: 0.35 });
  }

  private addWall(x: number, y: number, width: number, height: number): Entity {
    const wall = this.addEntity(new Entity(`wall-${x}-${y}`));
    wall.addComponent(new Transform2D(x, y));
    wall.addComponent(new Collider2D(width, height)); // solid (not a trigger)
    wall.addComponent(new Shadow({ offsetY: height / 2 + 6, radiusX: width / 2, radiusY: 8, alpha: 0.28 }));
    wall.addComponent(
      new Sprite({ width, height, color: "#4b5b74", shape: "rect" }),
    );
    return wall;
  }

  override update(deltaTime: number): void {
    super.update(deltaTime);
    this.ui.update(deltaTime);

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

    // Keep the UI HP bar in sync with the player's health.
    this.playerHpBar.value = playerHealth.hp;

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

    const colliding = playerCollider.intersects(orbCollider);
    if (colliding) {
      if (!this.playerInvulnerable) {
        playerHealth.damage(deltaTime * 18);
      }
      orbHealth.damage(deltaTime * 10);
      this.player.getComponent(Animation)?.play("hit");
      // SFX only on the frame the collision starts, not every frame.
      if (!this.wasColliding) {
        this.audio.tone(140, 0.18, { type: "square", volume: 0.2 });
      }
    } else {
      this.player.getComponent(Animation)?.play("idle");
    }
    this.wasColliding = colliding;
  }

  override render(ctx: CanvasRenderingContext2D): void {
    this.clear(ctx, "#09111c");

    ctx.fillStyle = "#6eb6ff";
    ctx.fillRect(0, this.height - 56, this.width, 56);

    // Shadows first, under everything else.
    for (const entity of this.entities) {
      const transform = entity.getComponent(Transform2D);
      const shadow = entity.getComponent(Shadow);
      if (transform && shadow) {
        shadow.render(ctx, transform.x, transform.y);
      }
    }

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
    if (orbTransform) {
      const glow = ctx.createRadialGradient(orbTransform.x, orbTransform.y, 6, orbTransform.x, orbTransform.y, 42);
      glow.addColorStop(0, "#f6fbff");
      glow.addColorStop(0.3, "#99f3ff");
      glow.addColorStop(1, "rgba(19, 176, 255, 0)");

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(orbTransform.x, orbTransform.y, 42, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lighting overlay dims the world; collect every Light in the scene.
    const lights: LightSource[] = [];
    for (const entity of this.entities) {
      const transform = entity.getComponent(Transform2D);
      const light = entity.getComponent(Light);
      if (transform && light) {
        lights.push({
          x: transform.x,
          y: transform.y,
          radius: light.radius,
          color: light.color,
          intensity: light.effectiveIntensity,
        });
      }
    }
    this.lighting.render(ctx, lights);

    const playerHealth = this.player.getComponent(Health);
    const orbHealth = this.orb.getComponent(Health);
    const enemyState = this.orb.getComponent(StateMachine)?.currentState ?? "unknown";

    // 이름/조작법 텍스트는 제거, 상태 readout만.
    ctx.fillStyle = "#a6bbd2";
    ctx.font = "16px Pretendard, sans-serif";
    ctx.fillText(`Player HP: ${Math.ceil(playerHealth?.hp ?? 0)}`, 24, 36);
    ctx.fillText(`Orb HP: ${Math.ceil(orbHealth?.hp ?? 0)}`, 24, 60);
    ctx.fillText(`Orb State: ${enemyState}`, 24, 84);

    this.ui.render(ctx);
  }
}
