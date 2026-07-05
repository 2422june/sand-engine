import { Component } from "../core/Component";

export type StateDefinition = {
  onEnter?: () => void;
  onExit?: () => void;
  onUpdate?: (deltaTime: number) => void;
};

export class StateMachine extends Component {
  private readonly states = new Map<string, StateDefinition>();
  currentState: string | null = null;

  addState(name: string, definition: StateDefinition): this {
    this.states.set(name, definition);
    return this;
  }

  setState(name: string): void {
    if (this.currentState === name) {
      return;
    }

    this.states.get(this.currentState ?? "")?.onExit?.();
    this.currentState = name;
    this.states.get(name)?.onEnter?.();
  }

  override update(deltaTime: number): void {
    if (!this.currentState) {
      return;
    }

    this.states.get(this.currentState)?.onUpdate?.(deltaTime);
  }
}
