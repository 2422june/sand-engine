import { Component } from "../core/Component";
import type { Entity } from "../core/Entity";
import { Transform2D } from "./Transform2D";

export type Bounds = { left: number; right: number; top: number; bottom: number };

/**
 * Axis-aligned box collider.
 *
 * Every collider registers itself in a shared registry on attach, so movement
 * queries (see {@link import("./Movable").Movable}) can ask "would this box at
 * (x, y) hit anything solid?" without the scene wiring up a collision world.
 *
 * A `isTrigger` collider is detected by overlap tests but does NOT block
 * movement (e.g. pickups, hit zones); a non-trigger collider is solid.
 */
export class Collider2D extends Component {
  private static readonly registry = new Set<Collider2D>();

  width: number;
  height: number;
  isTrigger: boolean;

  constructor(width: number, height: number, isTrigger = false) {
    super();
    this.width = width;
    this.height = height;
    this.isTrigger = isTrigger;
  }

  override onAttach(_entity: Entity): void {
    Collider2D.registry.add(this);
  }

  /** True for colliders that block movement. */
  get solid(): boolean {
    return !this.isTrigger;
  }

  intersects(other: Collider2D): boolean {
    return Collider2D.overlap(this.getBounds(), other.getBounds());
  }

  getBounds(): Bounds {
    const transform = this.entity?.getComponent(Transform2D);
    return this.getBoundsAt(transform?.x ?? 0, transform?.y ?? 0);
  }

  /** Bounds this collider would have if its entity sat at (x, y). */
  getBoundsAt(x: number, y: number): Bounds {
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    return {
      left: x - halfWidth,
      right: x + halfWidth,
      top: y - halfHeight,
      bottom: y + halfHeight,
    };
  }

  static overlap(a: Bounds, b: Bounds): boolean {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  /** Any SOLID collider (other than `ignore`) overlapping `bounds`. */
  static solidAt(bounds: Bounds, ignore?: Collider2D): Collider2D | null {
    for (const other of Collider2D.registry) {
      if (other === ignore || !other.solid) {
        continue;
      }
      if (Collider2D.overlap(bounds, other.getBounds())) {
        return other;
      }
    }
    return null;
  }

  /** Every collider (other than `ignore`) overlapping `bounds`. */
  static overlapping(bounds: Bounds, ignore?: Collider2D): Collider2D[] {
    const result: Collider2D[] = [];
    for (const other of Collider2D.registry) {
      if (other === ignore) {
        continue;
      }
      if (Collider2D.overlap(bounds, other.getBounds())) {
        result.push(other);
      }
    }
    return result;
  }

  /** Drop every registered collider (e.g. when tearing down a scene). */
  static clearRegistry(): void {
    Collider2D.registry.clear();
  }
}
