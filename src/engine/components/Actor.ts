import { Component } from "../core/Component";
import { InputController } from "./InputController";
import { Velocity2D } from "./Velocity2D";

export type AxisBinding = {
  negative: string[];
  positive: string[];
};

/**
 * Turns input into movement.
 *
 * Reads directional axes from a sibling {@link InputController} and writes the
 * result into a sibling {@link Velocity2D}. This keeps `InputController` about
 * *input* and `Actor` about *what the entity does with it* — so the same input
 * component can drive different actors (player, remote, AI-fed) later.
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

  override update(): void {
    const input = this.entity?.getComponent(InputController);
    const velocity = this.entity?.getComponent(Velocity2D);
    if (!input || !velocity) {
      return;
    }

    velocity.vx = input.getAxis(this.horizontal.negative, this.horizontal.positive) * this.speed;
    velocity.vy = input.getAxis(this.vertical.negative, this.vertical.positive) * this.speed;
  }
}
