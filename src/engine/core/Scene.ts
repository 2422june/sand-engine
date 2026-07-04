import { Entity } from "./Entity";

export abstract class Scene {
  readonly entities: Entity[] = [];

  addEntity(entity: Entity): Entity {
    this.entities.push(entity);
    return entity;
  }

  update(deltaTime: number): void {
    for (const entity of this.entities) {
      entity.update(deltaTime);
    }
  }

  abstract render(ctx: CanvasRenderingContext2D): void;
}
