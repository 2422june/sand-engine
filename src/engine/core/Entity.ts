import { Component } from "./Component";

export class Entity {
  readonly id: string;
  readonly components: Component[] = [];

  constructor(id: string) {
    this.id = id;
  }

  addComponent<T extends Component>(component: T): T {
    component.entity = this;
    component.onAttach(this);
    this.components.push(component);
    return component;
  }

  getComponent<T extends Component>(ComponentType: new (...args: never[]) => T): T | undefined {
    return this.components.find((component) => component instanceof ComponentType) as T | undefined;
  }

  getComponents<T extends Component>(ComponentType: new (...args: never[]) => T): T[] {
    return this.components.filter((component) => component instanceof ComponentType) as T[];
  }

  update(deltaTime: number): void {
    for (const component of this.components) {
      component.update(deltaTime);
    }
  }
}
