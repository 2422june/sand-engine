import { Component } from "../core/Component";
import { InputController } from "./InputController";
import { Movable } from "./Movable";
import { Velocity2D } from "./Velocity2D";

export type AxisBinding = {
  negative: string[];
  positive: string[];
};

/**
 * Turns input into movement.
 *
 * Reads directional axes from a sibling {@link InputController}. If the entity
 * has a {@link Movable}, movement is routed through it so it respects collision
 * (blocked by solids, slides along walls); otherwise it falls back to writing a
 * sibling {@link Velocity2D} for free movement. This keeps `InputController`
 * about *input* and `Actor` about *what the entity does with it*.
 */
export class Actor extends Component {
  horizontal: AxisBinding;
  vertical: AxisBinding;
  speed: number;

  constructor(options?: {
    horizontal?: AxisBinding;
    vertical?: AxisBinding;
    speed?: number;
  }) {
    super();
    this.horizontal = options?.horizontal ?? {
      negative: ["ArrowLeft", "a"],
      positive: ["ArrowRight", "d"],
    };
    this.vertical = options?.vertical ?? {
      negative: ["ArrowUp", "w"],
      positive: ["ArrowDown", "s"],
    };
    this.speed = options?.speed ?? 160;
  }

  override update(deltaTime: number): void {
    const input = this.entity?.getComponent(InputController);
    if (!input) {
      return;
    }

    const vx = input.getAxis(this.horizontal.negative, this.horizontal.positive) * this.speed;
    const vy = input.getAxis(this.vertical.negative, this.vertical.positive) * this.speed;

    const movable = this.entity?.getComponent(Movable);
    if (movable) {
      // Collision-aware movement: apply displacement this frame, and keep any
      // Velocity2D from double-moving the entity.
      movable.move(vx * deltaTime, vy * deltaTime);
      const velocity = this.entity?.getComponent(Velocity2D);
      if (velocity) {
        velocity.vx = 0;
        velocity.vy = 0;
      }
      return;
    }

    const velocity = this.entity?.getComponent(Velocity2D);
    if (velocity) {
      velocity.vx = vx;
      velocity.vy = vy;
    }
  }
}
