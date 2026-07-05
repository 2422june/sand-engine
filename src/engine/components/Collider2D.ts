import { Component } from "../core/Component";
import { Transform2D } from "./Transform2D";

export class Collider2D extends Component {
  width: number;
  height: number;
  isTrigger: boolean;

  constructor(width: number, height: number, isTrigger = false) {
    super();
    this.width = width;
    this.height = height;
    this.isTrigger = isTrigger;
  }

  intersects(other: Collider2D): boolean {
    const a = this.getBounds();
    const b = other.getBounds();

    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  getBounds(): { left: number; right: number; top: number; bottom: number } {
    const transform = this.entity?.getComponent(Transform2D);
    const x = transform?.x ?? 0;
    const y = transform?.y ?? 0;
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;

    return {
      left: x - halfWidth,
      right: x + halfWidth,
      top: y - halfHeight,
      bottom: y + halfHeight,
    };
  }
}
