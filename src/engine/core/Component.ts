import type { Entity } from "./Entity";

export abstract class Component {
  entity: Entity | null = null;

  onAttach(_entity: Entity): void {}

  update(_deltaTime: number): void {}
}
