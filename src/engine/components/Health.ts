import { Component } from "../core/Component";

export class Health extends Component {
  hp: number;
  readonly maxHp: number;

  constructor(maxHp: number, hp = maxHp) {
    super();
    this.maxHp = maxHp;
    this.hp = Math.max(0, Math.min(hp, maxHp));
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  damage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}
