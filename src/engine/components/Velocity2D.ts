import { Component } from "../core/Component";
import { Transform2D } from "./Transform2D";

export class Velocity2D extends Component {
  vx: number;
  vy: number;

  constructor(vx = 0, vy = 0) {
    super();
    this.vx = vx;
    this.vy = vy;
  }

  override update(deltaTime: number): void {
    const transform = this.entity?.getComponent(Transform2D);
    if (!transform) {
      return;
    }

    transform.x += this.vx * deltaTime;
    transform.y += this.vy * deltaTime;
  }
}
