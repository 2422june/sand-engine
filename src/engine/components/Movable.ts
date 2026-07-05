import { Component } from "../core/Component";
import { Collider2D } from "./Collider2D";
import { Transform2D } from "./Transform2D";

/**
 * Collision-aware movement.
 *
 * Decides whether a move is allowed and applies it. {@link move} tries each
 * axis separately so a blocked X still lets Y through (and vice-versa) — the
 * entity slides along walls instead of sticking. Without a {@link Collider2D}
 * it moves freely; solid colliders block it.
 *
 * {@link Actor} routes its input-driven movement through this component when it
 * is present, so gameplay movement respects collision automatically.
 */
export class Movable extends Component {
  /** Whether the last {@link move} was blocked on either axis. */
  blockedX = false;
  blockedY = false;

  /** Can this entity's collider sit at (x, y) without hitting a solid? */
  canMoveTo(x: number, y: number): boolean {
    const collider = this.entity?.getComponent(Collider2D);
    if (!collider) {
      return true;
    }
    return Collider2D.solidAt(collider.getBoundsAt(x, y), collider) === null;
  }

  /**
   * Move by (dx, dy), axis-separated, stopping on solids. Returns true if the
   * full move happened with no blocking.
   */
  move(dx: number, dy: number): boolean {
    const transform = this.entity?.getComponent(Transform2D);
    if (!transform) {
      return false;
    }
    const collider = this.entity?.getComponent(Collider2D);
    this.blockedX = false;
    this.blockedY = false;

    if (!collider) {
      transform.x += dx;
      transform.y += dy;
      return true;
    }

    if (dx !== 0) {
      if (Collider2D.solidAt(collider.getBoundsAt(transform.x + dx, transform.y), collider) === null) {
        transform.x += dx;
      } else {
        this.blockedX = true;
      }
    }

    if (dy !== 0) {
      if (Collider2D.solidAt(collider.getBoundsAt(transform.x, transform.y + dy), collider) === null) {
        transform.y += dy;
      } else {
        this.blockedY = true;
      }
    }

    return !this.blockedX && !this.blockedY;
  }
}
