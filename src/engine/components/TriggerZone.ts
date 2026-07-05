import { Component } from "../core/Component";
import type { Entity } from "../core/Entity";
import { Collider2D } from "./Collider2D";

export type TriggerCallback = (other: Entity) => void;
export type TriggerStayCallback = (other: Entity, deltaTime: number) => void;

/**
 * Spatial trigger zone — the overlap analogue of the input phase split.
 *
 * Using its own {@link Collider2D} (mark it `isTrigger`), it watches which
 * body colliders overlap it and fires:
 * - `onEnter`  : the frame a body first overlaps       (진입 시)
 * - `onStay`   : every frame it keeps overlapping       (진입한 동안)
 * - `onExit`   : the frame it stops overlapping         (퇴장 시)
 *
 * Only non-trigger (body) colliders are detected. Pass a `filter` to restrict
 * which entities count (e.g. only the player).
 */
export class TriggerZone extends Component {
  filter: ((entity: Entity) => boolean) | null;

  private inside = new Set<Collider2D>();
  private enterCb: TriggerCallback | null = null;
  private stayCb: TriggerStayCallback | null = null;
  private exitCb: TriggerCallback | null = null;

  constructor(options?: { filter?: (entity: Entity) => boolean }) {
    super();
    this.filter = options?.filter ?? null;
  }

  onEnter(callback: TriggerCallback): this {
    this.enterCb = callback;
    return this;
  }

  onStay(callback: TriggerStayCallback): this {
    this.stayCb = callback;
    return this;
  }

  onExit(callback: TriggerCallback): this {
    this.exitCb = callback;
    return this;
  }

  private accepts(collider: Collider2D): Entity | null {
    // Zones react to bodies, not other trigger zones.
    if (collider.isTrigger) {
      return null;
    }
    const entity = collider.entity;
    if (!entity) {
      return null;
    }
    if (this.filter && !this.filter(entity)) {
      return null;
    }
    return entity;
  }

  override update(deltaTime: number): void {
    const self = this.entity?.getComponent(Collider2D);
    if (!self) {
      return;
    }

    const bounds = self.getBounds();
    const current = new Set<Collider2D>();

    for (const other of Collider2D.overlapping(bounds, self)) {
      const otherEntity = this.accepts(other);
      if (!otherEntity) {
        continue;
      }
      current.add(other);
      if (this.inside.has(other)) {
        this.stayCb?.(otherEntity, deltaTime);
      } else {
        this.enterCb?.(otherEntity);
      }
    }

    // Anything that was inside last frame but is not now has exited.
    for (const other of this.inside) {
      if (!current.has(other) && other.entity) {
        this.exitCb?.(other.entity);
      }
    }

    this.inside = current;
  }
}
